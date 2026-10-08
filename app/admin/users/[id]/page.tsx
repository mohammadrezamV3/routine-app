"use client";

import { useParams } from "next/navigation";
import { AdminUserProfile } from "@/components/AdminUserProfile";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  return <section><AdminUserProfile id={id} variant="page" /></section>;
}
