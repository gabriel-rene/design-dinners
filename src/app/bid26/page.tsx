import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import ChapterRail from "@/components/bid26/ChapterRail";
import HeroPile from "@/components/bid26/HeroPile";
import PeopleIndex, { type PeopleRow } from "@/components/bid26/PeopleIndex";
import WorkMedia from "@/components/bid26/WorkMedia";
import s from "@/components/bid26/bid26.module.css";
import About from "@/components/landing/About";
import SiteHeader from "@/components/SiteHeader";
import {
  BID26_CHAPTERS,
  BID26_FORUM,
  BID26_GALLERY_URL,
  BID26_STUDIOS,
  BID26_SUBMISSIONS,
  BID26_WORKS,
  type Bid26Work,
} from "@/content/bid26";

const TITLE = "Puerto Rico en la BID26 — Design Dinners";
const DESCRIPTION =
  "Puerto Rico en la Bienal Iberoamericana de Diseño 2026, en Madrid. Las obras, sus temas, la gente que las hizo y todas las postulaciones de la isla.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: "Puerto Rico en la BID26",
    description: DESCRIPTION,
    images: [{ url: "/bid26/devuelta-al-manglar/6.webp", width: 1600, height: 1353 }],
  },
};

/** Layouts cycle per spread so no two neighbors share a composition. */
const LAYOUTS = ["", s.flip, s.wide] as const;

function WorkSpread({ work, layout }: { work: Bid26Work; layout: string }) {
  const cover = work.images[0];
  return (
    <article id={work.id} className={`${s.work} ${layout}`} aria-labelledby={`${work.id}-title`}>
      <figure className={s.cover}>
        <Image
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          sizes={layout === s.wide ? "(max-width: 1320px) 100vw, 1320px" : "(max-width: 820px) 100vw, 800px"}
        />
      </figure>
      <div className={s.text}>
        <span className={s.cat}>
          {work.category} · {work.year}
        </span>
        <h3 id={`${work.id}-title`} className="dd-reveal-title">{work.title}</h3>
        <p className={s.credit} data-long={work.authors.length > 4 || undefined}>
          {work.credit}
          <small>{work.studio}</small>
        </p>
        <div className={s.fact}>
          <strong>{work.fact.figure}</strong>
          <span>{work.fact.line}</span>
        </div>
        <p className={s.excerpt}>{work.excerpt}</p>
        <WorkMedia work={work} part="button" />
      </div>
      <WorkMedia work={work} part="strip" />
    </article>
  );
}

export default function Bid26Page() {
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";
  const byChapter = BID26_CHAPTERS.map((_, i) => BID26_WORKS.filter((w) => w.chapter === i));
  // The last print sits on top of the pile: lead with the mangrove.
  const pile = [
    ...BID26_WORKS.filter((w) => w.id !== "devuelta-al-manglar"),
    BID26_WORKS.find((w) => w.id === "devuelta-al-manglar")!,
  ];
  const submissionCount = BID26_SUBMISSIONS.reduce((n, p) => n + p.projects.length, 0);
  const people: PeopleRow[] = BID26_STUDIOS.map((st) => ({
    studio: st.studio,
    people: st.people,
    team: st.team,
    works: st.works.map((id) => {
      const w = BID26_WORKS.find((x) => x.id === id)!;
      return { id, title: w.title, cover: w.images[0].src };
    }),
  }));

  return (
    <main className={s.page}>
      <HeroPile works={pile}>
        <div className={s.topbar}>
          <SiteHeader whatsappUrl={whatsappUrl} current="bid26" tone="dark" contained={false} />
        </div>
        <div className={s.heroCopy}>
          <h1 id="bid26-title">De PeErre a Madrid.</h1>
          <p>
            Puerto Rico llegó a la Bienal Iberoamericana de Diseño con parques, libros, manglares
            virtuales y ciencia hecha en comunidad. Esta es su historia, y la de quienes los hicieron.
          </p>
        </div>
      </HeroPile>

      <section className={s.intro} aria-label="Sobre la BID26">
        <p className={s.lede}>
          La BID es la gran vitrina del diseño iberoamericano. Este año, <em>Puerto Rico entró a su galería</em>. No vinieron a decorar: vinieron a resolver inundaciones, memoria, ciencia y
          ciudad.
        </p>
        <p className={s.introMeta}>
          <b>BID26</b>
          Central de Diseño · Matadero Madrid
          <br />
          Cuatro temas. Seis estudios.
          <br />
          <a href={BID26_GALLERY_URL} target="_blank" rel="noopener noreferrer">
            Ver la galería oficial ↗
          </a>
        </p>
      </section>

      <ChapterRail chapters={BID26_CHAPTERS} counts={byChapter.map((w) => w.length)} />

      {BID26_CHAPTERS.map((c, ci) => (
        <section
          key={c.title}
          id={`capitulo-${ci + 1}`}
          data-chapter={ci}
          className={s.chapter}
          style={{ "--bg": c.bg, "--fg": c.fg, "--accent": c.accent } as React.CSSProperties}
          aria-labelledby={`capitulo-${ci + 1}-title`}
        >
          <div className={s.opener}>
            <span className={s.kicker}>
              {c.kicker} · {byChapter[ci].length} proyectos
            </span>
            <h2 id={`capitulo-${ci + 1}-title`} className="dd-reveal-title">{c.title}</h2>
            <p>{c.intro}</p>
            <div className={s.thumbs}>
              {byChapter[ci].map((w, ti) => (
                <a
                  key={w.id}
                  href={`#${w.id}`}
                  aria-label={w.title}
                  className="dd-reveal-plate"
                  style={{ "--dd-tilt": `${ti % 2 ? 3 : -3}deg` } as React.CSSProperties}
                >
                  <Image src={w.images[0].src} alt="" width={96} height={96} sizes="96px" />
                </a>
              ))}
            </div>
          </div>
          {byChapter[ci].map((w, wi) => (
            <WorkSpread key={w.id} work={w} layout={LAYOUTS[(wi + ci) % LAYOUTS.length]} />
          ))}
        </section>
      ))}

      <section className={s.who} aria-labelledby="quien-titulo">
        <h2 id="quien-titulo" className="dd-reveal-title">Quién está detrás</h2>
        <PeopleIndex rows={people} />
      </section>

      <section className={s.forum} aria-labelledby="foro-titulo">
        <h2 id="foro-titulo" className="dd-reveal-title">
          En el foro académico
        </h2>
        <p className={s.forumLede}>
          La BID también investiga. En el FABid26, su foro académico, cuatro docentes de la Universidad del
          Sagrado Corazón llevan cuatro ponencias y un póster sobre el diseño hecho en Puerto Rico.
        </p>
        <div className={s.forumGrid}>
          {BID26_FORUM.map((p) => (
            <article key={p.name}>
              <h3>{p.name}</h3>
              <p className={s.forumAff}>{p.affiliation}</p>
              <ol>
                {p.talks.map((t) => (
                  <li key={t.title}>
                    <span className={s.forumWhen}>{t.when}</span>
                    <span className={s.forumTitle}>{t.title}</span>
                    {t.note && <span className={s.forumNote}>{t.note}</span>}
                    {t.cases && (
                      <ul>
                        {t.cases.map((c) => (
                          <li key={c.title}>
                            <b>{c.title}</b> · {c.credit}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className={s.subs} aria-labelledby="postulaciones-titulo">
        <h2 id="postulaciones-titulo" className="dd-reveal-title">
          Todas las postulaciones
        </h2>
        <p className={s.subsLede}>
          {submissionCount} propuestas de {BID26_SUBMISSIONS.length} diseñadores de Puerto Rico se postularon a
          la BID26. Aquí están todas.
        </p>
        <ul className={s.subsList}>
          {BID26_SUBMISSIONS.map((p) => (
            <li key={p.name}>
              <span className={s.subsName}>{p.name}</span>
              <ul>
                {p.projects.map((pr) => (
                  <li key={pr.title}>
                    {pr.work ? (
                      <a href={`#${pr.work}`}>
                        {pr.title}
                        <span className={s.subsMark}>En la galería</span>
                      </a>
                    ) : (
                      pr.title
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.end} aria-labelledby="cierre-titulo">
        <h2 id="cierre-titulo" className="dd-reveal-title">El diseño se sienta a cenar. Y a veces, viaja.</h2>
        <p>
          Design Dinners celebra a la gente que pone a Puerto Rico en la mesa del diseño iberoamericano. La
          próxima conversación es en la cena.
        </p>
        <div className={s.ctas}>
          <a href={whatsappUrl}>Únete al grupo de WhatsApp</a>
          <Link className={s.ghost} href="/eventos">
            Próximo Design Dinner →
          </Link>
        </div>
        <p className={s.credits}>
          Textos e imágenes cortesía de la{" "}
          <a href={BID26_GALLERY_URL} target="_blank" rel="noopener noreferrer">
            Bienal Iberoamericana de Diseño
          </a>{" "}
          y de cada autor. Créditos fotográficos en cada proyecto.
        </p>
      </section>

      <About whatsappUrl={whatsappUrl} />
    </main>
  );
}
