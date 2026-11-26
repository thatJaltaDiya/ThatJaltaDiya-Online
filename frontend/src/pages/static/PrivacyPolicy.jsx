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
            We collect basic information you provide when creating an account or placing an order, including your name, email address, phone number, and delivery address.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">2. How We Use Your Information</h3>
          <p>
            Your details are used solely to process and deliver your orders, send order updates, and assist you with customer support. We do not sell or rent your personal information to third parties.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">3. Payments &amp; Security</h3>
          <p>
            All online payments are processed securely through trusted third-party payment providers. We do not store your credit card, debit card, or banking details.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">4. Contact &amp; Data Requests</h3>
          <p>
            If you have any questions about your privacy or wish to update or delete your account information, please reach out to us at hello@thatjaltadiya.com.
          </p>
        </Card>
      </div>
    </>
  );
}
