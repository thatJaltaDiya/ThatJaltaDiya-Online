import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Tag,
  Boxes,
  Settings,
  Mail,
  ShieldAlert,
  AlertTriangle,
  LogOut,
  Flame,
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
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Coupons', path: '/admin/coupons', icon: Tag },
    { label: 'Inventory Logs', path: '/admin/inventory', icon: Boxes },
    { label: 'Contact Messages', path: '/admin/contact-messages', icon: Mail },
    { label: 'Audit Trail', path: '/admin/audit', icon: ShieldAlert },
    { label: 'Settings & Danger Zone', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Demo Data Alert Banner */}
      {demoStatus?.hasDemoData && !bannerDismissed && (
        <div className="bg-amber-100 border-b-2 border-amber-300 text-amber-950 px-4 py-2.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              Demo products ({demoStatus.counts.products}) are visible on your store. Non-technical owner can replace or delete them anytime in Settings.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/settings"
              className="underline hover:text-accent font-extrabold"
            >
              Go to Danger Zone
            </Link>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-amber-800 hover:text-black font-extrabold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Admin Top Navigation */}
      <header className="bg-white border-b-2 border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-butter border-2 border-border flex items-center justify-center shadow-pop-sm">
              <Flame className="w-5 h-5 text-accent fill-accent" />
            </div>
            <div>
              <span className="font-editorial text-xl font-extrabold text-primary block leading-none">
                Admin Console
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary/60">
                That Jalta Diya Store
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-border text-xs font-bold hover:bg-surface"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Live Store</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold bg-surface px-3 py-1.5 rounded-full border border-border/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{user?.email}</span>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="p-2 rounded-full text-red-600 hover:bg-red-50 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-surface-card border-r-2 border-border p-4 flex flex-col justify-between">
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-white border-2 border-border shadow-pop-sm'
                      : 'text-primary hover:bg-surface border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 mt-6 border-t border-border/10 text-[11px] text-primary/60 text-center">
            Single Admin Engine v1.0
          </div>
        </aside>

        {/* Dynamic Outlet Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl overflow-x-hidden">
          <Outlet context={{ demoStatus, refreshDemoStatus: () => {} }} />
        </main>
      </div>
    </div>
  );
}
