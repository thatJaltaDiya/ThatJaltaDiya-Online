import React from 'react';
import { Sparkles } from 'lucide-react';

export function MarqueeStrip({
  text = "HANDCRAFTED CANDLES, BOUQUETS & GIFTING ITEMS ✨ CUSTOM GIFT HAMPERS ✨ CLEAN BURNING NATURAL WAX",
  className = "bg-accent text-white py-2.5",
}) {
  const items = Array(4).fill(text);

  return (
    <div className={`w-full overflow-hidden select-none border-y-2 border-border font-bold text-xs uppercase tracking-widest ${className}`}>
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((str, idx) => (
          <div key={idx} className="flex items-center gap-6 mx-4">
            <span>{str}</span>
            <Sparkles className="w-3.5 h-3.5 inline-block text-butter" />
          </div>
        ))}
      </div>
    </div>
  );
}
