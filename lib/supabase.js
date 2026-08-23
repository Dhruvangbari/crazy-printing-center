import { createBrowserClient } from "@supabase/ssr";

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

let browserClient = null;

export const supabase = () => {
  if (typeof window !== "undefined" && browserClient) {
    return browserClient;
  }

  const url = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const key = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

  const client = createBrowserClient(url, key);

  if (typeof window !== "undefined") {
    browserClient = client;
  }

  return client;
};