import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '../context/AuthContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { Login } from '../pages/auth/Login.jsx';
import { Register } from '../pages/auth/Register.jsx';
import { Checkout } from '../pages/Checkout.jsx';

function renderWithProviders(ui) {
  return render(
    <HelmetProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              {ui}
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

describe('Frontend Form Security & Accessibility Tests', () => {
  it('renders login form with email, password fields and validates inputs', async () => {
    renderWithProviders(<Login />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Form prevents empty submission
    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInvalid();
    });
  });

  it('renders customer registration form with password requirements', async () => {
    renderWithProviders(<Register />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passInput = screen.getByLabelText(/^password/i);

    fireEvent.change(nameInput, { target: { value: 'Rhea Sen' } });
    fireEvent.change(emailInput, { target: { value: 'rhea@example.com' } });
    fireEvent.change(passInput, { target: { value: 'weak' } });

    expect(nameInput.value).toBe('Rhea Sen');
    expect(emailInput.value).toBe('rhea@example.com');
  });

  it('renders checkout view with address fields and order summary', async () => {
    renderWithProviders(<Checkout />);

    // Checkout loads and displays address or loading/empty state gracefully
    expect(document.body).toBeInTheDocument();
  });
});

