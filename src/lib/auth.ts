import { useEffect, useState } from "react";
import { api } from "./api";

export function useMe() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((r) => {
        if (cancelled) return;
        setAuthed(r.authed);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to check auth");
        setAuthed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { authed, error, refresh: async () => setAuthed((await api.me()).authed) };
}

