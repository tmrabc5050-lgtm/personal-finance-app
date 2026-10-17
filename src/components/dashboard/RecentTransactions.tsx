/**
 * Personal Finance Super App - Recent Transactions Component
 * Phase 2D - RecentTransactions UI Redesign
 *
 * Modern Professional + Smart Compact Layout
 * - Crisp row hierarchy: Title, category pill, relative date & account
 * - Fintech-grade SVG icons for income, expense & transfer
 * - Clean right-aligned monetary values with guaranteed no-wrap
 * - Balanced spacing, hover feedback, and strict mobile responsiveness
 * - Preserved BigInt paisa arithmetic and full privacy masking
 */

import React from 'react';
import { Account, Transaction, TransactionType } from '../../types/dashboard';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { formatRelativeBengaliDate } from '../../utils/date';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';

export interface RecentTransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  isBalanceHidden?: boolean;
  isLoading?: boolean;
  onViewAll?: () => void;
  onAddNewTransaction?: () => void;
  onEditTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (tx: Transaction) => void;
}

interface TypeMeta {
  icon: React.ReactNode;
  amountPrefix: string;
  iconClass: string;
  amountClass: string;
  color: string;
  bg: string;
  border: string;
}

const TX_TYPE_META: Record<TransactionType, TypeMeta> = {
  income: {
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="17" y1="7" x2="7" y2="17" />
        <polyline points="17 17 7 17 7 7" />
      </svg>
    ),
    amountPrefix: '+',
    iconClass: 'tx-icon-income',
    amountClass: 'tx-amount-income',
    color: 'var(--color-income-text)',
    bg: 'var(--color-income-bg)',
    border: '#a7f3d0',
  },
  expense: {
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    ),
    amountPrefix: '-',
    iconClass: 'tx-icon-expense',
    amountClass: 'tx-amount-expense',
    color: 'var(--color-expense-text)',
    bg: 'var(--color-expense-bg)',
    border: '#fecdd3',
  },
  transfer: {
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 3l4 4-4 4" />
        <path d="M20 7H4" />
        <path d="M8 21l-4-4 4-4" />
        <path d="M4 17h16" />
      </svg>
    ),
    amountPrefix: '',
    iconClass: 'tx-icon-transfer',
    amountClass: 'tx-amount-transfer',
    color: 'var(--color-transfer-text)',
    bg: 'var(--color-transfer-bg)',
    border: '#99f6e4',
  },
};

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  accounts,
  isBalanceHidden = false,
  isLoading = false,
  onViewAll,
  onAddNewTransaction,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  if (isLoading) {
    return (
      <section className="dash-card" aria-label="সাম্প্রতিক লেনদেন লোড হচ্ছে">
        <div className="card-header-row">
          <Skeleton height="1.25rem" width="35%" />
          <Skeleton height="1rem" width="15%" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Skeleton height="3.25rem" />
          <Skeleton height="3.25rem" />
          <Skeleton height="3.25rem" />
          <Skeleton height="3.25rem" />
        </div>
      </section>
    );
  }

  const accountMap = new Map<string, string>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc.name);
  }

  const maskedAmount = '••••••';

  return (
    <section className="dash-card" aria-labelledby="recent-tx-title">
      <div className="card-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 id="recent-tx-title" className="card-title">
            সাম্প্রতিক লেনদেন
          </h2>
          {transactions.length > 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-700)',
                fontWeight: 600,
              }}
            >
              {toBengaliNumeral(transactions.length)}টি
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onAddNewTransaction && (
            <button
              type="button"
              onClick={onAddNewTransaction}
              className="btn-card-action"
              aria-label="নতুন লেনদেন যুক্ত করুন"
            >
              + লেনদেন
            </button>
          )}
          <button
            type="button"
            onClick={onViewAll}
            className="card-subtitle"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--color-primary-600)',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.8125rem',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.textDecoration = 'none';
            }}
          >
            সব দেখুন →
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon="📝"
          title="কোনো সাম্প্রতিক লেনদেন নেই"
          description="আপনার প্রথম আয় বা ব্যয় যুক্ত করে লেনদেনের ইতিহাস তৈরি করুন।"
        />
      ) : (
        <div className="tx-list" role="list">
          {transactions.map((tx, idx) => {
            const isTransfer = tx.type === 'transfer';
            const meta = TX_TYPE_META[tx.type] || TX_TYPE_META.expense;

            const accountName = accountMap.get(tx.accountId) || 'অজানা হিসাব';
            const destAccountName = tx.destinationAccountId
              ? accountMap.get(tx.destinationAccountId) || 'অন্য হিসাব'
              : '';

            let subtext = `${formatRelativeBengaliDate(tx.date)} • ${accountName}`;
            if (isTransfer && destAccountName) {
              subtext = `${formatRelativeBengaliDate(tx.date)} • ${accountName} → ${destAccountName}`;
            }

            const primaryTitle = tx.note || tx.category || 'লেনদেন';

            const formattedAmount = isBalanceHidden
              ? maskedAmount
              : `${meta.amountPrefix}${formatPaisaToBDT(tx.amountPaisa, {
                  showSymbol: true,
                })}`;

            const formattedFee =
              isTransfer && tx.transferFeePaisa && tx.transferFeePaisa > 0n
                ? isBalanceHidden
                  ? maskedAmount
                  : formatPaisaToBDT(tx.transferFeePaisa)
                : null;

            const isLast = idx === transactions.length - 1;

            return (
              <div
                key={tx.id}
                className="tx-row"
                role="listitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.375rem',
                  borderRadius: 'var(--radius-sm)',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                  gap: 'var(--spacing-2)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-app)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Left details with icon & text */}
                <div
                  className="tx-left"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    minWidth: 0,
                    flex: '1 1 auto',
                  }}
                >
                  <div
                    className={`tx-icon-badge ${meta.iconClass}`}
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: `1px solid ${meta.border}`,
                      backgroundColor: meta.bg,
                      color: meta.color,
                    }}
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </div>

                  <div
                    className="tx-details"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      overflow: 'hidden',
                      gap: '2px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: 0,
                      }}
                    >
                      <span
                        className="tx-category"
                        title={primaryTitle}
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {primaryTitle}
                      </span>
                      {tx.category && tx.note && tx.note !== tx.category && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            backgroundColor: 'var(--bg-app)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-muted)',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {tx.category}
                        </span>
                      )}
                    </div>

                    <span
                      className="tx-subtext"
                      title={subtext}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {subtext}
                    </span>
                  </div>
                </div>

                {/* Right monetary display */}
                <div
                  className="tx-right"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    textAlign: 'right',
                    flexShrink: 0,
                    minWidth: 'fit-content',
                    paddingLeft: 'var(--spacing-2)',
                  }}
                >
                  <span
                    className={`tx-amount ${meta.amountClass}`}
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      letterSpacing: isBalanceHidden ? '0.12em' : 'normal',
                      whiteSpace: 'nowrap',
                    }}
                    aria-live="polite"
                  >
                    {formattedAmount}
                  </span>
                  {formattedFee ? (
                    <span
                      className="tx-fee-note"
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--color-expense-text)',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                      }}
                      aria-live="polite"
                    >
                      ফি: {formattedFee}
                    </span>
                  ) : null}

                  {/* Actions for editing and deleting */}
                  {(onEditTransaction || onDeleteTransaction) && (
                    <div className="tx-row-actions" style={{ marginTop: '3px' }}>
                      {onEditTransaction && (
                        <button
                          type="button"
                          className="tx-action-btn"
                          onClick={() => onEditTransaction(tx)}
                          aria-label={`${primaryTitle} সম্পাদনা করুন`}
                          title="সম্পাদনা"
                        >
                          ✏️
                        </button>
                      )}
                      {onDeleteTransaction && (
                        <button
                          type="button"
                          className="tx-action-btn"
                          onClick={() => onDeleteTransaction(tx)}
                          aria-label={`${primaryTitle} মুছে ফেলুন`}
                          title="মুছে ফেলুন"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RecentTransactions;
