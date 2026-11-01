// Copy for /pulso in both languages. The page is hidden for now: no nav link,
// noindex. Figures come from research/state-of-design-pr/04-sources.md
// (PRCS PUMS 2020–2024, BLS OEWS May 2025, IEPR Industrias Creativas
// 2021–2022, AIGA Design Census 2019). Keep the two languages in step.
import type { PulsoErrorCode, PulsoLang, PulsoRole } from "@/lib/pulso/validate";

export type PulsoCopy = {
  langLabel: string;
  hero: { lede: string; cta: string; more: string };
  slip: { rows: [string, string][]; by: string };
  marquee: string[];
  bill: {
    title: string;
    paragraphs: string[];
    head: string;
    lines: { label: string; note?: string; value: string }[];
    total: string;
    totalValue: string;
    stamp: string;
    sources: string;
  };
  rhythm: {
    title: string;
    intro: string;
    months: string[];
    legend: { title: string; text: string; color: "red" | "yellow" | "cream" }[];
    milestones: { when: string; what: string; now?: boolean }[];
  };
  menu: { title: string; intro: string; annual: string; quarterly: string; dishes: { title: string; text: string; quarterly: boolean }[] };
  rigor: { title: string; items: { icon: RigorIcon; title: string; text: string }[] };
  wanted: {
    title: string;
    intro: string;
    inReturn: string;
    roles: { title: string; what: string; get: string }[];
    you: string;
    cta: string;
  };
  form: {
    title: string;
    intro: string;
    name: string;
    email: string;
    organization: string;
    optional: string;
    roles: string;
    roleLabels: Record<PulsoRole, string>;
    message: string;
    messagePlaceholder: string;
    consent: string;
    send: string;
    sending: string;
    note: string;
    errors: {
      name: Partial<Record<PulsoErrorCode, string>>;
      email: Partial<Record<PulsoErrorCode, string>>;
      organization: string;
      roles: string;
      message: string;
      consent: string;
      unavailable: string;
      limit: string;
      failed: string;
    };
    doneTitle: string;
    doneText: string;
  };
};

export type RigorIcon = "compare" | "lock" | "language" | "doc" | "globe" | "shield";

const es: PulsoCopy = {
  langLabel: "Idioma / Language",
  hero: {
    lede: "Por primera vez, y cada trimestre, vamos a medir cómo está la industria del diseño en Puerto Rico: quiénes somos, cómo trabajamos, cuánto cobramos y para quién.",
    cta: "Súmate al proyecto",
    more: "Ver la propuesta ↓",
  },
  slip: {
    rows: [
      ["Primera encuesta", "Enero 2027"],
      ["Primer informe", "Abril 2027"],
      ["Tiempo", "15 minutos"],
      ["Para", "Quien diseña en PR"],
      ["Idiomas", "ES · EN"],
    ],
    by: "Un proyecto de investigación de Design Dinners.",
  },
  marquee: ["Encuesta anual", "Pulso trimestral", "Datos abiertos", "Bilingüe", "Hecho en PR"],
  bill: {
    title: "La cuenta, hasta ahora",
    paragraphs: [
      "Los datos oficiales cuentan empleos en empresas. Se les escapa quien trabaja por su cuenta, quien cobra de clientes de afuera y quien se fue.",
      "Puerto Rico Creativo (2023) abrió camino con entrevistas sobre toda la economía creativa. Pulso va al detalle: solo diseño, las mismas preguntas, cada año.",
    ],
    head: "Mesa: Diseño en Puerto Rico",
    lines: [
      { label: "Personas que trabajan en diseño", value: "≈4,300" },
      { label: "Trabajan por su cuenta", note: "vs. 15% de todos los trabajadores en PR", value: "36%" },
      { label: "Paga mediana, diseño gráfico", note: "EE.UU.: $62,960", value: "$34,180" },
      { label: "Empleados en firmas de diseño", value: "335" },
      { label: "Graduados de diseño al año", value: "≈850" },
      { label: "Respuestas de PR en el último Design Census de EE.UU.", value: "0" },
    ],
    total: "Total sin medir",
    totalValue: "Cuánto cobramos, para quién trabajamos, cómo nos afecta la IA, y si nos vamos o nos quedamos.",
    stamp: "Pendiente",
    sources:
      "Fuentes: Censo de EE.UU., Puerto Rico Community Survey (microdatos 2020–2024); BLS OEWS mayo 2025; Instituto de Estadísticas de PR, Industrias Creativas 2021–2022; AIGA Design Census 2019. Cifras redondeadas.",
  },
  rhythm: {
    title: "Un latido fuerte al año. Tres pequeños entre medio.",
    intro: "Una encuesta completa cada enero. Un chequeo corto cada trimestre. Así vemos la foto del año y cómo cambia mes a mes.",
    months: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    legend: [
      { color: "red", title: "Encuesta anual", text: "Enero. 15 minutos. Trabajo, paga, clientes, educación, IA, futuro. Es la base del informe." },
      { color: "yellow", title: "Pulso trimestral", text: "Abril, julio y octubre. 3 minutos, las mismas 10 preguntas. Da el Índice Pulso: un número del 0 al 100." },
      { color: "cream", title: "Informe abierto", text: "Gratis para la comunidad, en español e inglés, con el método publicado." },
    ],
    milestones: [
      { when: "Nov 2026 · ahora", what: "Armamos el equipo y los aliados", now: true },
      { when: "Dic 2026", what: "Prueba piloto con 10 personas" },
      { when: "Ene 2027", what: "Abre la primera encuesta" },
      { when: "Abr 2027", what: "Sale el primer informe" },
    ],
  },
  menu: {
    title: "Lo que vamos a medir",
    intro: "Siete preguntas guían el estudio. Cada pregunta de la encuesta responde a una de ellas.",
    annual: "Anual",
    quarterly: "Trimestral",
    dishes: [
      { title: "Quiénes somos", text: "Edad, género, región, educación y disciplina.", quarterly: false },
      { title: "Cómo trabajamos", text: "Empleo, freelance, estudio propio, horas, remoto o presencial.", quarterly: true },
      { title: "Quién nos paga", text: "Qué parte del trabajo viene de PR, EE.UU., Latinoamérica y más allá.", quarterly: true },
      { title: "Cuánto cobramos", text: "Rangos de ingreso, tarifas, beneficios y pagos tardíos.", quarterly: false },
      { title: "La IA en la mesa", text: "Cuánto la usamos y qué le hace a nuestro trabajo y a nuestros precios.", quarterly: true },
      { title: "Irse o quedarse", text: "Planes de mudarse, de regresar, y la diáspora que diseña desde afuera.", quarterly: true },
      { title: "Lo que nos hace falta", text: "Formación, clientes, guías de precios, comunidad.", quarterly: false },
    ],
  },
  rigor: {
    title: "Con método, no con corazonadas",
    items: [
      { icon: "compare", title: "Comparable", text: "Usamos las mismas categorías que el Censo, el BLS y el AIGA Design Census. Así podemos comparar a PR con EE.UU. y Latinoamérica." },
      { icon: "lock", title: "Anónimo de verdad", text: "No pedimos nombres. Nunca publicamos un grupo de menos de 10 personas." },
      { icon: "language", title: "Bilingüe", text: "En español e inglés, traducido y verificado por dos personas." },
      { icon: "doc", title: "Método publicado", text: "Fechas, tamaño de la muestra, cómo reclutamos y los límites del estudio." },
      { icon: "globe", title: "Abierto", text: "Los resultados son gratis para toda la comunidad." },
      { icon: "shield", title: "Independiente", text: "Ningún auspiciador escribe preguntas ni ve respuestas individuales." },
    ],
  },
  wanted: {
    title: "Nos faltan sillas en la mesa",
    intro: "Un estudio así no sale de una sola persona. Buscamos gente que quiera hacerlo bien con nosotros.",
    inReturn: "A cambio",
    roles: [
      { title: "Asesoría de método", what: "Sabes de estadística, ciencias sociales o encuestas. Revisas el cuestionario y el análisis.", get: "Crédito como asesor(a) en el informe y en el lanzamiento." },
      { title: "Academia", what: "Universidades y escuelas de diseño. Nos ayudas a llegar a estudiantes y egresados, y con la revisión ética.", get: "Co-autoría institucional y acceso temprano a los datos agregados." },
      { title: "Auspicio", what: "Empresas, fundaciones o gobierno que creen en la industria. Cubres el diseño del informe, el lanzamiento y los incentivos.", get: "Tu marca en el informe y el lanzamiento, y una presentación privada de resultados." },
      { title: "Difusión", what: "Agencias, estudios, colectivos y grupos de freelancers. Compartes la encuesta con tu gente.", get: "Tu nombre en la lista de aliados y el informe para tu equipo." },
      { title: "Voluntariado", what: "Traducción, análisis de respuestas abiertas, visualización de datos o diseño editorial.", get: "Crédito en el informe y un lugar en el equipo." },
    ],
    you: "Si diseñas en Puerto Rico, tu parte es la más importante: contestar en enero. 15 minutos. Te avisamos.",
    cta: "Quiero una silla",
  },
  form: {
    title: "Súmate a Pulso",
    intro: "Cuéntanos cómo quieres ayudar. Te escribimos en menos de una semana.",
    name: "Nombre",
    email: "Email",
    organization: "Organización o estudio",
    optional: "(opcional)",
    roles: "¿Cómo quieres ayudar?",
    roleLabels: {
      metodo: "Asesoría de método",
      academia: "Academia",
      auspicio: "Auspicio",
      difusion: "Difusión",
      voluntariado: "Voluntariado",
      encuesta: "Quiero contestar la encuesta",
    },
    message: "Mensaje",
    messagePlaceholder: "Cuéntanos de ti o de tu organización.",
    consent: "Acepto que Design Dinners me escriba sobre Pulso. No compartimos tus datos.",
    send: "Enviar",
    sending: "Enviando…",
    note: "Los campos con * son requeridos.",
    errors: {
      name: { required: "Escribe tu nombre.", tooLong: "Usa 120 caracteres o menos." },
      email: { required: "Escribe tu email.", invalid: "Escribe un email válido, como nombre@ejemplo.com." },
      organization: "Usa 160 caracteres o menos.",
      roles: "Escoge por lo menos una opción.",
      message: "Usa 2,000 caracteres o menos.",
      consent: "Necesitamos tu permiso para escribirte.",
      unavailable: "El formulario no está disponible ahora mismo. Intenta más tarde.",
      limit: "Recibimos muchos envíos desde tu conexión hoy. Intenta mañana.",
      failed: "No pudimos enviar tu mensaje. Intenta de nuevo.",
    },
    doneTitle: "¡Recibido!",
    doneText: "Gracias por sentarte con nosotros. Te escribimos en menos de una semana.",
  },
};

const en: PulsoCopy = {
  langLabel: "Idioma / Language",
  hero: {
    lede: "For the first time, and every quarter, we will measure the state of the design industry in Puerto Rico: who we are, how we work, what we earn and who we work for.",
    cta: "Join the project",
    more: "Read the proposal ↓",
  },
  slip: {
    rows: [
      ["First survey", "January 2027"],
      ["First report", "April 2027"],
      ["Time", "15 minutes"],
      ["For", "Anyone designing in PR"],
      ["Languages", "ES · EN"],
    ],
    by: "A research project by Design Dinners.",
  },
  marquee: ["Annual survey", "Quarterly pulse", "Open data", "Bilingual", "Made in PR"],
  bill: {
    title: "The bill, so far",
    paragraphs: [
      "Official data counts jobs at companies. It misses people who work for themselves, people paid by clients abroad, and people who left.",
      "Puerto Rico Creativo (2023) opened the way with interviews across the whole creative economy. Pulso goes deeper: design only, the same questions, every year.",
    ],
    head: "Table: Design in Puerto Rico",
    lines: [
      { label: "People working in design", value: "≈4,300" },
      { label: "Self-employed", note: "vs. 15% of all workers in PR", value: "36%" },
      { label: "Median pay, graphic design", note: "US: $62,960", value: "$34,180" },
      { label: "Employees at design firms", value: "335" },
      { label: "Design graduates per year", value: "≈850" },
      { label: "PR answers in the last US Design Census", value: "0" },
    ],
    total: "Total unmeasured",
    totalValue: "What we charge, who we work for, how AI affects us, and whether we stay or leave.",
    stamp: "Pending",
    sources:
      "Sources: US Census, Puerto Rico Community Survey (microdata 2020–2024); BLS OEWS May 2025; PR Institute of Statistics, Industrias Creativas 2021–2022; AIGA Design Census 2019. Rounded figures.",
  },
  rhythm: {
    title: "One strong beat a year. Three small ones in between.",
    intro: "A full survey every January. A short check-in every quarter. We see the picture of the year, and how it changes.",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    legend: [
      { color: "red", title: "Annual survey", text: "January. 15 minutes. Work, pay, clients, education, AI, outlook. The base of the report." },
      { color: "yellow", title: "Quarterly pulse", text: "April, July and October. 3 minutes, the same 10 questions. It gives the Pulso Index: one number from 0 to 100." },
      { color: "cream", title: "Open report", text: "Free for the community, in Spanish and English, with the method published." },
    ],
    milestones: [
      { when: "Nov 2026 · now", what: "We build the team and partners", now: true },
      { when: "Dec 2026", what: "Pilot test with 10 people" },
      { when: "Jan 2027", what: "The first survey opens" },
      { when: "Apr 2027", what: "The first report comes out" },
    ],
  },
  menu: {
    title: "What we will measure",
    intro: "Seven questions guide the study. Every survey question answers one of them.",
    annual: "Annual",
    quarterly: "Quarterly",
    dishes: [
      { title: "Who we are", text: "Age, gender, region, education and discipline.", quarterly: false },
      { title: "How we work", text: "Employment, freelance, own studio, hours, remote or on-site.", quarterly: true },
      { title: "Who pays us", text: "How much work comes from PR, the US, Latin America and beyond.", quarterly: true },
      { title: "What we earn", text: "Income ranges, rates, benefits and late payments.", quarterly: false },
      { title: "AI at the table", text: "How much we use it, and what it does to our work and our prices.", quarterly: true },
      { title: "Stay or leave", text: "Plans to move, to come back, and the diaspora designing from abroad.", quarterly: true },
      { title: "What we need", text: "Training, clients, pricing guides, community.", quarterly: false },
    ],
  },
  rigor: {
    title: "Built on method, not hunches",
    items: [
      { icon: "compare", title: "Comparable", text: "We use the same categories as the US Census, the BLS and the AIGA Design Census, so we can compare PR with the US and Latin America." },
      { icon: "lock", title: "Truly anonymous", text: "We never ask for names. We never publish a group of fewer than 10 people." },
      { icon: "language", title: "Bilingual", text: "In Spanish and English, translated and checked by two people." },
      { icon: "doc", title: "Published method", text: "Dates, sample size, how we recruit, and the limits of the study." },
      { icon: "globe", title: "Open", text: "The results are free for the whole community." },
      { icon: "shield", title: "Independent", text: "No sponsor writes questions or sees individual answers." },
    ],
  },
  wanted: {
    title: "We need more chairs at the table",
    intro: "A study like this does not come from one person. We are looking for people who want to do it right with us.",
    inReturn: "In return",
    roles: [
      { title: "Method advisor", what: "You know statistics, social science or surveys. You review the questionnaire and the analysis.", get: "Credit as an advisor in the report and at the launch." },
      { title: "Academia", what: "Universities and design schools. You help us reach students and graduates, and with the ethics review.", get: "Institutional co-authorship and early access to the aggregate data." },
      { title: "Sponsorship", what: "Companies, foundations or government that believe in the industry. You cover the report design, the launch and the incentives.", get: "Your brand in the report and at the launch, plus a private results briefing." },
      { title: "Outreach", what: "Agencies, studios, collectives and freelancer groups. You share the survey with your people.", get: "Your name on the partner list, and the report for your team." },
      { title: "Volunteers", what: "Translation, open-answer analysis, data visualization or editorial design.", get: "Credit in the report and a place on the team." },
    ],
    you: "If you design in Puerto Rico, your part matters most: answer in January. 15 minutes. We will remind you.",
    cta: "Save me a chair",
  },
  form: {
    title: "Join Pulso",
    intro: "Tell us how you want to help. We will write back within a week.",
    name: "Name",
    email: "Email",
    organization: "Organization or studio",
    optional: "(optional)",
    roles: "How do you want to help?",
    roleLabels: {
      metodo: "Method advisor",
      academia: "Academia",
      auspicio: "Sponsorship",
      difusion: "Outreach",
      voluntariado: "Volunteers",
      encuesta: "I want to answer the survey",
    },
    message: "Message",
    messagePlaceholder: "Tell us about you or your organization.",
    consent: "I agree that Design Dinners may email me about Pulso. We do not share your data.",
    send: "Send",
    sending: "Sending…",
    note: "Fields with * are required.",
    errors: {
      name: { required: "Enter your name.", tooLong: "Use 120 characters or fewer." },
      email: { required: "Enter your email.", invalid: "Enter a valid email, like name@example.com." },
      organization: "Use 160 characters or fewer.",
      roles: "Choose at least one option.",
      message: "Use 2,000 characters or fewer.",
      consent: "We need your permission to write to you.",
      unavailable: "The form is not available right now. Try again later.",
      limit: "We got many sign-ups from your connection today. Try again tomorrow.",
      failed: "We could not send your message. Try again.",
    },
    doneTitle: "Got it!",
    doneText: "Thanks for pulling up a chair. We will write back within a week.",
  },
};

export const PULSO_COPY: Record<PulsoLang, PulsoCopy> = { es, en };
