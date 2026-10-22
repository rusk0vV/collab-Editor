import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

const SOCKET_URL = 'http://localhost:4000';

/**
 * React hook that manages the Socket.IO connection lifecycle.
 * Fetches the Clerk session token, opens the websocket connection and tears it
 * down on unmount / document switch.
 *
 * It returns the socket both as a ref (for imperative reads inside event
 * handlers) and as state (so consumers re-render and can attach listeners the
 * moment the socket exists). Joining the document room is the consumer's job,
 * so it can send a fresh Clerk token on every (re)connect.
 */
export function useSocket(docId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { getToken } = useAuth();

  // Keep the latest getToken without re-running the connection effect if its identity changes.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!docId) return;

    let active = true;
    let current: Socket | null = null;

    async function initSocket() {
      try {
        const token = await getTokenRef.current();
        if (!active) return;
        if (!token) {
          console.warn('Socket connection skipped: No Clerk session token found');
          return;
        }

        // Connect using WebSocket transport
        current = io(SOCKET_URL, {
          transports: ['websocket'],
          autoConnect: true,
          auth: { token },
        });

        current.on('disconnect', (reason) => {
          console.log(`Socket disconnected: ${reason}`);
        });

        socketRef.current = current;
        setSocket(current);
      } catch (err) {
        console.error('Failed to initialize socket:', err);
      }
    }

    initSocket();

    // Cleanup: leave document room and close connection
    return () => {
      active = false;
      if (current) {
        console.log(`Cleaning up socket connection for document ${docId}`);
        current.emit('leave-doc', { docId });
        current.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
    };
  }, [docId]);

  return { socketRef, socket };
}
