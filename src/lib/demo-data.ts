// Static content the landing falls back to when no Supabase project is
// configured (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
// unset). Lets the landing deploy stand alone for design review before a
// cloud Supabase project exists — swap in real env vars and this fallback
// stops being used automatically.

import type { EventWithSpeakers, ResourceRow, SpeakerRow } from "./types";

export const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

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
    registration_url: "#",
    cover_image_url: null,
    created_at: new Date(buildTime - 10 * DAY).toISOString(),
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
    cover_image_url: null,
    created_at: new Date(buildTime - 60 * DAY).toISOString(),
    speakers: [DEMO_SPEAKERS[1]],
  },
];

export const DEMO_RESOURCES: ResourceRow[] = [
  {
    id: "demo-resource-1",
    title: "Guía de tipografía para pantallas",
    description: "Fundamentos de jerarquía, escala e interlineado para interfaces.",
    url: "#",
    category: "Lecturas",
    created_at: new Date(buildTime - 20 * DAY).toISOString(),
  },
  {
    id: "demo-resource-2",
    title: "Kit de Figma: sistema de diseño",
    description: "Componentes base y tokens para arrancar un sistema desde cero.",
    url: "#",
    category: "Herramientas",
    created_at: new Date(buildTime - 30 * DAY).toISOString(),
  },
];
