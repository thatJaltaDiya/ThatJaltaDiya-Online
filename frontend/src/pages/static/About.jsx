import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Heart, Flame, ShieldCheck, Gift } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function About() {
  return (
    <>
      <Helmet>
        <title>Our Story & Craft | That Jalta Diya</title>
        <meta name="description" content="Discover the story behind That Jalta Diya, an artisanal candle bouquet and aesthetic gift atelier handcrafted in India." />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-4">
          <Badge variant="butter" tilt={true}>MEET THE MAKER</Badge>
          <h1 className="font-editorial text-4xl sm:text-6xl font-extrabold text-primary">
            Our Story: That Jalta Diya
          </h1>
          <p className="text-base sm:text-lg text-primary/80 font-medium max-w-2xl mx-auto leading-relaxed">
            A small kitchen dream that blossomed into an online candle bouquet atelier for hopeless romantics.
          </p>
        </div>

        <Card className="p-8 bg-surface space-y-6">
          <h2 className="font-editorial text-2xl font-bold text-primary">Why Candle Bouquets?</h2>
          <p className="text-sm sm:text-base text-primary/85 leading-relaxed font-medium">
            It started on a friend’s 21st birthday. I bought a gorgeous flower bouquet for ₹1,800, only to watch the petals turn brown and droop into the trash by Thursday. That hurt! We wanted to create a gift that captured the romantic grandeur of fresh garden blossoms, but would last for months as an aesthetic centerpiece before ever having to be lit.
          </p>
          <p className="text-sm sm:text-base text-primary/85 leading-relaxed font-medium">
            After months of testing natural soy waxes, cotton wicks, temperature curves, and hand-carved floral molds, our first batch of <strong>Rose & Peony Candle Bouquets</strong> was born. We began selling offline at local weekend markets and flea bazaars. The reaction was beyond anything we imagined—people stopped in their tracks, sniffing the delicate French vanilla and English rose fragrances, convinced they were real flowers!
          </p>
        </Card>

        {/* 3 Pillars of Our Craft */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white space-y-3">
            <div className="w-10 h-10 rounded-full bg-butter border border-border flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-editorial text-lg font-bold text-primary">100% Soy Wax</h3>
            <p className="text-xs text-primary/70 leading-relaxed font-medium">
              We never use paraffin or petroleum wax. Our candles burn clean, cool, and slow with zero harmful soot.
            </p>
          </Card>

          <Card className="p-6 bg-white space-y-3">
            <div className="w-10 h-10 rounded-full bg-sage border border-border flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-editorial text-lg font-bold text-primary">Fine Fragrances</h3>
            <p className="text-xs text-primary/70 leading-relaxed font-medium">
              Infused with phthalate-free premium aroma oils that release gentle, headache-free scent throw even unlit.
            </p>
          </Card>

          <Card className="p-6 bg-white space-y-3">
            <div className="w-10 h-10 rounded-full bg-lavender border border-border flex items-center justify-center">
              <Gift className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-editorial text-lg font-bold text-primary">Gift-Ready Unboxing</h3>
            <p className="text-xs text-primary/70 leading-relaxed font-medium">
              Every parcel arrives in a gift box with ribbons and aesthetic packaging.
            </p>
          </Card>
        </div>

        <div className="p-6 rounded-2xl bg-butter/40 border-2 border-border text-center space-y-3">
          <Heart className="w-8 h-8 text-accent mx-auto fill-accent" />
          <h3 className="font-editorial text-xl font-bold text-primary">Thank You For Supporting Local Small Businesses</h3>
          <p className="text-xs text-primary/80 max-w-lg mx-auto font-medium">
            Offline customers kept asking for an online shop to send hampers to friends in Delhi, Bangalore, Mumbai, and beyond. This store is for you!
          </p>
        </div>
      </div>
    </>
  );
}
