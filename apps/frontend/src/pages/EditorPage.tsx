import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useDocument } from '../hooks/useDocument';
import { Editor } from '../components/Editor';
import { CursorOverlay } from '../components/CursorOverlay';
import { DocMenu } from '../components/DocMenu';
import { useApi } from '../lib/api';
import type { DocumentRecord } from '../lib/api';
import { 
  Menu, 
  Plus, 
  FileText, 
  Share2, 
  Check, 
  Copy, 
  ArrowLeft 
} from 'lucide-react';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { request } = useApi();

  const {
    document,
    loading,
    error,
    activeUsers,
    initializeEditor,
    updateTitle,
    quill,
    status,
    statusMessage,
    saving
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
    request('/docs')
      .then(setSidebarDocs)
      .catch(console.error);
  }, [id]);

  // Keep the sidebar entry's title in sync when the open document is renamed from the topbar
  useEffect(() => {
    if (!document) return;
    setSidebarDocs(prev =>
      prev.map(d => (d.id === document.id && d.title !== document.title ? { ...d, title: document.title } : d))
    );
  }, [document?.id, document?.title]);

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

  // Sidebar document actions
  const handleSidebarRename = async (doc: DocumentRecord) => {
    const next = window.prompt('Rename document:', doc.title);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      window.alert('Title cannot be empty');
      return;
    }
    if (trimmed === doc.title) return;

    try {
      if (doc.id === id) {
        // Current document: go through the hook so the topbar/title state stays in sync
        await updateTitle(trimmed);
      } else {
        await request(`/docs/${doc.id}/title`, {
          method: 'PATCH',
          body: JSON.stringify({ title: trimmed }),
        });
      }
      setSidebarDocs(prev => prev.map(d => (d.id === doc.id ? { ...d, title: trimmed } : d)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to rename document');
    }
  };

  const handleSidebarDelete = async (doc: DocumentRecord) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await request(`/docs/${doc.id}`, { method: 'DELETE' });
      const remaining = sidebarDocs.filter(d => d.id !== doc.id);
      setSidebarDocs(remaining);
      if (doc.id === id) {
        navigate(remaining.length > 0 ? `/docs/${remaining[0].id}` : '/dashboard');
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const getInitials = (name: string) => {
    return name.substring(0, 1).toUpperCase();
  };

  // Topbar sync indicator derived from socket connection + in-flight ops
  const syncIndicator = (() => {
    if (status === 'error') return { dot: 'bg-[#F87171]', label: 'Sync error', pulse: false };
    if (status === 'offline') return { dot: 'bg-[#FBBF24]', label: 'Reconnecting…', pulse: true };
    if (status === 'connecting') return { dot: 'bg-[#FBBF24]', label: 'Connecting…', pulse: true };
    if (saving) return { dot: 'bg-[#FBBF24]', label: 'Saving…', pulse: true };
    return { dot: 'bg-success', label: 'Saved', pulse: false };
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-root flex flex-col items-center justify-center select-none text-text-sec">
        <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></span>
        <span className="text-xs mt-3">Loading collaborative session...</span>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-bg-root flex flex-col items-center justify-center px-6 text-center select-none">
        <div className="bg-bg-card border border-border-def rounded-xl p-8 max-w-sm w-full">
          <h2 className="text-sm font-semibold text-text-pri mb-2">Failed to connect</h2>
          <p className="text-xs text-text-sec mb-5">{error || 'Document not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-accent hover:bg-accent-h text-white text-xs font-medium py-2 rounded-lg transition-colors duration-150"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const displayedAvatars = activeUsers.slice(0, 4);
  const extraCount = activeUsers.length - displayedAvatars.length;

  return (
    <div className="min-h-screen bg-bg-root flex flex-col font-sans relative">
      {/* Topbar (46px tall, fixed height) */}
      <header className="h-[46px] bg-bg-panel border-b border-border-def flex items-center justify-between px-3.5 z-20 shrink-0 select-none">
        <div className="flex items-center flex-1 min-w-0 mr-4">
          {/* Sidebar Toggle Button */}
          <button 
            type="button" 
            className="w-7 h-7 flex items-center justify-center text-text-sec hover:text-text-pri hover:bg-bg-elevated rounded-md transition-all duration-160 mr-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            <Menu size={14} />
          </button>
          
          {/* Logo Mark */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-5.5 h-5.5 rounded bg-accent flex items-center justify-center text-white font-bold text-xs">
              C
            </div>
            <span className="text-text-pri font-semibold text-[12px] tracking-[-0.2px]">
              collab-Editor
            </span>
          </div>

          <div className="hidden sm:block w-[1px] h-3.5 bg-border-def mx-3" />

          {/* Editable Document Title */}
          <div className="flex items-center min-w-0">
            <input
              type="text"
              className="bg-transparent border-none text-text-pri font-medium text-[12px] outline-none placeholder:text-text-muted focus:border-b focus:border-accent focus:pb-[1px] w-full max-w-[160px] md:max-w-[280px] truncate"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled document"
            />
          </div>
        </div>

        {/* Topbar Right */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Save / connection indicator */}
          <div
            className="bg-bg-card border border-border-def rounded-full px-2.5 py-0.5 flex items-center gap-1.5 text-[10px]"
            title={statusMessage ?? undefined}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${syncIndicator.dot} ${syncIndicator.pulse ? 'animate-pulse' : ''}`}></span>
            <span className="text-text-dim font-normal">
              {syncIndicator.label}
              {statusMessage && status !== 'connected' ? ` — ${statusMessage}` : ''}
            </span>
          </div>

          {/* Avatars Stack */}
          <div className="flex items-center -space-x-1.5">
            {/* Self Avatar */}
            <div
              className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-white text-[9.5px] font-semibold bg-accent ring-2 ring-[#0B0B14] shrink-0 uppercase"
              title="You"
            >
              {user?.firstName ? getInitials(user.firstName) : 'Y'}
            </div>

            {displayedAvatars.map((u) => (
              <div
                key={u.userId}
                className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-white text-[9.5px] font-semibold ring-2 ring-[#0B0B14] shrink-0 uppercase"
                style={{ backgroundColor: u.color }}
                title={u.name}
              >
                {getInitials(u.name)}
              </div>
            ))}

            {extraCount > 0 && (
              <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-text-sec text-[9px] font-semibold bg-bg-card border border-border-card ring-2 ring-[#0B0B14] shrink-0">
                +{extraCount}
              </div>
            )}
          </div>

          {/* Share Button & Popover */}
          <div className="relative" ref={shareOpen ? popoverRef : null}>
            <button
              type="button"
              className="bg-accent hover:bg-accent-h text-white text-[11px] font-medium px-3 py-1.5 rounded-[6px] transition-colors duration-180 active:scale-[0.96] flex items-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                setShareOpen(prev => !prev);
              }}
            >
              <Share2 size={12} />
              <span>Share</span>
            </button>

            {shareOpen && (
              <div className="absolute right-0 mt-2.5 w-64 bg-[#0D0D18] border border-border-card rounded-lg p-3.5 shadow-xl z-30 select-text">
                <h4 className="text-xs font-semibold text-text-pri mb-1">Share link</h4>
                <p className="text-[10px] text-text-sec leading-relaxed mb-3">
                  Anyone with this link can join and collaborate on this document.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    className="flex-1 bg-bg-input border border-border-card rounded-md text-[11px] text-text-dim px-2 py-1 outline-none truncate"
                    value={window.location.href}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    className="bg-bg-input border border-border-card hover:border-accent-subtle hover:bg-bg-elevated text-text-pri text-[11px] font-medium px-2.5 py-1 rounded-md transition-all duration-150 flex items-center justify-center shrink-0"
                    onClick={handleCopyLink}
                  >
                    {copyStatus === 'copied' ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main layout container (Calculated viewport height minus topbar) */}
      <div className="flex-1 flex overflow-hidden w-full relative z-10">
        {/* Collapsible Sidebar */}
        <aside 
          className="bg-bg-panel border-r border-border-def relative flex flex-col h-full overflow-hidden shrink-0 select-none layout-transition"
          style={{ width: sidebarOpen ? '210px' : '0px' }}
        >
          <div className="flex flex-col flex-1 p-3 overflow-y-auto">
            {/* Navigation title */}
            <span className="text-[10px] font-semibold text-[#3D3D50] uppercase tracking-widest block px-2 mb-2">
              Your documents
            </span>
            
            <nav className="flex flex-col gap-0.5">
              {sidebarDocs.map((doc) => {
                const isActive = doc.id === id;
                return (
                  <div
                    key={doc.id}
                    className={`group relative flex items-center rounded-md border-l-2 transition-all duration-120 hover:bg-bg-elevated ${
                      isActive ? 'bg-[#6E56CF1A] border-accent' : 'border-transparent'
                    }`}
                  >
                    <Link
                      to={`/docs/${doc.id}`}
                      className={`flex-1 min-w-0 text-[12px] px-2.5 py-1.5 flex items-center gap-2 transition-colors duration-120 ${
                        isActive
                          ? 'text-text-pri font-medium'
                          : 'text-text-sec hover:text-[#EDEDEE]'
                      }`}
                    >
                      <FileText size={13} className="shrink-0" />
                      <span className="truncate">{doc.title}</span>
                    </Link>

                    {/* Per-document actions, revealed on hover (always visible while open) */}
                    <DocMenu
                      docId={doc.id}
                      isOwner={doc.owner_id === user?.id}
                      onOpen={() => navigate(`/docs/${doc.id}`)}
                      onRename={() => handleSidebarRename(doc)}
                      onDelete={() => handleSidebarDelete(doc)}
                      buttonClassName="mr-1 w-6! h-6! opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    />
                  </div>
                );
              })}
            </nav>
          </div>

          {/* New Document Button in Sidebar Bottom */}
          <div className="border-t border-border-def p-3 shrink-0">
            <button
              type="button"
              className="w-full text-left text-[12px] text-text-muted hover:text-text-sec flex items-center gap-1.5 transition-colors duration-150 py-1"
              onClick={handleCreateSidebarDoc}
            >
              <Plus size={13} />
              <span>New document</span>
            </button>
          </div>
        </aside>

        {/* Editor canvas workspace wrapper */}
        <main className="flex-1 bg-bg-root overflow-y-auto relative p-6 select-text flex flex-col justify-start items-center">
          
          {/* Dashboard Back navigation float */}
          <div className="absolute left-6 top-6 z-20 select-none">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-7 h-7 flex items-center justify-center bg-bg-panel border border-border-def text-text-sec hover:text-text-pri rounded-md hover:bg-bg-elevated hover:border-accent-subtle transition-all duration-150 shadow"
              title="Dashboard"
            >
              <ArrowLeft size={13} />
            </button>
          </div>

          {/* Revision Counter in JetBrains Mono font */}
          <div className="absolute right-6 top-6 text-[10px] font-mono text-text-muted select-none z-20">
            rev {document.revision}
          </div>

          {/* Physical off-white page element */}
          <div className="mx-auto my-8 bg-bg-editor max-w-[600px] w-full p-[52px_64px_80px] shadow-[0_2px_20px_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(0,0,0,0.06)] select-text relative text-left">
            {/* Eyebrow Subject Label */}
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.8px] mb-1 select-none">
              Workspace Document
            </div>
            
            {/* Lora title header */}
            <h1 className="font-serif italic text-[22px] text-gray-900 mb-1 leading-normal">
              {document.title}
            </h1>
            
            {/* Mini purple accent rule */}
            <div className="w-8 h-[2px] bg-accent rounded-sm mb-5 select-none" />

            {/* Quill Text Editor Canvas Wrapper */}
            <div className="relative">
              <Editor onMount={initializeEditor} />
              <CursorOverlay quill={quill} activeUsers={activeUsers} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default EditorPage;
