import NotificationsList from "@/components/NotificationsList";

export default function StudentNotificationsPage() {
  return (
    <NotificationsList
      reportBasePath="/student/reports"
      dashboardPath="/student/dashboard"
    />
  );
}
