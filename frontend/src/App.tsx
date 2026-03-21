import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createContent,
  deleteContent,
  getContent,
  getSharedBrain,
  getSharedNote,
  shareNote,
  signin,
  signup,
  updateContent,
  updateShare
} from "./api";
import type { ContentItem } from "./types";

const TOKEN_KEY = "second_brain_token";
const USER_KEY = "second_brain_user";

type AuthMode = "signin" | "signup";
type NoteType = "all" | "note" | "tweet" | "video" | "article" | "image";

// ─── Toast system ──────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  kind: "ok" | "err" | "info";
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const push = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);
  return { toasts, push };
}

function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span className="toast-icon">{t.kind === "ok" ? "✓" : t.kind === "err" ? "✕" : "ℹ"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

function typeIcon(type: string) {
  const icons: Record<string, string> = {
    note: "📝",
    tweet: "🐦",
    video: "📺",
    article: "📄",
    image: "🖼️"
  };
  return icons[type] ?? "📝";
}

function typeBadgeClass(type: string) {
  return `badge-${type ?? "note"}`;
}

function formatDate(date?: string) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}

// ─── CopyButton ────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" className="copy-btn" onClick={() => void handleCopy()}>
      {copied ? "✓ Copied!" : "Copy link"}
    </button>
  );
}

// ─── AuthPage ──────────────────────────────────────────────────

interface AuthPageProps {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  statusMsg: string;
}

function AuthPage({ mode, setMode, username, setUsername, password, setPassword, onSubmit, statusMsg }: AuthPageProps) {
  return (
    <div className="auth-shell">
      <div className="auth-blob blob-a" />
      <div className="auth-blob blob-b" />
      <div className="auth-blob blob-c" />

      <main className="auth-layout">
        {/* Hero panel */}
        <section className="auth-hero">
          <div className="auth-brand">
            <span className="brand-icon-lg">🧠</span>
            <span className="brand-name">Second Brain</span>
          </div>
          <h1 className="auth-headline">Your private thinking studio</h1>
          <p className="auth-sub">
            Capture notes, articles, tweets and videos in one place. Everything stays private until
            you decide to share.
          </p>

          <div className="feature-pills">
            <div className="feature-pill">🔒 Private by default</div>
            <div className="feature-pill">⚡ Instant capture</div>
            <div className="feature-pill">🔗 One-click sharing</div>
            <div className="feature-pill">🏷️ Multiple content types</div>
          </div>

          <div className="preview-cards">
            <div className="preview-card pc-1">
              <span className="pc-badge badge-note">📝 note</span>
              <strong>Q4 Launch Strategy</strong>
              <p>Key milestones and deliverables for the product launch…</p>
            </div>
            <div className="preview-card pc-2">
              <span className="pc-badge badge-tweet">🐦 tweet</span>
              <strong>Interesting AI thread</strong>
              <p>Deep dive on large language models saved for later…</p>
            </div>
            <div className="preview-card pc-3">
              <span className="pc-badge badge-video">📺 video</span>
              <strong>System Design Interview</strong>
              <p>youtube.com/watch?v=abc123…</p>
            </div>
          </div>
        </section>

        {/* Auth form panel */}
        <section className="auth-panel card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === "signin" ? "auth-tab-active" : ""}`}
              onClick={() => setMode("signin")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === "signup" ? "auth-tab-active" : ""}`}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-form-header">
            <h2>{mode === "signin" ? "Welcome back 👋" : "Create account 🚀"}</h2>
            <p className="muted">
              {mode === "signin"
                ? "Sign in to open your private workspace."
                : "Register in seconds, start capturing ideas."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="form-stack">
            <div className="form-field">
              <label htmlFor="auth-username">Username</label>
              <input
                id="auth-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                required
                autoComplete="username"
              />
            </div>
            <div className="form-field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <button type="submit" className="btn-primary btn-full">
              {mode === "signin" ? "Open Workspace →" : "Create Workspace →"}
            </button>
          </form>

          {statusMsg !== "Ready" && statusMsg.length > 0 && (
            <div className="auth-status-msg">{statusMsg}</div>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── AddNotePanel ──────────────────────────────────────────────

interface NoteFormData {
  title: string;
  content: string;
  link: string;
  type: string;
}

interface AddNotePanelProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: NoteFormData) => Promise<void>;
}

function AddNotePanel({ open, onClose, onSave }: AddNotePanelProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState("note");
  const [saving, setSaving] = useState(false);

  const types: { key: string; icon: string; label: string }[] = [
    { key: "note", icon: "📝", label: "Note" },
    { key: "tweet", icon: "🐦", label: "Tweet" },
    { key: "video", icon: "📺", label: "Video" },
    { key: "article", icon: "📄", label: "Article" },
    { key: "image", icon: "🖼️", label: "Image" }
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ title, content, link, type });
    setSaving(false);
    setTitle("");
    setContent("");
    setLink("");
    setType("note");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Add note">
      <div className="slide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>✨ New Note</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="panel-body form-stack">
          <div className="form-field">
            <label>Content Type</label>
            <div className="type-chips">
              {types.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`type-chip ${type === t.key ? "type-chip-active" : ""}`}
                  onClick={() => setType(t.key)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="np-title">Title</label>
            <input
              id="np-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this note a title…"
            />
          </div>

          <div className="form-field">
            <label htmlFor="np-content">
              Content <span className="required-star">*</span>
            </label>
            <textarea
              id="np-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts, paste content, save anything…"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="np-link">
              Reference Link <span className="optional-label">(optional)</span>
            </label>
            <input
              id="np-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="panel-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── EditNotePanel ─────────────────────────────────────────────

interface EditNotePanelProps {
  note: ContentItem | null;
  onClose: () => void;
  onSave: (id: string, data: NoteFormData) => Promise<void>;
}

function EditNotePanel({ note, onClose, onSave }: EditNotePanelProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState("note");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? "");
      setContent(note.content ?? "");
      setLink(note.link ?? "");
      setType(note.type ?? "note");
    }
  }, [note]);

  const types: { key: string; icon: string; label: string }[] = [
    { key: "note", icon: "📝", label: "Note" },
    { key: "tweet", icon: "🐦", label: "Tweet" },
    { key: "video", icon: "📺", label: "Video" },
    { key: "article", icon: "📄", label: "Article" },
    { key: "image", icon: "🖼️", label: "Image" }
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!note) return;
    setSaving(true);
    await onSave(note._id, { title, content, link, type });
    setSaving(false);
    onClose();
  }

  if (!note) return null;

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Edit note">
      <div className="slide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>✏️ Edit Note</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="panel-body form-stack">
          <div className="form-field">
            <label>Content Type</label>
            <div className="type-chips">
              {types.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`type-chip ${type === t.key ? "type-chip-active" : ""}`}
                  onClick={() => setType(t.key)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="ep-title">Title</label>
            <input id="ep-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title…" />
          </div>

          <div className="form-field">
            <label htmlFor="ep-content">
              Content <span className="required-star">*</span>
            </label>
            <textarea
              id="ep-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Content…"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="ep-link">
              Reference Link <span className="optional-label">(optional)</span>
            </label>
            <input
              id="ep-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="panel-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Update Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ShareNotePanel ────────────────────────────────────────────

interface ShareNotePanelProps {
  note: ContentItem | null;
  onClose: () => void;
  onShare: (id: string) => Promise<void>;
  getUrl: (hash: string) => string;
}

function ShareNotePanel({ note, onClose, onShare, getUrl }: ShareNotePanelProps) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (!note) return;
    setSharing(true);
    await onShare(note._id);
    setSharing(false);
  }

  if (!note) return null;

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Share note">
      <div className="center-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>🔗 Share Note</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="panel-body">
          <div className="share-note-preview">
            <span className={`type-badge ${typeBadgeClass(note.type)}`}>
              {typeIcon(note.type)} {note.type}
            </span>
            <h4 className="share-note-title">{note.title || "Untitled note"}</h4>
            <p className="share-note-excerpt">
              {(note.content ?? "").slice(0, 200)}
              {(note.content?.length ?? 0) > 200 ? "…" : ""}
            </p>
          </div>

          {note.sharedHash ? (
            <div className="share-active-box">
              <div className="share-status">
                <span className="dot-green" />
                <strong>Publicly shared</strong>
              </div>
              <p className="muted share-hint">Anyone with this link can view this note.</p>
              <div className="share-link-row">
                <input readOnly className="share-link-input" value={getUrl(note.sharedHash)} />
                <CopyButton text={getUrl(note.sharedHash)} />
              </div>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => void handleShare()}
                disabled={sharing}
              >
                {sharing ? "Refreshing…" : "↻ Refresh link"}
              </button>
            </div>
          ) : (
            <div className="share-pending-box">
              <div className="share-status">
                <span className="dot-gray" />
                <strong>Private — not shared</strong>
              </div>
              <p className="muted share-hint">
                Generate a public link so anyone can read this note without logging in.
              </p>
              <button type="button" className="btn-primary" onClick={() => void handleShare()} disabled={sharing}>
                {sharing ? "Generating…" : "🔗 Generate share link"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LookupPanel ──────────────────────────────────────────────

interface LookupPanelProps {
  open: boolean;
  onClose: () => void;
  onLookupNote: (hash: string) => Promise<void>;
  onLookupBrain: (hash: string) => Promise<void>;
}

function LookupPanel({ open, onClose, onLookupNote, onLookupBrain }: LookupPanelProps) {
  const [noteHash, setNoteHash] = useState("");
  const [brainHash, setBrainHash] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleNote(e: FormEvent) {
    e.preventDefault();
    if (!noteHash.trim()) return;
    setLoading(true);
    await onLookupNote(noteHash.trim());
    setLoading(false);
  }

  async function handleBrain(e: FormEvent) {
    e.preventDefault();
    if (!brainHash.trim()) return;
    setLoading(true);
    await onLookupBrain(brainHash.trim());
    setLoading(false);
  }

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="View shared content">
      <div className="center-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>👁 View Shared Content</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="panel-body form-stack">
          <div>
            <h4 className="lookup-section-title">🗒 Load a shared note</h4>
            <p className="muted">Paste the note share hash or full URL to view it.</p>
            <form onSubmit={handleNote} className="lookup-form">
              <input
                value={noteHash}
                onChange={(e) => setNoteHash(e.target.value)}
                placeholder="Note share hash…"
              />
              <button type="submit" className="btn-primary" disabled={loading || !noteHash.trim()}>
                Load
              </button>
            </form>
          </div>

          <div className="lookup-divider" />

          <div>
            <h4 className="lookup-section-title">🧠 Load a shared brain</h4>
            <p className="muted">Enter a brain board share hash to view all public notes.</p>
            <form onSubmit={handleBrain} className="lookup-form">
              <input
                value={brainHash}
                onChange={(e) => setBrainHash(e.target.value)}
                placeholder="Brain share hash…"
              />
              <button type="submit" className="btn-primary" disabled={loading || !brainHash.trim()}>
                Load
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SharedBrainModal ──────────────────────────────────────────

interface SharedBrainModalProps {
  open: boolean;
  owner: string;
  items: ContentItem[];
  onClose: () => void;
}

function SharedBrainModal({ open, owner, items, onClose }: SharedBrainModalProps) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Shared brain">
      <div className="wide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>🧠 @{owner}'s Brain</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="panel-body">
          {items.length === 0 ? (
            <p className="muted">No public notes in this brain.</p>
          ) : (
            <div className="public-notes-grid">
              {items.map((item) => (
                <div key={item._id} className="public-note-card">
                  <span className={`type-badge ${typeBadgeClass(item.type)}`}>
                    {typeIcon(item.type)} {item.type}
                  </span>
                  <strong className="pub-title">{item.title || "Untitled"}</strong>
                  <p className="pub-content">
                    {(item.content ?? "").slice(0, 150)}
                    {(item.content?.length ?? 0) > 150 ? "…" : ""}
                  </p>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="pub-link">
                      🔗 {safeDomain(item.link)}
                    </a>
                  )}
                  {item.createdAt && <small className="pub-date">{formatDate(item.createdAt)}</small>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ViewPublicNoteModal ───────────────────────────────────────

interface ViewPublicNoteModalProps {
  open: boolean;
  note: ContentItem | null;
  owner: string;
  onClose: () => void;
}

function ViewPublicNoteModal({ open, note, owner, onClose }: ViewPublicNoteModalProps) {
  if (!open || !note) return null;
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Shared note">
      <div className="center-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>Shared Note</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="panel-body pub-note-body">
          <span className={`type-badge ${typeBadgeClass(note.type)}`}>
            {typeIcon(note.type)} {note.type}
          </span>
          <h2 className="pub-note-title">{note.title || "Untitled"}</h2>
          <p className="pub-note-content">{note.content}</p>
          {note.link && (
            <a href={note.link} target="_blank" rel="noreferrer" className="pub-link-lg">
              🔗 {note.link}
            </a>
          )}
          <p className="pub-note-meta">Shared by @{owner || "unknown"}</p>
        </div>
      </div>
    </div>
  );
}

// ─── NoteCard ──────────────────────────────────────────────────

interface NoteCardProps {
  note: ContentItem;
  onDelete: (id: string) => void;
  onShare: (note: ContentItem) => void;
  onEdit: (note: ContentItem) => void;
}

function NoteCard({ note, onDelete, onShare, onEdit }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const contentText = note.content ?? "";
  const isLong = contentText.length > 180;
  const displayText = expanded ? contentText : contentText.slice(0, 180);

  return (
    <article className={`note-card nc-type-${note.type ?? "note"}`}>
      <div className="nc-top">
        <span className={`type-badge ${typeBadgeClass(note.type)}`}>
          {typeIcon(note.type)} {note.type}
        </span>
        {note.sharedHash && (
          <span className="shared-badge" title="Shared publicly">
            🔗 shared
          </span>
        )}
      </div>

      <h3 className="nc-title">{note.title || "Untitled"}</h3>

      <p className="nc-content">
        {displayText}
        {isLong && !expanded ? "…" : ""}
      </p>

      {isLong && (
        <button type="button" className="expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less ↑" : "Read more ↓"}
        </button>
      )}

      {note.link && (
        <a href={note.link} className="nc-link" target="_blank" rel="noreferrer">
          🔗 {safeDomain(note.link)}
        </a>
      )}

      <div className="nc-footer">
        <span className="nc-date">{formatDate(note.createdAt)}</span>
        <div className="nc-actions">
          <button type="button" className="nc-btn nc-edit" title="Edit" onClick={() => onEdit(note)}>
            ✏️
          </button>
          <button type="button" className="nc-btn nc-share" title="Share" onClick={() => onShare(note)}>
            🔗
          </button>
          <button type="button" className="nc-btn nc-delete" title="Delete" onClick={() => onDelete(note._id)}>
            🗑️
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── EmptyState ────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🧠</div>
      <h3>Your brain is empty</h3>
      <p>Start capturing notes, links, tweets, and ideas. Everything stays private until you share it.</p>
      <button type="button" className="btn-primary" onClick={onAdd}>
        + Add your first note
      </button>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────

interface SidebarProps {
  username: string;
  items: ContentItem[];
  selectedType: NoteType;
  onTypeChange: (t: NoteType) => void;
  shareHash: string;
  onLogout: () => void;
  onShareBrain: () => void;
  onRemoveShareBrain: () => void;
  onCopyBrainLink: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function Sidebar({
  username,
  items,
  selectedType,
  onTypeChange,
  shareHash,
  onLogout,
  onShareBrain,
  onRemoveShareBrain,
  onCopyBrainLink,
  mobileOpen,
  onMobileClose
}: SidebarProps) {
  const counts: Record<string, number> = { all: items.length };
  for (const item of items) {
    counts[item.type] = (counts[item.type] ?? 0) + 1;
  }

  const navItems: { key: NoteType; icon: string; label: string }[] = [
    { key: "all", icon: "🗂️", label: "All Notes" },
    { key: "note", icon: "📝", label: "Notes" },
    { key: "tweet", icon: "🐦", label: "Tweets" },
    { key: "video", icon: "📺", label: "Videos" },
    { key: "article", icon: "📄", label: "Articles" },
    { key: "image", icon: "🖼️", label: "Images" }
  ];

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onMobileClose} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sb-brand">
          <span className="brand-icon-sm">🧠</span>
          <span className="brand-name">Second Brain</span>
        </div>

        <div className="sb-user">
          <div className="sb-avatar">{(username.charAt(0) || "U").toUpperCase()}</div>
          <div className="sb-user-info">
            <strong>@{username || "user"}</strong>
            <span className="sb-stat">{items.length} notes</span>
          </div>
        </div>

        <nav className="sb-nav">
          <p className="sb-section-label">Library</p>
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sb-nav-item ${selectedType === item.key ? "sb-nav-active" : ""}`}
              onClick={() => {
                onTypeChange(item.key);
                onMobileClose();
              }}
            >
              <span className="sb-nav-icon">{item.icon}</span>
              <span className="sb-nav-label">{item.label}</span>
              {counts[item.key] ? <span className="sb-nav-count">{counts[item.key]}</span> : null}
            </button>
          ))}
        </nav>

        <div className="sb-share-section">
          <p className="sb-section-label">Brain Sharing</p>
          {shareHash ? (
            <div className="brain-share-active">
              <div className="brain-share-status">
                <span className="dot-green" />
                <span>Board link active</span>
              </div>
              <div className="brain-share-actions">
                <button type="button" className="btn-xs btn-copy" onClick={onCopyBrainLink}>
                  Copy link
                </button>
                <button type="button" className="btn-xs btn-danger-xs" onClick={onRemoveShareBrain}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-share-brain" onClick={onShareBrain}>
              🌐 Share Entire Brain
            </button>
          )}
        </div>

        <button type="button" className="sb-logout" onClick={onLogout}>
          ← Sign Out
        </button>
      </aside>
    </>
  );
}

// ─── Main App ──────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [username, setUsername] = useState<string>(() => localStorage.getItem(USER_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [authStatus, setAuthStatus] = useState("Ready");

  const [items, setItems] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteType>("all");

  const [shareHash, setShareHash] = useState("");

  // Modal/panel state
  const [addOpen, setAddOpen] = useState(false);
  const [editNote, setEditNote] = useState<ContentItem | null>(null);
  const [shareNoteTarget, setShareNoteTarget] = useState<ContentItem | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [brainModalOpen, setBrainModalOpen] = useState(false);
  const [publicNoteOpen, setPublicNoteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Public content
  const [publicItems, setPublicItems] = useState<ContentItem[]>([]);
  const [publicOwner, setPublicOwner] = useState("");
  const [publicNote, setPublicNote] = useState<ContentItem | null>(null);
  const [publicNoteOwner, setPublicNoteOwner] = useState("");

  const { toasts, push: pushToast } = useToasts();

  const brainShareUrl = useMemo(
    () => (shareHash ? `${window.location.origin}?share=${shareHash}` : ""),
    [shareHash]
  );

  const filteredItems = useMemo(() => {
    let result = items;
    if (typeFilter !== "all") result = result.filter((i) => i.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) => (i.title ?? "").toLowerCase().includes(q) || (i.content ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, typeFilter, searchQuery]);

  function getNoteSharedUrl(hash: string) {
    return `${window.location.origin}?note=${hash}`;
  }

  // Handle shared URL params on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noteHash = params.get("note");
    const brainHash = params.get("share");
    if (noteHash) void handleLookupNote(noteHash);
    else if (brainHash) void handleLookupBrain(brainHash);
  }, []);

  useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }
    void refreshContent();
  }, [token]);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setAuthStatus("Authenticating…");
    try {
      if (mode === "signup") {
        const msg = await signup(username, password);
        setAuthStatus(`${msg}. Sign in now.`);
        pushToast("Account created! Sign in now.", "ok");
        setMode("signin");
        return;
      }
      const newToken = await signin(username, password);
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, username);
      setToken(newToken);
      setAuthStatus("Signed in.");
      pushToast("Welcome back! Brain synced.", "ok");
    } catch (error) {
      const msg = (error as Error).message;
      setAuthStatus(msg);
      pushToast(msg, "err");
    }
  }

  async function refreshContent() {
    if (!token) return;
    try {
      const content = await getContent(token);
      setItems(content);
    } catch (error) {
      pushToast((error as Error).message, "err");
    }
  }

  async function handleCreateContent(data: NoteFormData) {
    if (!token) return;
    try {
      await createContent(token, {
        title: data.title,
        content: data.content,
        link: data.link,
        type: data.type
      });
      await refreshContent();
      pushToast("Note saved! 🎉", "ok");
    } catch (error) {
      pushToast((error as Error).message, "err");
    }
  }

  async function handleUpdateContent(id: string, data: NoteFormData) {
    if (!token) return;
    try {
      await updateContent(token, id, {
        title: data.title,
        content: data.content,
        link: data.link,
        type: data.type
      });
      await refreshContent();
      pushToast("Note updated!", "ok");
    } catch (error) {
      pushToast((error as Error).message, "err");
    }
  }

  async function handleDelete(contentId: string) {
    if (!token) return;
    try {
      await deleteContent(token, contentId);
      await refreshContent();
      pushToast("Note deleted.", "info");
    } catch (error) {
      pushToast((error as Error).message, "err");
    }
  }

  async function handleShareNote(contentId: string) {
    if (!token) return;
    try {
      const data = await shareNote(token, contentId);
      setItems((current) =>
        current.map((item) => (item._id === contentId ? { ...item, sharedHash: data.hash } : item))
      );
      setShareNoteTarget((prev) =>
        prev?._id === contentId ? { ...prev, sharedHash: data.hash } : prev
      );
      pushToast("Share link generated! 🔗", "ok");
    } catch (error) {
      pushToast((error as Error).message, "err");
    }
  }

  async function handleShareBrain() {
    if (!token) return;
    try {
      const data = await updateShare(token, true);
      setShareHash(data.hash ?? "");
      pushToast("Brain share link ready! 🌐", "ok");
    } catch (error) {
      pushToast((error as Error).message, "err");
    }
  }

  async function handleRemoveShareBrain() {
    if (!token) return;
    try {
      await updateShare(token, false);
      setShareHash("");
      pushToast("Brain share link removed.", "info");
    } catch (error) {
      pushToast((error as Error).message, "err");
    }
  }

  async function handleCopyBrainLink() {
    if (!brainShareUrl) return;
    await navigator.clipboard.writeText(brainShareUrl);
    pushToast("Brain link copied to clipboard!", "ok");
  }

  async function handleLookupNote(hash: string) {
    try {
      const data = await getSharedNote(hash);
      setPublicNote(data.note);
      setPublicNoteOwner(data.username ?? "unknown");
      setPublicNoteOpen(true);
      setLookupOpen(false);
    } catch (error) {
      pushToast((error as Error).message, "err");
    }
  }

  async function handleLookupBrain(hash: string) {
    try {
      const data = await getSharedBrain(hash);
      setPublicItems(data.content);
      setPublicOwner(data.username ?? "unknown");
      setBrainModalOpen(true);
      setLookupOpen(false);
    } catch (error) {
      pushToast((error as Error).message, "err");
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setShareHash("");
    pushToast("Signed out.", "info");
  }

  // ── Auth screen ────────────────────────────────────────────────

  if (!token) {
    return (
      <>
        <AuthPage
          mode={mode}
          setMode={setMode}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          onSubmit={handleAuth}
          statusMsg={authStatus}
        />
        <Toaster toasts={toasts} />
      </>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────

  return (
    <div className="app-shell">
      <Toaster toasts={toasts} />

      <Sidebar
        username={username}
        items={items}
        selectedType={typeFilter}
        onTypeChange={setTypeFilter}
        shareHash={shareHash}
        onLogout={logout}
        onShareBrain={() => void handleShareBrain()}
        onRemoveShareBrain={() => void handleRemoveShareBrain()}
        onCopyBrainLink={() => void handleCopyBrainLink()}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="main-area">
        {/* Top bar */}
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search notes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="search-clear" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>

          <div className="topbar-actions">
            <button type="button" className="btn-ghost-sm" onClick={() => setLookupOpen(true)}>
              👁 View Shared
            </button>
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
              + New Note
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="content-area">
          <div className="content-header">
            <div>
              <h2 className="content-title">
                {typeFilter === "all"
                  ? "All Notes"
                  : `${typeIcon(typeFilter)} ${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}s`}
              </h2>
              {(searchQuery || typeFilter !== "all") && (
                <span className="filter-active-label">
                  {filteredItems.length} of {items.length} notes
                  <button
                    type="button"
                    className="clear-filter-btn"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("all");
                    }}
                  >
                    Clear filters ✕
                  </button>
                </span>
              )}
            </div>
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
              + New Note
            </button>
          </div>

          {items.length === 0 ? (
            <EmptyState onAdd={() => setAddOpen(true)} />
          ) : filteredItems.length === 0 ? (
            <div className="empty-filter">
              <div className="empty-icon">🔍</div>
              <p>No notes match your search or filter.</p>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="notes-grid">
              {filteredItems.map((item) => (
                <NoteCard
                  key={item._id}
                  note={item}
                  onDelete={(id) => void handleDelete(id)}
                  onShare={(note) => setShareNoteTarget(note)}
                  onEdit={(note) => setEditNote(note)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panels & Modals */}
      <AddNotePanel
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleCreateContent}
      />

      <EditNotePanel
        note={editNote}
        onClose={() => setEditNote(null)}
        onSave={handleUpdateContent}
      />

      <ShareNotePanel
        note={shareNoteTarget}
        onClose={() => setShareNoteTarget(null)}
        onShare={handleShareNote}
        getUrl={getNoteSharedUrl}
      />

      <LookupPanel
        open={lookupOpen}
        onClose={() => setLookupOpen(false)}
        onLookupNote={handleLookupNote}
        onLookupBrain={handleLookupBrain}
      />

      <SharedBrainModal
        open={brainModalOpen}
        owner={publicOwner}
        items={publicItems}
        onClose={() => {
          setBrainModalOpen(false);
          setPublicOwner("");
          setPublicItems([]);
        }}
      />

      <ViewPublicNoteModal
        open={publicNoteOpen}
        note={publicNote}
        owner={publicNoteOwner}
        onClose={() => {
          setPublicNoteOpen(false);
          setPublicNote(null);
        }}
      />
    </div>
  );
}
