/**
 * Personal Finance Super App - Balance Hero Component
 * Phase 2A - BalanceHero Component Redesign
 *
 * Modern Professional + Smart Compact Layout
 * - Prominent Net Balance presentation
 * - 3-Card Balanced KPI Layout (Income, Expense, Net Savings)
 * - Restrained, elegant highlight for Net Savings
 * - Full privacy masking support via isBalanceHidden
 */

import React from 'react';
import { formatPaisaToBDT, subtractPaisa } from '../../utils/currency';
import { Skeleton } from '../common/Skeleton';

export interface BalanceHeroProps {
  totalNetBalancePaisa: bigint;
  totalIncomePaisa: bigint;
  totalExpensePaisa: bigint;
  netSavingsPaisa?: bigint;
  isBalanceHidden: boolean;
  onToggleVisibility: () => void;
  isLoading?: boolean;
}

export const BalanceHero: React.FC<BalanceHeroProps> = ({
  totalNetBalancePaisa,
  totalIncomePaisa,
  totalExpensePaisa,
  netSavingsPaisa,
  isBalanceHidden,
  onToggleVisibility,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <section className="balance-hero-card" aria-label="মোট ব্যালেন্স ও আর্থিক সারাংশ লোড হচ্ছে">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-2)' }}>
          <Skeleton height="0.875rem" width="28%" />
          <Skeleton height="1.5rem" width="4rem" borderRadius="var(--radius-full)" />
        </div>
        <div style={{ marginBottom: 'var(--spacing-3)' }}>
          <Skeleton height="2rem" width="55%" />
        </div>
        <div
          className="monthly-flow-row"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}
        >
          <Skeleton height="3.5rem" />
          <Skeleton height="3.5rem" />
          <Skeleton height="3.5rem" />
        </div>
      </section>
    );
  }

  // Safe integer calculation for savings if not explicitly passed
  const savingsPaisa =
    netSavingsPaisa !== undefined
      ? netSavingsPaisa
      : subtractPaisa(totalIncomePaisa, totalExpensePaisa);

  const isSavingsPositive = savingsPaisa >= 0n;
  const maskedAmount = '••••••';

  const displayBalance = isBalanceHidden
    ? maskedAmount
    : formatPaisaToBDT(totalNetBalancePaisa);

  const displayIncome = isBalanceHidden
    ? maskedAmount
    : formatPaisaToBDT(totalIncomePaisa, { showSign: true });

  const displayExpense = isBalanceHidden
    ? maskedAmount
    : formatPaisaToBDT(totalExpensePaisa, { showSign: true });

  const displaySavings = isBalanceHidden
    ? maskedAmount
    : formatPaisaToBDT(savingsPaisa, { showSign: true });

  return (
    <section className="balance-hero-card" aria-labelledby="balance-hero-title">
      {/* Top Header Row: Label & Privacy Button */}
      <div className="balance-hero-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
          <span className="balance-hero-label" id="balance-hero-title">
            সর্বমোট সম্পদ (মোট ব্যালেন্স)
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleVisibility}
          className="privacy-toggle-btn"
          aria-label={isBalanceHidden ? 'ব্যালেন্স প্রদর্শন করুন' : 'ব্যালেন্স গোপন রাখুন'}
          title={isBalanceHidden ? 'ব্যালেন্স দেখুন' : 'ব্যালেন্স লুকান'}
        >
          <span aria-hidden="true">{isBalanceHidden ? '👁️' : '🔒'}</span>
          <span>{isBalanceHidden ? 'দেখান' : 'লুকান'}</span>
        </button>
      </div>

      {/* Prominent Balance Amount */}
      <div className="balance-hero-amount" aria-live="polite">
        {displayBalance}
      </div>

      {/* Balanced 3-KPI Monthly Cash Flow Grid (Income, Expense, Net Savings) */}
      <div
        className="monthly-flow-row"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}
      >
        {/* KPI 1: Income */}
        <div className="flow-chip flow-chip-income">
          <span className="flow-chip-label">
            <span aria-hidden="true">↓</span> এই মাসের আয়
          </span>
          <span className="flow-chip-amount" aria-live="polite">
            {displayIncome}
          </span>
        </div>

        {/* KPI 2: Expense */}
        <div className="flow-chip flow-chip-expense">
          <span className="flow-chip-label">
            <span aria-hidden="true">↑</span> এই মাসের ব্যয়
          </span>
          <span className="flow-chip-amount" aria-live="polite">
            {displayExpense}
          </span>
        </div>

        {/* KPI 3: Net Savings (Specially highlighted in controlled emerald green) */}
        <div
          className="flow-chip"
          style={{
            backgroundColor: isSavingsPositive ? 'var(--color-savings-bg)' : 'var(--color-expense-bg)',
            borderColor: isSavingsPositive ? 'var(--color-savings-border)' : 'var(--color-expense-border)',
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
        >
          <span
            className="flow-chip-label"
            style={{
              color: isSavingsPositive ? 'var(--color-savings-text)' : 'var(--color-expense-text)',
            }}
          >
            <span aria-hidden="true">{isSavingsPositive ? '★' : '⚠'}</span> এই মাসের সঞ্চয়
          </span>
          <span
            className="flow-chip-amount"
            style={{
              color: isSavingsPositive ? 'var(--color-savings-text)' : 'var(--color-expense-text)',
            }}
            aria-live="polite"
          >
            {displaySavings}
          </span>
        </div>
      </div>
    </section>
  );
};

export default BalanceHero;
