import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import RegistrationForm from './components/RegistrationForm';
import TrustSignals from './components/TrustSignals';
import TermsModal from './components/TermsModal';
import EmailVerificationModal from './components/EmailVerificationModal';

const Register = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState('');

  const handleRegistration = async (formData) => {
    setIsLoading(true);
    setRegistrationEmail(formData?.email);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setShowVerificationModal(true);
    }, 2000);
  };

  const handleVerificationComplete = () => {
    setShowVerificationModal(false);
    // Simulate successful verification and redirect
    setTimeout(() => {
      navigate('/main-dashboard');
    }, 1000);
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                onClick={handleLoginRedirect}
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
          {/* Left Column - Registration Form */}
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Join the Future of Vulnerability Management
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Create your account and start delivering enterprise-grade security assessments to your clients without the enterprise costs.
              </p>
              
              {/* Key Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center space-x-3 p-3 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-success/10 rounded-lg">
                    <Icon name="DollarSign" size={16} className="text-success" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">80% Cost Savings</div>
                    <div className="text-xs text-muted-foreground">vs. commercial tools</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
                    <Icon name="Users" size={16} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">Multi-Tenant</div>
                    <div className="text-xs text-muted-foreground">Client workspaces</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-accent/10 rounded-lg">
                    <Icon name="FileText" size={16} className="text-accent" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">Professional Reports</div>
                    <div className="text-xs text-muted-foreground">Custom branding</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-warning/10 rounded-lg">
                    <Icon name="Zap" size={16} className="text-warning" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">Real-Time Scanning</div>
                    <div className="text-xs text-muted-foreground">Live progress tracking</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-elevation">
              <RegistrationForm 
                onSubmit={handleRegistration}
                isLoading={isLoading}
              />
            </div>

            {/* Terms Links */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                By creating an account, you agree to our{' '}
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="text-primary hover:underline"
                >
                  Terms of Service
                </button>
                {' '}and{' '}
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </button>
              </p>
            </div>
          </div>

          {/* Right Column - Trust Signals */}
          <div className="lg:pl-8">
            <TrustSignals />
          </div>
        </div>
      </main>
      {/* Footer */}
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
              <button onClick={() => setShowTermsModal(true)} className="hover:text-foreground">
                Terms of Service
              </button>
              <button onClick={() => setShowPrivacyModal(true)} className="hover:text-foreground">
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
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        type="terms"
      />
      <TermsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        type="privacy"
      />
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        email={registrationEmail}
        onVerificationComplete={handleVerificationComplete}
      />
    </div>
  );
};

export default Register;