import type { Metadata } from "next";

import VitrinaFeed from "@/components/vitrina/VitrinaFeed";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { listFeed } from "@/lib/vitrina/db";
import { readFanId } from "@/lib/vitrina/request";

export const metadata: Metadata = {
  title: "La Vitrina — Design Dinners",
  description: "Trabajo de la comunidad de Design Dinners. Desliza, inspírate y conecta con quien lo hizo.",
};

export default async function VitrinaPage({
  searchParams,
}: {
  searchParams: Promise<{ disponible?: string }>;
}) {
  const onlyAvailable = (await searchParams).disponible === "1";
  const page = hasServiceConfig
    ? await listFeed(getServiceClient(), { cursor: null, onlyAvailable, fanId: await readFanId() })
    : { works: [], nextCursor: null };
  // Keyed so the "Disponible" chip (a soft navigation between /vitrina and
  // /vitrina?disponible=1) remounts the feed instead of keeping the old list in state.
  return (
    <VitrinaFeed
      key={String(onlyAvailable)}
      initialWorks={page.works}
      initialCursor={page.nextCursor}
      onlyAvailable={onlyAvailable}
    />
  );
}
