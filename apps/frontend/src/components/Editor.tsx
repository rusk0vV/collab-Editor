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
  const quillInstanceRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a sub-div container to avoid Quill mounting directly to ref and losing styling
    const editorElement = document.createElement('div');
    containerRef.current.appendChild(editorElement);

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

    quillInstanceRef.current = quill;
    onMount(quill);

    // Clean up editor content and instance references on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      quillInstanceRef.current = null;
    };
  }, [onMount]);

  return (
    <div 
      ref={containerRef} 
      className="editor-mount-point" 
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    />
  );
}
