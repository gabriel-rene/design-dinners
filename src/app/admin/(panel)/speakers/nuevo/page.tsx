import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import SpeakerForm from "@/components/admin/SpeakerForm";
import { createSpeaker } from "../actions";

export default async function NuevoSpeakerPage() {
  await requireAdmin();

  return (
    <div>
      <Link
        href="/admin/speakers"
        className="text-sm font-medium text-dd-black/60 transition-colors hover:text-dd-red"
      >
        ← Speakers
      </Link>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-dd-red">
        Nuevo speaker
      </h1>
      <div className="mt-8">
        <SpeakerForm action={createSpeaker} submitLabel="Crear speaker" />
      </div>
    </div>
  );
}
