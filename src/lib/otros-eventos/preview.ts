import type { PublicCommunityEvent } from "@/lib/otros-eventos/types";
import { safeError } from "@/lib/vitrina/log";

/** Next community events for the landing teaser. The landing never fails over it. */
export async function loadEventsPreview(
  load: () => Promise<PublicCommunityEvent[]>,
): Promise<PublicCommunityEvent[]> {
  try {
    return await load();
  } catch (error) {
    console.error("Otros eventos preview failed", safeError(error));
    return [];
  }
}
