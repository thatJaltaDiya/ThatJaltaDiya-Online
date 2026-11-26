import React, { useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../services/api.js';

export function ProfileSettings() {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [updatingName, setUpdatingName] = useState(false);

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Delete Account Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setUpdatingName(true);
    try {
      const res = await api.patch('/user/profile', { name });
      if (res.success) {
        updateUser({ name: res.data.user.name });
        showToast({ type: 'success', message: 'Name updated successfully!' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Update failed' });
    } finally {
      setUpdatingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setUpdatingPassword(true);
    try {
      const res = await api.post('/user/change-password', passwordForm);
      if (res.success) {
        showToast({ type: 'success', message: 'Password updated. Active sessions refreshed.' });
        setPasswordForm({ currentPassword: '', newPassword: '' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Password update failed' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await api.delete('/user/account');
      if (res.success) {
        showToast({ type: 'info', message: 'Your account has been deleted.' });
        logout();
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete account.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Name Profile Card */}
      <Card className="p-6 bg-white space-y-4">
        <h3 className="font-editorial text-lg font-bold text-primary">Personal Details</h3>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <Input
            label="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email Address (Locked)"
            value={user?.email || ''}
            disabled
            helperText="To change your verified email, contact customer support or re-verify via OTP."
          />
          <Button type="submit" variant="primary" size="sm" isLoading={updatingName}>
            Save Details
          </Button>
        </form>
      </Card>

      {/* Change Password Card */}
      <Card className="p-6 bg-white space-y-4">
        <h3 className="font-editorial text-lg font-bold text-primary">Security & Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            helperText="Min 8 characters with uppercase, lowercase, and a number."
            required
          />
          <Button type="submit" variant="primary" size="sm" isLoading={updatingPassword}>
            Update Password
          </Button>
        </form>
      </Card>

      {/* Danger Zone: Delete Account */}
      <Card className="p-6 bg-red-50/50 border-red-200 space-y-3">
        <h3 className="font-editorial text-lg font-bold text-red-900">Danger Zone</h3>
        <p className="text-xs text-red-800">
          Soft delete your customer account and remove personal identifiers. Past order invoices will retain anonymized records.
        </p>
        <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
          Delete My Account
        </Button>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Account Deletion">
        <div className="space-y-4 text-xs font-medium text-primary">
          <p>
            Are you sure you want to delete your account? This action cannot be reversed. You will immediately be logged out.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Keep Account
            </Button>
            <Button variant="danger" size="sm" isLoading={deleting} onClick={handleDeleteAccount}>
              Yes, Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
