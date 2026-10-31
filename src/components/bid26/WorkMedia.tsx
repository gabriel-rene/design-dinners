"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import type { Bid26Work } from "@/content/bid26";

import s from "./bid26.module.css";

/**
 * The interactive half of a work spread: the "Leer más" button, the draggable
 * image strip, and the side panel (native <dialog>) with the full BID text,
 * every image, credits and links. Tapping a strip image opens the panel too.
 */
export default function WorkMedia({ work, part }: { work: Bid26Work; part: "button" | "strip" }) {
  if (part === "button") return <PanelButton work={work} />;
  return <Strip work={work} />;
}

function openPanel(id: string) {
  const dialog = document.getElementById(`panel-${id}`) as HTMLDialogElement | null;
  dialog?.showModal();
}

function PanelButton({ work }: { work: Bid26Work }) {
  return (
    <>
      <button type="button" className={s.more} onClick={() => openPanel(work.id)} aria-haspopup="dialog">
        Leer más
      </button>
      <Panel work={work} />
    </>
  );
}

function Strip({ work }: { work: Bid26Work }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Mouse drag-to-scroll; touch keeps native scrolling.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !ref.current) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      setDragging(true);
    }
    if (d.moved) ref.current.scrollLeft = d.left - dx;
  };
  const end = () => {
    setDragging(false);
    // Let the click that ends a drag see `moved` before it resets.
    setTimeout(() => (drag.current = null), 0);
  };

  return (
    <>
      <div
        ref={ref}
        className={s.strip}
        data-dragging={dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerLeave={end}
        role="group"
        aria-label={`Imágenes de ${work.title}`}
      >
        {work.images.map((im, k) => (
          <button
            key={im.src}
            type="button"
            onClick={() => {
              if (!drag.current?.moved) openPanel(work.id);
            }}
            aria-label={`Ver ${work.title}, imagen ${k + 1} de ${work.images.length}`}
          >
            <Image
              src={im.src}
              alt={im.alt}
              width={im.width}
              height={im.height}
              sizes="(max-width: 820px) 60vw, 360px"
              draggable={false}
            />
          </button>
        ))}
      </div>
      <span className={s.stripHint}>Arrastra para ver más →</span>
    </>
  );
}

function Panel({ work }: { work: Bid26Work }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      id={`panel-${work.id}`}
      className={s.dialog}
      aria-labelledby={`panel-${work.id}-title`}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className={s.dlg}>
        <button type="button" className={s.close} onClick={close}>
          Cerrar ✕
        </button>
        <span className={s.cat}>
          {work.category} · {work.year}
        </span>
        <h2 id={`panel-${work.id}-title`}>{work.title}</h2>
        <p className={s.credit}>
          {work.authors.join(", ")}
          <small>{work.studio}</small>
        </p>
        <div className={s.body}>
          {work.description.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </div>
        <div className={s.gallery}>
          {work.images.map((im) => (
            <Image
              key={im.src}
              src={im.src}
              alt={im.alt}
              width={im.width}
              height={im.height}
              sizes="(max-width: 680px) 100vw, 600px"
              loading="lazy"
            />
          ))}
        </div>
        <dl className={s.facts}>
          {work.client && (
            <>
              <dt>Cliente</dt>
              <dd>
                {work.clientUrl ? (
                  <a href={work.clientUrl} target="_blank" rel="noopener noreferrer">
                    {work.client}
                  </a>
                ) : (
                  work.client
                )}
              </dd>
            </>
          )}
          {work.producer && (
            <>
              <dt>Edición y producción</dt>
              <dd>{work.producer}</dd>
            </>
          )}
          {work.photography && (
            <>
              <dt>Fotografía</dt>
              <dd>{work.photography}</dd>
            </>
          )}
          <dt>Estudio</dt>
          <dd>
            {work.studioUrl ? (
              <a href={work.studioUrl} target="_blank" rel="noopener noreferrer">
                {work.studio}
              </a>
            ) : (
              work.studio
            )}
          </dd>
        </dl>
        <div className={s.links}>
          <a className={s.primary} href={work.bidUrl} target="_blank" rel="noopener noreferrer">
            Ver en la galería BID26 ↗
          </a>
          {work.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>
    </dialog>
  );
}
