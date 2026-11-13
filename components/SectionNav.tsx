"use client";

import { useEffect, useRef, useState } from "react";

const links = [
  { id: "home", label: "Home" },
  { id: "earrings", label: "All Earrings" },
  { id: "collections", label: "Collections" },
  { id: "contact", label: "Contact" },
] as const;
type Section = (typeof links)[number]["id"];

export default function SectionNav() {
  const [active, setActive] = useState<Section>("home");
  const nav = useRef<HTMLElement>(null);
  const pending = useRef<{ top: number; expires: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    let settling: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      frame = 0;
      if (pending.current) {
        if (Math.abs(window.scrollY - pending.current.top) > 3 && performance.now() < pending.current.expires) return;
        pending.current = null;
      }
      const marker = (nav.current?.closest("header")?.getBoundingClientRect().bottom ?? 100) + 24;
      let current: Section = "home";
      for (const { id } of links) {
        if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= marker) current = id;
      }
      // A short footer may never reach the header's activation line.
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) current = "contact";
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const interrupt = () => { pending.current = null; schedule(); };
    const keydown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) interrupt();
    };
    const settle = () => { clearTimeout(settling); settling = setTimeout(schedule, 1900); schedule(); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", interrupt);
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("keydown", keydown);
    window.addEventListener("hashchange", settle);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settling);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", interrupt);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("hashchange", settle);
    };
  }, []);

  return <nav ref={nav} className="section-nav" aria-label="Store sections">
    {links.map(({ id, label }) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={() => {
      const section = document.getElementById(id);
      if (!section) return;
      // Keep native anchor navigation, history and existing smooth-scroll behavior.
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      pending.current = {
        top: Math.max(0, Math.min(window.scrollY + section.getBoundingClientRect().top - padding, document.documentElement.scrollHeight - window.innerHeight)),
        expires: performance.now() + 1800,
      };
      setActive(id);
    }}>{label}</a>)}
  </nav>;
}
