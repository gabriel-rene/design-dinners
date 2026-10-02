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
  capacity: number | null;
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

export interface EventCounts {
  confirmed_count: number;
  waitlist_count: number;
}

export type EventWithSpeakers = EventRow & EventCounts & { speakers: SpeakerRow[] };

export type RsvpStatus = "confirmed" | "waitlist" | "cancelled";

export interface RsvpRow {
  id: string;
  event_id: string;
  name: string;
  email: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
}
