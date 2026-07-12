import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

const SOCKET_URL = 'http://localhost:4000';

/**
 * React hook that manages the Socket.IO connection lifecycle.
 * Automatically fetches the Clerk session token asynchronously, connects to the
 * websocket server, joins the document room, and handles cleanup on unmount.
 */
export function useSocket(docId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    if (!docId) return;

    let active = true;
    let socket: Socket | null = null;

    async function initSocket() {
      try {
        const token = await getToken();
        if (!active) return;
        if (!token) {
          console.warn('Socket connection skipped: No Clerk session token found');
          return;
        }

        // Connect using WebSocket transport
        socket = io(SOCKET_URL, {
          transports: ['websocket'],
          autoConnect: true,
          auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log(`Socket connected: ${socket?.id}. Emitting join-doc for room ${docId}`);
          socket?.emit('join-doc', { docId, token });
        });

        socket.on('error', (err: any) => {
          console.error('Socket error event:', err);
        });

        socket.on('disconnect', (reason) => {
          console.log(`Socket disconnected: ${reason}`);
        });
      } catch (err) {
        console.error('Failed to initialize socket:', err);
      }
    }

    initSocket();

    // Cleanup: leave document room and close connection
    return () => {
      active = false;
      if (socket) {
        console.log(`Cleaning up socket connection for document ${docId}`);
        socket.emit('leave-doc', { docId });
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [docId, getToken]);

  return socketRef;
}
