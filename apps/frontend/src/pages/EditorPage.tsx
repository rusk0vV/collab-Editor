import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDocument } from '../hooks/useDocument';
import { Editor } from '../components/Editor';
import { CursorOverlay } from '../components/CursorOverlay';

/**
 * EditorPage connects the collaborative Quill canvas with live cursor overlays and metadata.
 */
export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Guard authentication
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/auth');
    }
  }, [navigate]);

  const {
    document,
    loading,
    error,
    activeUsers,
    initializeEditor,
    updateTitle,
    quillRef
  } = useDocument(id);

  const [titleInput, setTitleInput] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  // Sync state title to local input
  useEffect(() => {
    if (document) {
      setTitleInput(document.title);
    }
  }, [document]);

  const handleTitleBlur = () => {
    if (!document || !titleInput.trim()) return;
    if (titleInput.trim() !== document.title) {
      updateTitle(titleInput.trim()).catch(() => {
        // Revert title if error
        setTitleInput(document.title);
      });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  if (loading) {
    return (
      <div className="editor-page-loading">
        <div className="spinner"></div>
        <p>Loading collaborative editor session...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="editor-page-error glass">
        <h2>Failed to connect</h2>
        <p>{error || 'Document not found'}</p>
        <Link to="/dashboard" className="primary-btn">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <header className="editor-header glass">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn secondary-btn">
            ← Dashboard
          </Link>
          <input
            type="text"
            className="doc-title-input"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled Document"
          />
        </div>

        <div className="header-right">
          {/* Active Collaborators count */}
          <div className="collaborator-badge-container">
            <span className="live-dot"></span>
            <span className="collaborator-count">
              {activeUsers.length + 1} {activeUsers.length === 0 ? 'user' : 'users'} active
            </span>
            <div className="collaborator-avatars">
              {/* Show initials in tiny circles */}
              <div 
                className="user-avatar self" 
                title="You"
                style={{ border: '2px solid #58a6ff' }}
              >
                U
              </div>
              {activeUsers.map(u => (
                <div 
                  key={u.userId}
                  className="user-avatar" 
                  title={u.name}
                  style={{ backgroundColor: u.color }}
                >
                  {u.name.substring(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleShareClick} className="share-btn primary-btn">
            {copyStatus === 'copied' ? 'Link Copied!' : 'Share by Link'}
          </button>
        </div>
      </header>

      <main className="editor-workspace">
        <div className="editor-canvas-wrapper glass" style={{ position: 'relative' }}>
          {/* Mount the Quill wrapper editor */}
          <Editor onMount={initializeEditor} />
          
          {/* Render absolute cursor overlay */}
          <CursorOverlay quill={quillRef.current} activeUsers={activeUsers} />
        </div>
      </main>
    </div>
  );
}
export default EditorPage;
