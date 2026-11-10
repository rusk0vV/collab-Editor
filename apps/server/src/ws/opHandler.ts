import { Server, Socket } from 'socket.io';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { pool } from '../db/client';
import { checkDocumentAccess, findDocumentById, getOpsBetweenRevisions } from '../db/queries/docs';
import { apply, transformForward, QuillDelta } from '../ot/transform';
import { getDocState, setDocState } from '../redis/docCache';
import { setPresence, getAllPresence } from '../redis/presence';
import {
  CURSOR_COLORS,
  handleCursorMove,
  handleLeaveDoc,
  handleDisconnect
} from './presenceHandler';

async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    const payload = await clerkClient.verifyToken(token);
    return payload.sub; // sub is the Clerk user ID
  } catch (err) {
    console.error('Error verifying Clerk token:', err);
    return null;
  }
}

/**
 * Registers all WebSocket events and handlers for real-time document synchronization.
 * Document state and collaborator presence are managed through Redis.
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

        // Verify Clerk token
        const userId = await verifyClerkToken(token);
        if (!userId) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid or expired session' });
          return;
        }

        // Check if the user has access to the document
        const access = await checkDocumentAccess(docId, userId);
        if (!access) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied to this document' });
          return;
        }

        // Fetch user details from Clerk
        let name = 'Anonymous';
        try {
          const user = await clerkClient.users.getUser(userId);
          name = user.firstName ?? (user.emailAddresses && user.emailAddresses[0] ? user.emailAddresses[0].emailAddress : 'Anonymous');
        } catch (err) {
          console.error(`Failed to fetch user name from Clerk for ${userId}:`, err);
        }

        // Initialize and assign metadata to socket session
        socket.data.userId = userId;
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

        // Load document state from Redis, falling back to PostgreSQL on cache miss
        let state = await getDocState(docId);
        if (!state) {
          const doc = await findDocumentById(docId);
          if (!doc) {
            socket.emit('error', { code: 'NOT_FOUND', message: 'Document not found' });
            return;
          }
          state = {
            revision: doc.revision,
            content: doc.content as QuillDelta,
          };
          await setDocState(docId, state.content, state.revision);
        }

        // Update presence in Redis
        await setPresence(docId, userId, {
          name,
          color: socket.data.color,
          position: null
        });

        // Emit current canonical state back to the joining user
        socket.emit('joined-doc', {
          docId,
          content: state.content,
          revision: state.revision
        });

        // Emit current active presence list from Redis to joining user
        const usersList = await getAllPresence(docId);
        socket.emit('presence-list', { users: usersList });

        // Notify other clients in the document room about this user
        socket.to(docId).emit('cursor-update', {
          userId,
          name,
          color: socket.data.color,
          position: null
        });

        console.log(`User ${name} (${userId}) joined document ${docId}`);
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

        // Retrieve current document state from Redis (falling back to Postgres if evicted)
        let current = await getDocState(docId);
        if (!current) {
          const doc = await findDocumentById(docId);
          if (!doc) {
            socket.emit('error', { code: 'DOC_NOT_LOADED', message: 'Document state not found' });
            return;
          }
          current = { content: doc.content as QuillDelta, revision: doc.revision };
          await setDocState(docId, current.content, current.revision);
        }

        const serverRev = current.revision;
        const clientRev = revision;

        if (clientRev > serverRev) {
          socket.emit('error', { code: 'BAD_REQUEST', message: 'Client revision is in the future' });
          return;
        }

        let resolvedOp = op;

        // If client is stale, perform sequential transformation against historical edits fetched from op_log
        if (clientRev < serverRev) {
          resolvedOp = await transformForward(
            op,
            clientRev,
            serverRev,
            (from, to) => getOpsBetweenRevisions(docId, from, to)
          );
        }

        // Apply operation on the server state
        const newContent = apply(current.content, resolvedOp);
        const newRevision = serverRev + 1;

        // Write new state to Redis immediately
        await setDocState(docId, newContent, newRevision);

        // Persist to Postgres database
        await pool.query(
          'UPDATE documents SET content = $1, revision = $2, updated_at = now() WHERE id = $3',
          [JSON.stringify(newContent), newRevision, docId]
        );

        // Record entry in op_log
        await pool.query(
          'INSERT INTO op_log (doc_id, user_id, revision, op) VALUES ($1, $2, $3, $4)',
          [docId, userId, newRevision, JSON.stringify(resolvedOp)]
        );

        // Acknowledge operation to the sending client
        socket.emit('op-confirmed', {
          docId,
          op: resolvedOp,
          revision: newRevision
        });

        // Broadcast the operation to other active clients
        socket.to(docId).emit('op-broadcast', {
          docId,
          op: resolvedOp,
          revision: newRevision,
          userId
        });
      } catch (error) {
        console.error('Error in op handler:', error);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to process document operation' });
      }
    });

    // 3. Cursor Move Presence Event
    socket.on('cursor-move', async (data: { docId: string; position: number | null; userId: string }) => {
      const { docId, position, userId } = data;
      if (socket.data.userId !== userId) {
        return;
      }
      await handleCursorMove(socket, docId, position, userId);
    });

    // 4. Leave Document Event
    socket.on('leave-doc', async (data: { docId: string }) => {
      const { docId } = data;
      const userId = socket.data.userId;
      if (!userId) return;

      const joinedDocs = socket.data.joinedDocs as Set<string> | undefined;
      if (joinedDocs) {
        joinedDocs.delete(docId);
      }

      await handleLeaveDoc(socket, docId, userId);
      socket.leave(docId);
      console.log(`User ${userId} left document ${docId}`);
    });

    // 5. Socket Disconnected Event
    socket.on('disconnect', async () => {
      await handleDisconnect(socket);
      console.log('Client disconnected:', socket.id);
    });
  });
}
