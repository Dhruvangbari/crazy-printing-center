"use client";
import { useEffect, useState } from "react";

export default function FormattedDate({ date, includeTime = true }) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    if (!date) return;
    const d = new Date(date);
    if (isNaN(d.getTime())) return;

    if (includeTime) {
      setFormatted(
        d.toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } else {
      setFormatted(
        d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
    }
  }, [date, includeTime]);

  if (!formatted) {
    return <span>—</span>;
  }

  return <span>{formatted}</span>;
}
