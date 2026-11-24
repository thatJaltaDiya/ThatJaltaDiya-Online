import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sparkles, ArrowRight, Heart, ShoppingBag, ShieldCheck, Truck, Gift, Star } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

export function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products?limit=8&isFeatured=true'),
          api.get('/categories'),
        ]);
        if (prodRes.success) setFeaturedProducts(prodRes.data);
        if (catRes.success) setCategories(catRes.data);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  return (
    <>
      <Helmet>
        <title>That Jalta Diya | Handcrafted Candle Bouquets & Aesthetic Gifts</title>
        <meta name="description" content="Discover handcrafted candle bouquets, aesthetic scented candles, and curated gift hampers for birthdays, anniversaries, and romantic souls." />
        <meta property="og:title" content="That Jalta Diya | Candle Bouquets & Girly Gifts" />
        <meta property="og:description" content="Handcrafted soy candle bouquets and aesthetic gift hampers." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-24 bg-gradient-to-b from-canvas via-surface to-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2">
                <Badge variant="butter" tilt={true}>
                  HANDCRAFTED IN INDIA ✨
                </Badge>
                <Badge variant="sage" className="hidden sm:inline-flex">
                  100% PURE SOY WAX
                </Badge>
              </div>

              <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-primary leading-[1.08]">
                Candle Bouquets That <span className="text-accent underline decoration-butter decoration-wavy decoration-2">Steal Hearts</span>
              </h1>

              <p className="text-base sm:text-lg text-primary/80 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                Why gift flowers that wilt in days when you can gift an everlasting, heavenly-scented candle bouquet? Hand-poured with love for romantic birthdays, anniversaries, and cozy self-care.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link to="/shop">
                  <Button variant="accent" size="lg" className="w-full sm:w-auto">
                    <span>Explore The Drop</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/shop?category=candle-bouquets">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    View Candle Bouquets
                  </Button>
                </Link>
              </div>

              {/* Trust Metric Chips */}
              <div className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-bold text-primary/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">✓</div>
                  <span>Free delivery over ₹1,499</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-butter text-primary flex items-center justify-center">★</div>
                  <span>4.9 / 5 Star Customer Love</span>
                </div>
              </div>
            </div>

            {/* Right Editorial Visual Arrangement */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md">
                {/* Decorative sticker background */}
                <div className="absolute -top-4 -right-4 w-28 h-28 bg-lavender rounded-3xl border-2 border-border shadow-pop transform rotate-12 -z-10" />
                <div className="absolute -bottom-4 -left-4 w-28 h-28 bg-butter rounded-3xl border-2 border-border shadow-pop transform -rotate-12 -z-10" />

                {/* Main Hero Showcase Card */}
                <Card className="p-4 bg-white relative">
                  <div className="aspect-square rounded-xl overflow-hidden border-2 border-border relative bg-surface">
                    <img
                      src="/uploads/hero-candle-bouquet.webp"
                      alt="Handcrafted Pastel Rose Candle Bouquet"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        // Fallback cute SVG graphic
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23FFF5F7'/%3E%3Ccircle cx='200' cy='180' r='100' fill='%23FFE8A3' stroke='%232D0C1E' stroke-width='4'/%3E%3Cpath d='M200 110C175 150 160 180 160 210C160 235 180 250 200 250C220 250 240 235 240 210C240 180 225 150 200 110Z' fill='%23FF3366'/%3E%3Ctext x='200' y='330' font-family='serif' font-size='22' font-weight='bold' fill='%232D0C1E' text-anchor='middle'%3ECandle Bouquet Atelier%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <Badge variant="accent" tilt={true}>BESTSELLER</Badge>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-editorial text-lg font-bold text-primary">Velvet Pastel Rose Bouquet</h3>
                      <p className="text-xs text-primary/70 font-medium">French Vanilla & Damask Rose</p>
                    </div>
                    <div className="text-right">
                      <span className="font-editorial text-xl font-extrabold text-accent">₹1,499</span>
                      <span className="block text-xs line-through text-primary/40">₹1,899</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="py-16 bg-white border-y-2 border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <Badge variant="sage" className="mb-2">CURATED AESTHETICS</Badge>
              <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-primary">
                Shop By Category
              </h2>
            </div>
            <Link to="/shop" className="text-sm font-bold text-accent hover:underline flex items-center gap-1 mt-2 md:mt-0">
              <span>View All Categories</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
              ))
            ) : (
              categories.map(cat => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.slug}`}
                  className="group block"
                >
                  <Card className="p-3 text-center bg-surface group-hover:bg-butter transition-colors">
                    <div className="aspect-square rounded-xl overflow-hidden border-2 border-border bg-white mb-3 flex items-center justify-center p-2">
                      <img
                        src={cat.image || "/uploads/category-placeholder.webp"}
                        alt={cat.name}
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23FFFBF5'/%3E%3Ccircle cx='75' cy='75' r='40' fill='%23FFE8A3' stroke='%232D0C1E' stroke-width='2'/%3E%3Ctext x='75' y='82' font-family='serif' font-size='14' font-weight='bold' fill='%232D0C1E' text-anchor='middle'%3E" + encodeURIComponent(cat.name.slice(0, 10)) + "%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <h3 className="font-editorial text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-primary/60 font-semibold mt-0.5">
                      {cat._count?.products || 0} Items
                    </p>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Products Drop */}
      <section className="py-20 bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="accent" tilt={true} className="mb-3">HANDPICKED SPECIALS</Badge>
            <h2 className="font-editorial text-3xl sm:text-5xl font-extrabold text-primary">
              The Gifting Drop
            </h2>
            <p className="text-sm sm:text-base text-primary/70 mt-3 font-medium">
              Aesthetic hand-crafted candle bouquets, floral centerpieces, and dessert candles ready to spark joy.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : (
              featuredProducts.map(product => {
                const primaryImg = product.images?.[0]?.url || "/uploads/placeholder.webp";
                const isItemWishlisted = isWishlisted(product.id);
                const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

                return (
                  <Card key={product.id} className="p-3 flex flex-col justify-between group">
                    <div className="relative">
                      {/* Product Image */}
                      <Link to={`/product/${product.slug}`} className="block overflow-hidden rounded-xl border-2 border-border bg-white aspect-square relative">
                        <img
                          src={primaryImg}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23FFF5F7'/%3E%3Ccircle cx='150' cy='140' r='70' fill='%23FFE8A3' stroke='%232D0C1E' stroke-width='3'/%3E%3Ctext x='150' y='240' font-family='sans-serif' font-size='14' font-weight='bold' fill='%232D0C1E' text-anchor='middle'%3E" + encodeURIComponent(product.name.slice(0, 18)) + "%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </Link>

                      {/* Wishlist Button */}
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 border border-border/20 shadow-sm hover:scale-110 active:scale-95 transition-all"
                        aria-label="Wishlist item"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isItemWishlisted ? 'fill-accent text-accent' : 'text-primary'
                          }`}
                        />
                      </button>

                      {/* Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        {product.isBestseller && (
                          <Badge variant="butter" className="text-[9px] px-2 py-0.5">BESTSELLER</Badge>
                        )}
                        {hasDiscount && (
                          <Badge variant="accent" className="text-[9px] px-2 py-0.5">
                            {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 block">
                          {product.category?.name || 'Gifts'}
                        </span>
                        <Link to={`/product/${product.slug}`} className="block">
                          <h3 className="font-editorial text-sm sm:text-base font-bold text-primary group-hover:text-accent transition-colors line-clamp-1 mt-0.5">
                            {product.name}
                          </h3>
                        </Link>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/10">
                        <div>
                          <span className="font-editorial text-base sm:text-lg font-extrabold text-primary">
                            ₹{(product.price / 100).toFixed(0)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs line-through text-primary/40 ml-2">
                              ₹{(product.compareAtPrice / 100).toFixed(0)}
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => addToCart(product.id, null, 1)}
                          disabled={product.stock <= 0}
                          className="text-xs px-3 py-1.5"
                          aria-label={`Add ${product.name} to bag`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Add</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          <div className="mt-12 text-center">
            <Link to="/shop">
              <Button variant="primary" size="lg">
                <span>View Full Catalog</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Story Editorial Section */}
      <section className="py-20 bg-surface border-t-2 border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="lavender" tilt={true}>OUR ARTISANAL JOURNEY</Badge>
              <h2 className="font-editorial text-3xl sm:text-5xl font-extrabold text-primary leading-tight">
                From Our Sunday Pop-ups To Your Warmest Homes
              </h2>
              <p className="text-base text-primary/80 leading-relaxed font-medium">
                "That Jalta Diya" began with a simple craving: gifts that feel handmade, smell like pure nostalgia, and look too pretty to burn. What started as small weekend gifting pop-ups for friends and neighbors is now our online dream.
              </p>
              <p className="text-base text-primary/80 leading-relaxed font-medium">
                Every petal, floral swirl, and wax dessert is poured by hand using 100% natural soy wax and phthalate-free premium fragrance oils. We package every piece with custom handwritten notes, satin ribbons, and aesthetic matchboxes.
              </p>
              <div className="pt-2">
                <Link to="/about">
                  <Button variant="outline" size="md">
                    Read Our Full Story
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-white transform -rotate-1">
                <div className="text-3xl font-editorial font-extrabold text-accent">100%</div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary mt-1">Natural Soy Wax</div>
                <p className="text-xs text-primary/70 mt-2 font-medium">Clean, non-toxic burns with zero paraffin or harmful fumes.</p>
              </Card>

              <Card className="p-4 bg-butter transform rotate-2">
                <div className="text-3xl font-editorial font-extrabold text-primary">500+</div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary mt-1">Offline Bouquets Sold</div>
                <p className="text-xs text-primary/70 mt-2 font-medium">Tested, loved, and photographed across hundreds of celebrations.</p>
              </Card>

              <Card className="p-4 bg-sage transform rotate-1">
                <div className="text-3xl font-editorial font-extrabold text-primary">Custom</div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary mt-1">Gift Packaging</div>
                <p className="text-xs text-primary/70 mt-2 font-medium">Every bouquet ships in gift-ready boxes with free personalized notes.</p>
              </Card>

              <Card className="p-4 bg-lavender transform -rotate-2">
                <div className="text-3xl font-editorial font-extrabold text-accent">Zero</div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary mt-1">Wilted Petals</div>
                <p className="text-xs text-primary/70 mt-2 font-medium">An aesthetic keepsake that lasts months before you ever light it.</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-20 bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <Badge variant="butter" tilt={true} className="mb-2">VERIFIED REVIEWS</Badge>
            <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-primary">
              Loved By Romantic Souls
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white space-y-4">
              <div className="flex gap-1 text-accent">
                {Array(5).fill(0).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent" />
                ))}
              </div>
              <p className="text-sm text-primary/80 italic font-medium leading-relaxed">
                "Ordered the Peony Candle Bouquet for my best friend’s 25th birthday. She literally gasped when opening it! The vanilla rose scent filled the entire living room even before burning."
              </p>
              <div className="pt-2 border-t border-border/10 flex items-center justify-between text-xs font-bold">
                <span className="text-primary">Ananya S.</span>
                <span className="text-primary/50">Mumbai</span>
              </div>
            </Card>

            <Card className="p-6 bg-white space-y-4">
              <div className="flex gap-1 text-accent">
                {Array(5).fill(0).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent" />
                ))}
              </div>
              <p className="text-sm text-primary/80 italic font-medium leading-relaxed">
                "Infinitely better than real flowers! The packaging was so safe—not a single petal chipped during transit to Bangalore. Will definitely be ordering my anniversary gifts from here."
              </p>
              <div className="pt-2 border-t border-border/10 flex items-center justify-between text-xs font-bold">
                <span className="text-primary">Rhea K.</span>
                <span className="text-primary/50">Bengaluru</span>
              </div>
            </Card>

            <Card className="p-6 bg-white space-y-4">
              <div className="flex gap-1 text-accent">
                {Array(5).fill(0).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent" />
                ))}
              </div>
              <p className="text-sm text-primary/80 italic font-medium leading-relaxed">
                "The aesthetic match bottle and handwritten note felt like a gift from a dear friend. The artisanal details on the mini cupcake candles are unbelievably delicate!"
              </p>
              <div className="pt-2 border-t border-border/10 flex items-center justify-between text-xs font-bold">
                <span className="text-primary">Pooja M.</span>
                <span className="text-primary/50">Delhi</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Perks Banner Strip */}
      <section className="py-10 bg-butter border-t-2 border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Truck className="w-7 h-7 text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Safe Express Delivery</h4>
              <p className="text-xs text-primary/70">Shockproof gift packaging across India</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Gift className="w-7 h-7 text-accent" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Complimentary Gift Notes</h4>
              <p className="text-xs text-primary/70">Handwritten messages included free</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Clean Soy Wax</h4>
              <p className="text-xs text-primary/70">Zero smoke, phthalate-free fragrances</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-accent" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Artisanal Quality</h4>
              <p className="text-xs text-primary/70">Hand-poured in small batches</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
