import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Package, User, MapPin, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function AccountLayout() {
  const { user } = useAuth();

  const navLinks = [
    { label: 'My Orders', path: '/account', end: true, icon: Package },
    { label: 'Saved Addresses', path: '/account/addresses', icon: MapPin },
    { label: 'My Favorites', path: '/account/wishlist', icon: Heart },
    { label: 'Profile & Security', path: '/account/profile', icon: User },
  ];

  return (
    <>
      <Helmet>
        <title>My Account | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* User Greeting Bar */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface border-2 border-border shadow-pop-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0 w-full">
            <Badge variant="butter" tilt={true} className="mb-2">CUSTOMER DASHBOARD</Badge>
            <h1 className="font-editorial text-xl sm:text-3xl font-extrabold text-primary truncate">
              Hello, {user?.name || 'Candle Lover'}! ✨
            </h1>
            <p className="text-xs text-primary/70 font-mono mt-1 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b-2 border-border pb-3 sm:pb-4 mb-6 sm:mb-8 overflow-x-auto no-scrollbar">
          {navLinks.map(link => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all min-h-[40px] sm:min-h-[44px] select-none whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white border-2 border-border shadow-pop-sm'
                      : 'bg-white text-primary hover:bg-surface border-2 border-border/40'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Child Views */}
        <div>
          <Outlet />
        </div>
      </div>
    </>
  );
}
