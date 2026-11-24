import React, { useState, useEffect } from 'react';
import { Boxes, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    change: 10,
    reason: 'MANUAL_RESTOCK',
    note: '',
  });

  const loadData = async () => {
    try {
      const [prodRes, logsRes] = await Promise.all([
        api.get('/admin/products?limit=100'),
        api.get('/admin/audit-logs?limit=30'), // or inventory logs
      ]);
      if (prodRes.success) setProducts(prodRes.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustForm.productId) return;
    setSubmitting(true);
    try {
      const res = await api.post('/admin/products/adjust-stock', {
        ...adjustForm,
        change: Number(adjustForm.change),
      });
      if (res.success) {
        showToast({ type: 'success', message: 'Stock adjusted successfully!' });
        setModalOpen(false);
        loadData();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Cannot adjust stock' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="butter" tilt={true} className="mb-2">WAREHOUSE</Badge>
          <h1 className="font-editorial text-3xl font-extrabold text-primary">
            Inventory Management
          </h1>
          <p className="text-xs text-primary/60">Live stock counts and quick restocking controls.</p>
        </div>
        <Button variant="accent" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Quick Restock</span>
        </Button>
      </div>

      {/* Current Product Inventory List */}
      <Card className="p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium">
            <thead className="bg-surface border-b-2 border-border text-primary/70 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Units Available</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-surface/50">
                  <td className="py-3.5 px-4 font-bold text-primary">{p.name}</td>
                  <td className="py-3.5 px-4 font-mono text-primary/60">{p.sku}</td>
                  <td className="py-3.5 px-4">{p.category?.name}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={p.stock <= 0 ? 'dark' : p.stock <= 5 ? 'accent' : 'sage'}>
                      {p.stock} units
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdjustForm({
                          productId: p.id,
                          change: 10,
                          reason: 'MANUAL_RESTOCK',
                          note: `Restocked ${p.name}`,
                        });
                        setModalOpen(true);
                      }}
                    >
                      Restock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Adjust Stock Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Adjust Inventory Count">
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Select Product *
            </label>
            <select
              value={adjustForm.productId}
              onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
              className="w-full px-3 py-2 min-h-[44px] bg-white rounded-xl border-2 border-border text-xs font-bold outline-none"
              required
            >
              <option value="">Select a product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.stock} in stock)</option>
              ))}
            </select>
          </div>

          <Input
            label="Quantity Adjustment (+ to add, - to subtract)"
            type="number"
            required
            value={adjustForm.change}
            onChange={(e) => setAdjustForm({ ...adjustForm, change: e.target.value })}
          />

          <Input
            label="Reason for Adjustment"
            value={adjustForm.reason}
            onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
            placeholder="e.g. BATCH_POURED, DAMAGED_SPILL, CORRECTION"
          />

          <Input
            label="Internal Note"
            value={adjustForm.note}
            onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
            placeholder="e.g. Poured 10 fresh units on Sunday"
          />

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={submitting}>
              Apply Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
