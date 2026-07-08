import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000';

/**
 * React hook that manages the Socket.IO connection lifecycle.
 * Automatically connects to the websocket server, joins the document room,
 * and handles disconnection cleanup when the component unmounts.
 */
export function useSocket(docId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!docId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Socket connection skipped: No authentication token found');
      return;
    }

    // Connect to Socket.IO server on port 4000 using pure websockets transport
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`Socket connected: ${socket.id}. Emitting join-doc for room ${docId}`);
      socket.emit('join-doc', { docId, token });
    });

    socket.on('error', (err: any) => {
      console.error('Socket error event:', err);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
    });

    // Cleanup: leave document room and close connection on component unmount
    return () => {
      console.log(`Cleaning up socket connection for document ${docId}`);
      socket.emit('leave-doc', { docId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [docId]);

  return socketRef;
}
