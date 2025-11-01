import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Separate async operations object - CRITICAL for auth safety
  const profileOperations = {
    async load(userId) {
      if (!userId) return;
      console.log('[AuthContext] Loading profile for user ID:', userId);
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          ?.from('user_profiles')
          ?.select('*')
          ?.eq('id', userId)
          ?.single();
        
        console.log('[AuthContext] Profile data from Supabase:', { data, error });
        
        if (!error && data) {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('[AuthContext] Profile loading CATCH block error:', error?.message);
      } finally {
        setProfileLoading(false);
      }
    },
    
    clear() {
      setUserProfile(null);
      setProfileLoading(false);
    },
    
    async update(updates) {
      if (!user?.id) return { error: 'No authenticated user' };
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          ?.from('user_profiles')
          ?.update({ ...updates, updated_at: new Date()?.toISOString() })
          ?.eq('id', user?.id)
          ?.select()
          ?.single();
        
        if (!error && data) {
          setUserProfile(data);
          return { data };
        }
        return { error };
      } catch (error) {
        return { error: error?.message };
      } finally {
        setProfileLoading(false);
      }
    }
  };

  // Protected auth handlers - MUST remain synchronous
  const authStateHandlers = {
    // CRITICAL: This MUST remain synchronous - NO async keyword
    onChange: (event, session) => {
      console.log('[AuthContext] Auth state changed:', event, {
        user: session?.user?.email || 'null',
        email_confirmed_at: session?.user?.email_confirmed_at,
        hasSession: !!session
      });
      
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        profileOperations?.load(session?.user?.id); // Fire-and-forget async operation
      } else {
        profileOperations?.clear();
        // Clear any existing session data
        localStorage?.removeItem('vulcan_session');
        localStorage?.removeItem('vulcan_user');
      }
    }
  };

  // Authentication methods
  const signIn = async (email, password) => {
    try {
      console.log('[AuthContext] Starting signIn for:', email);
      setLoading(true);
      
      const { data, error } = await supabase?.auth?.signInWithPassword({
        email,
        password
      });
      
      console.log('[AuthContext] SignIn response:', {
        user: data?.user?.email,
        session: data?.session ? 'exists' : 'null',
        error: error?.message
      });
      
      if (error) {
        // Handle specific Supabase auth errors
        if (error?.message?.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password. Please check your credentials and try again.' };
        } else if (error?.message?.includes('Email not confirmed')) {
          return { error: 'Please check your email and click the confirmation link before signing in.' };
        } else if (error?.message?.includes('Too many requests')) {
          return { error: 'Too many login attempts. Please wait a few minutes before trying again.' };
        }
        return { error: error?.message };
      }
      
      return { data };
    } catch (error) {
      console.error('[AuthContext] SignIn exception:', error);
      if (error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('AuthRetryableFetchError')) {
        return { error: 'Cannot connect to authentication service. Your Supabase project may be paused or inactive. Please check your Supabase dashboard and resume your project if needed.' };
      }
      return { error: 'An unexpected error occurred during sign in. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ✅ FIXED: Removed auto-login logic
  // ============================================================
  const signUp = async (email, password, userData = {}) => {
    try {
      console.log('[AuthContext] Starting signUp for:', email, 'with data:', userData);
      setLoading(true);
      
      const { data, error } = await supabase?.auth?.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData?.fullName || '',
            role: userData?.role || 'analyst',
            organization: userData?.organization || ''
          }
        }
      });
      
      console.log('[AuthContext] SignUp API response:', {
        user: data?.user?.email,
        id: data?.user?.id,
        email_confirmed_at: data?.user?.email_confirmed_at,
        session: data?.session ? 'exists' : 'null',
        error: error?.message
      });
      
      if (error) {
        console.error('[AuthContext] SignUp error:', error.message);
        if (error?.message?.includes('User already registered')) {
          return { error: 'An account with this email already exists. Please sign in instead.' };
        } else if (error?.message?.includes('Password should be at least')) {
          return { error: 'Password should be at least 6 characters long.' };
        } else if (error?.message?.includes('Unable to validate email address')) {
          return { error: 'Please enter a valid email address.' };
        }
        return { error: error?.message };
      }
      
      // ✅ FIXED: Just return the data, let the register page handle navigation
      console.log('[AuthContext] ✅ SignUp successful');
      return { data };
      
    } catch (error) {
      console.error('[AuthContext] SignUp exception:', error);
      if (error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('AuthRetryableFetchError')) {
        return { error: 'Cannot connect to authentication service. Your Supabase project may be paused or inactive. Please check your Supabase dashboard and resume your project if needed.' };
      }
      return { error: 'An unexpected error occurred during sign up. Please try again.' };
    } finally {
      setLoading(false);
    }
  };
  // ============================================================

  const signOut = async () => {
    try {
      console.log('[AuthContext] Signing out user...');
      setLoading(true);
      
      const { error } = await supabase?.auth?.signOut();
      if (error) {
        console.error('[AuthContext] SignOut error:', error.message);
        return { error: error?.message };
      }
      
      // Clear local storage
      localStorage?.removeItem('vulcan_session');
      localStorage?.removeItem('vulcan_user');
      
      console.log('[AuthContext] ✅ SignOut successful');
      return { success: true };
    } catch (error) {
      console.error('[AuthContext] SignOut exception:', error);
      return { error: 'Failed to sign out. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  // --- Resend Verification Email Function ---
  const resendVerification = async (email) => {
    try {
      console.log('[AuthContext] Resending verification email to:', email);
      
      const { error } = await supabase?.auth?.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) {
        console.error('[AuthContext] Resend error:', error.message);
        throw error;
      }
      
      console.log('[AuthContext] ✅ Verification email resent successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('[AuthContext] Resend exception:', error);
      return { success: false, error: error?.message || 'Failed to resend verification email.' };
    }
  };

  const resetPassword = async (email) => {
    try {
      console.log('[AuthContext] Sending password reset to:', email);
      
      const { data, error } = await supabase?.auth?.resetPasswordForEmail(email, {
        redirectTo: `${window?.location?.origin}/reset-password`
      });
      
      if (error) {
        console.error('[AuthContext] Reset password error:', error.message);
        return { error: error?.message };
      }
      
      console.log('[AuthContext] ✅ Password reset email sent');
      return { data };
    } catch (error) {
      console.error('[AuthContext] Reset password exception:', error);
      return { error: 'Failed to send reset email. Please try again.' };
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('[AuthContext] Initializing auth state...');
    
    // Get initial session
    supabase?.auth?.getSession()?.then(({ data: { session } }) => {
      console.log('[AuthContext] Initial session loaded:', {
        user: session?.user?.email || 'null',
        email_confirmed_at: session?.user?.email_confirmed_at
      });
      authStateHandlers?.onChange(null, session);
    });

    // PROTECTED: Never modify this callback signature - MUST remain synchronous
    const { data: { subscription } } = supabase?.auth?.onAuthStateChange(
      authStateHandlers?.onChange
    );

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription...');
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    resendVerification,
    resetPassword,
    updateProfile: profileOperations?.update,
    isAuthenticated: !!user,
    isAdmin: userProfile?.role === 'admin',
    isAnalyst: userProfile?.role === 'analyst' || userProfile?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
