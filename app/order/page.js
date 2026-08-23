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
  Zap,
  Home,
  Plus,
  Minus
} from "lucide-react";

const BINDING_OPTIONS = [
  { id: "NONE", label: "No Binding", desc: "Loose printed sheets", price: 0 },
  { id: "STAPLE", label: "Corner Staple", desc: "Top-left metal staple", price: 5 },
  { id: "SPIRAL", label: "Spiral Binding", desc: "Plastic coil + transparent sheet", price: 30 },
  { id: "SOFT_COVER", label: "Soft Binding", desc: "Glued thermal spine book", price: 50 },
  { id: "HARD_BOUND", label: "Hard Bound", desc: "Golden embossed hard book", price: 150 },
  { id: "LAMINATION", label: "Lamination", desc: "Glossy waterproof pouch", price: 15 },
];

async function countPdfPages(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder("latin1").decode(buffer);

      // Method 1: Pages catalog /Count N
      const pagesRegex = /\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/gi;
      let maxCount = 0;
      let m;
      while ((m = pagesRegex.exec(text)) !== null) {
        const val = parseInt(m[1], 10);
        if (val > maxCount) maxCount = val;
      }
      if (maxCount > 0) return maxCount;

      // Method 2: Any /Count N
      const countRegex = /\/Count\s+(\d+)/gi;
      while ((m = countRegex.exec(text)) !== null) {
        const val = parseInt(m[1], 10);
        if (val > maxCount) maxCount = val;
      }
      if (maxCount > 0) return maxCount;

      // Method 3: Count /Type /Page
      const pageMatches = text.match(/\/Type\s*\/Page\b/g);
      if (pageMatches && pageMatches.length > 0) {
        return pageMatches.length;
      }
    } catch (e) {
      console.warn("Failed to auto-detect PDF page count:", e);
    }
  }
  return 1;
}

export default function Order() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [detectingPages, setDetectingPages] = useState(false);
  
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

  // Calculate live itemized pricing based on TOTAL PAGES across all documents
  const totalPages = files.length > 0 ? files.reduce((sum, f) => sum + (Number(f.pages) || 1), 0) : 1;

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

    // Multiply by total pages of document!
    let baseCalculated = Math.max(
      5,
      Math.ceil((colorRate * sizeMultiplier * sideDiscount + paperTypeAdd) * numCopies * totalPages)
    );

    const selectedBinding = BINDING_OPTIONS.find((b) => b.id === bindingType) || { price: 0 };
    const bindingFee = selectedBinding.price * numCopies;
    const priorityFee = priority === "EXPRESS" ? 20 : 0;

    setPrintCost(baseCalculated);
    setBindingCost(bindingFee);
    setPriorityCost(priorityFee);
    setTotalPrice(baseCalculated + bindingFee + priorityFee);
  }, [paperSize, colorMode, sides, paperType, copies, files, totalPages, bindingType, priority]);

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  async function addFiles(fileList) {
    setDetectingPages(true);
    const processed = [];
    for (const f of fileList) {
      const detectedPages = await countPdfPages(f);
      processed.push({
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        pages: detectedPages,
      });
    }
    setFiles((prev) => [...prev, ...processed]);
    setDetectingPages(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  }

  function updateFilePages(index, delta) {
    setFiles((prev) =>
      prev.map((f, i) => {
        if (i === index) {
          const newPages = Math.max(1, (f.pages || 1) + delta);
          return { ...f, pages: newPages };
        }
        return f;
      })
    );
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
        page_count: totalPages,
        notes: notes.trim() || null,
        subtotal: printCost,
        total: totalPrice,
        status: "ORDER_RECEIVED",
      };

      // Upload Documents first
      const uploadedFiles = [];
      const tempOrderId = "temp-" + Date.now();

      for (const f of files) {
        const cleanName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${tempOrderId}/${Date.now()}-${cleanName}`;

        let u = await s.storage.from("documents").upload(path, f.file);
        if (u.error) {
          console.warn("Storage upload warning:", u.error);
        }

        uploadedFiles.push({
          original_name: f.name,
          storage_path: path,
          mime_type: f.type,
          size: f.size || 0,
        });
      }

      // 1. Try atomic ACID procedure
      let order = null;
      const { data: atomicOrder, error: atomicErr } = await s.rpc("create_order_atomic", {
        p_user_id: user.id,
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim(),
        p_delivery_mode: deliveryMode,
        p_address: fullDeliveryAddress,
        p_city: city.trim() || null,
        p_pincode: pincode.trim() || null,
        p_landmark: landmark.trim() || null,
        p_paper_size: paperSize,
        p_color_mode: colorMode,
        p_sides: sides,
        p_paper_type: paperType,
        p_copies: Number(copies) || 1,
        p_binding_type: bindingType,
        p_priority: priority,
        p_notes: notes.trim() || null,
        p_subtotal: printCost,
        p_total: totalPrice,
        p_files: uploadedFiles,
      });

      if (!atomicErr && atomicOrder) {
        order = atomicOrder;
      } else {
        // Fallback to standard insert
        const { data: fallbackOrder, error: orderErr } = await s
          .from("orders")
          .insert(orderPayload)
          .select()
          .single();

        if (orderErr) {
          setErr("Order creation failed: " + orderErr.message);
          setLoading(false);
          return;
        }

        order = fallbackOrder;

        for (const fileMeta of uploadedFiles) {
          await s.from("order_files").insert({
            order_id: order.id,
            ...fileMeta,
          });
        }

        await s.from("status_history").insert({
          order_id: order.id,
          status: "ORDER_RECEIVED",
          message: `Order submitted by ${customerName}. Specifications: ${paperSize}, ${colorMode}, ${totalPages} pages, ${copies} copy(s).`,
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
      {/* Navigation Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
          <Home size={15} />
          <span>Home</span>
        </Link>
        <span style={{ color: "var(--border)" }}>/</span>
        <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600 }}>New Print Order</span>
      </div>

      <div style={{ maxWidth: 840, margin: "0 auto 40px" }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>Create New Print Order</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, marginTop: 4 }}>
            Upload your documents, customize paper and binding, and get instant price calculation
          </p>
        </div>

        {err && (
          <div className="error" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. Customer & Contact Details */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <User size={20} color="var(--primary)" />
                <span>Customer & Contact Details</span>
              </h2>
            </div>

            <div className="row">
              <div className="field">
                <label>Customer Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Dhruvang Bari"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Contact Phone / WhatsApp *</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. Document Upload Dropzone with Automatic Page Detection */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <UploadCloud size={20} color="var(--primary)" />
                <span>Attach Documents</span>
              </h2>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                {files.length} {files.length === 1 ? "file" : "files"} ({totalPages} pages total)
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
                {detectingPages ? "Analyzing PDF page counts..." : "Click to browse or drag & drop files here"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                PDF pages are automatically detected and priced per page!
              </div>
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {files.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#f8fafc",
                      padding: "12px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden", minWidth: 220 }}>
                      <FileText size={20} color="var(--primary)" />
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{file.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>

                    {/* Page Count Counter Widget */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "white", padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Pages:</span>
                        <button
                          type="button"
                          onClick={() => updateFilePages(index, -1)}
                          style={{ background: "#f1f5f9", border: "none", borderRadius: 4, width: 22, height: 22, display: "grid", placeItems: "center", cursor: "pointer" }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: 14, fontWeight: 800, minWidth: 20, textAlign: "center" }}>
                          {file.pages || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateFilePages(index, 1)}
                          style={{ background: "#f1f5f9", border: "none", borderRadius: 4, width: 22, height: 22, display: "grid", placeItems: "center", cursor: "pointer" }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 4 }}
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Total Pages Banner */}
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#1e40af", fontWeight: 700 }}>
                  <span>Total Pages to Print:</span>
                  <span>{totalPages} Pages across {files.length} {files.length === 1 ? "document" : "documents"}</span>
                </div>
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

            <div className="row" style={{ marginBottom: 16 }}>
              <div className="field">
                <label>Paper Size</label>
                <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
                  <option value="A4">A4 (Standard 210 x 297 mm)</option>
                  <option value="A5">A5 (Booklet 148 x 210 mm)</option>
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
                  <option value="DOUBLE">Double Sided (Back-to-Back - 10% Off)</option>
                </select>
              </div>

              <div className="field">
                <label>Paper Quality</label>
                <select value={paperType} onChange={(e) => setPaperType(e.target.value)}>
                  <option value="NORMAL">Standard 75 GSM Bond Paper</option>
                  <option value="PREMIUM">Premium 100 GSM Bond Paper (+₹1.50/pg)</option>
                  <option value="GLOSSY">Glossy 200 GSM Photo Paper (+₹3.00/pg)</option>
                </select>
              </div>

              <div className="field">
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

                <div className="row" style={{ marginTop: 12 }}>
                  <div className="field">
                    <label>Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Near City Hospital"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>City / Town</label>
                    <input
                      type="text"
                      placeholder="e.g., Pune"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g., 411001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Processing Speed & Instructions */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <Clock size={20} color="var(--primary)" />
                <span>Processing Speed & Instructions</span>
              </h2>
            </div>

            <div className="row" style={{ marginBottom: 16 }}>
              <div
                className={`option-card ${priority === "STANDARD" ? "selected" : ""}`}
                onClick={() => setPriority("STANDARD")}
              >
                <div className="option-card-title">
                  <span>⏱️ Standard Queue</span>
                  {priority === "STANDARD" && <Check size={16} color="var(--primary)" />}
                </div>
                <div className="option-card-desc">Printed in regular sequence (Ready in 30-45 mins)</div>
                <div className="option-card-price">Included</div>
              </div>

              <div
                className={`option-card ${priority === "EXPRESS" ? "selected" : ""}`}
                onClick={() => setPriority("EXPRESS")}
              >
                <div className="option-card-title">
                  <span>⚡ Express Rush</span>
                  {priority === "EXPRESS" && <Check size={16} color="var(--primary)" />}
                </div>
                <div className="option-card-desc">Top-of-queue priority execution (Ready in 10-15 mins)</div>
                <div className="option-card-price">+₹20</div>
              </div>
            </div>

            <div className="field">
              <label>Special Instructions / Notes (Optional)</label>
              <textarea
                placeholder="e.g. Please print page 1-5 only, double side orientation flip on long edge..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* 7. Live Cost Summary & Order Submission */}
          <div className="card" style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white", padding: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={20} color="#38bdf8" />
              <span>Live Order Summary & Cost Breakdown</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>
                  Printing ({paperSize} • {colorMode === "COLOR" ? "Color @ ₹5" : "B&W @ ₹3"} • {totalPages} pages × {copies} copies):
                </span>
                <b>₹{printCost}.00</b>
              </div>

              {bindingCost > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Binding Add-on ({bindingType}):</span>
                  <b>+₹{bindingCost}.00</b>
                </div>
              )}

              {priorityCost > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>⚡ Express Queue Fee:</span>
                  <b>+₹{priorityCost}.00</b>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Fulfillment Mode:</span>
                <b>{deliveryMode === "PICKUP" ? "Counter Pickup (Free)" : "Doorstep Delivery"}</b>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>GRAND TOTAL TO PAY</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#38bdf8" }}>₹{totalPrice}.00</div>
              </div>

              <button
                type="submit"
                disabled={loading || files.length === 0}
                className="btn btn-lg"
                style={{ background: "#22c55e", color: "white", padding: "14px 28px", fontSize: 16 }}
              >
                <span>{loading ? "Creating Order..." : "Proceed to UPI Payment"}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}