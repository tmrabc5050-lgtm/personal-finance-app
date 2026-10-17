/**
 * Personal Finance Super App - Savings Goal Contribution Modal (Deposit / Withdrawal)
 * Batch 3: Budget Engine, Financial Reports & Savings Goals
 */

import React, { useEffect, useState } from 'react';
import { GoalContributionType, SavingsGoal } from '../../types/budgetAndGoals';
import { formatPaisaToBDT, parseBDTToPaisa } from '../../utils/currency';

export interface GoalContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  defaultType?: GoalContributionType;
  onSave: (data: {
    goalId: string;
    amountPaisa: bigint;
    type: GoalContributionType;
    note?: string;
    date?: string;
  }) => Promise<void>;
}

export const GoalContributionModal: React.FC<GoalContributionModalProps> = ({
  isOpen,
  onClose,
  goal,
  defaultType = 'deposit',
  onSave,
}) => {
  const [type, setType] = useState<GoalContributionType>(defaultType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !goal) return;
    setType(defaultType);
    setAmountStr('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setErrorMessage(null);
  }, [isOpen, goal, defaultType]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !goal) return null;

  const currentSaved = goal.currentAmountPaisa ?? goal.currentSavedPaisa ?? 0n;
  const isWithdrawal = type === 'withdrawal' || type === 'withdraw';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let amountPaisa: bigint;
    try {
      amountPaisa = parseBDTToPaisa(amountStr);
      if (amountPaisa <= 0n) {
        setErrorMessage('টাকার পরিমাণ অবশ্যই ০-এর বেশি হতে হবে।');
        return;
      }
    } catch {
      setErrorMessage('সঠিক টাকার পরিমাণ লিখুন (যেমন: ১০০০ বা ৫০০০)।');
      return;
    }

    if (isWithdrawal && amountPaisa > currentSaved) {
      setErrorMessage(
        `উত্তোলনের পরিমাণ (${formatPaisaToBDT(amountPaisa)}) বর্তমান সঞ্চিত তহবিলের (${formatPaisaToBDT(currentSaved)}) চেয়ে বেশি হতে পারে না।`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        goalId: goal.id,
        amountPaisa,
        type: isWithdrawal ? 'withdrawal' : 'deposit',
        note: note.trim() || undefined,
        date: date || new Date().toISOString().split('T')[0],
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'লেনদেন সম্পন্ন করতে সমস্যা হয়েছে।');
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
        aria-labelledby="goal-contribution-title"
      >
        <div className="modal-header">
          <h2 id="goal-contribution-title" className="modal-title">
            {goal.icon} {isWithdrawal ? 'সঞ্চয় থেকে উত্তোলন' : 'সঞ্চয় জমা করুন'}
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

          {/* Target Info Header */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'var(--color-bg-secondary, #f3f4f6)',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            <div>
              লক্ষ্য: <strong>{goal.name}</strong>
            </div>
            <div style={{ marginTop: '0.25rem', color: 'var(--color-text-secondary, #4b5563)' }}>
              বর্তমান সঞ্চয়: <strong>{formatPaisaToBDT(currentSaved)}</strong> / লক্ষ্য: {formatPaisaToBDT(goal.targetAmountPaisa)}
            </div>
          </div>

          {/* Action Type Toggle */}
          <div className="form-group">
            <label className="form-label">লেনদেনের ধরন</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${!isWithdrawal ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setType('deposit')}
                style={{ justifyContent: 'center' }}
              >
                + সঞ্চয় জমা (Deposit)
              </button>
              <button
                type="button"
                className={`btn ${isWithdrawal ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setType('withdrawal')}
                style={{ justifyContent: 'center' }}
              >
                - উত্তোলন (Withdraw)
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="form-group">
            <label htmlFor="contrib-amount-input" className="form-label">
              টাকার পরিমাণ (৳) <span className="required-star">*</span>
            </label>
            <input
              id="contrib-amount-input"
              type="text"
              inputMode="decimal"
              className="form-input"
              placeholder="যেমন: ২০০০"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="contrib-date-input" className="form-label">
              তারিখ <span className="required-star">*</span>
            </label>
            <input
              id="contrib-date-input"
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Note */}
          <div className="form-group">
            <label htmlFor="contrib-note-input" className="form-label">
              মন্তব্য / বিবরণ (ঐচ্ছিক)
            </label>
            <input
              id="contrib-note-input"
              type="text"
              className="form-input"
              placeholder="যেমন: এই মাসের উদ্বৃত্ত অংশ"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
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
              {isSubmitting
                ? 'সংরক্ষণ হচ্ছে...'
                : isWithdrawal
                ? 'উত্তোলন নিশ্চিত করুন'
                : 'জমা নিশ্চিত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
