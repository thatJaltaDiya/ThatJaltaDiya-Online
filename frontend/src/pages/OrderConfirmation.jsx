import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Package, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';

export function OrderConfirmation() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const order = location.state?.order;

  return (
    <>
      <Helmet>
        <title>{`Order Confirmed #${orderNumber} | That Jalta Diya`}</title>
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-border flex items-center justify-center mx-auto mb-6 shadow-pop animate-in zoom-in-75">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>

        <Badge variant="butter" tilt={true} className="mb-3">ORDER RECEIVED</Badge>
        <h1 className="font-editorial text-3xl sm:text-5xl font-extrabold text-primary mb-3">
          Thank You For Your Order! 🎉
        </h1>
        <p className="text-base text-primary/80 font-medium max-w-lg mx-auto mb-8">
          Your artisanal candles are being handcrafted with love. We have dispatched a confirmation email to your inbox.
        </p>

        <Card className="p-6 text-left bg-surface max-w-xl mx-auto space-y-4 mb-8">
          <div className="flex items-center justify-between pb-3 border-b border-border/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary/60">Order Reference</span>
              <div className="font-mono font-extrabold text-accent text-base sm:text-lg">#{orderNumber}</div>
            </div>
            <Badge variant="sage">CONFIRMED</Badge>
          </div>

          {order && (
            <div className="space-y-2 text-xs font-medium text-primary/80">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-primary font-editorial text-base">₹{(order.total / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className="font-bold text-emerald-700">{order.paymentStatus}</span>
              </div>
              {order.shippingAddress && (
                <div className="pt-2 border-t border-border/10">
                  <span className="font-bold block text-primary">Shipping Destination:</span>
                  <span>{order.shippingAddress.recipientName}, {order.shippingAddress.street}, {order.shippingAddress.city} - {order.shippingAddress.postalCode}</span>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/account">
            <Button variant="primary">
              <Package className="w-4 h-4 mr-2" />
              <span>Track In Order History</span>
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline">
              <span>Continue Shopping</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
