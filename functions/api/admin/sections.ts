import { z } from "zod";
import { json, loadData, normalizeData, requireAuth, saveData } from "../_utils";

const CreateSectionBody = z.object({
  groupId: z.string().min(1),
  name: z.string().trim().min(1).max(60)
});

export const onRequestPost: PagesFunction = async (ctx) => {
  const env = ctx.env as any;
  const auth = await requireAuth(ctx.request, env);
  if (!auth.ok) return auth.res;

  let parsed: z.infer<typeof CreateSectionBody>;
  try {
    parsed = CreateSectionBody.parse(await ctx.request.json());
  } catch (e: unknown) {
    return json(
      { error: "Invalid request body", details: e instanceof z.ZodError ? e.issues : undefined },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const data = await loadData(env);
  const group = data.groups.find((g) => g.id === parsed.groupId);
  if (!group) return json({ error: "Group not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const sections = data.sections ?? [];
  const inGroup = sections.filter((s) => s.groupId === parsed.groupId);
  const nextOrder = inGroup.length ? Math.max(...inGroup.map((s) => s.order)) + 1 : 0;
  const section = { id: crypto.randomUUID(), groupId: parsed.groupId, name: parsed.name, order: nextOrder };

  const merged = normalizeData({ ...data, sections: [...sections, section] });
  await saveData(env, merged);
  const saved = merged.sections?.find((s) => s.id === section.id)!;
  return json({ ok: true, section: saved }, { headers: { "Cache-Control": "no-store" } });
};

