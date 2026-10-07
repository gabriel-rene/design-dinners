"use server";

import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { decodeCursor } from "@/lib/vitrina/cursor";
import { listFeed } from "@/lib/vitrina/db";
import { readFanId } from "@/lib/vitrina/request";
import type { FeedPage } from "@/lib/vitrina/types";

export async function loadMoreWorks(cursor: string, onlyAvailable: boolean): Promise<FeedPage> {
  const decoded = decodeCursor(String(cursor));
  if (!decoded || !hasServiceConfig) return { works: [], nextCursor: null };
  return listFeed(getServiceClient(), {
    cursor: decoded,
    onlyAvailable: onlyAvailable === true,
    fanId: await readFanId(),
  });
}
