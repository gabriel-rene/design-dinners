"use client";

/* eslint-disable @next/next/no-img-element -- local SVG brand assets need no optimization */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { PULSO_COPY, type RigorIcon } from "@/content/pulso";
import type { PulsoLang } from "@/lib/pulso/validate";

import PulsoForm from "./PulsoForm";
import s from "./pulso.module.css";

const SWATCH = { red: s.swatchRed, yellow: s.swatchYellow, cream: s.swatchCream } as const;

const ICONS: Record<RigorIcon, ReactNode> = {
  compare: (
    <>
      <path d="M7 7h10M7 12h10M7 17h6" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  language: (
    <>
      <path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 4-3 7-6 9" />
      <path d="M13 21l4-10 4 10M14.5 17h5" />
    </>
  ),
  doc: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </>
  ),
  globe: (
    <>
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
};

function MarqueeRun({ items }: { items: string[] }) {
  return (
    <>
      {[...items, ...items].map((item, i) => (
        <span key={i} className="contents">
          <span className={s.marqueeItem}>{item}</span>
          <img src="/brand/icon-mayo-cream.svg" alt="" />
        </span>
      ))}
    </>
  );
}

export default function PulsoPage({
  initialLang,
  header,
  footer,
}: {
  initialLang: PulsoLang;
  header: ReactNode;
  footer: ReactNode;
}) {
  const [lang, setLang] = useState<PulsoLang>(initialLang);
  const t = PULSO_COPY[lang];

  // Keep <html lang> and the shareable ?lang=en link in step with the toggle.
  useEffect(() => {
    document.documentElement.lang = lang;
    const url = new URL(window.location.href);
    if (lang === "en") url.searchParams.set("lang", "en");
    else url.searchParams.delete("lang");
    window.history.replaceState(window.history.state, "", url);
  }, [lang]);

  return (
    <main className={s.page}>
      {header}
      <div className={s.wrap}>
        <div className={s.langRow}>
          <div className={s.lang} role="group" aria-label={t.langLabel}>
            {(["es", "en"] as const).map((code) => (
              <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)} lang={code}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className={s.hero} aria-labelledby="pulso-titulo">
        <div className={`${s.wrap} ${s.heroGrid}`}>
          <div className={s.heroText}>
            <h1 id="pulso-titulo">
              <span className={s.line}>
                <span style={{ "--i": 0 } as CSSProperties}>Pulso del</span>
              </span>
              <span className={s.line}>
                <span style={{ "--i": 1 } as CSSProperties}>Diseño PR</span>
              </span>
            </h1>
            <p className={s.lede}>{t.hero.lede}</p>
            <div className={s.ctas}>
              <a className={`dd-btn ${s.btn} ${s.btnRed}`} href="#unete">
                {t.hero.cta}
              </a>
              <a className={s.textLink} href="#la-cuenta">
                {t.hero.more}
              </a>
            </div>
          </div>
          <div>
            <dl className={s.slip}>
              {t.slip.rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className={s.by}>{t.slip.by}</p>
          </div>
        </div>

        <div className={s.pulse} aria-hidden="true">
          <svg viewBox="0 0 1200 160" preserveAspectRatio="none">
            <path
              pathLength={1}
              d="M0 104 H250 l14 -10 l12 10 H330 l16 22 l22 -122 l24 150 l18 -50 H520 l12 -8 l12 8 H690 l12 14 l14 -54 l16 70 l12 -30 H860 l12 -8 l12 8 H1010 l12 14 l14 -54 l16 70 l12 -30 H1200"
            />
          </svg>
        </div>
      </section>

      <div className={`dd-marquee ${s.marquee}`} aria-hidden="true">
        <div className={`dd-marquee-track ${s.marqueeTrack}`}>
          <MarqueeRun items={t.marquee} />
        </div>
        <div className={`dd-marquee-track ${s.marqueeTrack}`}>
          <MarqueeRun items={t.marquee} />
        </div>
      </div>

      {/* LA CUENTA */}
      <section className={s.block} id="la-cuenta" aria-labelledby="pulso-cuenta">
        <div className={`${s.wrap} ${s.billGrid}`}>
          <div>
            <h2 className={s.h2} id="pulso-cuenta">
              {t.bill.title}
            </h2>
            {t.bill.paragraphs.map((text) => (
              <p key={text} className={s.intro}>
                {text}
              </p>
            ))}
          </div>

          <div>
            <div className={s.receiptWrap}>
              <article className={s.receipt} aria-labelledby="pulso-receipt">
                <div className={s.receiptHead}>
                  <img src="/brand/primary-black.svg" alt="" />
                  <p id="pulso-receipt">{t.bill.head}</p>
                </div>
                <hr className={s.rule} />
                {t.bill.lines.map((line) => (
                  <div key={line.value} className={s.lineItem}>
                    <span>
                      {line.label}
                      {line.note && <small>{line.note}</small>}
                    </span>
                    <span className={s.dots} />
                    <span className={s.val}>{line.value}</span>
                  </div>
                ))}
                <hr className={s.rule} />
                <div className={s.total}>
                  <span className={s.totalLabel}>{t.bill.total}</span>
                  <span className={s.totalValue}>{t.bill.totalValue}</span>
                </div>
                <span className={s.stamp} aria-hidden="true">
                  {t.bill.stamp}
                </span>
              </article>
            </div>
            <p className={s.sources}>{t.bill.sources}</p>
          </div>
        </div>
      </section>

      {/* EL RITMO */}
      <section className={`${s.block} ${s.rhythm}`} aria-labelledby="pulso-ritmo">
        <div className={s.wrap}>
          <h2 className={s.h2} id="pulso-ritmo">
            {t.rhythm.title}
          </h2>
          <p className={s.intro}>{t.rhythm.intro}</p>

          <div className={s.year} aria-hidden="true">
            <svg viewBox="0 0 1200 200">
              <path className={s.base} d="M0 120 H1200" />
              <line className={s.reportLine} x1="360" y1="22" x2="360" y2="74" />
              <circle className={s.report} cx="360" cy="16" r="8" />
              {t.rhythm.months.map((month, i) => {
                const x = 60 + i * 100;
                return (
                  <g key={month}>
                    <line className={s.tick} x1={x} y1="152" x2={x} y2="160" />
                    <text className={i % 3 !== 0 ? s.minor : undefined} x={x} y="186" textAnchor="middle">
                      {month}
                    </text>
                  </g>
                );
              })}
              <path className={`${s.beat} ${s.beatBig}`} d="M-4 120 l10 -8 l12 8 h8 l14 24 l20 -136 l24 160 l16 -48 h10" />
              {[336, 636, 936].map((x) => (
                <path key={x} className={`${s.beat} ${s.beatSmall}`} d={`M${x} 120 l10 18 l14 -58 l16 74 l12 -34`} />
              ))}
            </svg>
          </div>

          <div className={s.legend}>
            {t.rhythm.legend.map((item) => (
              <div key={item.color}>
                <h3>
                  <i className={`${s.swatch} ${SWATCH[item.color]}`} />
                  <span>{item.title}</span>
                </h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>

          <div className={s.milestones}>
            {t.rhythm.milestones.map((m) => (
              <div key={m.when} className={m.now ? s.now : undefined}>
                <b>{m.when}</b>
                <span>{m.what}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LO QUE VAMOS A MEDIR */}
      <section className={s.block} aria-labelledby="pulso-menu">
        <div className={s.wrap}>
          <h2 className={s.h2} id="pulso-menu">
            {t.menu.title}
          </h2>
          <p className={s.intro}>{t.menu.intro}</p>
          <div className={s.menu}>
            {t.menu.dishes.map((dish) => (
              <div key={dish.title} className={s.dish}>
                <div className={s.dishHead}>
                  <h3>{dish.title}</h3>
                  <span className={s.dots} />
                  <span className={`${s.tag} ${dish.quarterly ? s.tagPulse : s.tagYear}`}>
                    {dish.quarterly ? t.menu.quarterly : t.menu.annual}
                  </span>
                </div>
                <p>{dish.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RIGOR */}
      <section className={`${s.block} ${s.flushTop}`} aria-labelledby="pulso-rigor">
        <div className={s.wrap}>
          <h2 className={s.h2} id="pulso-rigor">
            {t.rigor.title}
          </h2>
          <div className={s.rigorGrid}>
            {t.rigor.items.map((item) => (
              <div key={item.icon} className={s.ruleItem}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {ICONS[item.icon]}
                </svg>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOS FALTAN SILLAS */}
      <section className={`${s.block} ${s.wanted}`} aria-labelledby="pulso-buscamos">
        <div className={s.wrap}>
          <h2 className={s.h2} id="pulso-buscamos">
            {t.wanted.title}
          </h2>
          <p className={s.intro}>{t.wanted.intro}</p>
          <div className={s.roles}>
            {t.wanted.roles.map((role) => (
              <div key={role.title} className={s.role}>
                <h3>{role.title}</h3>
                <p>{role.what}</p>
                <p className={s.get}>
                  <b>{t.wanted.inReturn}</b>
                  <span>{role.get}</span>
                </p>
              </div>
            ))}
          </div>
          <p className={s.you}>{t.wanted.you}</p>
          <div className={s.ctas}>
            <a className={`dd-btn ${s.btn} ${s.btnCream}`} href="#unete">
              {t.wanted.cta}
            </a>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className={s.block} id="unete" aria-labelledby="pulso-unete">
        <div className={`${s.wrap} ${s.joinGrid}`}>
          <div className={s.joinAside}>
            <h2 className={s.h2} id="pulso-unete">
              {t.form.title}
            </h2>
            <p className={s.intro}>{t.form.intro}</p>
            <img className={s.mascot} src="/brand/mascot-full-color.svg" alt="" aria-hidden="true" />
          </div>
          <div>
            <PulsoForm copy={t.form} lang={lang} />
          </div>
        </div>
      </section>
      {footer}
    </main>
  );
}
