import ProfileDetails from "@/components/ProfileDetails";

export default function AdminProfilePage() {
  return (
    <ProfileDetails expectedRole="admin" dashboardPath="/admin/dashboard" />
  );
}
