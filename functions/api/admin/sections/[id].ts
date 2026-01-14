import { z } from "zod";
import { json, loadData, normalizeData, requireAuth, saveData } from "../../_utils";

const UpdateSectionBody = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    order: z.number().int().min(0).optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Empty patch" });

export const onRequestPut: PagesFunction = async (ctx) => {
  const env = ctx.env as any;
  const auth = await requireAuth(ctx.request, env);
  if (!auth.ok) return auth.res;

  const id = (ctx.params as any).id as string | undefined;
  if (!id) return json({ error: "Missing section id" }, { status: 400, headers: { "Cache-Control": "no-store" } });

  let parsed: z.infer<typeof UpdateSectionBody>;
  try {
    parsed = UpdateSectionBody.parse(await ctx.request.json());
  } catch (e: unknown) {
    return json(
      { error: "Invalid request body", details: e instanceof z.ZodError ? e.issues : undefined },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const data = await loadData(env);
  const sections = data.sections ?? [];
  const idx = sections.findIndex((s) => s.id === id);
  if (idx < 0) return json({ error: "Section not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const updated = { ...sections[idx]!, ...parsed };
  const nextSections = sections.slice();
  nextSections[idx] = updated;

  const merged = normalizeData({ ...data, sections: nextSections });
  await saveData(env, merged);
  const saved = merged.sections?.find((s) => s.id === id)!;
  return json({ ok: true, section: saved }, { headers: { "Cache-Control": "no-store" } });
};

export const onRequestDelete: PagesFunction = async (ctx) => {
  const env = ctx.env as any;
  const auth = await requireAuth(ctx.request, env);
  if (!auth.ok) return auth.res;

  const id = (ctx.params as any).id as string | undefined;
  if (!id) return json({ error: "Missing section id" }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const data = await loadData(env);
  const sections = data.sections ?? [];
  if (!sections.some((s) => s.id === id)) {
    return json({ error: "Section not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const nextSections = sections.filter((s) => s.id !== id);
  const nextLinks = data.links.map((l) => (l.sectionId === id ? { ...l, sectionId: undefined } : l));

  const merged = normalizeData({ ...data, sections: nextSections, links: nextLinks });
  await saveData(env, merged);
  return json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
};

