import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDocument } from '../hooks/useDocument';
import { Editor } from '../components/Editor';
import { CursorOverlay } from '../components/CursorOverlay';
import { request } from '../lib/api';
import type { DocumentRecord } from '../lib/api';

/**
 * EditorPage restyled to match front.md design system.
 * Features collapsible sidebar, Topbar edit, Save dots, Stacked avatars, and Share Popover.
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

  // States
  const [titleInput, setTitleInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [sidebarDocs, setSidebarDocs] = useState<DocumentRecord[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  // Refs
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync state title to local input
  useEffect(() => {
    if (document) {
      setTitleInput(document.title);
    }
  }, [document]);

  // Load document list for sidebar on mount or document switch
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    request('/docs')
      .then(setSidebarDocs)
      .catch(console.error);
  }, [id]);

  // Close share popover on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleTitleBlur = () => {
    if (!document || !titleInput.trim()) return;
    if (titleInput.trim() !== document.title) {
      updateTitle(titleInput.trim()).catch(() => {
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

  const handleCreateSidebarDoc = async () => {
    try {
      const response = await request('/docs', {
        method: 'POST',
        body: JSON.stringify({ title: 'Untitled document' }),
      });
      navigate(`/docs/${response.id}`);
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  // Stacked initials helper
  const getInitials = (name: string) => {
    return name.substring(0, 1).toUpperCase();
  };

  if (loading) {
    return (
      <div className="editor-page-loading">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading collaborative editor session...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="editor-page-error glass" style={{ padding: '40px', maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '12px' }}>Failed to connect</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'Document not found'}</p>
        <Link to="/dashboard" className="primary-btn">Back to Dashboard</Link>
      </div>
    );
  }

  // Calculate stack details
  const displayedAvatars = activeUsers.slice(0, 4);
  const extraCount = activeUsers.length - displayedAvatars.length;

  return (
    <div className="editor-page-container">
      {/* Topbar (48px tall, fixed, border-bottom) */}
      <header className="topbar-panel">
        <div className="topbar-left">
          {/* Sidebar toggler */}
          <button 
            type="button" 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            ≡
          </button>
          
          <span className="topbar-logo-text">collab-Editor</span>
          
          {/* Inline editable document title */}
          <div className="topbar-title-edit-container">
            <input
              type="text"
              className="topbar-title-edit-input"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled document"
            />
          </div>
        </div>

        <div className="topbar-right">
          {/* Save Status Indicators */}
          {/* Currently client saves synchronously on ops. Mock dynamic status based on socket status or server ACK */}
          <span className="saved-indicator-confirmed">
            <span className="dot"></span>
            Saved
          </span>

          {/* Presence avatars stack */}
          <div className="presence-avatars-stack">
            {extraCount > 0 && (
              <div className="avatar-presence-more">
                +{extraCount}
              </div>
            )}
            
            {displayedAvatars.map((u) => (
              <div
                key={u.userId}
                className="avatar-presence"
                style={{ backgroundColor: u.color }}
                title={u.name}
              >
                {getInitials(u.name)}
              </div>
            ))}
            
            {/* Self avatar */}
            <div
              className="avatar-presence"
              style={{ backgroundColor: 'var(--accent)', border: '1px solid var(--text-primary)' }}
              title="You"
            >
              Y
            </div>
          </div>

          {/* Share popover */}
          <div className="share-popover-container" ref={shareOpen ? popoverRef : null}>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '13px' }}
              onClick={(e) => {
                e.stopPropagation();
                setShareOpen(prev => !prev);
              }}
            >
              Share
            </button>

            {shareOpen && (
              <div className="share-popover-panel">
                <p>Anyone with this link can view and edit this document.</p>
                <div className="share-popover-input-row">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    onClick={handleCopyLink}
                  >
                    {copyStatus === 'copied' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main workspace layout */}
      <div className="editor-workspace-layout">
        {/* Sidebar (240px wide, collapsible) */}
        <aside className={sidebarOpen ? 'sidebar-panel' : 'sidebar-panel sidebar-collapsed'}>
          <div className="sidebar-top">
            <span className="sidebar-section-label">Your documents</span>
            
            <nav className="sidebar-docs-list">
              {sidebarDocs.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/docs/${doc.id}`}
                  className={doc.id === id ? 'sidebar-doc-item active' : 'sidebar-doc-item'}
                >
                  {doc.title}
                </Link>
              ))}
            </nav>
          </div>

          <div className="sidebar-bottom">
            <button
              type="button"
              className="sidebar-new-doc-btn"
              onClick={handleCreateSidebarDoc}
            >
              + New document
            </button>
          </div>
        </aside>

        {/* Outer editor canvas base container */}
        <main className="editor-canvas-container">
          {/* Floating editor white page column */}
          <div className="editor-floating-page">
            {/* Header section representing the physical page top */}
            <div className="editor-page-title-header">
              <h1>{document.title}</h1>
              <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.08)', marginTop: '8px', marginBottom: '16px', width: '100%' }}></div>
            </div>

            {/* Quill editor canvas */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <Editor onMount={initializeEditor} />
              
              {/* Carets overlay layout */}
              <CursorOverlay quill={quillRef.current} activeUsers={activeUsers} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
export default EditorPage;
