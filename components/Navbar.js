"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { 
  Printer, 
  User, 
  LogOut, 
  ShieldCheck, 
  PlusCircle, 
  Search, 
  FileText, 
  LayoutDashboard,
  Home,
  Menu,
  X
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = supabase();

    async function loadUser() {
      try {
        const { data: { user } } = await s.auth.getUser();
        setUser(user);
        if (user) {
          const { data } = await s
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          setProfile(data);
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error("Error loading user profile:", e);
      }
    }

    loadUser();

    const { data: { subscription } } = s.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await s
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase().auth.signOut();
    setUser(null);
    setProfile(null);
    setMobileMenuOpen(false);
    router.push("/login");
  }

  const isAdmin = profile?.role === "ADMIN";

  return (
    <header className="navbar">
      <div className="nav-container">
        <Link href="/" className="brand">
          <div className="brand-icon">
            <Printer size={22} />
          </div>
          <span>Crazy Printing</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="nav-links desktop-nav">
          <Link 
            href="/" 
            className={`nav-link ${pathname === "/" ? "active" : ""}`}
          >
            <Home size={17} />
            <span>Home</span>
          </Link>

          <Link 
            href="/order" 
            className={`nav-link ${pathname === "/order" ? "active" : ""}`}
          >
            <PlusCircle size={17} />
            <span>Order Print</span>
          </Link>

          <Link 
            href="/track" 
            className={`nav-link ${pathname === "/track" ? "active" : ""}`}
          >
            <Search size={17} />
            <span>Track</span>
          </Link>

          {mounted && user && (
            <Link 
              href="/orders" 
              className={`nav-link ${pathname === "/orders" ? "active" : ""}`}
            >
              <FileText size={17} />
              <span>My Orders</span>
            </Link>
          )}

          {mounted && isAdmin && (
            <Link href="/admin" className="admin-nav-badge">
              <ShieldCheck size={16} />
              <span>Admin Panel</span>
            </Link>
          )}

          {mounted ? (
            user ? (
              <div className="user-menu">
                <Link 
                  href="/profile" 
                  className="avatar-badge" 
                  title={profile?.name || user.email}
                >
                  {(profile?.name || user.email || "U")[0].toUpperCase()}
                </Link>

                <button 
                  onClick={handleLogout} 
                  className="btn btn-secondary btn-sm" 
                  title="Log Out"
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Link href="/login" className="btn btn-secondary btn-sm">
                  Login
                </Link>
                <Link href="/register" className="btn btn-sm">
                  Register
                </Link>
              </div>
            )
          ) : (
            <div style={{ width: 120, height: 32 }} />
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <Link 
            href="/" 
            className={`mobile-nav-link ${pathname === "/" ? "active" : ""}`}
          >
            <Home size={18} />
            <span>Home</span>
          </Link>

          <Link 
            href="/order" 
            className={`mobile-nav-link ${pathname === "/order" ? "active" : ""}`}
          >
            <PlusCircle size={18} />
            <span>Order Print</span>
          </Link>

          <Link 
            href="/track" 
            className={`mobile-nav-link ${pathname === "/track" ? "active" : ""}`}
          >
            <Search size={18} />
            <span>Track Order</span>
          </Link>

          {mounted && user && (
            <Link 
              href="/orders" 
              className={`mobile-nav-link ${pathname === "/orders" ? "active" : ""}`}
            >
              <FileText size={18} />
              <span>My Orders</span>
            </Link>
          )}

          {mounted && isAdmin && (
            <Link href="/admin" className="mobile-nav-link admin-link">
              <ShieldCheck size={18} />
              <span>Admin Panel</span>
            </Link>
          )}

          {mounted && user && (
            <Link 
              href="/profile" 
              className={`mobile-nav-link ${pathname === "/profile" ? "active" : ""}`}
            >
              <User size={18} />
              <span>My Profile ({profile?.name || user.email?.split("@")[0]})</span>
            </Link>
          )}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 8 }}>
            {mounted && user ? (
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary btn-sm" 
                style={{ width: "100%", justifyContent: "center" }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/login" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                  Login
                </Link>
                <Link href="/register" className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
