import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { checkDocumentAccess, findDocumentById, updateDocumentContent } from '../db/queries/docs';
import { findUserById } from '../db/queries/users';
import { apply, transform, QuillDelta } from '../ot/transform';
import {
  docPresence,
  CURSOR_COLORS,
  handleCursorMove,
  handleLeaveDoc,
  handleDisconnect
} from './presenceHandler';

export interface HistoryEntry {
  revision: number;
  op: QuillDelta;
  userId: string;
}

export interface DocState {
  revision: number;
  content: QuillDelta;
  history: HistoryEntry[];
}

// In-memory document state map
export const docState = new Map<string, DocState>();

/**
 * Registers all WebSocket events and handlers for real-time document synchronization.
 */
export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('New client connection:', socket.id);

    // 1. Join Document Event
    socket.on('join-doc', async (data: { docId: string; token: string }) => {
      try {
        const { docId, token } = data;
        if (!docId || !token) {
          socket.emit('error', { code: 'BAD_REQUEST', message: 'docId and token are required' });
          return;
        }

        // Verify JWT token
        const secret = process.env.JWT_SECRET || 'local_dev_secret_change_in_prod';
        let decoded: { userId: string; email: string };
        try {
          decoded = jwt.verify(token, secret) as { userId: string; email: string };
        } catch (err) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
          return;
        }

        // Check if the user has access to the document
        const access = await checkDocumentAccess(docId, decoded.userId);
        if (!access) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied to this document' });
          return;
        }

        // Fetch user name
        const user = await findUserById(decoded.userId);
        const name = user ? user.name : 'Anonymous';

        // Initialize and assign metadata to socket session
        socket.data.userId = decoded.userId;
        socket.data.email = decoded.email;
        socket.data.name = name;
        if (!socket.data.joinedDocs) {
          socket.data.joinedDocs = new Set<string>();
        }
        socket.data.joinedDocs.add(docId);

        // Assign a random color if not already set
        if (!socket.data.color) {
          socket.data.color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
        }

        // Join the Socket.IO room for this document
        await socket.join(docId);

        // Load document state from database if not cached in memory
        let state = docState.get(docId);
        if (!state) {
          const doc = await findDocumentById(docId);
          if (!doc) {
            socket.emit('error', { code: 'NOT_FOUND', message: 'Document not found' });
            return;
          }
          state = {
            revision: doc.revision,
            content: doc.content as QuillDelta,
            history: []
          };
          docState.set(docId, state);
        }

        // Add to presence store
        let docMap = docPresence.get(docId);
        if (!docMap) {
          docMap = new Map();
          docPresence.set(docId, docMap);
        }
        docMap.set(decoded.userId, {
          name,
          color: socket.data.color,
          position: null
        });

        // Emit current state back to the joining user
        socket.emit('joined-doc', {
          docId,
          content: state.content,
          revision: state.revision
        });

        // Emit current active presence list of the document to the joining user
        const usersList = Array.from(docMap.entries()).map(([uid, presence]) => ({
          userId: uid,
          name: presence.name,
          color: presence.color,
          position: presence.position
        }));
        socket.emit('presence-list', { users: usersList });

        // Notify other clients in the document room about this user
        socket.to(docId).emit('cursor-update', {
          userId: decoded.userId,
          name,
          color: socket.data.color,
          position: null
        });

        console.log(`User ${name} (${decoded.userId}) joined document ${docId}`);
      } catch (error) {
        console.error('Error in join-doc handler:', error);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join document' });
      }
    });

    // 2. Document Op Sync Event
    socket.on('op', async (data: { docId: string; op: QuillDelta; revision: number; userId: string }) => {
      try {
        const { docId, op, revision, userId } = data;

        // Verify socket user identity
        if (socket.data.userId !== userId) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'User identity mismatch' });
          return;
        }

        // Verify if client has joined this doc
        const joinedDocs = socket.data.joinedDocs as Set<string> | undefined;
        if (!joinedDocs || !joinedDocs.has(docId)) {
          socket.emit('error', { code: 'BAD_REQUEST', message: 'User has not joined this document' });
          return;
        }

        // Retrieve document state from cache
        const state = docState.get(docId);
        if (!state) {
          socket.emit('error', { code: 'NOT_FOUND', message: 'Document state not found' });
          return;
        }

        const serverRev = state.revision;
        const clientRev = revision;

        if (clientRev > serverRev) {
          socket.emit('error', { code: 'BAD_REQUEST', message: 'Client revision is in the future' });
          return;
        }

        let transformedOp = op;

        // If client is stale, perform sequential transformation against historical edits
        if (clientRev < serverRev) {
          for (let i = clientRev; i < serverRev; i++) {
            const historical = state.history.find(h => h.revision === i);
            if (historical) {
              // Tie-breaker priority: lexicographically greater userId loses priority (inserts after)
              const priority = userId > historical.userId;
              transformedOp = transform(historical.op, transformedOp, priority);
            }
          }
        }

        // Apply operation on the server state
        state.content = apply(state.content, transformedOp);
        
        // Log history entry
        const finalRevision = state.revision;
        state.revision++;
        state.history.push({
          revision: finalRevision,
          op: transformedOp,
          userId
        });

        // Bounded memory buffer of size 1000
        if (state.history.length > 1000) {
          state.history.shift();
        }

        // Persist to Postgres database synchronously
        await updateDocumentContent(docId, state.content, state.revision);

        // Acknowledge operation to the sending client
        socket.emit('op-confirmed', {
          docId,
          op: transformedOp,
          revision: state.revision
        });

        // Broadcast the operation to other active clients
        socket.to(docId).emit('op-broadcast', {
          docId,
          op: transformedOp,
          revision: state.revision,
          userId
        });
      } catch (error) {
        console.error('Error in op handler:', error);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to process document operation' });
      }
    });

    // 3. Cursor Move Presence Event
    socket.on('cursor-move', (data: { docId: string; position: number | null; userId: string }) => {
      const { docId, position, userId } = data;
      if (socket.data.userId !== userId) {
        return;
      }
      handleCursorMove(socket, docId, position, userId);
    });

    // 4. Leave Document Event
    socket.on('leave-doc', (data: { docId: string }) => {
      const { docId } = data;
      const userId = socket.data.userId;
      if (!userId) return;

      const joinedDocs = socket.data.joinedDocs as Set<string> | undefined;
      if (joinedDocs) {
        joinedDocs.delete(docId);
      }

      handleLeaveDoc(socket, docId, userId);
      socket.leave(docId);
      console.log(`User ${userId} left document ${docId}`);
    });

    // 5. Socket Disconnected Event
    socket.on('disconnect', () => {
      handleDisconnect(socket);
      console.log('Client disconnected:', socket.id);
    });
  });
}
