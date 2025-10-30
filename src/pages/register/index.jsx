import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";
import RegistrationForm from './components/RegistrationForm';
import TrustSignals from './components/TrustSignals';
import TermsModal from './components/TermsModal';


const Register = () => {
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  // VULCAN FIX: Use a state variable to show the success message, NOT a modal
  const [showSuccessMessage, setShowSuccessMessage] = useState(false); 
  const [termsType, setTermsType] = useState('terms');
  const [registrationEmail, setRegistrationEmail] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/main-dashboard');
    }
  }, [user, navigate]);

  const handleRegister = async (formData) => {
    setLoading(true);
    setError(null);
    setShowSuccessMessage(false);

    try {
        // VULCAN FIX: Prepare metadata required by the DB trigger
        const metadata = {
            full_name: formData.fullName,
            // Map Company Name to organization/client_name for the DB trigger
            organization: formData.organization || formData.companyName || 'Personal', 
            role: formData.role, // 'analyst'
            // Add other data if needed by other systems, though the DB trigger uses the top three
            specialization: formData.specialization, 
            client_count: formData.clientCount
        };

        const { data, error: signUpError } = await signUp(
            formData?.email, 
            formData?.password, 
            metadata
        );
      
        if (signUpError) {
            setError(signUpError);
            return;
        }

        if (data?.user) {
            setRegistrationEmail(formData?.email);
            // VULCAN FIX: Show success message instructing email check
            setShowSuccessMessage(true); 
        }
    } catch (err) {
      setError('An unexpected error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleShowTerms = (type) => {
      setTermsType(type);
      setShowTerms(true);
  };
  
  // Renders the success state after signup
  const renderSuccessState = () => (
    <div className="bg-card border border-border rounded-lg p-8 shadow-elevation text-center">
        <Icon name="MailCheck" size={48} className="mx-auto text-success mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-3">Check Your Inbox!</h2>
        <p className="text-muted-foreground mb-6">
            A confirmation link has been sent to <span className="font-medium text-primary">{registrationEmail}</span>.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
            Click the link in the email to verify your account and complete the provisioning of your secure workspace.
        </p>
        <Button
            variant="default"
            onClick={() => navigate('/login')}
            iconName="LogIn"
            iconPosition="left"
            fullWidth
        >
            Go to Login
        </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header (Keep same as original) */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <Icon name="Shield" size={20} color="var(--color-primary-foreground)" />
              </div>
              <span className="text-xl font-semibold text-foreground">
                Vulcan Scan
              </span>
            </div>

            {/* Login Link */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Already have an account?</span>
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                iconName="LogIn"
                iconPosition="left"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Form / Success State */}
          <div className="space-y-8">
            {showSuccessMessage ? renderSuccessState() : (
              <>
                <div className="text-center lg:text-left">
                  <h1 className="text-3xl font-bold text-foreground mb-4">
                    Join the Future of Vulnerability Management
                  </h1>
                  <p className="text-lg text-muted-foreground mb-6">
                    Create your account and start delivering enterprise-grade security assessments to your clients without the enterprise costs.
                  </p>
                  
                  {/* Key Benefits - Omitted for brevity */}
                  {/* ... */}
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                )}
                
                {/* Registration Form */}
                <div className="bg-card border border-border rounded-lg p-6 shadow-elevation">
                  <RegistrationForm 
                    onSubmit={handleRegister}
                    loading={loading}
                  />
                </div>

                {/* Terms Links */}
                <div className="text-center text-sm text-muted-foreground">
                  <p>
                    By creating an account, you agree to our{' '}
                    <button
                      onClick={() => handleShowTerms('terms')}
                      className="text-primary hover:underline"
                    >
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button
                      onClick={() => handleShowTerms('privacy')}
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Trust Signals */}
          <div className="lg:pl-8">
            <TrustSignals />
          </div>
        </div>
      </main>
      {/* Footer (Keep same as original) */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <Icon name="Shield" size={20} color="var(--color-primary-foreground)" />
              </div>
              <span className="text-xl font-semibold text-foreground">
                Vulcan Scan
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enterprise-grade vulnerability management for security professionals
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
              <button onClick={() => handleShowTerms('terms')} className="hover:text-foreground">
                Terms of Service
              </button>
              <button onClick={() => handleShowTerms('privacy')} className="hover:text-foreground">
                Privacy Policy
              </button>
              <span>support@vulcanscan.com</span>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              © {new Date()?.getFullYear()} Vulcan Scan. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      {/* Modals */}
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        type={termsType}
      />
      {/* NOTE: EmailVerificationModal is now obsolete and removed from the flow. */}
    </div>
  );
};

export default Register;