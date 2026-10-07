"use server";

import { isUuid } from "@/lib/rsvp";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { decodeCursor } from "@/lib/vitrina/cursor";
import { countRecentFries, getPublishedWork, listFeed, toggleFry } from "@/lib/vitrina/db";
import { logSafe } from "@/lib/vitrina/log";
import { ensureFanId, readFanId, requestIpHash } from "@/lib/vitrina/request";
import type { FeedPage } from "@/lib/vitrina/types";
import { FRIES_PER_HOUR } from "@/lib/vitrina/validate";

export async function loadMoreWorks(cursor: string, onlyAvailable: boolean): Promise<FeedPage> {
  const decoded = decodeCursor(String(cursor));
  if (!decoded || !hasServiceConfig) return { works: [], nextCursor: null };
  return listFeed(getServiceClient(), {
    cursor: decoded,
    onlyAvailable: onlyAvailable === true,
    fanId: await readFanId(),
  });
}

/** Give (on) or take back a papita. Returns the real state, or null on failure (the client reverts). */
export async function setFry(workId: string, on: boolean): Promise<{ count: number; given: boolean } | null> {
  if (!isUuid(String(workId)) || typeof on !== "boolean" || !hasServiceConfig) return null;
  const db = getServiceClient();
  try {
    const fanId = await ensureFanId();
    const ipHash = await requestIpHash();
    if (on && ipHash && (await countRecentFries(db, ipHash)) >= FRIES_PER_HOUR) {
      const work = await getPublishedWork(db, workId, fanId);
      return work ? { count: work.friesCount, given: work.given } : null;
    }
    const count = await toggleFry(db, { workId, fanId, ipHash, on });
    return count === null ? null : { count, given: on };
  } catch (error) {
    logSafe("setFry failed", error);
    return null;
  }
}
