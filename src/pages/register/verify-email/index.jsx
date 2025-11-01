import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import BackgroundPattern from '../../login/components/BackgroundPattern';

const VerifyEmail = () => {
  const { user, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Get email from location state or user object
  const email = location.state?.email || user?.email;

  // Redirect if no email available
  useEffect(() => {
    if (!email) {
      console.log('[VerifyEmail] No email found, redirecting to register');
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  // Cooldown timer (60 seconds like your modal)
  useEffect(() => {
    let interval;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Handle resend verification email
  const handleResendCode = async () => {
    setIsResending(true);
    setError('');
    setResendSuccess(false);

    console.log(`[VerifyEmail] Attempting to resend verification link to ${email}`);
    
    const { success, error: resendError } = await resendVerification(email);

    setIsResending(false);

    if (success) {
      setResendSuccess(true);
      setResendCooldown(60); // 60 second cooldown
      setTimeout(() => setResendSuccess(false), 5000);
    } else {
      setError(resendError || 'Failed to resend email. Please try again.');
    }
  };

  // Check if user has verified (manual refresh check)
  const handleVerificationComplete = () => {
    setIsVerifying(true);
    console.log('[VerifyEmail] User clicked verification complete, reloading...');
    // Force page reload to check auth status
    window.location.href = '/main-dashboard';
  };

  // Navigate back to login
  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <>
      <div className="relative min-h-screen flex items-center justify-center py-12 bg-gray-950">
        <BackgroundPattern />
        
        <div className="relative z-10 w-full max-w-lg px-4 md:px-0">
          <div className="bg-gray-900/50 backdrop-blur-sm shadow-2xl rounded-xl p-8 md:p-10 border border-gray-700">
            
            {/* Icon Header */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Icon name="Mail" size={32} className="text-blue-500" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Verify Your Email
              </h1>
              <p className="text-gray-400">
                We sent a verification link to your email address
              </p>
            </div>

            {/* Email Display */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
              <div className="flex items-center gap-3">
                <Icon name="Mail" size={20} className="text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">Email sent to:</p>
                  <p className="text-sm font-medium text-white truncate">
                    {email}
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-800/30 rounded-lg p-4 mb-6 border border-gray-700">
              <p className="text-sm text-gray-300 mb-4">
                We sent a verification link to <strong className="text-white">{email}</strong>. Please click the link to confirm your account.
              </p>
              <p className="text-sm text-gray-400">
                Click the button below once you have clicked the link in your email.
              </p>
            </div>

            {/* Success Message */}
            {resendSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <Icon name="CheckCircle" size={16} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-400">
                  Verification email sent successfully! Check your inbox.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <Icon name="AlertCircle" size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 mb-6">
              {/* Primary Verify Button */}
              <Button
                onClick={handleVerificationComplete}
                disabled={isVerifying}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isVerifying ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Icon name="CheckCircle" size={16} className="mr-2" />
                    I've Verified My Email
                  </>
                )}
              </Button>
            </div>

            {/* Resend Section */}
            <div className="mb-6 pb-6 border-b border-gray-700">
              <p className="text-sm text-gray-400 mb-3 text-center">
                Didn't receive the email?
              </p>
              
              {resendCooldown > 0 ? (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-500">
                    <Icon name="Clock" size={14} className="inline mr-1" />
                    Resend code in {resendCooldown} seconds
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleResendCode}
                  disabled={isResending}
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  {isResending ? (
                    <>
                      <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Icon name="RefreshCw" size={16} className="mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <Button
                onClick={handleBackToLogin}
                variant="link"
                className="text-gray-400 hover:text-white"
              >
                <Icon name="ArrowLeft" size={16} className="mr-2" />
                Back to Login
              </Button>
            </div>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                <Icon name="HelpCircle" size={14} className="inline mr-1" />
                Having trouble? Check your spam folder or contact{' '}
                <a
                  href="mailto:support@aspidasecurity.io"
                  className="text-blue-400 hover:underline"
                >
                  support@aspidasecurity.io
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyEmail;
