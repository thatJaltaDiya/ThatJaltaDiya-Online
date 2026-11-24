import React, { useState, useEffect } from 'react';
import { Mail, Check, Eye } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const { showToast } = useToast();

  const loadMessages = async () => {
    try {
      const res = await api.get('/admin/contact-messages');
      if (res.success) {
        setMessages(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleMarkRead = async (id, isRead) => {
    try {
      await api.patch(`/admin/contact-messages/${id}`, { isRead });
      loadMessages();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Badge variant="butter" tilt={true} className="mb-2">INBOX</Badge>
        <h1 className="font-editorial text-3xl font-extrabold text-primary">
          Customer Inquiries ({messages.length})
        </h1>
        <p className="text-xs text-primary/60">Messages submitted through the store contact form.</p>
      </div>

      <Card className="p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium">
            <thead className="bg-surface border-b-2 border-border text-primary/70 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">From</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {messages.map(m => (
                <tr key={m.id} className={m.isRead ? 'opacity-70 hover:opacity-100' : 'bg-surface/30 font-bold'}>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-primary">{m.name}</div>
                    <div className="text-[10px] text-primary/50 font-mono">{m.email}</div>
                  </td>
                  <td className="py-3.5 px-4 truncate max-w-xs">{m.subject || 'General Inquiry'}</td>
                  <td className="py-3.5 px-4 text-primary/60">
                    {new Date(m.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={m.isRead ? 'sage' : 'accent'}>
                      {m.isRead ? 'READ' : 'NEW'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMessage(m);
                        if (!m.isRead) handleMarkRead(m.id, true);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>Read</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        title={selectedMessage?.subject || 'Customer Message'}
      >
        {selectedMessage && (
          <div className="space-y-4 text-xs font-medium">
            <div className="p-3 rounded-xl bg-surface border border-border/20">
              <span className="font-bold block text-primary">{selectedMessage.name} ({selectedMessage.email})</span>
              <span className="text-[10px] text-primary/60 font-mono">
                IP: {selectedMessage.ipAddress || 'unknown'} • {new Date(selectedMessage.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-border/20 text-primary/90 leading-relaxed whitespace-pre-wrap">
              {selectedMessage.message}
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject || 'That Jalta Diya Inquiry')}`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-accent text-white font-bold text-xs shadow-pop-sm"
              >
                Reply via Email
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
