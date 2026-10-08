"use client";

import { useCallback, useRef, useState } from "react";

import { setFry } from "@/app/vitrina/actions";
import type { PublicWork } from "@/lib/vitrina/types";

import FriesBurst, { type Burst } from "./FriesBurst";
import FriesButton from "./FriesButton";
import VitrinaSlide from "./VitrinaSlide";

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 40;
/** Some mobile browsers also fire dblclick after a double-tap; ignore it. */
const TOUCH_DBLCLICK_MS = 600;
/** From the rail button the fan opens up and to the left, away from the frame's edge. */
const BUTTON_AIM = -120;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True when the event started on a link or button (they never give papitas). */
function onControl(target: EventTarget) {
  return target instanceof Element && target.closest("a, button") !== null;
}

/**
 * A Vitrina slide with papitas: the rail button toggles, a double-tap / double-click only gives.
 * Giving one either way sends fries flying; taking one back only pops the button.
 */
export default function WorkSlide({
  work,
  index,
  eager,
  textHidden,
  onToggleText,
}: {
  work: PublicWork;
  index: number;
  eager: boolean;
  textHidden: boolean;
  onToggleText: () => void;
}) {
  const [fries, setFries] = useState({ count: work.friesCount, given: work.given });
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [pop, setPop] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const lastTouchBurst = useRef(-Infinity);
  const request = useRef(0);
  const burstId = useRef(0);

  async function change(on: boolean) {
    const before = fries;
    if (before.given === on) return;
    setFries({ count: Math.max(before.count + (on ? 1 : -1), 0), given: on });
    const id = ++request.current;
    const result = await setFry(work.id, on).catch(() => null);
    if (id !== request.current) return; // a newer tap already won
    setFries(result ?? before);
  }

  function burstAt(clientX: number, clientY: number, aim?: number) {
    const box = frame.current?.getBoundingClientRect();
    if (box && !prefersReducedMotion()) {
      const burst = { id: ++burstId.current, x: clientX - box.left, y: clientY - box.top, aim };
      setBursts((list) => [...list, burst]);
    }
  }

  function giveAt(clientX: number, clientY: number) {
    burstAt(clientX, clientY);
    setPop((n) => n + 1);
    void change(true); // a double-tap only ever gives
  }

  const removeBurst = useCallback((id: number) => setBursts((list) => list.filter((b) => b.id !== id)), []);

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || onControl(event.target)) return; // mouse uses onDoubleClick
    const prev = lastTap.current;
    const near = prev && Math.hypot(event.clientX - prev.x, event.clientY - prev.y) < DOUBLE_TAP_PX;
    if (prev && near && event.timeStamp - prev.t < DOUBLE_TAP_MS) {
      lastTap.current = null;
      lastTouchBurst.current = event.timeStamp;
      giveAt(event.clientX, event.clientY);
    } else {
      lastTap.current = { t: event.timeStamp, x: event.clientX, y: event.clientY };
    }
  }

  function onDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (onControl(event.target) || event.timeStamp - lastTouchBurst.current < TOUCH_DBLCLICK_MS) return;
    giveAt(event.clientX, event.clientY);
  }

  return (
    <VitrinaSlide
      work={work}
      index={index}
      eager={eager}
      textHidden={textHidden}
      onToggleText={onToggleText}
      frameProps={{ ref: frame, onPointerUp, onDoubleClick }}
      overlay={bursts.map((burst) => (
        <FriesBurst key={burst.id} burst={burst} onDone={removeBurst} />
      ))}
      rail={
        <FriesButton
          given={fries.given}
          count={fries.count}
          pop={pop}
          onToggle={(button) => {
            if (!fries.given) {
              const box = button.firstElementChild?.getBoundingClientRect(); // the round icon, not the count
              if (box) burstAt(box.left + box.width / 2, box.top + box.height / 2, BUTTON_AIM);
            }
            setPop((n) => n + 1);
            void change(!fries.given);
          }}
        />
      }
    />
  );
}
