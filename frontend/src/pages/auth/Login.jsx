import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { TurnstileWidget } from '../../components/ui/TurnstileWidget.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../services/api.js';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin 2FA step state ('credentials' | 'totp' | 'enroll')
  const [authStep, setAuthStep] = useState('credentials');
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [enrollSetup, setEnrollSetup] = useState(null);

  const { login, completeSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/shop';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const extra = authStep === 'totp'
        ? (useBackup ? { backupCode: backupCode.trim() } : { totpCode: totpCode.trim() })
        : {};
      const authData = await login(email, password, turnstileToken, extra);

      if (authData?.twoFactorRequired) {
        setAuthStep('totp');
        setTurnstileToken('');
        showToast({ type: 'info', message: 'Enter the 6-digit code from your authenticator app.' });
        return;
      }

      if (authData?.twoFactorEnrollmentRequired) {
        const setupRes = await api.get('/admin/2fa/setup');
        setEnrollSetup(setupRes.data);
        setAuthStep('enroll');
        showToast({ type: 'info', message: 'Set up 2FA to complete your Admin sign in.' });
        return;
      }

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

  const handleEnable2FA = async (e) => {
    e.preventDefault();
    if (!enrollSetup) return;
    setLoading(true);
    try {
      const res = await api.post('/admin/2fa/enable', {
        secret: enrollSetup.secret,
        token: totpCode.trim(),
        plainBackupCodes: enrollSetup.plainBackupCodes,
      });
      if (res.success) {
        completeSession(res.data.user, res.data.accessToken || res.data.token, res.data.csrfToken);
        showToast({ type: 'success', message: '2FA enabled! Welcome to Admin Console.' });
        navigate('/admin');
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Invalid 2FA verification code.' });
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
          {authStep === 'enroll' && enrollSetup ? (
            <form onSubmit={handleEnable2FA} className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <span>Admin Two-Factor Authentication Setup</span>
              </div>
              <p className="text-xs text-primary/70">
                Scan this QR code with Google Authenticator or Authy, save your backup codes, and enter the 6-digit code below.
              </p>
              {enrollSetup.qrCodeDataUrl && (
                <div className="flex justify-center p-3 bg-surface rounded-xl border border-border/20">
                  <img src={enrollSetup.qrCodeDataUrl} alt="2FA QR Code" className="w-44 h-44" />
                </div>
              )}
              <div className="p-2.5 bg-surface rounded-lg border border-border/20 text-[11px] font-mono break-all">
                <span className="font-bold block text-primary/60 mb-0.5">Manual Secret:</span>
                {enrollSetup.secret}
              </div>
              {Array.isArray(enrollSetup.plainBackupCodes) && enrollSetup.plainBackupCodes.length > 0 && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 text-[11px]">
                  <span className="font-bold block text-amber-900 mb-1">Save Backup Codes (one-time use):</span>
                  <div className="grid grid-cols-2 gap-1 font-mono text-amber-950">
                    {enrollSetup.plainBackupCodes.map((code) => (
                      <span key={code}>{code}</span>
                    ))}
                  </div>
                </div>
              )}
              <Input
                label="6-Digit Authenticator Code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
              />
              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full font-extrabold uppercase tracking-wider"
                isLoading={loading}
              >
                <span>Enable 2FA & Sign In</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          ) : authStep === 'totp' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <span>Two-Factor Verification</span>
              </div>
              {useBackup ? (
                <Input
                  label="Backup Code"
                  type="text"
                  required
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  placeholder="Enter backup code"
                />
              ) : (
                <Input
                  label="6-Digit Authenticator Code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                />
              )}
              <TurnstileWidget key="totp-turnstile" onVerify={setTurnstileToken} />
              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full font-extrabold uppercase tracking-wider"
                isLoading={loading}
              >
                <span>Verify & Sign In</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <div className="flex items-center justify-between text-xs font-bold pt-1">
                <button
                  type="button"
                  onClick={() => setUseBackup((prev) => !prev)}
                  className="text-accent hover:underline"
                >
                  {useBackup ? 'Use authenticator code' : 'Use a backup code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('credentials');
                    setTotpCode('');
                    setBackupCode('');
                    setTurnstileToken('');
                  }}
                  className="text-primary/60 hover:underline"
                >
                  Back
                </button>
              </div>
            </form>
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

              <TurnstileWidget key="pwd-turnstile" onVerify={setTurnstileToken} />

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
          )}

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
