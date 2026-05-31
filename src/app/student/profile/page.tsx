import ProfileDetails from "@/components/ProfileDetails";

export default function StudentProfilePage() {
  return (
    <ProfileDetails expectedRole="student" dashboardPath="/student/dashboard" />
  );
}
