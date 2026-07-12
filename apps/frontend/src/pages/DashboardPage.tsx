import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useApi } from '../lib/api';
import type { DocumentRecord } from '../lib/api';
import {
  FileText,
  Users,
  Activity,
  Bell,
  Plus,
  Trash2,
  Edit2,
  Clock,
  ChevronDown
} from 'lucide-react';

export function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKebabDocId, setActiveKebabDocId] = useState<string | null>(null);
  
  const { user } = useUser();
  const { request } = useApi();
  const navigate = useNavigate();
  const kebabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

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

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return new Date().toLocaleDateString(undefined, options);
  };

  return (
    <div className="min-h-screen bg-bg-root text-text-pri flex flex-col font-sans relative">
      {/* Topbar */}
      <header className="h-[46px] bg-bg-panel border-b border-border-def flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="text-text-pri font-semibold text-xs tracking-[-0.3px]">
            collab-Editor
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button className="w-7 h-7 bg-bg-input border border-border-card hover:border-accent-subtle hover:bg-bg-elevated text-text-sec hover:text-text-pri rounded-md flex items-center justify-center transition-all duration-160">
            <Bell size={13} />
          </button>
          
          <div className="flex items-center gap-2 bg-bg-input border border-border-card rounded-[8px] p-0.5 pr-2 hover:border-accent-subtle hover:bg-bg-elevated transition-all duration-160 cursor-pointer">
            <UserButton afterSignOutUrl="/login" />
            <span className="text-text-pri text-xs font-normal max-w-[80px] truncate select-none">
              {user?.firstName || 'Writer'}
            </span>
            <ChevronDown size={10} className="text-text-muted" />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-[560px] mx-auto px-4 py-8 overflow-y-auto z-10">
        {error && (
          <div className="bg-danger/10 border border-danger/20 text-[#F87171] text-xs p-3 rounded-lg mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-text-sec hover:text-text-pri font-bold">×</button>
          </div>
        )}

        {/* Localized Greeting */}
        <div className="mb-8">
          <p className="text-[11px] text-text-muted font-normal uppercase tracking-wider">
            {getFormattedDate()}
          </p>
          <h2 className="text-xl font-semibold tracking-[-0.4px] text-text-pri mt-1">
            {getGreeting()}, {user?.firstName || 'Writer'}
          </h2>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-3 gap-2 mb-8 select-none">
          {/* Card 1 */}
          <div className="bg-bg-card border border-border-def hover:border-accent-subtle hover:bg-bg-elevated rounded-[10px] p-3.5 transition-all duration-180 hover:-translate-y-0.5 group">
            <div className="flex items-center gap-1.5 text-text-muted group-hover:text-text-sec transition-colors duration-180">
              <FileText size={12} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Documents</span>
            </div>
            <p className="text-lg font-semibold tracking-[-0.5px] text-text-pri mt-2 transition-colors duration-180 group-hover:text-white">
              {documents.length}
            </p>
            <p className="text-[10px] text-success mt-0.5">
              +1 this week
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-bg-card border border-border-def hover:border-accent-subtle hover:bg-bg-elevated rounded-[10px] p-3.5 transition-all duration-180 hover:-translate-y-0.5 group">
            <div className="flex items-center gap-1.5 text-text-muted group-hover:text-text-sec transition-colors duration-180">
              <Users size={12} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Members</span>
            </div>
            <p className="text-lg font-semibold tracking-[-0.5px] text-text-pri mt-2 transition-colors duration-180 group-hover:text-white">
              3
            </p>
            <p className="text-[10px] text-success mt-0.5">
              2 active now
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-bg-card border border-border-def hover:border-accent-subtle hover:bg-bg-elevated rounded-[10px] p-3.5 transition-all duration-180 hover:-translate-y-0.5 group">
            <div className="flex items-center gap-1.5 text-text-muted group-hover:text-text-sec transition-colors duration-180">
              <Activity size={12} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Edits</span>
            </div>
            <p className="text-lg font-semibold tracking-[-0.5px] text-text-pri mt-2 transition-colors duration-180 group-hover:text-white">
              142
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              Across 2 docs
            </p>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex justify-between items-center mb-2.5 select-none">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
            Your documents
          </span>
          <button
            onClick={handleCreateDocument}
            className="bg-accent hover:bg-accent-h text-white text-[11px] font-medium px-3 py-1.5 rounded-[6px] flex items-center gap-1 transition-colors duration-180 active:scale-[0.96]"
          >
            <Plus size={12} />
            <span>New</span>
          </button>
        </div>

        {/* Document Rows */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 border border-border-def rounded-lg bg-bg-card select-none">
            <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></span>
            <span className="text-xs text-text-sec mt-3">Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="border border-dashed border-border-def rounded-[10px] bg-bg-card py-10 px-4 flex flex-col items-center text-center select-none">
            <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center text-text-muted text-lg mb-3">
              ◻
            </div>
            <h4 className="text-sm font-semibold text-text-pri mb-1">No documents yet</h4>
            <p className="text-xs text-text-sec mb-4">Create your first collaborative document to get started</p>
            <button
              onClick={handleCreateDocument}
              className="bg-accent hover:bg-accent-h text-white text-[11px] font-medium px-3.5 py-1.5 rounded-[6px] transition-colors duration-180 active:scale-[0.96]"
            >
              Create Document
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {documents.map((doc, idx) => {
              const isOwner = doc.owner_id === user?.id;
              // Mock first doc as active/live for demonstration aesthetics
              const isLive = idx === 0; 
              const timeString = new Date(doc.updated_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={doc.id}
                  className="group relative bg-bg-card border border-border-def hover:border-accent-subtle hover:bg-bg-elevated rounded-[8px] p-2.5 pl-3.5 flex items-center justify-between transition-all duration-180 hover:pl-[18px] overflow-hidden"
                >
                  {/* Left Accent Bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-[2px] bg-accent transition-transform duration-180 origin-center ${
                      isLive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
                    }`}
                  />

                  {/* Left Info Column */}
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 mr-4"
                    onClick={() => navigate(`/docs/${doc.id}`)}
                  >
                    <div
                      className={`w-[34px] h-[34px] rounded-[7px] flex items-center justify-center transition-transform duration-180 group-hover:scale-108 ${
                        isLive ? 'bg-[#1E1828] text-[#A78BFA]' : 'bg-[#111118] text-[#44445A]'
                      }`}
                    >
                      <FileText size={16} />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-text-dim group-hover:text-text-pri transition-colors duration-180">
                        {doc.title}
                      </span>
                      <span className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1.5">
                        <Clock size={10} />
                        Edited {timeString}
                      </span>
                    </div>
                  </div>

                  {/* Right Action / Badges Column */}
                  <div className="flex items-center gap-3 select-none">
                    {isLive ? (
                      <span className="bg-[#052e16] text-[#34D399] border border-[#166534] text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[#34D399] animate-pulse"></span>
                        Live
                      </span>
                    ) : (
                      <span className="bg-bg-card text-text-muted border border-border-card text-[9px] font-medium px-2 py-0.5 rounded-full">
                        Solo
                      </span>
                    )}

                    {/* Kebab Action Trigger */}
                    <div className="relative" ref={activeKebabDocId === doc.id ? kebabRef : null}>
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-pri rounded-md hover:bg-bg-input transition-colors duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveKebabDocId(prev => prev === doc.id ? null : doc.id);
                        }}
                      >
                        ···
                      </button>

                      {activeKebabDocId === doc.id && (
                        <div className="absolute right-0 mt-1 w-28 bg-[#10101E] border border-border-card rounded-md py-1 shadow-lg z-30">
                          <button
                            type="button"
                            className="w-full text-left text-xs px-3 py-1.5 hover:bg-bg-input text-text-pri flex items-center gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveKebabDocId(null);
                              handleRenameDocument(doc.id, doc.title);
                            }}
                          >
                            <Edit2 size={11} />
                            Rename
                          </button>
                          {isOwner && (
                            <button
                              type="button"
                              className="w-full text-left text-xs px-3 py-1.5 hover:bg-danger/10 text-danger flex items-center gap-1.5 border-t border-border-def/50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveKebabDocId(null);
                                handleDeleteDocument(doc.id);
                              }}
                            >
                              <Trash2 size={11} />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Activity Feed Section */}
        <div className="mt-8 select-none">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest block mb-2.5">
            Recent Activity
          </span>

          <div className="bg-bg-card border border-border-def rounded-[10px] px-3.5 py-1">
            {/* Activity Row 1 */}
            <div className="group flex items-center gap-2.5 py-2.5 border-b border-[#131320] transition-all duration-150 hover:bg-bg-elevated hover:mx-[-14px] hover:px-[14px] hover:rounded-[6px] hover:text-[#666688]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] shrink-0" />
              <p className="text-xs text-text-muted">
                <span className="text-text-sec group-hover:text-[#8888AA] font-medium mr-1">Rohan</span>
                joined active document session
              </p>
              <span className="text-[10px] text-text-faint ml-auto">12m ago</span>
            </div>

            {/* Activity Row 2 */}
            <div className="group flex items-center gap-2.5 py-2.5 border-b border-[#131320] transition-all duration-150 hover:bg-bg-elevated hover:mx-[-14px] hover:px-[14px] hover:rounded-[6px] hover:text-[#666688]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F472B6] shrink-0" />
              <p className="text-xs text-text-muted">
                <span className="text-text-sec group-hover:text-[#8888AA] font-medium mr-1">Priya</span>
                edited document title to "Project briefing"
              </p>
              <span className="text-[10px] text-text-faint ml-auto">1h ago</span>
            </div>

            {/* Activity Row 3 */}
            <div className="group flex items-center gap-2.5 py-2.5 border-b border-[#131320] transition-all duration-150 hover:bg-bg-elevated hover:mx-[-14px] hover:px-[14px] hover:rounded-[6px] hover:text-[#666688]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] shrink-0" />
              <p className="text-xs text-text-muted">
                Document sharing link was copied to clipboard
              </p>
              <span className="text-[10px] text-text-faint ml-auto">3h ago</span>
            </div>

            {/* Activity Row 4 */}
            <div className="group flex items-center gap-2.5 py-2.5 transition-all duration-150 hover:bg-bg-elevated hover:mx-[-14px] hover:px-[14px] hover:rounded-[6px] hover:text-[#666688]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6E56CF] shrink-0" />
              <p className="text-xs text-text-muted">
                <span className="text-text-sec group-hover:text-[#8888AA] font-medium mr-1">You</span>
                created a new collaborative document
              </p>
              <span className="text-[10px] text-text-faint ml-auto">Yesterday</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
