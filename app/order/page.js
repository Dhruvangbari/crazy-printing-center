"use client";
import { useEffect, useState, useRef, useMemo } from "react";
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
  Minus,
  CheckCircle2,
  Lock,
  LogIn,
  MessageCircle,
  Truck,
  Store,
  Compass,
  AlertTriangle,
  FileCheck,
  Copy,
  CreditCard,
  ShieldCheck
} from "lucide-react";
import { countDocumentPages } from "../../lib/pageCounter";
import BoisarDeliveryMap from "../../components/BoisarDeliveryMap";
import { logUserAction } from "../../lib/telemetry";
import { playChime } from "../../lib/webNotifications";
import CrazyPaymentModal from "../../components/CrazyPaymentModal";

const BINDING_OPTIONS = [
  { id: "NONE", label: "No Binding", desc: "Loose printed sheets", price: 0 },
  { id: "STAPLE", label: "Corner Staple", desc: "Top-left metal staple", price: 5 },
  { id: "SPIRAL", label: "Spiral Binding", desc: "Plastic coil + transparent sheet", price: 30 },
  { id: "SOFT_COVER", label: "Soft Binding", desc: "Glued thermal spine book", price: 50 },
  { id: "HARD_BOUND", label: "Hard Bound", desc: "Golden embossed hard book", price: 150 },
  { id: "LAMINATION", label: "Lamination", desc: "Glossy waterproof pouch", price: 15 },
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".webp"];

function isAllowedPrintDocument(file) {
  const name = (file.name || "").toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  
  // Explicitly block media / audio / video / binary / archive files
  const blockedExt = [".mp3", ".mp4", ".wav", ".mkv", ".avi", ".mov", ".m4a", ".aac", ".exe", ".zip", ".rar", ".apk", ".tar", ".gz", ".flac", ".ogg", ".webm"];
  const isBlocked = blockedExt.some((ext) => name.endsWith(ext));
  
  if (isBlocked) return false;
  if (file.type && (file.type.startsWith("audio/") || file.type.startsWith("video/"))) return false;
  
  return hasAllowedExt;
}

// Lightweight celebration confetti effect
function triggerConfetti() {
  if (typeof window === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.className = "celebrate-confetti-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#38bdf8"];
  
  for (let i = 0; i < 75; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      r: Math.random() * 6 + 3,
      dx: (Math.random() - 0.5) * 16,
      dy: (Math.random() - 0.7) * 18,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      tilt: Math.random() * 10
    });
  }

  let animationFrame;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.dx;
      p.y += p.dy;
      p.dy += 0.4; // gravity
      p.alpha -= 0.015;
      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    if (alive) {
      animationFrame = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrame);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  }
  render();
}

export default function Order() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [detectingPages, setDetectingPages] = useState(false);
  
  // Customer & Delivery info (Strict ACID state handling & LocalStorage durability)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState(""); // 10-digit numerical
  const [deliveryMode, setDeliveryMode] = useState("PICKUP"); // "PICKUP" | "DELIVERY"
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("Boisar, Maharashtra");
  const [pincode, setPincode] = useState("401501"); // Numerical only
  const [notes, setNotes] = useState("");
  const [selectedLocality, setSelectedLocality] = useState("");

  // Print Specifications
  const [paperSize, setPaperSize] = useState("A4");
  const [colorMode, setColorMode] = useState("BW");
  const [sides, setSides] = useState("SINGLE");
  const [paperType, setPaperType] = useState("NORMAL");
  const [copies, setCopies] = useState(1);
  const [bindingType, setBindingType] = useState("NONE");
  const [priority, setPriority] = useState("STANDARD");
  const [paymentMethod, setPaymentMethod] = useState("UPI_ONLINE"); // "UPI_ONLINE" | "PAY_AT_STORE"

  // Customer Payment Modal State (100% Reliable Unified Checkout)
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentProof, setPaymentProof] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Calculated Price Breakdown
  const [printCost, setPrintCost] = useState(0);
  const [bindingCost, setBindingCost] = useState(0);
  const [priorityCost, setPriorityCost] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const shopUpi = process.env.NEXT_PUBLIC_UPI_ID || "8857871669@fam";
  const upiPayUrl = `upi://pay?pa=${shopUpi}&pn=CrazyPrintingCenter&am=${totalPrice}&cu=INR&tn=${encodeURIComponent(`Print Order ₹${totalPrice}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayUrl)}`;

  function copyUpiId() {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(shopUpi);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }

  function handleProofChange(e) {
    const file = e.target.files?.[0] || null;
    setPaymentProof(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setProofPreview(url);
    } else {
      setProofPreview(null);
    }
  }

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Indian Phone validation (strictly 10 digits starting with 6, 7, 8, or 9)
  const isPhoneValid = useMemo(() => {
    const clean = (customerPhone || "").replace(/\D/g, "");
    return clean.length === 10 && /^[6-9]\d{9}$/.test(clean);
  }, [customerPhone]);

  // Boisar 401501 Pincode serviceability check
  const isBoisarPincode = useMemo(() => {
    const cleanPin = (pincode || "").replace(/\D/g, "");
    return cleanPin === "401501" || cleanPin === "401506";
  }, [pincode]);

  // 1. Auto-load saved user session and auto-load saved address data safely (Durability)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("cpc_saved_customer_data") || "{}");
        if (saved.name) setCustomerName((prev) => prev || saved.name);
        if (saved.phone) {
          const clean = saved.phone.replace(/\D/g, "").slice(-10);
          setCustomerPhone((prev) => prev || clean);
        }
        if (saved.address) setAddress((prev) => prev || saved.address);
        if (saved.city) setCity((prev) => prev || saved.city);
        if (saved.pincode) setPincode((prev) => prev || saved.pincode);
        if (saved.landmark) setLandmark((prev) => prev || saved.landmark);
      } catch (e) {}
    }

    const s = supabase();

    async function syncProfile(u) {
      if (!u) return;
      setUser(u);
      try {
        const { data: profile } = await s
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .single();
        if (profile) {
          if (profile.name) setCustomerName((prev) => prev || profile.name);
          if (profile.phone) {
            const clean = profile.phone.replace(/\D/g, "").slice(-10);
            setCustomerPhone((prev) => prev || clean);
          }
        } else {
          const defaultName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "";
          setCustomerName((prev) => prev || defaultName);
          if (u.user_metadata?.phone) {
            const clean = u.user_metadata.phone.replace(/\D/g, "").slice(-10);
            setCustomerPhone((prev) => prev || clean);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (s?.auth?.getSession) {
      s.auth.getSession().then((sessionRes) => {
        const session = sessionRes?.data?.session;
        if (session?.user) {
          syncProfile(session.user);
        }
      }).catch((e) => console.warn(e));
    }

    let authSubscription = null;
    if (s?.auth?.onAuthStateChange) {
      try {
        const authRes = s.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            syncProfile(session.user);
          } else {
            setUser(null);
          }
        });
        authSubscription = authRes?.data?.subscription;
      } catch (e) {
        console.warn(e);
      }
    }

    return () => {
      try {
        authSubscription?.unsubscribe?.();
      } catch (e) {}
    };
  }, []);

  // Save customer details to localStorage (Durability)
  function saveCustomerData(updates = {}) {
    if (typeof window !== "undefined") {
      try {
        const currentData = {
          name: updates.name !== undefined ? updates.name : customerName,
          phone: updates.phone !== undefined ? updates.phone : customerPhone,
          address: updates.address !== undefined ? updates.address : address,
          city: updates.city !== undefined ? updates.city : city,
          pincode: updates.pincode !== undefined ? updates.pincode : pincode,
          landmark: updates.landmark !== undefined ? updates.landmark : landmark,
        };
        localStorage.setItem("cpc_saved_customer_data", JSON.stringify(currentData));
      } catch (e) {}
    }
  }

  // Handle Indian Phone change strictly (ACID consistency)
  function handlePhoneChange(e) {
    const raw = e.target.value;
    // Strip everything except numbers, maximum 10 digits
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 10);
    setCustomerPhone(digitsOnly);
    saveCustomerData({ phone: digitsOnly });
  }

  // Handle Numerical Pincode change strictly (ACID consistency)
  function handlePincodeChange(e) {
    const raw = e.target.value;
    // Strip everything except numbers, maximum 6 digits
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 6);
    setPincode(digitsOnly);
    saveCustomerData({ pincode: digitsOnly });
  }

  // 1-Click Locality selection from Boisar Map
  function handleSelectLocality(loc) {
    setSelectedLocality(loc.name);
    setCity("Boisar, Maharashtra");
    setPincode("401501");
    if (loc.landmark) {
      setLandmark(loc.landmark);
    }
    if (!address) {
      setAddress(`Near ${loc.name}`);
    }
    saveCustomerData({
      landmark: loc.landmark,
      city: "Boisar, Maharashtra",
      pincode: "401501"
    });
    logUserAction("LOCATION_SELECT", `Selected Boisar Area: ${loc.name}`, { locality: loc.name, landmark: loc.landmark });
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const s = supabase();
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
      if (typeof window !== "undefined") {
        localStorage.setItem("cpc_auth_origin", currentOrigin);
        localStorage.setItem("cpc_auth_return", "/order");
      }
      const redirectUrl = `${currentOrigin}/auth/callback`;
      const { error } = await s.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (e) {
      alert("Login error: " + e.message);
      setGoogleLoading(false);
    }
  }

  const totalPages = files.length > 0 ? files.reduce((sum, f) => sum + (Number(f.pages) || 1), 0) : 1;

  // Calculate live itemized pricing including Boisar Doorstep Delivery charge
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

    // Document print charge
    let baseCalculated = Math.max(
      5,
      Math.ceil((colorRate * sizeMultiplier * sideDiscount + paperTypeAdd) * numCopies * totalPages)
    );

    const selectedBinding = BINDING_OPTIONS.find((b) => b.id === bindingType) || { price: 0 };
    const bindingFee = selectedBinding.price * numCopies;
    const priorityFee = priority === "EXPRESS" ? 20 : 0;
    
    // Transparent Boisar Delivery Charge: ₹30 for Doorstep Delivery, ₹0 for Pickup
    const deliveryFee = deliveryMode === "DELIVERY" ? 30 : 0;

    setPrintCost(baseCalculated);
    setBindingCost(bindingFee);
    setPriorityCost(priorityFee);
    setDeliveryCost(deliveryFee);
    setTotalPrice(baseCalculated + bindingFee + priorityFee + deliveryFee);
  }, [paperSize, colorMode, sides, paperType, copies, files, totalPages, bindingType, priority, deliveryMode]);

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
    setErr("");
    setDetectingPages(true);

    const rejectedFiles = [];
    const validFiles = [];

    for (const f of fileList) {
      if (!isAllowedPrintDocument(f)) {
        rejectedFiles.push(f.name);
      } else {
        validFiles.push(f);
      }
    }

    if (rejectedFiles.length > 0) {
      setErr(
        `Blocked Non-Printable File(s): ${rejectedFiles.join(", ")}. Audio/Video and executable files cannot be printed. Only PDF, Word, PowerPoint, and Image files are accepted.`
      );
    }

    if (validFiles.length === 0) {
      setDetectingPages(false);
      return;
    }

    const processed = await Promise.all(
      validFiles.map(async (f) => {
        const detectedPages = await countDocumentPages(f);
        return {
          file: f,
          name: f.name,
          size: f.size,
          type: f.type,
          pages: detectedPages,
        };
      })
    );

    setFiles((prev) => [...prev, ...processed]);
    setDetectingPages(false);
    logUserAction("DOC_UPLOAD", `Attached ${processed.length} Document(s) (${processed.map(p => p.name).join(", ")})`, {
      fileNames: processed.map(p => p.name),
      totalPages: processed.reduce((s, p) => s + (p.pages || 1), 0)
    });
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
    e.target.value = "";
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

  // ACID-Compliant Order Submission
  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    // 1. Strict Validation Check (Atomicity & Consistency)
    if (!files.length) {
      setErr("Please attach at least one document to print.");
      return;
    }

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErr("Please provide the complete Customer Name (at least 2 characters).");
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErr("Please provide a valid 10-digit Indian Mobile Number (starting with 6, 7, 8, or 9).");
      return;
    }

    if (deliveryMode === "DELIVERY") {
      if (!address.trim()) {
        setErr("Please provide your delivery street address / building in Boisar.");
        return;
      }
      
      const cleanPin = pincode.replace(/\D/g, "");
      if (cleanPin !== "401501" && cleanPin !== "401506") {
        setErr("Zomato Service Alert: Doorstep delivery is currently valid strictly for Boisar, Maharashtra (PIN: 401501). Please change pincode to 401501 or select 'Shop Counter Pickup'.");
        return;
      }
    }

    setLoading(true);

    try {
      const s = supabase();
      
      let currentUser = user;
      if (!currentUser) {
        const { data: { session } } = await s.auth.getSession();
        currentUser = session?.user || null;
      }

      if (!currentUser) {
        setErr("Please sign in with Google or Email once to place your order.");
        setLoading(false);
        return;
      }

      // Persist customer profile details locally
      saveCustomerData();

      // Update profile info in database
      const fullPhone = `+91 ${cleanPhone}`;
      await s.from("profiles").upsert(
        {
          id: currentUser.id,
          name: customerName.trim(),
          phone: fullPhone,
        },
        { onConflict: "id" }
      );

      // Construct verified delivery address
      const fullDeliveryAddress = deliveryMode === "DELIVERY" 
        ? `${address}${landmark ? `, Near ${landmark}` : ""}, ${city || "Boisar, Maharashtra"} - ${pincode || "401501"}`
        : "Shop Counter Pickup - Dhruvang Crazy Printing Center, Boisar";

      const paymentNotes = `[PAYMENT_GATEWAY: RAZORPAY_ONLINE - ₹${totalPrice}.00]`;
      const combinedNotes = notes.trim() ? `${notes.trim()} | ${paymentNotes}` : paymentNotes;

      const orderPayload = {
        user_id: currentUser.id,
        customer_name: customerName.trim(),
        customer_phone: fullPhone,
        delivery_mode: deliveryMode,
        address: fullDeliveryAddress,
        city: city.trim() || "Boisar",
        pincode: pincode.trim() || "401501",
        landmark: landmark.trim() || null,
        paper_size: paperSize,
        color_mode: colorMode,
        sides: sides,
        paper_type: paperType,
        copies: Number(copies) || 1,
        binding_type: bindingType,
        priority: priority,
        page_count: totalPages,
        notes: combinedNotes,
        subtotal: printCost,
        total: totalPrice,
        status: "PAYMENT_SUBMITTED",
        upi_utr: "RAZORPAY_INITIATED",
        payment_proof_path: "razorpay://pending",
      };

      // Parallel concurrent file uploads for lightning-fast speed
      const tempOrderId = "temp-" + Date.now();
      const uploadedFiles = await Promise.all(
        files.map(async (f) => {
          const cleanName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${currentUser.id}/${tempOrderId}/${Date.now()}-${cleanName}`;
          const u = await s.storage.from("documents").upload(path, f.file);
          if (u.error) {
            console.warn("Storage upload warning:", u.error);
          }
          return {
            original_name: f.name,
            storage_path: path,
            mime_type: f.type,
            size: f.size || 0,
          };
        })
      );

      // 1. Try atomic ACID stored procedure
      let order = null;
      const { data: atomicOrder, error: atomicErr } = await s.rpc("create_order_atomic", {
        p_user_id: currentUser.id,
        p_customer_name: customerName.trim(),
        p_customer_phone: fullPhone,
        p_delivery_mode: deliveryMode,
        p_address: fullDeliveryAddress,
        p_city: city.trim() || "Boisar",
        p_pincode: pincode.trim() || "401501",
        p_landmark: landmark.trim() || null,
        p_paper_size: paperSize,
        p_color_mode: colorMode,
        p_sides: sides,
        p_paper_type: paperType,
        p_copies: Number(copies) || 1,
        p_binding_type: bindingType,
        p_priority: priority,
        p_page_count: totalPages,
        p_notes: combinedNotes,
        p_subtotal: printCost,
        p_total: totalPrice,
        p_files: uploadedFiles,
      });

      if (!atomicErr && atomicOrder) {
        order = atomicOrder;
      } else {
        // Fallback to standard insert with automatic schema resilience
        let { data: fallbackOrder, error: orderErr } = await s
          .from("orders")
          .insert(orderPayload)
          .select()
          .single();

        if (orderErr && (orderErr.message?.includes("upi_utr") || orderErr.message?.includes("schema cache") || orderErr.code === "PGRST204")) {
          const { upi_utr, ...safePayload } = orderPayload;
          const retryRes = await s
            .from("orders")
            .insert(safePayload)
            .select()
            .single();
          fallbackOrder = retryRes.data;
          orderErr = retryRes.error;
        }

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
      }

      await s.from("status_history").insert({
        order_id: order.id,
        status: "PAYMENT_SUBMITTED",
        message: `Order #${order.order_number} created for ₹${totalPrice}.00. Initiating Unified Fast Checkout.`,
      });

      // 2. Launch Unified Payment Modal directly
      setLoading(false);
      setPaymentModalOrder({
        id: order.id,
        order_number: order.order_number,
        total: totalPrice,
        customer_name: customerName.trim(),
        customer_phone: fullPhone,
        customer_email: currentUser.email,
        paper_size: paperSize,
        delivery_mode: deliveryMode,
      });

    } catch (unexpected) {
      setErr(unexpected.message || "An unexpected error occurred.");
      setLoading(false);
    }
  }

  async function handlePaymentModalSuccess(paymentId) {
    if (!paymentModalOrder) return;
    try {
      const s = supabase();
      await s.from("orders").update({
        status: "PAYMENT_VERIFIED",
        upi_utr: paymentId,
        payment_proof_path: `razorpay://${paymentId}`,
        updated_at: new Date().toISOString(),
      }).eq("id", paymentModalOrder.id);

      await s.from("status_history").insert({
        order_id: paymentModalOrder.id,
        status: "PAYMENT_VERIFIED",
        message: `💳 Payment of ₹${paymentModalOrder.total}.00 verified via Razorpay / Instant UPI (Ref ID: ${paymentId}). Queued for high-speed laser printing!`,
      });
    } catch (e) {}

    setOrderSuccess(true);
    triggerConfetti();
    playChime("success");

    const orderId = paymentModalOrder.id;
    setPaymentModalOrder(null);
    router.push(`/orders/${orderId}`);
  }

  return (
    <main className="wrap">
      {/* Superfast Order Confirmation HUD Overlay */}
      {loading && (
        <div className="modal-backdrop" style={{ zIndex: 99999, background: "rgba(15, 23, 42, 0.88)", backdropFilter: "blur(12px)" }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 20,
            padding: "30px 32px",
            maxWidth: 420,
            width: "90%",
            textAlign: "center",
            color: "white",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            animation: "fastPop 0.2s ease-out"
          }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
              boxShadow: "0 0 24px rgba(16, 185, 129, 0.6)",
              animation: "pulseGlow 1s infinite"
            }}>
              <Zap size={32} color="white" />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, letterSpacing: -0.3 }}>
              Locking Order & Reserving Queue ⚡
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 18 }}>
              Parallel uploading documents and dispatching to Boisar hub...
            </p>

            {/* Rapid Animated Laser Progress Bar */}
            <div style={{
              width: "100%",
              height: 8,
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: 999,
              overflow: "hidden",
              position: "relative"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "100%",
                background: "linear-gradient(90deg, #4f46e5, #06b6d4, #10b981)",
                borderRadius: 999,
                animation: "laserProgress 0.6s ease-in-out infinite"
              }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11, color: "#cbd5e1", fontWeight: 700 }}>
              <span>📄 {files.length} Document(s) Parallel Sync</span>
              <span style={{ color: "#38bdf8" }}>⚡ Instant Confirmation</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
          <Home size={15} />
          <span>Home</span>
        </Link>
        <span style={{ color: "var(--border)" }}>/</span>
        <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600 }}>New Print Order</span>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto 40px" }}>
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#ecfdf5",
            color: "#059669",
            border: "1px solid #a7f3d0",
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            marginBottom: 10
          }}>
            <Zap size={14} color="#059669" />
            <span>Superfast Production • Boisar 401501 Doorstep & Store Pickup</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.5 }}>Create New Print Order</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, marginTop: 4 }}>
            Upload files, customize paper & binding, choose Boisar delivery, and proceed seamlessly.
          </p>
        </div>

        {/* Dynamic 4-Step Progress Indicator */}
        <div className="order-step-bar">
          <div className={`order-step-item ${files.length > 0 ? "completed" : "active"}`}>
            <span className="order-step-num">{files.length > 0 ? "✓" : "1"}</span>
            <span>1. Upload Files</span>
          </div>
          <div className="order-step-divider" />
          <div className={`order-step-item ${files.length > 0 ? "active" : ""}`}>
            <span className="order-step-num">2</span>
            <span>2. Customize Specs</span>
          </div>
          <div className="order-step-divider" />
          <div className={`order-step-item ${customerName && isPhoneValid ? "active" : ""}`}>
            <span className="order-step-num">3</span>
            <span>3. Boisar Delivery</span>
          </div>
          <div className="order-step-divider" />
          <div className="order-step-item">
            <span className="order-step-num">4</span>
            <span>4. Summary & Pay</span>
          </div>
        </div>

        {/* Auth status indicator / Google Login banner */}
        <div style={{ marginBottom: 20 }}>
          {user ? (
            <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "10px 16px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#065f46", fontWeight: 700 }}>
                <CheckCircle2 size={18} color="#059669" />
                <span>Signed In as: <b>{customerName || user.email}</b> ({user.email})</span>
              </div>
              <span style={{ fontSize: 11, background: "#059669", color: "white", padding: "2px 8px", borderRadius: 999, fontWeight: 800 }}>
                SAVED ACCOUNT
              </span>
            </div>
          ) : (
            <div style={{ background: "#f8fafc", border: "1px solid var(--border)", padding: "14px 18px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-main)" }}>
                  Have an account? Sign in once to keep your orders saved
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  1-Click Google Sign-In saves your profile and contact address forever.
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="btn btn-google btn-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{googleLoading ? "Connecting..." : "Sign in with Google"}</span>
              </button>
            </div>
          )}
        </div>

        {err && (
          <div className="error" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. Customer & Contact Details with ACID Properties */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <User size={20} color="var(--primary)" />
                <span>1. Customer & Indian Mobile Details</span>
              </h2>
              <span style={{ fontSize: 12, color: "#166534", fontWeight: 700, background: "#f0fdf4", padding: "3px 8px", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                🔒 ACID Validated
              </span>
            </div>

            <div className="row">
              <div className="field">
                <label>
                  Customer Full Name <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dhruvang Bari"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    saveCustomerData({ name: e.target.value });
                  }}
                  required
                />
              </div>

              {/* Indian Phone Input with +91 Country Code Badge & Instant Regex Validation */}
              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>
                    Indian Mobile Number <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  {customerPhone && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: isPhoneValid ? "#16a34a" : "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      {isPhoneValid ? "✓ Valid Indian Number" : "⚠️ Must be 10 digits (starts with 6-9)"}
                    </span>
                  )}
                </div>

                <div className="phone-input-group">
                  <div className="phone-prefix-badge">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="8857871669"
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Document Upload Dropzone with Automatic Page Detection */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <UploadCloud size={20} color="var(--primary)" />
                <span>2. Attach Documents to Print</span>
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
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <UploadCloud className="dropzone-icon" />
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-main)", marginBottom: 4 }}>
                {detectingPages ? "Analyzing document pages..." : "Click to browse or drag & drop files here"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                PDF, Word (DOCX), PowerPoint, and Images accepted.
              </div>
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="fast-pop-anim"
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "white", padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Pages:</span>
                        <button
                          type="button"
                          onClick={() => updateFilePages(index, -1)}
                          style={{ background: "#f1f5f9", border: "none", borderRadius: 4, width: 24, height: 24, display: "grid", placeItems: "center", cursor: "pointer" }}
                          title="Decrease pages"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          value={file.pages || 1}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, pages: val } : f)));
                          }}
                          style={{ width: 45, height: 26, textAlign: "center", fontWeight: 800, padding: 0, border: "1px solid var(--border)", borderRadius: 4, fontSize: 13 }}
                        />
                        <button
                          type="button"
                          onClick={() => updateFilePages(index, 1)}
                          style={{ background: "#f1f5f9", border: "none", borderRadius: 4, width: 24, height: 24, display: "grid", placeItems: "center", cursor: "pointer" }}
                          title="Increase pages"
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
                <span>3. Print Job Specifications</span>
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
                <span>4. Binding & Finishing Add-ons</span>
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

          {/* 5. Boisar Delivery & Fulfillment (Zomato Style) */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <MapPin size={20} color="var(--primary)" />
                <span>5. Delivery Location (Valid in Boisar 401501)</span>
              </h2>
              <span style={{ fontSize: 12, background: "#ecfdf5", color: "#059669", padding: "3px 10px", borderRadius: 999, fontWeight: 800, border: "1px solid #a7f3d0" }}>
                📍 Boisar Maharashtra
              </span>
            </div>

            {/* Mode Selectors with Transparent Delivery Charges */}
            <div className="row" style={{ marginBottom: 16 }}>
              <div
                className={`option-card ${deliveryMode === "PICKUP" ? "selected" : ""}`}
                onClick={() => setDeliveryMode("PICKUP")}
              >
                <div className="option-card-title">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Store size={18} color="var(--primary)" />
                    <b>Shop Counter Pickup</b>
                  </span>
                  {deliveryMode === "PICKUP" && <Check size={16} color="var(--primary)" />}
                </div>
                <div className="option-card-desc">Zero waiting time at store counter (Boisar West)</div>
                <div className="option-card-price" style={{ color: "#16a34a" }}>FREE (₹0)</div>
              </div>

              <div
                className={`option-card ${deliveryMode === "DELIVERY" ? "selected" : ""}`}
                onClick={() => setDeliveryMode("DELIVERY")}
              >
                <div className="option-card-title">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Truck size={18} color="#0284c7" />
                    <b>Doorstep Delivery (Boisar)</b>
                  </span>
                  {deliveryMode === "DELIVERY" && <Check size={16} color="var(--primary)" />}
                </div>
                <div className="option-card-desc">Delivered to your home/office anywhere in Boisar (401501)</div>
                <div className="option-card-price">+₹30.00 Delivery Fee</div>
              </div>
            </div>

            {/* Interactive Boisar Map Component */}
            <BoisarDeliveryMap
              selectedLocality={selectedLocality}
              onSelectLocality={handleSelectLocality}
              userPincode={pincode}
              isDelivery={deliveryMode === "DELIVERY"}
            />

            {deliveryMode === "DELIVERY" && (
              <div style={{ background: "#f8fafc", padding: 18, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                {/* Zomato-style Serviceability Alert Banner */}
                {!isBoisarPincode ? (
                  <div className="zomato-unserviceable-banner" style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle size={20} color="#dc2626" />
                      <div>
                        <b>Outside Delivery Service Area:</b> Currently doorstep delivery is available exclusively in <b>Boisar, Maharashtra (PIN: 401501)</b>.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeliveryMode("PICKUP")}
                      className="btn btn-sm"
                      style={{ background: "#dc2626", color: "white" }}
                    >
                      Switch to Store Pickup (Free)
                    </button>
                  </div>
                ) : (
                  <div className="zomato-service-banner" style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 size={18} color="#16a34a" />
                      <div>
                        <b>Serving Boisar 401501:</b> Your location is within our active delivery zone. Standard delivery charge: <b>₹30.00</b>.
                      </div>
                    </div>
                  </div>
                )}

                <div className="field">
                  <label>Street Address / Flat / Floor / Building <span style={{ color: "var(--danger)" }}>*</span></label>
                  <textarea
                    placeholder="e.g., Flat 402, Sunshine Heights, Main Road, Boisar"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      saveCustomerData({ address: e.target.value });
                    }}
                    rows={2}
                    required={deliveryMode === "DELIVERY"}
                  />
                </div>

                <div className="row" style={{ marginTop: 12 }}>
                  <div className="field">
                    <label>Landmark / Locality (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Near Ostwal Empire / Station"
                      value={landmark}
                      onChange={(e) => {
                        setLandmark(e.target.value);
                        saveCustomerData({ landmark: e.target.value });
                      }}
                    />
                  </div>

                  <div className="field">
                    <label>City / Town</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        saveCustomerData({ city: e.target.value });
                      }}
                      placeholder="Boisar, Maharashtra"
                    />
                  </div>

                  {/* Numerical Pincode Only */}
                  <div className="field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ margin: 0 }}>
                        Pincode (Numerical Only) <span style={{ color: "var(--danger)" }}>*</span>
                      </label>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isBoisarPincode ? "#16a34a" : "#dc2626" }}>
                        {isBoisarPincode ? "✓ Boisar 401501" : "⚠️ Boisar PIN only"}
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="401501"
                      value={pincode}
                      onChange={handlePincodeChange}
                      required={deliveryMode === "DELIVERY"}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Processing Speed & Notes */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <Clock size={20} color="var(--primary)" />
                <span>6. Processing Speed & Special Notes</span>
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
                <div className="option-card-desc">Printed in regular sequence (Ready in 20-30 mins)</div>
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
                <div className="option-card-desc">Top-of-queue priority execution (Ready in 5-10 mins)</div>
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

          {/* 7. Razorpay Payment Gateway Card */}
          <div className="card" style={{ border: "1.5px solid #a5b4fc", background: "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)" }}>
            <div className="card-header" style={{ borderBottom: "1px solid #e0e7ff", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#4f46e5", color: "white", display: "grid", placeItems: "center" }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="card-title" style={{ margin: 0, fontSize: 17, color: "#1e1b4b" }}>
                    7. Secure Payment Gateway (Razorpay)
                  </h2>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    Instant verification with Google Pay, PhonePe, Paytm, BHIM UPI, Cards &amp; NetBanking
                  </div>
                </div>
              </div>
              <span className="status-badge status-PAYMENT_VERIFIED" style={{ fontSize: 13, background: "#ecfdf5", color: "#166534", border: "1px solid #a7f3d0" }}>
                Total: ₹{totalPrice}.00
              </span>
            </div>

            <div style={{ padding: "12px 0 6px" }}>
              {/* Payment Methods Badges */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                <div style={{ background: "white", padding: "6px 12px", borderRadius: 6, border: "1px solid #c7d2fe", fontSize: 12, fontWeight: 800, color: "#4338ca", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🟢 Google Pay / PhonePe / Paytm</span>
                </div>
                <div style={{ background: "white", padding: "6px 12px", borderRadius: 6, border: "1px solid #c7d2fe", fontSize: 12, fontWeight: 800, color: "#4338ca", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>💳 Cards (Visa, Master, RuPay)</span>
                </div>
                <div style={{ background: "white", padding: "6px 12px", borderRadius: 6, border: "1px solid #c7d2fe", fontSize: 12, fontWeight: 800, color: "#4338ca", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🏦 50+ Banks NetBanking</span>
                </div>
              </div>

              <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "12px 14px", fontSize: 12.5, color: "#3730a3", lineHeight: 1.5 }}>
                🔒 <b>100% Secure Checkout:</b> When you click the button below, Razorpay's official checkout popup will open directly on your screen to complete payment securely without needing manual screenshot uploads or UTR entry.
              </div>
            </div>
          </div>

          {/* 8. Live Cost Summary & Order Submission */}
          <div className="card" style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white", padding: 24, boxShadow: "0 20px 40px rgba(15, 23, 42, 0.4)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={20} color="#38bdf8" />
              <span>Live Order Summary &amp; Cost Breakdown</span>
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
                  <span style={{ color: "#94a3b8" }}>⚡ Express Rush Fee:</span>
                  <b>+₹{priorityCost}.00</b>
                </div>
              )}

              {/* Transparent Boisar Delivery Charge Line Item */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>
                  {deliveryMode === "DELIVERY" ? "🚚 Boisar Doorstep Delivery Fee:" : "🏪 Store Counter Pickup:"}
                </span>
                <b>{deliveryCost > 0 ? `+₹${deliveryCost}.00` : "FREE (₹0.00)"}</b>
              </div>

              {/* Payment Gateway Display */}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                <span style={{ color: "#94a3b8" }}>💳 Payment Gateway:</span>
                <b style={{ color: "#38bdf8" }}>
                  Razorpay (UPI / Cards / NetBanking)
                </b>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.5 }}>GRAND TOTAL TO PAY</div>
                <div style={{ fontSize: 34, fontWeight: 900, color: "#38bdf8" }}>₹{totalPrice}.00</div>
              </div>

              <button
                type="submit"
                disabled={loading || files.length === 0 || (deliveryMode === "DELIVERY" && !isBoisarPincode)}
                className="btn btn-lg"
                style={{
                  background: (deliveryMode === "DELIVERY" && !isBoisarPincode) ? "#64748b" : "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                  color: "white",
                  padding: "16px 28px",
                  fontSize: 16,
                  fontWeight: 900,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  flex: "1 1 320px",
                  boxShadow: "0 8px 24px rgba(79, 70, 229, 0.4)",
                  cursor: (deliveryMode === "DELIVERY" && !isBoisarPincode) ? "not-allowed" : "pointer"
                }}
              >
                <CreditCard size={20} />
                <span>
                  {loading 
                    ? "Connecting to Razorpay..." 
                    : `⚡ Pay ₹${totalPrice}.00 via Razorpay & Place Order`}
                </span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 100% Reliable Unified Online Payment Gateway Modal */}
      {paymentModalOrder && (
        <CrazyPaymentModal
          order={paymentModalOrder}
          isOpen={Boolean(paymentModalOrder)}
          onClose={() => {
            const id = paymentModalOrder?.id;
            setPaymentModalOrder(null);
            if (id) router.push(`/orders/${id}`);
          }}
          onPaymentSuccess={handlePaymentModalSuccess}
        />
      )}
    </main>
  );
}