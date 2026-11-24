import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Truck, Gift, Check, Tag, Lock, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../services/api.js';

export function Checkout() {
  const { cart, clearCartState } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  // New Address form
  const [newAddress, setNewAddress] = useState({
    recipientName: user?.name || '',
    phone: user?.phone || '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
  });

  const [notes, setNotes] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }

    async function loadAddresses() {
      try {
        const res = await api.get('/addresses');
        if (res.success && res.data.length > 0) {
          setSavedAddresses(res.data);
          const defaultAddr = res.data.find(a => a.isDefault) || res.data[0];
          setSelectedAddressId(defaultAddr.id);
        } else {
          setIsAddingNewAddress(true);
        }
      } catch {
        setIsAddingNewAddress(true);
      }
    }
    loadAddresses();
  }, [isAuthenticated, navigate]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        subtotal: cart.subtotal,
      });
      if (res.success) {
        setAppliedCoupon(res.data);
        showToast({ type: 'success', message: 'Coupon applied successfully! 🎉' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Invalid coupon' });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const calculateFinalTotal = () => {
    const shippingFee = cart.subtotal >= 149900 ? 0 : 9900;
    const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
    return Math.max(0, cart.subtotal - discount + shippingFee);
  };

  const handlePlaceOrder = async () => {
    // Check email verification status
    if (!user?.isEmailVerified) {
      showToast({
        type: 'error',
        message: 'Please verify your email address before placing an order. Check your inbox for the verification link.',
      });
      return;
    }

    if (!selectedAddressId && (!newAddress.recipientName || !newAddress.street || !newAddress.city)) {
      showToast({ type: 'error', message: 'Please provide a valid shipping address.' });
      return;
    }

    setIsPlacingOrder(true);
    const idempotencyKey = crypto.randomUUID();

    try {
      let payload = {
        paymentMethod: 'TEST',
        couponCode: appliedCoupon?.code || null,
        notes: notes || null,
        giftMessage: giftMessage || null,
      };

      if (selectedAddressId && !isAddingNewAddress) {
        payload.shippingAddressId = selectedAddressId;
      } else {
        payload.shippingAddressSnapshot = {
          recipientName: newAddress.recipientName.trim(),
          phone: newAddress.phone.trim(),
          street: newAddress.street.trim(),
          apartment: newAddress.apartment.trim() || null,
          city: newAddress.city.trim(),
          state: newAddress.state.trim(),
          postalCode: newAddress.postalCode.trim(),
          country: 'IN',
        };
      }

      const res = await api.post('/orders', payload, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      if (res.success) {
        clearCartState();
        showToast({ type: 'success', message: 'Order placed successfully! ✨' });
        navigate(`/order-confirmation/${res.data.orderNumber}`, { state: { order: res.data } });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to place order.' });
      setIsPlacingOrder(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4">
        <h2 className="font-editorial text-2xl font-bold text-primary mb-3">Your Bag is Empty</h2>
        <Link to="/shop"><Button variant="accent">Continue Shopping</Button></Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Checkout | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <Badge variant="butter" tilt={true} className="mb-2">CHECKOUT</Badge>
          <h1 className="font-editorial text-3xl sm:text-4xl font-extrabold text-primary">
            Complete Your Gift Order
          </h1>
        </div>

        {/* Email Verification Alert Banner */}
        {!user?.isEmailVerified && (
          <div className="mb-6 p-4 rounded-xl border-2 border-accent bg-red-50 text-red-950 flex items-center justify-between text-xs font-bold">
            <span>
              ⚠️ Your email ({user?.email}) is not verified yet. Verification is required before placing an order.
            </span>
            <Link to="/account" className="underline text-accent">Verify Now</Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Checkout Form Columns */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Shipping Address Selection */}
            <Card className="p-6">
              <h2 className="font-editorial text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-accent" />
                <span>1. Shipping Address</span>
              </h2>

              {savedAddresses.length > 0 && !isAddingNewAddress ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map(addr => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-pop-sm font-bold'
                            : 'border-border/40 hover:border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-primary">
                          <span>{addr.recipientName}</span>
                          {addr.isDefault && <Badge variant="butter" className="text-[9px]">DEFAULT</Badge>}
                        </div>
                        <p className="text-xs text-primary/70 mt-1">
                          {addr.street}, {addr.apartment ? `${addr.apartment}, ` : ''}{addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                        <p className="text-xs text-primary/60 mt-1 font-mono">Ph: {addr.phone}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsAddingNewAddress(true)}
                    className="text-xs font-bold text-accent hover:underline mt-2 inline-block cursor-pointer"
                  >
                    + Ship to a new address
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedAddresses.length > 0 && (
                    <button
                      onClick={() => setIsAddingNewAddress(false)}
                      className="text-xs font-bold text-accent hover:underline mb-2 block cursor-pointer"
                    >
                      ← Select from saved addresses
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Recipient Full Name"
                      required
                      value={newAddress.recipientName}
                      onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                    />
                    <Input
                      label="Mobile Phone Number"
                      required
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Street Address / House No."
                    required
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      required
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    />
                    <Input
                      label="State"
                      required
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    />
                    <Input
                      label="Pincode"
                      required
                      value={newAddress.postalCode}
                      onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Step 2: Personalized Gift Note */}
            <Card className="p-6">
              <h2 className="font-editorial text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-accent" />
                <span>2. Complimentary Gift Message (Optional)</span>
              </h2>
              <textarea
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Write your sweet birthday wish, anniversary note, or message for the recipient. We will handwrite this on a bespoke pastel card inside the parcel! ✨"
                className="w-full p-3.5 rounded-xl border-2 border-border/80 bg-white text-sm font-medium focus:border-accent outline-none"
              />
            </Card>

            {/* Step 3: Payment Step Component (Section 9 Integration Point) */}
            <Card className="p-6 bg-surface border-2 border-border">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/10">
                <h2 className="font-editorial text-xl font-bold text-primary flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-accent" />
                  <span>3. Payment Method</span>
                </h2>
                <Badge variant="sage">DEV TEST MODE</Badge>
              </div>

              {/* 
                // =========================================================================
                // TODO: PAYMENT INTEGRATION
                // =========================================================================
                // In production, instantiate payment gateway client here (e.g. Razorpay modal,
                // Stripe Elements, or Cashfree SDK).
                // 1. Call /api/v1/payment/intent to get order_id & clientSecret
                // 2. Open gateway checkout modal
                // 3. Verify signature via backend adapter PaymentProvider.verifyPayment()
                // =========================================================================
              */}
              <div className="p-4 rounded-xl border-2 border-dashed border-border/50 bg-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Development Test Order Mode Active</span>
                </div>
                <p className="text-xs text-primary/70 leading-relaxed font-medium">
                  Payment gateway integration point is isolated per project brief (Section 9). Test orders proceed seamlessly with automated stock decrement, idempotency verification, and invoice generation.
                </p>
              </div>
            </Card>
          </div>

          {/* Order Summary Column */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 bg-white space-y-6">
              <h3 className="font-editorial text-xl font-bold text-primary pb-3 border-b border-border/10">
                Summary
              </h3>

              {/* Itemized Snapshot list */}
              <div className="space-y-3 max-h-56 overflow-y-auto no-scrollbar pr-1">
                {cart.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-bold text-primary">{item.quantity}x</span>{' '}
                      <span className="text-primary/80">{item.productName}</span>
                    </div>
                    <span className="font-bold text-primary">₹{(item.itemTotal / 100).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="pt-3 border-t border-border/10 flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code (e.g. WELCOME10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-border text-xs font-bold uppercase tracking-wider outline-none focus:border-accent"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  isLoading={applyingCoupon}
                >
                  Apply
                </Button>
              </form>

              {appliedCoupon && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{appliedCoupon.code} Applied</span>
                  </span>
                  <span>-₹{(appliedCoupon.discountAmount / 100).toFixed(0)}</span>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2.5 text-sm font-medium pt-3 border-t border-border/10">
                <div className="flex justify-between">
                  <span className="text-primary/70">Subtotal</span>
                  <span className="font-bold text-primary">₹{(cart.subtotal / 100).toFixed(0)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount</span>
                    <span>-₹{(appliedCoupon.discountAmount / 100).toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-primary/70">Shipping</span>
                  <span className="font-bold text-primary">
                    {cart.subtotal >= 149900 ? 'FREE' : '₹99'}
                  </span>
                </div>
                <div className="pt-3 border-t-2 border-border flex justify-between items-baseline font-editorial">
                  <span className="text-lg font-bold text-primary">Total Payable</span>
                  <span className="text-2xl font-black text-accent">₹{(calculateFinalTotal() / 100).toFixed(0)}</span>
                </div>
              </div>

              <Button
                variant="accent"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !user?.isEmailVerified}
                isLoading={isPlacingOrder}
                className="w-full font-extrabold uppercase tracking-wider py-4 shadow-pop"
              >
                <Lock className="w-4 h-4 mr-2" />
                <span>Place Order • ₹{(calculateFinalTotal() / 100).toFixed(0)}</span>
              </Button>

              <div className="text-center text-[11px] text-primary/60 font-semibold">
                By placing this order you agree to That Jalta Diya's store policies.
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
