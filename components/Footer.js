import Link from "next/link";
import { Printer, Heart, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer" suppressHydrationWarning>
      <div className="footer-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="brand-icon" style={{ width: 32, height: 32 }}>
            <Printer size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: "white" }}>Crazy Printing Center</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Instant online printing & door delivery</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: 13 }}>
          <Link href="/" style={{ color: "#94a3b8" }}>Home</Link>
          <Link href="/order" style={{ color: "#94a3b8" }}>New Order</Link>
          <Link href="/track" style={{ color: "#94a3b8" }}>Track Order</Link>
          <Link href="/login" style={{ color: "#94a3b8" }}>Customer Login</Link>
          <Link href="/admin" style={{ color: "#94a3b8" }}>Admin Portal</Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            © 2026 Crazy Printing Center. All rights reserved.
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 5 }}>
            <Code2 size={13} color="#38bdf8" />
            <span>Designed & Developed by <b style={{ color: "#38bdf8" }}>Dhruvang Bari</b></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
