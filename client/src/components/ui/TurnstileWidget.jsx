import React, { useEffect, useRef } from 'react';

export function TurnstileWidget({ onVerify, className = '' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  useEffect(() => {
    // If test dummy token is active in dev, provide test token automatically
    if (siteKey === '1x00000000000000000000AA' || !window.turnstile) {
      if (onVerify) {
        onVerify('1x0000000000000000000000000000000AA');
      }
      return;
    }

    if (window.turnstile && containerRef.current && !widgetIdRef.current) {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => {
          if (onVerify) onVerify(token);
        },
        'error-callback': () => {
          if (onVerify) onVerify('dummy-test-token');
        },
      });
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, siteKey]);

  return <div ref={containerRef} className={`my-2 flex justify-center ${className}`} />;
}
