/**
 * Authentication Context & Provider
 * 
 * Manages Supabase Auth session, user state, and sign in / sign out flows.
 * Defaults gracefully to Guest / Local mode if Supabase is unconfigured or user is logged out.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { AuthUser, AuthMode } from '../types/auth';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export interface AuthContextType {
  user: AuthUser | null;
  authMode: AuthMode;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  // Helper to map Supabase User to AuthUser
  const mapUser = (sbUser: any): AuthUser | null => {
    if (!sbUser) return null;
    return {
      id: sbUser.id,
      email: sbUser.email || '',
      displayName: sbUser.user_metadata?.display_name || sbUser.email?.split('@')[0] || 'ব্যবহারকারী',
      avatarUrl: sbUser.user_metadata?.avatar_url,
      createdAt: sbUser.created_at || new Date().toISOString(),
    };
  };

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // 1. Restore existing session
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('Failed to restore Supabase session:', sessionError);
      }
      setUser(mapUser(session?.user));
      setIsLoading(false);
    }).catch((err) => {
      console.error('Session restoration exception:', err);
      setIsLoading(false);
    });

    // 2. Listen to auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user));
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    if (!isConfigured || !supabase) {
      throw new Error('Supabase কনফিগারেশন অনুপস্থিত। .env.local ফাইলে ক্রেডেনশিয়াল প্রদান করুন।');
    }
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      throw signInError;
    }
    setUser(mapUser(data.user));
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    setError(null);
    if (!isConfigured || !supabase) {
      throw new Error('Supabase কনফিগারেশন অনুপস্থিত। .env.local ফাইলে ক্রেডেনশিয়াল প্রদান করুন।');
    }
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName?.trim() || email.split('@')[0],
        },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      throw signUpError;
    }
    setUser(mapUser(data.user));
  };

  const signInWithGoogle = async () => {
    setError(null);
    if (!isConfigured || !supabase) {
      throw new Error('Supabase কনফিগারেশন অনুপস্থিত। .env.local ফাইলে ক্রেডেনশিয়াল প্রদান করুন।');
    }
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: true,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      throw oauthError;
    }
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const signOut = async () => {
    setError(null);
    if (isConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    if (!isConfigured || !supabase) {
      throw new Error('Supabase কনফিগারেশন অনুপস্থিত।');
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (resetError) {
      setError(resetError.message);
      throw resetError;
    }
  };

  const clearError = () => setError(null);

  const authMode: AuthMode = user ? 'cloud' : 'local';

  const value = useMemo(
    () => ({
      user,
      authMode,
      isConfigured,
      isLoading,
      error,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      clearError,
    }),
    [user, authMode, isConfigured, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
