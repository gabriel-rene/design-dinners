import type { Price } from "./validate";

export type CommunityEventStatus = "pending" | "published" | "rejected";

export type PublicCommunityEvent = {
  id: string;
  slug: string | null;
  title: string;
  startsAt: string;
  venue: string;
  link: string;
  description: string | null;
  organizer: string | null;
  price: Price | null;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
};

export type AdminCommunityEvent = Omit<PublicCommunityEvent, "imageUrl"> & {
  status: CommunityEventStatus;
  submitterEmail: string;
  imageUrl: string | null;
  createdAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
};
