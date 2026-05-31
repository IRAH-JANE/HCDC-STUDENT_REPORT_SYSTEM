import { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: number | string;
  description?: string;
  icon?: ReactNode;

  // Keep this so old pages that still pass tone will not error.
  tone?: "red" | "blue" | "green" | "yellow" | "neutral";
};

export default function StatCard({
  label,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <div className="hcdc-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-600">{label}</p>

          <p className="mt-2 text-4xl font-black leading-none text-black">
            {value}
          </p>

          {description && (
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-gray-300 bg-white text-black">
          {icon}
        </div>
      </div>
    </div>
  );
}
