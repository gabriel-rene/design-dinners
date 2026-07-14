// Mirrors the SQL schema in supabase/migrations/20260714000000_init.sql.
// Keep field names and nullability in sync with that file.

export interface SocialLink {
  label: string;
  url: string;
}

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  event_type: "cena" | "taller" | "otro";
  registration_url: string | null;
  cover_image_url: string | null;
  created_at: string;
}

export interface SpeakerRow {
  id: string;
  name: string;
  role_title: string | null;
  bio: string | null;
  photo_url: string | null;
  social_links: SocialLink[];
  created_at: string;
}

export interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  created_at: string;
}

export type EventWithSpeakers = EventRow & { speakers: SpeakerRow[] };
