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
 */
export function CursorOverlay({ quill, activeUsers }: CursorOverlayProps) {
  const [cursorCoords, setCursorCoords] = useState<CursorWithCoords[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!quill) {
      setCursorCoords([]);
      return;
    }

    const updateCoords = () => {
      const coordsList: CursorWithCoords[] = [];

      for (const user of activeUsers) {
        if (user.position === null) continue;
        try {
          // getBounds gives position relative to the editor element container
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
          // Ignore range out of bounds issues during simultaneous fast editing races
        }
      }

      setCursorCoords(coordsList);
    };

    // Calculate coordinates on initial mount or updates
    updateCoords();

    // Register event listeners to recalculate on layout changes or typing
    quill.on('text-change', updateCoords);
    quill.on('selection-change', updateCoords);
    window.addEventListener('resize', updateCoords);

    return () => {
      quill.off('text-change', updateCoords);
      quill.off('selection-change', updateCoords);
      window.removeEventListener('resize', updateCoords);
    };
  }, [quill, activeUsers]);

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
      {cursorCoords.map((user) => (
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
          {/* Caret top flag showing username */}
          <div
            className="collaborator-cursor-label"
            style={{
              position: 'absolute',
              top: '-20px',
              left: '-2px',
              backgroundColor: user.color,
              color: '#ffffff',
              fontSize: '10px',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-2px)',
            }}
          >
            {user.name}
          </div>
        </div>
      ))}
    </div>
  );
}
