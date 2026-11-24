import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify';
import { Heart, ShoppingBag, ShieldCheck, Truck, Sparkles, ChevronRight, Check } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

export function ProductDetail() {
  const { slug } = useParams();
  const [productData, setProductData] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const res = await api.get(`/products/${slug}`);
        if (res.success) {
          setProductData(res.data.product);
          setRelatedProducts(res.data.relatedProducts || []);
          if (res.data.product.variants?.length > 0) {
            setSelectedVariant(res.data.product.variants[0]);
          } else {
            setSelectedVariant(null);
          }
          setActiveImageIndex(0);
          setQuantity(1);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4">
        <h2 className="font-editorial text-3xl font-bold text-primary mb-3">Product Not Found</h2>
        <p className="text-sm text-primary/70 mb-6">This item may have been discontinued or moved.</p>
        <Link to="/shop">
          <Button variant="primary">Return to Shop</Button>
        </Link>
      </div>
    );
  }

  const currentPrice = selectedVariant ? selectedVariant.price : productData.price;
  const currentStock = selectedVariant ? selectedVariant.stock : productData.stock;
  const isOutOfStock = currentStock <= 0;
  const hasDiscount = productData.compareAtPrice && productData.compareAtPrice > currentPrice;
  const images = productData.images || [];
  const activeImage = images[activeImageIndex]?.url || "/uploads/placeholder.webp";
  const itemWishlisted = isWishlisted(productData.id);

  // Sanitize rich text description with DOMPurify
  const cleanDescription = DOMPurify.sanitize(productData.description || '');

  return (
    <>
      <Helmet>
        <title>{productData.metaTitle || `${productData.name} | That Jalta Diya`}</title>
        <meta name="description" content={productData.metaDescription || productData.shortDescription || productData.name} />
        <meta property="og:title" content={productData.name} />
        <meta property="og:description" content={productData.shortDescription || productData.name} />
        <meta property="og:image" content={images[0]?.url || ''} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-bold text-primary/60 mb-6 truncate" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`/shop?category=${productData.category?.slug}`} className="hover:text-primary">
            {productData.category?.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-primary truncate">{productData.name}</span>
        </nav>

        {/* Product Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Gallery View */}
          <div className="space-y-4">
            <div className="aspect-square rounded-3xl overflow-hidden border-2 border-border shadow-pop-md bg-white relative">
              <img
                src={activeImage}
                alt={productData.name}
                className="w-full h-full object-cover transition-all duration-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='%23FFF5F7'/%3E%3Ccircle cx='250' cy='230' r='110' fill='%23FFE8A3' stroke='%232D0C1E' stroke-width='4'/%3E%3Ctext x='250' y='380' font-family='serif' font-size='24' font-weight='bold' fill='%232D0C1E' text-anchor='middle'%3E" + encodeURIComponent(productData.name) + "%3C/text%3E%3C/svg%3E";
                }}
              />
              {/* Badges Overlay */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                {productData.isBestseller && <Badge variant="butter" tilt={true}>BESTSELLER</Badge>}
                {isOutOfStock ? (
                  <Badge variant="dark">OUT OF STOCK</Badge>
                ) : currentStock <= 5 ? (
                  <Badge variant="accent">ONLY {currentStock} LEFT</Badge>
                ) : (
                  <Badge variant="sage">READY TO SHIP</Badge>
                )}
              </div>
            </div>

            {/* Thumbnails Row */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-accent ring-2 ring-accent scale-95'
                        : 'border-border/60 hover:border-border'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Meta & Purchase Controls */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-1">
                {productData.category?.name} • SKU: {selectedVariant?.sku || productData.sku}
              </span>
              <h1 className="font-editorial text-3xl sm:text-4xl font-extrabold text-primary leading-tight">
                {productData.name}
              </h1>
              {productData.shortDescription && (
                <p className="text-sm text-primary/70 mt-2 font-medium">
                  {productData.shortDescription}
                </p>
              )}
            </div>

            {/* Price Row */}
            <div className="flex items-baseline gap-3 p-4 rounded-2xl bg-surface border-2 border-border shadow-pop-sm">
              <span className="font-editorial text-3xl sm:text-4xl font-black text-primary">
                ₹{(currentPrice / 100).toFixed(0)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base line-through text-primary/40 font-bold">
                    ₹{(productData.compareAtPrice / 100).toFixed(0)}
                  </span>
                  <Badge variant="accent" className="ml-auto text-xs">
                    SAVE ₹{((productData.compareAtPrice - currentPrice) / 100).toFixed(0)}
                  </Badge>
                </>
              )}
            </div>

            {/* Variant Options Selector (if applicable) */}
            {productData.variants?.length > 0 && (
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-primary">
                  Choose Scent & Style:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {productData.variants.map(variant => {
                    const isSelected = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent/5 ring-1 ring-accent font-bold shadow-pop-sm'
                            : 'border-border/60 bg-white hover:border-border font-medium'
                        }`}
                      >
                        <div className="text-xs font-bold text-primary truncate">{variant.name}</div>
                        <div className="text-[11px] text-accent mt-0.5">₹{(variant.price / 100).toFixed(0)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector & Action Buttons */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-border rounded-full bg-white shadow-pop-sm">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-10 h-10 flex items-center justify-center font-bold text-lg hover:bg-surface rounded-l-full disabled:opacity-40 min-h-[44px]"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-sm select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    disabled={quantity >= currentStock || isOutOfStock}
                    className="w-10 h-10 flex items-center justify-center font-bold text-lg hover:bg-surface rounded-r-full disabled:opacity-40 min-h-[44px]"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <Button
                  variant="accent"
                  size="lg"
                  disabled={isOutOfStock}
                  onClick={() => addToCart(productData.id, selectedVariant?.id || null, quantity)}
                  className="flex-1 text-sm font-extrabold uppercase tracking-wider"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  <span>{isOutOfStock ? 'Sold Out' : 'Add To Bouquet Bag'}</span>
                </Button>

                <button
                  onClick={() => toggleWishlist(productData.id)}
                  className={`p-3.5 rounded-full border-2 border-border shadow-pop-sm hover:scale-105 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    itemWishlisted ? 'bg-accent/10 border-accent text-accent' : 'bg-white text-primary'
                  }`}
                  aria-label="Add to favorites"
                >
                  <Heart className={`w-5 h-5 ${itemWishlisted ? 'fill-accent text-accent' : ''}`} />
                </button>
              </div>
            </div>

            {/* Delivery & Artisan Perks */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/10 text-xs font-semibold text-primary/80">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-accent" />
                <span>Express courier across India</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-butter" />
                <span>100% soy wax & non-toxic</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Damage-free shockproof packaging</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>Complimentary gift tag included</span>
              </div>
            </div>

            {/* Sanitized Rich Text Description */}
            <div className="pt-6 border-t border-border/10">
              <h3 className="font-editorial text-lg font-bold text-primary mb-3">About This Creation</h3>
              <div
                className="text-sm text-primary/80 leading-relaxed space-y-3 prose prose-pink max-w-none"
                dangerouslySetInnerHTML={{ __html: cleanDescription }}
              />
            </div>
          </div>
        </div>

        {/* Related Products Carousel */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-12 border-t-2 border-border">
            <Badge variant="butter" className="mb-2">YOU MAY ALSO LOVE</Badge>
            <h2 className="font-editorial text-3xl font-extrabold text-primary mb-8">
              More Handcrafted Wonders
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map(rel => (
                <Card key={rel.id} className="p-3">
                  <Link to={`/product/${rel.slug}`} className="block aspect-square rounded-xl overflow-hidden border-2 border-border bg-surface mb-3">
                    <img
                      src={rel.images?.[0]?.url || "/uploads/placeholder.webp"}
                      alt={rel.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </Link>
                  <Link to={`/product/${rel.slug}`}>
                    <h4 className="font-editorial text-sm font-bold text-primary hover:text-accent truncate">
                      {rel.name}
                    </h4>
                  </Link>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-editorial font-bold text-primary">₹{(rel.price / 100).toFixed(0)}</span>
                    <Button size="sm" variant="secondary" onClick={() => addToCart(rel.id, null, 1)}>
                      Add
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
