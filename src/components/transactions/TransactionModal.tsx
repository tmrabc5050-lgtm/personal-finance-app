/**
 * Personal Finance Super App - Transaction Creation & Editing Modal
 * Batch 1: Core Finance Engine Implementation
 *
 * Full functional form supporting:
 * - Add Income
 * - Add Expense
 * - Edit Transaction with account balance recalculation
 * - Delete Transaction with confirmation
 * - Exact paisa parsing and Bengali validation feedback
 */

import React, { useEffect, useState } from 'react';
import { Account, Transaction, TransactionType } from '../../types/dashboard';
import { formatPaisaToBDT, formatPaisaToDecimalString, parseBDTToPaisa } from '../../utils/currency';

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: {
    type: TransactionType;
    amountPaisa: bigint;
    accountId: string;
    category: string;
    note?: string;
    date: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  accounts: Account[];
  initialTransaction?: Transaction | null;
  defaultType?: TransactionType;
  defaultYear?: number;
  defaultMonth?: number;
}

const EXPENSE_CATEGORIES = [
  'বাসা ভাড়া',
  'খাবার ও বাজার',
  'ইউটিলিটি ও বিল',
  'যাতায়াত',
  'চিকিৎসা ও ওষুধ',
  'বিনোদন ও ভ্রমণ',
  'শিক্ষা ও পড়াশোনা',
  'কেনাকাটা ও পোশাক',
  'পরিবার ও উপহার',
  'ফি ও চার্জ',
  'অন্যান্য ব্যয়',
];

const INCOME_CATEGORIES = [
  'বেতন',
  'ফ্রিল্যান্সিং',
  'ব্যবসা মুনাফা',
  'বিনিয়োগ ও লভ্যাংশ',
  'উপহার ও অনুদান',
  'অন্যান্য আয়',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  accounts,
  initialTransaction,
  defaultType = 'expense',
  defaultYear = 2026,
  defaultMonth = 10,
}) => {
  const isEditing = Boolean(initialTransaction);

  const [type, setType] = useState<TransactionType>(
    initialTransaction ? initialTransaction.type : defaultType
  );
  const [amountStr, setAmountStr] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize or reset form state whenever modal opens or initialTransaction changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);
      return;
    }

    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmountStr(formatPaisaToDecimalString(initialTransaction.amountPaisa));
      setAccountId(initialTransaction.accountId);

      const isKnownCategory =
        EXPENSE_CATEGORIES.includes(initialTransaction.category) ||
        INCOME_CATEGORIES.includes(initialTransaction.category);

      if (isKnownCategory) {
        setCategory(initialTransaction.category);
        setCustomCategory('');
      } else {
        setCategory('অন্যান্য');
        setCustomCategory(initialTransaction.category);
      }

      setNote(initialTransaction.note || '');
      setDate(initialTransaction.date);
    } else {
      setType(defaultType);
      setAmountStr('');
      setAccountId(accounts.length > 0 ? accounts[0].id : '');

      const defaultCategoryList = defaultType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      setCategory(defaultCategoryList[0] || '');
      setCustomCategory('');
      setNote('');

      // Format default date YYYY-MM-DD (e.g. current day in selected month)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      let dateString = '';
      if (currentYear === defaultYear && currentMonth === defaultMonth) {
        dateString = now.toISOString().split('T')[0];
      } else {
        const paddedMonth = defaultMonth.toString().padStart(2, '0');
        dateString = `${defaultYear}-${paddedMonth}-15`;
      }
      setDate(dateString);
    }

    setErrorMessage(null);
  }, [isOpen, initialTransaction, defaultType, defaultYear, defaultMonth, accounts]);

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

  const currentCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validate Amount
    let paisaAmount: bigint;
    try {
      paisaAmount = parseBDTToPaisa(amountStr);
      if (paisaAmount <= 0n) {
        setErrorMessage('টাকার পরিমাণ অবশ্যই ০-এর বেশি হতে হবে।');
        return;
      }
    } catch (parseErr) {
      setErrorMessage(
        parseErr instanceof Error ? parseErr.message : 'সঠিক টাকার পরিমাণ দিন (যেমন: ৫০০ বা ১২৫০.৫০)'
      );
      return;
    }

    // 2. Validate Account
    if (!accountId) {
      setErrorMessage('একটি অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }

    // 3. Validate Category
    let resolvedCategory = category.trim();
    if (resolvedCategory === 'অন্যান্য' && customCategory.trim()) {
      resolvedCategory = customCategory.trim();
    }
    if (!resolvedCategory) {
      setErrorMessage('ক্যাটাগরি নির্বাচন করুন বা লিখুন।');
      return;
    }

    // 4. Validate Date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErrorMessage('সঠিক তারিখ নির্বাচন করুন (YYYY-MM-DD)।');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        type,
        amountPaisa: paisaAmount,
        accountId,
        category: resolvedCategory,
        note: note.trim() || undefined,
        date,
      });
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'লেনদেন সংরক্ষণ করতে সমস্যা হয়েছে।'
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
        aria-labelledby="tx-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h2 id="tx-modal-title" className="modal-title">
            {isEditing ? 'লেনদেন সম্পাদনা' : type === 'income' ? 'নতুন আয় যোগ' : 'নতুন ব্যয় যোগ'}
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {errorMessage && (
              <div className="form-error-banner" role="alert">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {/* 1. Transaction Type Toggle */}
            <div className="form-group">
              <label className="form-label">লেনদেনের ধরন</label>
              <div className="type-toggle-group" role="radiogroup" aria-label="লেনদেনের ধরন">
                <button
                  type="button"
                  className={`type-toggle-btn btn-toggle-expense ${
                    type === 'expense' ? 'type-toggle-active' : ''
                  }`}
                  onClick={() => {
                    setType('expense');
                    setCategory(EXPENSE_CATEGORIES[0]);
                  }}
                  aria-checked={type === 'expense'}
                  role="radio"
                >
                  − ব্যয় (Expense)
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn btn-toggle-income ${
                    type === 'income' ? 'type-toggle-active' : ''
                  }`}
                  onClick={() => {
                    setType('income');
                    setCategory(INCOME_CATEGORIES[0]);
                  }}
                  aria-checked={type === 'income'}
                  role="radio"
                >
                  + আয় (Income)
                </button>
              </div>
            </div>

            {/* 2. Amount Input */}
            <div className="form-group">
              <label htmlFor="tx-amount-input" className="form-label">
                টাকার পরিমাণ (BDT) <span className="required-star">*</span>
              </label>
              <div className="amount-input-wrap">
                <span className="currency-symbol-addon" aria-hidden="true">
                  ৳
                </span>
                <input
                  id="tx-amount-input"
                  type="text"
                  inputMode="decimal"
                  className="form-input amount-field"
                  placeholder="০.০০"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  autoFocus
                  required
                  disabled={isSubmitting}
                />
              </div>
              <span className="form-hint">উদাহরণ: ৫০০ বা ১২৫০.৫০</span>
            </div>

            {/* 3. Account Select */}
            <div className="form-group">
              <label htmlFor="tx-account-select" className="form-label">
                অ্যাকাউন্ট / ওয়ালেট <span className="required-star">*</span>
              </label>
              <select
                id="tx-account-select"
                className="form-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                disabled={isSubmitting || accounts.length === 0}
              >
                {accounts.length === 0 ? (
                  <option value="">কোনো অ্যাকাউন্ট নেই</option>
                ) : (
                  accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (ব্যালেন্স: {formatPaisaToBDT(acc.balancePaisa)})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 4. Category Select */}
            <div className="form-group">
              <label htmlFor="tx-category-select" className="form-label">
                ক্যাটাগরি <span className="required-star">*</span>
              </label>
              <select
                id="tx-category-select"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                disabled={isSubmitting}
              >
                {currentCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="অন্যান্য">অন্যান্য (নিজে লিখুন)</option>
              </select>
            </div>

            {category === 'অন্যান্য' && (
              <div className="form-group">
                <label htmlFor="tx-custom-category" className="form-label">
                  কাস্টম ক্যাটাগরির নাম <span className="required-star">*</span>
                </label>
                <input
                  id="tx-custom-category"
                  type="text"
                  className="form-input"
                  placeholder="যেমন: বই কেনা বা বোনাস"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* 5. Date Input */}
            <div className="form-group">
              <label htmlFor="tx-date-input" className="form-label">
                তারিখ <span className="required-star">*</span>
              </label>
              <input
                id="tx-date-input"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* 6. Note / Description */}
            <div className="form-group">
              <label htmlFor="tx-note-input" className="form-label">
                বিবরণ / নোট (ঐচ্ছিক)
              </label>
              <input
                id="tx-note-input"
                type="text"
                className="form-input"
                placeholder="যেমন: অক্টোবর মাসের বাড়ি ভাড়া বা বিদ্যুৎ বিল"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="modal-footer">
            {isEditing && onDelete && (
              <button
                type="button"
                className="btn-modal-destructive"
                onClick={() => {
                  if (initialTransaction) {
                    onDelete(initialTransaction.id);
                  }
                }}
                disabled={isSubmitting}
              >
                🗑️ মুছে ফেলুন
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
              <button
                type="submit"
                className={type === 'income' ? 'btn-modal-success' : 'btn-modal-primary'}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'সংরক্ষণ হচ্ছে...'
                  : isEditing
                  ? 'হালনাগাদ করুন'
                  : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
