import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface AuthGatewayProps {
  onGuestExplore: () => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onGuestExplore }) => {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [termsModalType, setTermsModalType] = useState<'terms' | 'privacy'>('terms');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (mode === 'register') {
      if (!displayName.trim()) {
        setErrorMessage('অনুগ্রহ করে আপনার নাম প্রদান করুন।');
        return;
      }
      if (!agreedToTerms) {
        setErrorMessage('চালিয়ে যেতে হলে শর্তাবলী ও গোপনীয়তা নীতিতে টিক চিহ্ন দিয়ে সম্মত হতে হবে।');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        await signUp(trimmedEmail, password, displayName);
        setSuccessMessage('আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ড্যাশবোর্ডে প্রবেশ করা হচ্ছে...');
      } else {
        await signIn(trimmedEmail, password);
        setSuccessMessage('লগইন সফল হয়েছে! ড্যাশবোর্ডে প্রবেশ করা হচ্ছে...');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'একটি ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।';
      if (msg.includes('Invalid login credentials')) {
        msg = 'ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে। সঠিক তথ্য প্রদান করুন।';
      } else if (msg.includes('User already registered')) {
        msg = 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে। দয়া করে লগইন করুন।';
      } else if (msg.includes('Password should be')) {
        msg = 'পাসওয়ার্ড আরও কিছুটা শক্তিশালী করুন (কমপক্ষে ৬ অক্ষর)।';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const openTerms = (type: 'terms' | 'privacy') => {
    setTermsModalType(type);
    setIsTermsModalOpen(true);
  };

  return (
    <div className="auth-gateway-wrapper">
      {/* Background Ambient Glow */}
      <div className="auth-gateway-glow-orb" />

      {/* Top Header Controls (Status & Language Indicator) */}
      <div className="auth-gateway-topbar">
        <div className="auth-security-badge-top">
          <span className="security-icon-dot">●</span> SSL Secured
        </div>
        <button
          type="button"
          className="auth-lang-pill"
          title="ভাষা পরিবর্তন (Language)"
          onClick={() => {}}
        >
          <span style={{ fontSize: '0.85rem' }}>文/A</span>
          <span>বাংলা</span>
        </button>
      </div>

      <div className="auth-gateway-container">
        {/* Brand Icon Matching User Reference (Ledger Book with Bookmark) */}
        <div className="auth-brand-visual">
          <div className="auth-ledger-icon-wrap">
            <svg
              className="auth-ledger-svg"
              viewBox="0 0 72 84"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Ledger Book Shadow */}
              <rect x="6" y="8" width="58" height="70" rx="12" fill="rgba(0,0,0,0.5)" filter="blur(6px)" />
              {/* Ledger Cover in Radiant Red/Emerald Gradient */}
              <rect
                x="8"
                y="6"
                width="56"
                height="70"
                rx="10"
                fill="url(#ledgerGradient)"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1.5"
              />
              {/* Spine Highlight */}
              <rect x="8" y="6" width="10" height="70" rx="4" fill="rgba(0, 0, 0, 0.25)" />
              {/* Bookmark Ribbon */}
              <path
                d="M26 6V30L32 25L38 30V6H26Z"
                fill="url(#bookmarkGradient)"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
              />
              <defs>
                <linearGradient id="ledgerGradient" x1="8" y1="6" x2="64" y2="76" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ef4444" />
                  <stop offset="0.6" stopColor="#dc2626" />
                  <stop offset="1" stopColor="#991b1b" />
                </linearGradient>
                <linearGradient id="bookmarkGradient" x1="26" y1="6" x2="38" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fef08a" />
                  <stop offset="1" stopColor="#eab308" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Heading & Tagline */}
        <div className="auth-header-text">
          <h1 className="auth-main-title">
            {mode === 'register' ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন'}
          </h1>
          <p className="auth-main-tagline">
            হিসাব রাখুন সহজে, লক্ষ্য পূরণ হোক আনন্দে
          </p>
        </div>

        {/* Segmented Mode Slider */}
        <div className="auth-segmented-tabs">
          <button
            type="button"
            className={`auth-segment-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
          >
            অ্যাকাউন্ট তৈরি করুন
          </button>
          <button
            type="button"
            className={`auth-segment-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
          >
            লগইন
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="auth-feedback-banner error" role="alert">
            <span className="feedback-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="auth-feedback-banner success" role="alert">
            <span className="feedback-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Credentials Form */}
        <form onSubmit={handleSubmit} className="auth-gateway-form" noValidate>
          {/* Name Field (Only in Register Mode) */}
          {mode === 'register' && (
            <div className="auth-field-group">
              <div className="auth-input-container">
                <span className="auth-input-icon">👤</span>
                <input
                  type="text"
                  className="auth-cyber-input"
                  placeholder="আপনার নাম"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="auth-field-group">
            <div className="auth-input-container">
              <span className="auth-input-icon">✉️</span>
              <input
                type="email"
                className="auth-cyber-input"
                placeholder="*সঠিক* ইমেইল ঠিকানা দিন"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="auth-field-group">
            <div className="auth-input-container">
              <span className="auth-input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-cyber-input"
                placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                aria-label="পাসওয়ার্ড টগল"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* Terms & Conditions Box (Matching User's Reference Screenshot) */}
          {mode === 'register' && (
            <div className={`auth-terms-card ${!agreedToTerms ? 'unagreed' : 'agreed'}`}>
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  className="auth-cyber-checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span className="auth-terms-text">
                  অ্যাপ ব্যবহার করতে হলে আপনাকে{' '}
                  <button
                    type="button"
                    className="auth-terms-link"
                    onClick={(e) => {
                      e.preventDefault();
                      openTerms('terms');
                    }}
                  >
                    শর্তাবলী
                  </button>{' '}
                  ও{' '}
                  <button
                    type="button"
                    className="auth-terms-link"
                    onClick={(e) => {
                      e.preventDefault();
                      openTerms('privacy');
                    }}
                  >
                    গোপনীয়তা নীতি
                  </button>{' '}
                  তে সম্মত হতে হবে।
                  <span className="auth-terms-subtext">চালিয়ে যেতে বক্সে টিক দিন</span>
                </span>
              </label>
            </div>
          )}

          {/* Main Action Button */}
          <button
            type="submit"
            className="auth-primary-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="auth-btn-spinner-wrap">
                <span className="auth-spinner" /> প্রক্রিয়াধীন...
              </span>
            ) : mode === 'register' ? (
              'অ্যাকাউন্ট তৈরি করুন'
            ) : (
              'লগইন করুন'
            )}
          </button>
        </form>

        {/* Mode Switch Prompt */}
        <div className="auth-switch-prompt-row">
          {mode === 'register' ? (
            <span>
              ইতিমধ্যে একটি অ্যাকাউন্ট আছে?{' '}
              <button
                type="button"
                className="auth-inline-switch-btn"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
              >
                লগইন
              </button>
            </span>
          ) : (
            <span>
              কোনো অ্যাকাউন্ট নেই?{' '}
              <button
                type="button"
                className="auth-inline-switch-btn"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
              >
                অ্যাকাউন্ট তৈরি করুন
              </button>
            </span>
          )}
        </div>

        {/* Guest Explore Option */}
        <div className="auth-guest-section">
          <button
            type="button"
            className="auth-guest-explore-btn"
            onClick={onGuestExplore}
          >
            <span className="guest-bolt-icon">⚡</span>
            <span>গেস্ট হিসেবে আগে ঘুরে দেখুন</span>
          </button>
          <span className="auth-guest-note">
            কোনো অ্যাকাউন্ট ছাড়াই অ্যাপের সমস্ত ফিচার ট্রাই করুন
          </span>
        </div>

        {/* Security Trust Footnote */}
        <div className="auth-security-footnote">
          <span className="footnote-lock-icon">🔒</span>
          <span>
            <strong>256-Bit Bank Grade Encryption</strong> • আপনার আর্থিক তথ্য সম্পূর্ণ সুরক্ষিত ও ব্যক্তিগত
          </span>
        </div>
      </div>

      {/* Terms & Privacy Policy Preview Modal */}
      {isTermsModalOpen && (
        <div className="auth-terms-modal-backdrop" onClick={() => setIsTermsModalOpen(false)}>
          <div className="auth-terms-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-terms-modal-header">
              <h3>
                {termsModalType === 'terms'
                  ? 'ব্যবহারের সাধারণ শর্তাবলী (Terms of Service)'
                  : 'গোপনীয়তা ও ডাটা সুরক্ষা নীতি (Privacy Policy)'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsTermsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="auth-terms-modal-body">
              {termsModalType === 'terms' ? (
                <div>
                  <p><strong>১. ব্যক্তিগত আর্থিক ট্র্যাকিং:</strong> এই অ্যাপ্লিকেশনটি ব্যক্তিগত আয়-ব্যয় এবং আর্থিক হিসাব রাখার সুবিধার্থে তৈরি করা হয়েছে।</p>
                  <p><strong>২. ব্যবহারকারীর দায়িত্ব:</strong> আপনার অ্যাকাউন্টের পাসওয়ার্ড ও লগইন তথ্য গোপন রাখার দায়িত্ব সম্পূর্ণ আপনার।</p>
                  <p><strong>৩. সঠিক তথ্য প্রদান:</strong> অ্যাকাউন্টের নিরবচ্ছিন্ন ব্যাকআপের জন্য সবসময় সক্রিয় ইমেইল ব্যবহার করুন।</p>
                  <p><strong>৪. ক্লাউড ব্যাকআপ:</strong> ক্লাউড অ্যাকাউন্ট ব্যবহারের মাধ্যমে আপনি যেকোনো ডিভাইস থেকে আপনার আর্থিক ডাটা নিরাপদে সিঙ্ক করতে পারবেন।</p>
                </div>
              ) : (
                <div>
                  <p><strong>১. ডাটা এনক্রিপশন:</strong> আপনার সমস্ত আর্থিক লেনদেন Row Level Security (RLS) এবং 256-bit এনক্রিপশনের মাধ্যমে সম্পূর্ণ সুরক্ষিত।</p>
                  <p><strong>২. তৃতীয় পক্ষের কাছে অপ্রকাশ্য:</strong> আপনার কোনো ব্যক্তিগত বা আর্থিক ডাটা বাণিজ্যিক উদ্দেশ্যে কোনো তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করা হয় না।</p>
                  <p><strong>৩. সম্পূর্ণ নিয়ন্ত্রণ:</strong> আপনি যেকোনো সময় আপনার অ্যাকাউন্ট ও সমস্ত আর্থিক রেকর্ড চিরতরে মুছে ফেলার অধিকার সংরক্ষণ করেন।</p>
                </div>
              )}
            </div>
            <div className="auth-terms-modal-footer">
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => {
                  setAgreedToTerms(true);
                  setIsTermsModalOpen(false);
                }}
              >
                আমি সম্মত (Agree)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
