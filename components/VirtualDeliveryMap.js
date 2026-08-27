"use client";
import { useMemo, useState } from "react";
import { 
  Store, 
  MapPin, 
  Truck, 
  Clock, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck,
  Zap,
  Phone,
  MessageCircle,
  ExternalLink,
  Compass
} from "lucide-react";

export default function VirtualDeliveryMap({ order }) {
  if (!order) return null;

  const isDelivery = order.delivery_mode === "DELIVERY";
  const isExpress = order.priority === "EXPRESS";
  const [mapTab, setMapTab] = useState(isDelivery ? "route" : "store");

  const storeAddress = "Dhruvang Crazy Printing Center, Boisar Station Road, Boisar (West), Palghar, Maharashtra - 401501";
  const storeGoogleMapsUrl = "https://www.google.com/maps/dir/?api=1&destination=Dhruvang+Crazy+Printing+Center+Boisar+Station+Road+Maharashtra+401501";
  const storeEmbedMapUrl = "https://maps.google.com/maps?q=Dhruvang%20Crazy%20Printing%20Center%20Boisar%20Station%20Road%20Maharashtra%20401501&t=&z=16&ie=UTF8&iwloc=&output=embed";

  const customerDestinationUrl = isDelivery && order.address
    ? `https://www.google.com/maps/dir/?api=1&origin=Dhruvang+Crazy+Printing+Center+Boisar+Station+Road+Maharashtra+401501&destination=${encodeURIComponent(order.address)}`
    : storeGoogleMapsUrl;

  const deliveryEmbedMapUrl = isDelivery && order.address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(order.address + ", Boisar, Maharashtra")}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    : storeEmbedMapUrl;

  // Calculate realistic ETA based on status, volume, binding, and priority
  const etaDetails = useMemo(() => {
    const createdAt = new Date(order.created_at || Date.now());
    
    // Base print prep time in minutes
    let prepMins = 15;
    if (order.copies > 5) prepMins += 10;
    if (order.copies > 20) prepMins += 20;
    if (order.binding_type && order.binding_type !== "NONE") prepMins += 25;
    if (isExpress) prepMins = Math.max(10, Math.round(prepMins * 0.5));

    // Delivery transit time
    const transitMins = isDelivery ? (isExpress ? 25 : 45) : 0;
    const totalEstMins = prepMins + transitMins;

    const estReadyTime = new Date(createdAt.getTime() + prepMins * 60000);
    const estDeliveryTime = new Date(createdAt.getTime() + totalEstMins * 60000);

    const now = new Date();
    const remainingMins = Math.max(
      5,
      Math.round((estDeliveryTime.getTime() - now.getTime()) / 60000)
    );

    return {
      prepMins,
      transitMins,
      totalEstMins,
      estReadyTimeStr: estReadyTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      estDeliveryTimeStr: estDeliveryTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      remainingMins,
    };
  }, [order, isDelivery, isExpress]);

  // Determine progress percentage along the virtual route
  const getProgressPercentage = () => {
    switch (order.status) {
      case "ORDER_RECEIVED":
      case "PAYMENT_SUBMITTED":
        return 15;
      case "PAYMENT_VERIFIED":
        return 30;
      case "PRINTING":
        return 50;
      case "QUALITY_CHECK":
        return 70;
      case "READY":
        return isDelivery ? 80 : 100;
      case "OUT_FOR_DELIVERY":
        return 90;
      case "DELIVERED":
        return 100;
      case "CANCELLED":
        return 0;
      default:
        return 20;
    }
  };

  const progress = getProgressPercentage();
  const isDelivered = order.status === "DELIVERED";
  const isOutForDelivery = order.status === "OUT_FOR_DELIVERY";

  return (
    <div className="card" style={{ marginBottom: 24, overflow: "hidden", padding: 0, border: "1px solid var(--border)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.15)" }}>
      {/* Map Header with Live ETA Badge */}
      <div style={{ padding: "16px 20px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4f46e5, #06b6d4)", display: "grid", placeItems: "center", boxShadow: "0 0 12px rgba(6, 182, 212, 0.4)" }}>
            {isDelivery ? <Navigation size={18} color="white" /> : <Store size={18} color="white" />}
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{isDelivery ? "Boisar Live Delivery Tracker" : "Store Counter Pickup Location"}</span>
              <span style={{ fontSize: 10.5, fontWeight: 900, background: "#10b981", color: "white", padding: "2px 7px", borderRadius: 999 }}>
                {isDelivery ? "DOORSTEP 🚚" : "SHOP PICKUP 🏪"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {isDelivery ? "Real-time dispatch, route simulation & GPS directions" : "Dhruvang Crazy Printing Center, Boisar (W) 401501"}
            </div>
          </div>
        </div>

        {/* ETA Badge */}
        <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={15} color="#38bdf8" />
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {isDelivered ? (
              <span style={{ color: "#4ade80" }}>✓ Delivered to Customer</span>
            ) : isDelivery ? (
              <span>
                Est. Delivery: <b style={{ color: "#38bdf8" }}>{etaDetails.estDeliveryTimeStr}</b> ({etaDetails.remainingMins} mins)
              </span>
            ) : (
              <span>
                Ready for Pickup: <b style={{ color: "#38bdf8" }}>{etaDetails.estReadyTimeStr}</b>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Switcher for Delivery vs Store Map */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
        {isDelivery && (
          <button
            type="button"
            onClick={() => setMapTab("route")}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              background: mapTab === "route" ? "white" : "transparent",
              borderBottom: mapTab === "route" ? "2px solid var(--primary)" : "2px solid transparent",
              color: mapTab === "route" ? "var(--primary)" : "var(--text-muted)",
              fontWeight: mapTab === "route" ? 800 : 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <Navigation size={15} />
            <span>Live Delivery Transit Radar</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setMapTab("store")}
          style={{
            flex: 1,
            padding: "10px 16px",
            border: "none",
            background: mapTab === "store" ? "white" : "transparent",
            borderBottom: mapTab === "store" ? "2px solid var(--primary)" : "2px solid transparent",
            color: mapTab === "store" ? "var(--primary)" : "var(--text-muted)",
            fontWeight: mapTab === "store" ? 800 : 600,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}
        >
          <Store size={15} />
          <span>Interactive Store Map (Boisar 401501)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: LIVE DELIVERY TRANSIT RADAR (For Delivery Orders) */}
      {/* ======================================================== */}
      {mapTab === "route" && isDelivery && (
        <div
          style={{
            position: "relative",
            minHeight: 220,
            background: "radial-gradient(ellipse at 50% 50%, #1e293b 0%, #0f172a 100%)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            padding: "0 40px",
          }}
        >
          {/* Background Grid Pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(#334155 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              opacity: 0.4,
            }}
          />

          {/* Connecting Transit Route Line */}
          <svg
            style={{
              position: "absolute",
              left: 70,
              right: 70,
              top: "50%",
              transform: "translateY(-50%)",
              width: "calc(100% - 140px)",
              height: 6,
              overflow: "visible",
            }}
          >
            {/* Base Road */}
            <line
              x1="0"
              y1="3"
              x2="100%"
              y2="3"
              stroke="#334155"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Active Completed Route */}
            <line
              x1="0"
              y1="3"
              x2={`${progress}%`}
              y2="3"
              stroke="#4f46e5"
              strokeWidth="6"
              strokeDasharray={isOutForDelivery ? "6 4" : "none"}
              strokeLinecap="round"
              style={{
                transition: "all 0.6s ease",
              }}
            />
          </svg>

          {/* Origin Store Pin (Left) */}
          <div
            style={{
              position: "absolute",
              left: 30,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#1e1b4b",
                border: "3px solid #6366f1",
                color: "#a5b4fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)",
              }}
            >
              <Store size={20} />
            </div>
            <div style={{ color: "white", fontSize: 12, fontWeight: 700, marginTop: 6, textShadow: "0 1px 4px black", whiteSpace: "nowrap" }}>
              Dhruvang Crazy Print Hub
            </div>
            <div style={{ color: "#38bdf8", fontSize: 10, fontWeight: 700 }}>Boisar Station Rd</div>
          </div>

          {/* Live Delivery Vehicle Marker (Moving along the route) */}
          <div
            style={{
              position: "absolute",
              left: `calc(70px + (100% - 140px) * ${progress / 100})`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 3,
              transition: "left 0.8s ease-in-out",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: isDelivered ? "#10b981" : "#f59e0b",
                border: "3px solid white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: isDelivered ? "0 0 20px rgba(16, 185, 129, 0.7)" : "0 0 20px rgba(245, 158, 11, 0.7)",
                animation: isOutForDelivery ? "bounce 1.5s infinite" : "none",
              }}
            >
              {isDelivered ? <PackageCheck size={20} /> : <Truck size={20} />}
            </div>
            {isOutForDelivery && (
              <div
                style={{
                  position: "absolute",
                  top: -24,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#f59e0b",
                  color: "black",
                  fontWeight: 900,
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                IN TRANSIT
              </div>
            )}
          </div>

          {/* Destination Customer Pin (Right) */}
          <div
            style={{
              position: "absolute",
              right: 30,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: isDelivered ? "#064e3b" : "#1e293b",
                border: `3px solid ${isDelivered ? "#10b981" : "#e2e8f0"}`,
                color: isDelivered ? "#34d399" : "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isDelivered ? "0 0 15px rgba(16, 185, 129, 0.4)" : "none",
              }}
            >
              <MapPin size={20} />
            </div>
            <div style={{ color: "white", fontSize: 12, fontWeight: 700, marginTop: 6, textShadow: "0 1px 4px black", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {order.customer_name || "Customer"}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 10, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Boisar 401501
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: INTERACTIVE STORE LOCATION MAP & GPS NAVIGATION */}
      {/* ======================================================== */}
      {(mapTab === "store" || !isDelivery) && (
        <div style={{ position: "relative", minHeight: 280, background: "#0f172a" }}>
          {/* Embedded Real Google Maps */}
          <iframe
            title="Dhruvang Crazy Printing Center Store Location Map"
            src={storeEmbedMapUrl}
            width="100%"
            height="280"
            style={{ border: 0, display: "block" }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Floating Store Info Badge overlay */}
          <div style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 12,
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(10px)",
            borderRadius: 10,
            padding: "12px 16px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#10b981", display: "grid", placeItems: "center", color: "white", flexShrink: 0 }}>
                <Store size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Dhruvang Crazy Printing Center</div>
                <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                  Opp. Boisar Railway Station (West), Palghar - 401501 • Open: 8 AM - 10:30 PM
                </div>
              </div>
            </div>

            <a
              href={storeGoogleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
                color: "white",
                fontSize: 12,
                fontWeight: 800,
                padding: "6px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                borderRadius: 8
              }}
            >
              <Navigation size={13} />
              <span>Get Directions 🧭</span>
            </a>
          </div>
        </div>
      )}

      {/* Destination & Fulfillment Summary Footer */}
      <div style={{ padding: "16px 20px", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 300px" }}>
          <MapPin size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text-main)" }}>
              {isDelivery ? "Customer Delivery Destination" : "Store Counter Pickup Point"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {isDelivery 
                ? (order.address || "Boisar, Maharashtra - 401501") 
                : storeAddress}
            </div>
          </div>
        </div>

        {/* Action Button Links */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a
            href={customerDestinationUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <Navigation size={13} color="var(--primary)" />
            <span>{isDelivery ? "Open Route in Maps 📍" : "Directions to Store 📍"}</span>
          </a>

          <a
            href="tel:8857871669"
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <Phone size={13} color="#16a34a" />
            <span>Call Desk</span>
          </a>

          <span className={`status-badge status-${order.status}`}>
            {order.status?.replaceAll("_", " ")}
          </span>
        </div>
      </div>
    </div>
  );
}

