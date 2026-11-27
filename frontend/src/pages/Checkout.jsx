import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Truck, Check, Lock, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../services/api.js';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [shippingSettings, setShippingSettings] = useState({ shippingFee: 0, freeShippingThreshold: 0 });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }

    async function loadCheckoutInit() {
      try {
        const [addrRes, payRes, settingsRes] = await Promise.all([
          api.get('/addresses'),
          api.get('/payments/config').catch(() => ({ success: false })),
          api.get('/settings/public').catch(() => ({ success: false })),
        ]);
        if (addrRes.success && addrRes.data.length > 0) {
          setSavedAddresses(addrRes.data);
          const defaultAddr = addrRes.data.find(a => a.isDefault) || addrRes.data[0];
          setSelectedAddressId(defaultAddr.id);
        } else {
          setIsAddingNewAddress(true);
        }
        if (payRes?.success && payRes.data?.enabled) {
          setRazorpayEnabled(true);
        }
        if (settingsRes?.success && settingsRes.data) {
          setShippingSettings({
            shippingFee: Number(settingsRes.data.shippingFee ?? 0),
            freeShippingThreshold: Number(settingsRes.data.freeShippingThreshold ?? 0),
          });
        }
      } catch {
        setIsAddingNewAddress(true);
      }
    }
    loadCheckoutInit();
  }, [isAuthenticated, navigate]);

  const calculateShippingFee = () => {
    return cart.subtotal >= shippingSettings.freeShippingThreshold ? 0 : shippingSettings.shippingFee;
  };

  const calculateFinalTotal = () => {
    return Math.max(0, cart.subtotal + calculateShippingFee());
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

    if (
      (!selectedAddressId || isAddingNewAddress) &&
      (
        !newAddress.recipientName.trim() ||
        !newAddress.phone.trim() ||
        !newAddress.street.trim() ||
        !newAddress.city.trim() ||
        !newAddress.state.trim() ||
        !newAddress.postalCode.trim()
      )
    ) {
      showToast({ type: 'error', message: 'Please fill in all required shipping address fields (name, phone, street, city, state, PIN code).' });
      return;
    }

    setIsPlacingOrder(true);
    const idempotencyKey = crypto.randomUUID();

    try {
      let payload = {
        paymentMethod: razorpayEnabled ? 'RAZORPAY' : 'TEST',
        notes: notes || null,
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
        if (razorpayEnabled) {
          const loaded = await loadRazorpayScript();
          if (!loaded) {
            throw new Error('Could not load Razorpay checkout. Please check your connection and try again.');
          }

          const intentRes = await api.post('/payments/razorpay/order', {
            orderId: res.data.id,
          });

          if (!intentRes.success) {
            throw new Error(intentRes.error?.message || 'Failed to initialize Razorpay payment.');
          }

          const { keyId, razorpayOrderId, amount, currency, orderNumber } = intentRes.data;
          const rzp = new window.Razorpay({
            key: keyId,
            amount,
            currency,
            name: 'That Jalta Diya',
            description: `Order #${orderNumber}`,
            image: `${window.location.origin}/logo.jpg`,
            order_id: razorpayOrderId,
            prefill: {
              name: user?.name || '',
              email: user?.email || '',
              contact: user?.phone || '',
            },
            theme: { color: '#E01E5A' },
            handler: async (response) => {
              try {
                const verifyRes = await api.post('/payments/razorpay/verify', {
                  orderId: res.data.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
                if (verifyRes.success) {
                  clearCartState();
                  showToast({ type: 'success', message: 'Payment verified & order confirmed! ✨' });
                  navigate(`/order-confirmation/${orderNumber}`, { state: { order: verifyRes.data } });
                }
              } catch (verifyErr) {
                showToast({ type: 'error', message: verifyErr.message || 'Payment verification failed.' });
                setIsPlacingOrder(false);
              }
            },
            modal: {
              ondismiss: () => {
                setIsPlacingOrder(false);
                showToast({ type: 'info', message: 'Payment cancelled. Your order is saved as pending.' });
              },
            },
          });

          rzp.open();
          return;
        }

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
        <h1 className="sr-only">Checkout</h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <Badge variant="butter" tilt={true} className="mb-2">CHECKOUT</Badge>
          <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary break-words">
            Complete Your Gift Order
          </h1>
        </div>

        {/* Email Verification Alert Banner */}
        {!user?.isEmailVerified && (
          <div className="mb-6 p-3.5 sm:p-4 rounded-xl border-2 border-accent bg-red-50 text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold">
            <span className="break-words">
              ⚠️ Your email ({user?.email}) is not verified yet. Verification is required before placing an order.
            </span>
            <Link to="/account" className="underline text-accent whitespace-nowrap">Verify Now</Link>
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
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedAddressId === addr.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm font-bold'
                          : 'border-border/30 hover:border-border/60'
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

            {/* Step 2: Payment Method (Razorpay) */}
            <Card className="p-6">
              <h2 className="font-editorial text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                <span>2. Payment Method</span>
              </h2>

              <div className="p-4 rounded-xl border border-primary/25 bg-surface/60 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">Razorpay Checkout</span>
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      100% Secure
                    </span>
                  </div>
                  <p className="text-xs text-primary/70 font-medium">
                    Pay via UPI, Credit &amp; Debit Cards, NetBanking, or Wallets. You will be prompted to complete payment when placing your order.
                  </p>
                </div>
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

              {/* Price Breakdown */}
              <div className="space-y-2.5 text-sm font-medium pt-3 border-t border-border/10">
                <div className="flex justify-between">
                  <span className="text-primary/70">Subtotal</span>
                  <span className="font-bold text-primary">₹{(cart.subtotal / 100).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/70">Shipping</span>
                  <span className="font-bold text-primary">
                    ₹{(calculateShippingFee() / 100).toFixed(0)}
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
