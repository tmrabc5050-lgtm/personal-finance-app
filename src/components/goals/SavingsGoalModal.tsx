/**
 * Personal Finance Super App - Savings Goal Create / Edit Modal
 * Batch 3: Budget Engine, Financial Reports & Savings Goals
 */

import React, { useEffect, useState } from 'react';
import { SavingsGoal } from '../../types/budgetAndGoals';
import { formatPaisaToDecimalString, parseBDTToPaisa } from '../../utils/currency';

export interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    targetAmountPaisa: bigint;
    initialSavedPaisa?: bigint;
    targetDate?: string;
    description?: string;
    category?: string;
    icon?: string;
  }) => Promise<void>;
  initialGoal?: SavingsGoal | null;
}

const GOAL_ICONS = ['🎯', '💻', '🚗', '🏠', '🏖️', '🎓', '🚑', '📱', '💍', '💼', '🎁', '✈️'];

export const SavingsGoalModal: React.FC<SavingsGoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialGoal = null,
}) => {
  const isEditing = !!initialGoal;

  const [name, setName] = useState<string>('');
  const [targetAmountStr, setTargetAmountStr] = useState<string>('');
  const [initialSavedStr, setInitialSavedStr] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState<string>('🎯');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialGoal) {
      setName(initialGoal.name);
      setTargetAmountStr(formatPaisaToDecimalString(initialGoal.targetAmountPaisa));
      const currentSaved = initialGoal.currentAmountPaisa ?? initialGoal.currentSavedPaisa ?? 0n;
      setInitialSavedStr(formatPaisaToDecimalString(currentSaved));
      setTargetDate(initialGoal.targetDate || '');
      setDescription(initialGoal.description || '');
      setSelectedIcon(initialGoal.icon || '🎯');
    } else {
      setName('');
      setTargetAmountStr('');
      setInitialSavedStr('');
      setTargetDate('');
      setDescription('');
      setSelectedIcon('🎯');
    }

    setErrorMessage(null);
  }, [isOpen, initialGoal]);

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
      setErrorMessage('সঞ্চয় লক্ষ্যের নাম আবশ্যক।');
      return;
    }

    let targetPaisa: bigint;
    try {
      targetPaisa = parseBDTToPaisa(targetAmountStr);
      if (targetPaisa <= 0n) {
        setErrorMessage('লক্ষ্যমাত্রা অবশ্যই ০-এর বেশি হতে হবে।');
        return;
      }
    } catch {
      setErrorMessage('সঠিক লক্ষ্যমাত্রার টাকার পরিমাণ লিখুন (যেমন: ৫০০০০ বা ১০০০০০)।');
      return;
    }

    let initialSavedPaisa: bigint | undefined = undefined;
    if (!isEditing && initialSavedStr.trim()) {
      try {
        initialSavedPaisa = parseBDTToPaisa(initialSavedStr);
        if (initialSavedPaisa < 0n) {
          setErrorMessage('প্রাথমিক জমার পরিমাণ ঋণাত্মক হতে পারে না।');
          return;
        }
      } catch {
        setErrorMessage('সঠিক প্রাথমিক জমার টাকার পরিমাণ লিখুন।');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: trimmedName,
        targetAmountPaisa: targetPaisa,
        initialSavedPaisa,
        targetDate: targetDate || undefined,
        description: description.trim() || undefined,
        icon: selectedIcon,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'সঞ্চয় লক্ষ্য সংরক্ষণ করতে সমস্যা হয়েছে।');
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
        aria-labelledby="savings-modal-title"
      >
        <div className="modal-header">
          <h2 id="savings-modal-title" className="modal-title">
            {isEditing ? 'সঞ্চয় লক্ষ্য সম্পাদনা' : 'নতুন সঞ্চয় লক্ষ্য তৈরি করুন'}
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

          {/* Goal Icon Selector */}
          <div className="form-group">
            <label className="form-label">আইকন নির্বাচন করুন</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {GOAL_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  style={{
                    fontSize: '1.5rem',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: selectedIcon === icon ? '2px solid var(--color-primary, #10b981)' : '1px solid var(--color-border, #e5e7eb)',
                    background: selectedIcon === icon ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-card-bg, #ffffff)',
                    cursor: 'pointer',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Name */}
          <div className="form-group">
            <label htmlFor="goal-name-input" className="form-label">
              লক্ষ্যের নাম <span className="required-star">*</span>
            </label>
            <input
              id="goal-name-input"
              type="text"
              className="form-input"
              placeholder="যেমন: ইমার্জেন্সি ফান্ড, নতুন ল্যাপটপ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              maxLength={60}
              required
            />
          </div>

          {/* Target Amount */}
          <div className="form-group">
            <label htmlFor="goal-target-input" className="form-label">
              লক্ষ্যমাত্রা পরিমাণ (৳) <span className="required-star">*</span>
            </label>
            <input
              id="goal-target-input"
              type="text"
              inputMode="decimal"
              className="form-input"
              placeholder="যেমন: ৫০,০০০"
              value={targetAmountStr}
              onChange={(e) => setTargetAmountStr(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Initial Saved Amount (only on create) */}
          {!isEditing && (
            <div className="form-group">
              <label htmlFor="goal-initial-saved-input" className="form-label">
                প্রাথমিক সঞ্চিত পরিমাণ (৳, ঐচ্ছিক)
              </label>
              <input
                id="goal-initial-saved-input"
                type="text"
                inputMode="decimal"
                className="form-input"
                placeholder="যেমন: ৫,০০০ (না থাকলে খালি রাখুন)"
                value={initialSavedStr}
                onChange={(e) => setInitialSavedStr(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Target Date */}
          <div className="form-group">
            <label htmlFor="goal-target-date-input" className="form-label">
              লক্ষ্যমাত্রা অর্জনের তারিখ (ঐচ্ছিক)
            </label>
            <input
              id="goal-target-date-input"
              type="date"
              className="form-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="goal-description-input" className="form-label">
              বিবরণ (ঐচ্ছিক)
            </label>
            <textarea
              id="goal-description-input"
              className="form-textarea"
              placeholder="এই সঞ্চয় লক্ষ্য সম্পর্কে কোনো সংক্ষিপ্ত নোট"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={2}
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
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'আপডেট করুন' : 'লক্ষ্য তৈরি করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
