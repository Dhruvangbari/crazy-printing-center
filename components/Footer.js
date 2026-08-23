import Link from "next/link";
import { Printer, Shield, Clock, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
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
          <Link href="/order" style={{ color: "#94a3b8" }}>New Order</Link>
          <Link href="/track" style={{ color: "#94a3b8" }}>Track Order</Link>
          <Link href="/login" style={{ color: "#94a3b8" }}>Customer Login</Link>
          <Link href="/admin" style={{ color: "#94a3b8" }}>Admin Portal</Link>
        </div>

        <div style={{ fontSize: 12, color: "#64748b" }}>
          © {new Date().getFullYear()} Crazy Printing Center. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
