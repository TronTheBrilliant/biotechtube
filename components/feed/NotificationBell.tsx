"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Heart, MessageSquare, UserPlus, AtSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "mention";
  read: boolean;
  created_at: string;
  actor?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  post?: {
    id: string;
    post_type: string;
    title?: string | null;
    body: string;
  } | null;
}

interface NotificationBellProps {
  userId: string;
}

function NotificationIcon({ type }: { type: string }) {
  const iconStyle = { color: "var(--color-accent)" };
  switch (type) {
    case "like":
      return <Heart size={12} style={iconStyle} />;
    case "comment":
      return <MessageSquare size={12} style={iconStyle} />;
    case "follow":
      return <UserPlus size={12} style={iconStyle} />;
    case "mention":
      return <AtSign size={12} style={iconStyle} />;
    default:
      return <Bell size={12} style={iconStyle} />;
  }
}

function notificationText(n: Notification): string {
  const actor = n.actor?.full_name || "Someone";
  switch (n.type) {
    case "like":
      return `${actor} liked your post`;
    case "comment":
      return `${actor} commented on your post`;
    case "follow":
      return `${actor} started following you`;
    case "mention":
      return `${actor} mentioned you`;
    default:
      return "You have a new notification";
  }
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, notification_ids: unreadIds }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }

  async function markOneRead(notifId: string) {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, notification_ids: [notifId] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Silently fail
    }
  }

  function handleToggle() {
    setOpen((v) => !v);
    if (!open) {
      fetchNotifications();
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--color-accent)",
              border: "1.5px solid var(--color-bg-primary)",
            }}
          />
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "var(--color-bg-primary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            zIndex: 100,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "0.5px solid var(--color-border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "var(--color-accent)",
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          {loading ? (
            <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "var(--color-text-tertiary)" }}>
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                textAlign: "center",
              }}
            >
              <Bell size={20} style={{ color: "var(--color-text-tertiary)", opacity: 0.3 }} />
              <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "8px 0 0" }}>
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.read && markOneRead(notif.id)}
                style={{
                  padding: "10px 14px",
                  borderBottom: "0.5px solid var(--color-border-subtle)",
                  background: notif.read ? "transparent" : "var(--color-accent-subtle)",
                  cursor: notif.read ? "default" : "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div style={{ marginTop: 1, flexShrink: 0 }}>
                  <NotificationIcon type={notif.type} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.4 }}>
                    {notificationText(notif)}
                  </p>
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </span>
                </div>
                {!notif.read && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                )}
              </div>
            ))
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: "8px 14px",
                textAlign: "center",
              }}
            >
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "var(--color-accent)",
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
