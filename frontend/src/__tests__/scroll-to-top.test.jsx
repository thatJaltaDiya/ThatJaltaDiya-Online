import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { ScrollToTop } from '../components/ScrollToTop.jsx';

describe('ScrollToTop Wrapper', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('scrolls to top on initial mount and route pathname changes', () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop>
          <Routes>
            <Route path="/" element={<Link to="/shop">Go Shop</Link>} />
            <Route path="/shop" element={<div>Shop Page</div>} />
          </Routes>
        </ScrollToTop>
      </MemoryRouter>
    );

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    window.scrollTo.mockClear();

    fireEvent.click(getByRole('link', { name: /go shop/i }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });
});
