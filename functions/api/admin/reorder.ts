import { z } from "zod";
import { json, loadData, normalizeData, requireAuth, saveData } from "../_utils";

const ReorderBody = z.object({
  groups: z.array(z.object({ id: z.string().min(1), order: z.number().int().min(0) })).optional(),
  sections: z.array(z.object({ id: z.string().min(1), order: z.number().int().min(0) })).optional(),
  links: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int().min(0),
        groupId: z.string().min(1).optional(),
        sectionId: z.string().trim().min(1).optional().nullable()
      })
    )
    .optional()
});

export const onRequestPost: PagesFunction = async (ctx) => {
  const env = ctx.env as any;
  const auth = await requireAuth(ctx.request, env);
  if (!auth.ok) return auth.res;

  let parsed: z.infer<typeof ReorderBody>;
  try {
    parsed = ReorderBody.parse(await ctx.request.json());
  } catch (e: unknown) {
    return json(
      { error: "Invalid request body", details: e instanceof z.ZodError ? e.issues : undefined },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const data = await loadData(env);

  const groupPatch = new Map((parsed.groups ?? []).map((g) => [g.id, g.order] as const));
  const sectionPatch = new Map((parsed.sections ?? []).map((s) => [s.id, s.order] as const));
  const linkPatch = new Map(
    (parsed.links ?? []).map((l) => [l.id, { order: l.order, groupId: l.groupId, sectionId: l.sectionId }] as const)
  );

  if (groupPatch.size) {
    data.groups = data.groups.map((g) => (groupPatch.has(g.id) ? { ...g, order: groupPatch.get(g.id)! } : g));
  }

  if (sectionPatch.size) {
    data.sections = (data.sections ?? []).map((s) => (sectionPatch.has(s.id) ? { ...s, order: sectionPatch.get(s.id)! } : s));
  }

  if (linkPatch.size) {
    data.links = data.links.map((l) => {
      const p = linkPatch.get(l.id);
      if (!p) return l;
      const nextGroupId = p.groupId ?? l.groupId;
      const nextSectionId = p.sectionId === null || p.sectionId === "" ? undefined : p.sectionId;
      return { ...l, groupId: nextGroupId, sectionId: nextSectionId, order: p.order };
    });
  }

  const normalized = normalizeData(data);
  await saveData(env, normalized);
  return json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
};
