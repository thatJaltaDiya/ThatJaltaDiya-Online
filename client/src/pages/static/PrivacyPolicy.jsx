import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6">
        <Badge variant="sage">PRIVACY</Badge>
        <h1 className="font-editorial text-4xl font-extrabold text-primary">Privacy Policy</h1>

        <Card className="p-8 bg-white space-y-4 text-xs sm:text-sm text-primary/85 leading-relaxed font-medium">
          <h3 className="font-editorial text-lg font-bold text-primary">1. Information We Collect</h3>
          <p>
            We collect the minimum information required to deliver your orders: your name, delivery address, email address, phone number, and optional recipient gift notes. We never sell or rent your personal information to third parties.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">2. Security & Payment Data</h3>
          <p>
            Your account passwords are encrypted using state-of-the-art Argon2id hashing algorithms. Payment details are handled securely by compliant payment gateways—our servers never store your credit/debit card numbers or CVV.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">3. Cookies & Session Storage</h3>
          <p>
            We use secure httpOnly cookies solely for keeping you safely authenticated. You can request deletion of your account and data at any time from your account settings.
          </p>
        </Card>
      </div>
    </>
  );
}
