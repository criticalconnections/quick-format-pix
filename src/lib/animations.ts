import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const EASE = "power3.out";

/**
 * Smoothly fade + slide a container in on mount. Used as a page-enter transition.
 * Children with [data-reveal] are staggered in after the container settles.
 */
export function usePageEnter<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.set(el, { autoAlpha: 0, y: 12 });
      const reveals = el.querySelectorAll<HTMLElement>("[data-reveal]");
      if (reveals.length) gsap.set(reveals, { autoAlpha: 0, y: 16 });

      const tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.to(el, { autoAlpha: 1, y: 0, duration: 0.55 });
      if (reveals.length) {
        tl.to(
          reveals,
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06 },
          "-=0.35",
        );
      }
    }, el);
    return () => ctx.revert();
  }, []);

  return ref;
}

/**
 * Reveal-on-scroll for any element. Uses ScrollTrigger so items already in view
 * animate immediately and items below the fold ease in as the user scrolls.
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  selector = "[data-reveal-scroll]",
  deps: ReadonlyArray<unknown> = [],
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const items = root.querySelectorAll<HTMLElement>(selector);
      items.forEach((item) => {
        gsap.fromTo(
          item,
          { autoAlpha: 0, y: 20 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: EASE,
            scrollTrigger: {
              trigger: item,
              start: "top 88%",
              once: true,
            },
          },
        );
      });
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
