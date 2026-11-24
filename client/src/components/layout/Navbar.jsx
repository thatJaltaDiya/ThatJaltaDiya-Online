import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, Menu, X, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { MarqueeStrip } from '../ui/MarqueeStrip.jsx';

export function Navbar() {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const { cart } = useCart();
  const { wishlistItems } = useWishlist();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-canvas border-b-2 border-border">
      {/* Top Announcement Bar */}
      <MarqueeStrip />

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border-2 border-border shadow-pop-sm bg-white text-primary hover:bg-surface min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex-1 lg:flex-none flex justify-center lg:justify-start">
            <Link to="/" className="group flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-butter border-2 border-border flex items-center justify-center shadow-pop-sm group-hover:rotate-6 transition-transform">
                <Flame className="w-6 h-6 text-accent fill-accent" />
              </div>
              <div>
                <span className="font-editorial text-2xl sm:text-3xl font-extrabold tracking-tight text-primary block leading-none">
                  That Jalta Diya
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-accent block mt-0.5">
                  Candle Bouquets & Gifts
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 font-bold text-sm">
            <Link to="/shop" className="text-primary hover:text-accent transition-colors">
              All Gifts
            </Link>
            <Link to="/shop?category=candle-bouquets" className="text-primary hover:text-accent transition-colors">
              Candle Bouquets
            </Link>
            <Link to="/shop?category=scented-candles" className="text-primary hover:text-accent transition-colors">
              Scented Candles
            </Link>
            <Link to="/shop?category=gift-hampers" className="text-primary hover:text-accent transition-colors">
              Gift Hampers
            </Link>
            <Link to="/about" className="text-primary hover:text-accent transition-colors">
              Our Story
            </Link>
            <Link to="/contact" className="text-primary hover:text-accent transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-full border-2 border-transparent hover:border-border hover:bg-surface min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
              aria-label="Search store"
            >
              <Search className="w-5 h-5 text-primary" />
            </button>

            {/* Wishlist */}
            <Link
              to="/account/wishlist"
              className="relative p-2 rounded-full border-2 border-transparent hover:border-border hover:bg-surface min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
              aria-label="View Wishlist"
            >
              <Heart className="w-5 h-5 text-primary" />
              {wishlistItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white rounded-full text-[10px] font-extrabold border-[1.5px] border-border flex items-center justify-center shadow-pop-sm">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <Link
              to="/cart"
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-full bg-butter border-2 border-border shadow-pop-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-pop transition-all min-h-[44px]"
              aria-label="View shopping bag"
            >
              <ShoppingBag className="w-5 h-5 text-primary" />
              <span className="text-xs font-black hidden sm:inline">BAG</span>
              {cart.totalItems > 0 && (
                <span className="w-5 h-5 bg-primary text-white rounded-full text-[11px] font-extrabold flex items-center justify-center">
                  {cart.totalItems}
                </span>
              )}
            </Link>

            {/* User Account / Admin Link */}
            {isAuthenticated ? (
              <div className="relative group">
                <Link
                  to={isAdmin ? "/admin" : "/account"}
                  className="flex items-center gap-1.5 p-2 rounded-full border-2 border-border bg-white shadow-pop-sm min-h-[44px] min-w-[44px] justify-center"
                  aria-label="Account Menu"
                >
                  <User className="w-5 h-5 text-primary" />
                </Link>
                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-canvas border-2 border-border shadow-pop-lg rounded-2xl py-2 hidden group-hover:block animate-in fade-in z-50">
                  <div className="px-4 py-2 border-b border-border/10 text-xs font-bold text-primary truncate">
                    {user?.name || user?.email}
                  </div>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-xs font-bold text-accent hover:bg-surface"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/account"
                    className="block px-4 py-2 text-xs font-medium text-primary hover:bg-surface"
                  >
                    My Orders & Profile
                  </Link>
                  <Link
                    to="/account/addresses"
                    className="block px-4 py-2 text-xs font-medium text-primary hover:bg-surface"
                  >
                    Saved Addresses
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border-t border-border/10 mt-1 cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-full border-2 border-border text-xs font-bold uppercase tracking-wider bg-white shadow-pop-sm hover:bg-surface min-h-[44px]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Collapsible Search Bar */}
        {searchOpen && (
          <div className="py-3 pb-4 border-t border-border/10 animate-in fade-in">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scented candles, floral bouquets, hampers..."
                className="flex-1 px-4 py-2.5 rounded-full border-2 border-border bg-white text-sm font-medium focus:border-accent outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-accent text-white font-bold text-xs uppercase tracking-wider rounded-full border-2 border-border shadow-pop-sm hover:shadow-pop"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t-2 border-border bg-canvas px-4 pt-4 pb-6 space-y-3 animate-in slide-in-from-top-2">
          <Link
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            All Gifts & Catalog
          </Link>
          <Link
            to="/shop?category=candle-bouquets"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            Candle Bouquets
          </Link>
          <Link
            to="/shop?category=scented-candles"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            Scented Candles
          </Link>
          <Link
            to="/shop?category=gift-hampers"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            Gift Hampers
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            Our Story
          </Link>
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            Contact & Custom Inquiries
          </Link>

          {!isAuthenticated && (
            <div className="pt-2 flex gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2.5 rounded-full border-2 border-border bg-white font-bold text-sm shadow-pop-sm"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2.5 rounded-full border-2 border-border bg-accent text-white font-bold text-sm shadow-pop-sm"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
