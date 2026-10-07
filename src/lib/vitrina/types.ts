import type { Badge, WorkLinks } from "./validate";

export type WorkStatus = "pending" | "published" | "rejected";

/** What public pages get. Never carries creator_email or ip_hash. */
export type PublicWork = {
  id: string;
  title: string;
  description: string | null;
  creatorName: string;
  creatorRole: string;
  badge: Badge | null;
  links: WorkLinks;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  friesCount: number;
  publishedAt: string;
  /** This browser already gave a papita. */
  given: boolean;
};

export type FeedPage = { works: PublicWork[]; nextCursor: string | null };

export type AdminWork = Omit<PublicWork, "imageUrl" | "publishedAt" | "given"> & {
  status: WorkStatus;
  creatorEmail: string;
  /** Public URL when published, short-lived signed URL otherwise. */
  imageUrl: string | null;
  createdAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
};
