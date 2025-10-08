import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './components/LoginForm';
import SecurityBadges from './components/SecurityBadges';
import LoginHeader from './components/LoginHeader';
import BackgroundPattern from './components/BackgroundPattern';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, loading, user } = useAuth();
  const [error, setError] = useState(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/main-dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (formData) => {
    setError(null);

    try {
      const { data, error: signInError } = await signIn(formData?.email, formData?.password);
      
      if (signInError) {
        setError(signInError);
        return;
      }

      if (data?.user) {
        // Successful login - redirect will happen via useEffect
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Vulcan Scan | Enterprise Vulnerability Management</title>
        <meta name="description" content="Secure login to Vulcan Scan vulnerability management platform for cybersecurity consultants and MSSPs." />
        <meta name="keywords" content="vulnerability management, cybersecurity, login, security platform" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <BackgroundPattern />
        
        <div className="w-full max-w-md relative z-10">
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl shadow-elevation-lg p-8">
            <LoginHeader />
            
            <LoginForm
              onSubmit={handleLogin}
              loading={loading}
              error={error}
            />
          </div>
          
          <SecurityBadges />
          
          {/* Demo Credentials Notice */}
          <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="text-center">
              <p className="text-sm font-medium text-primary mb-2">Demo Credentials</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Admin:</strong> admin@vulcanscan.com / VulcanScan2024!</p>
                <p><strong>Analyst:</strong> analyst@vulcanscan.com / AnalystPass123!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;