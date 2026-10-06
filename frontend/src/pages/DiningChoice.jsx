import { useNavigate } from "react-router-dom";
import { ConciergeBell, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { useApp } from "../context.jsx";
import { T } from "../i18n.js";

export default function DiningChoice() {
  const nav = useNavigate();
  const { lang, setOrderType } = useApp();
  const t = T[lang];

  const pick = (type) => { setOrderType(type); nav("/menu"); };

  return (
    <div className="k-page">
      <div className="k-center">
        <ConciergeBell className="k-cloche" size={84} strokeWidth={1.2} />
        <h2 className="k-q">{t.choose}</h2>
        <div className="k-cards">
          <button className="k-card" onClick={() => pick("dine-in")}>
            <span className="k-icon" style={{ "--tint": "#e8f1fb" }}>
              <UtensilsCrossed size={84} strokeWidth={1.6} color="#1b2a41" />
            </span>
            {t.dineIn}
          </button>
          <button className="k-card" onClick={() => pick("takeaway")}>
            <span className="k-icon" style={{ "--tint": "#dff7ee" }}>
              <ShoppingBag size={84} strokeWidth={1.6} color="#6d4fd8" />
            </span>
            {t.takeaway}
          </button>
        </div>
      </div>
    </div>
  );
}