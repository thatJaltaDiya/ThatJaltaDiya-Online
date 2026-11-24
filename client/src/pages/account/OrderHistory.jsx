import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, AlertCircle, Eye, X } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const { showToast } = useToast();

  const loadOrders = async () => {
    try {
      const res = await api.get('/orders');
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
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? Stock will be restored.')) return;
    setCancellingId(orderId);
    try {
      const res = await api.post(`/orders/${orderId}/cancel`);
      if (res.success) {
        showToast({ type: 'success', message: 'Order cancelled successfully.' });
        loadOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null);
        }
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Cannot cancel order.' });
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-12 text-center bg-white space-y-4">
        <Package className="w-12 h-12 text-primary/40 mx-auto" />
        <h3 className="font-editorial text-2xl font-bold text-primary">No Orders Yet</h3>
        <p className="text-xs text-primary/70 max-w-sm mx-auto">
          You haven't placed any gift orders yet. Explore our candle bouquets drop!
        </p>
        <Link to="/shop">
          <Button variant="accent">Explore Catalog</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map(order => {
        const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED';

        return (
          <Card key={order.id} className="p-5 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/10 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary/60">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div className="font-mono font-extrabold text-primary text-base">
                  #{order.orderNumber}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    order.status === 'DELIVERED' ? 'sage' :
                    order.status === 'CANCELLED' ? 'dark' :
                    order.status === 'SHIPPED' ? 'butter' : 'accent'
                  }
                >
                  {order.status}
                </Badge>
              </div>
            </div>

            {/* Tracking snippet if shipped */}
            {order.trackingNumber && (
              <div className="p-2.5 rounded-xl bg-butter/30 border border-butter flex items-center gap-2 text-xs font-bold text-primary">
                <Truck className="w-4 h-4 text-accent" />
                <span>Shipped via {order.courier || 'Courier'}: Tracking #{order.trackingNumber}</span>
              </div>
            )}

            {/* Items snippet */}
            <div className="space-y-2">
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {item.image && (
                      <img src={item.image} alt="" className="w-8 h-8 rounded-md border border-border object-cover" />
                    )}
                    <span className="font-bold text-primary">{item.quantity}x</span>
                    <span className="text-primary/80">{item.productName}</span>
                  </div>
                  <span className="font-bold font-mono">₹{((item.price * item.quantity) / 100).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary/60 block">Total</span>
                <span className="font-editorial text-lg font-black text-primary">₹{(order.total / 100).toFixed(0)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  <span>View Details</span>
                </Button>

                {canCancel && (
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={cancellingId === order.id}
                    onClick={() => handleCancelOrder(order.id)}
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order #${selectedOrder.orderNumber}` : ''}
        maxWidth="max-w-xl"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs font-medium">
            <div className="flex justify-between items-center p-3 rounded-xl bg-surface border border-border/20">
              <div>
                <span className="text-primary/60 block text-[10px] uppercase font-bold">Status</span>
                <Badge variant="accent">{selectedOrder.status}</Badge>
              </div>
              <div className="text-right">
                <span className="text-primary/60 block text-[10px] uppercase font-bold">Payment</span>
                <span className="font-bold text-emerald-700">{selectedOrder.paymentStatus} ({selectedOrder.paymentMethod})</span>
              </div>
            </div>

            {selectedOrder.shippingAddress && (
              <div className="p-3 rounded-xl border border-border/20 bg-white">
                <span className="font-bold block text-primary mb-1">Shipping Destination:</span>
                <p className="text-primary/80">
                  {selectedOrder.shippingAddress.recipientName}<br />
                  {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.apartment || ''}<br />
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.postalCode}<br />
                  Ph: {selectedOrder.shippingAddress.phone}
                </p>
              </div>
            )}

            {selectedOrder.giftMessage && (
              <div className="p-3 rounded-xl border border-accent/30 bg-pink-50/50">
                <span className="font-bold block text-accent mb-1">Gift Message:</span>
                <p className="text-primary/80 italic">"{selectedOrder.giftMessage}"</p>
              </div>
            )}

            {/* Price breakdown */}
            <div className="pt-2 border-t border-border/10 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold">₹{(selectedOrder.subtotal / 100).toFixed(0)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount:</span>
                  <span className="font-bold">-₹{(selectedOrder.discount / 100).toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="font-bold">{selectedOrder.shippingFee === 0 ? 'FREE' : `₹${(selectedOrder.shippingFee / 100).toFixed(0)}`}</span>
              </div>
              <div className="pt-2 border-t border-border/20 flex justify-between items-baseline font-editorial text-base font-bold text-primary">
                <span>Total:</span>
                <span className="text-xl font-black text-accent">₹{(selectedOrder.total / 100).toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
