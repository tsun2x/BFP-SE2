import React, { useContext } from "react";
import { ToastContext } from "../context/ToastContext";
import "../style/toast.css";

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastContainer({ toasts = [] }) {
  return (
    <div className="toast-root" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item ${t.type || "info"}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function Toast() {
  const { toasts } = useToast();
  return <ToastContainer toasts={toasts} />;
}
