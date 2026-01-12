import { cookieSerialize, isSecureRequest, json, SESSION_COOKIE } from "./_utils";

export const onRequestPost: PagesFunction = async (ctx) => {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  headers.append(
    "Set-Cookie",
    cookieSerialize({
      name: SESSION_COOKIE,
      value: "",
      maxAge: 0,
      httpOnly: true,
      sameSite: "Lax",
      secure: isSecureRequest(ctx.request)
    })
  );
  return json({ ok: true }, { headers });
};
