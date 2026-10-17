/**
 * Personal Finance Super App - Account Creation & Editing Modal
 * Batch 1: Core Finance Engine Implementation
 *
 * Full functional form supporting:
 * - Add new account with initial balance
 * - Edit account name, type, and masked account number
 * - Delete account (with orphan transaction protection)
 */

import React, { useEffect, useState } from 'react';
import { Account, AccountType } from '../../types/dashboard';
import { formatPaisaToDecimalString, parseBDTToPaisa } from '../../utils/currency';

export interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: AccountType;
    accountNumberMasked?: string;
    initialBalancePaisa?: bigint;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialAccount?: Account | null;
}

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: string }[] = [
  { type: 'cash', label: 'নগদ ক্যাশ (Cash)', icon: '💵' },
  { type: 'bkash', label: 'বিকাশ (bKash)', icon: '📱' },
  { type: 'nagad', label: 'নগদ (Nagad)', icon: '📱' },
  { type: 'bank', label: 'ব্যাংক হিসাব (Bank)', icon: '🏦' },
  { type: 'other', label: 'অন্যান্য (Other Wallet/Card)', icon: '💳' },
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialAccount,
}) => {
  const isEditing = Boolean(initialAccount);

  const [name, setName] = useState<string>('');
  const [type, setType] = useState<AccountType>('bank');
  const [accountNumberMasked, setAccountNumberMasked] = useState<string>('');
  const [initialBalanceStr, setInitialBalanceStr] = useState<string>('0');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);
      return;
    }

    if (initialAccount) {
      setName(initialAccount.name);
      setType(initialAccount.type);
      setAccountNumberMasked(initialAccount.accountNumberMasked || '');
      setInitialBalanceStr(formatPaisaToDecimalString(initialAccount.balancePaisa));
    } else {
      setName('');
      setType('bank');
      setAccountNumberMasked('');
      setInitialBalanceStr('0');
    }

    setErrorMessage(null);
  }, [isOpen, initialAccount]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('অ্যাকাউন্টের নাম লিখুন।');
      return;
    }

    let initialBalancePaisa = 0n;
    if (!isEditing) {
      try {
        initialBalancePaisa = parseBDTToPaisa(initialBalanceStr || '0');
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'সঠিক প্রারম্ভিক ব্যালেন্স দিন (যেমন: ০ বা ৫০০)'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: trimmedName,
        type,
        accountNumberMasked: accountNumberMasked.trim() || undefined,
        initialBalancePaisa: isEditing ? undefined : initialBalancePaisa,
      });
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'অ্যাকাউন্ট সংরক্ষণ করতে সমস্যা হয়েছে।'
      );
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
        aria-labelledby="account-modal-title"
      >
        <div className="modal-header">
          <h2 id="account-modal-title" className="modal-title">
            {isEditing ? 'অ্যাকাউন্ট সম্পাদনা' : 'নতুন অ্যাকাউন্ট তৈরি'}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="উইন্ডো বন্ধ করুন"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {errorMessage && (
              <div className="form-error-banner" role="alert">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {/* 1. Account Name */}
            <div className="form-group">
              <label htmlFor="account-name-input" className="form-label">
                অ্যাকাউন্টের নাম <span className="required-star">*</span>
              </label>
              <input
                id="account-name-input"
                type="text"
                className="form-input"
                placeholder="যেমন: ব্র্যাক ব্যাংক (সঞ্চয়ী) বা নগদ ওয়ালেট"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
                disabled={isSubmitting}
              />
            </div>

            {/* 2. Account Type */}
            <div className="form-group">
              <label htmlFor="account-type-select" className="form-label">
                অ্যাকাউন্টের ধরন <span className="required-star">*</span>
              </label>
              <select
                id="account-type-select"
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                required
                disabled={isSubmitting}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Masked Account Number */}
            <div className="form-group">
              <label htmlFor="account-number-input" className="form-label">
                অ্যাকাউন্ট / মোবাইল নম্বর (ঐচ্ছিক)
              </label>
              <input
                id="account-number-input"
                type="text"
                className="form-input"
                placeholder="যেমন: ১৫০১****৭৮৯০ বা ০১৭১****১২৩৪"
                value={accountNumberMasked}
                onChange={(e) => setAccountNumberMasked(e.target.value)}
                disabled={isSubmitting}
              />
              <span className="form-hint">গোপনীয়তা রক্ষার জন্য মাস্কিং ফরম্যাট ব্যবহার করুন।</span>
            </div>

            {/* 4. Initial Balance (Only when creating) */}
            {!isEditing && (
              <div className="form-group">
                <label htmlFor="account-initial-balance" className="form-label">
                  প্রারম্ভিক ব্যালেন্স (BDT) <span className="required-star">*</span>
                </label>
                <div className="amount-input-wrap">
                  <span className="currency-symbol-addon" aria-hidden="true">
                    ৳
                  </span>
                  <input
                    id="account-initial-balance"
                    type="text"
                    inputMode="decimal"
                    className="form-input amount-field"
                    placeholder="০.০০"
                    value={initialBalanceStr}
                    onChange={(e) => setInitialBalanceStr(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <span className="form-hint">অ্যাকাউন্টে বর্তমান স্থিতি লিখুন (০ হতে পারে)।</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {isEditing && onDelete && (
              <button
                type="button"
                className="btn-modal-destructive"
                onClick={() => {
                  if (initialAccount) {
                    onDelete(initialAccount.id);
                  }
                }}
                disabled={isSubmitting}
              >
                🗑️ অ্যাকাউন্ট মুছে ফেলুন
              </button>
            )}

            <div className="modal-footer-right">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                বাতিল
              </button>
              <button type="submit" className="btn-modal-primary" disabled={isSubmitting}>
                {isSubmitting
                  ? 'সংরক্ষণ হচ্ছে...'
                  : isEditing
                  ? 'হালনাগাদ করুন'
                  : 'অ্যাকাউন্ট তৈরি করুন'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
