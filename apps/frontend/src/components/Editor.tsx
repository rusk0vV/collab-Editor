import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface EditorProps {
  onMount: (quill: Quill) => void;
}

/**
 * Quill Editor wrapper component. Mounts the Quill instance on mount,
 * configures standard toolbar options, and delegates the instance to the parent sync hook.
 */
export function Editor({ onMount }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a sub-div container to avoid Quill mounting directly to ref and losing styling
    const editorElement = document.createElement('div');
    containerRef.current.appendChild(editorElement);

    // Initialize Quill instance
    const quill = new Quill(editorElement, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['clean'],
        ],
      },
      placeholder: 'Start writing collaboratively...',
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
      style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}
    />
  );
}
