import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function ReturnPolicy() {
  return (
    <>
      <Helmet>
        <title>Returns & Refunds | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6">
        <Badge variant="accent">STORE POLICIES</Badge>
        <h1 className="font-editorial text-4xl font-extrabold text-primary">Returns & Refund Policy</h1>
        <div className="p-3 bg-butter/30 border border-butter rounded-xl text-xs font-semibold text-primary">
          ℹ️ Note to Store Owner: This policy covers artisanal handcrafted products. Editable via Admin settings.
        </div>

        <Card className="p-8 bg-white space-y-4 text-xs sm:text-sm text-primary/85 leading-relaxed font-medium">
          <h3 className="font-editorial text-lg font-bold text-primary">1. Artisanal Nature of Products</h3>
          <p>
            Because each candle bouquet and wax sculpture is custom hand-poured in small batches, subtle variations in pastel color tint, floral petal curves, and finish are natural characteristics of handcrafted art.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">2. Transit Damage Guarantee</h3>
          <p>
            We take exceptional pride in our shockproof packaging. In the rare event that an item arrives damaged or broken during transit:
            <br />
            1. Email us at <a href="mailto:hello@thatjaltadiya.com" className="font-bold underline">hello@thatjaltadiya.com</a> within <strong>48 hours</strong> of delivery.
            <br />
            2. Attach a clear unboxing photo or short video showing the damaged piece and parcel label.
            <br />
            3. We will immediately dispatch a fresh replacement free of charge or issue a full refund.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">3. Non-Returnable Items</h3>
          <p>
            For hygiene and safety reasons, burnt candles, customized gift notes, and sale items are non-returnable once opened and undamaged.
          </p>
        </Card>
      </div>
    </>
  );
}
