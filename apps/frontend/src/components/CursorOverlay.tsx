import { useEffect, useState, useRef } from 'react';
import Quill from 'quill';
import type { CollaboratorPresence } from '../hooks/useDocument';

interface CursorOverlayProps {
  quill: Quill | null;
  activeUsers: CollaboratorPresence[];
}

interface CursorWithCoords extends CollaboratorPresence {
  coords: {
    top: number;
    left: number;
    height: number;
  };
}

/**
 * Component that renders cursor carets and name tags overlaying the text area
 * corresponding to characters edited or highlighted by other active users.
 * Implements 2s username tag fadeout upon inactivity.
 */
export function CursorOverlay({ quill, activeUsers }: CursorOverlayProps) {
  const [cursorCoords, setCursorCoords] = useState<CursorWithCoords[]>([]);
  const [visibleLabels, setVisibleLabels] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Keep track of timeouts and previous positions
  const timeoutsRef = useRef<Record<string, any>>({});
  const lastPositionsRef = useRef<Record<string, number | null>>({});

  useEffect(() => {
    if (!quill) {
      setCursorCoords([]);
      return;
    }

    const updateCoords = () => {
      const coordsList: CursorWithCoords[] = [];

      for (const user of activeUsers) {
        if (user.position === null) continue;
        
        // Detect movement to trigger username tag visibility
        const prevPos = lastPositionsRef.current[user.userId];
        if (prevPos !== user.position) {
          lastPositionsRef.current[user.userId] = user.position;
          
          // Show label
          setVisibleLabels(prev => ({ ...prev, [user.userId]: true }));
          
          // Reset/create 2-second timeout to fade it out
          if (timeoutsRef.current[user.userId]) {
            clearTimeout(timeoutsRef.current[user.userId]);
          }
          timeoutsRef.current[user.userId] = setTimeout(() => {
            setVisibleLabels(prev => ({ ...prev, [user.userId]: false }));
          }, 2000);
        }

        try {
          const bounds = quill.getBounds(user.position);
          if (bounds) {
            coordsList.push({
              ...user,
              coords: {
                top: bounds.top,
                left: bounds.left,
                height: bounds.height,
              },
            });
          }
        } catch (e) {
          // Ignore range index out of bounds
        }
      }

      setCursorCoords(coordsList);
    };

    updateCoords();

    quill.on('text-change', updateCoords);
    quill.on('selection-change', updateCoords);
    window.addEventListener('resize', updateCoords);

    return () => {
      quill.off('text-change', updateCoords);
      quill.off('selection-change', updateCoords);
      window.removeEventListener('resize', updateCoords);
    };
  }, [quill, activeUsers]);

  // Clean up all timeouts on unmount
  useEffect(() => {
    return () => {
      for (const tid of Object.values(timeoutsRef.current)) {
        clearTimeout(tid);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="cursor-overlay-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {cursorCoords.map((user) => {
        const isLabelVisible = visibleLabels[user.userId] ?? false;
        return (
          <div
            key={user.userId}
            className="collaborator-cursor"
            style={{
              position: 'absolute',
              top: `${user.coords.top}px`,
              left: `${user.coords.left}px`,
              height: `${user.coords.height}px`,
              width: '2px',
              backgroundColor: user.color,
              transition: 'top 0.08s ease, left 0.08s ease, height 0.08s ease',
            }}
          >
            {/* Caret top flag showing username with 2s fade out transition */}
            <div
              className="collaborator-cursor-label"
              style={{
                position: 'absolute',
                top: '-20px',
                left: '-2px',
                backgroundColor: user.color,
                color: '#ffffff',
                fontSize: '11px',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
                transform: 'translateY(-2px)',
                opacity: isLabelVisible ? 1 : 0,
                transition: 'opacity 0.2s ease-out-in, transform 0.2s ease-in-out',
                pointerEvents: 'none',
              }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
