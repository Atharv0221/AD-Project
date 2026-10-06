import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  LayoutDashboard, UtensilsCrossed, LogOut, Plus, Trash2, Download, IndianRupee,
  ShoppingBag, TrendingUp, Flame, X, Search, ImagePlus,
} from "lucide-react";
import { API } from "../useOrders.js";

const COLORS = ["#e2552b", "#fbbf6a", "#2a9d78", "#6d4fd8", "#1b2a41"];
const rupee = (v) => `₹${v}`;

async function call(path, token, opts = {}) {
  const res = await fetch(API + path, { ...opts, headers: { ...(opts.headers || {}), "X-Admin-Token": token } });
  if (res.status === 401) throw new Error("401");
  return res;
}

/* ------------------------------------------------------------ */
export default function Admin() {
  const [token, setToken] = useState(sessionStorage.getItem("adminToken") || "");
  const [tab, setTab] = useState("dash");

  const logout = () => { sessionStorage.removeItem("adminToken"); setToken(""); };
  const login = (t) => { sessionStorage.setItem("adminToken", t); setToken(t); };

  if (!token) return <Login onLogin={login} />;

  return (
    <div className="ad-page">
      <aside className="ad-side">
        <h2>🍽️ Canteen Admin</h2>
        <button className={"ad-nav" + (tab === "dash" ? " on" : "")} onClick={() => setTab("dash")}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        <button className={"ad-nav" + (tab === "menu" ? " on" : "")} onClick={() => setTab("menu")}>
          <UtensilsCrossed size={20} /> Menu
        </button>
        <button className="ad-nav" onClick={() => exportCsv(token, logout)}>
          <Download size={20} /> Export orders
        </button>
        <button className="ad-nav out" onClick={logout}><LogOut size={20} /> Log out</button>
      </aside>

      <main className="ad-main">
        {tab === "dash" ? <Dashboard token={token} onAuthFail={logout} /> : <MenuManager token={token} onAuthFail={logout} />}
      </main>
    </div>
  );
}

async function exportCsv(token, onFail) {
  try {
    const res = await call("/admin/export", token);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url; a.download = "orders.csv"; a.click();
    URL.revokeObjectURL(url);
  } catch { onFail(); }
}

/* ------------------------------------------------------------ */
function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }),
      });
      const d = await res.json();
      if (!res.ok) return setErr(d.error);
      onLogin(d.token);
    } catch { setErr("Cannot reach the server. Is Flask running?"); }
  };

  return (
    <div className="k-page">
      <div className="k-center">
        <form className="ad-login" onSubmit={submit}>
          <h2>Admin login</h2>
          <input type="password" autoFocus placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <p className="ad-err">{err}</p>}
          <button className="k-primary wide" type="submit">Log in</button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ */
function Dashboard({ token, onAuthFail }) {
  const [days, setDays] = useState(7);
  const [s, setS] = useState(null);

  const load = useCallback(() => {
    call(`/admin/stats?days=${days}`, token).then((r) => r.json()).then(setS).catch(onAuthFail);
  }, [days, token]);

  useEffect(() => {
    load();
    const socket = io(API);
    socket.on("orders_changed", load);
    return () => socket.disconnect();
  }, [load]);

  if (!s) return <p>Loading...</p>;

  const avg = s.orders ? Math.round(s.revenue / s.orders) : 0;
  const peak = s.by_hour.reduce((m, h) => (h.orders > m.orders ? h : m), { hour: "-", orders: 0 });

  return (
    <>
      <div className="ad-top">
        <h1>Dashboard</h1>
        <div className="ad-seg">
          {[7, 14, 30].map((d) => (
            <button key={d} className={days === d ? "on" : ""} onClick={() => setDays(d)}>{d} days</button>
          ))}
        </div>
      </div>

      <div className="ad-cards">
        <Stat icon={<IndianRupee />} label="Revenue" value={rupee(s.revenue)} c="#e2552b" />
        <Stat icon={<ShoppingBag />} label="Paid orders" value={s.orders} c="#2a9d78" />
        <Stat icon={<TrendingUp />} label="Average order" value={rupee(avg)} c="#6d4fd8" />
        <Stat icon={<Flame />} label={`Active now · peak ${peak.hour}`} value={s.active} c="#d9a441" />
      </div>

      <div className="ad-grid">
        <Card title="Sales trend" wide>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={s.daily}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e2552b" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#e2552b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e4d4" />
              <XAxis dataKey="day" /><YAxis />
              <Tooltip formatter={(v, n) => [n === "revenue" ? rupee(v) : v, n]} />
              <Area type="monotone" dataKey="revenue" stroke="#e2552b" strokeWidth={3} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top selling items">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={s.top} layout="vertical" margin={{ left: 30 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={130} />
              <Tooltip formatter={(v) => [`${v} sold`]} />
              <Bar dataKey="sold" fill="#e2552b" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Peak hours (orders)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={s.by_hour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e4d4" />
              <XAxis dataKey="hour" /><YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="#fbbf6a" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Revenue by payment method"><PieBox data={s.by_payment} /></Card>
        <Card title="Revenue by category"><PieBox data={s.by_category} /></Card>
      </div>
    </>
  );
}

const Stat = ({ icon, label, value, c }) => (
  <div className="ad-stat">
    <span className="ad-stat-icon" style={{ background: c + "22", color: c }}>{icon}</span>
    <div><small>{label}</small><b>{value}</b></div>
  </div>
);

const Card = ({ title, wide, children }) => (
  <section className={"ad-card" + (wide ? " wide" : "")}><h3>{title}</h3>{children}</section>
);

function PieBox({ data }) {
  if (!data.length) return <p className="ad-none">No sales yet</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3} label={(e) => e.name}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={rupee} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------ */
function MenuManager({ token, onAuthFail }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    call("/admin/menu", token).then((r) => r.json()).then(setItems).catch(onAuthFail);
  }, [token]);
  useEffect(load, [load]);

  const toast = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const save = async (id, body) => {
    const res = await call(`/admin/menu/${id}`, token, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    toast(res.ok ? "Saved ✓" : d.error);
    load();
  };

  const del = async (it) => {
    if (!window.confirm(`Delete "${it.name}" from the menu?`)) return;
    await call(`/admin/menu/${it.id}`, token, { method: "DELETE" });
    toast("Deleted");
    load();
  };

  const shown = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const noPrice = items.filter((i) => i.price == null).length;
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <>
      <div className="ad-top">
        <h1>Menu <small>{items.length} dishes</small></h1>
        <label className="ad-search"><Search size={18} />
          <input placeholder="Search dish..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="k-primary" onClick={() => setAdding(true)}><Plus size={18} /> Add dish</button>
      </div>

      {noPrice > 0 && <p className="ad-warn">{noPrice} dish(es) have no price yet. Type a price to put them on the student menu.</p>}

      <div className="ad-table">
        {shown.map((it) => <Row key={it.id} it={it} save={save} del={del} />)}
      </div>

      {msg && <div className="ad-toast">{msg}</div>}
      {adding && (
        <AddDish token={token} categories={categories} onClose={() => setAdding(false)}
                 onDone={() => { setAdding(false); toast("Dish added ✓"); load(); }} />
      )}
    </>
  );
}

function Row({ it, save, del }) {
  const [price, setPrice] = useState(it.price ?? "");
  useEffect(() => setPrice(it.price ?? ""), [it.price]);

  const commit = () => {
    if (price === "" || Number(price) === it.price) return;
    save(it.id, it.price == null ? { price, available: true } : { price });
  };

  return (
    <div className={"ad-row" + (it.available ? "" : " off")}>
      <div className="ad-thumb">{it.image_url ? <img src={it.image_url} alt="" /> : it.emoji}</div>
      <div className="ad-name"><b>{it.name}</b><small>{it.category}</small></div>
      <label className="ad-price">₹
        <input type="number" min="0" value={price} placeholder="Set"
               onChange={(e) => setPrice(e.target.value)} onBlur={commit}
               onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
      </label>
      <button className={"ad-switch" + (it.available ? " on" : "")} disabled={it.price == null}
              onClick={() => save(it.id, { available: !it.available })}
              title={it.available ? "Click to mark sold out" : "Click to put back on menu"}>
        <i />
      </button>
      <span className="ad-state">{it.price == null ? "No price" : it.available ? "On menu" : "Sold out"}</span>
      <button className="k-trash" onClick={() => del(it)}><Trash2 size={18} /></button>
    </div>
  );
}

function AddDish({ token, categories, onClose, onDone }) {
  const [f, setF] = useState({ name: "", category: categories[0] || "", price: "", emoji: "", options: "" });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("image", file);
    const res = await call("/admin/menu", token, { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) { setErr(d.error); setBusy(false); return; }
    onDone();
  };

  return (
    <div className="k-overlay" onClick={onClose}>
      <form className="k-sheet ad-form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="k-close" onClick={onClose}><X size={22} /></button>
        <h2>Add a new dish</h2>

        <label className="ad-photo">
          {file ? <img src={URL.createObjectURL(file)} alt="" /> : <><ImagePlus size={36} /><span>Add photo (optional)</span></>}
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => setFile(e.target.files[0])} />
        </label>

        <input required placeholder="Dish name (e.g. Cold Coffee)" value={f.name} onChange={set("name")} />
        <div className="ad-two">
          <input required list="cats" placeholder="Category" value={f.category} onChange={set("category")} />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <input required type="number" min="0" placeholder="Price ₹" value={f.price} onChange={set("price")} />
        </div>
        <div className="ad-two">
          <input placeholder="Emoji (e.g. ☕)" value={f.emoji} onChange={set("emoji")} />
          <input placeholder="Options: Extra Cheese:10, No Onion" value={f.options} onChange={set("options")} />
        </div>
        <small className="ad-hint">Options are comma separated, as name:extra price. Leave empty for none.</small>

        {err && <p className="ad-err">{err}</p>}
        <button className="k-primary wide" disabled={busy}>{busy ? "Saving..." : "Add to menu"}</button>
      </form>
    </div>
  );
}