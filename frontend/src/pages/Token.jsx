import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { io } from "socket.io-client";
import { CheckCircle2, Printer, ChefHat, BellRing, Wallet, Check } from "lucide-react";
import { useApp } from "../context.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.3, 0.6].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.25);
    });
  } catch { /* sound is optional */ }
}

export default function Token() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { setCart, setOrderType } = useApp();

  // Keep the order in sessionStorage so a page refresh doesn't lose the token
  const saved = state || JSON.parse(sessionStorage.getItem("order") || "null");
  const [order, setOrder] = useState(saved);
  const [live, setLive] = useState(false);
  const prevStatus = useRef(saved?.status);
  const id = saved?.id;

  const finish = () => {
    sessionStorage.removeItem("order");
    setOrderType(null);
    nav("/", { replace: true });
  };

  useEffect(() => {
    setCart([]);
    if (state) sessionStorage.setItem("order", JSON.stringify(state));
  }, []);

  // Live updates: socket event + a 5 second backup refresh
  useEffect(() => {
    if (!id) return;
    const load = () =>
      fetch(`${API}/orders/${id}`)
        .then((r) => r.json())
        .then((d) => { if (d.id) setOrder((o) => ({ ...o, ...d })); })
        .catch(() => {});
    const socket = io(API);
    socket.on("connect", () => setLive(true));
    socket.on("disconnect", () => setLive(false));
    socket.on("orders_changed", load);
    const poll = setInterval(load, 5000);
    return () => { socket.disconnect(); clearInterval(poll); };
  }, [id]);

  // Beep when the order becomes ready
  useEffect(() => {
    if (order?.status === "ready" && prevStatus.current !== "ready") beep();
    prevStatus.current = order?.status;
  }, [order?.status]);

  // Return to the welcome screen automatically
  useEffect(() => {
    if (order?.status !== "ready" && order?.status !== "completed") return;
    const t = setTimeout(finish, order.status === "completed" ? 10000 : 90000);
    return () => clearTimeout(t);
  }, [order?.status]);

  if (!order) return <Navigate to="/" replace />;

  const counter = order.payment.method === "counter";
  const steps = [
    ...(counter ? [{ key: "awaiting_payment", label: "Pay at counter", Icon: Wallet }] : []),
    { key: "preparing", label: "Preparing", Icon: ChefHat },
    { key: "ready", label: "Ready", Icon: BellRing },
  ];
  const cur = order.status === "completed" ? steps.length : steps.findIndex((s) => s.key === order.status);

  const HEAD = {
    awaiting_payment: "Almost done!",
    preparing: "Order placed!",
    ready: "Your order is ready!",
    completed: "Enjoy your meal!",
  };
  const SUB = {
    awaiting_payment: `Pay ₹${order.total} at the counter to start your order.`,
    preparing: order.ahead > 0
      ? `${order.ahead} order${order.ahead > 1 ? "s" : ""} ahead of you. Keep this screen open.`
      : "Your food is being prepared. Keep this screen open.",
    ready: "Please collect it from the counter.",
    completed: "Thank you! Returning to the start screen...",
  };

  return (
    <div className="k-page">
      <div className="k-center">
        <CheckCircle2 key={order.status} className="k-tick" size={72} color={order.status === "ready" ? "#2a9d78" : "#d9a441"} />
        <h2 className="k-q" key={"h" + order.status}>{HEAD[order.status]}</h2>

        <div className="tr-track">
          {steps.map((s, i) => {
            const done = i < cur || (s.key === "ready" && cur >= i);
            const now = !done && i === cur;
            return (
              <div key={s.key} className={"tr-node" + (done ? " done" : now ? " now" : "")}>
                <span className="tr-dot">{done ? <Check size={26} /> : <s.Icon size={24} />}</span>
                {s.label}
              </div>
            );
          })}
        </div>

        <div className={"k-ticket" + (order.status === "ready" ? " tr-glow" : "")}>
          <small>YOUR TOKEN</small>
          <div className={"k-token" + (order.status === "ready" ? " tr-green" : "")}>{order.token}</div>
          <p key={order.status + order.ahead} className="tr-sub">{SUB[order.status]}</p>

          <div className="k-ticket-list">
            {order.items.map((l, i) => (
              <div key={i}>
                <span>{l.qty} × {l.name}{l.options.length ? ` (${l.options.join(", ")})` : ""}</span>
                <b>₹{l.unit * l.qty}</b>
              </div>
            ))}
          </div>
          <div className="k-ticket-total"><span>Total</span><b>₹{order.total}</b></div>
          <small>
            {order.type === "dine-in" ? "Dine-In" : "Takeaway"} · {order.payment.method.toUpperCase()} ·{" "}
            {order.payment.status === "paid" ? "PAID" : "PAY AT COUNTER"} · {order.time}
          </small>
        </div>

        <div className="k-actions no-print">
          <span className={"tr-live" + (live ? " on" : "")}>{live ? "● Live updates" : "○ Reconnecting..."}</span>
          <button className="k-ghost" onClick={() => window.print()}><Printer size={18} /> Print slip</button>
          <button className="k-primary" onClick={finish}>New order</button>
        </div>
      </div>
    </div>
  );
}