import React, { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  const mark = useRef(null);

  // Size the wordmark to the footer's width, whatever the brand name is.
  useLayoutEffect(() => {
    const el = mark.current;
    if (!el || !el.parentElement) return;

    const fit = () => {
      el.style.fontSize = '100px';
      const w = el.parentElement.clientWidth * 0.97;
      if (el.scrollWidth > 0) {
        el.style.fontSize = `${(w / el.scrollWidth) * 100}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  return (
    <footer className="bg-primary text-canvas border-t-2 border-border mt-12 relative overflow-hidden pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-8 md:grid-cols-12">
        <div className="md:col-span-6 flex items-center gap-4">
          <img
            src="/logo.jpg"
            alt="That Jalta Diya"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/60 object-cover shadow-pop-sm flex-shrink-0"
          />
          <p className="max-w-[22ch] font-sans text-[clamp(1.35rem,2.4vw,2rem)] font-medium leading-[1.1] tracking-[-0.03em] text-white">
            Handcrafted candles, bouquets &amp; gifts for every celebration.
          </p>
        </div>

        <div className="md:col-span-2 md:col-start-11">
          <p className="text-[11px] font-semibold tracking-widest text-canvas/50 uppercase mb-2.5">
            Pages
          </p>
          <ul className="space-y-1.5 text-sm text-canvas/90">
            <li>
              <Link to="/privacy-policy" className="hover:text-accent transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-accent transition-colors">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-4 text-xs sm:text-sm text-canvas/50">
        <p className="tabular-nums">© {new Date().getFullYear()} That Jalta Diya.</p>
      </div>

      <p
        ref={mark}
        aria-hidden="true"
        className="font-sans font-semibold pointer-events-none mx-auto w-max origin-bottom select-none whitespace-nowrap text-center leading-[0.74] text-canvas/95 tracking-[-0.03em]"
        style={{ marginBottom: '-0.06em' }}
      >
        That Jalta Diya
      </p>
    </footer>
  );
}
