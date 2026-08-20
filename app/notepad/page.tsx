"use client";

import { NotepadWorkspace } from "@/components/NotepadWorkspace";
import { SuperAdminGate } from "@/components/SuperAdminGate";

export default function NotepadPage() {
  return (
    <SuperAdminGate>
      <NotepadWorkspace />
    </SuperAdminGate>
  );
}
