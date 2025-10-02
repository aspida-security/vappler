import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const EmailVerificationModal = ({ isOpen, onClose, email, onVerificationComplete }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Mock verification code for demo: 123456
  const mockVerificationCode = '123456';

  useEffect(() => {
    let interval;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e?.preventDefault();
    setIsVerifying(true);
    setError('');

    // Simulate API call
    setTimeout(() => {
      if (verificationCode === mockVerificationCode) {
        onVerificationComplete();
      } else {
        setError('Invalid verification code. Please try again.');
      }
      setIsVerifying(false);
    }, 1500);
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError('');
    
    // Simulate API call
    setTimeout(() => {
      setResendCooldown(60);
      setIsResending(false);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-lg shadow-elevation-lg">
        {/* Header */}
        <div className="p-6 text-center border-b border-border">
          <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4">
            <Icon name="Mail" size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Verify Your Email</h2>
          <p className="text-sm text-muted-foreground">
            We've sent a verification code to
          </p>
          <p className="text-sm font-medium text-foreground mt-1">{email}</p>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Verification Code"
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e?.target?.value?.replace(/\D/g, '')?.slice(0, 6));
                setError('');
              }}
              error={error}
              maxLength={6}
              className="text-center text-lg tracking-widest"
              required
            />

            {/* Demo Instructions */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <Icon name="Info" size={16} className="text-primary mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Demo Mode</p>
                  <p>Use verification code: <span className="font-mono font-bold">123456</span></p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              loading={isVerifying}
              fullWidth
              iconName="Check"
              iconPosition="left"
            >
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </Button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Didn't receive the code?
            </p>
            
            {resendCooldown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Resend code in {resendCooldown} seconds
              </p>
            ) : (
              <Button
                variant="ghost"
                onClick={handleResendCode}
                loading={isResending}
                iconName="RefreshCw"
                iconPosition="left"
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </Button>
            )}
          </div>

          {/* Help */}
          <div className="mt-6 p-4 bg-muted/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <Icon name="HelpCircle" size={16} className="text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Having trouble?</p>
                <p>Check your spam folder or contact support at support@vulcanscan.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;