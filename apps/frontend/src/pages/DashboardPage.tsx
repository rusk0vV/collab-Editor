import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../lib/api';
import type { DocumentRecord } from '../lib/api';

/**
 * DashboardPage restyled to match design guides.
 * Features time-based greeting, card borders, no shadows, and actions kebab menus.
 */
export function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKebabDocId, setActiveKebabDocId] = useState<string | null>(null);
  const navigate = useNavigate();

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const kebabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/auth');
      return;
    }

    fetchDocuments();
  }, [navigate]);

  // Click outside to close active kebab menu dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setActiveKebabDocId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request('/docs');
      setDocuments(data);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      setError(err.message || 'Failed to fetch documents list');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    setError(null);
    try {
      const title = 'Untitled document';
      const response = await request('/docs', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      // Redirect directly to editor page
      navigate(`/docs/${response.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create document');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await request(`/docs/${docId}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleRenameDocument = async (docId: string, currentTitle: string) => {
    const newTitle = prompt('Rename document:', currentTitle);
    if (newTitle === null) return;
    const trimmed = newTitle.trim();
    if (!trimmed) {
      alert('Title cannot be empty');
      return;
    }

    try {
      const updated = await request(`/docs/${docId}/title`, {
        method: 'PATCH',
        body: JSON.stringify({ title: trimmed })
      });
      setDocuments(prev => prev.map(doc => doc.id === docId ? { ...doc, title: updated.title } : doc));
    } catch (err: any) {
      alert(err.message || 'Failed to rename document');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const getGreeting = (name: string) => {
    const hrs = new Date().getHours();
    let greeting = 'Good morning';
    if (hrs >= 12 && hrs < 17) greeting = 'Good afternoon';
    else if (hrs >= 17 || hrs < 4) greeting = 'Good evening';
    return `${greeting}, ${name}`;
  };

  return (
    <div className="dashboard-page">
      {/* Simplified Topbar */}
      <header className="dashboard-header-simple">
        <h1 className="topbar-logo-text">collab-Editor</h1>
        <div className="dashboard-header-right">
          <div 
            className="avatar-presence" 
            style={{ backgroundColor: '#6E56CF', fontSize: '13px', fontWeight: 600 }}
            title={user?.name || 'User'}
          >
            {user?.name ? user.name.substring(0, 1).toUpperCase() : 'U'}
          </div>
          <button onClick={handleLogout} className="ghost-btn">
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-content-layout">
        {error && <div className="error-alert">{error}</div>}

        {/* Localized Greeting and Right-aligned Create Document button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="dashboard-greeting-title">
            {getGreeting(user?.name || 'Writer')}
          </h2>
          <button onClick={handleCreateDocument} className="primary-btn">
            + New document
          </button>
        </div>

        {/* Document section label and divider line */}
        <div className="dashboard-section-header">
          <span className="dashboard-section-label">Your documents</span>
        </div>
        <div className="dashboard-divider"></div>

        {loading ? (
          <div className="loading-state">
            <span className="spinner" style={{ margin: '0 auto 12px' }}></span>
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="dashboard-empty-panel glass" style={{ borderStyle: 'dashed' }}>
            <div className="icon">◻</div>
            <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>No documents yet</p>
            <p style={{ fontSize: '13px', marginBottom: '16px' }}>Create one to get started</p>
            <button onClick={handleCreateDocument} className="primary-btn">
              + New document
            </button>
          </div>
        ) : (
          <div className="doc-grid-simple">
            {documents.map((doc) => {
              const isOwner = doc.owner_id === user?.id;
              const timeString = new Date(doc.updated_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={doc.id} className="doc-card-simple">
                  {/* Left part clicks to edit */}
                  <div className="doc-card-left" onClick={() => navigate(`/docs/${doc.id}`)}>
                    <h3 className="doc-card-title-text">{doc.title}</h3>
                    <p className="doc-card-meta-text">
                      Last edited by {doc.owner_name || (isOwner ? 'you' : 'collaborator')} • <span className="mono-label" style={{ fontSize: '11px' }}>{timeString}</span>
                    </p>
                  </div>

                  {/* Kebab action dropdown menu */}
                  <div className="doc-card-actions-menu" ref={activeKebabDocId === doc.id ? kebabRef : null}>
                    <button
                      type="button"
                      className="kebab-menu-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveKebabDocId(prev => prev === doc.id ? null : doc.id);
                      }}
                    >
                      ···
                    </button>

                    {activeKebabDocId === doc.id && (
                      <div className="kebab-menu-dropdown">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveKebabDocId(null);
                            handleRenameDocument(doc.id, doc.title);
                          }}
                        >
                          Rename
                        </button>
                        {isOwner && (
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveKebabDocId(null);
                              handleDeleteDocument(doc.id);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
