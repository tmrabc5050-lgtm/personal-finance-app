/**
 * Personal Finance Super App - Error Banner Component
 * Phase 05C - Step 3: UI Tokens, Hooks & Dashboard Components
 */

import React from 'react';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  return (
    <div className="error-banner" role="alert" aria-live="assertive">
      <div className="error-banner-text">
        <strong>⚠️ সমস্যা হয়েছে:</strong> {message}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-retry">
          পুনরায় চেষ্টা করুন
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
