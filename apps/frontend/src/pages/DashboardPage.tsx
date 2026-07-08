import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../lib/api';
import type { DocumentRecord } from '../lib/api';

/**
 * DashboardPage lists all documents the authenticated user has access to.
 * Supports document creation, title loading, and owner deletion constraints.
 */
export function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/auth');
      return;
    }

    fetchDocuments();
  }, [navigate]);

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

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const title = newTitle.trim() || 'Untitled Document';
      const response = await request('/docs', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });

      setNewTitle('');
      // Redirect straight to editing room
      navigate(`/docs/${response.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDocument = async (docId: string, event: React.MouseEvent) => {
    event.preventDefault(); // Stop Link routing triggers
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await request(`/docs/${docId}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header glass">
        <div className="header-logo">
          <h1>CollabWrite</h1>
          <span className="user-badge">Hi, {user?.name || 'User'}</span>
        </div>
        <button onClick={handleLogout} className="logout-btn secondary-btn">
          Log Out
        </button>
      </header>

      <main className="dashboard-content">
        {error && <div className="error-alert">{error}</div>}

        <section className="create-doc-section glass">
          <h2>Create a New Document</h2>
          <form onSubmit={handleCreateDocument} className="create-doc-form">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter document title (e.g. Project Specs)..."
              disabled={creating}
            />
            <button type="submit" className="primary-btn" disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </form>
        </section>

        <section className="docs-list-section">
          <h2>Your Documents</h2>

          {loading ? (
            <div className="loading-state">Loading your documents...</div>
          ) : documents.length === 0 ? (
            <div className="empty-state glass">
              <p>You don't have any documents yet. Create one above to get started!</p>
            </div>
          ) : (
            <div className="docs-grid">
              {documents.map((doc) => {
                const isOwner = doc.owner_id === user?.id;
                return (
                  <div key={doc.id} className="doc-card glass">
                    <Link to={`/docs/${doc.id}`} className="doc-card-link">
                      <div className="doc-card-body">
                        <h3 className="doc-title">{doc.title}</h3>
                        <p className="doc-meta">
                          Owner: <strong>{doc.owner_name || (isOwner ? 'Me' : 'Collaborator')}</strong>
                        </p>
                        <p className="doc-date">
                          Updated: {new Date(doc.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </Link>
                    <div className="doc-card-actions">
                      {isOwner && (
                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="delete-doc-btn"
                          title="Delete Document"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
