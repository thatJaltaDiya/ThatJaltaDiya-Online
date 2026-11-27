import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Upload,
  Check,
  Star,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  // Product Form State (Tailored for easy editing by non-technical owner!)
  const initialForm = {
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    price: '', // in Rupees for display
    compareAtPrice: '', // in Rupees
    sku: '',
    stock: 10,
    categoryId: '',
    isActive: true,
    isFeatured: false,
    isBestseller: false,
    isNew: false,
    images: [],
    metaTitle: '',
    metaDescription: '',
  };

  const [form, setForm] = useState(initialForm);
  const [uploadingImages, setUploadingImages] = useState(false);

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get(`/admin/products?limit=50&search=${encodeURIComponent(search)}&category=${selectedCategory}`),
        api.get('/categories'),
      ]);
      if (prodRes.success) setProducts(prodRes.data);
      if (catRes.success) setCategories(catRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setForm({
      ...initialForm,
      categoryId: categories[0]?.id || '',
      sku: `TJD-${Date.now().toString().slice(-6)}`,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description,
      shortDescription: p.shortDescription || '',
      price: (p.price / 100).toString(),
      compareAtPrice: p.compareAtPrice ? (p.compareAtPrice / 100).toString() : '',
      sku: p.sku,
      stock: p.stock,
      categoryId: p.categoryId,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      isBestseller: p.isBestseller,
      isNew: p.isNew,
      images: p.images || [],
      metaTitle: p.metaTitle || '',
      metaDescription: p.metaDescription || '',
    });
    setModalOpen(true);
  };

  const handleImageFilesUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const res = await api.post('/admin/products/upload-images', formData);
      if (res.success) {
        const newImages = res.data.map((item, idx) => ({
          url: item.mediumUrl || item.url,
          storageKey: item.storageKey || null,
          isPrimary: form.images.length === 0 && idx === 0,
        }));
        setForm(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
        showToast({ type: 'success', message: `${files.length} photo(s) optimized & uploaded!` });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Image upload failed' });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index) => {
    setForm(prev => {
      const updated = prev.images.filter((_, idx) => idx !== index);
      if (updated.length > 0 && !updated.some(img => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return { ...prev, images: updated };
    });
  };

  const handleSetPrimaryImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.map((img, idx) => ({ ...img, isPrimary: idx === index })),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.categoryId) {
      showToast({ type: 'error', message: 'Name, price, and category are required.' });
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      price: Math.round(Number(form.price) * 100),
      compareAtPrice: form.compareAtPrice ? Math.round(Number(form.compareAtPrice) * 100) : null,
      stock: Number(form.stock) || 0,
      images: (form.images || []).map((img) => ({
        url: img.url,
        ...(img.storageKey ? { storageKey: img.storageKey } : {}),
        ...(img.altText ? { altText: img.altText } : {}),
        isPrimary: Boolean(img.isPrimary),
      })),
    };

    try {
      if (editingProduct) {
        await api.patch(`/admin/products/${editingProduct.id}`, payload);
        showToast({ type: 'success', message: 'Product updated successfully!' });
      } else {
        await api.post('/admin/products', payload);
        showToast({ type: 'success', message: 'Product created successfully!' });
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to save product.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/admin/products/${id}/duplicate`);
      if (res.success) {
        showToast({ type: 'success', message: 'Product duplicated as draft!' });
        loadData();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Cannot duplicate' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product? It will be soft-deleted.')) return;
    try {
      const res = await api.delete(`/admin/products/${id}`);
      if (res.success) {
        showToast({ type: 'info', message: 'Product deleted.' });
        loadData();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Cannot delete' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <Badge variant="butter" tilt={true} className="mb-2">CATALOG MANAGER</Badge>
          <h1 className="font-editorial text-2xl sm:text-3xl font-extrabold text-primary">
            Products ({products.length})
          </h1>
          <p className="text-xs text-primary/60">
            Easily replace demo items with your real candle photos and prices.
          </p>
        </div>

        <Button variant="accent" size="sm" onClick={handleOpenCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add New Product</span>
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-primary/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-full border border-border/30 text-xs font-bold focus:border-primary/40 focus:ring-1 focus:ring-primary/10 outline-none shadow-sm"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-white rounded-full border border-border/30 text-xs font-bold focus:border-primary/40 focus:ring-1 focus:ring-primary/10 outline-none cursor-pointer shadow-sm"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Product List Table */}
      <Card className="p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs font-medium">
            <thead className="bg-surface border-b-2 border-border text-primary/70 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Flags</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {products.map(p => {
                const primaryImg = p.images?.[0]?.url || "/uploads/placeholder.webp";
                return (
                  <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img src={primaryImg} alt="" className="w-12 h-12 rounded-lg border border-border object-cover bg-surface flex-shrink-0" />
                      <div>
                        <div className="font-editorial text-sm font-bold text-primary">{p.name}</div>
                        {p.isDemo && <Badge variant="butter" className="text-[8px] py-0 px-1.5">DEMO</Badge>}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs font-bold text-primary/80">
                      {p.category?.name}
                    </td>

                    <td className="py-3 px-4 font-editorial font-bold text-sm">
                      ₹{(p.price / 100).toFixed(0)}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={p.stock <= 0 ? 'dark' : p.stock <= 5 ? 'accent' : 'sage'}>
                        {p.stock} units
                      </Badge>
                    </td>

                    <td className="py-3 px-4 space-x-1">
                      {p.isActive ? (
                        <span className="text-emerald-700 font-bold text-[10px]">Active</span>
                      ) : (
                        <span className="text-primary/40 font-bold text-[10px]">Draft</span>
                      )}
                      {p.isFeatured && <Badge variant="butter" className="text-[8px]">Featured</Badge>}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg border border-border/40 hover:bg-surface text-primary"
                        title="Edit product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(p.id)}
                        className="p-1.5 rounded-lg border border-border/40 hover:bg-surface text-primary"
                        title="Duplicate as draft"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Handcrafted Product'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Name *"
            required
            placeholder="e.g. Lavender Blossom Candle Bouquet"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Category *
            </label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-3 py-2 min-h-[44px] bg-white rounded-xl border-2 border-border text-xs font-bold outline-none"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Price (INR ₹) *"
              type="number"
              required
              placeholder="999"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              label="Compare-at Price (₹)"
              type="number"
              placeholder="1299"
              value={form.compareAtPrice}
              onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
            />
            <Input
              label="Stock Units *"
              type="number"
              required
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>

          {/* Image Upload Zone */}
          <div className="p-3.5 sm:p-4 rounded-xl border-2 border-dashed border-border bg-surface space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary">
                Product Photos (Upload multiple)
              </label>
              <label className="px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-bold cursor-pointer hover:bg-butter flex items-center justify-center gap-1.5 w-full sm:w-auto">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageFilesUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadingImages && <p className="text-xs text-accent font-bold animate-pulse">Compressing and uploading images...</p>}

            {/* Thumbnail Preview strip */}
            {form.images.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg border-2 border-border overflow-hidden bg-white group">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-0 right-0 bg-red-600 text-white px-1 py-0.5 text-[10px] leading-none rounded-bl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    {img.isPrimary ? (
                      <span className="absolute bottom-0 inset-x-0 bg-accent text-white text-[8px] font-bold text-center">PRIMARY</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-bold text-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        Set Primary
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Input
            label="Short Tagline / Scent Notes"
            placeholder="e.g. French Vanilla & Damask Rose petals"
            value={form.shortDescription}
            onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
          />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Full Description (Rich text / HTML supported)
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 rounded-xl border border-border/30 text-xs font-medium outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 shadow-sm"
              placeholder="Handcrafted details, burn instructions, materials..."
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span>Live in Store</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              />
              <span>Featured on Homepage</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={form.isBestseller}
                onChange={(e) => setForm({ ...form, isBestseller: e.target.checked })}
              />
              <span>Mark Bestseller</span>
            </label>
          </div>

          <div className="pt-4 border-t border-border/10 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={submitting}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
