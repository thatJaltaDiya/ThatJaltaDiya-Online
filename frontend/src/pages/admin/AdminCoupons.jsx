import React, { useState, useEffect } from 'react';
import { Plus, Tag, Trash2, Edit2, Percent, DollarSign } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    minOrderValue: 999, // in Rupees
    maxDiscount: '',
    isActive: true,
  });

  const loadCoupons = async () => {
    try {
      const res = await api.get('/admin/coupons');
      if (res.success) {
        setCoupons(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      discountValue: Number(form.discountValue),
      minOrderValue: Math.round(Number(form.minOrderValue) * 100),
      maxDiscount: form.maxDiscount ? Math.round(Number(form.maxDiscount) * 100) : null,
    };

    try {
      const res = await api.post('/admin/coupons', payload);
      if (res.success) {
        showToast({ type: 'success', message: 'Coupon created!' });
        setModalOpen(false);
        loadCoupons();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Cannot create coupon' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      const res = await api.delete(`/admin/coupons/${id}`);
      if (res.success) {
        showToast({ type: 'info', message: 'Coupon deleted.' });
        loadCoupons();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Cannot delete coupon' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="butter" tilt={true} className="mb-2">PROMOTIONS</Badge>
          <h1 className="font-editorial text-3xl font-extrabold text-primary">
            Coupons & Discounts ({coupons.length})
          </h1>
        </div>
        <Button variant="accent" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Coupon</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coupons.map(c => (
          <Card key={c.id} className="p-5 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-accent" />
                <span className="font-mono text-base font-black tracking-wider text-primary">{c.code}</span>
              </div>
              <Badge variant={c.isActive ? 'sage' : 'dark'}>
                {c.isActive ? 'ACTIVE' : 'DISABLED'}
              </Badge>
            </div>

            <p className="text-xs text-primary/70">{c.description || 'Promotional coupon'}</p>

            <div className="text-xs font-semibold text-primary/80 pt-2 border-t border-border/10 flex justify-between">
              <span>Discount: <strong>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${(c.discountValue / 100).toFixed(0)}`}</strong></span>
              <span>Min Order: <strong>₹{(c.minOrderValue / 100).toFixed(0)}</strong></span>
              <span>Used: <strong>{c.usageCount} times</strong></span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleDelete(c.id)}
                className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Coupon">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Coupon Code *"
            required
            placeholder="e.g. WELCOME10"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
          <Input
            label="Description"
            placeholder="e.g. 10% off for first-time shoppers"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                Type
              </label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="w-full px-3 py-2 min-h-[44px] bg-white rounded-xl border-2 border-border text-xs font-bold"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat INR (₹)</option>
              </select>
            </div>
            <Input
              label="Discount Value *"
              type="number"
              required
              placeholder={form.discountType === 'PERCENTAGE' ? '15' : '200'}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min Order (₹)"
              type="number"
              placeholder="999"
              value={form.minOrderValue}
              onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
            />
            <Input
              label="Max Discount Cap (₹)"
              type="number"
              placeholder="500"
              value={form.maxDiscount}
              onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={submitting}>
              Create Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
