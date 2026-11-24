import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { TurnstileWidget } from '../../components/ui/TurnstileWidget.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/contact', { ...form, turnstileToken });
      if (res.success) {
        setSubmitted(true);
        showToast({ type: 'success', message: 'Message sent! We will reply shortly.' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to deliver message.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact Us & Custom Orders | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-xl mx-auto mb-12">
          <Badge variant="butter" tilt={true} className="mb-2">GET IN TOUCH</Badge>
          <h1 className="font-editorial text-4xl sm:text-5xl font-extrabold text-primary">
            We’d Love To Hear From You
          </h1>
          <p className="text-sm text-primary/70 mt-2 font-medium">
            Have questions about bouquet customization, bulk wedding favors, or corporate hampers? Say hello!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Details & Studio Hours */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 bg-surface space-y-4">
              <h3 className="font-editorial text-xl font-bold text-primary">Studio Information</h3>
              <div className="space-y-4 text-xs font-semibold text-primary/80">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-accent mt-0.5" />
                  <div>
                    <span className="block font-bold text-primary">Customer Care</span>
                    <a href="mailto:hello@thatjaltadiya.com" className="hover:underline">hello@thatjaltadiya.com</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-accent mt-0.5" />
                  <div>
                    <span className="block font-bold text-primary">WhatsApp Concierge</span>
                    <span>+91 98765 43210 (Mon-Sat, 10am - 7pm IST)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-accent mt-0.5" />
                  <div>
                    <span className="block font-bold text-primary">Artisan Studio</span>
                    <span>That Jalta Diya Studio, Bandra West, Mumbai, Maharashtra 400050</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-butter/30 border-butter space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Bulk & Wedding Favors</h4>
              <p className="text-xs text-primary/80 leading-relaxed font-medium">
                Planning bridesmaid hampers, baby shower return gifts, or festive corporate orders? We offer customized label branding and tiered quantity discounts for orders of 25+ pieces.
              </p>
            </Card>
          </div>

          {/* Contact Message Form */}
          <div className="lg:col-span-7">
            <Card className="p-8 bg-white">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h3 className="font-editorial text-2xl font-bold text-primary">Thank You! Message Received</h3>
                  <p className="text-xs text-primary/70 max-w-sm mx-auto">
                    We have received your message and will get back to your email within 24 hours.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Your Name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ananya Roy"
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="ananya@example.com"
                    />
                  </div>

                  <Input
                    label="Subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Custom Hamper Inquiry / Order Question"
                  />

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                      Your Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us what you have in mind..."
                      className="w-full p-3.5 rounded-xl border-2 border-border/80 bg-white text-sm font-medium focus:border-accent outline-none"
                    />
                  </div>

                  <TurnstileWidget onVerify={setTurnstileToken} />

                  <Button type="submit" variant="accent" size="lg" className="w-full" isLoading={loading}>
                    <Send className="w-4 h-4 mr-2" />
                    <span>Send Message</span>
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
