import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      showToast({ type: 'success', message: 'Reset link dispatched if account exists.' });
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Error requesting reset.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="font-editorial text-3xl font-extrabold text-primary mb-2">
          Forgot Password
        </h1>
        <p className="text-xs text-primary/70 mb-6">
          Enter your registered email and we will send you a secure link to reset your password.
        </p>

        <Card className="p-6 bg-white text-left space-y-4">
          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-primary">
                If an account exists for {email}, a password reset link has been dispatched.
              </p>
              <Link to="/login" className="block pt-2">
                <Button variant="outline" size="sm">Back to Sign In</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                icon={Mail}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <Button type="submit" variant="accent" className="w-full" isLoading={loading}>
                Send Reset Link
              </Button>
              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-bold text-primary/70 hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
