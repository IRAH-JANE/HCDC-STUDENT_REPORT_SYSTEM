import ProfileDetails from "@/components/ProfileDetails";

export default function DepartmentProfilePage() {
  return (
    <ProfileDetails
      expectedRole="department_staff"
      dashboardPath="/department/dashboard"
    />
  );
}
