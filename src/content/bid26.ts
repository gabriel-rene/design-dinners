/**
 * Puerto Rico at the Bienal Iberoamericana de Diseño 2026 (BID26, Madrid).
 * Static editorial content for /bid26 — texts and credits come from the
 * official BID26 gallery (https://bid-dimad.com/bid/galeria/?filtropais=Puerto+Rico);
 * images are local WebP copies in public/bid26/<id>/.
 */

export type Bid26Image = { src: string; width: number; height: number; alt: string };

export type Bid26Work = {
  id: string;
  chapter: number;
  title: string;
  /** Credit line shown on the spread. */
  credit: string;
  /** Full author list from BID, shown in the detail panel. */
  authors: string[];
  studio: string;
  studioUrl?: string;
  year: number;
  category: string;
  /** One editorial fact: a big figure plus the line that explains it. */
  fact: { figure: string; line: string };
  excerpt: string;
  /** Full BID description, one string per paragraph. */
  description: string[];
  client?: string;
  clientUrl?: string;
  /** BID "Editor / Productor" field. */
  producer?: string;
  photography?: string;
  links: { label: string; href: string }[];
  bidUrl: string;
  images: Bid26Image[];
  /** Kept in the data but not shown on the page. */
  hidden?: boolean;
};

export type Bid26Chapter = {
  title: string;
  /** Short label for the chapter rail. */
  short: string;
  kicker: string;
  intro: string;
  bg: string;
  fg: string;
  accent: string;
};

export const BID26_GALLERY_URL = "https://bid-dimad.com/bid/galeria/?filtropais=Puerto+Rico";
const BID = "https://bid-dimad.com/bid/trabajo_pr/";

function img(id: string, n: number, width: number, height: number, alt: string): Bid26Image {
  return { src: `/bid26/${id}/${n}.webp`, width, height, alt };
}

export const BID26_CHAPTERS: Bid26Chapter[] = [
  {
    title: "Diseño para la resiliencia",
    short: "Resiliencia",
    kicker: "Capítulo uno",
    intro: "Inundaciones, calor, comunidades que se organizan. Tres proyectos que tratan el diseño como defensa.",
    bg: "#123a2b",
    fg: "#f8e3ca",
    accent: "#faa61a",
  },
  {
    title: "Diseño desde el territorio",
    short: "Territorio",
    kicker: "Capítulo dos",
    intro: "Memoria negra y cartel latinoamericano. Diseñar desde lo que somos.",
    bg: "#7a3418",
    fg: "#f8e3ca",
    accent: "#faa61a",
  },
  {
    title: "Diseño en lo público",
    short: "Lo público",
    kicker: "Capítulo tres",
    intro: "La calle como galería, el parque como marca. Diseño que se camina.",
    bg: "#d21432",
    fg: "#ffffff",
    accent: "#000000",
  },
  {
    title: "Diseño como conocimiento",
    short: "Conocimiento",
    kicker: "Capítulo cuatro",
    intro: "Libros, datos y especies. Cuando el diseño convierte investigación en algo que se entiende.",
    bg: "#000000",
    fg: "#f8e3ca",
    accent: "#faa61a",
  },
];

const TEMBOL = { studio: "TEMBOL", studioUrl: "https://tembol.co/" };
const BUENA = { studio: "Buena Gráfica Social Studio", studioUrl: "https://buenagrafica.com/" };

const ALL_WORKS: Bid26Work[] = [
  {
    id: "el-parque",
    chapter: 0,
    title: "El Parque",
    credit: "José Fernando Vázquez Pérez",
    authors: ["José Fernando Vázquez Pérez"],
    studio: "HACEDORMAKER_ARQUITECTOS",
    year: 2026,
    category: "Diseño de espacios e interiorismo",
    fact: { figure: "112 → 181", line: "árboles en un predio de Hato Rey que se inundaba." },
    excerpt:
      "El Parque Gándara pasó de predio olvidado a pulmón urbano: un paseo circular, sub-parques, estanques de retención y especies nativas.",
    description: [
      "El Parque Gándara, creado en el 1950 durante la expansión de la Milla de Oro en Hato Rey [San Juan] era una parcela arbolada de 1.8 hectáreas, poco definida y vulnerable a inundaciones. En 2022 fuimos seleccionados por concurso para transformarlo en un parque urbano que preservara su carácter natural, mejorara la conectividad e incorporara áreas de ocio, ejercicio y encuentro.",
      "El diseño se organiza mediante un paseo circular-radial de un cuarto de milla, senderos diagonales y “sub-parques” con jardines, zonas de ejercicios, agricultura urbana, plaza y quiosco central. La intervención aumentó los árboles de 112 a 181, con nuevas especies nativas, e incorporó estanques de retención y sistemas naturales de drenaje. Se estima una mejora de 185% en la absorción de CO₂.",
      "El proceso evolucionó de un ejercicio formal de diseño urbano a una estrategia de resiliencia frente contra inundaciones, isla de calor y pérdida de hábitat, convirtiendo un predio olvidado en un nuevo pulmón para la ciudad.",
    ],
    client: "Municipio de San Juan, Ciudad Capital; Hon. Miguel Romero, Alcalde",
    clientUrl: "https://sanjuan.pr/",
    photography: "José Fernando Vázquez Pérez, Jean Delgado (fotografía aérea)",
    links: [{ label: "Ver el video", href: "https://www.youtube.com/watch?v=0eZyB6lixO0" }],
    bidUrl: `${BID}el-parque/`,
    images: [
      img("el-parque", 6, 1000, 750, "Vista aérea del Parque Gándara terminado: senderos, plaza central y árboles entre edificios de Hato Rey"),
      img("el-parque", 5, 1024, 768, "Láminas con fotos del parque construido: senderos, quiosco y zonas de sombra"),
      img("el-parque", 4, 1024, 768, "Lámina del proceso de construcción del parque con fotos de obra"),
      img("el-parque", 3, 1024, 768, "Plano del paseo circular-radial con sus sub-parques y leyenda"),
      img("el-parque", 2, 1024, 768, "Diagramas de concepto: el círculo, las diagonales y la maqueta"),
      img("el-parque", 1, 1024, 768, "Lámina del predio original con fotos aéreas y estrategias de diseño"),
    ],
  },
  {
    id: "devuelta-al-manglar",
    chapter: 0,
    title: "Devuelta al manglar",
    credit: "Adriana C. García Soto",
    authors: ["Adriana C. García Soto"],
    studio: "AGar Estudio",
    studioUrl: "https://www.agarestudio.com/",
    year: 2026,
    category: "Diseño digital",
    fact: { figure: "VR", line: "Un manglar virtual dentro del Museo de Arte de Puerto Rico." },
    excerpt:
      "El atrio del MAPR fue ciénaga. Con visores Meta Quest, el público camina un paisaje inundado y encuentra una casa que todavía está habitada.",
    description: [
      "Devuelta al manglar es una experiencia de realidad aumentada creada para el atrio del Museo de Arte de Puerto Rico, en Santurce, un territorio que fue originalmente una ciénaga. Tras escanear el espacio en 3D, el proyecto superpone sobre su arquitectura un manglar virtual construido con ilustraciones, modelos tridimensionales, animación y sonidos grabados en el Estuario de la Bahía.",
      "Con visores Meta Quest, el público avanza por un paisaje parcialmente inundado y encuentra rastros de un futuro posible: un vehículo abandonado o una casa tradicional que emerge del agua todavía habitada. La experiencia relaciona el aumento del nivel del mar con la crisis de vivienda y el desplazamiento en San Juan, utilizando la transformación virtual del propio museo para imaginar qué podría permanecer en ese territorio.",
    ],
    client: "MeshMap",
    clientUrl: "https://www.meshmap.com/",
    photography: "Ricardo José Rodríguez",
    links: [{ label: "Ver el video", href: "https://youtu.be/PhTWoyD-jyA" }],
    bidUrl: `${BID}devuelta-al-manglar/`,
    images: [
      img("devuelta-al-manglar", 6, 1600, 1353, "Una casa tradicional de madera emerge del agua entre mangles, superpuesta al atrio del museo"),
      img("devuelta-al-manglar", 1, 1800, 1198, "Visitantes con visores Meta Quest recorren el atrio del Museo de Arte de Puerto Rico"),
      img("devuelta-al-manglar", 5, 1600, 1434, "El atrio del museo inundado por un manglar virtual"),
      img("devuelta-al-manglar", 2, 1800, 990, "El escaneo 3D del atrio con el manglar dentro del motor de desarrollo"),
      img("devuelta-al-manglar", 3, 1800, 1013, "Bocetos de la casa, garzas y mangles en tinta"),
      img("devuelta-al-manglar", 4, 1600, 900, "Modelado 3D y texturización de la casa"),
    ],
  },
  {
    id: "ciencia-colab",
    chapter: 0,
    title: "Ciencia CoLab",
    credit:
      "Ramdwin González Otero, Mónica Feliú Mójer, Ana Luisa Emmanuelli Coronas, Xavier D. Ortiz Torres, Edmy Ayala Rosado, Andrea Isabel López, Nathaly Villareal, Angélica Valdés Valderrama, Natalia Vázquez Berríos",
    authors: [
      "Ramdwin González Otero",
      "Mónica Feliú Mójer",
      "Ana Luisa Emmanuelli Coronas",
      "Xavier D. Ortiz Torres",
      "Edmy Ayala Rosado",
      "Andrea Isabel López",
      "Nathaly Villareal",
      "Angélica Valdés Valderrama",
      "Natalia Vázquez Berríos",
      "TEMBOL Design Studio",
    ],
    ...TEMBOL,
    year: 2025,
    category: "Diseño integral / transversal",
    fact: { figure: "7 × 7", line: "líderes comunitarios, siete proyectos de ciencia propios." },
    excerpt:
      "Pensamiento de diseño y método científico, juntos, para que las comunidades conviertan lo que saben en evidencia.",
    description: [
      "Ciencia CoLab acompaña a líderes comunitarios de Puerto Rico en el desarrollo de proyectos de ciencia vinculados a problemas identificados en sus propios contextos. El proceso combina herramientas del pensamiento de diseño, el diseño centrado en las personas y el método científico para pasar de la observación de un problema a la formulación, experimentación y evaluación de posibles respuestas.",
      "El sistema se organiza en módulos de aprendizaje, herramientas metodológicas y tarjetas-guía co-diseñadas para acompañar cada etapa. Las comunidades aportan el conocimiento situado sobre sus condiciones de vida y utilizan estos recursos para estructurarlo, producir evidencia y desarrollar sus propuestas. Hasta 2025, dos cohortes con siete líderes comunitarios desarrollaron siete proyectos.",
    ],
    client: "Ciencia Puerto Rico",
    clientUrl: "https://www.cienciapr.org",
    producer: "Ciencia Puerto Rico",
    photography: "Ramdwin González Otero",
    links: [{ label: "Ver el proyecto", href: "https://tembol.co/work/cienciacolab" }],
    bidUrl: `${BID}ciencia-colab/`,
    images: [
      img("ciencia-colab", 1, 1800, 1013, "Tarjeta-guía de Ciencia CoLab en negro sobre fondo amarillo"),
      img("ciencia-colab", 6, 1800, 1013, "Portada de las tarjetas para líderes creativos, en amarillo y negro"),
      img("ciencia-colab", 5, 1800, 1013, "Juego completo de tarjetas-guía en blanco, negro y amarillo"),
      img("ciencia-colab", 2, 1800, 1013, "Talleres con líderes comunitarios y la cohorte del programa"),
      img("ciencia-colab", 3, 1800, 1013, "Identidad de Ciencia CoLab y los cinco pasos del proceso"),
      img("ciencia-colab", 4, 1800, 1013, "Participantes trabajando con las herramientas del programa"),
    ],
  },
  {
    id: "puerto-rico-negrx",
    chapter: 1,
    title: "Puerto Rico Negrx",
    credit: "Luis “Tuto” González Medina, Marina Reyes Franco, María Elena Ortiz, Abdiel Torres Tirado",
    authors: ["Luis “Tuto” González Medina", "Marina Reyes Franco", "María Elena Ortiz", "Abdiel Torres Tirado"],
    ...TEMBOL,
    year: 2025,
    category: "Diseño gráfico y comunicación visual",
    fact: { figure: "39", line: "artistas afropuertorriqueños en un libro que marca la historia del MAC." },
    excerpt:
      "El libro de la primera exhibición a esta escala sobre la negritud en una de las grandes instituciones de arte de Puerto Rico.",
    description: [
      "Puerto Rico Negrx es la pieza que documenta la exhibición del mismo título, Puerto Rico Negrx que estuvo en muestra desde el 20 de octubre de 2023 hasta el 1ro de septiembre de 2024 en el Museo de Arte contemporáneo de Puerto Rico. Esta contiene textos escritos por las curadoras de la exhibición y de 4 invitadxs que ofrecen sus perspectivas sobre el tema. También, las obras de 39 artistas afropuertorriqueños y documentación de performances en vivo.",
      "Aunque con algunos precedentes clave y de mucho valor durante la década de los 80s y 90s, Puerto Rico Negrx es la primera exhibición a esta escala en una de las más importantes instituciones de arte en Puerto Rico. El libro es una pieza que marca este tiempo en la historia del arte contemporáneo resaltando el tema de la negritud a una escala mayor en nuestro archipiélago. TEMBOL colaboró directamente con las curadoras María Elena Ortíz y Marina Reyes Franco en el diseño de esta publicación que se lanzó el 24 de abril de 2025.",
    ],
    client: "Museo de Arte Contemporáneo de Puerto Rico (MAC)",
    clientUrl: "https://www.museomac.org/",
    producer: "María Elena Ortiz, Marina Reyes Franco",
    photography: "Raquel Pérez Puig (obras y salas), Ricardo Alcaraz (performances), Emanuel González Ríos (libro)",
    links: [
      { label: "Ver el proyecto", href: "https://tembol.co/work/prnegrx" },
      { label: "Ver el video", href: "https://vimeo.com/1210543617" },
    ],
    bidUrl: `${BID}puerto-rico-negrx/`,
    images: [
      img("puerto-rico-negrx", 2, 1800, 1200, "El libro Puerto Rico Negrx acostado: portada negra con un patrón óptico blanco sobre fondo violeta"),
      img("puerto-rico-negrx", 1, 1800, 1200, "El libro de pie, con lomo y contraportada, sobre fondo violeta"),
      img("puerto-rico-negrx", 5, 1800, 1200, "Una mano hojea el libro y deja ver el canto verde lima"),
      img("puerto-rico-negrx", 3, 1800, 1200, "Páginas del índice en negro con tipografía violeta"),
      img("puerto-rico-negrx", 4, 1800, 1200, "Apertura del texto curatorial de María Elena Ortiz y Marina Reyes Franco"),
      img("puerto-rico-negrx", 6, 1800, 1013, "Mosaico de páginas interiores con obras y performances"),
    ],
  },
  {
    id: "quiebrasol",
    hidden: true,
    chapter: 1,
    title: "Quiebrasol",
    credit: "Alberto Rigau",
    authors: ["Alberto Rigau"],
    studio: "Estudio Interlínea",
    studioUrl: "https://www.interlinea.pr/",
    year: 2025,
    category: "Diseño de moda textil y complementos",
    fact: { figure: "4", line: "quiebrasoles de Henry Klumb, impresos en 3D como carteras." },
    excerpt:
      "La Biblioteca Lázaro, el edificio IBM, la Escuela de Derecho y el Convento de los Dominicos, convertidos en objeto que se carga al hombro.",
    description: [
      "Contexto: Puerto Rico conserva una herencia modernista tropical única. Henry Klumb ejerció 40 años en la isla, dejando edificios donde el quiebrasol es elemento arquitectónico definitorio.",
      "Enfoque: ¿Cómo trasladar el DNA visual de la arquitectura de Klumb a un objeto cotidiano que active su legado fuera del edificio?",
      "Proceso: Se identificaron cuatro patrones de quiebrasoles de edificios emblemáticos: la Biblioteca José M. Lázaro, el edificio IBM, la Escuela de Derecho y el Convento de los Frailes Dominicos. Cada patrón fue reproducido fielmente en 3D y aplicado como superficie exterior de un bolso. El diseño modular permite intercambiar carcasas e interiores en color. Un cierre magnético resuelve la apertura. La impresión 3D hizo viable la producción de una familia de objetos con alto detalle y personalización.",
      "Resultado: Una familia de bolsos que convierte el quiebrasol de Klumb en objeto portable, fusionando patrimonio arquitectónico moderno con diseño contemporáneo.",
    ],
    links: [],
    bidUrl: `${BID}quiebrasol/`,
    images: [
      img("quiebrasol", 1, 1800, 1800, "Cartera Quiebrasol blanca con interior azul y correa naranja"),
      img("quiebrasol", 2, 1800, 1800, "Cartera Quiebrasol blanca con interior rojo"),
      img("quiebrasol", 3, 1800, 1800, "Cartera Quiebrasol blanca con interior verde claro"),
      img("quiebrasol", 4, 1800, 1800, "Cartera Quiebrasol blanca con interior verde"),
      img("quiebrasol", 5, 1800, 1800, "Cartera Quiebrasol abierta con su cierre magnético"),
      img("quiebrasol", 6, 1800, 975, "Modelos 3D de las carcasas e interiores intercambiables"),
    ],
  },
  {
    id: "voces-graficas",
    chapter: 1,
    title: "Voces Gráficas de América Latina",
    credit: "José R. Menéndez, Tatiana Gómez Gaggero",
    authors: ["José R. Menéndez", "Tatiana Gómez Gaggero"],
    ...BUENA,
    year: 2025,
    category: "Diseño gráfico y comunicación visual",
    fact: { figure: "117", line: "carteles latinoamericanos en Providence, en inglés, español y aimara." },
    excerpt: "Un archivo vivo de cartel latinoamericano que circula por comunidades de Nueva Inglaterra.",
    description: [
      "Gráfica Latina es un proyecto de investigación de Buena Gráfica Social Studio: un archivo digital y móvil de carteles latinoamericanos que circula por comunidades de Rhode Island y Massachusetts. Su exposición Voces Gráficas de América Latina, presentada en el WaterFire Arts Center de Providence, respondió al acceso limitado a colecciones de diseño gráfico latinoamericano en Nueva Inglaterra y a la necesidad de activar este patrimonio visual desde el territorio y sus comunidades.",
      "El enfoque fue crear un modelo expositivo flexible, comunitario y multilingüe, capaz de conectar el conocimiento gráfico latinoamericano con públicos especializados y con la diáspora latinoamericana local. El proceso incluyó la curaduría de 117 carteles y tres esculturas, un recorrido abierto y transitable, una identidad visual basada en tipografías de diseñadores latinoamericanos, y materiales interpretativos en inglés, español y aimara.",
      "La entrada gratuita, visitas guiadas, talleres y programación pública ampliaron el acceso y la participación. El aprendizaje principal fue entender el diseño como archivo vivo, herramienta pedagógica y espacio de representación comunitaria.",
    ],
    client: "WaterFire Arts Center",
    clientUrl: "https://waterfire.org/about-the-waterfire-arts-center/",
    photography: "Glenn Turner, Jenni Ugarte · Video: Ross Lipmann",
    links: [
      { label: "Ver el proyecto", href: "https://graficalatina.com/" },
      { label: "Ver el video", href: "https://vimeo.com/1142743571" },
    ],
    bidUrl: `${BID}voces-graficas-de-america-latina-exposicion-grafica-latina/`,
    images: [
      img("voces-graficas", 1, 1500, 1000, "Sala de la exposición con muros amarillos y carteles latinoamericanos"),
      img("voces-graficas", 2, 1500, 1000, "Visitante frente a un muro de carteles en el WaterFire Arts Center"),
      img("voces-graficas", 3, 1500, 1000, "Recorrido abierto de la exposición con una escultura al centro"),
      img("voces-graficas", 6, 1080, 720, "Una visitante mira de cerca un cartel de gran formato"),
      img("voces-graficas", 4, 1800, 1013, "Guía de sala bilingüe en rosado y amarillo"),
      img("voces-graficas", 5, 1500, 1000, "Afiches y piezas digitales de la apertura de la exposición"),
    ],
  },
  {
    id: "martes-de-galeria",
    chapter: 2,
    title: "Martes de Galería",
    credit: "Javier Olmeda Raya, Jan Alexis Figueroa",
    authors: ["Javier Olmeda Raya", "Jan Alexis Figueroa"],
    studio: "Constructo",
    studioUrl: "https://constructopr.com/",
    year: 2026,
    category: "Diseño integral / transversal",
    fact: { figure: "3,000+", line: "personas caminan la ciudad en cada edición." },
    excerpt:
      "Sin ministerio de cultura, un sistema para coordinar más de 40 espacios de arte, 25 comercios y 4 museos. Catorce ediciones y contando.",
    description: [
      "Ante la ausencia de un ministerio de cultura y el debilitamiento de su equivalente, el peso de la gestión cultural en Puerto Rico ha recaído en manos de individuos trabajando desde la auto-gestión. El panorama cultural es altamente desarticulado. En este contexto, nos dimos a la tarea de diseñar un sistema para coordinar con los distintos productores culturales en un área urbana con una rica historia cultural y hacer un evento recurrente que sirviera de plataforma cultural para artistas, diseñadores, literarios, cineastas y teatreros.",
      "El proyecto se planteó como un catalítico urbano para convertir la ciudad en un escaparate cultural. Se fomenta el desarrollo artístico, económico y social de la ciudad a la misma vez que puede redundar en la adopción de políticas públicas en beneficio de las comunidades que habitan el sector.",
      "La primera fase consistió en diseñar un programa de exhibiciones trimestrales en Constructo para generar tráfico de visitantes al área. La segunda fase consistió en invitar a otros productores culturales del área para que se unieran a la iniciativa. Así se logró aumentar la frecuencia del evento a uno mensual. La tercera fase incluyó el desarrollo de dos herramientas fundamentales: el mapa y la ruta del trolley para que los visitantes pudieran ubicarse y desplazarse alrededor de la cuidad.",
      "Luego de 14 ediciones realizadas, el proyecto integra sobre 40 espacios artísticos, sobre 25 comercios locales y 4 de los museos más importantes de la ciudad. Se estima que más de 3,000 personas visitan y caminan, compran arte y consumen en tiendas, bares y restaurantes durante el evento. Durante este tiempo, se ha generado una importante actividad económica alrededor de la cultura. Se han realizado acuerdos colaborativos con las principales instituciones culturales y académicas de la ciudad. Ha aparecido nuevos espacios dedicados al arte y el diseño.",
      "Se ha perfeccionado la integración entre colaboradores y se han optimizado tanto el mapa como la ruta del transporte colectivo, que actualmente movilizan a 2,000 personas por evento. A nivel municipal, el ayuntamiento ha comenzado a revisar y actualizar algunas de sus políticas públicas en temas de seguridad, iluminación y accesos peatonales. La iniciativa se ha convertido en un motor de desarrollo artístico y económico en uno de los momentos de crisis más graves en Puerto Rico.",
    ],
    client: "Martes de Galería",
    clientUrl: "https://martesdegaleria.org/",
    producer: "Alexis Figueroa, Coral Cotto, Yarimil Figueroa, Rina Herrero, Javier Olmeda",
    photography: "Javier Olmeda",
    links: [{ label: "Ver el video", href: "https://www.instagram.com/reel/DcHTznnPf5u/" }],
    bidUrl: `${BID}martes-de-galeria-la-ciudad-como-escaparate-cultural/`,
    images: [
      img("martes-de-galeria", 1, 1800, 1200, "Una galería llena de gente durante un Martes de Galería"),
      img("martes-de-galeria", 4, 1800, 1200, "Público en la acera frente a Constructo de noche"),
      img("martes-de-galeria", 3, 1800, 750, "Mapa de la ruta con los espacios participantes y la ruta del trolley"),
      img("martes-de-galeria", 2, 1800, 1200, "Visitantes recorren una sala de exhibición"),
      img("martes-de-galeria", 5, 1800, 1442, "Un espacio de arte con murales y público"),
      img("martes-de-galeria", 6, 1800, 1200, "Un bar con luz cálida durante el evento"),
    ],
  },
  {
    id: "tu-haces-parte",
    chapter: 2,
    title: "Tú haces parte",
    credit: "José R. Menéndez, Tatiana Gómez Gaggero",
    authors: ["José R. Menéndez", "Tatiana Gómez Gaggero"],
    ...BUENA,
    year: 2025,
    category: "Diseño gráfico y comunicación visual",
    fact: { figure: "200+", line: "banderines conectan diez parques en el centro de Providence." },
    excerpt:
      "Señalética como infraestructura pública: tipografía, ilustración y relatos locales, revisados con más de veinte organizaciones.",
    description: [
      "“Tú haces parte” es un proyecto de señalética y placemaking para Downtown Providence Parks Network, en Providence, Rhode Island, que conecta diez parques y 20 acres de espacios verdes en el centro de Providence y junto al río. El proyecto responde a un territorio urbano fragmentado, con alta diversidad cultural e histórica, mediante un sistema de orientación que también funciona como marca pública de pertenencia.",
      "La estrategia utiliza la tipografía, la ilustración y la señalética para guiar a peatones, visibilizar relatos locales y activar el espacio común. El proceso incluyó más de 200 banderines personalizados en postes de luz, organizados en categorías de orientación, arquitectura y cultura; mapas con códigos QR conectados a un mapa digital; y la colaboración con más de veinte organizaciones comunitarias e históricas para revisar imágenes, relatos y referencias.",
      "El resultado unifica la red de parques bajo un lenguaje visual claro y acogedor, promoviendo caminabilidad, acceso, participación ciudadana y sentido de pertenencia. El aprendizaje principal fue entender la señalética como infraestructura pública, cultural y comunitaria.",
    ],
    client: "Downtown Providence Parks Network",
    clientUrl: "https://www.downtownparks.org/wayfinding/",
    photography: "Ross Lippman",
    links: [
      { label: "Ver el proyecto", href: "https://www.downtownparks.org/wayfinding/" },
      { label: "Ver el video", href: "https://vimeo.com/1177864286" },
    ],
    bidUrl: `${BID}tu-haces-parte-senaletica-y-placemaking-en-providence-ri/`,
    images: [
      img("tu-haces-parte", 1, 1800, 1256, "Paseo junto al río en Providence con banderines azules en los postes de luz"),
      img("tu-haces-parte", 4, 1800, 1200, "Banderín ilustrado en un poste frente a un edificio de ladrillo"),
      img("tu-haces-parte", 3, 1800, 1199, "Señal verde con mapa del parque y código QR"),
      img("tu-haces-parte", 2, 1800, 1200, "Calle peatonal arbolada con la señalética del sistema"),
      img("tu-haces-parte", 5, 1800, 1256, "Lámina del sistema de colores y categorías de banderines"),
      img("tu-haces-parte", 6, 1800, 1256, "Familia completa de banderines y su ubicación en el poste"),
    ],
  },
  {
    id: "puerto-rico-creativo",
    chapter: 3,
    title: "Puerto Rico Creativo",
    credit: "Dyanis De Jesús, Natalia Pi",
    authors: ["Dyanis De Jesús", "Natalia Pi"],
    studio: "Puerto Rico Creativo",
    studioUrl: "https://www.puertoricocreativo.com/",
    year: 2024,
    category: "Diseño gráfico y comunicación visual",
    fact: { figure: "400+", line: "profesionales en una comunidad que nació de un libro." },
    excerpt:
      "Una investigación sobre la economía creativa del país, traducida en una experiencia editorial clara, con “oasis” de datos y citas.",
    description: [
      "Puerto Rico Creativo documenta el desarrollo de la economía creativa del país y democratiza su conocimiento para fortalecer sus industrias, el empleo y la retención de talento. La pieza impresa transformó una investigación rigurosa en una experiencia editorial accesible y atractiva.",
      "El diseño tradujo datos e información compleja en una narrativa clara y fácil de navegar, utilizando un sistema visual basado en las secciones del libro, colores, patrones y gradientes de la identidad de marca. Los “oasis” - citas, datos y textos breves- generaron pausas y puntos de entrada para profundizar. Fotografía y video reforzaron la narrativa.",
      "La publicación amplió el acceso al conocimiento, fue presentada en más de 10 charlas y distribuida en formatos impreso y digital. Sus casos de estudio contribuyeron a crear una comunidad de diseño de más de 400 profesionales. El proyecto demostró el poder del diseño editorial para convertir investigación compleja en conocimiento ágil, comprensible y movilizador.",
    ],
    producer: "Dyanis De Jesús, Natalia Pi, Josue Oquendo, Carla Torres, Ricardo Burgos",
    photography: "Ángel Luis García",
    links: [
      { label: "Ver el proyecto", href: "https://www.puertoricocreativo.com/" },
      {
        label: "Descargar el libro (PDF)",
        href: "https://static1.squarespace.com/static/63be32fdf4d7d64f3ed2973d/t/65ba19ad388e256780f8ebca/1706695096305/PRC_librointeractivo.pdf",
      },
    ],
    bidUrl: `${BID}publicacion-puerto-rico-creativo/`,
    images: [
      img("puerto-rico-creativo", 1, 1800, 1165, "El libro Puerto Rico Creativo abierto en una página con cifras azules gigantes"),
      img("puerto-rico-creativo", 2, 1800, 1165, "Portadas del libro repetidas en diagonal con el dato 15,318 empleos"),
      img("puerto-rico-creativo", 3, 1800, 1165, "Página con un 30% rosado gigante y un abanico de páginas"),
      img("puerto-rico-creativo", 5, 1800, 1165, "Páginas interiores con datos y gráficas en colores de la marca"),
      img("puerto-rico-creativo", 4, 1800, 1165, "Páginas interiores con los “oasis” de datos y citas"),
      img("puerto-rico-creativo", 6, 1800, 1165, "Vista de todas las dobles páginas del libro"),
    ],
  },
  {
    id: "conoce-las-especies",
    chapter: 3,
    title: "Conoce las especies",
    credit:
      "Ramdwin González Otero, Rima Ibrahim, Luis “Tuto” González, Pedro Anibarro, Emanuel González, Ana Teresa Colón García, Félix Matos, Lorena Rivera Orraca, Jualiann Rosado, Natalia Muñoz, Anayari Fernández",
    authors: [
      "Ramdwin González Otero",
      "Rima Ibrahim",
      "Luis “Tuto” González",
      "Pedro Anibarro",
      "Emanuel González",
      "Ana Teresa Colón García",
      "Félix Matos",
      "Lorena Rivera Orraca",
      "Jualiann Rosado",
      "Natalia Muñoz",
      "Anayari Fernández",
    ],
    ...TEMBOL,
    year: 2026,
    category: "Diseño digital",
    fact: { figure: "1,500", line: "tarjetas de especies impresas para reforestar." },
    excerpt:
      "Una herramienta para escoger qué sembrar: árboles endémicos, nativos, naturalizados o introducidos. Hecha para Para la Naturaleza.",
    description: [
      "Conoce las especies es una herramienta digital para orientar la selección de árboles y arbustos en proyectos de reforestación en Puerto Rico. Reúne información botánica y académica con datos procedentes de iNaturalist y la Lista Roja de la UICN, y organiza las especies según su origen: endémicas, nativas, naturalizadas o introducidas.",
      "Cada ficha combina fotografías, ilustraciones, audiodescripciones y textos sobre distribución, tamaño, velocidad de crecimiento, servicios ecosistémicos y tolerancias. La plataforma traslada estos datos a un formato pensado para apoyar decisiones de plantación a escala individual, comunitaria o institucional. Desde su publicación en abril de 2026 se han impreso más de 1.500 tarjetas de especies para actividades de orientación del programa de reforestación.",
    ],
    client: "Para la Naturaleza",
    clientUrl: "https://www.paralanaturaleza.org",
    photography: "Ramdwin González, Emanuel González",
    links: [{ label: "Ver el proyecto", href: "https://www.paralanaturaleza.org/reforestacion/arboles" }],
    bidUrl: `${BID}arboles-para-la-naturaleza-conoce-las-especies/`,
    images: [
      img("conoce-las-especies", 1, 1500, 1000, "Manos sostienen un celular con la ficha de un árbol y una tarjeta impresa"),
      img("conoce-las-especies", 3, 1600, 1066, "Fotos de la app y las tarjetas usadas en el campo"),
      img("conoce-las-especies", 6, 1400, 933, "Actividades de siembra con las tarjetas de especies"),
      img("conoce-las-especies", 4, 1800, 1200, "Pantallas de la plataforma con filtros por origen y tamaño"),
      img("conoce-las-especies", 5, 1800, 1200, "Fichas de especies con ilustraciones de cada árbol"),
      img("conoce-las-especies", 2, 1800, 1200, "Base de datos de especies y siluetas de árboles"),
    ],
  },
  {
    id: "unfiguring",
    chapter: 3,
    title: "Unfiguring",
    credit: "José Ramón Menéndez López, Tatiana Gómez Gaggero",
    authors: ["José Ramón Menéndez López", "Tatiana Gómez Gaggero"],
    ...BUENA,
    year: 2024,
    category: "Diseño gráfico y comunicación visual",
    fact: { figure: "Retícula vs. desborde", line: "La identidad de una conferencia en Harvard sobre cómo comunicar ciencia." },
    excerpt:
      "El orden del canon científico contra tipografías que se desbordan. Incluye un programa que es también póster, impreso en risografía.",
    description: [
      "Unfiguring es la identidad visual de una conferencia del Mahindra Humanities Center de Harvard University dedicada a explorar formas de producir y comunicar investigación científica más allá del artículo académico convencional.",
      "El sistema gráfico convierte esa pregunta en una tensión visual: una retícula representa la estructura y el orden asociados al canon científico, mientras tipografías expresivas e imágenes desbordan y alteran esa organización. Esta lógica se aplica al logotipo, el sitio web, las piezas para redes sociales y las presentaciones, además de un desplegable impreso en risografía que funciona como programa y póster.",
      "La identidad utiliza así sus propias reglas gráficas para poner en escena el debate entre estructuras establecidas y otras formas posibles de comunicar conocimiento.",
    ],
    client: "Beatrice Steinert, Noah Toyonaga, Daniel Faccini, Soumya Ghosh",
    clientUrl: "https://www.unfiguring.org/",
    photography: "Tatiana Gómez Gaggero",
    links: [{ label: "Ver el proyecto", href: "https://www.unfiguring.org/" }],
    bidUrl: `${BID}unfiguring-experiments-in-the-practice-of-science-and-art/`,
    images: [
      img("unfiguring", 1, 1500, 1125, "El programa-póster de Unfiguring en risografía con letras que se desbordan de la retícula"),
      img("unfiguring", 2, 968, 1500, "Póster vertical de Unfiguring con la retícula rosada visible"),
      img("unfiguring", 3, 1800, 1013, "El desplegable impreso, abierto y cerrado, sobre fondo negro"),
      img("unfiguring", 4, 1500, 1000, "Sitio web y piezas para redes sociales de la conferencia"),
      img("unfiguring", 5, 1500, 1000, "El sitio web en pantalla de computadora y celular"),
      img("unfiguring", 6, 1500, 1000, "Panel de la conferencia con la identidad proyectada"),
    ],
  },
];

/** People index: who is behind the works, grouped by studio. */
/** The works shown on the page. */
export const BID26_WORKS = ALL_WORKS.filter((w) => !w.hidden);

/**
 * People index. `people` are the studio leads, set large; `team` is everyone
 * else BID credits on those works (co-authors and "Editor / Productor").
 */
export const BID26_STUDIOS: { studio: string; people: string[]; team: string[]; works: string[] }[] = [
  {
    studio: "TEMBOL",
    people: ["Ramdwin González Otero", "Luis “Tuto” González Medina"],
    team: [
      "Mónica Feliú Mójer",
      "Ana Luisa Emmanuelli Coronas",
      "Xavier D. Ortiz Torres",
      "Edmy Ayala Rosado",
      "Andrea Isabel López",
      "Nathaly Villareal",
      "Angélica Valdés Valderrama",
      "Natalia Vázquez Berríos",
      "Marina Reyes Franco",
      "María Elena Ortiz",
      "Abdiel Torres Tirado",
      "Rima Ibrahim",
      "Pedro Anibarro",
      "Emanuel González",
      "Ana Teresa Colón García",
      "Félix Matos",
      "Lorena Rivera Orraca",
      "Jualiann Rosado",
      "Natalia Muñoz",
      "Anayari Fernández",
    ],
    works: ["ciencia-colab", "puerto-rico-negrx", "conoce-las-especies"],
  },
  {
    studio: "Buena Gráfica Social Studio",
    people: ["José R. Menéndez López", "Tatiana Gómez Gaggero"],
    team: [],
    works: ["voces-graficas", "tu-haces-parte", "unfiguring"],
  },
  { studio: "HACEDORMAKER_ARQUITECTOS", people: ["José Fernando Vázquez Pérez"], team: [], works: ["el-parque"] },
  { studio: "AGar Estudio", people: ["Adriana C. García Soto"], team: [], works: ["devuelta-al-manglar"] },
  {
    studio: "Constructo",
    people: ["Javier Olmeda Raya", "Jan Alexis Figueroa"],
    team: ["Coral Cotto", "Yarimil Figueroa", "Rina Herrero"],
    works: ["martes-de-galeria"],
  },
  {
    studio: "Puerto Rico Creativo",
    people: ["Dyanis De Jesús", "Natalia Pi"],
    team: ["Josue Oquendo", "Carla Torres", "Ricardo Burgos"],
    works: ["puerto-rico-creativo"],
  },
];

/**
 * Everyone from Puerto Rico who sent work to BID26, from the submissions
 * sheet. `work` links a submission to its spread on this page.
 */
export const BID26_SUBMISSIONS: { name: string; projects: { title: string; work?: string }[] }[] = [
  { name: "Adriana C. García Soto", projects: [{ title: "Devuelta al manglar", work: "devuelta-al-manglar" }, { title: "Inmersión bioluminiscente en el Ecoexploratorio" }] },
  {
    name: "Alberto Rigau",
    projects: [
      { title: "¡Vaqueros ahí!" },
      { title: "Señalética Paseos Imaging" },
      { title: "Tandem" },
      { title: "Señalética Clínica de Ojos" },
      { title: "Traba" },
      { title: "Quiebrasol" },
    ],
  },
  { name: "Dyanis De Jesús", projects: [{ title: "Puerto Rico Creativo", work: "puerto-rico-creativo" }] },
  { name: "Elizabeth Barreto Ortiz", projects: [{ title: "Tiro Libre" }] },
  { name: "Génesis Velez Cantres", projects: [{ title: "Buka" }, { title: "Sons" }] },
  { name: "Javier Olmeda Raya", projects: [{ title: "Martes de Galería", work: "martes-de-galeria" }] },
  {
    name: "José Fernando Vázquez Pérez",
    projects: [{ title: "El Parque", work: "el-parque" }],
  },
  {
    name: "José R. Menéndez López",
    projects: [
      { title: "Voces Gráficas de América Latina", work: "voces-graficas" },
      { title: "Tú haces parte", work: "tu-haces-parte" },
      { title: "Unfiguring", work: "unfiguring" },
    ],
  },
  { name: "Josué Oquendo Natal", projects: [{ title: "Tipografía «Modestia»" }, { title: "Exhibición 10 años MAC en el Barrio" }] },
  { name: "Luis “Tuto” González Medina", projects: [{ title: "Puerto Rico Negrx", work: "puerto-rico-negrx" }] },
  { name: "María Laura Martínez", projects: [{ title: "Rediseño Cervezas del Oeste" }] },
  { name: "Natalia Cristina Núñez Torres", projects: [{ title: "Plan Estatal de Conservación Histórica de P.R. 2025-2030" }] },
  { name: "Pedro Medina", projects: [{ title: "Supermotive" }, { title: "Asekia: cosechando cambio" }] },
  {
    name: "Ramdwin González Otero",
    projects: [
      { title: "Ciencia CoLab", work: "ciencia-colab" },
      { title: "Conoce las especies", work: "conoce-las-especies" },
      { title: "Veredas para la Naturaleza" },
    ],
  },
];

/**
 * Puerto Rico in the FABid26, the BID academic forum (program of 27 Oct 2026).
 * Times are Madrid time. `cases` lists the work a talk presents.
 */
export const BID26_FORUM: {
  name: string;
  affiliation: string;
  talks: { when: string; title: string; note?: string; cases?: { title: string; credit: string }[] }[];
}[] = [
  {
    name: "Aurorisa Mateo",
    affiliation: "Escuela de Artes, Diseño e Industrias Creativas, Universidad del Sagrado Corazón",
    talks: [
      { when: "Mié 4 nov · 9:50", title: "Olores de la memoria: diseño olfativo y aprendizaje en el contexto intertropical" },
      {
        when: "Mié 4 nov · 10:00",
        title: "Marcas territoriales: diseño, identidad y valor de origen desde Puerto Rico",
        note: "Uno de los temas del Día del Diseño en Sagrado, en abril. Presenta tres casos:",
        cases: [
          { title: "Del Oeste", credit: "Josué Oquendo Natal" },
          {
            title: "Café El Mesón",
            credit: "Moisés Cruz, Mampostea’o, con Ramdwin González Otero, Uriel García, Esteban Mercado y Yetzal González",
          },
          { title: "Agua Palma Coyor", credit: "Pedro Medina Leandry" },
        ],
      },
    ],
  },
  {
    name: "Ana Rebecca Campos",
    affiliation: "Escuela de Artes, Diseño e Industrias Creativas, Universidad del Sagrado Corazón",
    talks: [
      { when: "Jue 5 nov · 9:50", title: "Diseñar desde Puerto Rico: materiales, manufactura y territorios productivos" },
      { when: "Jue 5 nov · 10:30", title: "Hacia una historia del diseño en Puerto Rico: cultura material indígena" },
    ],
  },
];
