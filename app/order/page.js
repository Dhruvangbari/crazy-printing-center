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
  Layers
} from "lucide-react";

export default function Order() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [v, setV] = useState({
    paper_size: "A4",
    color_mode: "BW",
    sides: "SINGLE",
    paper_type: "NORMAL",
    copies: 1,
    delivery_mode: "PICKUP",
    address: "",
    notes: "",
  });
  const [price, setPrice] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase().auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    let sizeMultiplier =
      {
        A4: 1,
        A5: 0.8,
        A3: 1.8,
        Legal: 1.2,
        Letter: 1,
        Custom: 1.5,
      }[v.paper_size] || 1;

    let colorRate = v.color_mode === "COLOR" ? 5 : 1.5;
    let sideDiscount = v.sides === "DOUBLE" ? 0.9 : 1;
    let paperTypeAdd = v.paper_type === "GLOSSY" ? 3 : v.paper_type === "PREMIUM" ? 1.5 : 0;
    let numCopies = Math.max(1, Number(v.copies) || 1);
    let numFiles = Math.max(1, files.length);

    let calculated = Math.max(
      5,
      Math.ceil((colorRate * sizeMultiplier * sideDiscount + paperTypeAdd) * numCopies * numFiles)
    );

    setPrice(calculated);
  }, [v, files]);

  // Drag & drop handlers
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
        setErr("Please log in first to create an order.");
        router.push("/login");
        return;
      }

      if (!files.length) {
        setErr("Please upload at least one document to print.");
        setLoading(false);
        return;
      }

      // Auto ensure user profile row
      await s.from("profiles").upsert(
        {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "Customer",
          phone: user.user_metadata?.phone || null,
        },
        { onConflict: "id" }
      );

      // Create Order in database
      const { data: order, error: orderErr } = await s
        .from("orders")
        .insert({
          ...v,
          copies: Number(v.copies) || 1,
          user_id: user.id,
          subtotal: price,
          total: price,
          status: "ORDER_RECEIVED",
        })
        .select()
        .single();

      if (orderErr) {
        setErr("Order creation error: " + orderErr.message);
        setLoading(false);
        return;
      }

      // Upload Documents to Supabase Storage
      for (const f of files) {
        const cleanName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${order.id}/${Date.now()}-${cleanName}`;

        let u = await s.storage.from("documents").upload(path, f);
        if (u.error) {
          console.warn("Storage upload error:", u.error);
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
            Configure your printing options and upload your files
          </p>
        </div>

        {err && (
          <div className="error">
            <AlertCircle size={16} />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. Document Upload Dropzone */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <UploadCloud size={20} color="var(--primary)" />
                <span>Upload Documents</span>
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
                Supports PDF, Word, PowerPoint, JPG, and PNG documents
              </div>
            </div>

            {/* Selected File Previews */}
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

          {/* 2. Print Configuration Options */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <Layers size={20} color="var(--primary)" />
                <span>Print Job Options</span>
              </h2>
            </div>

            <div className="row">
              <div className="field">
                <label>Paper Size</label>
                <select
                  value={v.paper_size}
                  onChange={(e) => setV({ ...v, paper_size: e.target.value })}
                >
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
                <select
                  value={v.color_mode}
                  onChange={(e) => setV({ ...v, color_mode: e.target.value })}
                >
                  <option value="BW">Black & White (₹1.50/pg)</option>
                  <option value="COLOR">Full Colour (₹5.00/pg)</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Print Sides</label>
                <select
                  value={v.sides}
                  onChange={(e) => setV({ ...v, sides: e.target.value })}
                >
                  <option value="SINGLE">Single Sided</option>
                  <option value="DOUBLE">Double Sided (Back-to-Back)</option>
                </select>
              </div>

              <div className="field">
                <label>Paper Quality</label>
                <select
                  value={v.paper_type}
                  onChange={(e) => setV({ ...v, paper_type: e.target.value })}
                >
                  <option value="NORMAL">Standard 75 GSM Bond</option>
                  <option value="PREMIUM">Premium 100 GSM Paper</option>
                  <option value="GLOSSY">Glossy 200 GSM Photo</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Copies</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={v.copies}
                  onChange={(e) => setV({ ...v, copies: Math.max(1, parseInt(e.target.value) || 1) })}
                  required
                />
              </div>

              <div className="field">
                <label>Delivery Method</label>
                <select
                  value={v.delivery_mode}
                  onChange={(e) => setV({ ...v, delivery_mode: e.target.value })}
                >
                  <option value="PICKUP">Shop Counter Pickup (Free)</option>
                  <option value="DELIVERY">Doorstep Delivery</option>
                </select>
              </div>
            </div>

            {v.delivery_mode === "DELIVERY" && (
              <div className="field">
                <label>Full Delivery Address</label>
                <textarea
                  placeholder="Enter complete building, street, and pin code..."
                  value={v.address}
                  onChange={(e) => setV({ ...v, address: e.target.value })}
                  rows={2}
                  required
                />
              </div>
            )}

            <div className="field">
              <label>Special Instructions / Notes (Optional)</label>
              <textarea
                placeholder="e.g., Spiral bind, staple top left, print pages 1-10 only..."
                value={v.notes}
                onChange={(e) => setV({ ...v, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* 3. Price Summary & Submit Bar */}
          <div
            className="card"
            style={{
              background: "radial-gradient(circle at 90% 10%, #1e1b4b 0%, #0f172a 100%)",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700 }}>ESTIMATED TOTAL PAYABLE</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#38bdf8" }}>₹{price}</div>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>
                {files.length} document(s) • {v.copies} copy(s) • {v.color_mode} • {v.paper_size}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-lg"
              style={{ background: "#4f46e5" }}
            >
              <Sparkles size={18} />
              <span>{loading ? "Processing Order..." : "Proceed to Payment"}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}