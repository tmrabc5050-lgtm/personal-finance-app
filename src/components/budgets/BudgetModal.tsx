/**
 * Personal Finance Super App - Budget Creation & Editing Modal
 * Batch 3: Budget Engine, Financial Reports & Savings Goals
 */

import React, { useEffect, useState } from 'react';
import { Budget } from '../../types/budgetAndGoals';
import { formatPaisaToDecimalString, parseBDTToPaisa, toBengaliNumeral } from '../../utils/currency';
import { BENGALI_MONTHS } from '../../utils/date';

export interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    category: string;
    limitPaisa: bigint;
    month: number;
    year: number;
    warningThresholdPercent?: number;
  }) => Promise<void>;
  initialBudget?: Budget | null;
  defaultYear?: number;
  defaultMonth?: number;
}

const DEFAULT_CATEGORIES = [
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

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBudget = null,
  defaultYear = 2026,
  defaultMonth = 10,
}) => {
  const isEditing = !!initialBudget;

  const [category, setCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [amountStr, setAmountStr] = useState<string>('');
  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);
  const [threshold, setThreshold] = useState<number>(80);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialBudget) {
      const budgetLimit = initialBudget.amountPaisa ?? initialBudget.limitPaisa ?? 0n;
      setAmountStr(formatPaisaToDecimalString(budgetLimit));
      setMonth(initialBudget.month);
      setYear(initialBudget.year);
      setThreshold(initialBudget.warningThresholdPercent ?? 80);

      if (DEFAULT_CATEGORIES.includes(initialBudget.category)) {
        setCategory(initialBudget.category);
        setIsCustomCategory(false);
        setCustomCategory('');
      } else {
        setCategory('__custom__');
        setIsCustomCategory(true);
        setCustomCategory(initialBudget.category);
      }
    } else {
      setCategory(DEFAULT_CATEGORIES[0]);
      setIsCustomCategory(false);
      setCustomCategory('');
      setAmountStr('');
      setMonth(defaultMonth);
      setYear(defaultYear);
      setThreshold(80);
    }

    setErrorMessage(null);
  }, [isOpen, initialBudget, defaultYear, defaultMonth]);

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

    // 1. Validate Category
    const finalCategory = isCustomCategory ? customCategory.trim() : category.trim();
    if (!finalCategory) {
      setErrorMessage('অনুগ্রহ করে বাজেটের ক্যাটাগরি নির্বাচন করুন বা লিখুন।');
      return;
    }

    // 2. Validate Amount
    let paisaAmount: bigint;
    try {
      paisaAmount = parseBDTToPaisa(amountStr);
      if (paisaAmount <= 0n) {
        setErrorMessage('বাজেটের পরিমাণ অবশ্যই ০-এর বেশি হতে হবে।');
        return;
      }
    } catch (parseErr) {
      setErrorMessage(
        parseErr instanceof Error ? parseErr.message : 'সঠিক টাকার পরিমাণ লিখুন (যেমন: ৫০০০ বা ১০০০০)'
      );
      return;
    }

    // 3. Validate Threshold
    if (threshold < 1 || threshold > 99) {
      setErrorMessage('সতর্কবার্তা থ্রেশহোল্ড ১% থেকে ৯৯%-এর মধ্যে হতে হবে।');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        category: finalCategory,
        limitPaisa: paisaAmount,
        month,
        year,
        warningThresholdPercent: threshold,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'বাজেট সংরক্ষণ করতে ব্যর্থ হয়েছে।');
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
        aria-labelledby="budget-modal-title"
      >
        <div className="modal-header">
          <h2 id="budget-modal-title" className="modal-title">
            {isEditing ? 'বাজেট সম্পাদনা করুন' : 'নতুন মাসিক বাজেট তৈরি করুন'}
          </h2>
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

        <form onSubmit={handleSubmit} className="modal-form">
          {errorMessage && (
            <div className="alert-banner alert-banner-danger" role="alert">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Category Selection */}
          <div className="form-group">
            <label htmlFor="budget-category-select" className="form-label">
              ব্যয় ক্যাটাগরি <span className="required-star">*</span>
            </label>
            <select
              id="budget-category-select"
              className="form-select"
              value={isCustomCategory ? '__custom__' : category}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setIsCustomCategory(true);
                  setCategory('__custom__');
                } else {
                  setIsCustomCategory(false);
                  setCategory(e.target.value);
                }
              }}
              disabled={isSubmitting}
              required
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">+ নতুন কাস্টম ক্যাটাগরি</option>
            </select>
          </div>

          {isCustomCategory && (
            <div className="form-group">
              <label htmlFor="budget-custom-category" className="form-label">
                কাস্টম ক্যাটাগরির নাম <span className="required-star">*</span>
              </label>
              <input
                id="budget-custom-category"
                type="text"
                className="form-input"
                placeholder="যেমন: জিম ও ফিটনেস"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                disabled={isSubmitting}
                maxLength={50}
                required
              />
            </div>
          )}

          {/* Budget Limit Amount */}
          <div className="form-group">
            <label htmlFor="budget-amount-input" className="form-label">
              বাজেটের সর্বোচ্চ সীমা (৳) <span className="required-star">*</span>
            </label>
            <input
              id="budget-amount-input"
              type="text"
              inputMode="decimal"
              className="form-input"
              placeholder="যেমন: ১৫০০০"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Month & Year Selectors */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="budget-month-select" className="form-label">
                মাস <span className="required-star">*</span>
              </label>
              <select
                id="budget-month-select"
                className="form-select"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                disabled={isSubmitting}
                required
              >
                {BENGALI_MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name} ({toBengaliNumeral(index + 1)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="budget-year-select" className="form-label">
                বছর <span className="required-star">*</span>
              </label>
              <select
                id="budget-year-select"
                className="form-select"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={isSubmitting}
                required
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {toBengaliNumeral(y)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Warning Threshold Slider */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label htmlFor="budget-threshold-input" className="form-label" style={{ margin: 0 }}>
                সতর্কবার্তা থ্রেশহোল্ড (Warning Threshold)
              </label>
              <span style={{ fontWeight: 600, color: 'var(--color-primary, #059669)', fontSize: '0.9rem' }}>
                {toBengaliNumeral(threshold)}%
              </span>
            </div>
            <input
              id="budget-threshold-input"
              type="range"
              min="50"
              max="95"
              step="5"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              disabled={isSubmitting}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', marginTop: '0.25rem' }}>
              ব্যয় এই সীমার ({toBengaliNumeral(threshold)}%) ওপরে গেলে সিস্টেমে সতর্কবার্তা প্রদর্শিত হবে।
            </p>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'আপডেট করুন' : 'বাজেট যুক্ত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
