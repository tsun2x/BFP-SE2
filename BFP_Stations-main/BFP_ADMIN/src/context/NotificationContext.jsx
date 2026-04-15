import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

const MAX_NOTIFICATIONS = 50;

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  clearNotifications: () => {},
});

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [
      {
        id: Date.now(),
        title: notification.title || "New Incident",
        message: notification.message || "",
        createdAt: notification.createdAt || new Date().toISOString(),
        type: notification.type || "incident",
        payload: notification.payload || null,
        read: false,
      },
      ...prev,
    ].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
