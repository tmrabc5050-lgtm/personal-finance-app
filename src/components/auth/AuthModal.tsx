/**
 * Personal Finance Super App - Authentication Modal
 * 
 * Supports:
 * - Email / Password Sign In
 * - User Registration with display name
 * - Password Reset
 * - Authenticated User Profile & Logout
 * - Bengali typography, accessible keyboard navigation, loading and error states
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../services/supabaseClient';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessMessage?: (msg: string) => void;
  onErrorMessage?: (msg: string) => void;
}

type AuthTab = 'signin' | 'signup' | 'reset' | 'profile';

function formatAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) {
    return 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। দয়া করে আবার চেষ্টা করুন।';
  }
  if (msg.includes('Email not confirmed')) {
    return 'ইমেইল এখনো ভেরিফাই করা হয়নি। আপনার ইনবক্সে পাঠানো ভেরিফিকেশন লিংক চেক করুন।';
  }
  if (msg.includes('User already registered')) {
    return 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে। দয়া করে লগইন করুন।';
  }
  if (msg.includes('Password should be at least 6 characters')) {
    return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
  }
  return msg;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessMessage,
  onErrorMessage,
}) => {
  const { user, authMode, signIn, signUp, signOut, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>(user ? 'profile' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // Synchronize tab if user state changes
  useEffect(() => {
    if (user) {
      setActiveTab('profile');
    } else if (activeTab === 'profile') {
      setActiveTab('signin');
    }
  }, [user]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    if (!email || !password) {
      setLocalError('অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড প্রদান করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      onSuccessMessage?.('সফলভাবে লগইন হয়েছে!');
      onClose();
    } catch (err: any) {
      const msg = formatAuthError(err?.message || 'লগইন করতে ব্যর্থ হয়েছে।');
      setLocalError(msg);
      onErrorMessage?.(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    if (!email || !password) {
      setLocalError('অনুগ্রহ করে প্রয়োজনীয় তথ্য পূরণ করুন।');
      return;
    }
    if (password.length < 6) {
      setLocalError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('উভয় পাসওয়ার্ড একই হতে হবে।');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password, displayName);
      setLocalSuccess(
        'নিবন্ধন সফল হয়েছে! আপনি এখন লগইন করতে পারেন।'
      );
      onSuccessMessage?.('রেজিস্ট্রেশন সফল হয়েছে!');
    } catch (err: any) {
      const msg = formatAuthError(err?.message || 'রেজিস্ট্রেশন করতে ব্যর্থ হয়েছে।');
      setLocalError(msg);
      onErrorMessage?.(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    if (!email) {
      setLocalError('অনুগ্রহ করে আপনার ইমেইল প্রদান করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setLocalSuccess('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।');
      onSuccessMessage?.('পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে!');
    } catch (err: any) {
      const msg = formatAuthError(err?.message || 'পাসওয়ার্ড রিসেট লিংক পাঠাতে ব্যর্থ হয়েছে।');
      setLocalError(msg);
      onErrorMessage?.(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      await signOut();
      onSuccessMessage?.('সফলভাবে লগআউট করা হয়েছে।');
      onClose();
    } catch (err: any) {
      onErrorMessage?.(err?.message || 'লগআউট করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        style={{ maxWidth: '440px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span style={{ fontSize: '1.25rem' }}>🔐</span>
            <div>
              <h2 id="auth-modal-title" className="modal-title">
                {user
                  ? 'ব্যবহারকারীর প্রোফাইল'
                  : activeTab === 'signin'
                  ? 'লগইন করুন'
                  : activeTab === 'signup'
                  ? 'নতুন অ্যাকাউন্ট তৈরি'
                  : 'পাসওয়ার্ড রিসেট'}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {user ? user.email : 'Supabase ক্লাউড অথেনটিকেশন'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="উইন্ডো বন্ধ করুন"
          >
            ✕
          </button>
        </div>

        {/* Supabase Status Notice if not configured */}
        {!isConfigured && (
          <div style={{ padding: '8px 16px', backgroundColor: '#fef3c7', borderBottom: '1px solid #fde68a', fontSize: '0.75rem', color: '#92400e' }}>
            ⚠️ Supabase ক্রেডেনশিয়াল পাওয়া যায়নি। বর্তমানে লোকাল মোড সক্রিয়।
          </div>
        )}

        {/* Modal Body */}
        <div className="auth-modal-body">
          {user ? (
            /* User Profile View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.125rem' }}>
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {user.displayName || user.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {user.email}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span className="header-auth-badge header-auth-badge-cloud" style={{ fontSize: '0.6875rem', padding: '2px 8px' }}>
                      ● {authMode === 'cloud' ? 'ক্লাউড সিঙ্ক সক্রিয়' : 'গেস্ট মোড'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>ইউজার আইডি:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem' }}>{user.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>নিবন্ধনের তারিখ:</span>
                  <span>{new Date(user.createdAt).toLocaleDateString('bn-BD')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '9px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '600',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem',
                }}
              >
                {isSubmitting ? 'লগআউট হচ্ছে...' : 'লগআউট করুন'}
              </button>
            </div>
          ) : (
            <>
              {/* Navigation Tabs */}
              <div className="auth-nav-tabs">
                <button
                  type="button"
                  className={`auth-nav-tab ${activeTab === 'signin' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('signin');
                    setLocalError(null);
                    setLocalSuccess(null);
                  }}
                >
                  লগইন
                </button>
                <button
                  type="button"
                  className={`auth-nav-tab ${activeTab === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('signup');
                    setLocalError(null);
                    setLocalSuccess(null);
                  }}
                >
                  নতুন অ্যাকাউন্ট
                </button>
                <button
                  type="button"
                  className={`auth-nav-tab ${activeTab === 'reset' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('reset');
                    setLocalError(null);
                    setLocalSuccess(null);
                  }}
                >
                  পাসওয়ার্ড রিসেট
                </button>
              </div>

              {/* Alert Feedback Messages */}
              {localError && (
                <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#b91c1c', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️</span>
                  <span>{localError}</span>
                </div>
              )}

              {localSuccess && (
                <div style={{ padding: '8px 12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', color: '#047857', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✓</span>
                  <span>{localSuccess}</span>
                </div>
              )}

              {activeTab === 'signin' ? (
                /* Sign In Form */
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="auth-form-group">
                    <label className="auth-form-label">ইমেইল এড্রেস</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="auth-input"
                      autoComplete="email"
                    />
                  </div>

                  <div className="auth-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="auth-form-label">পাসওয়ার্ড</label>
                      <button
                        type="button"
                        onClick={() => setActiveTab('reset')}
                        style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        ভুলে গেছেন?
                      </button>
                    </div>
                    <div className="auth-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="auth-input"
                        autoComplete="current-password"
                        style={{ paddingRight: '50px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="auth-password-toggle"
                      >
                        {showPassword ? 'লুকান' : 'দেখান'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="auth-submit-btn"
                  >
                    {isSubmitting ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
                  </button>
                </form>
              ) : activeTab === 'signup' ? (
                /* Sign Up Form */
                <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="auth-form-group">
                    <label className="auth-form-label">আপনার নাম (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="তারিক আহমেদ"
                      className="auth-input"
                    />
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-form-label">ইমেইল এড্রেস</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="auth-input"
                      autoComplete="email"
                    />
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-form-label">পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)</label>
                    <div className="auth-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="auth-input"
                        autoComplete="new-password"
                        style={{ paddingRight: '50px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="auth-password-toggle"
                      >
                        {showPassword ? 'লুকান' : 'দেখান'}
                      </button>
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-form-label">পাসওয়ার্ড নিশ্চিত করুন</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="auth-input"
                      autoComplete="new-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="auth-submit-btn"
                    style={{ marginTop: '4px' }}
                  >
                    {isSubmitting ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
                  </button>
                </form>
              ) : (
                /* Reset Password Form */
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    আপনার অ্যাকাউন্টের সাথে যুক্ত ইমেইল দিন। আমরা পাসওয়ার্ড রিসেট লিংক পাঠিয়ে দেব।
                  </p>

                  <div className="auth-form-group">
                    <label className="auth-form-label">ইমেইল এড্রেস</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="auth-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="auth-submit-btn"
                  >
                    {isSubmitting ? 'লিংক পাঠানো হচ্ছে...' : 'রিসেট লিংক পাঠান'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
