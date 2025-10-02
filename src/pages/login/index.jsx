import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import LoginForm from './components/LoginForm';
import SecurityBadges from './components/SecurityBadges';
import LoginHeader from './components/LoginHeader';
import BackgroundPattern from './components/BackgroundPattern';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock credentials for demonstration
  const mockCredentials = {
    email: "admin@vulcanscan.com",
    password: "VulcanScan2024!"
  };

  useEffect(() => {
    // Clear any existing session data
    localStorage.removeItem('vulcan_session');
    localStorage.removeItem('vulcan_user');
  }, []);

  const handleLogin = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Validate credentials
      if (formData?.email === mockCredentials?.email && formData?.password === mockCredentials?.password) {
        // Mock successful authentication
        const userData = {
          id: 1,
          email: formData?.email,
          name: "Security Analyst",
          role: "admin",
          workspace: "acme-corp",
          loginTime: new Date()?.toISOString()
        };

        // Store session data
        localStorage.setItem('vulcan_session', JSON.stringify({
          token: 'mock_jwt_token_' + Date.now(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)?.toISOString(),
          rememberMe: formData?.rememberMe
        }));
        
        localStorage.setItem('vulcan_user', JSON.stringify(userData));

        // Redirect to dashboard
        window.location.href = '/main-dashboard';
      } else {
        throw new Error('Invalid email or password. Please use admin@vulcanscan.com with password VulcanScan2024!');
      }
    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
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
                <p><strong>Email:</strong> admin@vulcanscan.com</p>
                <p><strong>Password:</strong> VulcanScan2024!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;