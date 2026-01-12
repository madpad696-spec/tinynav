import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, Link as LinkIcon, LogOut, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Modal } from "../components/Modal";
import { Navbar } from "../components/Navbar";
import { api } from "../lib/api";
import { useMe } from "../lib/auth";
import type { CloudNavData, Group, LinkItem } from "../types";

function sortData(data: CloudNavData): CloudNavData {
  return {
    groups: data.groups.slice().sort((a, b) => a.order - b.order),
    links: data.links.slice().sort((a, b) => a.order - b.order)
  };
}

function nextOrder(items: { order: number }[]) {
  return items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
}

function uid() {
  return crypto.randomUUID();
}

export default function Admin() {
  const reduceMotion = useReducedMotion();
  const { authed } = useMe();
  const nav = useNavigate();

  const [data, setData] = useState<CloudNavData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  useEffect(() => {
    if (authed === false) nav("/login", { replace: true, state: { from: "/admin" } });
  }, [authed, nav]);

  useEffect(() => {
    api
      .linksNoCache()
      .then((d) => {
        const sorted = sortData(d);
        setData(sorted);
        setSelectedGroupId(sorted.groups[0]?.id ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  const groups = useMemo(() => (data ? data.groups.slice().sort((a, b) => a.order - b.order) : []), [data]);
  const links = useMemo(() => (data ? data.links.slice() : []), [data]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? groups[0] ?? null,
    [groups, selectedGroupId]
  );

  const linksInSelectedGroup = useMemo(() => {
    if (!selectedGroup) return [];
    return links.filter((l) => l.groupId === selectedGroup.id).sort((a, b) => a.order - b.order);
  }, [links, selectedGroup]);

  function updateGroup(patch: Partial<Group> & { id: string }) {
    setSaved(false);
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, groups: prev.groups.map((g) => (g.id === patch.id ? { ...g, ...patch } : g)) };
    });
  }

  function updateLink(patch: Partial<LinkItem> & { id: string }) {
    setSaved(false);
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, links: prev.links.map((l) => (l.id === patch.id ? { ...l, ...patch } : l)) };
    });
  }

  function moveGroup(id: string, dir: -1 | 1) {
    setSaved(false);
    setData((prev) => {
      if (!prev) return prev;
      const arr = prev.groups.slice().sort((a, b) => a.order - b.order);
      const idx = arr.findIndex((g) => g.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= arr.length) return prev;
      const a = arr[idx]!;
      const b = arr[j]!;
      const swapped = arr.map((g) => {
        if (g.id === a.id) return { ...g, order: b.order };
        if (g.id === b.id) return { ...g, order: a.order };
        return g;
      });
      return { ...prev, groups: swapped };
    });
  }

  function moveLink(id: string, dir: -1 | 1) {
    if (!selectedGroup) return;
    setSaved(false);
    setData((prev) => {
      if (!prev) return prev;
      const inGroup = prev.links
        .filter((l) => l.groupId === selectedGroup.id)
        .slice()
        .sort((a, b) => a.order - b.order);
      const idx = inGroup.findIndex((l) => l.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= inGroup.length) return prev;
      const a = inGroup[idx]!;
      const b = inGroup[j]!;
      const swapped = prev.links.map((l) => {
        if (l.id === a.id) return { ...l, order: b.order };
        if (l.id === b.id) return { ...l, order: a.order };
        return l;
      });
      return { ...prev, links: swapped };
    });
  }

  async function save() {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      await api.save(sortData(data));
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api.logout();
    nav("/", { replace: true });
  }

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
              <div className="text-2xl font-semibold tracking-tight">管理</div>
              <div className="text-sm text-muted">修改分类与链接，并保存到 KV。</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" leftIcon={<LogOut size={18} />} onClick={logout} disabled={busy}>
                退出
              </Button>
              <Button variant="primary" leftIcon={<Save size={18} />} onClick={save} disabled={busy || !data}>
                {busy ? "保存中…" : "保存"}
              </Button>
              <AnimatePresence>
                {saved ? (
                  <motion.div
                    key="saved"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="inline-flex items-center gap-2 rounded-2xl glass px-3 py-2 text-sm"
                  >
                    <Check size={16} className="text-accent" />
                    已保存
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          {error ? <div className="glass rounded-2xl p-4 text-sm text-danger">{error}</div> : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="p-4 lg:col-span-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">分类</div>
                <Button variant="secondary" leftIcon={<Plus size={18} />} onClick={() => setCreatingGroup(true)}>
                  新增
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                <AnimatePresence mode="popLayout">
                  {groups.map((g) => (
                    <motion.div key={g.id} layout className="flex items-center justify-between gap-2">
                      <button
                        className={
                          "flex-1 rounded-2xl px-3 py-2 text-left text-sm transition " +
                          (selectedGroup?.id === g.id
                            ? "bg-white/12 dark:bg-white/8 border border-white/12"
                            : "hover:bg-white/10 dark:hover:bg-white/6 border border-transparent")
                        }
                        onClick={() => setSelectedGroupId(g.id)}
                      >
                        <div className="font-medium">{g.name}</div>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          className="h-9 px-2"
                          onClick={() => moveGroup(g.id, -1)}
                          leftIcon={<ArrowUp size={16} />}
                        />
                        <Button
                          variant="ghost"
                          className="h-9 px-2"
                          onClick={() => moveGroup(g.id, 1)}
                          leftIcon={<ArrowDown size={16} />}
                        />
                        <Button
                          variant="ghost"
                          className="h-9 px-2"
                          onClick={() => setEditingGroup(g)}
                          leftIcon={<Pencil size={16} />}
                        />
                        <Button
                          variant="danger"
                          className="h-9 px-2"
                          onClick={() => {
                            if (!confirm(`删除分类「${g.name}」？该分类下的链接也会被删除。`)) return;
                            setSaved(false);
                            setData((prev) => {
                              if (!prev) return prev;
                              const groups2 = prev.groups.filter((x) => x.id !== g.id);
                              const links2 = prev.links.filter((x) => x.groupId !== g.id);
                              return { groups: groups2, links: links2 };
                            });
                            if (selectedGroupId === g.id) setSelectedGroupId(groups.find((x) => x.id !== g.id)?.id ?? null);
                          }}
                          leftIcon={<Trash2 size={16} />}
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Card>

            <Card className="p-4 lg:col-span-8">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{selectedGroup ? `链接 · ${selectedGroup.name}` : "链接"}</div>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={18} />}
                  onClick={() => setCreatingLink(true)}
                  disabled={!selectedGroup}
                >
                  新增
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                <AnimatePresence mode="popLayout">
                  {linksInSelectedGroup.map((l) => (
                    <motion.div
                      key={l.id}
                      layout
                      className="flex items-start justify-between gap-2 rounded-2xl border border-white/10 bg-white/6 dark:bg-white/4 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <LinkIcon size={16} className="text-muted" />
                          <div className="truncate text-sm font-semibold">{l.title}</div>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted">{l.url}</div>
                        {l.description ? (
                          <div className="mt-1 line-clamp-2 text-xs text-muted">{l.description}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          className="h-9 px-2"
                          onClick={() => moveLink(l.id, -1)}
                          leftIcon={<ArrowUp size={16} />}
                        />
                        <Button
                          variant="ghost"
                          className="h-9 px-2"
                          onClick={() => moveLink(l.id, 1)}
                          leftIcon={<ArrowDown size={16} />}
                        />
                        <Button
                          variant="ghost"
                          className="h-9 px-2"
                          onClick={() => setEditingLink(l)}
                          leftIcon={<Pencil size={16} />}
                        />
                        <Button
                          variant="danger"
                          className="h-9 px-2"
                          onClick={() => {
                            if (!confirm(`删除链接「${l.title}」？`)) return;
                            setSaved(false);
                            setData((prev) => (prev ? { ...prev, links: prev.links.filter((x) => x.id !== l.id) } : prev));
                          }}
                          leftIcon={<Trash2 size={16} />}
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {!linksInSelectedGroup.length ? (
                  <div className="rounded-2xl border border-white/10 bg-white/6 dark:bg-white/4 p-6 text-sm text-muted">
                    这个分类还没有链接。点击右上角“新增”。
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        </motion.div>
      </main>

      <GroupModal
        open={creatingGroup}
        title="新增分类"
        initial={{ name: "" }}
        onClose={() => setCreatingGroup(false)}
        onSubmit={(name) => {
          setCreatingGroup(false);
          setSaved(false);
          setData((prev) => {
            if (!prev) return prev;
            const g: Group = { id: uid(), name, order: nextOrder(prev.groups) };
            return { ...prev, groups: [...prev.groups, g] };
          });
        }}
      />

      <GroupModal
        open={!!editingGroup}
        title="编辑分类"
        initial={{ name: editingGroup?.name ?? "" }}
        onClose={() => setEditingGroup(null)}
        onSubmit={(name) => {
          if (!editingGroup) return;
          updateGroup({ id: editingGroup.id, name });
          setEditingGroup(null);
        }}
      />

      <LinkModal
        open={creatingLink}
        title="新增链接"
        groupId={selectedGroup?.id ?? ""}
        initial={{ title: "", url: "", description: "" }}
        onClose={() => setCreatingLink(false)}
        onSubmit={(patch) => {
          if (!selectedGroup) return;
          setCreatingLink(false);
          setSaved(false);
          setData((prev) => {
            if (!prev) return prev;
            const inGroup = prev.links.filter((x) => x.groupId === selectedGroup.id);
            const l: LinkItem = {
              id: uid(),
              groupId: selectedGroup.id,
              title: patch.title,
              url: patch.url,
              description: patch.description || undefined,
              order: nextOrder(inGroup)
            };
            return { ...prev, links: [...prev.links, l] };
          });
        }}
      />

      <LinkModal
        open={!!editingLink}
        title="编辑链接"
        groupId={editingLink?.groupId ?? ""}
        initial={{
          title: editingLink?.title ?? "",
          url: editingLink?.url ?? "",
          description: editingLink?.description ?? ""
        }}
        onClose={() => setEditingLink(null)}
        onSubmit={(patch) => {
          if (!editingLink) return;
          updateLink({
            id: editingLink.id,
            title: patch.title,
            url: patch.url,
            description: patch.description || undefined
          });
          setEditingLink(null);
        }}
      />
    </div>
  );
}

function GroupModal({
  open,
  title,
  initial,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  initial: { name: string };
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initial.name);
  useEffect(() => setName(initial.name), [initial.name]);

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        <label className="block space-y-2">
          <div className="text-sm font-medium text-fg/80">名称</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            placeholder="例如：开发 / 设计 / 工具…"
          />
        </label>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={() => onSubmit(name.trim())} disabled={!name.trim()}>
            确认
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function LinkModal({
  open,
  title,
  initial,
  groupId,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  groupId: string;
  initial: { title: string; url: string; description: string };
  onClose: () => void;
  onSubmit: (patch: { title: string; url: string; description: string }) => void;
}) {
  const [titleValue, setTitleValue] = useState(initial.title);
  const [urlValue, setUrlValue] = useState(initial.url);
  const [descValue, setDescValue] = useState(initial.description);

  useEffect(() => setTitleValue(initial.title), [initial.title]);
  useEffect(() => setUrlValue(initial.url), [initial.url]);
  useEffect(() => setDescValue(initial.description), [initial.description]);

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="text-xs text-muted">Group: {groupId}</div>
        <label className="block space-y-2">
          <div className="text-sm font-medium text-fg/80">标题</div>
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            placeholder="例如：Cloudflare Docs"
          />
        </label>
        <label className="block space-y-2">
          <div className="text-sm font-medium text-fg/80">URL</div>
          <input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            placeholder="https://..."
          />
        </label>
        <label className="block space-y-2">
          <div className="text-sm font-medium text-fg/80">描述（可选）</div>
          <textarea
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            rows={3}
            placeholder="一句话说明用途…"
          />
        </label>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={() => onSubmit({ title: titleValue.trim(), url: urlValue.trim(), description: descValue.trim() })}
            disabled={!titleValue.trim() || !urlValue.trim()}
          >
            确认
          </Button>
        </div>
      </div>
    </Modal>
  );
}
