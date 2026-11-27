import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Flame, Lock, Mail, User, Phone, Check, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/shop';

  const hasUpper = /[A-Z]/.test(form.password);
  const hasLower = /[a-z]/.test(form.password);
  const hasNumber = /[0-9]/.test(form.password);
  const hasLength = form.password.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasUpper || !hasLower || !hasNumber || !hasLength) {
      showToast({ type: 'error', message: 'Password does not meet complexity requirements.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      };
      if (form.phone && form.phone.trim()) {
        payload.phone = form.phone.trim();
      }

      const res = await register(payload);
      setRegistered(true);
      showToast({ type: 'success', message: 'Account created! Verification link sent to your email.' });
    } catch (err) {
      const message = err.details?.length
        ? err.details.map(d => d.message).join('; ')
        : (err.message || 'Registration failed.');
      showToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-border flex items-center justify-center mx-auto mb-4 shadow-pop">
          <Mail className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-editorial text-3xl font-extrabold text-primary mb-2">Check Your Inbox! 💌</h2>
        <p className="text-sm text-primary/80 mb-6 font-medium">
          We sent a verification link to <strong>{form.email}</strong>. Please click the link to activate your gifting account before placing orders.
        </p>
        <Link to="/login">
          <Button variant="accent">Proceed to Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Create Account | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-md mx-auto px-4 py-14">
        <div className="text-center mb-6">
          <img
            src="/logo.jpg"
            alt="That Jalta Diya"
            className="w-14 h-14 rounded-full border-2 border-border object-cover shadow-pop-sm mx-auto mb-3"
          />
          <Badge variant="sage" tilt={true} className="mb-2">JOIN OUR COMMUNITY</Badge>
          <h1 className="font-editorial text-2xl sm:text-3xl font-extrabold text-primary">
            Create Customer Account
          </h1>
        </div>

        <Card className="p-6 bg-white space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              icon={User}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your Name"
            />
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
            <Input
              label="Phone Number (Optional)"
              icon={Phone}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Password"
              type="password"
              icon={Lock}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Create strong password"
            />

            {/* Password Quality Criteria Checklist */}
            <div className="p-3 rounded-xl bg-surface text-[11px] font-bold text-primary/70 space-y-1">
              <div className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-700' : ''}`}>
                <Check className={`w-3.5 h-3.5 ${hasLength ? 'opacity-100' : 'opacity-30'}`} />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper && hasLower ? 'text-emerald-700' : ''}`}>
                <Check className={`w-3.5 h-3.5 ${hasUpper && hasLower ? 'opacity-100' : 'opacity-30'}`} />
                <span>Uppercase & lowercase letters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700' : ''}`}>
                <Check className={`w-3.5 h-3.5 ${hasNumber ? 'opacity-100' : 'opacity-30'}`} />
                <span>At least one number (0-9)</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full font-extrabold uppercase tracking-wider"
              isLoading={loading}
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="pt-4 border-t border-border/10 text-center text-xs font-medium text-primary/70">
            Already have an account?{' '}
            <Link to={`/login?redirect=${encodeURIComponent(redirectUrl)}`} className="font-bold text-accent hover:underline">
              Sign in here
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
