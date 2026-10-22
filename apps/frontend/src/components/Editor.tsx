import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface EditorProps {
  onMount: (quill: Quill) => void;
}

/**
 * Quill Editor wrapper component aligned with front.md specifications.
 * Exposes the simple toolbar config: B I U S | H1 H2 | " code | • 1. |
 */
export function Editor({ onMount }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Always call the latest onMount without making it an effect dependency.
  // `onMount` changes identity on parent re-renders (every confirmed op bumps the
  // revision state); if it were a dependency, Quill would be torn down and
  // rebuilt after each keystroke, wiping the text and dropping focus.
  const onMountRef = useRef(onMount);
  onMountRef.current = onMount;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create a sub-div container to avoid Quill mounting directly to ref and losing styling
    const editorElement = document.createElement('div');
    container.appendChild(editorElement);

    // Initialize Quill instance with specified toolbar configurations
    const quill = new Quill(editorElement, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ header: 1 }, { header: 2 }],
          ['blockquote', 'code-block'],
          [{ list: 'bullet' }, { list: 'ordered' }],
        ],
      },
      placeholder: 'Start writing...',
    });

    onMountRef.current(quill);

    // Clean up editor content (including the toolbar Quill inserts as a sibling)
    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="editor-mount-point" 
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    />
  );
}
