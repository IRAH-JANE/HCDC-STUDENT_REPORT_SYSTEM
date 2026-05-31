import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="admin">
      <DashboardLayout role="admin">{children}</DashboardLayout>
    </RoleGuard>
  );
}
