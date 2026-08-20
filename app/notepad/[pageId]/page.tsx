"use client";

import { NotepadWorkspace } from "@/components/NotepadWorkspace";
import { SuperAdminGate } from "@/components/SuperAdminGate";

export default function NotepadPageDetail() {
  return (
    <SuperAdminGate>
      <NotepadWorkspace />
    </SuperAdminGate>
  );
}
