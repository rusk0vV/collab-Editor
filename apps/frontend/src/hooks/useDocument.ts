import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';
import { useApi } from '../lib/api';
import type { DocumentRecord } from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import Delta from 'quill-delta';
import Quill from 'quill';

export interface CollaboratorPresence {
  userId: string;
  name: string;
  color: string;
  position: number | null;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'offline' | 'error';

/**
 * Hook to manage collaborative document synchronization and conflict resolution (OT) on the client.
 */
export function useDocument(docId: string | undefined) {
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<CollaboratorPresence[]>([]);
  const [quill, setQuill] = useState<Quill | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const { request } = useApi();
  const { userId: clerkUserId, getToken } = useAuth();

  // Latest getToken so (re)joining always sends a fresh, unexpired Clerk token
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // Socket connection hook
  const { socketRef, socket } = useSocket(docId);
  const quillRef = useRef<Quill | null>(null);

  // Latest known server content, used when (re)mounting the Quill editor
  const contentRef = useRef<{ ops: any[] } | null>(null);
  // True once the server acknowledged join-doc; typing is blocked until then so edits are never lost silently
  const joinedRef = useRef(false);

  // OT Client State Refs
  const revisionRef = useRef<number>(0);
  const pendingOpRef = useRef<Delta | null>(null);
  const bufferOpRef = useRef<Delta | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Sync current Clerk userId to ref
  useEffect(() => {
    userIdRef.current = clerkUserId || null;
  }, [clerkUserId]);

  // 1. Initial Load of document via REST API
  useEffect(() => {
    if (!docId) return;

    let cancelled = false;

    // Reset all per-document state when switching documents
    setLoading(true);
    setError(null);
    setActiveUsers([]);
    setStatus('connecting');
    setStatusMessage(null);
    setSaving(false);
    joinedRef.current = false;
    pendingOpRef.current = null;
    bufferOpRef.current = null;
    contentRef.current = null;

    request(`/docs/${docId}`)
      .then((data: DocumentRecord) => {
        if (cancelled) return;
        setDocument(data);
        revisionRef.current = data.revision;
        contentRef.current = data.content;
        setLoading(false);

        // If Quill is already initialized, set contents
        if (quillRef.current) {
          quillRef.current.setContents(new Delta(data.content.ops));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch document:', err);
        setError(err.message || 'Failed to load document');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [docId]);

  // 2. Connect Socket events
  useEffect(() => {
    if (!socket || !docId) return;

    // Join (or re-join after a reconnect) the document room with a fresh token
    const joinRoom = async () => {
      try {
        const token = await getTokenRef.current();
        if (!token) {
          setStatus('error');
          setStatusMessage('Not signed in');
          return;
        }
        socket.emit('join-doc', { docId, token });
      } catch (err) {
        console.error('Failed to get session token for join-doc:', err);
        setStatus('error');
        setStatusMessage('Could not get a session token');
      }
    };

    const onConnect = () => {
      console.log(`Socket connected: ${socket.id}. Emitting join-doc for room ${docId}`);
      setStatus('connecting');
      joinRoom();
    };

    const onDisconnect = () => {
      joinedRef.current = false;
      quillRef.current?.disable();
      setStatus('offline');
    };

    const onConnectError = (err: Error) => {
      console.error('Socket connect error:', err);
      setStatus('offline');
      setStatusMessage('Cannot reach server');
    };

    // Handle initial state and revision sync on (re)join
    const onJoined = (data: { docId: string; content: any; revision: number }) => {
      console.log(`Socket joined-doc ACK: revision ${data.revision}`);
      joinedRef.current = true;

      // The server is the source of truth after a (re)join; drop any stale in-flight ops
      pendingOpRef.current = null;
      bufferOpRef.current = null;
      setSaving(false);

      revisionRef.current = data.revision;
      contentRef.current = data.content;
      setDocument(prev => prev ? { ...prev, revision: data.revision } : null);
      setStatus('connected');
      setStatusMessage(null);

      const q = quillRef.current;
      if (q) {
        const docDelta = new Delta(data.content.ops);
        const currentContents = q.getContents();
        if (JSON.stringify(currentContents.ops) !== JSON.stringify(docDelta.ops)) {
          q.setContents(docDelta);
        }
        q.enable();
      }
    };

    // Handle presence details list
    const onPresenceList = (data: { users: CollaboratorPresence[] }) => {
      // Exclude ourselves
      const others = data.users.filter(u => u.userId !== userIdRef.current);
      setActiveUsers(others);
    };

    // Handle cursor update of other users
    const onCursorUpdate = (data: CollaboratorPresence) => {
      if (data.userId === userIdRef.current) return;
      setActiveUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        if (data.position === null) {
          return filtered; // cursor removed
        }
        return [...filtered, data];
      });
    };

    // Handle operation confirmation from server
    const onOpConfirmed = (data: { docId: string; op: any; revision: number }) => {
      console.log(`Op confirmed at revision ${data.revision}`);
      revisionRef.current = data.revision;
      setDocument(prev => prev ? { ...prev, revision: data.revision } : null);
      pendingOpRef.current = null;

      // A successful op clears any transient sync error
      setStatus(prev => (prev === 'error' ? 'connected' : prev));
      setStatusMessage(null);

      // Dispatch next operations in buffer if any
      if (bufferOpRef.current) {
        pendingOpRef.current = bufferOpRef.current;
        bufferOpRef.current = null;

        socket.emit('op', {
          docId,
          op: pendingOpRef.current,
          revision: revisionRef.current,
          userId: userIdRef.current
        });
      } else {
        setSaving(false);
      }
    };

    // Handle operation broadcasts from other users
    const onOpBroadcast = (data: { docId: string; op: any; revision: number; userId: string }) => {
      if (data.userId === userIdRef.current) return;
      console.log(`Received broadcast op from ${data.userId} for revision ${data.revision}`);

      let incomingOp = new Delta(data.op.ops);

      if (pendingOpRef.current) {
        // Transform incomingOp against pending and buffer operations (standard client-side OT)
        // Assume client loses priority on collision, so priority = true
        let incomingOpTransformed = pendingOpRef.current.transform(incomingOp, true);
        if (bufferOpRef.current) {
          incomingOpTransformed = bufferOpRef.current.transform(incomingOpTransformed, true);
        }

        // Apply transformed broadcast op programmatically to Quill
        if (quillRef.current) {
          quillRef.current.updateContents(incomingOpTransformed, 'api');
        }

        // Transform our local pending/buffer ops against the original incomingOp
        pendingOpRef.current = incomingOp.transform(pendingOpRef.current, false);
        if (bufferOpRef.current) {
          bufferOpRef.current = incomingOpTransformed.transform(bufferOpRef.current, false);
        }
      } else {
        // Apply directly if no local edits are currently in flight
        if (quillRef.current) {
          quillRef.current.updateContents(incomingOp, 'api');
        }
      }

      revisionRef.current = data.revision;
      setDocument(prev => prev ? { ...prev, revision: data.revision } : null);
    };

    const onServerError = (err: { code?: string; message?: string }) => {
      console.error('Socket room sync error:', err);
      setStatus('error');
      setStatusMessage(err?.message || 'Sync error');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('joined-doc', onJoined);
    socket.on('presence-list', onPresenceList);
    socket.on('cursor-update', onCursorUpdate);
    socket.on('op-confirmed', onOpConfirmed);
    socket.on('op-broadcast', onOpBroadcast);
    socket.on('error', onServerError);

    // The socket may have connected before these listeners were attached
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('joined-doc', onJoined);
      socket.off('presence-list', onPresenceList);
      socket.off('cursor-update', onCursorUpdate);
      socket.off('op-confirmed', onOpConfirmed);
      socket.off('op-broadcast', onOpBroadcast);
      socket.off('error', onServerError);
    };
  }, [socket, docId]);

  // 3. Initialize Quill editor hook bindings.
  // Stable identity (only changes with docId) so React re-renders never re-trigger editor setup.
  const initializeEditor = useCallback((quillInstance: Quill) => {
    quillRef.current = quillInstance;
    setQuill(quillInstance);

    // If REST/socket payload arrived before mounting completed, render it now
    if (contentRef.current) {
      quillInstance.setContents(new Delta(contentRef.current.ops));
    }

    // Block typing until the server confirms we joined the room, otherwise edits would never sync
    if (!joinedRef.current) {
      quillInstance.disable();
    }

    // Capture user changes and route through the client-side OT sync queue
    quillInstance.on('text-change', (delta, _oldDelta, source) => {
      if (source !== 'user') return; // Skip api-triggered updates to prevent loops

      const socket = socketRef.current;
      if (!socket || !docId || !userIdRef.current) return;

      const opDelta = new Delta(delta.ops);
      setSaving(true);

      if (pendingOpRef.current === null) {
        pendingOpRef.current = opDelta;
        socket.emit('op', {
          docId,
          op: pendingOpRef.current,
          revision: revisionRef.current,
          userId: userIdRef.current
        });
      } else {
        // If an ACK is pending, queue this delta into our buffer
        bufferOpRef.current = bufferOpRef.current 
          ? bufferOpRef.current.compose(opDelta)
          : opDelta;
      }
    });

    // Bind cursor movement/selection changes to presence broadcast
    quillInstance.on('selection-change', (range) => {
      const socket = socketRef.current;
      if (!socket || !docId || !userIdRef.current) return;

      const position = range ? range.index : null;
      socket.emit('cursor-move', {
        docId,
        position,
        userId: userIdRef.current
      });
    });
  }, [docId, socketRef]);

  // Helper to change the document title
  const updateTitle = async (newTitle: string) => {
    if (!docId) return;
    try {
      const updated = await request(`/docs/${docId}/title`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle })
      });
      setDocument(prev => prev ? { ...prev, title: updated.title } : null);
    } catch (err: any) {
      console.error('Failed to update title:', err);
      throw err;
    }
  };

  return {
    document,
    loading,
    error,
    activeUsers,
    initializeEditor,
    updateTitle,
    quillRef,
    quill,
    status,
    statusMessage,
    saving
  };
}
