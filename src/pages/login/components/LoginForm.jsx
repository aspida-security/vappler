import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const LoginForm = ({ onSubmit, loading = false, error = null }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex?.test(email);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData?.email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData?.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData?.password) {
      errors.password = 'Password is required';
    } else if (formData?.password?.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} className="text-destructive" />
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        </div>
      )}
      <div className="space-y-4">
        <Input
          id="enterEmailAddressId"
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          value={formData?.email}
          onChange={(e) => handleInputChange('email', e?.target?.value)}
          error={validationErrors?.email}
          required
          disabled={loading}
        />

        <div className="relative">
          <Input
            id="enterYourPasswordId"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={formData?.password}
            onChange={(e) => handleInputChange('password', e?.target?.value)}
            error={validationErrors?.password}
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={16} />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Checkbox
          label="Remember me"
          checked={formData?.rememberMe}
          onChange={(e) => handleInputChange('rememberMe', e?.target?.checked)}
          disabled={loading}
        />

        <button
          type="button"
          onClick={() => window.location.href = '/forgot-password'}
          className="text-sm text-primary hover:text-primary/80 transition-colors"
          disabled={loading}
        >
          Forgot password?
        </button>
      </div>
      <Button
        type="submit"
        variant="default"
        fullWidth
        loading={loading}
        disabled={loading}
        className="h-12"
      >
        Sign In
      </Button>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => window.location.href = '/register'}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
            disabled={loading}
          >
            Create Account
          </button>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;