"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type NotificationButtonProps = {
  href: string;
};

export default function NotificationButton({ href }: NotificationButtonProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnreadCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    }

    fetchUnreadCount();
  }, []);

  return (
    <Link href={href} className="btn btn-sm hcdc-topbar-button">
      Notifications
      {unreadCount > 0 && (
        <span className="badge border-none bg-white text-[#b00000]">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
