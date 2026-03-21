import type { ContentItem, PublicBrainResponse, PublicNoteResponse } from "./types";

type CreateNoteInput = {
  title: string;
  content: string;
  link?: string;
};

const API_BASE = (() => {
  const configuredBase = import.meta.env.VITE_API_BASE?.trim();
  if (configuredBase) return configuredBase;

  // In Vite dev server, relative URLs go through proxy (/api -> localhost:3000).
  if (import.meta.env.DEV) return "";

  // For non-dev builds without VITE_API_BASE, use backend default port.
  return "http://localhost:3000";
})();

function authHeaders(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as { message?: string }).message ?? "Request failed";
    throw new Error(message);
  }
  return data as T;
}

export async function signup(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await parseResponse<{ message: string }>(response);
  return data.message;
}

export async function signin(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/v1/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await parseResponse<{ token: string }>(response);
  return data.token;
}

export async function createContent(token: string, note: CreateNoteInput): Promise<string> {
  const response = await fetch(`${API_BASE}/api/v1/content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify({
      title: note.title,
      content: note.content,
      link: note.link ?? "",
      type: "note"
    })
  });
  const data = await parseResponse<{ message: string }>(response);
  return data.message;
}

export async function getContent(token: string): Promise<ContentItem[]> {
  const response = await fetch(`${API_BASE}/api/v1/content`, {
    headers: { ...authHeaders(token) }
  });
  const data = await parseResponse<{ content: ContentItem[] }>(response);
  return data.content;
}

export async function deleteContent(token: string, contentId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/v1/content`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify({ contentId })
  });
  const data = await parseResponse<{ message: string }>(response);
  return data.message;
}

export async function updateShare(token: string, share: boolean): Promise<{ hash?: string; message?: string }> {
  const response = await fetch(`${API_BASE}/api/v1/brain/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify({ share })
  });
  return parseResponse<{ hash?: string; message?: string }>(response);
}

export async function getSharedBrain(hash: string): Promise<PublicBrainResponse> {
  const response = await fetch(`${API_BASE}/api/v1/brain/${hash}`);
  return parseResponse<PublicBrainResponse>(response);
}

export async function shareNote(token: string, contentId: string): Promise<{ hash: string }> {
  const response = await fetch(`${API_BASE}/api/v1/content/${contentId}/share`, {
    method: "POST",
    headers: {
      ...authHeaders(token)
    }
  });
  return parseResponse<{ hash: string }>(response);
}

export async function getSharedNote(hash: string): Promise<PublicNoteResponse> {
  const response = await fetch(`${API_BASE}/api/v1/content/share/${hash}`);
  return parseResponse<PublicNoteResponse>(response);
}
