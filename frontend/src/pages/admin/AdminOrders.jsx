import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Printer, Eye, Truck, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const { showToast } = useToast();

  const statusFilter = searchParams.get('status') || '';
  const paymentStatusFilter = searchParams.get('paymentStatus') || '';
  const searchQuery = searchParams.get('search') || '';

  // Order status update form state
  const [statusForm, setStatusForm] = useState({
    status: '',
    internalNotes: '',
  });

  const loadOrders = async () => {
    try {
      const queryParts = [];
      if (statusFilter) queryParts.push(`status=${encodeURIComponent(statusFilter)}`);
      if (paymentStatusFilter) queryParts.push(`paymentStatus=${encodeURIComponent(paymentStatusFilter)}`);
      if (searchQuery) queryParts.push(`search=${encodeURIComponent(searchQuery)}`);
      const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

      const res = await api.get(`/admin/orders${qs}`);
      if (res.success) {
        setOrders(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, paymentStatusFilter, searchQuery]);

  const handleOpenDetail = (order) => {
    setSelectedOrder(order);
    setStatusForm({
      status: order.status,
      internalNotes: order.internalNotes || '',
    });
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      const res = await api.patch(`/admin/orders/${selectedOrder.id}/status`, statusForm);
      if (res.success) {
        showToast({ type: 'success', message: 'Order status updated and customer notified!' });
        setSelectedOrder(res.data);
        loadOrders();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Update failed' });
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Badge variant="butter" tilt={true} className="mb-2">FULFILLMENT</Badge>
          <h1 className="font-editorial text-2xl sm:text-3xl font-extrabold text-primary">
            Customer Orders ({orders.length})
          </h1>
        </div>
      </div>

      {/* Filter strip */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-primary/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, customer name, tracking #..."
            value={searchQuery}
            onChange={(e) => setSearchParams({ status: statusFilter, paymentStatus: paymentStatusFilter, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-full border border-border/30 text-xs font-bold focus:border-primary/40 focus:ring-1 focus:ring-primary/10 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card className="p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs font-medium">
            <thead className="bg-surface border-b-2 border-border text-primary/70 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-primary">#{order.orderNumber}</td>
                  <td className="py-3.5 px-4 text-primary/60">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-primary">{order.user?.name || 'Customer'}</div>
                    <div className="text-[10px] text-primary/50">{order.user?.email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold">{order.items?.length || 0} items</td>
                  <td className="py-3.5 px-4 font-editorial font-bold text-sm">₹{(order.total / 100).toFixed(0)}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant={order.status === 'DELIVERED' ? 'sage' : order.status === 'CANCELLED' ? 'dark' : order.status === 'SHIPPED' ? 'butter' : 'accent'}>
                        {order.status}
                      </Badge>
                      {order.internalNotes?.includes('[REPLACEMENT_REQUESTED]') && (
                        <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded-full">
                          Replacement Requested
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button size="sm" variant="outline" onClick={() => handleOpenDetail(order)}>
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>Manage</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Detail & Packing Slip Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order #${selectedOrder.orderNumber}` : ''}
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {selectedOrder.internalNotes?.includes('[REPLACEMENT_REQUESTED]') && (
              <div className="p-3.5 rounded-xl border-2 border-accent bg-accent/5 text-xs font-bold text-primary">
                <span className="block text-accent font-extrabold uppercase tracking-wider mb-0.5">
                  Replacement Requested
                </span>
                <span>Customer requested a free replacement (no extra charges) for this delivered order.</span>
              </div>
            )}
            {/* Status & Local Fulfillment Form */}
            <form onSubmit={handleUpdateStatus} className="p-4 rounded-xl border-2 border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-editorial text-sm font-bold text-primary">Order Status & Local Fulfillment</h4>
                <Badge variant="sage" className="text-[10px]">Local Hand Delivery</Badge>
              </div>

              <div className="p-2.5 rounded-lg bg-butter/30 border border-butter text-[11px] font-medium text-primary/80">
                🌱 <strong>Direct Local Delivery:</strong> Products are handcrafted and delivered directly by our team. No third-party courier agents or tracking numbers are needed.
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Order Status
                </label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-lg border-2 border-border text-xs font-bold outline-none"
                >
                  <option value="PENDING">PENDING (Awaiting Confirmation)</option>
                  <option value="CONFIRMED">CONFIRMED (Order Accepted)</option>
                  <option value="PROCESSING">PROCESSING (Crafting Bouquet / Packing)</option>
                  <option value="DELIVERED">DELIVERED (Delivered to Customer)</option>
                </select>
              </div>

              <Input
                label="Internal Admin Notes (Private)"
                placeholder="e.g. Special gift wrapping, hand delivery instructions"
                value={statusForm.internalNotes}
                onChange={(e) => setStatusForm({ ...statusForm, internalNotes: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-1">
                <Button type="submit" variant="accent" size="sm" isLoading={updating}>
                  Update Order Status
                </Button>
              </div>
            </form>

            {/* Printable Packing Slip / Invoice Section */}
            <div id="printable-invoice" className="p-3.5 sm:p-5 rounded-2xl border-2 border-border bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-border/10">
                <div>
                  <h3 className="font-editorial text-lg sm:text-xl font-extrabold text-primary">That Jalta Diya</h3>
                  <p className="text-[10px] text-primary/60">Handcrafted Candle Bouquets & Gifts Atelier</p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-surface self-start sm:self-auto"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-primary/50 block">Customer</span>
                  <div className="font-bold text-primary">{selectedOrder.user?.name}</div>
                  <div className="text-primary/70">{selectedOrder.user?.email}</div>
                </div>
                {selectedOrder.shippingAddress && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-primary/50 block">Ship To</span>
                    <div className="font-bold text-primary">{selectedOrder.shippingAddress.recipientName}</div>
                    <div className="text-primary/70">
                      {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city} - {selectedOrder.shippingAddress.postalCode}
                    </div>
                  </div>
                )}
              </div>

              {selectedOrder.notes && (
                <div className="p-2.5 rounded-lg bg-surface border border-border text-xs">
                  <span className="font-bold text-primary block">Customer Order Notes:</span>
                  <span className="text-primary/80">{selectedOrder.notes}</span>
                </div>
              )}

              {/* Itemized Table */}
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border/20 text-primary/60 text-[10px] uppercase">
                  <tr>
                    <th className="py-1.5">Item</th>
                    <th className="py-1.5 text-center">Qty</th>
                    <th className="py-1.5 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {selectedOrder.items?.map(it => (
                    <tr key={it.id}>
                      <td className="py-2 font-bold text-primary">{it.productName}</td>
                      <td className="py-2 text-center font-bold">{it.quantity}</td>
                      <td className="py-2 text-right font-mono">₹{((it.price * it.quantity) / 100).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2 border-t border-border/20 flex justify-between font-editorial font-bold text-sm">
                <span>Total Amount:</span>
                <span className="text-accent text-lg">₹{(selectedOrder.total / 100).toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
