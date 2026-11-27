import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Package,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { api } from '../../services/api.js';

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await api.get('/admin/dashboard');
        if (res.success) {
          setData(res.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const {
    totalRevenue = 0,
    totalOrders = 0,
    pendingOrders = 0,
    lowStockProducts = [],
    recentOrders = [],
    salesChart = [],
  } = data || {};

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Title */}
      <div>
        <Badge variant="butter" tilt={true} className="mb-2">OVERVIEW</Badge>
        <h1 className="font-editorial text-2xl sm:text-3xl font-extrabold text-primary">
          Store Performance & Metrics
        </h1>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-5 bg-white space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-primary/60 gap-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Total Revenue</span>
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-accent flex-shrink-0" />
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-black text-primary">
            ₹{(totalRevenue / 100).toFixed(0)}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 block">From confirmed payments</span>
        </Card>

        <Card className="p-3.5 sm:p-5 bg-white space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-primary/60 gap-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Total Orders</span>
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-black text-primary">
            {totalOrders}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-primary/60 block">Lifetime customer orders</span>
        </Card>

        <Card className="p-3.5 sm:p-5 bg-white space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-primary/60 gap-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Pending Orders</span>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-black text-amber-600">
            {pendingOrders}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-amber-800 block">Awaiting fulfillment</span>
        </Card>

        <Card className="p-3.5 sm:p-5 bg-white space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-primary/60 gap-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-black text-red-600">
            {lowStockProducts.length}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-red-700 block">≤ 5 units remaining</span>
        </Card>
      </div>

      {/* 7-Day Sales Trend & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
        {/* Sales Chart Box */}
        <Card className="lg:col-span-8 p-4 sm:p-6 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/10">
            <div>
              <h2 className="font-editorial text-xl font-bold text-primary">Past 7 Days Sales</h2>
              <p className="text-xs text-primary/60">Daily paid volume</p>
            </div>
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>

          <div className="h-48 flex items-end justify-between gap-2 pt-6">
            {salesChart.map(item => {
              const maxAmount = Math.max(...salesChart.map(s => s.amount), 1);
              const heightPercent = Math.max(10, (item.amount / maxAmount) * 100);

              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-accent">
                    {item.amount > 0 ? `₹${(item.amount / 100).toFixed(0)}` : ''}
                  </span>
                  <div
                    className="w-full bg-butter border border-border rounded-t-lg transition-all duration-300 hover:bg-accent"
                    style={{ height: `${heightPercent}%` }}
                    title={`${item.date}: ₹${(item.amount / 100).toFixed(0)}`}
                  />
                  <span className="text-[10px] font-bold text-primary/60 truncate w-full text-center">
                    {item.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Low Stock Warning Box */}
        <Card className="lg:col-span-4 p-6 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/10">
            <h2 className="font-editorial text-lg font-bold text-primary flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-accent" />
              <span>Low Inventory</span>
            </h2>
            <Link to="/admin/inventory" className="text-xs font-bold text-accent hover:underline">
              Adjust Stock
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="text-xs text-emerald-700 font-bold py-6 text-center">
              ✓ All inventory levels are healthy!
            </p>
          ) : (
            <div className="space-y-2.5">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface">
                  <div className="truncate pr-2">
                    <span className="font-bold text-primary block truncate">{p.name}</span>
                    <span className="text-[10px] text-primary/50 font-mono">SKU: {p.sku}</span>
                  </div>
                  <Badge variant={p.stock <= 0 ? 'dark' : 'accent'} className="text-[10px]">
                    {p.stock} left
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="p-4 sm:p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/10">
          <div>
            <h2 className="font-editorial text-lg sm:text-xl font-bold text-primary">Recent Orders</h2>
            <p className="text-xs text-primary/60">Latest store transactions</p>
          </div>
          <Link to="/admin/orders" className="self-start sm:self-auto">
            <Button size="sm" variant="outline">
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-xs font-medium">
            <thead>
              <tr className="border-b border-border/20 text-primary/60 uppercase tracking-wider text-[10px]">
                <th className="py-2.5">Order</th>
                <th className="py-2.5">Customer</th>
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Total</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-surface/50">
                  <td className="py-3 font-mono font-bold text-primary">#{order.orderNumber}</td>
                  <td className="py-3 font-bold">{order.user?.name || order.user?.email}</td>
                  <td className="py-3 text-primary/60">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3 font-editorial font-bold text-sm">₹{(order.total / 100).toFixed(0)}</td>
                  <td className="py-3">
                    <Badge variant={order.status === 'DELIVERED' ? 'sage' : order.status === 'CANCELLED' ? 'dark' : 'accent'}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">
                    <Link to={`/admin/orders?search=${order.orderNumber}`} className="text-xs font-bold text-accent hover:underline">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
