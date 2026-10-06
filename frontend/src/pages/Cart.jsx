import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useApp } from "../context.jsx";

export default function Cart() {
  const nav = useNavigate();
  const { cart, setCart, orderType } = useApp();
  const total = cart.reduce((s, c) => s + c.unit * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  const change = (key, d) =>
    setCart((p) => p.map((c) => (c.key === key ? { ...c, qty: c.qty + d } : c)).filter((c) => c.qty > 0));
  const remove = (key) => setCart((p) => p.filter((c) => c.key !== key));

  return (
    <div className="k-page">
      <header className="k-head">
        <button className="k-back" onClick={() => nav("/menu")}><ArrowLeft /></button>
        <h1>Your Order</h1>
        <span className="k-badge">{orderType === "dine-in" ? "Dine-In" : "Takeaway"}</span>
      </header>

      {cart.length === 0 ? (
        <div className="k-empty">
          <ShoppingBag size={72} strokeWidth={1.2} />
          <h2>Your cart is empty</h2>
          <button className="k-primary" onClick={() => nav("/menu")}>Browse menu</button>
        </div>
      ) : (
        <div className="k-cartwrap">
          <div className="k-lines">
            {cart.map((c, i) => (
              <div key={c.key} className="k-line" style={{ "--i": i }}>
                <div className="k-line-photo">
                  {c.image_url ? <img src={c.image_url} alt={c.name} /> : c.emoji}
                </div>
                <div className="k-line-info">
                  <h3>{c.name}</h3>
                  {c.options.length > 0 && <p>{c.options.join(", ")}</p>}
                  <span className="k-price">₹{c.unit}</span>
                </div>
                <div className="k-step">
                  <button onClick={() => change(c.key, -1)}><Minus size={18} /></button>
                  <b key={c.qty}>{c.qty}</b>
                  <button onClick={() => change(c.key, 1)}><Plus size={18} /></button>
                </div>
                <div className="k-line-total">₹{c.unit * c.qty}</div>
                <button className="k-trash" onClick={() => remove(c.key)}><Trash2 size={20} /></button>
              </div>
            ))}
          </div>

          <aside className="k-summary">
            <h2>Summary</h2>
            <div className="k-sum-row"><span>Items</span><b>{count}</b></div>
            <div className="k-sum-row"><span>Order type</span><b>{orderType === "dine-in" ? "Dine-In" : "Takeaway"}</b></div>
            <div className="k-sum-total"><span>Total</span><b>₹{total}</b></div>
            <button className="k-primary wide" onClick={() => nav("/payment")}>
              Proceed to payment
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}