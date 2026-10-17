/**
 * Personal Finance Super App - Monthly Cash Flow Chart Component
 * Phase 2E - MonthlyChart UI Redesign
 *
 * Modern Professional + Smart Compact Layout
 * - White + Green/Teal professional theme with restrained color palette
 * - Clear comparative horizontal bar visual with zero-value safety
 * - Prominent Net Savings / Deficit indicator with optional savings rate
 * - Full privacy masking support when isBalanceHidden is active
 * - Responsive layout across Desktop, Tablet, and Mobile
 */

import React from 'react';
import { MonthlySummary } from '../../types/dashboard';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { getBengaliMonthYear } from '../../utils/date';
import { Skeleton } from '../common/Skeleton';

export interface MonthlyChartProps {
  summary: MonthlySummary | null;
  isBalanceHidden?: boolean;
  isLoading?: boolean;
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({
  summary,
  isBalanceHidden = false,
  isLoading = false,
}) => {
  if (isLoading || !summary) {
    return (
      <section className="dash-card" aria-label="মাসিক আয়-ব্যয় চার্ট লোড হচ্ছে">
        <div className="card-header-row">
          <Skeleton height="1.25rem" width="45%" />
          <Skeleton height="0.875rem" width="20%" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Skeleton height="2.25rem" />
          <Skeleton height="2.25rem" />
          <Skeleton height="2.75rem" />
        </div>
      </section>
    );
  }

  const { year, month, totalIncomePaisa, totalExpensePaisa, netSavingsPaisa } = summary;
  const monthName = getBengaliMonthYear(year, month);

  // BigInt-safe relative width calculation
  const maxPaisa =
    totalIncomePaisa > totalExpensePaisa ? totalIncomePaisa : totalExpensePaisa;

  // Zero-value bar logic: strictly '0%' when 0; minimum 4% only when positive to avoid invisible dots
  const incomeBarWidth =
    maxPaisa > 0n && totalIncomePaisa > 0n
      ? `${Math.max(4, Math.min(100, Number((totalIncomePaisa * 100n) / maxPaisa)))}%`
      : '0%';

  const expenseBarWidth =
    maxPaisa > 0n && totalExpensePaisa > 0n
      ? `${Math.max(4, Math.min(100, Number((totalExpensePaisa * 100n) / maxPaisa)))}%`
      : '0%';

  const isNetPositive = netSavingsPaisa >= 0n;
  const maskedAmount = '••••••';

  const displayIncome = isBalanceHidden ? maskedAmount : formatPaisaToBDT(totalIncomePaisa);
  const displayExpense = isBalanceHidden ? maskedAmount : formatPaisaToBDT(totalExpensePaisa);
  const displaySavings = isBalanceHidden
    ? maskedAmount
    : formatPaisaToBDT(netSavingsPaisa, { showSign: true });

  // Ratio calculations: omitted completely in privacy mode to prevent proportional data leakage
  const expenseRatioText =
    !isBalanceHidden && totalIncomePaisa > 0n && totalExpensePaisa > 0n
      ? `আয়ের ${toBengaliNumeral(Math.round(Number((totalExpensePaisa * 100n) / totalIncomePaisa)))}%`
      : null;

  const savingsRateText =
    !isBalanceHidden && totalIncomePaisa > 0n && isNetPositive && netSavingsPaisa > 0n
      ? `${toBengaliNumeral(Math.round(Number((netSavingsPaisa * 100n) / totalIncomePaisa)))}% সঞ্চয় হার`
      : null;

  return (
    <section className="dash-card" aria-labelledby="monthly-chart-title">
      <div className="card-header-row">
        <div>
          <h2 id="monthly-chart-title" className="card-title">
            আয় বনাম ব্যয়
          </h2>
          <span className="card-subtitle">{monthName} মাসের ক্যাশ ফ্লো</span>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          মাসিক তুলনা
        </span>
      </div>

      <div
        className="chart-container"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
      >
        {/* Income Bar Group */}
        <div className="chart-bar-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            className="chart-bar-meta"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#059669',
                  display: 'inline-block',
                }}
                aria-hidden="true"
              />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>মোট আয়</span>
            </div>
            <span
              style={{
                fontWeight: 700,
                color: 'var(--color-income-text)',
                letterSpacing: isBalanceHidden ? '0.12em' : 'normal',
                whiteSpace: 'nowrap',
              }}
              aria-live="polite"
            >
              {displayIncome}
            </span>
          </div>
          <div
            className="chart-bar-track"
            style={{
              height: '0.625rem',
              backgroundColor: 'var(--color-neutral-100)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              position: 'relative',
            }}
            aria-hidden="true"
          >
            <div
              className="chart-bar-fill-income"
              style={{
                width: incomeBarWidth,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #059669)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease-out',
              }}
            />
          </div>
        </div>

        {/* Expense Bar Group */}
        <div className="chart-bar-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            className="chart-bar-meta"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#e11d48',
                  display: 'inline-block',
                }}
                aria-hidden="true"
              />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>মোট ব্যয়</span>
              {expenseRatioText && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                  }}
                >
                  ({expenseRatioText})
                </span>
              )}
            </div>
            <span
              style={{
                fontWeight: 700,
                color: 'var(--color-expense-text)',
                letterSpacing: isBalanceHidden ? '0.12em' : 'normal',
                whiteSpace: 'nowrap',
              }}
              aria-live="polite"
            >
              {displayExpense}
            </span>
          </div>
          <div
            className="chart-bar-track"
            style={{
              height: '0.625rem',
              backgroundColor: 'var(--color-neutral-100)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              position: 'relative',
            }}
            aria-hidden="true"
          >
            <div
              className="chart-bar-fill-expense"
              style={{
                width: expenseBarWidth,
                height: '100%',
                background: 'linear-gradient(90deg, #f87171, #e11d48)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease-out',
              }}
            />
          </div>
        </div>

        {/* Net Savings / Deficit Summary Box */}
        <div
          className="chart-summary-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.625rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isNetPositive ? 'var(--color-savings-bg)' : 'var(--color-expense-bg)',
            border: `1px solid ${isNetPositive ? 'rgba(13, 148, 136, 0.2)' : 'rgba(225, 29, 72, 0.2)'}`,
            marginTop: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1 }} aria-hidden="true">
              {isNetPositive ? '🎯' : '⚠️'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isNetPositive ? 'var(--color-savings-text)' : 'var(--color-expense-text)',
                }}
              >
                {isNetPositive ? 'নিট সঞ্চয়' : 'মাসিক ঘাটতি'}
              </span>
              {savingsRateText && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                  }}
                >
                  ({savingsRateText})
                </span>
              )}
            </div>
          </div>

          <span
            className="net-savings-tag"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: isNetPositive ? 'var(--color-savings-text)' : 'var(--color-expense-text)',
              letterSpacing: isBalanceHidden ? '0.12em' : 'normal',
              whiteSpace: 'nowrap',
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

export default MonthlyChart;
