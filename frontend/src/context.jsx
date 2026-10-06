import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [lang, setLang] = useState("en");
  const [orderType, setOrderType] = useState(null); // "dine-in" | "takeaway"
  const [table, setTable] = useState("");
  const [cart, setCart] = useState([]);

  return (
    <AppContext.Provider
      value={{ lang, setLang, orderType, setOrderType, table, setTable, cart, setCart }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);