import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, FileText, Copy, Check, Edit2, Trash2 } from 'lucide-react';

interface DocMenuProps {
  docId: string;
  isOwner: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  /** Extra classes for the "···" trigger (e.g. to only show it on row hover). */
  buttonClassName?: string;
}

const MENU_WIDTH = 176;
const MENU_HEIGHT_ESTIMATE = 178;

/**
 * Per-document action menu (Open / Open in new tab / Rename / Copy link / Delete).
 *
 * The dropdown is rendered through a portal with fixed positioning on purpose:
 * rows and the editor sidebar use `overflow-hidden`, which would clip an
 * absolutely positioned dropdown down to a sliver.
 */
export function DocMenu({
  docId,
  isOwner,
  onOpen,
  onRename,
  onDelete,
  buttonClassName = '',
}: DocMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const docUrl = `${window.location.origin}/docs/${docId}`;

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = Math.max(
      8,
      Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)
    );
    // Flip above the trigger when there isn't enough room below it.
    const fitsBelow = window.innerHeight - rect.bottom >= MENU_HEIGHT_ESTIMATE + 8;
    const top = fitsBelow
      ? rect.bottom + 4
      : Math.max(8, rect.top - MENU_HEIGHT_ESTIMATE - 4);

    setPos({ top, left });
    setOpen(true);
  };

  // Close on outside click, Escape, resize and any scroll.
  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const run = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    action();
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(docUrl);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
    setCopied(true);
    // Keep the menu open briefly so the "Copied" confirmation is visible.
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 900);
  };

  const itemClass =
    'w-full text-left text-[12px] px-3 py-1.5 flex items-center gap-2 text-text-dim hover:bg-bg-input hover:text-text-pri transition-colors duration-100';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Document options"
        aria-haspopup="menu"
        aria-expanded={open}
        data-open={open}
        className={`w-7 h-7 shrink-0 flex items-center justify-center text-text-muted hover:text-text-pri rounded-md hover:bg-bg-input transition-all duration-150 data-[open=true]:opacity-100 data-[open=true]:bg-bg-input data-[open=true]:text-text-pri ${buttonClassName}`}
        onClick={toggle}
      >
        ···
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="animate-menu-in fixed z-[1000] bg-[#0D0D18] border border-border-card rounded-lg py-1 shadow-[0_8px_30px_rgba(0,0,0,0.6)] select-none"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" role="menuitem" className={itemClass} onClick={run(onOpen)}>
              <FileText size={12} />
              Open
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={run(() => window.open(docUrl, '_blank', 'noopener'))}
            >
              <ExternalLink size={12} />
              Open in new tab
            </button>
            <button type="button" role="menuitem" className={itemClass} onClick={run(onRename)}>
              <Edit2 size={12} />
              Rename
            </button>
            <button type="button" role="menuitem" className={itemClass} onClick={handleCopy}>
              {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            {isOwner && (
              <button
                type="button"
                role="menuitem"
                className="w-full text-left text-[12px] px-3 py-1.5 flex items-center gap-2 text-[#F87171] hover:bg-[#F87171]/10 border-t border-border-def mt-1 pt-2 transition-colors duration-100"
                onClick={run(onDelete)}
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
