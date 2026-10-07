import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import VitrinaFeed from "@/components/vitrina/VitrinaFeed";
import { isUuid } from "@/lib/rsvp";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { getPublishedWork, listFeed } from "@/lib/vitrina/db";
import { readFanId } from "@/lib/vitrina/request";

// One query per request, shared by generateMetadata and the page.
const loadWork = cache(async (id: string) => {
  if (!isUuid(id) || !hasServiceConfig) return null;
  return getPublishedWork(getServiceClient(), id, await readFanId());
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const work = await loadWork((await params).id);
  if (!work) return { title: "Obra no encontrada — La Vitrina" };
  const title = `${work.title} — por ${work.creatorName}`;
  const description = work.description ?? `${work.creatorRole}. En La Vitrina de Design Dinners.`;
  return {
    title: `${title} — La Vitrina`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: work.imageUrl, width: work.imageWidth, height: work.imageHeight, alt: work.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [work.imageUrl] },
  };
}

export default async function VitrinaWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const work = await loadWork((await params).id);
  if (!work) notFound();
  const rest = await listFeed(getServiceClient(), {
    cursor: { ts: work.publishedAt, id: work.id },
    onlyAvailable: false,
    fanId: await readFanId(),
  });
  return <VitrinaFeed initialWorks={[work, ...rest.works]} initialCursor={rest.nextCursor} onlyAvailable={false} />;
}
