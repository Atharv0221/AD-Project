import { Routes, Route, useLocation } from "react-router-dom";
import Welcome from "./pages/Welcome.jsx";
import DiningChoice from "./pages/DiningChoice.jsx";
import Menu from "./pages/Menu.jsx";
import Cart from "./pages/Cart.jsx";
import Payment from "./pages/Payment.jsx";
import Token from "./pages/Token.jsx";
import Kitchen from "./pages/Kitchen.jsx";
import Admin from "./pages/Admin.jsx";


export default function App() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page">
      <Routes location={location}>
        <Route path="/" element={<Welcome />} />
        <Route path="/dining" element={<DiningChoice />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/token" element={<Token />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </div>
  );
}