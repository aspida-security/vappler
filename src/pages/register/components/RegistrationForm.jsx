import React, { useState } from 'react';

import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';


const RegistrationForm = ({ onSubmit, loading = false, error = null }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    fullName: '',
    email: '',
    organization: '', // Redundant field, kept in state but relies on companyName
    role: 'analyst',
    password: '',
    confirmPassword: '',
    specialization: '',
    clientCount: '',
    acceptTerms: false,
    subscribeNewsletter: false,
    agreeToTerms: false,
    agreeToPrivacy: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });

  const specializationOptions = [
    { value: 'penetration-testing', label: 'Penetration Testing' },
    { value: 'vulnerability-assessment', label: 'Vulnerability Assessment' },
    { value: 'compliance-auditing', label: 'Compliance Auditing' },
    { value: 'incident-response', label: 'Incident Response' },
    { value: 'security-consulting', label: 'Security Consulting' },
    { value: 'managed-security', label: 'Managed Security Services' },
    { value: 'forensics', label: 'Digital Forensics' },
    { value: 'risk-assessment', label: 'Risk Assessment' }
  ];

  const clientCountOptions = [
    { value: '1-5', label: '1-5 clients' },
    { value: '6-15', label: '6-15 clients' },
    { value: '16-30', label: '16-30 clients' },
    { value: '31-50', label: '31-50 clients' },
    { value: '50+', label: '50+ clients' }
  ];

  const validatePassword = (password) => {
    const requirements = [
      { test: password?.length >= 8, message: 'At least 8 characters' },
      { test: /[A-Z]/?.test(password), message: 'One uppercase letter' },
      { test: /[a-z]/?.test(password), message: 'One lowercase letter' },
      { test: /\d/?.test(password), message: 'One number' },
      { test: /[!@#$%^&*(),.?":{}|<>]/?.test(password), message: 'One special character' }
    ];

    const passedTests = requirements?.filter(req => req?.test)?.length;
    const feedback = requirements?.filter(req => !req?.test)?.map(req => req?.message);

    return {
      score: passedTests,
      feedback,
      isValid: passedTests >= 4
    };
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Real-time password validation
    if (field === 'password') {
      const strength = validatePassword(value);
      setPasswordStrength(strength);
    }

    // Confirm password validation
    if (field === 'confirmPassword' || (field === 'password' && formData?.confirmPassword)) {
      const passwordToCheck = field === 'password' ? value : formData?.password;
      const confirmPasswordToCheck = field === 'confirmPassword' ? value : formData?.confirmPassword;
      
      if (confirmPasswordToCheck && passwordToCheck !== confirmPasswordToCheck) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.companyName?.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData?.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData?.email?.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData?.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordStrength?.isValid) {
      newErrors.password = 'Password does not meet security requirements';
    }

    if (!formData?.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData?.password !== formData?.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData?.specialization) {
      newErrors.specialization = 'Please select your specialization';
    }

    if (!formData?.clientCount) {
      newErrors.clientCount = 'Please select your client count range';
    }

    if (!formData?.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service';
    }

    if (!formData?.agreeToPrivacy) {
      newErrors.agreeToPrivacy = 'You must agree to the Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (validateForm()) {
      // VULCAN FIX: Ensure ALL data required by the DB trigger is passed.
      await onSubmit({
        fullName: formData?.fullName,
        email: formData?.email,
        password: formData?.password,
        // Map companyName to organization metadata used by the DB trigger
        organization: formData?.companyName, 
        role: formData?.role, // 'analyst' by default
        specialization: formData?.specialization, 
        clientCount: formData?.clientCount,
        companyName: formData?.companyName, // Keep this for display/internal use
      });
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength?.score <= 2) return 'bg-destructive';
    if (passwordStrength?.score <= 3) return 'bg-warning';
    return 'bg-success';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength?.score <= 2) return 'Weak';
    if (passwordStrength?.score <= 3) return 'Medium';
    return 'Strong';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Company Information</h3>
        
        <Input
          label="Company Name"
          type="text"
          placeholder="Enter your company name"
          value={formData?.companyName}
          onChange={(e) => handleInputChange('companyName', e?.target?.value)}
          error={errors?.companyName}
          required
        />
      </div>
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
        
        <Input
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          value={formData?.fullName}
          onChange={(e) => handleInputChange('fullName', e?.target?.value)}
          error={errors?.fullName}
          required
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="Enter your email address"
          value={formData?.email}
          onChange={(e) => handleInputChange('email', e?.target?.value)}
          error={errors?.email}
          description="We'll send a verification email to this address"
          required
        />
      </div>
      {/* Security Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Security Information</h3>
        
        <div className="space-y-2">
          <Input
            label="Password"
            type="password"
            placeholder="Create a strong password"
            value={formData?.password}
            onChange={(e) => handleInputChange('password', e?.target?.value)}
            error={errors?.password}
            required
          />
          
          {formData?.password && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                    style={{ width: `${(passwordStrength?.score / 5) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  passwordStrength?.score <= 2 ? 'text-destructive' :
                  passwordStrength?.score <= 3 ? 'text-warning' : 'text-success'
                }`}>
                  {getPasswordStrengthText()}
                </span>
              </div>
              
              {passwordStrength?.feedback?.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p>Password must include:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    {passwordStrength?.feedback?.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          value={formData?.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e?.target?.value)}
          error={errors?.confirmPassword}
          required
        />
      </div>
      {/* Professional Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Professional Information</h3>
        
        <Select
          label="Specialization"
          placeholder="Select your primary specialization"
          options={specializationOptions}
          value={formData?.specialization}
          onChange={(value) => handleInputChange('specialization', value)}
          error={errors?.specialization}
          searchable
          required
        />

        <Select
          label="Estimated Client Count"
          placeholder="Select your client count range"
          options={clientCountOptions}
          value={formData?.clientCount}
          onChange={(value) => handleInputChange('clientCount', value)}
          error={errors?.clientCount}
          description="This helps us optimize the platform for your needs"
          required
        />
      </div>
      {/* Terms and Privacy */}
      <div className="space-y-4">
        <div className="border-t border-border pt-4">
          <Checkbox
            label="I agree to the Terms of Service"
            checked={formData?.agreeToTerms}
            onChange={(e) => handleInputChange('agreeToTerms', e?.target?.checked)}
            error={errors?.agreeToTerms}
            required
          />
          
          <Checkbox
            label="I agree to the Privacy Policy"
            checked={formData?.agreeToPrivacy}
            onChange={(e) => handleInputChange('agreeToPrivacy', e?.target?.checked)}
            error={errors?.agreeToPrivacy}
            required
            className="mt-3"
          />
        </div>
      </div>
      {/* Submit Button */}
      <Button
        type="submit"
        variant="default"
        loading={loading}
        fullWidth
        iconName="UserPlus"
        iconPosition="left"
        className="mt-8"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
};

export default RegistrationForm;