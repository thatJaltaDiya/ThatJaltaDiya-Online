import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6">
        <Badge variant="butter">LEGAL</Badge>
        <h1 className="font-editorial text-4xl font-extrabold text-primary">Terms of Service</h1>

        <Card className="p-8 bg-white space-y-4 text-xs sm:text-sm text-primary/85 leading-relaxed font-medium">
          <h3 className="font-editorial text-lg font-bold text-primary">1. Acceptance of Terms</h3>
          <p>
            By accessing and placing orders through That Jalta Diya, you agree to comply with our store policies, pricing terms, and shipping guidelines.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">2. Product Descriptions & Photography</h3>
          <p>
            We photograph all items in natural daylight to capture true pastel wax tones. Minor variations in shade may occur due to screen calibration differences.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">3. Candle Burning Safety Disclaimer</h3>
          <p>
            Customers are responsible for burning candles responsibly. Never leave open flames unattended. Keep away from flammable drapes, children, and pets. That Jalta Diya is not liable for damages resulting from unattended or improper burns.
          </p>
        </Card>
      </div>
    </>
  );
}
