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
import { useAuth } from '../context/AuthContext.jsx';

export function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const { isAdmin } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  // Search and Filter states synced with URL
  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentPage = Number(searchParams.get('page')) || 1;

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
        const [prodResult, catResult] = await Promise.allSettled([
          api.get(`/products?${query}&limit=12`),
          categories.length === 0 ? api.get('/categories') : Promise.resolve(null),
        ]);

        if (prodResult.status === 'fulfilled' && prodResult.value?.success) {
          setProducts(prodResult.value.data);
          if (prodResult.value.meta) setPagination(prodResult.value.meta);
        }
        if (catResult.status === 'fulfilled' && catResult.value?.success) {
          setCategories(catResult.value.data);
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

      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header Breadcrumb & Title */}
        <div className="mb-5 sm:mb-8">
          <Badge variant="butter" tilt={true} className="mb-2">ALL PRODUCTS</Badge>
          <h1 className="font-editorial text-2xl sm:text-4xl lg:text-5xl font-extrabold text-primary leading-tight">
            {selectedCategory
              ? categories.find(c => c.slug === selectedCategory)?.name || 'Category Collection'
              : 'Our Complete Gifting Catalog'}
          </h1>
          <p className="text-xs sm:text-sm text-primary/70 mt-1 font-medium">
            Handcrafted soy candles and floral bouquet creations for every special celebration.
          </p>
        </div>

        {/* Search, Filter & Sort Control Strip */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-8 bg-white p-3 sm:p-4 rounded-2xl border border-border/20 shadow-sm">
          {/* Search bar with debounce */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-primary/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search candles, bouquets, hampers..."
              className="w-full pl-10 pr-4 py-2 min-h-[42px] rounded-full border border-border/30 bg-surface/30 hover:bg-white focus:bg-white text-sm font-medium focus:border-primary/40 focus:ring-1 focus:ring-primary/10 outline-none transition-all"
            />
            {localSearch && (
              <button
                onClick={() => {
                  setLocalSearch('');
                  updateFilter({ search: undefined, page: 1 });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary p-1"
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
              className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full border border-border/30 bg-white hover:bg-surface text-xs font-bold text-primary min-h-[42px] shadow-sm transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>

            <div className="flex items-center gap-2">
              <label htmlFor="shop-sort-select" className="text-xs font-bold uppercase tracking-wider text-primary/60 hidden sm:inline">Sort:</label>
              <select
                id="shop-sort-select"
                aria-label="Sort products by"
                value={currentSort}
                onChange={(e) => updateFilter({ sort: e.target.value, page: 1 })}
                className="px-3.5 py-2 min-h-[42px] bg-white rounded-full border border-border/30 text-xs font-bold text-primary focus:border-primary/40 focus:ring-1 focus:ring-primary/10 outline-none shadow-sm cursor-pointer"
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

        {/* Mobile Category Filter Drawer */}
        {filterDrawerOpen && (
          <div className="lg:hidden mb-5 bg-white p-4 rounded-2xl border-2 border-border shadow-pop-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-sm font-bold text-primary">Filter by Category</h3>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="p-1 text-primary/60 hover:text-primary"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  updateFilter({ category: undefined, page: 1 });
                  setFilterDrawerOpen(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  !selectedCategory
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface/60 text-primary border-border/20'
                }`}
              >
                All Products
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    updateFilter({ category: cat.slug, page: 1 });
                    setFilterDrawerOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    selectedCategory === cat.slug
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface/60 text-primary border-border/20'
                  }`}
                >
                  {cat.name} ({cat._count?.products || 0})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Layout: Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-6 bg-white p-6 rounded-2xl border border-border/20 shadow-sm">
            {/* Category Pills */}
            <div>
              <h3 className="font-editorial text-base font-bold text-primary mb-3">Categories</h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => updateFilter({ category: undefined, page: 1 })}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    !selectedCategory
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-primary/80 hover:text-primary hover:bg-surface/60'
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
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-primary/80 hover:text-primary hover:bg-surface/60'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] opacity-70">({cat._count?.products || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All Filters */}
            {(selectedCategory || searchQuery) && (
              <div className="pt-4 border-t border-border/10">
                <button
                  onClick={() => setSearchParams({})}
                  className="w-full py-2 rounded-full border border-red-300 text-xs font-bold text-red-600 hover:bg-red-50/60 transition-colors shadow-sm"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </aside>

          {/* Product Cards Grid */}
          <div className="lg:col-span-3 space-y-8">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-surface-card rounded-2xl border-2 border-dashed border-border p-6 sm:p-8">
                <p className="font-editorial text-xl sm:text-2xl font-bold text-primary mb-2">No matching products found</p>
                <p className="text-xs text-primary/60 mb-6">Try broadening your search term or clearing filters.</p>
                <Button variant="primary" onClick={() => setSearchParams({})}>
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                {products.map(product => {
                  const primaryImg = product.images?.[0]?.url || "/uploads/placeholder.webp";
                  const isItemWishlisted = isWishlisted(product.id);
                  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl p-2.5 sm:p-3 border border-border/20 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
                    >
                      <div className="relative">
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

                        {!isAdmin && (
                          <button
                            onClick={() => toggleWishlist(product.id)}
                            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 shadow-sm hover:scale-110 active:scale-95 flex items-center justify-center transition-all border border-border/10"
                            aria-label="Wishlist item"
                          >
                            <Heart
                              className={`w-4 h-4 transition-colors ${
                                isItemWishlisted ? 'fill-accent text-accent' : 'text-primary/70 hover:text-primary'
                              }`}
                            />
                          </button>
                        )}

                        {product.stock <= 0 && (
                          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-900 text-white shadow-sm">OUT OF STOCK</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block truncate">
                            {product.category?.name || 'Gifts'}
                          </span>
                          <Link to={`/product/${product.slug}`} className="block">
                            <h3 className="font-sans text-sm sm:text-base font-bold text-primary group-hover:text-accent transition-colors line-clamp-1 mt-0.5">
                              {product.name}
                            </h3>
                          </Link>
                        </div>

                        <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-1.5 pt-2 sm:pt-2.5 border-t border-border/10">
                          <div className="min-w-0">
                            <span className="font-editorial text-sm sm:text-lg font-black text-primary">
                              ₹{(product.price / 100).toFixed(0)}
                            </span>
                            {hasDiscount && (
                              <span className="text-[10px] sm:text-xs line-through text-primary/40 ml-1 font-medium">
                                ₹{(product.compareAtPrice / 100).toFixed(0)}
                              </span>
                            )}
                          </div>

                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => addToCart(product.id, null, 1)}
                              disabled={product.stock <= 0}
                              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-primary text-white hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
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
