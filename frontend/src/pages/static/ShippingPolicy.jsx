import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function ShippingPolicy() {
  return (
    <>
      <Helmet>
        <title>Shipping Policy | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6">
        <Badge variant="sage">STORE POLICIES</Badge>
        <h1 className="font-editorial text-4xl font-extrabold text-primary">Shipping & Delivery Policy</h1>
        <div className="p-3 bg-butter/30 border border-butter rounded-xl text-xs font-semibold text-primary">
          ℹ️ Note to Store Owner: This is a customizable shipping policy template. You can update shipping fees and partner details in the Admin Settings.
        </div>

        <Card className="p-8 bg-white space-y-4 text-xs sm:text-sm text-primary/85 leading-relaxed font-medium">
          <h3 className="font-editorial text-lg font-bold text-primary">1. Dispatch Timelines</h3>
          <p>
            All That Jalta Diya candles and bouquets are poured, set, and assembled by hand in our Mumbai studio. Orders are prepared and handed over to our courier partners within <strong>2 to 4 business days</strong>.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">2. Shipping Charges</h3>
          <p>
            - Standard Courier Delivery: Flat ₹99 across India.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">3. Transit & Couriers</h3>
          <p>
            We partner with reliable express couriers including Blue Dart, Delhivery, and DTDC. Once dispatched, a live tracking number and courier link is dispatched to your registered email and accessible in your customer dashboard.
          </p>

          <h3 className="font-editorial text-lg font-bold text-primary">4. Heat & Shock Protection</h3>
          <p>
            Candle wax is sensitive to temperature. We pack every bouquet with thermal-insulated wraps and custom honeycomb shock buffers so your gift arrives intact and pristine.
          </p>
        </Card>
      </div>
    </>
  );
}
