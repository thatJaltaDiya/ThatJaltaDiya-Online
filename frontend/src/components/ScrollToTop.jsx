import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Ensures every route navigation opens at the top of the viewport.
 */
export function ScrollToTop({ children }) {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return children;
}
