import { Socket } from 'socket.io';

export interface PresenceInfo {
  name: string;
  color: string;
  position: number | null;
}

// In-memory presence store: docId -> (userId -> PresenceInfo)
export const docPresence = new Map<string, Map<string, PresenceInfo>>();

export const CURSOR_COLORS = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6'];

/**
 * Handles when a user moves their cursor.
 * Updates the presence position and broadcasts the update to other clients in the document room.
 */
export function handleCursorMove(socket: Socket, docId: string, position: number | null, userId: string): void {
  let docMap = docPresence.get(docId);
  if (!docMap) {
    docMap = new Map();
    docPresence.set(docId, docMap);
  }

  const name = socket.data.name || 'Anonymous';
  const color = socket.data.color || CURSOR_COLORS[0];

  const info: PresenceInfo = { name, color, position };
  docMap.set(userId, info);

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
export function handleLeaveDoc(socket: Socket, docId: string, userId: string): void {
  const docMap = docPresence.get(docId);
  if (docMap) {
    docMap.delete(userId);
    if (docMap.size === 0) {
      docPresence.delete(docId);
    }
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
export function handleDisconnect(socket: Socket): void {
  const userId = socket.data.userId;
  const joinedDocs = socket.data.joinedDocs as Set<string> | undefined;

  if (userId && joinedDocs) {
    for (const docId of joinedDocs) {
      handleLeaveDoc(socket, docId, userId);
    }
  }
}
