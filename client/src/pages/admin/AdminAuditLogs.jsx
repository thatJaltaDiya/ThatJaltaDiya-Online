import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, User } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { api } from '../../services/api.js';

export function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await api.get('/admin/audit-logs');
        if (res.success) {
          setLogs(res.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Badge variant="butter" tilt={true} className="mb-2">SECURITY & COMPLIANCE</Badge>
        <h1 className="font-editorial text-3xl font-extrabold text-primary">
          Admin Audit Trail ({logs.length})
        </h1>
        <p className="text-xs text-primary/60">Immutable log of administrative operations, stock adjustments, and settings updates.</p>
      </div>

      <Card className="p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium">
            <thead className="bg-surface border-b-2 border-border text-primary/70 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-surface/50 font-mono text-[11px]">
                  <td className="py-3 px-4 text-primary/60">
                    {new Date(log.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-accent">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-primary/80">
                    {log.targetType} {log.targetId ? `#${log.targetId.slice(-6)}` : ''}
                  </td>
                  <td className="py-3 px-4 text-primary">
                    {log.admin?.email || 'System'}
                  </td>
                  <td className="py-3 px-4 text-primary/50">
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-[10px] text-primary/70">
                    {JSON.stringify(log.details)}
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
