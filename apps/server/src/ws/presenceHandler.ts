import { Socket } from 'socket.io';
import { setPresence, removePresence } from '../redis/presence';

export const CURSOR_COLORS = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6'];

/**
 * Handles when a user moves their cursor.
 * Updates the presence in Redis and broadcasts the update to other clients in the document room.
 */
export async function handleCursorMove(socket: Socket, docId: string, position: number | null, userId: string): Promise<void> {
  const name = socket.data.name || 'Anonymous';
  const color = socket.data.color || CURSOR_COLORS[0];

  try {
    await setPresence(docId, userId, { name, color, position });
  } catch (err) {
    console.error('Failed to update presence in Redis:', err);
  }

  // Broadcast cursor-update to everyone else in the document room
  socket.to(docId).emit('cursor-update', {
    userId,
    name,
    color,
    position
  });
}

/**
 * Handles removing user cursor when they explicitly leave a document room.
 */
export async function handleLeaveDoc(socket: Socket, docId: string, userId: string): Promise<void> {
  try {
    await removePresence(docId, userId);
  } catch (err) {
    console.error('Failed to remove presence from Redis:', err);
  }

  // Broadcast that the cursor is gone by sending position as null
  socket.to(docId).emit('cursor-update', {
    userId,
    name: socket.data.name || 'Anonymous',
    color: socket.data.color || CURSOR_COLORS[0],
    position: null
  });
}

/**
 * Handles cleaning up presence mapping for all joined documents when a user disconnects.
 */
export async function handleDisconnect(socket: Socket): Promise<void> {
  const userId = socket.data.userId;
  const joinedDocs = socket.data.joinedDocs as Set<string> | undefined;

  if (userId && joinedDocs) {
    for (const docId of joinedDocs) {
      await handleLeaveDoc(socket, docId, userId);
    }
  }
}
