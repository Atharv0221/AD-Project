import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, X, Check } from "lucide-react";
import { useApp } from "../context.jsx";
import { T } from "../i18n.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";const CAT_ICON = { "Hot Drinks": "☕", "Cold Drinks": "🥤", Breakfast: "🍳", Lunch: "🍛" };

export const lineKey = (name, opts) => name + "|" + [...opts].sort().join(",");

export default function Menu() {
  const nav = useNavigate();
  const { lang, cart, setCart, orderType } = useApp();
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null); // item being customised
  const t = T[lang];

  useEffect(() => {
    fetch(`${API}/menu`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        if (data.length) setCategory(data[0].category);
        setLoading(false);
      })
      .catch(() => { setError("Cannot reach the server. Is Flask running?"); setLoading(false); });
  }, []);

  const categories = [...new Set(items.map((i) => i.category))];
  const shown = items.filter((i) => i.category === category);
  const total = cart.reduce((s, c) => s + c.unit * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const plainQty = (name) => cart.find((c) => c.key === lineKey(name, []))?.qty || 0;
  const totalQty = (name) => cart.filter((c) => c.name === name).reduce((s, c) => s + c.qty, 0);

  const addLine = (item, opts, extra, qty) =>
    setCart((prev) => {
      const key = lineKey(item.name, opts);
      const unit = item.price + extra;
      const found = prev.find((c) => c.key === key);
      if (found) return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + qty } : c));
      return [...prev, { key, name: item.name, options: opts, unit, qty, image_url: item.image_url, emoji: item.emoji }];
    });

  const changePlain = (item, delta) =>
    setCart((prev) => {
      const key = lineKey(item.name, []);
      return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0);
    });

  const openSheet = (item) => setSheet(item);

  return (
    <div className="k-page">
      <header className="k-head">
        <button className="k-back" onClick={() => nav("/dining")}><ArrowLeft /></button>
        <h1>{t.menu}</h1>
        <span className="k-badge">{orderType === "dine-in" ? t.dineIn : t.takeaway}</span>
      </header>

      {error && <p className="k-error">{error}</p>}

      <div className="k-menu">
        <nav className="k-side">
          {categories.map((c) => (
            <button key={c} className={"k-cat" + (c === category ? " on" : "")} onClick={() => setCategory(c)}>
              <span>{CAT_ICON[c] || "🍽️"}</span>{c}
            </button>
          ))}
        </nav>

        <div className="k-grid" key={category}>
          {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="k-skel" />)}
          {shown.map((item, idx) => {
            const q = totalQty(item.name);
            const pq = plainQty(item.name);
            const hasOpts = (item.customizations || []).length > 0;
            return (
              <div key={item.name} className="k-item" style={{ "--i": idx }}>
                <div className="k-photo" onClick={() => openSheet(item)} style={{ cursor: "pointer" }}>
                  {item.image_url ? <img src={item.image_url} alt={item.name} /> : item.emoji}
                  {q > 0 && <span className="k-qty-badge">{q}</span>}
                </div>
                <h3>{item.name}</h3>
                {hasOpts && <p className="k-hint">Customisable</p>}
                <div className="k-row">
                  <span className="k-price">₹{item.price}</span>
                  {pq === 0 ? (
                    <button className="k-add" onClick={() => (hasOpts ? openSheet(item) : addLine(item, [], 0, 1))}>
                      <Plus size={22} />
                    </button>
                  ) : (
                    <div className="k-step">
                      <button onClick={() => changePlain(item, -1)}><Minus size={18} /></button>
                      <b key={pq}>{pq}</b>
                      <button onClick={() => changePlain(item, 1)}><Plus size={18} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={"k-cart" + (count > 0 ? " show" : "")}>
        <span><b key={count} className="k-bump">{count}</b> {t.items} · ₹{total}</span>
        <button onClick={() => nav("/cart")}>{t.view}</button>
      </div>

      {sheet && (
        <Sheet
          item={sheet}
          onClose={() => setSheet(null)}
          onAdd={(opts, extra, qty) => { addLine(sheet, opts, extra, qty); setSheet(null); }}
        />
      )}
    </div>
  );
}

function Sheet({ item, onClose, onAdd }) {
  const [picked, setPicked] = useState([]);
  const [qty, setQty] = useState(1);
  const custom = item.customizations || [];

  const toggle = (name) =>
    setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));

  const extra = custom.filter((c) => picked.includes(c.name)).reduce((s, c) => s + c.price, 0);
  const unit = item.price + extra;

  return (
    <div className="k-overlay" onClick={onClose}>
      <div className="k-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="k-close" onClick={onClose}><X size={22} /></button>
        <div className="k-sheet-top">
          <div className="k-sheet-photo">
            {item.image_url ? <img src={item.image_url} alt={item.name} /> : item.emoji}
          </div>
          <div>
            <h2>{item.name}</h2>
            <p className="k-price">₹{item.price}</p>
          </div>
        </div>

        {custom.length > 0 && <h4 className="k-sub">Customise</h4>}
        <div className="k-opts">
          {custom.map((c) => {
            const on = picked.includes(c.name);
            return (
              <button key={c.name} className={"k-opt" + (on ? " on" : "")} onClick={() => toggle(c.name)}>
                <span className="k-check">{on && <Check size={16} />}</span>
                <span className="k-opt-name">{c.name}</span>
                <span className="k-opt-price">{c.price > 0 ? `+₹${c.price}` : "Free"}</span>
              </button>
            );
          })}
        </div>

        <div className="k-sheet-bottom">
          <div className="k-step big">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={20} /></button>
            <b key={qty}>{qty}</b>
            <button onClick={() => setQty((q) => q + 1)}><Plus size={20} /></button>
          </div>
          <button className="k-primary" onClick={() => onAdd(picked, extra, qty)}>
            Add to cart · ₹{unit * qty}
          </button>
        </div>
      </div>
    </div>
  );
}