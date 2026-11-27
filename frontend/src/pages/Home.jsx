import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sparkles, ArrowRight, Heart, ShoppingBag, ShieldCheck, Truck, Gift } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [prodResult, catResult] = await Promise.allSettled([
          api.get('/products?limit=4&sort=newest'),
          api.get('/categories'),
        ]);
        if (prodResult.status === 'fulfilled' && prodResult.value?.success) {
          setFeaturedProducts(prodResult.value.data);
        }
        if (catResult.status === 'fulfilled' && catResult.value?.success) {
          setCategories(catResult.value.data);
        }
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
      <section className="relative overflow-hidden pt-12 pb-16 md:py-20 bg-gradient-to-b from-canvas via-surface to-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2">
                <Badge variant="butter" tilt={true}>
                  HANDCRAFTED WITH LOVE ✨
                </Badge>
                <Badge variant="sage" className="hidden sm:inline-flex">
                  PURE NATURAL WAX
                </Badge>
              </div>

              <h1 className="font-editorial text-3xl sm:text-5xl md:text-6xl lg:text-[4.2rem] font-extrabold tracking-tight text-primary leading-[1.08] break-words">
                Candles, Bouquets <span className="whitespace-nowrap">&amp; Gifts</span> That <span className="text-accent underline decoration-butter decoration-wavy decoration-2">Steal Hearts</span>
              </h1>

              <p className="text-base sm:text-lg text-primary/80 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                Discover heavenly-scented candles, curated bouquets, and thoughtful aesthetic gifts. Crafted with love for birthdays, anniversaries, and cozy self-care.
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
              <div className="pt-5 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-bold text-primary/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">✓</div>
                  <span>Hand-poured in small batches</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-butter text-primary flex items-center justify-center">★</div>
                  <span>Gift-ready aesthetic packaging</span>
                </div>
              </div>
            </div>

            {/* Right Editorial Visual Arrangement */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md h-[360px] sm:h-[430px] lg:h-[450px]">
                {/* Back Photo (slightly tilted) */}
                <div className="absolute top-0 right-2 sm:right-4 w-[64%] aspect-[3/4] rounded-3xl overflow-hidden border-4 border-white shadow-xl rotate-6 bg-surface">
                  <img
                    src="/images/hero-bouquet.jpg"
                    alt="Handcrafted Rose Bouquet"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Front Photo (overlapping, tilted opposite) */}
                <div className="absolute bottom-0 left-2 sm:left-4 w-[64%] aspect-[3/4] rounded-3xl overflow-hidden border-4 border-white shadow-2xl -rotate-3 z-10 bg-surface">
                  <img
                    src="/images/hero-candle.jpg"
                    alt="Sandalwood Scented Candle"
                    className="w-full h-full object-cover"
                  />
                </div>
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
                  <div className="p-3.5 text-center bg-white rounded-2xl border border-border/20 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-square rounded-xl overflow-hidden bg-surface/40 mb-3 flex items-center justify-center p-2">
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
                    <p className="text-[11px] text-primary/50 font-medium mt-0.5">
                      {cat._count?.products || 0} Items
                    </p>
                  </div>
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
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : (
              featuredProducts.slice(0, 4).map(product => {
                const primaryImg = product.images?.[0]?.url || "/uploads/placeholder.webp";
                const isItemWishlisted = isWishlisted(product.id);
                const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl p-3 border border-border/20 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
                  >
                    <div className="relative">
                      {/* Product Image */}
                      <Link to={`/product/${product.slug}`} className="block overflow-hidden rounded-xl bg-surface/40 aspect-square relative">
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

                      {/* Wishlist Button (customers/guests only) */}
                      {!isAdmin && (
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 shadow-sm hover:scale-110 active:scale-95 flex items-center justify-center transition-all border border-border/10"
                          aria-label="Wishlist item"
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${isItemWishlisted ? 'fill-accent text-accent' : 'text-primary/70 hover:text-primary'
                              }`}
                          />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block">
                          {product.category?.name || 'Gifts'}
                        </span>
                        <Link to={`/product/${product.slug}`} className="block">
                          <h3 className="font-sans text-sm sm:text-base font-bold text-primary group-hover:text-accent transition-colors line-clamp-1 mt-0.5">
                            {product.name}
                          </h3>
                        </Link>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-border/10">
                        <div>
                          <span className="font-editorial text-base sm:text-lg font-black text-primary">
                            ₹{(product.price / 100).toFixed(0)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs line-through text-primary/40 ml-1.5 font-medium">
                              ₹{(product.compareAtPrice / 100).toFixed(0)}
                            </span>
                          )}
                        </div>

                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => addToCart(product.id, null, 1)}
                            disabled={product.stock <= 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-white hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            aria-label={`Add ${product.name} to bag`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
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

      {/* Perks Banner Strip */}
      <section className="py-10 bg-butter border-t-2 border-border" aria-label="Customer Guarantees">
        <h2 className="sr-only">Our Guarantees</h2>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Truck className="w-7 h-7 text-primary" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-primary">Safe Delivery</h3>
              <p className="text-xs text-primary/70">Shockproof gift packaging</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-primary">Clean Wax</h3>
              <p className="text-xs text-primary/70">Zero smoke, phthalate-free fragrances</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-accent" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-primary">Good Quality</h3>
              <p className="text-xs text-primary/70">Hand-poured in small batches</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
