"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Order() {
  const r = useRouter();
  const [files, setFiles] = useState([]);
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

  useEffect(() => {
    let m =
      {
        A4: 1,
        A5: 0.8,
        A3: 1.8,
        Legal: 1.2,
        Letter: 1,
        Custom: 1.5,
      }[v.paper_size] || 1;
    let b = v.color_mode === "COLOR" ? 5 : 1.5;
    setPrice(
      Math.max(
        5,
        Math.ceil(
          b *
            m *
            (v.sides === "DOUBLE" ? 0.9 : 1) *
            Number(v.copies || 1) *
            Math.max(1, files.length)
        )
      )
    );
  }, [v, files]);

  async function go(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const s = supabase();
      const {
        data: { user },
        error: userError,
      } = await s.auth.getUser();

      if (userError || !user) {
        setErr("Please log in first to create an order.");
        r.push("/login");
        return;
      }

      if (!files.length) {
        setErr("Please upload at least one document.");
        setLoading(false);
        return;
      }

      // Ensure profile exists
      await s.from("profiles").upsert(
        {
          id: user.id,
          name: user.user_metadata?.name || user.email || "Customer",
          phone: user.user_metadata?.phone || null,
        },
        { onConflict: "id" }
      );

      // Create Order
      const { data: o, error: orderErr } = await s
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

      // Upload Documents
      for (const f of files) {
        const path =
          user.id +
          "/" +
          o.id +
          "/" +
          Date.now() +
          "-" +
          f.name.replace(/[^a-zA-Z0-9._-]/g, "_");

        let u = await s.storage.from("documents").upload(path, f);
        if (u.error) {
          setErr("File upload error: " + u.error.message);
          setLoading(false);
          return;
        }

        const { error: fileDbErr } = await s.from("order_files").insert({
          order_id: o.id,
          original_name: f.name,
          storage_path: path,
          mime_type: f.type,
          size: f.size,
        });

        if (fileDbErr) {
          console.warn("Order file record warning:", fileDbErr.message);
        }
      }

      r.push("/orders/" + o.id);
    } catch (unexpected) {
      setErr(unexpected.message || "An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <div className="card">
        <h2>New Print Order</h2>
        <form onSubmit={go}>
          <div className="field">
            <label>Documents</label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx"
              onChange={(e) => setFiles([...e.target.files])}
              required
            />
          </div>
          <div className="row">
            {[
              ["paper_size", "Paper Size", ["A4", "A5", "A3", "Legal", "Letter", "Custom"]],
              ["color_mode", "Colour", ["BW", "COLOR"]],
              ["sides", "Sides", ["SINGLE", "DOUBLE"]],
              ["paper_type", "Paper Type", ["NORMAL", "PREMIUM", "GLOSSY"]],
              ["delivery_mode", "Delivery", ["PICKUP", "DELIVERY"]],
            ].map(([k, l, a]) => (
              <div className="field" key={k}>
                <label>{l}</label>
                <select
                  value={v[k]}
                  onChange={(e) => setV({ ...v, [k]: e.target.value })}
                >
                  {a.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="field">
              <label>Copies</label>
              <input
                type="number"
                min="1"
                value={v.copies}
                onChange={(e) => setV({ ...v, copies: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Delivery Address</label>
            <textarea
              value={v.address}
              onChange={(e) => setV({ ...v, address: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              value={v.notes}
              onChange={(e) => setV({ ...v, notes: e.target.value })}
            />
          </div>
          <p className="price">₹{price}</p>
          {err && <p className="error">{err}</p>}
          <button className="btn" disabled={loading}>
            {loading ? "Creating Order..." : "Create Order"}
          </button>
        </form>
      </div>
    </main>
  );
}