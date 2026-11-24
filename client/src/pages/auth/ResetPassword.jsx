import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      if (res.success) {
        setSuccess(true);
        showToast({ type: 'success', message: 'Password reset successful! Please sign in.' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Password reset failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="font-editorial text-3xl font-extrabold text-primary mb-2">
          Set New Password
        </h1>
        <p className="text-xs text-primary/70 mb-6">Choose a strong, unique password for your account.</p>

        <Card className="p-6 bg-white text-left space-y-4">
          {success ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-primary">Your password has been successfully updated!</p>
              <Link to="/login" className="block pt-2">
                <Button variant="accent" className="w-full">Sign In Now</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                icon={Lock}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
              />
              <Button type="submit" variant="accent" className="w-full" isLoading={loading}>
                Update Password
              </Button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
