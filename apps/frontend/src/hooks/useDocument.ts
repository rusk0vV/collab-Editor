import { useEffect, useRef, useState } from 'react';
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

/**
 * Hook to manage collaborative document synchronization and conflict resolution (OT) on the client.
 */
export function useDocument(docId: string | undefined) {
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<CollaboratorPresence[]>([]);
  
  const { request } = useApi();
  const { userId: clerkUserId } = useAuth();

  // Socket connection hook
  const socketRef = useSocket(docId);
  const quillRef = useRef<Quill | null>(null);

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

    setLoading(true);
    setError(null);

    request(`/docs/${docId}`)
      .then((data: DocumentRecord) => {
        setDocument(data);
        revisionRef.current = data.revision;
        setLoading(false);

        // If Quill is already initialized, set contents
        if (quillRef.current) {
          quillRef.current.setContents(new Delta(data.content.ops));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch document:', err);
        setError(err.message || 'Failed to load document');
        setLoading(false);
      });
  }, [docId]);

  // 2. Connect Socket events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !docId) return;

    // Handle initial state and revision sync on connection
    socket.on('joined-doc', (data: { docId: string; content: any; revision: number }) => {
      console.log(`Socket joined-doc ACK: revision ${data.revision}`);
      revisionRef.current = data.revision;
      setDocument(prev => prev ? { ...prev, revision: data.revision } : null);
      if (quillRef.current) {
        // Safe check: sync in case REST load is overridden
        const docDelta = new Delta(data.content.ops);
        const currentContents = quillRef.current.getContents();
        if (JSON.stringify(currentContents.ops) !== JSON.stringify(docDelta.ops)) {
          quillRef.current.setContents(docDelta);
        }
      }
    });

    // Handle presence details list
    socket.on('presence-list', (data: { users: CollaboratorPresence[] }) => {
      // Exclude ourselves
      const others = data.users.filter(u => u.userId !== userIdRef.current);
      setActiveUsers(others);
    });

    // Handle cursor update of other users
    socket.on('cursor-update', (data: CollaboratorPresence) => {
      if (data.userId === userIdRef.current) return;
      setActiveUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        if (data.position === null) {
          return filtered; // cursor removed
        }
        return [...filtered, data];
      });
    });

    // Handle operation confirmation from server
    socket.on('op-confirmed', (data: { docId: string; op: any; revision: number }) => {
      console.log(`Op confirmed at revision ${data.revision}`);
      revisionRef.current = data.revision;
      setDocument(prev => prev ? { ...prev, revision: data.revision } : null);
      pendingOpRef.current = null;

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
      }
    });

    // Handle operation broadcasts from other users
    socket.on('op-broadcast', (data: { docId: string; op: any; revision: number; userId: string }) => {
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
    });

    socket.on('error', (err: any) => {
      console.error('Socket room sync error:', err);
    });

    return () => {
      socket.off('joined-doc');
      socket.off('presence-list');
      socket.off('cursor-update');
      socket.off('op-confirmed');
      socket.off('op-broadcast');
      socket.off('error');
    };
  }, [socketRef.current, docId]);

  // 3. Initialize Quill editor hook bindings
  const initializeEditor = (quillInstance: Quill) => {
    quillRef.current = quillInstance;

    // If REST payload was fetched before mounting completed, render it now
    if (document) {
      quillInstance.setContents(new Delta(document.content.ops));
    }

    // Capture user changes and route through the client-side OT sync queue
    quillInstance.on('text-change', (delta, _oldDelta, source) => {
      if (source !== 'user') return; // Skip api-triggered updates to prevent loops

      const socket = socketRef.current;
      if (!socket || !docId || !userIdRef.current) return;

      const opDelta = new Delta(delta.ops);

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
  };

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
    quillRef
  };
}
