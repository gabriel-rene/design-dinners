// Static content the landing falls back to when DATABASE_URL is unset.

import type { EventWithSpeakers, SpeakerRow } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const buildTime = Date.now();

export const DEMO_SPEAKERS: SpeakerRow[] = [
  {
    id: "demo-speaker-1",
    name: "Ana Torres",
    role_title: "Directora de Diseño, Estudio Papaya",
    bio: "Quince años diseñando marcas para restaurantes y colectivos culturales.",
    photo_url: null,
    social_links: [{ label: "Instagram", url: "#" }],
    created_at: new Date(buildTime - 60 * DAY).toISOString(),
  },
  {
    id: "demo-speaker-2",
    name: "Luis Fernández",
    role_title: "Product Designer independiente",
    bio: "Escribe sobre sistemas de diseño y tipografía editorial en español.",
    photo_url: null,
    social_links: [],
    created_at: new Date(buildTime - 90 * DAY).toISOString(),
  },
];

export const DEMO_EVENTS: EventWithSpeakers[] = [
  {
    id: "demo-event-upcoming",
    title: "Cena de Bienvenida",
    description:
      "Una mesa larga, buena comida y conversación honesta sobre el oficio del diseño.",
    event_date: new Date(buildTime + 14 * DAY).toISOString(),
    location: "Ciudad de México",
    event_type: "cena",
    registration_url: null,
    capacity: 20,
    cover_image_url: null,
    created_at: new Date(buildTime - 10 * DAY).toISOString(),
    confirmed_count: 14,
    waitlist_count: 0,
    speakers: [DEMO_SPEAKERS[0]],
  },
  {
    id: "demo-event-past",
    title: "Taller de Tipografía Editorial",
    description: "Un taller práctico sobre jerarquía y ritmo tipográfico.",
    event_date: new Date(buildTime - 45 * DAY).toISOString(),
    location: "Ciudad de México",
    event_type: "taller",
    registration_url: null,
    capacity: 18,
    cover_image_url: null,
    created_at: new Date(buildTime - 60 * DAY).toISOString(),
    confirmed_count: 18,
    waitlist_count: 0,
    speakers: [DEMO_SPEAKERS[1]],
  },
];
