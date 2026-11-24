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

  // Phone Change with OTP State
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);

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

  const handleSendPhoneOtp = async () => {
    if (!newPhone) return;
    setSendingPhoneOtp(true);
    try {
      const res = await api.post('/auth/otp/send', {
        identifier: newPhone,
        purpose: 'PHONE_VERIFY',
      });
      if (res.success) {
        setPhoneOtpSent(true);
        showToast({ type: 'success', message: '6-digit verification code sent to your phone.' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to send OTP' });
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/user/change-phone', {
        phone: newPhone,
        otpCode: phoneOtp,
      });
      if (res.success) {
        updateUser({ phone: res.data.phone });
        showToast({ type: 'success', message: 'Phone number updated and verified!' });
        setNewPhone('');
        setPhoneOtp('');
        setPhoneOtpSent(false);
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'OTP verification failed' });
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

      {/* Phone Number Verification via OTP */}
      <Card className="p-6 bg-white space-y-4">
        <h3 className="font-editorial text-lg font-bold text-primary">Mobile Phone & OTP Verification</h3>
        <p className="text-xs text-primary/70">
          Current Phone: <strong>{user?.phone || 'Not added'}</strong>
        </p>

        {!phoneOtpSent ? (
          <div className="flex gap-2 items-end">
            <Input
              label="New Phone Number"
              placeholder="+91 98765 43210"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleSendPhoneOtp}
              disabled={!newPhone}
              isLoading={sendingPhoneOtp}
            >
              Send OTP
            </Button>
          </div>
        ) : (
          <form onSubmit={handleVerifyPhone} className="space-y-3">
            <Input
              label="Enter 6-Digit OTP Code"
              value={phoneOtp}
              onChange={(e) => setPhoneOtp(e.target.value)}
              maxLength={6}
              placeholder="123456"
              required
            />
            <div className="flex gap-2">
              <Button type="submit" variant="accent" size="sm">
                Verify & Save Phone
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPhoneOtpSent(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
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
