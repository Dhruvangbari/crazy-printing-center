import { createClient } from "@supabase/supabase-js";

function cleanUrl(url) {
  if (!url) return "";
  let clean = url.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  // Auto-correct if user accidentally copied the Supabase dashboard URL instead of API URL
  if (clean.includes("supabase.com/dashboard/project/")) {
    const parts = clean.split("/project/");
    if (parts[1]) {
      const projId = parts[1].split("/")[0].split("?")[0];
      clean = `https://${projId}.supabase.co`;
    }
  }
  return clean;
}

function cleanKey(key) {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "");
}

// Fallback project credentials if environment variables are not yet configured
const DEFAULT_SUPABASE_URL = "https://bwdutjtvyboyiaicjqid.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3ZHV0anR2eWJveWlhaWNqcWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNTQ5MTYsImV4cCI6MjA1NTkzMDkxNn0.fallback_key";

function createSafeFallbackClient() {
  const chainable = () => {
    const query = {
      select: () => query,
      insert: () => query,
      update: () => query,
      upsert: () => query,
      delete: () => query,
      eq: () => query,
      neq: () => query,
      gt: () => query,
      gte: () => query,
      lt: () => query,
      lte: () => query,
      order: () => query,
      limit: () => query,
      single: async () => ({ data: null, error: null }),
      then: (resolve) => resolve({ data: [], error: null }),
      catch: () => query,
    };
    return query;
  };

  const channelObj = {
    on: function () { return this; },
    subscribe: function (cb) {
      if (typeof cb === "function") {
        setTimeout(() => cb("SUBSCRIBED"), 0);
      }
      return this;
    },
    track: async () => {},
    untrack: async () => {},
    send: () => {},
    state: "joined",
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: null }, error: { message: "Supabase connection not configured" } }),
      signUp: async () => ({ data: { user: null }, error: { message: "Supabase connection not configured" } }),
      signOut: async () => ({ error: null }),
      signInWithOAuth: async () => ({ error: null }),
    },
    from: () => chainable(),
    channel: () => channelObj,
    removeChannel: () => {},
    storage: {
      from: () => ({
        getPublicUrl: (path) => ({ data: { publicUrl: path || "" } }),
        upload: async () => ({ data: null, error: new Error("Storage not configured") }),
      }),
    },
  };
}

let browserClient = null;

export const supabase = () => {
  if (typeof window !== "undefined" && browserClient) {
    return browserClient;
  }

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const url = cleanUrl(envUrl || "") || DEFAULT_SUPABASE_URL;
  const key = cleanKey(envKey || "") || DEFAULT_SUPABASE_KEY;

  try {
    const client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "crazy_printing_auth_session",
      },
    });

    if (typeof window !== "undefined") {
      browserClient = client;
    }

    return client;
  } catch (err) {
    console.warn("[Supabase] Failed to initialize Supabase client. Using safe fallback client.", err);
    const fallback = createSafeFallbackClient();
    if (typeof window !== "undefined") {
      browserClient = fallback;
    }
    return fallback;
  }
};