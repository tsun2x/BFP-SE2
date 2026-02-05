import React, { createContext, useContext, useState, useCallback } from "react";

const NotificationContext = createContext({
  notifications: [],
  addNotification: () => {},
  clearNotifications: () => {},
});

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [
      {
        id: Date.now(),
        title: notification.title || "New Incident",
        message: notification.message || "",
        createdAt: notification.createdAt || new Date().toISOString(),
        type: notification.type || "incident",
        payload: notification.payload || null,
      },
      ...prev,
    ]);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
