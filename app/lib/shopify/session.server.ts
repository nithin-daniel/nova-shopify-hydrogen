/**
 * Signed (HMAC), HttpOnly session cookie. Customer Account tokens are read from
 * it inside loaders/handlers and never serialized into loader data. For
 * production, prefer an opaque server-side session store or an encrypted cookie.
 *
 * Implements Hydrogen's `ShopifyRouteSessionManager` contract on top of React
 * Router's cookie session storage.
 */
import type { WritableCustomerSessionManager } from "@shopify/hydrogen/customer-account";
import { createCookieSessionStorage, type Session } from "react-router";
import { getEnv } from "./env.server";

let storage: ReturnType<typeof createCookieSessionStorage> | null = null;

function getStorage() {
  storage ??= createCookieSessionStorage({
    cookie: {
      name: "nova_session",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      secrets: [getEnv().sessionSecret],
      maxAge: 60 * 60 * 24 * 30,
    },
  });
  return storage;
}

export type AppSessionManager = WritableCustomerSessionManager & {
  readonly dirty: boolean;
  get(key: string): unknown;
};

export async function createSessionManager(request: Request): Promise<AppSessionManager> {
  const store = getStorage();
  const session: Session = await store.getSession(request.headers.get("cookie"));
  let dirty = false;
  return {
    get dirty() {
      return dirty;
    },
    get: (key) => session.get(key),
    getSessionOrigin: () => new URL(request.url).origin,
    getSessionItem: (key) => session.get(key),
    setSessionItem: (key, value) => {
      session.set(key, value);
      dirty = true;
    },
    removeSessionItem: (key) => {
      session.unset(key);
      dirty = true;
    },
    commit: async () => {
      if (!dirty) return;
      dirty = false;
      return { "Set-Cookie": await store.commitSession(session) };
    },
  };
}
