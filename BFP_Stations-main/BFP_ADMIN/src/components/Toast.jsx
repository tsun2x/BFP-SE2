import { useEffect, useState, useRef } from "react";
import "../style/toast.css";

export default function Toast({ 
  type = "info", 
  message, 
  duration = 3000, 
  onClose,
  position = "top-center",
  sticky = false,
  actionLabel,
  onAction,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setIsVisible(true);
    }
    
    if (sticky) {
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose, sticky]);

  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };

  return (
    <div className={`toast toast-${type} toast-${position} ${isVisible ? "toast-show" : ""}`}>
      <div className="toast-content">
        <i className={`fa-solid ${icons[type]} toast-icon`}></i>
        <span className="toast-message">{message}</span>
        {actionLabel && (
          <button
            className="toast-action-btn"
            onClick={() => {
              if (onAction) onAction();
              onClose();
            }}
          >
            {actionLabel}
          </button>
        )}
        <button className="toast-close" onClick={onClose}>
          <i className="fa-solid fa-times"></i>
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id || index}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={toast.onClose}
          position={toast.position}
          sticky={toast.sticky}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
        />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = (message, type = "info", duration = 3000, options = {}) => {
    idRef.current += 1;
    const id = idRef.current;
    const toast = {
      id,
      message,
      type,
      duration,
      position: options.position || "top-center",
      sticky: options.sticky || false,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      onClose: () => removeToast(id),
    };

    setToasts(prev => [...prev, toast]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (message, duration, options) => addToast(message, "success", duration, options);
  const error = (message, duration, options) => addToast(message, "error", duration, options);
  const warning = (message, duration, options) => addToast(message, "warning", duration, options);
  const info = (message, duration, options) => addToast(message, "info", duration, options);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
