"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function Detail() {
  const p = useParams();
  const [o, setO] = useState(null);
  const [proof, setProof] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase()
        .from("orders")
        .select("*,order_files(*),status_history(*)")
        .eq("id", p.id)
        .single();
      setO(data);
    })();
  }, [p.id]);

  async function pay(e) {
    e.preventDefault();
    if (!proof) return;
    setLoading(true);
    setMsg("");

    try {
      const s = supabase();
      const path =
        "payment/" +
        p.id +
        "-" +
        Date.now() +
        "-" +
        proof.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const u = await s.storage.from("payment-proofs").upload(path, proof);
      if (u.error) {
        setMsg("Payment upload error: " + u.error.message);
        setLoading(false);
        return;
      }

      const { error } = await s
        .from("orders")
        .update({
          payment_proof_path: path,
          status: "PAYMENT_SUBMITTED",
        })
        .eq("id", p.id);

      if (error) {
        setMsg("Error updating status: " + error.message);
        setLoading(false);
        return;
      }

      setMsg("Payment screenshot submitted! Verification in progress.");
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      setMsg(err.message || "Upload failed");
      setLoading(false);
    }
  }

  if (!o)
    return (
      <main className="wrap">
        <div className="card">Loading order details...</div>
      </main>
    );

  return (
    <main className="wrap">
      <div className="card">
        <h2>{o.order_number}</h2>
        <p className="price">₹{o.total}</p>
        <p>
          {o.paper_size} • {o.color_mode} • {o.sides} • {o.copies} copies
        </p>
        <h3>
          Status: <span className="status">{o.status?.replaceAll("_", " ")}</span>
        </h3>
        <div className="timeline">
          {(o.status_history || [])
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map((h) => (
              <div className="event" key={h.id}>
                <b>{h.status?.replaceAll("_", " ")}</b>
                <div>{new Date(h.created_at).toLocaleString()}</div>
                <div>{h.message}</div>
              </div>
            ))}
        </div>
        {![
          "PAYMENT_VERIFIED",
          "PRINTING",
          "QUALITY_CHECK",
          "READY",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
        ].includes(o.status) && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3>UPI Payment</h3>
            <div className="qr">
              UPI QR
              <br />
              <small>{process.env.NEXT_PUBLIC_UPI_ID || "YOUR UPI ID"}</small>
            </div>
            <form onSubmit={pay} style={{ marginTop: 15 }}>
              <div className="field">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProof(e.target.files[0])}
                  required
                />
              </div>
              <button className="btn" disabled={loading}>
                {loading ? "Uploading Screenshot..." : "Upload Payment Screenshot"}
              </button>
            </form>
            {msg && <p className={msg.includes("error") || msg.includes("Error") ? "error" : "success"}>{msg}</p>}
          </div>
        )}
      </div>
    </main>
  );
}