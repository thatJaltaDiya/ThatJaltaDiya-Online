import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function ReturnPolicy() {
  return (
    <>
      <Helmet>
        <title>Replacement Policy | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6">
        <Badge variant="accent">STORE POLICIES</Badge>
        <h1 className="font-editorial text-4xl font-extrabold text-primary">Replacement Policy</h1>

        <Card className="p-8 bg-white space-y-4 text-xs sm:text-sm text-primary/85 leading-relaxed font-medium">
          <h3 className="font-editorial text-lg font-bold text-primary">1. No Cancellation, Return, or Refund</h3>
          <p>
            Because every candle bouquet and gift hamper is handcrafted to order, we do not offer order cancellations, returns, or refunds once an order is placed.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">2. Free Replacement Only (After Delivery)</h3>
          <p>
            If your product arrives damaged or defective, we offer a <strong>replacement only</strong> with <strong>no extra charges</strong>.
            <br />
            1. Replacement is only possible <strong>after the order is marked Delivered</strong>.
            <br />
            2. Visit your <strong>Order History</strong> and click the <strong>Replace</strong> button on the delivered order to notify our team immediately.
            <br />
            3. We will inspect your request and dispatch a fresh replacement free of charge.
          </p>
        </Card>
      </div>
    </>
  );
}
