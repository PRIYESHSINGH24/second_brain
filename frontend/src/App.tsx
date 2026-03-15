import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createContent,
  deleteContent,
  getContent,
  getSharedBrain,
  getSharedNote,
  shareNote,
  signin,
  signup,
  updateShare
} from "./api";
import type { ContentItem } from "./types";

const TOKEN_KEY = "second_brain_token";

type AuthMode = "signin" | "signup";

function getUserLabel(content: ContentItem): string {
  if (typeof content.userId === "object" && content.userId?.username) {
    return content.userId.username;
  }
  return "you";
}

export default function App() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? "");

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);

  const [status, setStatus] = useState("Ready");
  const [shareHash, setShareHash] = useState("");
  const [lookupHash, setLookupHash] = useState("");
  const [noteLookupHash, setNoteLookupHash] = useState("");
  const [publicItems, setPublicItems] = useState<ContentItem[]>([]);
  const [publicOwner, setPublicOwner] = useState("");
  const [publicNote, setPublicNote] = useState<ContentItem | null>(null);
  const [publicNoteOwner, setPublicNoteOwner] = useState("");

  const sharedNotesCount = useMemo(() => items.filter((item) => Boolean(item.sharedHash)).length, [items]);

  const sharedUrl = useMemo(() => {
    if (!shareHash) return "";
    return `${window.location.origin}?share=${shareHash}`;
  }, [shareHash]);

  function getNoteSharedUrl(hash: string): string {
    return `${window.location.origin}?note=${hash}`;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noteHashFromQuery = params.get("note");
    const boardHashFromQuery = params.get("share");

    if (noteHashFromQuery) {
      setNoteLookupHash(noteHashFromQuery);
      void handleLookupNote(noteHashFromQuery);
      return;
    }

    if (boardHashFromQuery) {
      setLookupHash(boardHashFromQuery);
      void handleLookup(boardHashFromQuery);
    }
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
    setStatus("Authenticating...");

    try {
      if (mode === "signup") {
        const message = await signup(username, password);
        setStatus(`${message}. You can sign in now.`);
        setMode("signin");
        return;
      }

      const newToken = await signin(username, password);
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setStatus("Signed in. Brain synced.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function refreshContent() {
    if (!token) return;
    try {
      const content = await getContent(token);
      setItems(content);
      setStatus(`Loaded ${content.length} notes.`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function handleCreateContent(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    setStatus("Saving note...");
    try {
      const message = await createContent(token, {
        title: noteTitle,
        content: noteContent,
        link: referenceLink
      });
      setNoteTitle("");
      setNoteContent("");
      setReferenceLink("");
      await refreshContent();
      setStatus(message);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function handleDelete(contentId: string) {
    if (!token) return;
    setStatus("Deleting note...");
    try {
      const message = await deleteContent(token, contentId);
      await refreshContent();
      setStatus(message);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function handleShareNote(contentId: string) {
    if (!token) return;

    setStatus("Generating note share link...");
    try {
      const data = await shareNote(token, contentId);
      setItems((currentItems) =>
        currentItems.map((item) =>
          item._id === contentId
            ? {
                ...item,
                sharedHash: data.hash
              }
            : item
        )
      );
      setStatus("Note share link ready.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function handleShare(enable: boolean) {
    if (!token) return;
    setStatus(enable ? "Generating share link..." : "Disabling share link...");

    try {
      const data = await updateShare(token, enable);
      setShareHash(data.hash ?? "");
      setStatus(data.hash ? "Share link ready." : data.message ?? "Share updated.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function handleLookup(value?: string) {
    const targetHash = value ?? lookupHash;
    if (!targetHash) {
      setStatus("Enter a share hash first.");
      return;
    }

    setStatus("Fetching shared brain...");
    try {
      const data = await getSharedBrain(targetHash);
      setPublicItems(data.content);
      setPublicOwner(data.username ?? "unknown");
      setStatus(`Loaded shared brain for ${data.username ?? "unknown"}.`);
    } catch (error) {
      setStatus((error as Error).message);
      setPublicItems([]);
      setPublicOwner("");
    }
  }

  async function handleLookupNote(value?: string) {
    const targetHash = value ?? noteLookupHash;
    if (!targetHash) {
      setStatus("Enter a note share hash first.");
      return;
    }

    setStatus("Fetching shared note...");
    try {
      const data = await getSharedNote(targetHash);
      setPublicNote(data.note);
      setPublicNoteOwner(data.username ?? "unknown");
      setStatus(`Loaded shared note for ${data.username ?? "unknown"}.`);
    } catch (error) {
      setStatus((error as Error).message);
      setPublicNote(null);
      setPublicNoteOwner("");
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setShareHash("");
    setStatus("Signed out.");
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="aurora" />
        <div className="grid-lines" />

        <main className="auth-layout">
          <section className="auth-hero lift">
            <p className="eyebrow">Private Workspace</p>
            <h1>Think freely in private. Share only what matters.</h1>
            <p>
              Welcome to your personal thinking studio. Sign in or create an account to enter a focused notes
              space where ideas stay private by default and sharing is always your choice.
            </p>

            <div className="feature-ribbon">
              <span>Private By Default</span>
              <span>Fast Workspace Access</span>
              <span>One-Click Note Sharing</span>
            </div>

            <div className="workspace-preview">
              <div className="preview-card preview-card-main">
                <span className="preview-label">Private workspace</span>
                <strong>Launch plan: week-by-week strategy</strong>
                <p>Capture drafts, links, and ideas in one calm workspace only you can see.</p>
              </div>
              <div className="preview-card">
                <span className="preview-label">Share only when needed</span>
                <p>Publish a single note with a link in seconds, without exposing your full notebook.</p>
              </div>
            </div>
          </section>

          <section className="auth-panel card lift">
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === "signin" ? "tab active" : "tab"}
                onClick={() => setMode("signin")}
              >
                Login
              </button>
              <button
                type="button"
                className={mode === "signup" ? "tab active" : "tab"}
                onClick={() => setMode("signup")}
              >
                Signup
              </button>
            </div>

            <h2>{mode === "signin" ? "Enter Private Workspace" : "Create your private workspace"}</h2>
            <p className="muted">
              {mode === "signin"
                ? "Enter your account details to open your private notes workspace."
                : "Register once, then sign in and start saving private notes."}
            </p>

            <form onSubmit={handleAuth} className="stack auth-form">
              <label>
                Username
                <input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              <button type="submit">{mode === "signin" ? "Open Workspace" : "Create Workspace"}</button>
            </form>

            <div className="status-panel">
              <span>Status</span>
              <p>{status}</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell app-shell">
      <div className="aurora" />
      <div className="grid-lines" />

      <header className="hero">
        <p className="eyebrow">Private Notes Workspace</p>
        <h1>Create notes first, then share each note with its own generated link</h1>
        <p>
          You are logged in now. Write notes, keep optional reference links, delete anything you do not
          need, and generate a public link on any note card so anyone can read it without logging in.
        </p>

        <div className="workspace-stats">
          <span>{items.length} Notes</span>
          <span>{sharedNotesCount} Shared</span>
          <span>{shareHash ? "Board Sharing On" : "Board Sharing Off"}</span>
        </div>
      </header>

      <main className="grid">
        <section className="card lift workspace-card">
          <h2>Session Active</h2>
          <p className="muted">Your account is ready. Everything below is private unless you generate a share link.</p>

          <div className="workspace-meta">
            <span>@{username || "user"}</span>
            <button type="button" className="danger" onClick={logout}>
              Sign Out
            </button>
          </div>
        </section>

        <section className="card lift notes-card">
          <h2>Notes</h2>
          <p className="muted">Write text notes, keep an optional reference link, and manage everything in one stream.</p>

          <form onSubmit={handleCreateContent} className="stack">
            <label>
              Title
              <input
                placeholder="Sprint ideas, reading notes, project plan..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
              />
            </label>

            <label>
              Note
              <textarea
                placeholder="Write the actual note here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                required
              />
            </label>

            <label>
              Reference link (optional)
              <input
                type="url"
                placeholder="https://example.com"
                value={referenceLink}
                onChange={(e) => setReferenceLink(e.target.value)}
              />
            </label>

            <button type="submit" disabled={!token}>
              Save Note
            </button>
          </form>

          <div className="list-wrap">
            {items.length === 0 ? (
              <div className="empty-note-state">
                <strong>No notes yet</strong>
                <p>Start with one quick thought, plan, or idea. It appears here instantly.</p>
              </div>
            ) : null}
            {items.map((item) => (
              <article key={item._id} className="item note-item">
                <div className="note-copy">
                  <strong>{item.title || "Untitled note"}</strong>
                  <p>{item.content || ""}</p>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noreferrer">
                      {item.link}
                    </a>
                  ) : null}
                  <small>
                    Owner: {getUserLabel(item)}
                    {item.createdAt ? ` • ${new Date(item.createdAt).toLocaleString()}` : ""}
                  </small>
                  {item.sharedHash ? (
                    <div className="share-box share-box-inline">
                      <p>Shared note URL</p>
                      <a href={getNoteSharedUrl(item.sharedHash)}>{getNoteSharedUrl(item.sharedHash)}</a>
                    </div>
                  ) : null}
                </div>
                <div className="note-actions">
                  <button className="secondary" onClick={() => void handleShareNote(item._id)}>
                    {item.sharedHash ? "Refresh Link" : "Share Note"}
                  </button>
                  <button className="danger" onClick={() => void handleDelete(item._id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="share-panel">
            <div>
              <h3>Share your notes board</h3>
              <p className="muted">Generate a personal link after your notes so another user can view the whole board.</p>
            </div>
            <div className="row">
              <button onClick={() => void handleShare(true)} disabled={!token}>
                Generate Share Link
              </button>
              <button className="danger" onClick={() => void handleShare(false)} disabled={!token}>
                Remove Share Link
              </button>
            </div>

            {sharedUrl ? (
              <div className="share-box">
                <p>Public URL</p>
                <a href={sharedUrl}>{sharedUrl}</a>
                <span>Hash: {shareHash}</span>
              </div>
            ) : (
              <p className="muted">No active share link.</p>
            )}
          </div>
        </section>

        <section className="card lift public-card">
          <h2>Public Viewer</h2>
          <p className="muted">Load a shared note directly or open a whole shared notes board.</p>

          <div className="row">
            <input
              placeholder="Enter note share hash"
              value={noteLookupHash}
              onChange={(e) => setNoteLookupHash(e.target.value)}
            />
            <button onClick={() => void handleLookupNote()}>Load Shared Note</button>
          </div>

          {publicNote ? (
            <article className="item public note-item featured-public-note">
              <div className="note-copy">
                <strong>{publicNote.title || "Untitled note"}</strong>
                <p>{publicNote.content || ""}</p>
                {publicNote.link ? (
                  <a href={publicNote.link} target="_blank" rel="noreferrer">
                    {publicNote.link}
                  </a>
                ) : null}
                <small>Shared by @{publicNoteOwner || "unknown"}</small>
              </div>
            </article>
          ) : null}

          <div className="row">
            <input placeholder="Enter board share hash" value={lookupHash} onChange={(e) => setLookupHash(e.target.value)} />
            <button onClick={() => void handleLookup()}>Load Shared Brain</button>
          </div>

          {publicOwner ? <p className="owner">Viewing @{publicOwner}</p> : null}

          <div className="list-wrap">
            {publicItems.map((item) => (
              <article key={item._id} className="item public note-item">
                <div className="note-copy">
                  <strong>{item.title || "Untitled note"}</strong>
                  <p>{item.content || ""}</p>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noreferrer">
                      {item.link}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="status-bar">Status: {status}</footer>
    </div>
  );
}
