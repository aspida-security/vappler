// src/pages/register/index.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/ui/Button"; 
import Icon from "../../components/AppIcon";
import RegistrationForm from "./components/RegistrationForm";
import BackgroundPattern from "../login/components/BackgroundPattern";
import TrustSignals from "./components/TrustSignals";

const Register = () => {
  const { signUp } = useAuth(); // ✅ Removed isAuthenticated
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ REMOVED: Auto-redirect useEffect (was causing the issue)

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);

    const userData = {
        fullName: formData.fullName,
        organization: formData.companyName,
        role: formData.role
    };

    const { data, error: signUpError } = await signUp(
        formData.email,
        formData.password,
        userData
    );

    setLoading(false);

    if (signUpError) {
      setError(signUpError?.message || 'Registration failed. Please check credentials.');
      return;
    }
    
    // ✅ Navigate to verification page
    if (data?.user) {
      console.log('[Register] Navigating to verification page with email:', formData.email);
      navigate('/register/verify-email', { 
        replace: true,
        state: { email: formData.email }
      });
    }
  };
  
  return (
    <>
      <div className="relative min-h-screen flex items-center justify-center py-12 bg-background">
        <BackgroundPattern />
        <div className="relative z-10 w-full max-w-lg px-4 md:px-0">
          <div className="bg-card shadow-2xl rounded-xl p-8 md:p-10 border border-border">
            <div className="text-center mb-8">
              <Icon name="Shield" size={32} className="text-primary mx-auto mb-2" />
              <h1 className="text-3xl font-bold text-foreground">Create Vappler Account</h1>
              <p className="text-muted-foreground mt-2">Start your 14-day security trial. No credit card required.</p>
            </div>
            
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md text-sm text-destructive mb-6">
                {error}
              </div>
            )}

            <RegistrationForm 
              onSubmit={handleSubmit} 
              loading={loading}
            />

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Button variant="link" onClick={() => navigate("/login")} className="p-0 h-auto text-primary">
                  Sign In
                </Button>
              </p>
            </div>
          </div>
          <TrustSignals />
        </div>
      </div>
    </>
  );
};

export default Register;
