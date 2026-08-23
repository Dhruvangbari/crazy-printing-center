import Link from "next/link";
import { Phone, Heart, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer" suppressHydrationWarning>
      <div className="footer-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img 
            src="/logo.png" 
            alt="Dhruvang Crazy Printing Logo" 
            style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid #4f46e5" }} 
          />
          <div>
            <div style={{ fontWeight: 800, color: "white", fontSize: 15 }}>Dhruvang Crazy Printing Center</div>
            <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <Phone size={12} color="#38bdf8" />
              <span>Helpline: <a href="tel:8857871669" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 700 }}>8857871669</a></span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: 13 }}>
          <Link href="/" style={{ color: "#94a3b8" }}>Home</Link>
          <Link href="/order" style={{ color: "#94a3b8" }}>New Order</Link>
          <Link href="/bills" style={{ color: "#94a3b8" }}>Bill Center</Link>
          <Link href="/track" style={{ color: "#94a3b8" }}>Track Order</Link>
          <Link href="/login" style={{ color: "#94a3b8" }}>Customer Login</Link>
          <Link href="/admin" style={{ color: "#94a3b8" }}>Admin Portal</Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            © 2026 Dhruvang Crazy Printing Center. All rights reserved.
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 5 }}>
            <Code2 size={13} color="#38bdf8" />
            <span>Founder & Owner: <b style={{ color: "#38bdf8" }}>Dhruvang Bari</b></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
