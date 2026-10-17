/**
 * Personal Finance Super App - Generate Due Transactions Modal
 * Batch 4: Feature A - Recurring Transactions
 *
 * Explicit confirmation preview modal before generating financial entries into the ledger.
 */

import React, { useState } from 'react';
import { GenerateDuePreview, GenerateDueResult } from '../../types/recurringAndReconciliation';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { formatBengaliDate } from '../../utils/date';

export interface GenerateDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: GenerateDuePreview | null;
  onConfirmGenerate: () => Promise<GenerateDueResult>;
  onSuccess: (result: GenerateDueResult) => void;
  isBalanceHidden?: boolean;
}

export const GenerateDueModal: React.FC<GenerateDueModalProps> = ({
  isOpen,
  onClose,
  preview,
  onConfirmGenerate,
  onSuccess,
  isBalanceHidden = false,
}) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !preview) return null;

  const handleConfirm = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await onConfirmGenerate();
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লেনদেন তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasDue = preview.totalCount > 0;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-due-title"
    >
      <div className="modal-container" style={{ maxWidth: '620px' }}>
        <header className="modal-header">
          <h2 id="generate-due-title" className="modal-title">
            🔄 বকেয়া লেনদেন তৈরি নিশ্চিতকরণ
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

        <div className="modal-body">
          {error && (
            <div className="form-error-banner" role="alert">
              ⚠️ {error}
            </div>
          )}

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-surface-hover, #f8fafc)',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid var(--color-border, #e2e8f0)',
            }}
          >
            <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--color-text, #1e293b)' }}>
              আজকের তারিখ পর্যন্ত যে সমস্ত পুনরাবৃত্ত লেনদেনের সময়সীমা উত্তীর্ণ হয়েছে, তা লেজারে স্থায়ীভাবে যুক্ত করার পূর্বরূপ:
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>মোট লেনদেন</span>
                <p style={{ margin: '4px 0 0', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {toBengaliNumeral(preview.totalCount)} টি
                </p>
              </div>

              <div
                style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--color-income, #16a34a)' }}>মোট আয়</span>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    color: 'var(--color-income, #16a34a)',
                  }}
                >
                  {isBalanceHidden ? '••••••' : formatPaisaToBDT(preview.totalIncomePaisa)}
                </p>
              </div>

              <div
                style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--color-expense, #dc2626)' }}>মোট ব্যয়</span>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    color: 'var(--color-expense, #dc2626)',
                  }}
                >
                  {isBalanceHidden ? '••••••' : formatPaisaToBDT(preview.totalExpensePaisa)}
                </p>
              </div>
            </div>
          </div>

          {hasDue ? (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>
                প্রস্তাবিত লেনদেন তালিকা ({toBengaliNumeral(preview.dueOccurrences.length)}টি):
              </h3>
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: '6px',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface-hover, #f8fafc)', borderBottom: '1px solid var(--color-border, #e2e8f0)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>তারিখ</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>বিবরণ</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>ক্যাটাগরি</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.dueOccurrences.map((occ, idx) => (
                      <tr
                        key={`${occ.recurringId}_${occ.dueDate}_${idx}`}
                        style={{ borderBottom: '1px solid var(--color-border, #e2e8f0)' }}
                      >
                        <td style={{ padding: '8px' }}>{formatBengaliDate(occ.dueDate)}</td>
                        <td style={{ padding: '8px', fontWeight: 500 }}>{occ.recurringName}</td>
                        <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>{occ.category}</td>
                        <td
                          style={{
                            padding: '8px',
                            textAlign: 'right',
                            fontWeight: 'bold',
                            color:
                              occ.type === 'income'
                                ? 'var(--color-income, #16a34a)'
                                : 'var(--color-expense, #dc2626)',
                          }}
                        >
                          {occ.type === 'income' ? '+' : '-'}
                          {isBalanceHidden ? '••••••' : formatPaisaToBDT(occ.amountPaisa)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '10px',
                }}
              >
                🔒 সুরক্ষা নিশ্চয়তা: আইডিমপোটেন্সি কি দিয়ে ডুপ্লিকেট প্রতিরোধ করা হয় এবং হিসাবের পর্যাপ্ত ব্যালেন্স যাচাই করা হয়।
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>✅</span>
              <p style={{ margin: 0 }}>কোনো বকেয়া পুনরাবৃত্ত লেনদেন নেই! সব সময়সূচি হালনাগাদ রয়েছে।</p>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isGenerating}
          >
            {hasDue ? 'বাতিল' : 'ঠিক আছে'}
          </button>
          {hasDue && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={isGenerating}
            >
              {isGenerating ? 'লেনদেন তৈরি হচ্ছে...' : 'হ্যাঁ, লেনদেনগুলো তৈরি করুন'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
