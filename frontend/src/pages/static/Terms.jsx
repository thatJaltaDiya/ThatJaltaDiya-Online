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
          <h3 className="font-editorial text-lg font-bold text-primary">1. Using Our Store</h3>
          <p>
            By visiting or placing an order on That Jalta Diya, you agree to follow these terms and our store policies.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">2. Products &amp; Pricing</h3>
          <p>
            Because our candles, bouquets, and gifts are handcrafted, minor variations in color, shape, or appearance may occur. Product prices and availability may change at any time without prior notice.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">3. Orders &amp; Delivery</h3>
          <p>
            Please make sure your delivery address and contact information are accurate at checkout. Delivery timelines may vary depending on your location and courier availability.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">4. Candle Safety</h3>
          <p>
            Please burn candles responsibly. Never leave a lit candle unattended, and keep it away from flammable objects, children, and pets.
          </p>
        </Card>
      </div>
    </>
  );
}
