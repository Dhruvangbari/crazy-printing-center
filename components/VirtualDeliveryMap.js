"use client";
import { useMemo } from "react";
import { 
  Store, 
  MapPin, 
  Truck, 
  Clock, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck,
  Zap
} from "lucide-react";

export default function VirtualDeliveryMap({ order }) {
  if (!order) return null;

  const isDelivery = order.delivery_mode === "DELIVERY";
  const isExpress = order.priority === "EXPRESS";

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
    const transitMins = isDelivery ? (isExpress ? 30 : 60) : 0;
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
        return 10;
      case "PAYMENT_VERIFIED":
        return 25;
      case "PRINTING":
        return 45;
      case "QUALITY_CHECK":
        return 65;
      case "READY":
        return isDelivery ? 75 : 100;
      case "OUT_FOR_DELIVERY":
        return 88;
      case "DELIVERED":
        return 100;
      case "CANCELLED":
        return 0;
      default:
        return 15;
    }
  };

  const progress = getProgressPercentage();
  const isDelivered = order.status === "DELIVERED";
  const isOutForDelivery = order.status === "OUT_FOR_DELIVERY";

  return (
    <div className="card" style={{ marginBottom: 24, overflow: "hidden", padding: 0 }}>
      {/* Map Header with Live ETA Badge */}
      <div style={{ padding: "18px 22px", background: "#0f172a", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#4f46e5", display: "grid", placeItems: "center" }}>
            <Navigation size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {isDelivery ? "Live Virtual Delivery Tracker" : "Store Counter Pickup Route"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {isDelivery ? "Real-time dispatch & transit tracking" : "Store pickup navigation"}
            </div>
          </div>
        </div>

        {/* ETA Badge */}
        <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={15} color="#38bdf8" />
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {isDelivered ? (
              <span style={{ color: "#4ade80" }}>Delivered Successfully</span>
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

      {/* Virtual Interactive Route Canvas */}
      <div
        style={{
          position: "relative",
          height: 220,
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
            Dhruvang Crazy Printing
          </div>
          <div style={{ color: "#94a3b8", fontSize: 10 }}>Origin Hub</div>
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
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: isDelivered ? "#10b981" : "#f59e0b",
              border: "3px solid white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 0 20px rgba(245, 158, 11, 0.6)",
              animation: isOutForDelivery ? "bounce 1.5s infinite" : "none",
            }}
          >
            {isDelivered ? <PackageCheck size={18} /> : <Truck size={18} />}
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
                fontWeight: 800,
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
          <div style={{ color: "white", fontSize: 12, fontWeight: 700, marginTop: 6, textShadow: "0 1px 4px black", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {order.customer_name || "Customer"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 10, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isDelivery ? "Destination" : "Pickup"}
          </div>
        </div>
      </div>

      {/* Destination & Fulfillment Summary Footer */}
      <div style={{ padding: "16px 20px", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MapPin size={18} color="var(--primary)" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
              {isDelivery ? "Delivery Address" : "Pickup Location"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {order.address || (isDelivery ? "Customer Address" : "Dhruvang Crazy Printing Center, Main Counter")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isExpress && (
            <span style={{ fontSize: 11, fontWeight: 800, background: "#fef3c7", color: "#b45309", padding: "4px 8px", borderRadius: 6 }}>
              ⚡ EXPRESS QUEUE
            </span>
          )}
          <span className={`status-badge status-${order.status}`}>
            {order.status?.replaceAll("_", " ")}
          </span>
        </div>
      </div>
    </div>
  );
}
