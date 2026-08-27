"use client";
import { useState, useMemo } from "react";
import { 
  MapPin, 
  Navigation, 
  Store, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle,
  Info,
  Clock,
  Compass,
  Layers,
  Search
} from "lucide-react";

// Known localities within Boisar 401501 & Tarapur MIDC service zone
export const BOISAR_LOCALITIES = [
  { name: "Boisar Railway Station (West)", landmark: "Station Rd / Bazar", time: "10-15 mins", distance: "0.8 km" },
  { name: "Boisar East (Katkar Pada)", landmark: "Near Katkar Pada Naka", time: "15-20 mins", distance: "2.1 km" },
  { name: "Tarapur MIDC", landmark: "Near MIDC Police Station / Zone 1-4", time: "20-25 mins", distance: "3.5 km" },
  { name: "Ostwal Empire / Navapur Rd", landmark: "Near Ostwal Empire Complex", time: "15-20 mins", distance: "1.8 km" },
  { name: "BARC / TAPS Colony", landmark: "TAPS Colony Gate / Tarapur", time: "25-30 mins", distance: "5.2 km" },
  { name: "Betegaon", landmark: "Betegaon Gram Panchayat Road", time: "20-25 mins", distance: "3.8 km" },
  { name: "Salwad", landmark: "Salwad Main Road", time: "20-25 mins", distance: "4.0 km" },
  { name: "Kolwade / Dandi Rd", landmark: "Kolwade Phata", time: "25-30 mins", distance: "4.5 km" },
  { name: "Saravali", landmark: "Saravali Village Road", time: "15-20 mins", distance: "2.4 km" },
  { name: "Pamtembhi / Maan", landmark: "Pamtembhi Naka", time: "20-25 mins", distance: "3.2 km" }
];

export default function BoisarDeliveryMap({ 
  selectedLocality = "", 
  onSelectLocality, 
  userPincode = "401501",
  isDelivery = true 
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const isWithinBoisar = userPincode === "401501" || userPincode === "" || userPincode === "401506";

  const filteredLocalities = useMemo(() => {
    if (!searchQuery.trim()) return BOISAR_LOCALITIES;
    return BOISAR_LOCALITIES.filter(l => 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.landmark.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const activeLocalityData = BOISAR_LOCALITIES.find(
    l => l.name.toLowerCase() === (selectedLocality || "").toLowerCase()
  ) || BOISAR_LOCALITIES[0];

  return (
    <div className="boisar-map-container" style={{
      borderRadius: "var(--radius-lg)",
      border: isWithinBoisar ? "1px solid #bfdbfe" : "1px solid #fecaca",
      background: "#0f172a",
      overflow: "hidden",
      color: "white",
      boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
      transition: "all 0.3s ease",
      marginBottom: 20
    }}>
      {/* Map Header */}
      <div style={{
        padding: "14px 18px",
        background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 0 12px rgba(6, 182, 212, 0.5)"
          }}>
            <Navigation size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <span>Boisar Live Delivery Zone</span>
              <span style={{
                fontSize: 10,
                fontWeight: 900,
                background: "#059669",
                color: "white",
                padding: "2px 6px",
                borderRadius: 4,
                letterSpacing: 0.5
              }}>
                PIN: 401501
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Serving all residential & industrial areas in Boisar, Maharashtra
            </div>
          </div>
        </div>

        {/* Live Serviceability Status Tag */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: isWithinBoisar ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.2)",
          border: `1px solid ${isWithinBoisar ? "#10b981" : "#ef4444"}`,
          color: isWithinBoisar ? "#34d399" : "#fca5a5",
          padding: "5px 12px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: isWithinBoisar ? "#10b981" : "#ef4444",
            display: "inline-block",
            boxShadow: `0 0 8px ${isWithinBoisar ? "#10b981" : "#ef4444"}`
          }} />
          <span>{isWithinBoisar ? "🟢 Active Boisar Delivery Zone" : "🔴 Outside Boisar 401501"}</span>
        </div>
      </div>

      {/* Visual Interactive Map Canvas */}
      <div style={{ position: "relative", height: 240, overflow: "hidden", background: "#0b132b" }}>
        {/* Real Live Google Maps Embed for Dhruvang Crazy Print Store Location */}
        <iframe
          title="Dhruvang Crazy Printing Center Boisar Store Location"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src="https://maps.google.com/maps?q=Dhruvang%20Crazy%20Printing%20Center%20Boisar%20Station%20Road%20Maharashtra%20401501&t=&z=15&ie=UTF8&iwloc=&output=embed"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block"
          }}
        />

        {/* Overlay HUD Radar & Markers */}
        <div style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "linear-gradient(to bottom, rgba(15, 23, 42, 0.85) 0%, transparent 40%, rgba(15, 23, 42, 0.9) 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 12
        }}>
          {/* Top Info Strip */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", pointerEvents: "auto", flexWrap: "wrap", gap: 8 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.92)",
              backdropFilter: "blur(8px)",
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.15)",
              fontSize: 11.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              <Store size={14} color="#38bdf8" />
              <span>Shop Hub: <b>Dhruvang Crazy Printing Center (Boisar W)</b></span>
            </div>

            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Dhruvang+Crazy+Printing+Center+Boisar+Station+Road+Maharashtra+401501"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
                color: "white",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(79, 70, 229, 0.4)",
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              <Navigation size={12} />
              <span>Get Directions in Maps 📍</span>
            </a>
          </div>

          {/* Bottom Live Coordinates Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "auto", flexWrap: "wrap", gap: 8 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.9)",
              backdropFilter: "blur(6px)",
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: 11,
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              <Compass size={12} color="#10b981" />
              <span>📍 Boisar Railway Station Road, Boisar (West) - 401501</span>
            </div>

            <div style={{
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid #10b981",
              color: "#34d399",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800
            }}>
              ⚡ 10-30 Min Doorstep Delivery
            </div>
          </div>
        </div>
      </div>

      {/* Quick Boisar Area Select Chips */}
      {isDelivery && (
        <div style={{
          padding: "14px 18px",
          background: "#1e293b",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            flexWrap: "wrap",
            gap: 8
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
              <Compass size={14} color="#38bdf8" />
              <span>Select Your Boisar Locality for 1-Click Autofill:</span>
            </div>

            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              Standard Doorstep Delivery: <b>₹30.00</b>
            </span>
          </div>

          {/* Locality Chips Horizontal Scroll */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            maxHeight: 110,
            overflowY: "auto",
            paddingRight: 4
          }}>
            {BOISAR_LOCALITIES.map((loc) => {
              const isSelected = selectedLocality && selectedLocality.toLowerCase().includes(loc.name.toLowerCase());
              return (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => onSelectLocality && onSelectLocality(loc)}
                  style={{
                    background: isSelected 
                      ? "linear-gradient(135deg, #4f46e5, #06b6d4)" 
                      : "rgba(255, 255, 255, 0.08)",
                    border: `1px solid ${isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.12)"}`,
                    color: isSelected ? "white" : "#e2e8f0",
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: isSelected ? 800 : 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: isSelected ? "0 2px 10px rgba(6, 182, 212, 0.3)" : "none"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                      e.currentTarget.style.borderColor = "#94a3b8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                    }
                  }}
                >
                  <MapPin size={12} color={isSelected ? "white" : "#38bdf8"} />
                  <span>{loc.name}</span>
                  <span style={{
                    fontSize: 10,
                    opacity: 0.8,
                    background: "rgba(0,0,0,0.25)",
                    padding: "1px 5px",
                    borderRadius: 4
                  }}>
                    {loc.time}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
