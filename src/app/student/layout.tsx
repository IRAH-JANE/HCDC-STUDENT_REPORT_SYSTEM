import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="student">
      <DashboardLayout role="student">{children}</DashboardLayout>
    </RoleGuard>
  );
}
