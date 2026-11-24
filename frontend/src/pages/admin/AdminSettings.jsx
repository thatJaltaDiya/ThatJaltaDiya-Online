import React, { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminSettings() {
  const [settings, setSettings] = useState({
    shippingFee: 9900,
    freeShippingThreshold: 149900,
    announcementText: '',
    supportEmail: '',
    supportPhone: '',
  });
  const [demoStatus, setDemoStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [settingsRes, demoRes] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/demo-status'),
      ]);
      if (settingsRes.success) {
        setSettings(settingsRes.data);
      }
      if (demoRes.success) {
        setDemoStatus(demoRes.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSetting = async (key, value) => {
    setSaving(true);
    try {
      const res = await api.patch('/admin/settings', { key, value });
      if (res.success) {
        showToast({ type: 'success', message: 'Setting saved!' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDemoData = async () => {
    setCleaningUp(true);
    try {
      const res = await api.post('/admin/demo-cleanup');
      if (res.success) {
        showToast({
          type: 'success',
          message: `All demo products (${res.data.deletedProducts}) and categories successfully deleted!`,
        });
        setCleanupModalOpen(false);
        loadData();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Cleanup failed' });
    } finally {
      setCleaningUp(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Badge variant="butter" tilt={true} className="mb-2">CONFIGURATION</Badge>
        <h1 className="font-editorial text-3xl font-extrabold text-primary">
          Site Settings & Danger Zone
        </h1>
        <p className="text-xs text-primary/60">Configure delivery rules, announcement marquee, and demo data.</p>
      </div>

      {/* Shipping & Delivery Configuration */}
      <Card className="p-6 bg-white space-y-4">
        <h3 className="font-editorial text-lg font-bold text-primary">Shipping & Delivery Fees</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Standard Shipping Charge (₹)"
              type="number"
              value={settings.shippingFee ? settings.shippingFee / 100 : ''}
              onChange={(e) => setSettings({ ...settings, shippingFee: Number(e.target.value) * 100 })}
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-xs"
              isLoading={saving}
              onClick={() => handleSaveSetting('shippingFee', settings.shippingFee)}
            >
              Update Fee
            </Button>
          </div>

          <div>
            <Input
              label="Free Shipping Order Threshold (₹)"
              type="number"
              value={settings.freeShippingThreshold ? settings.freeShippingThreshold / 100 : ''}
              onChange={(e) => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) * 100 })}
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-xs"
              isLoading={saving}
              onClick={() => handleSaveSetting('freeShippingThreshold', settings.freeShippingThreshold)}
            >
              Update Threshold
            </Button>
          </div>
        </div>
      </Card>

      {/* Announcement Marquee */}
      <Card className="p-6 bg-white space-y-4">
        <h3 className="font-editorial text-lg font-bold text-primary">Top Announcement Marquee</h3>
        <textarea
          rows={2}
          value={settings.announcementText || ''}
          onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
          className="w-full p-3 rounded-xl border-2 border-border text-xs font-bold outline-none focus:border-accent"
          placeholder="HANDCRAFTED SOY CANDLE BOUQUETS ✨ FREE DELIVERY OVER ₹1499"
        />
        <Button
          size="sm"
          variant="primary"
          isLoading={saving}
          onClick={() => handleSaveSetting('announcementText', settings.announcementText)}
        >
          Save Banner Text
        </Button>
      </Card>

      {/* Danger Zone: Delete All Demo Data */}
      <Card className="p-6 bg-red-50 border-2 border-red-300 space-y-4">
        <div className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="font-editorial text-xl font-bold">Danger Zone: Store Demo Data</h3>
        </div>

        <p className="text-xs text-red-950 font-medium leading-relaxed">
          The store is currently seeded with realistic fake demo candle bouquets and categories.
          Once the business owner is ready with real photos and products, clicking this button safely removes all demo content from the database and storage. Past order snapshots will be preserved.
        </p>

        {demoStatus && (
          <div className="p-3 bg-white/80 rounded-xl border border-red-200 text-xs font-bold text-red-900 flex gap-4">
            <span>Demo Products: {demoStatus.counts.products}</span>
            <span>Demo Categories: {demoStatus.counts.categories}</span>
            <span>Demo Testimonials: {demoStatus.counts.testimonials}</span>
          </div>
        )}

        <div>
          <Button
            variant="danger"
            size="md"
            onClick={() => setCleanupModalOpen(true)}
            disabled={!demoStatus?.hasDemoData}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            <span>Delete All Demo Data</span>
          </Button>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={cleanupModalOpen}
        onClose={() => setCleanupModalOpen(false)}
        title="Confirm Bulk Demo Data Deletion"
      >
        <div className="space-y-4 text-xs font-medium text-primary">
          <p className="text-red-700 font-bold">
            ⚠️ WARNING: This will permanently remove all {demoStatus?.counts.products} demo products, categories, and their generated images from storage.
          </p>
          <p>
            Any customer orders that reference demo products will safely keep their order item snapshots.
          </p>
          <div className="pt-2 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setCleanupModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" isLoading={cleaningUp} onClick={handleDeleteDemoData}>
              Yes, Delete All Demo Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
