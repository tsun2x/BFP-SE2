import React, { createContext, useState, useRef, useCallback } from "react";

export const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = "info", duration = 3000) => {
    idRef.current += 1;
    const id = idRef.current;
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message, duration = 3000) => addToast(message, "success", duration), [addToast]);
  const error = useCallback((message, duration = 3000) => addToast(message, "error", duration), [addToast]);
  const info = useCallback((message, duration = 3000) => addToast(message, "info", duration), [addToast]);
  const warning = useCallback((message, duration = 3000) => addToast(message, "warning", duration), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
    </ToastContext.Provider>
  );
}
