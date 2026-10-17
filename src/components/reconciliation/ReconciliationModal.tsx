/**
 * Personal Finance Super App - Account Reconciliation Modal
 * Batch 4: Feature C - Account Reconciliation
 */

import React, { useEffect, useState } from 'react';
import { Account, Transaction } from '../../types/dashboard';
import { AccountReconciliation } from '../../types/recurringAndReconciliation';
import { formatPaisaToBDT, parseBDTToPaisa, toBengaliNumeral } from '../../utils/currency';
import { formatBengaliDate } from '../../utils/date';

export interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onCalculateHistoricalBalance: (
    accountId: string,
    statementDate: string
  ) => Promise<{
    appBalancePaisa: bigint;
    transactionsCount: number;
    statementTransactions: Transaction[];
  }>;
  onSaveReconciliation: (data: {
    accountId: string;
    statementDate: string;
    statementBalancePaisa: bigint;
    notes?: string;
  }) => Promise<AccountReconciliation>;
  onSuccess: (rec: AccountReconciliation) => void;
  isBalanceHidden?: boolean;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onCalculateHistoricalBalance,
  onSaveReconciliation,
  onSuccess,
  isBalanceHidden = false,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [statementDate, setStatementDate] = useState<string>('');
  const [statementBalanceStr, setStatementBalanceStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculatedData, setCalculatedData] = useState<{
    appBalancePaisa: bigint;
    transactionsCount: number;
    statementTransactions: Transaction[];
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedAccountId(accounts.length > 0 ? accounts[0].id : '');
    setStatementDate(todayStr);
    setStatementBalanceStr('');
    setNotes('');
    setCalculatedData(null);
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [isOpen, accounts]);

  // Recalculate historical balance when account or date changes
  useEffect(() => {
    if (!isOpen || !selectedAccountId || !statementDate) return;

    let mounted = true;
    setIsCalculating(true);
    setErrorMessage(null);

    onCalculateHistoricalBalance(selectedAccountId, statementDate)
      .then((res) => {
        if (mounted) {
          setCalculatedData(res);
        }
      })
      .catch((err) => {
        if (mounted) {
          setErrorMessage(err instanceof Error ? err.message : 'ঐতিহাসিক ব্যালেন্স গণনায় ত্রুটি।');
        }
      })
      .finally(() => {
        if (mounted) setIsCalculating(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, selectedAccountId, statementDate, onCalculateHistoricalBalance]);

  if (!isOpen) return null;

  let parsedStatementPaisa: bigint | null = null;
  let differencePaisa: bigint | null = null;

  if (statementBalanceStr.trim() !== '') {
    try {
      parsedStatementPaisa = parseBDTToPaisa(statementBalanceStr);
      if (calculatedData) {
        differencePaisa = parsedStatementPaisa - calculatedData.appBalancePaisa;
      }
    } catch {
      // ignore parsing error while typing
    }
  }

  const isMatched = differencePaisa !== null && differencePaisa === 0n;
  const hasDiscrepancy = differencePaisa !== null && differencePaisa !== 0n;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedAccountId) {
      setErrorMessage('একটি অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }

    if (!statementDate) {
      setErrorMessage('স্টেটমেন্টের তারিখ আবশ্যক।');
      return;
    }

    if (parsedStatementPaisa === null) {
      setErrorMessage('সঠিক স্টেটমেন্ট ব্যালেন্স উল্লেখ করুন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const rec = await onSaveReconciliation({
        accountId: selectedAccountId,
        statementDate,
        statementBalancePaisa: parsedStatementPaisa,
        notes: notes.trim() || undefined,
      });
      onSuccess(rec);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'রিকনসিলিয়েশন সংরক্ষণে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconciliation-modal-title"
    >
      <div className="modal-container" style={{ maxWidth: '640px' }}>
        <header className="modal-header">
          <h2 id="reconciliation-modal-title" className="modal-title">
            ⚖️ নতুন অ্যাকাউন্ট রিকনসিলিয়েশন (মিলকরণ)
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

          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            ব্যাংক বা মোবাইল ওয়ালেটের স্টেটমেন্টের সাথে অ্যাপের লেজার ব্যালেন্সের নিখুঁত তুলনা করুন।
          </p>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="rec-account" className="form-label">
                অ্যাকাউন্ট নির্বাচন করুন *
              </label>
              <select
                id="rec-account"
                className="form-select"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="rec-date" className="form-label">
                স্টেটমেন্টের তারিখ *
              </label>
              <input
                id="rec-date"
                type="date"
                className="form-input"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rec-statement-balance" className="form-label">
              স্টেটমেন্ট ব্যালেন্স (টাকা ৳) *
            </label>
            <input
              id="rec-statement-balance"
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0.00 (যেমন: ব্যাংক বিবরণীর সমাপনী স্থিতি)"
              value={statementBalanceStr}
              onChange={(e) => setStatementBalanceStr(e.target.value)}
              required
            />
          </div>

          {/* Balance Comparison Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-surface-hover, #f8fafc)',
              borderRadius: '8px',
              border: '1px solid var(--color-border, #e2e8f0)',
              margin: '16px 0',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  অ্যাপ লেজার ব্যালেন্স ({statementDate ? formatBengaliDate(statementDate) : 'তারিখ'})
                </span>
                <p style={{ margin: '4px 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {isCalculating ? (
                    'গণনা হচ্ছে...'
                  ) : calculatedData ? (
                    isBalanceHidden ? '••••••' : formatPaisaToBDT(calculatedData.appBalancePaisa)
                  ) : (
                    '—'
                  )}
                </p>
                {calculatedData && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    ({toBengaliNumeral(calculatedData.transactionsCount)}টি লেনদেন)
                  </span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>স্টেটমেন্ট ব্যালেন্স</span>
                <p style={{ margin: '4px 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {parsedStatementPaisa !== null ? (
                    isBalanceHidden ? '••••••' : formatPaisaToBDT(parsedStatementPaisa)
                  ) : (
                    '—'
                  )}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>পার্থক্য (Difference)</span>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    color: isMatched
                      ? 'var(--color-income, #16a34a)'
                      : hasDiscrepancy
                      ? 'var(--color-expense, #dc2626)'
                      : 'var(--color-text)',
                  }}
                >
                  {differencePaisa !== null ? (
                    isBalanceHidden
                      ? '••••••'
                      : `${differencePaisa > 0n ? '+' : ''}${formatPaisaToBDT(differencePaisa)}`
                  ) : (
                    '—'
                  )}
                </p>
                {isMatched && <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>✅ সম্পূর্ণ মিলেছে</span>}
                {hasDiscrepancy && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>⚠️ গরমিল রয়েছে</span>}
              </div>
            </div>
          </div>

          {/* Transactions Review preview */}
          {calculatedData && calculatedData.statementTransactions.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  তারিখ পর্যন্ত লেনদেন পর্যালোচনা ({toBengaliNumeral(calculatedData.statementTransactions.length)}টি):
                </span>
              </div>
              <div
                style={{
                  maxHeight: '130px',
                  overflowY: 'auto',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {calculatedData.statementTransactions.slice(0, 10).map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px' }}>{formatBengaliDate(tx.date)}</td>
                        <td style={{ padding: '6px 8px' }}>{tx.category}</td>
                        <td
                          style={{
                            padding: '6px 8px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: tx.type === 'income' ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {isBalanceHidden ? '••••••' : formatPaisaToBDT(tx.amountPaisa)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="rec-notes" className="form-label">
              রিকনসিলিয়েশন নোট / মন্তব্য (ঐচ্ছিক)
            </label>
            <input
              id="rec-notes"
              type="text"
              className="form-input"
              placeholder="যেমন: অক্টোবর ২০২৬ ব্যাংক বিবরণীর সাথে মিলকরণ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              disabled={isSubmitting || parsedStatementPaisa === null}
            >
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'রিকনসিলিয়েশন সংরক্ষণ করুন'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
