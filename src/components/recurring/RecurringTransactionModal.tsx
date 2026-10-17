/**
 * Personal Finance Super App - Recurring Transaction Modal
 * Batch 4: Feature A - Recurring Transactions
 */

import React, { useEffect, useState } from 'react';
import { Account, TransactionType } from '../../types/dashboard';
import {
  RecurrenceFrequency,
  RecurringTransaction,
} from '../../types/recurringAndReconciliation';
import { formatPaisaToDecimalString, parseBDTToPaisa } from '../../utils/currency';

export interface RecurringTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: TransactionType;
    amountPaisa: bigint;
    accountId: string;
    category: string;
    note?: string;
    startDate: string;
    endDate?: string;
    frequency: RecurrenceFrequency;
    interval?: number;
  }) => Promise<void>;
  initialRecurring?: RecurringTransaction | null;
  accounts: Account[];
}

const COMMON_EXPENSE_CATEGORIES = [
  'বাড়ি ভাড়া',
  'বিদ্যুৎ বিল',
  'ইন্টারনেট বিল',
  'বাজার/মুদি',
  'চিকিৎসা',
  'শিক্ষা',
  'যাতায়াত',
  'বিনোদন',
  'বীমা প্রিমিয়াম',
  'অন্যান্য',
];

const COMMON_INCOME_CATEGORIES = [
  'বেতন',
  'ব্যবসায়িক আয়',
  'বাড়ি ভাড়া আয়',
  'ডিভিডেন্ড',
  'ফ্রিল্যান্সিং',
  'উপহার/অনুদান',
  'অন্যান্য',
];

export const RecurringTransactionModal: React.FC<RecurringTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecurring = null,
  accounts,
}) => {
  const isEditing = !!initialRecurring;

  const [name, setName] = useState<string>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [interval, setIntervalVal] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialRecurring) {
      setName(initialRecurring.name);
      setType(initialRecurring.type);
      setAmountStr(formatPaisaToDecimalString(initialRecurring.amountPaisa));
      setAccountId(initialRecurring.accountId);
      setCategory(initialRecurring.category);
      setFrequency(initialRecurring.frequency);
      setIntervalVal(initialRecurring.interval || 1);
      setStartDate(initialRecurring.startDate);
      setEndDate(initialRecurring.endDate || '');
      setNote(initialRecurring.note || '');
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setName('');
      setType('expense');
      setAmountStr('');
      setAccountId(accounts.length > 0 ? accounts[0].id : '');
      setCategory(COMMON_EXPENSE_CATEGORIES[0]);
      setFrequency('monthly');
      setIntervalVal(1);
      setStartDate(todayStr);
      setEndDate('');
      setNote('');
    }
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [isOpen, initialRecurring, accounts]);

  if (!isOpen) return null;

  const availableCategories =
    type === 'income' ? COMMON_INCOME_CATEGORIES : COMMON_EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('পুনরাবৃত্ত লেনদেনের নাম আবশ্যক।');
      return;
    }

    if (!amountStr.trim()) {
      setErrorMessage('একটি সঠিক ধনাত্মক টাকার পরিমাণ উল্লেখ করুন।');
      return;
    }

    let parsedPaisa: bigint;
    try {
      parsedPaisa = parseBDTToPaisa(amountStr);
      if (parsedPaisa <= 0n) {
        setErrorMessage('টাকার পরিমাণ শূন্যের চেয়ে বেশি হতে হবে।');
        return;
      }
    } catch {
      setErrorMessage('টাকার পরিমাণ সঠিক ফরম্যাটে লিখুন। উদাহরণ: "১০০" বা "১২৫০.৫০"');
      return;
    }

    if (!accountId) {
      setErrorMessage('দয়া করে একটি অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }

    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      setErrorMessage('ক্যাটাগরি আবশ্যক।');
      return;
    }

    if (!startDate) {
      setErrorMessage('শুরুর তারিখ নির্বাচন করুন।');
      return;
    }

    if (endDate && endDate < startDate) {
      setErrorMessage('শেষের তারিখ অবশ্যই শুরুর তারিখের পরবর্তী হতে হবে।');
      return;
    }

    if (interval < 1) {
      setErrorMessage('বিরতির ব্যবধান কমপক্ষে ১ হতে হবে।');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: trimmedName,
        type,
        amountPaisa: parsedPaisa,
        accountId,
        category: trimmedCategory,
        note: note.trim() || undefined,
        startDate,
        endDate: endDate ? endDate : undefined,
        frequency,
        interval,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'সংরক্ষণে ত্রুটি হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurring-modal-title"
    >
      <div className="modal-container">
        <header className="modal-header">
          <h2 id="recurring-modal-title" className="modal-title">
            {isEditing ? 'পুনরাবৃত্ত লেনদেন সম্পাদনা' : 'নতুন পুনরাবৃত্ত লেনদেন তৈরি'}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="বন্ধ করুন"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body" noValidate>
          {errorMessage && (
            <div className="form-error-banner" role="alert">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Type Selector (Income vs Expense) */}
          <div className="form-group">
            <label className="form-label">লেনদেনের ধরণ *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${type === 'expense' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setType('expense');
                  setCategory(COMMON_EXPENSE_CATEGORIES[0]);
                }}
              >
                − ব্যয় (Expense)
              </button>
              <button
                type="button"
                className={`btn ${type === 'income' ? 'btn-success' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setType('income');
                  setCategory(COMMON_INCOME_CATEGORIES[0]);
                }}
              >
                + আয় (Income)
              </button>
            </div>
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
              * লেজার সুরক্ষার জন্য পুনরাবৃত্ত স্থানান্তরের পরিবর্তে আয় বা ব্যয় সমর্থিত।
            </small>
          </div>

          {/* Recurring Name */}
          <div className="form-group">
            <label htmlFor="recurring-name" className="form-label">
              লেনদেনের নাম/বিবরণ *
            </label>
            <input
              id="recurring-name"
              type="text"
              className="form-input"
              placeholder="যেমন: বাড়ি ভাড়া, মাসিক বেতন, ওয়াইফাই বিল"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Amount & Account */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="recurring-amount" className="form-label">
                পরিমাণ (টাকা ৳) *
              </label>
              <input
                id="recurring-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="recurring-account" className="form-label">
                অ্যাকাউন্ট *
              </label>
              <select
                id="recurring-account"
                className="form-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                <option value="">নির্বাচন করুন</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Frequency */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="recurring-category" className="form-label">
                ক্যাটাগরি *
              </label>
              <select
                id="recurring-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="recurring-frequency" className="form-label">
                পুনরাবৃত্তির পৌনঃপুনিকতা *
              </label>
              <select
                id="recurring-frequency"
                className="form-select"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                required
              >
                <option value="daily">দৈনিক (Daily)</option>
                <option value="weekly">সাপ্তাহিক (Weekly)</option>
                <option value="monthly">মাসিক (Monthly)</option>
                <option value="yearly">বার্ষিক (Yearly)</option>
              </select>
            </div>
          </div>

          {/* Interval & Dates */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="recurring-interval" className="form-label">
                ব্যবধায়ক (Interval) *
              </label>
              <input
                id="recurring-interval"
                type="number"
                min="1"
                max="365"
                className="form-input"
                value={interval}
                onChange={(e) => setIntervalVal(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="recurring-start-date" className="form-label">
                শুরুর তারিখ *
              </label>
              <input
                id="recurring-start-date"
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="recurring-end-date" className="form-label">
                শেষের তারিখ (ঐচ্ছিক)
              </label>
              <input
                id="recurring-end-date"
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Note */}
          <div className="form-group">
            <label htmlFor="recurring-note" className="form-label">
              নোট / মন্তব্য (ঐচ্ছিক)
            </label>
            <input
              id="recurring-note"
              type="text"
              className="form-input"
              placeholder="অতিরিক্ত কোনো তথ্য"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <footer className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'আপডেট করুন' : 'তৈরি করুন'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
