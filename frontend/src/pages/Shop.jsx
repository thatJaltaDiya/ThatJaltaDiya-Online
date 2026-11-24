import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Filter, SlidersHorizontal, Search, Heart, ShoppingBag, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

export function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  // Search and Filter states synced with URL
  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentPage = Number(searchParams.get('page')) || 1;
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';

  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounced search sync
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        updateFilter({ search: localSearch || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const updateFilter = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    setSearchParams(newParams);
  };

  useEffect(() => {
    async function loadShopData() {
      setLoading(true);
      try {
        const query = searchParams.toString();
        const [prodRes, catRes] = await Promise.all([
          api.get(`/products?${query}&limit=12`),
          categories.length === 0 ? api.get('/categories') : Promise.resolve(null),
        ]);

        if (prodRes.success) {
          setProducts(prodRes.data);
          if (prodRes.meta) setPagination(prodRes.meta);
        }
        if (catRes && catRes.success) {
          setCategories(catRes.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadShopData();
  }, [searchParams]);

  return (
    <>
      <Helmet>
        <title>Shop All Candle Bouquets & Gifts | That Jalta Diya</title>
        <meta name="description" content="Browse our complete collection of aesthetic candle bouquets, luxury scented soy candles, and curated gift hampers." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Breadcrumb & Title */}
        <div className="mb-8">
          <Badge variant="butter" tilt={true} className="mb-2">ALL PRODUCTS</Badge>
          <h1 className="font-editorial text-4xl sm:text-5xl font-extrabold text-primary">
            {selectedCategory
              ? categories.find(c => c.slug === selectedCategory)?.name || 'Category Collection'
              : 'Our Complete Gifting Catalog'}
          </h1>
          <p className="text-sm text-primary/70 mt-1 font-medium">
            Handcrafted soy candles and floral bouquet creations for every special celebration.
          </p>
        </div>

        {/* Search, Filter & Sort Control Strip */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8 bg-surface-card p-4 rounded-2xl border-2 border-border shadow-pop-sm">
          {/* Search bar with debounce */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-primary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search candles, bouquets, hampers..."
              className="w-full pl-10 pr-4 py-2 min-h-[44px] rounded-full border-2 border-border/60 bg-white text-sm font-medium focus:border-accent outline-none"
            />
            {localSearch && (
              <button
                onClick={() => {
                  setLocalSearch('');
                  updateFilter({ search: undefined, page: 1 });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/50 hover:text-primary p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector & Mobile Filter Button */}
          <div className="flex items-center gap-3 justify-between md:justify-end">
            <button
              onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full border-2 border-border bg-butter text-xs font-bold min-h-[44px]"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary/70 hidden sm:inline">Sort:</span>
              <select
                value={currentSort}
                onChange={(e) => updateFilter({ sort: e.target.value, page: 1 })}
                className="px-3.5 py-2 min-h-[44px] rounded-full border-2 border-border bg-white text-xs font-bold text-primary focus:border-accent outline-none cursor-pointer"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="popularity">Most Popular / Bestsellers</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Layout: Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-6 bg-surface-card p-6 rounded-2xl border-2 border-border shadow-pop-sm">
            {/* Category Pills */}
            <div>
              <h3 className="font-editorial text-base font-bold text-primary mb-3">Categories</h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => updateFilter({ category: undefined, page: 1 })}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    !selectedCategory
                      ? 'bg-primary text-white border-2 border-border shadow-pop-sm'
                      : 'text-primary hover:bg-surface border-2 border-transparent'
                  }`}
                >
                  All Products
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => updateFilter({ category: cat.slug, page: 1 })}
                    className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      selectedCategory === cat.slug
                        ? 'bg-primary text-white border-2 border-border shadow-pop-sm'
                        : 'text-primary hover:bg-surface border-2 border-transparent'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] opacity-70">({cat._count?.products || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter in INR */}
            <div className="pt-4 border-t border-border/10">
              <h3 className="font-editorial text-base font-bold text-primary mb-3">Price Range (₹)</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPriceParam ? Number(minPriceParam) / 100 : ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) * 100 : undefined;
                    updateFilter({ minPrice: val, page: 1 });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border-2 border-border bg-white text-xs font-bold focus:border-accent outline-none"
                />
                <span className="text-xs font-bold text-primary/40">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPriceParam ? Number(maxPriceParam) / 100 : ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) * 100 : undefined;
                    updateFilter({ maxPrice: val, page: 1 });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border-2 border-border bg-white text-xs font-bold focus:border-accent outline-none"
                />
              </div>
            </div>

            {/* Clear All Filters */}
            {(selectedCategory || searchQuery || minPriceParam || maxPriceParam) && (
              <div className="pt-4 border-t border-border/10">
                <button
                  onClick={() => setSearchParams({})}
                  className="w-full py-2 rounded-full border-2 border-dashed border-red-400 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </aside>

          {/* Product Cards Grid */}
          <div className="lg:col-span-3 space-y-8">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-surface-card rounded-2xl border-2 border-dashed border-border p-8">
                <p className="font-editorial text-2xl font-bold text-primary mb-2">No matching products found</p>
                <p className="text-xs text-primary/60 mb-6">Try broadening your search term or clearing filters.</p>
                <Button variant="primary" onClick={() => setSearchParams({})}>
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {products.map(product => {
                  const primaryImg = product.images?.[0]?.url || "/uploads/placeholder.webp";
                  const isItemWishlisted = isWishlisted(product.id);
                  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

                  return (
                    <Card key={product.id} className="p-3 flex flex-col justify-between group">
                      <div className="relative">
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

                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                          {product.stock <= 0 ? (
                            <Badge variant="dark" className="text-[9px] px-2 py-0.5 bg-gray-900">OUT OF STOCK</Badge>
                          ) : product.stock <= 5 ? (
                            <Badge variant="accent" className="text-[9px] px-2 py-0.5">ONLY {product.stock} LEFT</Badge>
                          ) : null}
                          {hasDiscount && (
                            <Badge variant="butter" className="text-[9px] px-2 py-0.5">
                              {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 block truncate">
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
                          >
                            <ShoppingBag className="w-3.5 h-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Add</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-6 border-t border-border/10">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => updateFilter({ page: currentPage - 1 })}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  <span>Previous</span>
                </Button>

                <span className="text-xs font-bold text-primary px-3 py-1 bg-surface rounded-full border border-border/20">
                  Page {currentPage} of {pagination.totalPages}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => updateFilter({ page: currentPage + 1 })}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
