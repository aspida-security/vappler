// src/pages/reset-password/index.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      
      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3s
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="text-center mb-8">
            <Icon name="Key" size={32} className="mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
            <p className="text-muted-foreground">Enter your new password below.</p>
          </div>

          {success ? (
            <div className="text-center">
              <Icon name="CheckCircle" size={48} className="mx-auto text-green-500 mb-4" />
              <p className="text-foreground">Your password has been updated successfully!</p>
              <p className="text-muted-foreground mt-2">Redirecting you to the login page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
              <Input
                id="enterYourNewPasswordId"
                label="New Password"
                type="password"
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                id="confirmYourNewPasswordId"
                label="Confirm New Password"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" loading={loading} fullWidth>
                Update Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;