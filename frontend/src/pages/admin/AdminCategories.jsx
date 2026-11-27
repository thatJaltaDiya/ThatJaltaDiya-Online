import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
  });

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.success) {
        setCategories(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setForm({ name: '', slug: '', description: '', image: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCategory(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image: c.image || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingCategory) {
        await api.patch(`/admin/categories/${editingCategory.id}`, form);
        showToast({ type: 'success', message: 'Category updated!' });
      } else {
        await api.post('/admin/categories', form);
        showToast({ type: 'success', message: 'Category created!' });
      }
      setModalOpen(false);
      loadCategories();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Action failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      const res = await api.delete(`/admin/categories/${id}`);
      if (res.success) {
        showToast({ type: 'info', message: 'Category deleted.' });
        loadCategories();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Cannot delete category' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Badge variant="butter" tilt={true} className="mb-2">STORE TAXONOMY</Badge>
          <h1 className="font-editorial text-2xl sm:text-3xl font-extrabold text-primary">
            Categories ({categories.length})
          </h1>
        </div>
        <Button variant="accent" size="sm" onClick={handleOpenCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add Category</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {categories.map(cat => (
          <Card key={cat.id} className="p-4 sm:p-5 bg-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-border overflow-hidden bg-surface flex-shrink-0 flex items-center justify-center">
                {cat.image ? (
                  <img src={cat.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Layers className="w-6 h-6 text-primary/40" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-editorial text-sm sm:text-base font-bold text-primary truncate">{cat.name}</h3>
                <span className="text-xs text-primary/60 font-semibold">{cat._count?.products || 0} Products</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleOpenEdit(cat)}
                className="p-2 rounded-lg border border-border/40 hover:bg-surface text-primary"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Floral Arrangements"
          />
          <Input
            label="Slug (Optional URL key)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="floral-arrangements"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short category intro"
          />
          <Input
            label="Image URL (Optional)"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            placeholder="/uploads/category.webp"
          />
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={submitting}>
              Save Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
