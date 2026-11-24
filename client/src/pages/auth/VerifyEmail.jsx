import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { api } from '../../services/api.js';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error');
        setErrorMessage('Verification token is missing in the URL.');
        return;
      }

      try {
        const res = await api.post('/auth/verify-email', { token });
        if (res.success) {
          setStatus('success');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(err.message || 'Verification link expired or invalid.');
      }
    }
    verify();
  }, [token]);

  return (
    <>
      <Helmet>
        <title>Email Verification | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Card className="p-8 bg-white space-y-4">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto" />
              <h2 className="font-editorial text-2xl font-bold text-primary">Verifying Email...</h2>
              <p className="text-xs text-primary/70">Please wait while we confirm your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h2 className="font-editorial text-2xl font-bold text-primary">Email Verified! 🎉</h2>
              <p className="text-xs text-primary/70">
                Your account is activated and ready. You can now checkout and place gift orders!
              </p>
              <Link to="/shop" className="block pt-2">
                <Button variant="accent" className="w-full">
                  Start Shopping
                </Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-accent mx-auto" />
              <h2 className="font-editorial text-2xl font-bold text-primary">Verification Failed</h2>
              <p className="text-xs text-primary/70">{errorMessage}</p>
              <Link to="/login" className="block pt-2">
                <Button variant="outline" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
