/**
 * Personal Finance Super App - Budget Summary Widget
 * Batch 4: Feature B - Customizable Dashboard Widget
 */

import React, { useEffect, useState } from 'react';
import { MonthlyBudgetSummary } from '../../types/budgetAndGoals';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';

export interface BudgetSummaryWidgetProps {
  getMonthlyBudgetProgress: (year: number, month: number) => Promise<MonthlyBudgetSummary>;
  year: number;
  month: number;
  isBalanceHidden: boolean;
  onViewAllBudgets?: () => void;
}

export const BudgetSummaryWidget: React.FC<BudgetSummaryWidgetProps> = ({
  getMonthlyBudgetProgress,
  year,
  month,
  isBalanceHidden,
  onViewAllBudgets,
}) => {
  const [summary, setSummary] = useState<MonthlyBudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getMonthlyBudgetProgress(year, month)
      .then((res) => {
        if (mounted) setSummary(res);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [getMonthlyBudgetProgress, year, month]);

  if (isLoading) {
    return (
      <div className="dashboard-card" style={{ padding: '16px' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>বাজেট সারাংশ লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="dashboard-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>📋 মাসিক বাজেট স্থিতি</h3>
          {onViewAllBudgets && (
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={onViewAllBudgets}
              style={{ padding: 0, fontSize: '0.85rem' }}
            >
              বাজেট দেখুন →
            </button>
          )}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          এই মাসে কোনো বাজেট নির্ধারণ করা হয়নি।
        </p>
      </div>
    );
  }

  const percentUsed = summary.totalBudgetPaisa > 0n
    ? Number((summary.totalSpentPaisa * 100n) / summary.totalBudgetPaisa)
    : 0;

  return (
    <div className="dashboard-card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>📋 মাসিক বাজেট স্থিতি</h3>
        {onViewAllBudgets && (
          <button
            type="button"
            className="btn btn-sm btn-link"
            onClick={onViewAllBudgets}
            style={{ padding: 0, fontSize: '0.85rem', color: 'var(--color-primary)' }}
          >
            সব দেখুন →
          </button>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
          <span>মোট খরচ: {isBalanceHidden ? '••••••' : formatPaisaToBDT(summary.totalSpentPaisa)}</span>
          <span style={{ fontWeight: 600 }}>
            {toBengaliNumeral(Math.min(100, Math.round(percentUsed)))}%
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, percentUsed)}%`,
              backgroundColor: percentUsed > 100 ? '#ef4444' : percentUsed > 80 ? '#f59e0b' : '#10b981',
              borderRadius: '4px',
            }}
          />
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          সীমা: {isBalanceHidden ? '••••••' : formatPaisaToBDT(summary.totalBudgetPaisa)}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {summary.items.slice(0, 3).map((item) => {
          const itemPercent = item.budget.amountPaisa > 0n
            ? Number((item.spentPaisa * 100n) / item.budget.amountPaisa)
            : 0;
          const isExceeded = item.status === 'exceeded';
          const isWarning = item.status === 'warning';

          return (
            <div key={item.budget.id} style={{ fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ fontWeight: 500 }}>{item.budget.category}</span>
                <span style={{ color: isExceeded ? '#dc2626' : 'var(--color-text-muted)' }}>
                  {isBalanceHidden ? '••••••' : formatPaisaToBDT(item.spentPaisa)} / {isBalanceHidden ? '••••••' : formatPaisaToBDT(item.budget.amountPaisa)}
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, itemPercent)}%`,
                    backgroundColor: isExceeded ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
