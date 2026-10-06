import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

export const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [live, setLive] = useState(false);

  const load = useCallback(() => {
    fetch(`${API}/orders/active`)
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const socket = io(API);
    socket.on("connect", () => setLive(true));
    socket.on("disconnect", () => setLive(false));
    socket.on("orders_changed", load);
    const poll = setInterval(load, 10000);
    return () => { socket.disconnect(); clearInterval(poll); };
  }, [load]);

  return { orders, live, reload: load };
}