import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card } from '../components/ui/Card.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function Cart() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [shippingSettings, setShippingSettings] = useState({ shippingFee: 0, freeShippingThreshold: 0 });

  useEffect(() => {
    api.get('/settings/public').then((res) => {
      if (res?.success && res.data) {
        setShippingSettings({
          shippingFee: Number(res.data.shippingFee ?? 0),
          freeShippingThreshold: Number(res.data.freeShippingThreshold ?? 0),
        });
      }
    }).catch(() => {});
  }, []);

  const estimatedDelivery = cart.subtotal >= shippingSettings.freeShippingThreshold ? 0 : shippingSettings.shippingFee;

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 px-4">
        <h1 className="sr-only">Shopping Bag</h1>
        <div className="w-20 h-20 rounded-full bg-surface border-2 border-border flex items-center justify-center mx-auto mb-6 shadow-pop">
          <ShoppingBag className="w-10 h-10 text-accent" />
        </div>
        <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-primary mb-3">
          Your Bag is Empty
        </h2>
        <p className="text-sm text-primary/70 max-w-sm mx-auto mb-8 font-medium">
          Looks like you haven't picked any handcrafted candle bouquets or aesthetic gift hampers yet!
        </p>
        <Link to="/shop">
          <Button variant="accent" size="lg">
            <span>Explore The Catalog</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Your Bag (${cart.totalItems}) | That Jalta Diya`}</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <Badge variant="butter" tilt={true} className="mb-2">BAG REVIEW</Badge>
          <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary break-words">
            Your Selected Gifts ({cart.totalItems})
          </h1>
        </div>

        {/* Main Grid: Items + Order Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Items List */}
          <div className="lg:col-span-8 space-y-4">
            {cart.items.map(item => (
              <Card key={item.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link to={`/product/${item.productSlug}`} className="w-24 h-24 rounded-xl border-2 border-border overflow-hidden bg-surface flex-shrink-0">
                  <img src={item.image || "/uploads/placeholder.webp"} alt={item.productName} className="w-full h-full object-cover" />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.productSlug}`}>
                    <h3 className="font-sans text-base font-bold text-primary hover:text-accent truncate">
                      {item.productName}
                    </h3>
                  </Link>
                  {item.variantName && (
                    <span className="inline-block text-xs font-semibold text-primary/70 mt-0.5">
                      Style: {item.variantName}
                    </span>
                  )}
                  <div className="text-sm font-extrabold text-accent mt-1">
                    ₹{(item.price / 100).toFixed(0)}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/10">
                  <div className="flex items-center border-2 border-border rounded-full bg-white shadow-pop-sm">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center font-bold text-base hover:bg-surface rounded-l-full min-h-[36px]"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold select-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.availableStock}
                      className="w-8 h-8 flex items-center justify-center font-bold text-base hover:bg-surface rounded-r-full disabled:opacity-40 min-h-[36px]"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-editorial text-base font-extrabold text-primary w-20 text-right">
                    ₹{(item.itemTotal / 100).toFixed(0)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-primary/50 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors ml-2"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-4">
            <Card className="p-6 bg-surface-card space-y-6">
              <h2 className="font-editorial text-xl font-bold text-primary pb-3 border-b border-border/10">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm font-medium">
                <div className="flex justify-between">
                  <span className="text-primary/70">Bag Subtotal</span>
                  <span className="font-bold text-primary">₹{(cart.subtotal / 100).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/70">Estimated Delivery</span>
                  <span className="font-bold text-primary">
                    {estimatedDelivery === 0 ? '₹0' : `₹${(estimatedDelivery / 100).toFixed(0)}`}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-border flex justify-between items-baseline">
                <span className="font-editorial text-lg font-extrabold text-primary">Estimated Total</span>
                <span className="font-editorial text-2xl font-black text-accent">
                  ₹{((cart.subtotal + estimatedDelivery) / 100).toFixed(0)}
                </span>
              </div>

              <Button
                variant="accent"
                size="lg"
                onClick={handleCheckoutClick}
                className="w-full text-sm font-extrabold uppercase tracking-wider py-3.5"
              >
                <span>Proceed To Checkout</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
