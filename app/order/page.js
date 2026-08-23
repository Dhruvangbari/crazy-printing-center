"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Sparkles, 
  Check, 
  IndianRupee, 
  AlertCircle, 
  ArrowRight,
  Shield,
  Layers,
  User,
  Phone,
  MapPin,
  Clock,
  BookOpen,
  Zap
} from "lucide-react";

const BINDING_OPTIONS = [
  { id: "NONE", label: "No Binding", desc: "Loose printed sheets", price: 0 },
  { id: "STAPLE", label: "Corner Staple", desc: "Top-left metal staple", price: 5 },
  { id: "SPIRAL", label: "Spiral Binding", desc: "Plastic coil + transparent sheet", price: 30 },
  { id: "SOFT_COVER", label: "Soft Binding", desc: "Glued thermal spine book", price: 50 },
  { id: "HARD_BOUND", label: "Hard Bound", desc: "Golden embossed hard book", price: 150 },
  { id: "LAMINATION", label: "Lamination", desc: "Glossy waterproof pouch", price: 15 },
];

export default function Order() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Customer & Delivery info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("PICKUP");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");

  // Print Specifications
  const [paperSize, setPaperSize] = useState("A4");
  const [colorMode, setColorMode] = useState("BW");
  const [sides, setSides] = useState("SINGLE");
  const [paperType, setPaperType] = useState("NORMAL");
  const [copies, setCopies] = useState(1);
  const [bindingType, setBindingType] = useState("NONE");
  const [priority, setPriority] = useState("STANDARD");

  // Calculated Price
  const [printCost, setPrintCost] = useState(0);
  const [bindingCost, setBindingCost] = useState(0);
  const [priorityCost, setPriorityCost] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUserData() {
      const s = supabase();
      const { data: { user } } = await s.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await s
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profile) {
          setCustomerName(profile.name || "");
          setCustomerPhone(profile.phone || "");
        } else {
          setCustomerName(user.user_metadata?.name || user.email?.split("@")[0] || "");
          setCustomerPhone(user.user_metadata?.phone || "");
        }
      }
    }
    loadUserData();
  }, []);

  // Calculate live itemized pricing
  useEffect(() => {
    let sizeMultiplier =
      {
        A4: 1,
        A5: 0.8,
        A3: 1.8,
        Legal: 1.2,
        Letter: 1,
        Custom: 1.5,
      }[paperSize] || 1;

    let colorRate = colorMode === "COLOR" ? 5 : 3;
    let sideDiscount = sides === "DOUBLE" ? 0.9 : 1;
    let paperTypeAdd = paperType === "GLOSSY" ? 3 : paperType === "PREMIUM" ? 1.5 : 0;
    let numCopies = Math.max(1, Number(copies) || 1);
    let numFiles = Math.max(1, files.length);

    let baseCalculated = Math.max(
      5,
      Math.ceil((colorRate * sizeMultiplier * sideDiscount + paperTypeAdd) * numCopies * numFiles)
    );

    const selectedBinding = BINDING_OPTIONS.find((b) => b.id === bindingType) || { price: 0 };
    const bindingFee = selectedBinding.price * numCopies;
    const priorityFee = priority === "EXPRESS" ? 20 : 0;

    setPrintCost(baseCalculated);
    setBindingCost(bindingFee);
    setPriorityCost(priorityFee);
    setTotalPrice(baseCalculated + bindingFee + priorityFee);
  }, [paperSize, colorMode, sides, paperType, copies, files, bindingType, priority]);

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const s = supabase();
      const { data: { user }, error: userError } = await s.auth.getUser();

      if (userError || !user) {
        setErr("Please log in first to submit an order.");
        router.push("/login");
        return;
      }

      if (!files.length) {
        setErr("Please attach at least one document to print.");
        setLoading(false);
        return;
      }

      if (!customerName.trim()) {
        setErr("Please provide the Customer / Recipient Name.");
        setLoading(false);
        return;
      }

      if (!customerPhone.trim()) {
        setErr("Please provide a Contact Phone Number for order tracking & delivery.");
        setLoading(false);
        return;
      }

      if (deliveryMode === "DELIVERY" && !address.trim()) {
        setErr("Please provide complete delivery street address.");
        setLoading(false);
        return;
      }

      // Update profile info
      await s.from("profiles").upsert(
        {
          id: user.id,
          name: customerName.trim(),
          phone: customerPhone.trim(),
        },
        { onConflict: "id" }
      );

      // Create Order
      const fullDeliveryAddress = deliveryMode === "DELIVERY" 
        ? `${address}${landmark ? `, Near ${landmark}` : ""}${city ? `, ${city}` : ""}${pincode ? ` - ${pincode}` : ""}`
        : "Shop Counter Pickup";

      const orderPayload = {
        user_id: user.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_mode: deliveryMode,
        address: fullDeliveryAddress,
        city: city.trim() || null,
        pincode: pincode.trim() || null,
        landmark: landmark.trim() || null,
        paper_size: paperSize,
        color_mode: colorMode,
        sides: sides,
        paper_type: paperType,
        copies: Number(copies) || 1,
        binding_type: bindingType,
        priority: priority,
        notes: notes.trim() || null,
        subtotal: printCost,
        total: totalPrice,
        status: "ORDER_RECEIVED",
      };

      const { data: order, error: orderErr } = await s
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (orderErr) {
        setErr("Order creation failed: " + orderErr.message);
        setLoading(false);
        return;
      }

      // Add to status history
      await s.from("status_history").insert({
        order_id: order.id,
        status: "ORDER_RECEIVED",
        message: `Order submitted by ${customerName}. Specifications: ${paperSize}, ${colorMode}, ${copies} copy(s), ${bindingType} binding.`,
      });

      // Upload Documents
      for (const f of files) {
        const cleanName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${order.id}/${Date.now()}-${cleanName}`;

        let u = await s.storage.from("documents").upload(path, f);
        if (u.error) {
          console.warn("Storage upload warning:", u.error);
        }

        await s.from("order_files").insert({
          order_id: order.id,
          original_name: f.name,
          storage_path: path,
          mime_type: f.type,
          size: f.size,
        });
      }

      router.push(`/orders/${order.id}`);
    } catch (unexpected) {
      setErr(unexpected.message || "An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Create Print Order</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, marginTop: 4 }}>
            Fast document uploading, custom binding, and doorstep delivery options
          </p>
        </div>

        {err && (
          <div className="error">
            <AlertCircle size={16} />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. Customer Information Card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <User size={20} color="var(--primary)" />
                <span>Customer & Contact Details</span>
              </h2>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                For order updates & delivery
              </span>
            </div>

            <div className="row">
              <div className="field">
                <label>Recipient / Customer Name *</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Contact Phone / WhatsApp *</label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. Document Upload Dropzone */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <UploadCloud size={20} color="var(--primary)" />
                <span>Attach Documents</span>
              </h2>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {files.length} {files.length === 1 ? "file" : "files"} selected
              </span>
            </div>

            <div
              className={`dropzone ${dragActive ? "active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <UploadCloud className="dropzone-icon" />
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-main)", marginBottom: 4 }}>
                Click to browse or drag & drop files here
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Supports PDF, Word (DOCX), PowerPoint, and high-res Images
              </div>
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {files.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#f8fafc",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                      <FileText size={18} color="var(--primary)" />
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{file.name}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Print Specifications */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <Layers size={20} color="var(--primary)" />
                <span>Print Job Specifications</span>
              </h2>
            </div>

            <div className="row">
              <div className="field">
                <label>Paper Size</label>
                <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
                  <option value="A4">A4 (Standard 210 x 297 mm)</option>
                  <option value="A5">A5 (Half A4 148 x 210 mm)</option>
                  <option value="A3">A3 (Large 297 x 420 mm)</option>
                  <option value="Legal">Legal (8.5 x 14 in)</option>
                  <option value="Letter">Letter (8.5 x 11 in)</option>
                  <option value="Custom">Custom Dimensions</option>
                </select>
              </div>

              <div className="field">
                <label>Colour Mode</label>
                <select value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
                  <option value="BW">Black & White (₹3.00/pg)</option>
                  <option value="COLOR">Full Colour (₹5.00/pg)</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Print Sides</label>
                <select value={sides} onChange={(e) => setSides(e.target.value)}>
                  <option value="SINGLE">Single Sided</option>
                  <option value="DOUBLE">Double Sided (Back-to-Back)</option>
                </select>
              </div>

              <div className="field">
                <label>Paper Quality</label>
                <select value={paperType} onChange={(e) => setPaperType(e.target.value)}>
                  <option value="NORMAL">Standard 75 GSM Bond Paper</option>
                  <option value="PREMIUM">Premium 100 GSM Bond Paper (+₹1.50)</option>
                  <option value="GLOSSY">Glossy 200 GSM Photo Paper (+₹3.00)</option>
                </select>
              </div>
            </div>

            <div className="field" style={{ maxWidth: 200 }}>
              <label>Number of Copies</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>
          </div>

          {/* 4. Binding & Finishing Add-ons */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <BookOpen size={20} color="var(--primary)" />
                <span>Binding & Finishing Add-ons</span>
              </h2>
            </div>

            <div className="options-grid">
              {BINDING_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className={`option-card ${bindingType === opt.id ? "selected" : ""}`}
                  onClick={() => setBindingType(opt.id)}
                >
                  <div className="option-card-title">
                    <span>{opt.label}</span>
                    {bindingType === opt.id && <Check size={16} color="var(--primary)" />}
                  </div>
                  <div className="option-card-desc">{opt.desc}</div>
                  <div className="option-card-price">
                    {opt.price === 0 ? "Included" : `+₹${opt.price}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Delivery Location & Mode */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <MapPin size={20} color="var(--primary)" />
                <span>Delivery & Fulfillment</span>
              </h2>
            </div>

            <div className="row" style={{ marginBottom: 16 }}>
              <div
                className={`option-card ${deliveryMode === "PICKUP" ? "selected" : ""}`}
                onClick={() => setDeliveryMode("PICKUP")}
              >
                <div className="option-card-title">
                  <span>🏪 Shop Counter Pickup</span>
                  {deliveryMode === "PICKUP" && <Check size={16} color="var(--primary)" />}
                </div>
                <div className="option-card-desc">Collect directly from store counter with zero waiting time</div>
                <div className="option-card-price">FREE</div>
              </div>

              <div
                className={`option-card ${deliveryMode === "DELIVERY" ? "selected" : ""}`}
                onClick={() => setDeliveryMode("DELIVERY")}
              >
                <div className="option-card-title">
                  <span>🚚 Doorstep Delivery</span>
                  {deliveryMode === "DELIVERY" && <Check size={16} color="var(--primary)" />}
                </div>
                <div className="option-card-desc">Delivered safely to your home, office, or college</div>
                <div className="option-card-price">Standard Rate</div>
              </div>
            </div>

            {deliveryMode === "DELIVERY" && (
              <div style={{ background: "#f8fafc", padding: 18, borderRadius: "var(--radius-md)", marginTop: 12 }}>
                <div className="field">
                  <label>Street Address / Flat / Floor / Building *</label>
                  <textarea
                    placeholder="e.g., Flat 402, Sunshine Heights, Main Road"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    required
                  />
                </div>

                <div className="row">
                  <div className="field">
                    <label>Landmark / Nearby Spot</label>
                    <input
                      type="text"
                      placeholder="e.g., Near Metro Station / Opposite Axis Bank"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>City & Area</label>
                    <input
                      type="text"
                      placeholder="e.g., Pune / Mumbai / Bangalore"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field" style={{ maxWidth: 200 }}>
                  <label>Pincode</label>
                  <input
                    type="text"
                    placeholder="411001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="field" style={{ marginTop: 16 }}>
              <label>Special Instructions / Notes for Printing</label>
              <textarea
                placeholder="e.g., Print pages 1-15 only, staple top left, punch holes for binder..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* 6. Order Priority & Urgency */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <Zap size={20} color="var(--primary)" />
                <span>Processing Speed</span>
              </h2>
            </div>

            <div className="row">
              <div
                className={`option-card ${priority === "STANDARD" ? "selected" : ""}`}
                onClick={() => setPriority("STANDARD")}
              >
                <div className="option-card-title">
                  <span>Standard Turnaround</span>
                  {priority === "STANDARD" && <Check size={16} color="var(--primary)" />}
                </div>
                <div className="option-card-desc">Ready within normal queue processing time</div>
                <div className="option-card-price">Included</div>
              </div>

              <div
                className={`option-card ${priority === "EXPRESS" ? "selected" : ""}`}
                onClick={() => setPriority("EXPRESS")}
              >
                <div className="option-card-title">
                  <span>⚡ Express Priority Rush</span>
                  {priority === "EXPRESS" && <Check size={16} color="var(--primary)" />}
                </div>
                <div className="option-card-desc">Jump to #1 in printer queue for immediate printing</div>
                <div className="option-card-price">+₹20</div>
              </div>
            </div>
          </div>

          {/* 7. Comprehensive Price Breakdown & Submit Card */}
          <div
            className="card"
            style={{
              background: "radial-gradient(circle at 90% 10%, #1e1b4b 0%, #0f172a 100%)",
              color: "white",
              padding: 28,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                  Itemized Cost Breakdown
                </div>
                <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div>• Base Print ({paperSize}, {colorMode}, {copies} copies): <b>₹{printCost}</b></div>
                  {bindingCost > 0 && <div>• Finishing / Binding ({bindingType}): <b>₹{bindingCost}</b></div>}
                  {priorityCost > 0 && <div>• Express Rush Processing: <b>₹{priorityCost}</b></div>}
                  <div>• Delivery Mode: <b>{deliveryMode === "PICKUP" ? "Shop Pickup (Free)" : "Doorstep Delivery"}</b></div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: "#a5f3fc", fontWeight: 700 }}>TOTAL PAYABLE AMOUNT</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#38bdf8" }}>₹{totalPrice}</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-lg"
                style={{ background: "#4f46e5", padding: "16px 32px", fontSize: 17 }}
              >
                <Sparkles size={20} />
                <span>{loading ? "Creating Order..." : "Proceed to UPI Payment"}</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}