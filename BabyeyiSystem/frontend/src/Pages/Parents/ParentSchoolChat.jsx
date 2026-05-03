import StudentChat from "../Student/studentChat";

/**
 * Same full-screen school chat as the former student portal — for parents messaging staff/teachers.
 */
export default function ParentSchoolChat() {
  return (
    <StudentChat
      dashboardBackPath="/parents/home"
      audienceSubtitle="Message teachers and school staff at your children's schools"
    />
  );
}
