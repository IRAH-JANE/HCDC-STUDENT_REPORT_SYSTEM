"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  report_id: string | null;
  message: string;
  is_read: boolean | null;
  created_at: string;
};

type NotificationsListProps = {
  reportBasePath: string;
  dashboardPath: string;
};

export default function NotificationsList({
  reportBasePath,
  dashboardPath,
}: NotificationsListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchNotifications() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, report_id, message, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setNotifications((data as Notification[]) || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      await fetchNotifications();
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (!error) {
      await fetchNotifications();
    }
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <>
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="hcdc-page-title text-2xl md:text-3xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm hcdc-muted">
            You have {unreadCount} unread notification
            {unreadCount === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="btn hcdc-btn-outline" onClick={markAllAsRead}>
            Mark All as Read
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="hcdc-card p-4">
        {loading ? (
          <p className="text-sm hcdc-muted">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <h2 className="text-xl font-bold text-black">
              No notifications yet
            </h2>
            <p className="mt-2 text-sm hcdc-muted">
              Updates about your reports will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`border p-4 ${
                  item.is_read
                    ? "border-[#dddddd] bg-white"
                    : "border-[#b00000]/30 bg-red-50"
                }`}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="font-semibold text-black">{item.message}</p>
                    <p className="mt-1 text-sm hcdc-muted">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {item.report_id && (
                      <Link
                        href={`${reportBasePath}/${item.report_id}`}
                        className="btn btn-sm hcdc-btn-primary"
                      >
                        View Report
                      </Link>
                    )}

                    {!item.is_read && (
                      <button
                        className="btn btn-sm hcdc-btn-outline"
                        onClick={() => markAsRead(item.id)}
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
