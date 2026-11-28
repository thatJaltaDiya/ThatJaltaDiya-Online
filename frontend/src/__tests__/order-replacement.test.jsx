import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext.jsx';
import { OrderHistory } from '../pages/account/OrderHistory.jsx';
import { api } from '../services/api.js';

vi.mock('../services/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('OrderHistory Replacement UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows Replace button with delivery disclaimer instead of Cancel Order and triggers replace endpoint for delivered orders', async () => {
    api.get.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ord-pending',
          orderNumber: 'TJD-1001',
          createdAt: new Date().toISOString(),
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paymentMethod: 'RAZORPAY',
          total: 129900,
          replacementRequested: false,
          items: [{ id: 'it-1', productId: 'p-1', productName: 'Rose Bouquet', quantity: 1, price: 129900 }],
        },
        {
          id: 'ord-delivered',
          orderNumber: 'TJD-1002',
          createdAt: new Date().toISOString(),
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          paymentMethod: 'RAZORPAY',
          total: 99900,
          replacementRequested: false,
          items: [{ id: 'it-2', productId: 'p-2', productName: 'Lotus Candle', quantity: 1, price: 99900 }],
        },
      ],
    });

    api.post.mockResolvedValue({
      success: true,
      message: 'Replacement request sent to our team. No extra charges apply.',
      data: {
        id: 'ord-delivered',
        orderNumber: 'TJD-1002',
        status: 'DELIVERED',
        replacementRequested: true,
      },
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <OrderHistory />
        </ToastProvider>
      </MemoryRouter>
    );

    const replaceButtons = await screen.findAllByRole('button', { name: /replace/i });
    expect(replaceButtons).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();

    // Non-delivered order has Replace disabled; delivered order has Replace enabled
    expect(replaceButtons[0]).toBeDisabled();
    expect(replaceButtons[1]).not.toBeDisabled();

    // Delivery disclaimer is displayed
    expect(screen.getAllByText(/replacement will only be possible after the product is delivered/i).length).toBeGreaterThanOrEqual(1);

    // Click Replace on delivered order
    fireEvent.click(replaceButtons[1]);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/orders/ord-delivered/replace');
    });
  });
});
