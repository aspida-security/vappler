import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
// Import necessary services/context if needed, but for now, rely on parent navigation

const EmailVerificationModal = ({ isOpen, onClose, email, onVerificationComplete }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  // *** DEMO REMOVAL: Removed mockVerificationCode variable ***

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

    // --- SECURITY FIX: REMOVED MOCK CREDENTIAL CHECK ---
    
    // In a real Supabase flow:
    // 1. The user clicks a link in the email (external to the app).
    // 2. The link updates their session status to CONFIRMED.
    // 3. The app relies on AuthContext detecting the new session state.
    
    // For this modal, we assume the user is clicking this button after clicking the link.
    // We simply acknowledge the action and trigger navigation to refresh the session state.
    
    setTimeout(() => {
        // Assume verification complete and trigger navigation to refresh session state
        // and confirm the profile/workspace is loaded.
        onVerificationComplete();
        setIsVerifying(false);
    }, 500); // Small delay for UX feedback
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError('');
    
    // --- REAL LOGIC: Implement actual resend API call here (e.g., supabase.auth.resend) ---
    console.log(`[EmailModal] Attempting to resend verification link to ${email}`);
    
    setTimeout(() => {
      setIsResending(false);
      setResendCooldown(60); // Set cooldown after resend
      // Simulate success message
    }, 1500);
  };
  
  // Render nothing if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card rounded-lg shadow-2xl max-w-md w-full border border-border">
        <div className="p-8">
          <div className="text-center mb-6">
            <Icon name="MailCheck" size={32} className="text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-foreground">Verify Your Email</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              We sent a verification link to **{email}**. Please click the link to confirm your account.
              {/* --- SECURITY FIX: Removed DEMO MODE notice --- */}
            </p>
          </div>

          <p className="text-sm text-center text-muted-foreground mb-4">
            Click the button below once you have clicked the link in your email.
          </p>
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md text-sm text-destructive mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <Input
              id="verificationCode"
              label="Verification Code (Link Clicked)"
              placeholder="Click the link in your email first"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled
              className="mt-4"
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isVerifying}
              className="mt-4"
              iconName="Check"
              iconPosition="left"
            >
              {isVerifying ? 'Verifying...' : 'Link Clicked? Confirm'}
            </Button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Didn't receive the email?
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
                {isResending ? 'Sending...' : 'Resend Email'}
              </Button>
            )}
          </div>

          {/* Help */}
          <div className="mt-6 p-4 bg-muted/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <Icon name="HelpCircle" size={16} className="text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Having trouble?</p>
                <p>Check your spam folder or contact support at support@vappler.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;