import React, { useState, useEffect } from 'react';
import { Users, Ban, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadCustomers = async () => {
    try {
      const res = await api.get('/admin/customers');
      if (res.success) {
        setCustomers(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleToggleBlock = async (id, currentStatus) => {
    const action = currentStatus ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} this customer?`)) return;

    try {
      const res = await api.patch(`/admin/customers/${id}/toggle-block`);
      if (res.success) {
        showToast({ type: 'success', message: res.message });
        loadCustomers();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Action failed' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Badge variant="butter" tilt={true} className="mb-2">COMMUNITY</Badge>
        <h1 className="font-editorial text-3xl font-extrabold text-primary">
          Customer Accounts ({customers.length})
        </h1>
        <p className="text-xs text-primary/60">View customer lifetime spend and account statuses.</p>
      </div>

      <Card className="p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium">
            <thead className="bg-surface border-b-2 border-border text-primary/70 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Total Spent</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-primary">{c.name || 'Anonymous Gifter'}</td>
                  <td className="py-3.5 px-4">
                    <div>{c.email}</div>
                    {c.phone && <div className="text-[10px] text-primary/50 font-mono">{c.phone}</div>}
                  </td>
                  <td className="py-3.5 px-4 font-bold">{c.orderCount} orders</td>
                  <td className="py-3.5 px-4 font-editorial font-bold text-sm text-accent">
                    ₹{(c.totalSpent / 100).toFixed(0)}
                  </td>
                  <td className="py-3.5 px-4">
                    {c.isBlocked ? (
                      <Badge variant="dark" className="text-[10px]">BLOCKED</Badge>
                    ) : (
                      <Badge variant="sage" className="text-[10px]">ACTIVE</Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="sm"
                      variant={c.isBlocked ? 'sage' : 'danger'}
                      onClick={() => handleToggleBlock(c.id, c.isBlocked)}
                    >
                      {c.isBlocked ? 'Unblock' : 'Block User'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
