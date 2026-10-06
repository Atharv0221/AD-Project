import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pointer, Utensils, Coffee } from "lucide-react";
import { useApp } from "../context.jsx";
import { T } from "../i18n.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TITLE = {
  en: ["Welcome to", "the Canteen"],
  hi: ["कैंटीन में", "आपका स्वागत है"],
  mr: ["कॅन्टीनमध्ये", "आपले स्वागत आहे"],
};

function Leaf({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={`wl-deco wl-leaf ${className}`}>
      <path d="M8 55 Q45 -8 94 40 Q60 105 8 55Z" fill="#6bbf45" />
      <path d="M8 55 Q50 45 94 40" stroke="#3f8f2a" strokeWidth="3" fill="none" />
    </svg>
  );
}

export default function Welcome() {
  const nav = useNavigate();
  const { lang, setLang } = useApp();
  const [bowl, setBowl] = useState(null);

  useEffect(() => {
    fetch(`${API}/menu`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.find((i) => i.name === "Pohe" && i.image_url) || d.find((i) => i.image_url);
        if (p) setBowl(p.image_url);
      })
      .catch(() => {});
  }, []);

  const [l1, l2] = TITLE[lang];

  return (
    <div className="wl" onClick={() => nav("/dining")}>
      <div className="wl-blob" />

      {/* faint outlines and dots */}
      <Utensils className="wl-deco wl-ghost g1" size={110} strokeWidth={1.2} />
      <Coffee className="wl-deco wl-ghost g2" size={110} strokeWidth={1.2} />
      <Utensils className="wl-deco wl-ghost g3" size={80} strokeWidth={1.2} />
      <div className="wl-deco wl-dots d1" />
      <div className="wl-deco wl-dots d2" />

      {/* leaves */}
      <Leaf className="l1" /><Leaf className="l2" /><Leaf className="l3" /><Leaf className="l4" /><Leaf className="l5" />

      {/* lemon */}
      <svg className="wl-deco wl-lemon" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#ffd23f" />
        <circle cx="50" cy="50" r="41" fill="#fff6c2" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={i} x1="50" y1="50" x2="50" y2="12" stroke="#ffd23f" strokeWidth="3" transform={`rotate(${i * 45} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="5" fill="#ffd23f" />
      </svg>

      {/* tomato */}
      <svg className="wl-deco wl-tomato" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#e8452c" />
        <circle cx="50" cy="50" r="41" fill="#ff7a59" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <ellipse key={i} cx="50" cy="29" rx="9" ry="14" fill="#ffb08a" transform={`rotate(${i * 60} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="8" fill="#fff0d6" />
      </svg>

      {/* bowl with your real food photo */}
      <div className="wl-deco wl-bowl">{bowl ? <img src={bowl} alt="" /> : "🍛"}</div>

      {/* centre content */}
      <div className="wl-content">
        <div className="wl-logo">
          <svg viewBox="0 0 220 190">
            <ellipse cx="110" cy="182" rx="62" ry="6" fill="rgba(0,0,0,.08)" />
            <circle cx="110" cy="96" r="52" fill="#fff" stroke="#1f2430" strokeWidth="8" />
            <circle cx="110" cy="96" r="33" fill="#fff" stroke="#e5e7eb" strokeWidth="6" />
            <rect x="34" y="68" width="18" height="100" rx="9" fill="#bfe3f5" stroke="#1f2430" strokeWidth="8" />
            <rect x="24" y="24" width="38" height="46" rx="9" fill="#fff" stroke="#1f2430" strokeWidth="8" />
            <rect x="170" y="92" width="18" height="76" rx="9" fill="#bfe3f5" stroke="#1f2430" strokeWidth="8" />
            <path d="M168 28 Q196 22 196 60 V96 H168 Z" fill="#e5e7eb" stroke="#1f2430" strokeWidth="8" strokeLinejoin="round" />
          </svg>
          <svg className="wl-spark" viewBox="0 0 40 40">
            <line x1="6" y1="22" x2="16" y2="24" /><line x1="14" y1="10" x2="22" y2="16" /><line x1="28" y1="4" x2="30" y2="14" />
          </svg>
        </div>

        <h1 className="wl-title">
          <span className="wl-line1" style={{ "--i": 0 }}>{l1}</span>
          <span className="wl-line2">{l2}</span>
        </h1>

        <div className="wl-pills" onClick={(e) => e.stopPropagation()}>
          {[["en", "English"], ["hi", "हिन्दी"], ["mr", "मराठी"]].map(([code, label], i) => (
            <button key={code} style={{ "--i": i }} className={"wl-pill" + (lang === code ? " active" : "")}
                    onClick={() => setLang(code)}>
              {label}
            </button>
          ))}
        </div>

        <div className="wl-divider"><i /><b /><i /></div>

        <div className="wl-tap">
          <span className="wl-hand"><Pointer size={34} strokeWidth={1.5} /></span>
          {T[lang].tap}
        </div>
      </div>

      {/* animated waves */}
      <div className="wl-waves">
        <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w2">
          <path d="M0 50 C240 0 480 100 720 50 S1200 100 1440 50 S1920 100 2160 50 S2640 100 2880 50 V120 H0 Z" fill="#fcd9a3" />
        </svg>
        <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w1">
          <path d="M0 70 C240 20 480 120 720 70 S1200 120 1440 70 S1920 120 2160 70 S2640 120 2880 70 V120 H0 Z" fill="#fbbf6a" />
        </svg>
      </div>
    </div>
  );
}