import gsap from 'gsap';

export function animateShepherdStep(step: any): void {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const el = step?.getElement?.() as HTMLElement | null;
  if (!el) return;

  const content = el.querySelector('.shepherd-content');
  const text = el.querySelector('.shepherd-text');
  const footer = el.querySelector('.shepherd-footer');

  if (content) {
    gsap.fromTo(
      content,
      { opacity: 0, scale: 0.93, y: 12 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.32,
        ease: 'back.out(1.4)',
        clearProps: 'transform,opacity',
      },
    );
  }

  if (text) {
    gsap.fromTo(
      text,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        delay: 0.06,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
    );
  }

  if (footer) {
    gsap.fromTo(
      footer,
      { opacity: 0, y: 4 },
      {
        opacity: 1,
        y: 0,
        duration: 0.22,
        delay: 0.1,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
    );
  }
}
