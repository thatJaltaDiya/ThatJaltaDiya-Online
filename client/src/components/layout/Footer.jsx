import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Instagram, Mail, Phone, Heart, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-primary text-canvas border-t-2 border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Story Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-butter border border-white flex items-center justify-center">
                <Flame className="w-5 h-5 text-accent fill-accent" />
              </div>
              <span className="font-editorial text-2xl font-bold tracking-tight text-white">
                That Jalta Diya
              </span>
            </div>
            <p className="text-sm text-canvas/80 max-w-sm leading-relaxed">
              Handcrafting whimsical candle bouquets, artisanal dessert candles, and custom gifting hampers. Born as a beloved local offline pop-up, now glowing across India with love and clean natural wax.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-canvas/20 flex items-center justify-center hover:bg-accent hover:border-accent text-white transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="mailto:hello@thatjaltadiya.com"
                className="w-10 h-10 rounded-full border border-canvas/20 flex items-center justify-center hover:bg-accent hover:border-accent text-white transition-all"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-editorial text-base font-bold text-white mb-4">Shop Categories</h4>
            <ul className="space-y-2.5 text-sm text-canvas/80">
              <li><Link to="/shop?category=candle-bouquets" className="hover:text-butter transition-colors">Candle Bouquets</Link></li>
              <li><Link to="/shop?category=scented-candles" className="hover:text-butter transition-colors">Aesthetic Candles</Link></li>
              <li><Link to="/shop?category=gift-hampers" className="hover:text-butter transition-colors">Curated Hampers</Link></li>
              <li><Link to="/shop?category=accessories" className="hover:text-butter transition-colors">Accessories & Trays</Link></li>
              <li><Link to="/shop" className="hover:text-butter transition-colors">New Arrivals</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="font-editorial text-base font-bold text-white mb-4">Customer Care</h4>
            <ul className="space-y-2.5 text-sm text-canvas/80">
              <li><Link to="/about" className="hover:text-butter transition-colors">About the Maker</Link></li>
              <li><Link to="/contact" className="hover:text-butter transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-butter transition-colors">Candle Care & FAQ</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-butter transition-colors">Shipping Policy</Link></li>
              <li><Link to="/return-policy" className="hover:text-butter transition-colors">Returns & Refunds</Link></li>
            </ul>
          </div>

          {/* Policies & Owner Edit Note */}
          <div>
            <h4 className="font-editorial text-base font-bold text-white mb-4">Legal & Policies</h4>
            <ul className="space-y-2.5 text-sm text-canvas/80">
              <li><Link to="/privacy-policy" className="hover:text-butter transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-butter transition-colors">Terms of Service</Link></li>
              <li><span className="text-xs text-butter/80 block mt-2 p-2.5 rounded-lg border border-butter/20 bg-white/5">ℹ️ Policy templates are editable by store owner in Admin panel</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-canvas/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-canvas/60">
          <p>© {new Date().getFullYear()} That Jalta Diya. All rights reserved. Handcrafted with soy wax & love.</p>
          <div className="flex items-center gap-2">
            <span>Made for romantic souls & cozy homes</span>
            <Sparkles className="w-3.5 h-3.5 text-butter" />
          </div>
        </div>
      </div>
    </footer>
  );
}
