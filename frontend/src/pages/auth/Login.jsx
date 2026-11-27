import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/shop';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authData = await login(email, password);
      showToast({ type: 'success', message: 'Welcome back to That Jalta Diya! ✨' });
      if (authData?.user?.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate(redirectUrl);
      }
    } catch (err) {
      const message = err.details?.length
        ? err.details.map(d => d.message).join('; ')
        : (err.message || 'Invalid email or password.');
      showToast({
        type: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign In | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-6">
          <img
            src="/logo.jpg"
            alt="That Jalta Diya"
            className="w-14 h-14 rounded-full border-2 border-border object-cover shadow-pop-sm mx-auto mb-3"
          />
          <Badge variant="accent" tilt={true} className="mb-2">WELCOME BACK</Badge>
          <h1 className="font-editorial text-2xl sm:text-3xl font-extrabold text-primary">
            Sign In To Your Account
          </h1>
          <p className="text-xs text-primary/70 mt-1">Access your saved addresses, order tracking, and wishlist.</p>
        </div>

        <Card className="p-6 bg-white space-y-4">
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
            <div>
              <Input
                label="Password"
                type="password"
                icon={Lock}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-xs font-bold text-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full font-extrabold uppercase tracking-wider"
              isLoading={loading}
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="pt-4 border-t border-border/10 text-center text-xs font-medium text-primary/70">
            Don't have an account yet?{' '}
            <Link to={`/register?redirect=${encodeURIComponent(redirectUrl)}`} className="font-bold text-accent hover:underline">
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
