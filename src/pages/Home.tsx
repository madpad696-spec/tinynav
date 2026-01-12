import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Globe } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { Navbar } from "../components/Navbar";
import { SearchBar } from "../components/SearchBar";
import { api } from "../lib/api";
import { useMe } from "../lib/auth";
import type { CloudNavData, Group, LinkItem } from "../types";

function normalizeText(s: string) {
  return s.trim().toLowerCase();
}

function matchesQuery(link: LinkItem, query: string) {
  const q = normalizeText(query);
  if (!q) return true;
  const hay = `${link.title} ${link.description ?? ""} ${link.url}`.toLowerCase();
  return hay.includes(q);
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const { authed } = useMe();
  const [data, setData] = useState<CloudNavData | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .links()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  const groups = useMemo(() => {
    const g = (data?.groups ?? []).slice().sort((a, b) => a.order - b.order);
    return g;
  }, [data]);

  const linksByGroup = useMemo(() => {
    const map = new Map<string, LinkItem[]>();
    for (const l of data?.links ?? []) {
      if (!matchesQuery(l, query)) continue;
      const arr = map.get(l.groupId) ?? [];
      arr.push(l);
      map.set(l.groupId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.order - b.order);
    return map;
  }, [data, query]);

  const visibleGroups: Group[] = useMemo(() => {
    if (!query) return groups;
    return groups.filter((g) => (linksByGroup.get(g.id)?.length ?? 0) > 0);
  }, [groups, linksByGroup, query]);

  return (
    <div className="app-bg">
      <Navbar authed={authed === true} />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0.18 } : { type: "spring", stiffness: 420, damping: 34 }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-semibold tracking-tight">导航</div>
              <div className="text-sm text-muted">轻盈、克制、随手可用。</div>
            </div>
            <div className="w-full md:w-[420px]">
              <SearchBar value={query} onChange={setQuery} />
            </div>
          </div>

          {error ? (
            <div className="glass rounded-2xl p-4 text-sm text-danger">{error}</div>
          ) : null}

          <AnimatePresence mode="popLayout">
            {visibleGroups.map((g) => {
              const links = linksByGroup.get(g.id) ?? [];
              return (
                <motion.section
                  key={g.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 34 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-fg/90">{g.name}</div>
                    <div className="text-xs text-muted">{links.length} 项</div>
                  </div>
                  <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {links.map((l) => (
                      <Card
                        key={l.id}
                        as="a"
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-4"
                      >
                        <div className="flex items-start gap-3">
                          <motion.div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 dark:bg-white/6"
                            whileHover={reduceMotion ? undefined : { rotate: -2, scale: 1.03 }}
                            transition={{ type: "spring", stiffness: 420, damping: 30 }}
                          >
                            <Globe size={18} className="text-fg/80" />
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate text-sm font-semibold">{l.title}</div>
                              <ExternalLink size={16} className="text-muted opacity-70 group-hover:opacity-100" />
                            </div>
                            {l.description ? (
                              <div className="mt-1 line-clamp-2 text-xs text-muted">{l.description}</div>
                            ) : (
                              <div className="mt-1 truncate text-xs text-muted">{safeHostname(l.url)}</div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </motion.div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
