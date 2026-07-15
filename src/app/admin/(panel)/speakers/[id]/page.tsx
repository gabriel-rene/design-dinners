import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { getSpeakerById } from "@/lib/queries";
import SpeakerForm from "@/components/admin/SpeakerForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteSpeaker, updateSpeaker } from "../actions";

export default async function EditarSpeakerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const speaker = await getSpeakerById(id);
  if (!speaker) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/speakers"
        className="text-sm font-medium text-dd-black/60 transition-colors hover:text-dd-red"
      >
        ← Speakers
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-dd-red">
          Editar speaker
        </h1>
        <DeleteButton
          action={deleteSpeaker.bind(null, speaker.id)}
          confirmMessage={`¿Eliminar a "${speaker.name}"? No se puede deshacer.`}
        />
      </div>

      <div className="mt-8">
        <SpeakerForm
          action={updateSpeaker.bind(null, speaker.id)}
          submitLabel="Guardar cambios"
          defaults={{
            name: speaker.name,
            role_title: speaker.role_title,
            bio: speaker.bio,
            photo_url: speaker.photo_url,
            social_links: speaker.social_links,
          }}
        />
      </div>
    </div>
  );
}
