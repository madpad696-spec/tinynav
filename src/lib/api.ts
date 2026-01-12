import type { CloudNavData } from "../types";

export type MeResponse = { authed: boolean };

async function jsonFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export const api = {
  links: () => jsonFetch<CloudNavData>("/api/links", { method: "GET" }),
  linksNoCache: () => jsonFetch<CloudNavData>("/api/links", { method: "GET", cache: "no-store" }),
  me: () => jsonFetch<MeResponse>("/api/me", { method: "GET", cache: "no-store" }),
  login: (password: string) =>
    jsonFetch<{ ok: true }>("/api/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => jsonFetch<{ ok: true }>("/api/logout", { method: "POST" }),
  save: (data: CloudNavData) =>
    jsonFetch<{ ok: true }>("/api/admin/save", { method: "POST", body: JSON.stringify(data) })
};
