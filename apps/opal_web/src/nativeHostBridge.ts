/**
 * R1B+ native host bridge — Opal owns every pixel; SecureStore lives on the host.
 * When first-run/auth completes inside the WebView, notify React Native so the
 * host can persist the product session (never put tokens in the URL).
 */

export type NativeSessionPayload = {
  type: "opal_native_session";
  access_token: string;
  user_id: string;
  display_name?: string;
  handle?: string;
  session_id?: string;
};

function isNativeHost(): boolean {
  try {
    return (
      new URLSearchParams(window.location.search).get("opal_native_host") === "1" ||
      window.sessionStorage?.getItem("opal_native_host") === "1"
    );
  } catch {
    return false;
  }
}

function postToNative(payload: unknown): void {
  try {
    const rn = (
      window as unknown as {
        ReactNativeWebView?: { postMessage: (msg: string) => void };
      }
    ).ReactNativeWebView;
    rn?.postMessage(JSON.stringify(payload));
  } catch {
    /* host may be absent in browser */
  }
}

export function notifyNativeHostSession(session: {
  access_token?: string;
  user_id: string;
  display_name?: string;
  handle?: string;
  session_id?: string;
}): void {
  if (!isNativeHost()) return;
  const token = session.access_token;
  if (!token) return;

  const payload: NativeSessionPayload = {
    type: "opal_native_session",
    access_token: token,
    user_id: session.user_id,
    display_name: session.display_name,
    handle: session.handle,
    session_id: session.session_id,
  };

  postToNative(payload);

  try {
    window.dispatchEvent(new CustomEvent("opal-native-session-ready", { detail: payload }));
  } catch {
    /* ignore */
  }
}

/** Ask native host to clear SecureStore + return to Brand V4 first-run. */
export function notifyNativeHostSignOut(): void {
  if (!isNativeHost()) return;
  postToNative({ type: "opal_native_sign_out" });
}
