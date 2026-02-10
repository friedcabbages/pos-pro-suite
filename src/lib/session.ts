import type { Session } from "@supabase/supabase-js";

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getSessionIdentifier(session: Session | null) {
  const token = session?.access_token;
  if (!token) return "";
  const payload = decodeJwtPayload(token);
  const sessionId = (payload?.session_id ?? payload?.sid ?? payload?.jti) as string | undefined;
  return sessionId ?? token;
}

export function getSessionLabel() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const platform =
    /Windows/i.test(ua)
      ? "Windows"
      : /Macintosh/i.test(ua)
        ? "Mac"
        : /Android/i.test(ua)
          ? "Android"
          : /iPhone/i.test(ua)
            ? "iPhone"
            : /iPad/i.test(ua)
              ? "iPad"
              : "Unknown";
  const browser =
    /Edg/i.test(ua)
      ? "Edge"
      : /Chrome/i.test(ua)
        ? "Chrome"
        : /Safari/i.test(ua)
          ? "Safari"
          : /Firefox/i.test(ua)
            ? "Firefox"
            : "Browser";

  return `${platform} • ${browser}`;
}
