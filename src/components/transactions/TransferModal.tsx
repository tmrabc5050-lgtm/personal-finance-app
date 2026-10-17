/**
 * Personal Finance Super App - Account-to-Account Transfer Modal
 * Batch 2: Transfer Engine & Financial History
 *
 * Implements a complete, validated transfer workflow:
 * - Select distinct source and destination accounts.
 * - Enter transfer amount and optional transfer fee.
 * - Live balance indicator and insufficient balance warning.
 * - Preserves BigInt paisa arithmetic and Bengali feedback.
 */

import React, { useEffect, useState } from 'react';
import { Account, Transaction } from '../../types/dashboard';
import {
  formatPaisaToBDT,
  formatPaisaToDecimalString,
  parseBDTToPaisa,
} from '../../utils/currency';

export interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    type: 'transfer';
    amountPaisa: bigint;
    accountId: string;
    destinationAccountId: string;
    transferFeePaisa?: bigint;
    category: string;
    note?: string;
    date: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  accounts: Account[];
  initialTransfer?: Transaction | null;
  defaultYear?: number;
  defaultMonth?: number;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  accounts,
  initialTransfer,
  defaultYear = 2026,
  defaultMonth = 10,
}) => {
  const isEditing = Boolean(initialTransfer);

  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [feeStr, setFeeStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);
      return;
    }

    if (initialTransfer && initialTransfer.type === 'transfer') {
      setFromAccountId(initialTransfer.accountId);
      setToAccountId(initialTransfer.destinationAccountId || '');
      setAmountStr(formatPaisaToDecimalString(initialTransfer.amountPaisa));
      setFeeStr(
        initialTransfer.transferFeePaisa !== undefined && initialTransfer.transferFeePaisa > 0n
          ? formatPaisaToDecimalString(initialTransfer.transferFeePaisa)
          : ''
      );
      setNote(initialTransfer.note || '');
      setDate(initialTransfer.date);
    } else {
      // Pick first two distinct accounts if available
      const from = accounts.length > 0 ? accounts[0].id : '';
      const to = accounts.length > 1 ? accounts[1].id : '';
      setFromAccountId(from);
      setToAccountId(to);
      setAmountStr('');
      setFeeStr('');
      setNote('');

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
  }, [isOpen, initialTransfer, accounts, defaultYear, defaultMonth]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sourceAccount = accounts.find((a) => a.id === fromAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validate accounts
    if (!fromAccountId) {
      setErrorMessage('উৎস অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }
    if (!toAccountId) {
      setErrorMessage('গন্তব্য অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }
    if (fromAccountId === toAccountId) {
      setErrorMessage('উৎস এবং গন্তব্য অ্যাকাউন্ট ভিন্ন হতে হবে।');
      return;
    }

    // 2. Validate amount
    let paisaAmount: bigint;
    try {
      paisaAmount = parseBDTToPaisa(amountStr);
      if (paisaAmount <= 0n) {
        setErrorMessage('স্থানান্তরের পরিমাণ অবশ্যই ০-এর বেশি হতে হবে।');
        return;
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'সঠিক টাকার পরিমাণ দিন (যেমন: ১০০০ বা ৫০০০.৫০)'
      );
      return;
    }

    // 3. Validate fee
    let feePaisa: bigint | undefined = undefined;
    if (feeStr.trim()) {
      try {
        feePaisa = parseBDTToPaisa(feeStr);
        if (feePaisa < 0n) {
          setErrorMessage('ট্রান্সফার ফি ঋণাত্মক হতে পারে না।');
          return;
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'সঠিক ফি এর পরিমাণ দিন।');
        return;
      }
    }

    // 4. Validate source balance if creating new transfer
    if (!isEditing && sourceAccount) {
      const totalRequired = feePaisa ? paisaAmount + feePaisa : paisaAmount;
      if (sourceAccount.balancePaisa < totalRequired) {
        setErrorMessage(
          `অপর্যাপ্ত ব্যালেন্স: "${sourceAccount.name}" অ্যাকাউন্টে পর্যাপ্ত টাকা নেই (প্রয়োজন ৳ ${formatPaisaToDecimalString(
            totalRequired
          )}, বর্তমান ব্যালেন্স ৳ ${formatPaisaToDecimalString(sourceAccount.balancePaisa)})`
        );
        return;
      }
    }

    // 5. Validate date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErrorMessage('সঠিক তারিখ নির্বাচন করুন (YYYY-MM-DD)।');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        type: 'transfer',
        amountPaisa: paisaAmount,
        accountId: fromAccountId,
        destinationAccountId: toAccountId,
        transferFeePaisa: feePaisa && feePaisa > 0n ? feePaisa : undefined,
        category: 'টাকা স্থানান্তর',
        note: note.trim() || undefined,
        date,
      });
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'স্থানান্তর সম্পন্ন করতে সমস্যা হয়েছে।'
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
        aria-labelledby="transfer-modal-title"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>
              🔄
            </span>
            <h2 id="transfer-modal-title" className="modal-title">
              {isEditing ? 'স্থানান্তর সম্পাদনা' : 'অ্যাকাউন্টে টাকা স্থানান্তর'}
            </h2>
          </div>
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

            {/* Source Account (From) */}
            <div className="form-group">
              <label htmlFor="transfer-from-select" className="form-label">
                উৎস হিসাব (যেখান থেকে টাকা যাবে) <span className="required-star">*</span>
              </label>
              <select
                id="transfer-from-select"
                className="form-select"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                required
                disabled={isSubmitting || accounts.length === 0}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (বর্তমান ব্যালেন্স: {formatPaisaToBDT(acc.balancePaisa)})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Account (To) */}
            <div className="form-group">
              <label htmlFor="transfer-to-select" className="form-label">
                গন্তব্য হিসাব (যেখানে টাকা জমা হবে) <span className="required-star">*</span>
              </label>
              <select
                id="transfer-to-select"
                className="form-select"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
                disabled={isSubmitting || accounts.length === 0}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                    {acc.name} {acc.id === fromAccountId ? '(উৎস হিসাব)' : `(ব্যালেন্স: ${formatPaisaToBDT(acc.balancePaisa)})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer Amount */}
            <div className="form-group">
              <label htmlFor="transfer-amount-input" className="form-label">
                স্থানান্তরের পরিমাণ (BDT) <span className="required-star">*</span>
              </label>
              <div className="amount-input-wrap">
                <span className="currency-symbol-addon" aria-hidden="true">
                  ৳
                </span>
                <input
                  id="transfer-amount-input"
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
              <span className="form-hint">যেমন: ১০০০ বা ৫০০০</span>
            </div>

            {/* Transfer Fee */}
            <div className="form-group">
              <label htmlFor="transfer-fee-input" className="form-label">
                ট্রান্সফার ফি / সার্ভিস চার্জ (ঐচ্ছিক)
              </label>
              <div className="amount-input-wrap">
                <span className="currency-symbol-addon" aria-hidden="true">
                  ৳
                </span>
                <input
                  id="transfer-fee-input"
                  type="text"
                  inputMode="decimal"
                  className="form-input amount-field"
                  placeholder="০.০০"
                  value={feeStr}
                  onChange={(e) => setFeeStr(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <span className="form-hint">
                নোট: মূল টাকা স্থানান্তর আয় বা ব্যয় হিসেবে গণনা হবে না; কেবল ফি ব্যয়ের অন্তর্ভুক্ত হবে।
              </span>
            </div>

            {/* Date Input */}
            <div className="form-group">
              <label htmlFor="transfer-date-input" className="form-label">
                তারিখ <span className="required-star">*</span>
              </label>
              <input
                id="transfer-date-input"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Note */}
            <div className="form-group">
              <label htmlFor="transfer-note-input" className="form-label">
                বিবরণ / নোট (ঐচ্ছিক)
              </label>
              <input
                id="transfer-note-input"
                type="text"
                className="form-input"
                placeholder="যেমন: ব্যাংক থেকে বিকাশে ক্যাশ-ইন"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="modal-footer">
            {isEditing && onDelete && (
              <button
                type="button"
                className="btn-modal-destructive"
                onClick={() => {
                  if (initialTransfer) {
                    onDelete(initialTransfer.id);
                  }
                }}
                disabled={isSubmitting}
              >
                🗑️ স্থানান্তর বাতিল
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
                className="btn-modal-primary"
                style={{ backgroundColor: 'var(--color-transfer)' }}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'প্রক্রিয়াধীন...'
                  : isEditing
                  ? 'হালনাগাদ করুন'
                  : 'স্থানান্তর সম্পন্ন করুন'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
