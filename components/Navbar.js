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
  X,
  Bell,
  BellRing,
  ExternalLink
} from "lucide-react";
import { requestWebNotificationPermission } from "../lib/webNotifications";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "init-1",
      title: "Crazy Printing Center",
      message: "Web alerts are active. Live status notifications appear here.",
      time: "Live",
      read: true
    }
  ]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const s = supabase();
    const channel = s
      .channel("navbar_notifications_channel")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const order = payload.new;
        if (!order) return;
        const newNotif = {
          id: order.id + "-" + Date.now(),
          orderId: order.id,
          orderNumber: order.order_number,
          title: `Order #${order.order_number}`,
          message: `Status updated to ${order.status?.replaceAll("_", " ")}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          read: false
        };
        setNotifications((prev) => [newNotif, ...prev.slice(0, 9)]);
        setUnreadCount((c) => c + 1);
      })
      .subscribe();

    return () => {
      s.removeChannel(channel);
    };
  }, []);

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

          {/* Live Notification Bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setUnreadCount(0);
              }}
              className="btn btn-secondary btn-sm"
              style={{
                padding: 0,
                position: "relative",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Live Web Notifications"
            >
              {unreadCount > 0 ? (
                <BellRing size={17} color="var(--primary)" />
              ) : (
                <Bell size={17} />
              )}
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    background: "#ef4444",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 900,
                    borderRadius: 999,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    boxShadow: "0 0 6px rgba(239,68,68,0.6)",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Panel */}
            {showNotifMenu && (
              <div
                className="animate-slide-up"
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 10,
                  width: 320,
                  background: "white",
                  borderRadius: 14,
                  boxShadow: "0 15px 35px rgba(0,0,0,0.15)",
                  border: "1px solid var(--border)",
                  zIndex: 1000,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#f8fafc",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <Bell size={14} color="var(--primary)" />
                    <span>Live Web Alerts</span>
                  </div>
                  <button
                    onClick={() => requestWebNotificationPermission()}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Enable Browser Push ↗
                  </button>
                </div>

                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "10px 14px",
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <b style={{ color: "var(--text-main)" }}>{n.title}</b>
                        <span style={{ fontSize: 10, color: "var(--text-light)" }}>{n.time}</span>
                      </div>
                      <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>{n.message}</div>
                      {n.orderId && (
                        <Link
                          href={`/orders/${n.orderId}`}
                          onClick={() => setShowNotifMenu(false)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 11,
                            color: "var(--primary)",
                            fontWeight: 700,
                            marginTop: 4,
                          }}
                        >
                          <span>View Bill & Track</span>
                          <ExternalLink size={10} />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
