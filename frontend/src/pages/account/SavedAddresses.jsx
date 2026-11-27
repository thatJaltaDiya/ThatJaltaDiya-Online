import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Trash2, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function SavedAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    recipientName: '',
    phone: '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
  });

  const loadAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      if (res.success) {
        setAddresses(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    if (addresses.length >= 10) {
      showToast({ type: 'error', message: 'Maximum limit of 10 addresses reached.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/addresses', form);
      if (res.success) {
        showToast({ type: 'success', message: 'Address saved successfully!' });
        setModalOpen(false);
        setForm({
          recipientName: '',
          phone: '',
          street: '',
          apartment: '',
          city: '',
          state: '',
          postalCode: '',
          isDefault: false,
        });
        loadAddresses();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to save address.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this saved address?')) return;
    try {
      const res = await api.delete(`/addresses/${id}`);
      if (res.success) {
        showToast({ type: 'info', message: 'Address removed.' });
        loadAddresses();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Cannot delete address.' });
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await api.patch(`/addresses/${id}/default`);
      if (res.success) {
        showToast({ type: 'success', message: 'Default address updated.' });
        loadAddresses();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Error updating default.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-primary">Saved Addresses</h2>
          <p className="text-xs text-primary/60">Manage up to 10 delivery addresses for quick gifting checkout.</p>
        </div>
        <Button
          size="sm"
          variant="accent"
          onClick={() => setModalOpen(true)}
          disabled={addresses.length >= 10}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add Address</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map(addr => (
          <Card key={addr.id} className="p-5 bg-white relative space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm text-primary">{addr.recipientName}</h3>
                <p className="text-xs text-primary/60 font-mono mt-0.5">{addr.phone}</p>
              </div>
              {addr.isDefault && (
                <Badge variant="butter" className="text-[10px]">DEFAULT</Badge>
              )}
            </div>

            <p className="text-xs text-primary/80 font-medium leading-relaxed">
              {addr.street}, {addr.apartment ? `${addr.apartment}, ` : ''}{addr.city}, {addr.state} - {addr.postalCode}
            </p>

            <div className="pt-2 border-t border-border/10 flex items-center justify-between">
              {!addr.isDefault ? (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-xs font-bold text-primary hover:text-accent cursor-pointer"
                >
                  Set as Default
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Default Address
                </span>
              )}

              <button
                onClick={() => handleDeleteAddress(addr.id)}
                className="text-primary/50 hover:text-red-600 p-1 rounded-full cursor-pointer"
                aria-label="Delete address"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Address Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Delivery Address">
        <form onSubmit={handleCreateAddress} className="space-y-4">
          <Input
            label="Recipient Name"
            required
            value={form.recipientName}
            onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
          />
          <Input
            label="Phone Number"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="House / Street Address"
            required
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
          />
          <Input
            label="Apartment / Landmark (Optional)"
            value={form.apartment}
            onChange={(e) => setForm({ ...form, apartment: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              label="State"
              required
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>
          <Input
            label="Pincode"
            required
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
          />

          <label className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded"
            />
            <span>Make this my default shipping address</span>
          </label>

          <Button type="submit" variant="accent" className="w-full" isLoading={submitting}>
            Save Address
          </Button>
        </form>
      </Modal>
    </div>
  );
}
