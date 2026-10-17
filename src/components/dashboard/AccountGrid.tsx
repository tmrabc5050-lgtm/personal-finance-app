/**
 * Personal Finance Super App - Account Grid Component
 * Phase 2C - AccountGrid UI Redesign
 *
 * Modern Professional + Smart Compact Layout
 * - Crisp white surface with subtle wallet accent strip
 * - 2-Column Desktop Grid with balanced 2x2 alignment
 * - Restrained typography and high-contrast BDT balances
 * - Full privacy masking and zero floating-point arithmetic
 */

import React from 'react';
import { Account, AccountType } from '../../types/dashboard';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';

export interface AccountGridProps {
  accounts: Account[];
  isBalanceHidden?: boolean;
  isLoading?: boolean;
  onAddAccount?: () => void;
  onEditAccount?: (account: Account) => void;
  onViewAllWallets?: () => void;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'নগদ',
  bkash: 'বিকাশ',
  nagad: 'নগদ',
  bank: 'ব্যাংক',
  other: 'অন্যান্য',
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash: '💵',
  bkash: '📱',
  nagad: '📱',
  bank: '🏦',
  other: '💳',
};

const ACCOUNT_ACCENTS: Record<AccountType, { text: string; bg: string; border: string }> = {
  cash: { text: 'var(--color-wallet-cash)', bg: 'var(--color-wallet-cash-bg)', border: '#a7f3d0' },
  bkash: { text: 'var(--color-wallet-bkash)', bg: 'var(--color-wallet-bkash-bg)', border: '#fbcfe8' },
  nagad: { text: 'var(--color-wallet-nagad)', bg: 'var(--color-wallet-nagad-bg)', border: '#fed7aa' },
  bank: { text: 'var(--color-wallet-bank)', bg: 'var(--color-wallet-bank-bg)', border: '#bae6fd' },
  other: { text: 'var(--color-wallet-other)', bg: 'var(--color-wallet-other-bg)', border: '#c7d2fe' },
};

export const AccountGrid: React.FC<AccountGridProps> = ({
  accounts,
  isBalanceHidden = false,
  isLoading = false,
  onAddAccount,
  onEditAccount,
  onViewAllWallets,
}) => {
  if (isLoading) {
    return (
      <section className="dash-card" aria-label="অ্যাকাউন্ট তালিকা লোড হচ্ছে">
        <div className="card-header-row">
          <Skeleton height="1.125rem" width="40%" />
        </div>
        <div
          className="account-grid-list"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
        >
          <Skeleton height="4.5rem" />
          <Skeleton height="4.5rem" />
          <Skeleton height="4.5rem" />
          <Skeleton height="4.5rem" />
        </div>
      </section>
    );
  }

  const maskedBalance = '••••••';

  return (
    <section className="dash-card" aria-labelledby="accounts-section-title">
      <div className="card-header-row">
        <div>
          <h2 id="accounts-section-title" className="card-title">
            অ্যাকাউন্ট ও ওয়ালেট
          </h2>
          <span className="card-subtitle">
            {toBengaliNumeral(accounts.length)}টি সক্রিয় হিসাব
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onViewAllWallets && (
            <button
              type="button"
              className="btn-card-action"
              onClick={onViewAllWallets}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                borderColor: 'rgba(56, 189, 248, 0.25)',
              }}
              aria-label="সব ওয়ালেট দেখুন"
            >
              👛 সব ওয়ালেট →
            </button>
          )}
          {onAddAccount && (
            <button
              type="button"
              className="btn-card-action"
              onClick={onAddAccount}
              aria-label="নতুন অ্যাকাউন্ট যোগ করুন"
            >
              + অ্যাকাউন্ট যোগ
            </button>
          )}
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon="💳"
          title="কোনো অ্যাকাউন্ট পাওয়া যায়নি"
          description="আপনার হাতে থাকা নগদ বা মোবাইল ওয়ালেট যুক্ত করে ব্যালেন্স ট্র্যাকিং শুরু করুন।"
        />
      ) : (
        <div
          className="account-grid-list"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
        >
          {accounts.map((account) => {
            const accent = ACCOUNT_ACCENTS[account.type] || ACCOUNT_ACCENTS.other;
            const icon = ACCOUNT_TYPE_ICONS[account.type] || '💳';
            const displayBalance = isBalanceHidden
              ? maskedBalance
              : formatPaisaToBDT(account.balancePaisa);

            return (
              <article
                key={account.id}
                className="account-card-item"
                style={{
                  borderLeft: `3px solid ${accent.text}`,
                  padding: 'var(--spacing-3)',
                }}
              >
                {/* Top Row: Icon + Type Badge + Masked Number */}
                <div className="account-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span aria-hidden="true" style={{ fontSize: '0.875rem', lineHeight: 1 }}>
                      {icon}
                    </span>
                    <span
                      className="account-type-badge"
                      style={{
                        backgroundColor: accent.bg,
                        color: accent.text,
                        border: `1px solid ${accent.border}`,
                      }}
                    >
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {account.accountNumberMasked && (
                      <span className="account-mask">{account.accountNumberMasked}</span>
                    )}
                    {onEditAccount && (
                      <button
                        type="button"
                        className="tx-action-btn"
                        onClick={() => onEditAccount(account)}
                        aria-label={`${account.name} সম্পাদনা করুন`}
                        title="অ্যাকাউন্ট সম্পাদনা"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <h3 className="account-name" title={account.name}>
                    {account.name}
                  </h3>
                </div>

                {/* Account Balance */}
                <div className="account-balance-val" aria-live="polite">
                  {displayBalance}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AccountGrid;
