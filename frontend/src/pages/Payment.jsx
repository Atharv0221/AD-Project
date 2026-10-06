import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone, CreditCard, Store, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useApp } from "../context.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const METHODS = [
  { id: "upi", label: "UPI", sub: "Scan and pay", Icon: Smartphone, tint: "#e8f1fb" },
  { id: "card", label: "Card", sub: "Debit / Credit", Icon: CreditCard, tint: "#f1ebfd" },
  { id: "counter", label: "Pay at counter", sub: "Get a slip, pay cash", Icon: Store, tint: "#dff7ee" },
];

export default function Payment() {
  const nav = useNavigate();
  const { cart, orderType } = useApp();
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const total = cart.reduce((s, c) => s + c.unit * c.qty, 0);

  if (cart.length === 0) {
    return (
      <div className="k-page"><div className="k-empty">
        <h2>Nothing to pay for</h2>
        <button className="k-primary" onClick={() => nav("/menu")}>Back to menu</button>
      </div></div>
    );
  }

  const pay = async () => {
    setBusy(true); setError("");
    try {
      if (method === "upi") { setMsg("Verifying payment..."); await wait(1800); }
      if (method === "card") { setMsg("Reading card..."); await wait(2000); }
      if (method === "counter") { setMsg("Creating your order..."); await wait(600); }

      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: orderType || "takeaway",
          method,
          items: cart.map((c) => ({ name: c.name, options: c.options, qty: c.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");
      nav("/token", { state: data, replace: true });
    } catch (e) {
      setError(e.message === "Failed to fetch" ? "Cannot reach the server. Is Flask running?" : e.message);
      setBusy(false);
    }
  };

  return (
    <div className="k-page">
      <header className="k-head">
        <button className="k-back" disabled={busy} onClick={() => nav("/cart")}><ArrowLeft /></button>
        <h1>Payment</h1>
        <span className="k-badge">Total ₹{total}</span>
      </header>

      <div className="k-paywrap">
        <div className="k-methods">
          {METHODS.map(({ id, label, sub, Icon, tint }) => (
            <button key={id} disabled={busy} className={"k-method" + (method === id ? " on" : "")} onClick={() => setMethod(id)}>
              <span className="k-method-icon" style={{ background: tint }}><Icon size={30} /></span>
              <span><b>{label}</b><small>{sub}</small></span>
            </button>
          ))}
        </div>

        <div className="k-paybox" key={method}>
          {method === "upi" && (
            <>
              <div className="k-qr"><QRCodeSVG value={`DEMO-CANTEEN-PAYMENT-${total}`} size={200} /></div>
              <p>Scan with any UPI app and pay <b>₹{total}</b></p>
              <small>Demo mode: press the button below to simulate a successful payment</small>
            </>
          )}
          {method === "card" && (
            <>
              <CreditCard size={90} strokeWidth={1.2} color="#6d4fd8" />
              <p>Insert or tap your card on the terminal</p>
              <small>Demo mode: press the button below to simulate the card payment</small>
            </>
          )}
          {method === "counter" && (
            <>
              <Store size={90} strokeWidth={1.2} color="#2a9d78" />
              <p>You will get a token. Pay <b>₹{total}</b> at the counter.</p>
              <small>Your order starts preparing once the cashier confirms payment</small>
            </>
          )}

          {error && <p className="k-error" style={{ padding: 0 }}>{error}</p>}

          <button className="k-primary wide" disabled={busy} onClick={pay}>
            {busy ? <span className="k-spin"><Loader2 size={20} /> {msg}</span>
                  : method === "counter" ? "Place order" : `I have paid ₹${total}`}
          </button>
        </div>
      </div>
    </div>
  );
}