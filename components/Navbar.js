"use client";
import { useEffect, useState, useRef } from "react";
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
  Home, 
  Menu, 
  X, 
  Bell, 
  BellRing, 
  ExternalLink, 
  Receipt, 
  Headphones,
  Phone,
  MessageCircle,
  Clock,
  ChevronDown,
  Sparkles,
  HelpCircle,
  MapPin
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
  const [showServiceFlyout, setShowServiceFlyout] = useState(false);
  const serviceFlyoutRef = useRef(null);
  const notifMenuRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: "init-1",
      title: "Dhruvang Crazy Printing",
      message: "Web alerts are active. Live status notifications appear here.",
      time: "Live",
      read: true
    }
  ]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close flyouts on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (serviceFlyoutRef.current && !serviceFlyoutRef.current.contains(e.target)) {
        setShowServiceFlyout(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      const s = supabase();
      if (!s || !s.channel) return;
      const channel = s
        .channel("navbar_notifications_channel")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
          const order = payload?.new;
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
        try {
          if (s?.removeChannel && channel) s.removeChannel(channel);
        } catch (e) {}
      };
    } catch (e) {
      console.warn("Navbar realtime notifications error:", e);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    let isSubscribed = true;
    let authSubscription = null;

    async function loadUser() {
      try {
        const s = supabase();
        if (!s?.auth) return;
        const res = await s.auth.getUser();
        const user = res?.data?.user || null;
        if (!isSubscribed) return;
        setUser(user);
        if (user) {
          const isDhruvang = user.email && user.email.toLowerCase() === "dhruvangbari2006@gmail.com";
          const { data } = await s
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (!isSubscribed) return;

          if (isDhruvang && data?.role !== "ADMIN") {
            await s.from("profiles").upsert(
              { id: user.id, role: "ADMIN" },
              { onConflict: "id" }
            );
            setProfile({ ...data, role: "ADMIN" });
          } else {
            setProfile(data || null);
          }
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error("Error loading user profile:", e);
      }
    }

    loadUser();

    try {
      const s = supabase();
      if (s?.auth?.onAuthStateChange) {
        const authRes = s.auth.onAuthStateChange(async (event, session) => {
          if (!isSubscribed) return;
          const currentUser = session?.user || null;
          setUser(currentUser);
          if (currentUser) {
            try {
              const { data } = await s
                .from("profiles")
                .select("*")
                .eq("id", currentUser.id)
                .single();
              if (isSubscribed) setProfile(data || null);
            } catch (e) {
              if (isSubscribed) setProfile(null);
            }
          } else {
            if (isSubscribed) setProfile(null);
          }
        });
        authSubscription = authRes?.data?.subscription;
      }
    } catch (e) {
      console.warn("Navbar auth subscription error:", e);
    }

    return () => {
      isSubscribed = false;
      try {
        authSubscription?.unsubscribe?.();
      } catch (e) {}
    };
  }, []);

  // Close mobile menu and flyouts on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowServiceFlyout(false);
    setShowNotifMenu(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase().auth.signOut();
    setUser(null);
    setProfile(null);
    setMobileMenuOpen(false);
    router.push("/login");
  }

  const isAdmin = Boolean(
    (user?.email && user.email.toLowerCase() === "dhruvangbari2006@gmail.com") ||
    profile?.role === "ADMIN"
  );

  return (
    <>
      <header className="navbar">
        <div className="nav-container">
          {/* Brand Logo & Name */}
          <Link href="/" className="brand">
            <img 
              src="/logo.png" 
              alt="Dhruvang Crazy Printing Logo" 
              style={{ 
                width: 38, 
                height: 38, 
                borderRadius: "50%", 
                objectFit: "cover", 
                border: "2px solid #4f46e5", 
                boxShadow: "0 2px 10px rgba(79, 70, 229, 0.25)" 
              }} 
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.15 }}>
                Dhruvang Crazy Printing
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="brand-badge">
                  <span className="live-dot"></span>
                  <span>Instant Xerox & Prints</span>
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="nav-links desktop-nav">
            <Link 
              href="/" 
              className={`nav-link ${pathname === "/" ? "active" : ""}`}
            >
              <Home size={16} />
              <span>Home</span>
            </Link>

            <Link 
              href="/order" 
              className={`nav-link ${pathname === "/order" ? "active" : ""}`}
            >
              <PlusCircle size={16} />
              <span>Order Print</span>
            </Link>

            <Link 
              href="/track" 
              className={`nav-link ${pathname === "/track" ? "active" : ""}`}
            >
              <Search size={16} />
              <span>Track</span>
            </Link>

            <Link 
              href="/bills" 
              className={`nav-link ${pathname === "/bills" ? "active" : ""}`}
            >
              <Receipt size={16} />
              <span>Bill Center</span>
            </Link>

            {/* Customer Service Navigation Item with Flyout */}
            <div style={{ position: "relative" }} ref={serviceFlyoutRef}>
              <button
                type="button"
                onClick={() => setShowServiceFlyout(!showServiceFlyout)}
                className={`nav-service-btn ${pathname === "/customer-service" ? "active" : ""}`}
                title="Customer Support & Helpline"
                aria-expanded={showServiceFlyout}
              >
                <Headphones size={15} color="#16a34a" />
                <span>Customer Service</span>
                <ChevronDown size={13} style={{ opacity: 0.7, transform: showServiceFlyout ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>

              {showServiceFlyout && (
                <div className="service-flyout">
                  <div className="service-flyout-header">
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 6 }}>
                        <Headphones size={15} color="var(--primary)" />
                        <span>Customer Service & Help Desk</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        Live Assistance • Fast Resolution
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Phone Call */}
                  <a
                    href="tel:8857871669"
                    className="service-flyout-item"
                    title="Call Store Helpline"
                  >
                    <div className="service-icon-box" style={{ background: "#ecfdf5", color: "#16a34a" }}>
                      <Phone size={17} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)" }}>Direct Phone Helpline</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#16a34a" }}>+91 8857871669</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 999 }}>Call Now</span>
                  </a>

                  {/* 1-Click WhatsApp Support */}
                  <a
                    href="https://wa.me/918857871669?text=Hello%20Dhruvang%20Crazy%20Printing%2C%20I%20need%20assistance%20with%20my%20order%20or%20service."
                    target="_blank"
                    rel="noreferrer"
                    className="service-flyout-item"
                    title="Chat on WhatsApp"
                  >
                    <div className="service-icon-box" style={{ background: "#f0fdf4", color: "#22c55e" }}>
                      <MessageCircle size={17} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)" }}>WhatsApp Live Chat</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Instant response on chat</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", background: "#bbf7d0", padding: "2px 8px", borderRadius: 999 }}>Chat ↗</span>
                  </a>

                  {/* Store Timings */}
                  <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: "var(--radius-md)", fontSize: 11.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Clock size={14} color="#6366f1" />
                    <span><b>Counter Hours:</b> 8:00 AM – 10:00 PM Daily</span>
                  </div>

                  {/* View Full Support Portal Link */}
                  <Link
                    href="/customer-service"
                    onClick={() => setShowServiceFlyout(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ width: "100%", justifyContent: "center", fontSize: 12, fontWeight: 700, gap: 6 }}
                  >
                    <HelpCircle size={14} />
                    <span>Open Customer Service Hub</span>
                  </Link>
                </div>
              )}
            </div>

            {mounted && user && (
              <Link 
                href="/orders" 
                className={`nav-link ${pathname === "/orders" ? "active" : ""}`}
              >
                <FileText size={16} />
                <span>My Orders</span>
              </Link>
            )}

            {mounted && isAdmin && (
              <Link href="/admin" className="admin-nav-badge">
                <ShieldCheck size={15} />
                <span>Admin Panel</span>
              </Link>
            )}

            {/* Live Notification Bell */}
            <div style={{ position: "relative" }} ref={notifMenuRef}>
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
                  <BellRing size={16} color="var(--primary)" />
                ) : (
                  <Bell size={16} />
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

                  <div style={{ padding: "8px 14px", background: "#f8fafc", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-muted)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                      <span>System Online</span>
                    </div>
                    <span>Updated: 24 Aug 2026</span>
                  </div>
                </div>
              )}
            </div>

            {/* Auth Menu */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="mobile-menu-btn">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-main)", display: "flex", alignItems: "center" }}
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="mobile-drawer">
            {/* Direct Helpline Banner in Mobile Drawer */}
            <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)", border: "1px solid #bbf7d0", padding: "12px 14px", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Headphones size={18} color="#16a34a" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>Customer Helpline</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#14532d" }}>8857871669</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <a
                  href="tel:8857871669"
                  className="btn btn-sm btn-success"
                  style={{ padding: "5px 9px", fontSize: 11, borderRadius: 999 }}
                  title="Call Store Helpline"
                >
                  <Phone size={12} />
                  <span>Call</span>
                </a>
                <a
                  href="https://wa.me/918857871669?text=Hi%2C%20I%20need%20assistance%20with%20Crazy%20Printing%20Center."
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-whatsapp"
                  style={{ padding: "5px 9px", fontSize: 11, borderRadius: 999 }}
                  title="Chat on WhatsApp"
                >
                  <MessageCircle size={12} />
                  <span>Chat</span>
                </a>
              </div>
            </div>

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

            <Link 
              href="/bills" 
              className={`mobile-nav-link ${pathname === "/bills" ? "active" : ""}`}
            >
              <Receipt size={18} />
              <span>Bill Center</span>
            </Link>

            <Link 
              href="/customer-service" 
              className={`mobile-nav-link ${pathname === "/customer-service" ? "active" : ""}`}
            >
              <Headphones size={18} color="#16a34a" />
              <span>Customer Service & Help Hub</span>
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

      {/* Modern Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <div className="bottom-nav-container">
          <Link href="/" className={`bottom-nav-item ${pathname === "/" ? "active" : ""}`}>
            <Home size={19} />
            <span>Home</span>
          </Link>

          <Link href="/order" className={`bottom-nav-item highlight-order ${pathname === "/order" ? "active" : ""}`}>
            <div className="nav-icon-circle">
              <PlusCircle size={20} />
            </div>
            <span>Order</span>
          </Link>

          <Link href="/track" className={`bottom-nav-item ${pathname === "/track" ? "active" : ""}`}>
            <Search size={19} />
            <span>Track</span>
          </Link>

          <Link href="/bills" className={`bottom-nav-item ${pathname === "/bills" ? "active" : ""}`}>
            <Receipt size={19} />
            <span>Bills</span>
          </Link>

          <Link href="/customer-service" className={`bottom-nav-item ${pathname === "/customer-service" ? "active" : ""}`}>
            <Headphones size={19} />
            <span>Support</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
