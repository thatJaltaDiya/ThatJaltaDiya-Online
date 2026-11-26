import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function FAQ() {
  const faqs = [
    {
      q: "Are the candle bouquets meant to be burned or kept as decor?",
      a: "Both! Most customers keep them on bedside tables, dressers, or entryway consoles for 3 to 6 months as an everlasting floral centerpiece. When you are ready to burn, simply remove the individual candle stems from the wrapping and place them on heat-safe ceramic trays."
    },
    {
      q: "How does That Jalta Diya ship candle bouquets safely across India without damage?",
      a: "Every bouquet is encased in a custom structural honeycomb shock-casing, cushioned with eco-friendly crinkle paper, and packaged in rigid corrugated gift boxes. Even during hot summer transit, we ship insulated parcels so the wax arrives crisp and beautiful."
    },
    {
      q: "What wax do you use?",
      a: "We pour 100% natural, ethically sourced soy wax blended with pure beeswax for sculptural rigidity. Our products contain zero paraffin, zero petroleum derivatives, and lead-free cotton wicks."
    },
    {
      q: "How long does delivery take?",
      a: "Because each candle creation is handcrafted, orders are dispatched within 2-3 business days. Delivery takes 3-5 days across metro cities in India and 4-7 days for other regions."
    },
    {
      q: "What is your candle care advice for optimal burn?",
      a: "Always trim the cotton wick to 1/4 inch before lighting. On your first burn, allow the melt pool to reach the edges to prevent tunneling. Never leave a burning candle unattended or in direct drafts."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Frequently Asked Questions | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="text-center space-y-3">
          <Badge variant="butter" tilt={true}>CANDLE CARE & ANSWERS</Badge>
          <h1 className="font-editorial text-4xl sm:text-5xl font-extrabold text-primary">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-primary/70 font-medium">
            Everything you need to know about our candle bouquets, burning rituals, and gifting orders.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <Card key={idx} className="p-6 bg-white space-y-2">
              <h3 className="font-editorial text-base sm:text-lg font-bold text-primary">
                {faq.q}
              </h3>
              <p className="text-xs sm:text-sm text-primary/80 leading-relaxed font-medium">
                {faq.a}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
