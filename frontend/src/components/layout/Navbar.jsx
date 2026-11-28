import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, User, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { MarqueeStrip } from '../ui/MarqueeStrip.jsx';

export function Navbar() {
  const { user, isAuthenticated, logout, isAdmin, loading, hasSessionHint } = useAuth();
  const { cart } = useCart();
  const { wishlistItems } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showAuthPlaceholder = loading && hasSessionHint && !isAuthenticated;

  return (
    <header className="sticky top-0 z-40 bg-canvas border-b-2 border-border">
      {/* Top Announcement Bar */}
      <MarqueeStrip />

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border-2 border-border shadow-pop-sm bg-white text-primary hover:bg-surface min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex items-center flex-shrink-0 mr-1 sm:mr-4 lg:mr-8 xl:mr-10">
            <Link to="/" className="group flex items-center gap-2 sm:gap-2.5">
              <img
                src="/logo.jpg"
                alt="That Jalta Diya"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-border object-cover shadow-pop-sm group-hover:rotate-6 transition-transform flex-shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-editorial text-base sm:text-xl xl:text-2xl font-black tracking-tight text-primary block leading-tight whitespace-nowrap">
                  That Jalta Diya
                </span>
                <span className="hidden min-[360px]:block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-accent leading-none mt-0.5 whitespace-nowrap">
                  Candle Bouquets & Gifts
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-8 font-bold text-xs xl:text-sm flex-1 justify-center">
            <Link to="/shop" className="text-primary hover:text-accent transition-colors whitespace-nowrap py-1">
              All
            </Link>
            <Link to="/shop?category=scented-candles" className="text-primary hover:text-accent transition-colors whitespace-nowrap py-1">
              Scented Candles
            </Link>
            <Link to="/shop?category=candle-bouquets" className="text-primary hover:text-accent transition-colors whitespace-nowrap py-1">
              Bouquets
            </Link>
            <Link to="/shop?category=gift-hampers" className="text-primary hover:text-accent transition-colors whitespace-nowrap py-1">
              Other Gifts
            </Link>
            <Link to="/contact" className="text-primary hover:text-accent transition-colors whitespace-nowrap py-1">
              Contact
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0 ml-1 sm:ml-3 lg:ml-6">
            {/* Wishlist (hidden for Admin) */}
            {!isAdmin && (
              <Link
                to="/account/wishlist"
                className="relative p-2 rounded-full border border-transparent hover:border-border hover:bg-surface flex items-center justify-center transition-all text-primary hover:text-accent"
                aria-label="View Wishlist"
              >
                <Heart className="w-4 h-4" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white rounded-full text-[9px] font-extrabold border border-border flex items-center justify-center shadow-pop-sm">
                    {wishlistItems.length}
                  </span>
                )}
              </Link>
            )}

            {/* Cart Button (only visible for signed-in customers) */}
            {isAuthenticated && !isAdmin && (
              <Link
                to="/cart"
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-butter border-2 border-border shadow-pop-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-pop transition-all min-h-[40px]"
                aria-label="View shopping bag"
              >
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span className="text-xs font-black hidden sm:inline">BAG</span>
                {cart.totalItems > 0 && (
                  <span className="w-4 h-4 bg-primary text-white rounded-full text-[10px] font-extrabold flex items-center justify-center">
                    {cart.totalItems}
                  </span>
                )}
              </Link>
            )}

            {/* User Account / Admin Link */}
            {isAuthenticated ? (
              <div className="relative group">
                <Link
                  to={isAdmin ? "/admin" : "/account"}
                  className="flex items-center gap-1.5 p-2 rounded-full border-2 border-border bg-white shadow-pop-sm min-h-[40px] min-w-[40px] justify-center"
                  aria-label="Account Menu"
                >
                  <User className="w-4 h-4 text-primary" />
                </Link>
                {/* Dropdown (pt-2 bridges the gap so hovering down never closes the menu) */}
                <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                  <div className="bg-canvas border-2 border-border shadow-pop-lg rounded-2xl py-2 animate-in fade-in">
                    <div className="px-4 py-2 border-b border-border/10 text-xs font-bold text-primary truncate">
                      {user?.name || user?.email}
                    </div>
                    {isAdmin ? (
                      <Link
                        to="/admin"
                        className="block px-4 py-2 text-xs font-bold text-accent hover:bg-surface"
                      >
                        Admin Dashboard
                      </Link>
                    ) : (
                      <>
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
                      </>
                    )}
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border-t border-border/10 mt-1 cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            ) : showAuthPlaceholder ? (
              <div
                aria-hidden="true"
                className="hidden sm:inline-flex items-center justify-center w-24 h-[40px] rounded-full border-2 border-border/20 bg-surface animate-pulse"
              />
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 rounded-full border-2 border-border text-xs font-bold uppercase tracking-wider bg-white shadow-pop-sm hover:bg-surface min-h-[40px] whitespace-nowrap"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t-2 border-border bg-canvas px-4 pt-4 pb-6 space-y-3 animate-in slide-in-from-top-2">
          <Link
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            All
          </Link>
          <Link
            to="/shop?category=scented-candles"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            Scented Candles
          </Link>
          <Link
            to="/shop?category=candle-bouquets"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            Bouquets
          </Link>
          <Link
            to="/shop?category=gift-hampers"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            Other Gifts
          </Link>
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-primary border-b border-border/10"
          >
            Contact
          </Link>

          {isAuthenticated ? (
            <div className="pt-2 space-y-2">
              <div className="text-xs font-bold text-primary/60 truncate px-1">
                Signed in as {user?.name || user?.email}
              </div>
              {isAdmin ? (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-4 rounded-xl border-2 border-border bg-accent text-white font-bold text-sm text-center shadow-pop-sm"
                >
                  Admin Dashboard
                </Link>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-full border-2 border-border bg-white font-bold text-xs shadow-pop-sm"
                  >
                    My Orders
                  </Link>
                  <Link
                    to="/account/addresses"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-full border-2 border-border bg-white font-bold text-xs shadow-pop-sm"
                  >
                    Addresses
                  </Link>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full py-2.5 rounded-full border-2 border-red-200 bg-red-50 text-red-600 font-bold text-xs"
              >
                Log Out
              </button>
            </div>
          ) : showAuthPlaceholder ? (
            <div className="pt-2 flex gap-3" aria-hidden="true">
              <div className="flex-1 h-10 rounded-full border border-border/20 bg-surface animate-pulse" />
            </div>
          ) : (
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
