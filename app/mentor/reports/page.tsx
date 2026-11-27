import { redirect } from "next/navigation";

// گزارش هفته حالا داخل فضای هر شاگرد است
export default function MentorReportsPage() {
  redirect("/mentor/students");
}
