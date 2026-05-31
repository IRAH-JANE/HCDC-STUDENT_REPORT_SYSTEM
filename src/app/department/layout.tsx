import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";

export default function DepartmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="department_staff">
      <DashboardLayout role="department">{children}</DashboardLayout>
    </RoleGuard>
  );
}
