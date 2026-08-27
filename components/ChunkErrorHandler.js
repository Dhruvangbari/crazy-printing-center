"use client";
import { useEffect } from "react";

export default function ChunkErrorHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Handle Unhandled Errors (e.g. Loading chunk [id] failed)
    const handleError = (event) => {
      const errorMsg = event?.message || event?.error?.message || "";
      const isChunkError = 
        errorMsg.includes("Loading chunk") || 
        errorMsg.includes("ChunkLoadError") ||
        errorMsg.includes("Failed to fetch dynamically imported module") ||
        errorMsg.includes("CSS chunk") ||
        errorMsg.includes("webpack");

      if (isChunkError) {
        console.warn("New version detected or stale chunk encountered. Auto-refreshing for latest application bundle...", errorMsg);
        
        const lastReload = sessionStorage.getItem("cpc_last_chunk_reload");
        const now = Date.now();

        // Prevent infinite reload loops (allow 1 reload every 15 seconds)
        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          sessionStorage.setItem("cpc_last_chunk_reload", now.toString());
          window.location.reload();
        }
      }
    };

    // Handle Unhandled Promise Rejections
    const handleRejection = (event) => {
      const reasonMsg = event?.reason?.message || event?.reason || "";
      const isChunkError = 
        typeof reasonMsg === "string" && (
          reasonMsg.includes("Loading chunk") || 
          reasonMsg.includes("ChunkLoadError") ||
          reasonMsg.includes("Failed to fetch dynamically imported module")
        );

      if (isChunkError) {
        console.warn("Dynamic import failed due to updated build. Refreshing page...", reasonMsg);
        
        const lastReload = sessionStorage.getItem("cpc_last_chunk_reload");
        const now = Date.now();

        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          sessionStorage.setItem("cpc_last_chunk_reload", now.toString());
          window.location.reload();
        }
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
