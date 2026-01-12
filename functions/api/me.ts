import { cookieGet, cookieSerialize, getSessionSecret, isSecureRequest, json, SESSION_COOKIE, verifySession } from "./_utils";

export const onRequestGet: PagesFunction = async (ctx) => {
  const req = ctx.request;
  const env = ctx.env as any;

  const token = cookieGet(req, SESSION_COOKIE);
  if (!token) return json({ authed: false }, { headers: { "Cache-Control": "no-store" } });

  const secret = await getSessionSecret(env);
  const payload = await verifySession(token, secret);
  if (payload) return json({ authed: true }, { headers: { "Cache-Control": "no-store" } });

  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  headers.append(
    "Set-Cookie",
    cookieSerialize({ name: SESSION_COOKIE, value: "", maxAge: 0, httpOnly: true, secure: isSecureRequest(req) })
  );
  return json({ authed: false }, { headers });
};
