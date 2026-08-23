"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import FormattedDate from "../../components/FormattedDate";
import { 
  FileText, 
  PlusCircle, 
  Eye, 
  ShoppingBag, 
  ArrowRight,
  Clock
} from "lucide-react";

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const s = supabase();
        const { data: { user } } = await s.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error } = await s
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading orders:", error);
        } else {
          setOrders(data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [router]);

  if (loading) {
    return (
      <main className="wrap">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          Loading your print orders...
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>My Print Orders</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Track and view history of your print requests
          </p>
        </div>

        <Link href="/order" className="btn">
          <PlusCircle size={16} />
          <span>New Print Order</span>
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <ShoppingBag size={30} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Print Orders Yet</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 400, margin: "0 auto 24px" }}>
            You haven't placed any print jobs yet. Upload your first PDF or document to get started!
          </p>
          <Link href="/order" className="btn btn-lg">
            <PlusCircle size={18} />
            <span>Create Your First Order</span>
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container" style={{ border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Date</th>
                  <th>Specifications</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight: 800 }}>{o.order_number}</div>
                    </td>

                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      <FormattedDate date={o.created_at} />
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>{o.paper_size} • {o.color_mode}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {o.copies} copies • {o.sides} sided
                      </div>
                    </td>

                    <td style={{ fontWeight: 800, fontSize: 15 }}>
                      ₹{o.total}
                    </td>

                    <td>
                      <span className={`status-badge status-${o.status}`}>
                        {o.status?.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td>
                      <Link href={`/orders/${o.id}`} className="btn btn-secondary btn-sm">
                        <Eye size={14} />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}