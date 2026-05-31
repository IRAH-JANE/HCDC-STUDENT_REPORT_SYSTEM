export function StatusBadge({ status }: { status: string }) {
  const className =
    status === "pending"
      ? "bg-yellow-100 text-yellow-800"
      : status === "in_progress"
        ? "bg-blue-100 text-blue-800"
        : status === "resolved"
          ? "bg-green-100 text-green-800"
          : status === "rejected"
            ? "bg-red-100 text-red-800"
            : "bg-gray-100 text-gray-800";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${className}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const className =
    urgency === "high"
      ? "bg-red-100 text-red-800"
      : urgency === "medium"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-gray-100 text-gray-800";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${className}`}
    >
      {urgency}
    </span>
  );
}
