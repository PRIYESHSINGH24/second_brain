import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createContent,
  deleteContent,
  getContent,
  getSharedBrain,
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
  const [publicItems, setPublicItems] = useState<ContentItem[]>([]);
  const [publicOwner, setPublicOwner] = useState("");

  const sharedUrl = useMemo(() => {
    if (!shareHash) return "";
    return `${window.location.origin}?share=${shareHash}`;
  }, [shareHash]);

  useEffect(() => {
    const hashFromQuery = new URLSearchParams(window.location.search).get("share");
    if (hashFromQuery) {
      setLookupHash(hashFromQuery);
      void handleLookup(hashFromQuery);
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

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setShareHash("");
    setStatus("Signed out.");
  }

  return (
    <div className="page-shell">
      <div className="aurora" />
      <div className="grid-lines" />

      <header className="hero">
        <p className="eyebrow">Personal Notes Workspace</p>
        <h1>Write private notes, then share your whole board with one link</h1>
        <p>
          Sign up, log in, capture ideas as text, keep optional references, and generate a public share
          link directly underneath your note collection.
        </p>
      </header>

      <main className="grid">
        <section className="card lift auth-card">
          <h2>{token ? "Session Active" : "Access Portal"}</h2>
          <p className="muted">Create an account or sign in to your private notes space.</p>

          <form onSubmit={handleAuth} className="stack">
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

            <div className="row">
              <button type="submit">{mode === "signin" ? "Sign In" : "Create Account"}</button>
              <button
                type="button"
                className="ghost"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Need account?" : "Have account?"}
              </button>
            </div>

            {token ? (
              <button type="button" className="danger" onClick={logout}>
                Sign Out
              </button>
            ) : null}
          </form>
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
            {items.length === 0 ? <p className="muted">No notes yet.</p> : null}
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
                </div>
                <button className="danger" onClick={() => void handleDelete(item._id)}>
                  Delete
                </button>
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
          <h2>Shared Notes Viewer</h2>
          <p className="muted">Open a generated hash and read another user's notes board.</p>

          <div className="row">
            <input
              placeholder="Enter share hash"
              value={lookupHash}
              onChange={(e) => setLookupHash(e.target.value)}
            />
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
