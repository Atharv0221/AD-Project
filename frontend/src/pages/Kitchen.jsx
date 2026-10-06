import { useEffect, useState } from "react";
import { ChefHat, Clock, Wifi, WifiOff } from "lucide-react";
import { useOrders, API } from "../useOrders.js";

const COLUMNS = [
  { status: "awaiting_payment", title: "Awaiting payment", action: "Payment received", color: "#d9a441" },
  { status: "preparing", title: "Preparing", action: "Mark ready", color: "#e2552b" },
  { status: "ready", title: "Ready", action: "Collected", color: "#2a9d78" },
];

export default function Kitchen() {
  const { orders, live, reload } = useOrders();
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const minutes = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));

  const act = async (o) => {
    const url =
      o.status === "awaiting_payment"
        ? [`${API}/orders/${o.id}/confirm-payment`, { method: "POST" }]
        : [
            `${API}/orders/${o.id}/status`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: o.status === "preparing" ? "ready" : "completed" }),
            },
          ];
    await fetch(url[0], url[1]);
    reload();
  };

  return (
    <div className="kt-page">
      <header className="kt-head">
        <ChefHat size={34} />
        <h1>Kitchen</h1>
        <span className={"kt-live" + (live ? " on" : "")}>
          {live ? <Wifi size={16} /> : <WifiOff size={16} />} {live ? "Live" : "Offline"}
        </span>
      </header>

      <div className="kt-cols">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="kt-col">
              <h2 style={{ "--c": col.color }}>
                {col.title} <b>{list.length}</b>
              </h2>
              {list.length === 0 && <p className="kt-none">No orders</p>}
              {list.map((o) => {
                const m = minutes(o.created_at);
                return (
                  <div key={o.id} className="kt-order" style={{ "--c": col.color }}>
                    <div className="kt-top">
                      <span className="kt-token">#{o.token}</span>
                      <span className="kt-type">{o.type === "dine-in" ? "Dine-In" : "Takeaway"}</span>
                      <span className={"kt-time" + (m >= 10 ? " late" : "")}>
                        <Clock size={14} /> {m} min
                      </span>
                    </div>
                    <ul>
                      {o.items.map((l, i) => (
                        <li key={i}>
                          <b>{l.qty}×</b> {l.name}
                          {l.options.length > 0 && <em> ({l.options.join(", ")})</em>}
                        </li>
                      ))}
                    </ul>
                    {o.status === "awaiting_payment" && <p className="kt-collect">Collect ₹{o.total} cash</p>}
                    <button onClick={() => act(o)}>{col.action}</button>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}