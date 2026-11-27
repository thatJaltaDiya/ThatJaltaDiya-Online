import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  AlertTriangle,
  LogOut,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [demoStatus, setDemoStatus] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    async function fetchDemoStatus() {
      try {
        const res = await api.get('/admin/demo-status');
        if (res.success) {
          setDemoStatus(res.data);
        }
      } catch {
        // ignore
      }
    }
    fetchDemoStatus();
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Products', path: '/admin/products', icon: Package },
    { label: 'Categories', path: '/admin/categories', icon: Layers },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Demo Data Alert Banner */}
      {demoStatus?.hasDemoData && !bannerDismissed && (
        <div className="bg-amber-100 border-b-2 border-amber-300 text-amber-950 px-4 py-2.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              Demo products ({demoStatus.counts.products}) are visible on your store. You can add or replace products in the Products tab.
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-amber-800 hover:text-black font-extrabold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Admin Top Navigation */}
      <header className="bg-white border-b-2 border-border px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link to="/admin" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img
              src="/logo.jpg"
              alt="That Jalta Diya"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-border object-cover shadow-pop-sm flex-shrink-0"
            />
            <div className="min-w-0">
              <span className="font-editorial text-base sm:text-xl font-extrabold text-primary block leading-none truncate">
                Admin Console
              </span>
              <span className="hidden min-[380px]:block text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-primary/60 truncate mt-0.5">
                That Jalta Diya Store
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border-2 border-border text-[11px] sm:text-xs font-bold hover:bg-surface whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Live Store</span>
            <span className="sm:hidden">Store</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-xs font-bold bg-surface px-3 py-1.5 rounded-full border border-border/20 max-w-[200px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="truncate">{user?.email}</span>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="p-2 rounded-full text-red-600 hover:bg-red-50 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar (Horizontal pill bar on mobile, vertical sidebar on md+) */}
        <aside className="w-full md:w-64 bg-surface-card border-b-2 md:border-b-0 md:border-r-2 border-border p-2.5 sm:p-4 flex flex-col justify-between">
          <nav className="flex md:flex-col gap-1.5 md:gap-1 overflow-x-auto no-scrollbar">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 md:gap-3 px-3 sm:px-3.5 py-2 md:py-2.5 rounded-full md:rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'bg-primary text-white border-2 border-border shadow-pop-sm'
                      : 'text-primary hover:bg-surface border-2 border-border/20 md:border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="md:flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 hidden md:inline" />}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:block pt-6 mt-6 border-t border-border/10 text-[11px] text-primary/60 text-center">
            Single Admin Engine v1.0
          </div>
        </aside>

        {/* Dynamic Outlet Page Content */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl overflow-x-hidden">
          <Outlet context={{ demoStatus, refreshDemoStatus: () => {} }} />
        </main>
      </div>
    </div>
  );
}
