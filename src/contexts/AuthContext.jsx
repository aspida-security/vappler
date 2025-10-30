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

  // Profile operations
  const profileOperations = {
    async load(userId) {
      if (!userId) {
        console.log('[AuthContext] No userId provided, clearing profile');
        setUserProfile(null);
        return null;
      }

      try {
        setProfileLoading(true);
        console.log('[AuthContext] Loading profile for user ID:', userId);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('[AuthContext] Error loading profile:', error);
          
          // CRITICAL FIX: Removed automatic profile creation for PGRST116 error.
          // The application MUST now rely on the database trigger for provisioning.
          if (error.code === 'PGRST116') {
             console.log('[AuthContext] Profile row missing (PGRST116). Trigger likely failed or is still provisioning.');
          }
          
          setUserProfile(null);
          return;
        }

        setUserProfile(data);
        console.log('[AuthContext] Profile loaded successfully:', data.full_name);

      } catch (error) {
        console.error('[AuthContext] Profile loading CATCH block error:', error);
      } finally {
        setProfileLoading(false);
      }
    },

    clear() {
      setUserProfile(null);
      setProfileLoading(false);
    },
  };

  // Auth state handling (synchronous)
  const handleAuthChange = (event, session) => {
    console.log(`[AuthContext] Auth event: ${event}`, session);
    
    // Skip loading check if we are just signed out
    if (event !== 'SIGNED_OUT') {
        // Set loading to false once we have any session state
        setLoading(false);
    }

    if (session?.user) {
      setUser(session.user);
      console.log(`[AuthContext] User authenticated: ${session.user.email}`);
      profileOperations.load(session.user.id);
    } else {
      setUser(null);
      profileOperations.clear();
      console.log('[AuthContext] User signed out or session cleared.');
    }
  };

  // Authentication methods (simplified for focus)
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error: error.message };
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      setLoading(true);
      // NOTE: This triggers the email confirmation flow, then the DB trigger on update.
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: userData }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error: error.message };
    }
  };
  
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      setLoading(false);
      return { error: error.message };
    }
  };
  
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('[AuthContext] Password reset error:', error);
      return { error };
    }
  };


  // Initialize auth state
  useEffect(() => {
    console.log('[AuthContext] Initializing...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange('INITIAL_SESSION', session);
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session);
    });

    return () => {
      console.log('[AuthContext] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
    // Add logic to determine if user is fully ready for dashboard access
    isReady: !!user && !!userProfile && !loading && !profileLoading,
    isAdmin: userProfile?.role === 'admin',
    isAnalyst: userProfile?.role === 'analyst' || userProfile?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};