import NotificationsList from "@/components/NotificationsList";

export default function DepartmentNotificationsPage() {
  return (
    <NotificationsList
      reportBasePath="/department/reports"
      dashboardPath="/department/dashboard"
    />
  );
}
