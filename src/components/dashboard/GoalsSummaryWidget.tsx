/**
 * Personal Finance Super App - Savings Goals Summary Widget
 * Batch 4: Feature B - Customizable Dashboard Widget
 */

import React, { useEffect, useState } from 'react';
import { SavingsGoal } from '../../types/budgetAndGoals';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';

export interface GoalsSummaryWidgetProps {
  getSavingsGoals: () => Promise<SavingsGoal[]>;
  isBalanceHidden: boolean;
  onViewAllGoals?: () => void;
}

export const GoalsSummaryWidget: React.FC<GoalsSummaryWidgetProps> = ({
  getSavingsGoals,
  isBalanceHidden,
  onViewAllGoals,
}) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getSavingsGoals()
      .then((res) => {
        if (mounted) setGoals(res);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [getSavingsGoals]);

  if (isLoading) {
    return (
      <div className="dashboard-card" style={{ padding: '16px' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>সঞ্চয় লক্ষ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="dashboard-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>🎯 সঞ্চয় লক্ষ্য</h3>
          {onViewAllGoals && (
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={onViewAllGoals}
              style={{ padding: 0, fontSize: '0.85rem' }}
            >
              লক্ষ্য দেখুন →
            </button>
          )}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          এখনও কোনো সঞ্চয় লক্ষ্য তৈরি করা হয়নি।
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>🎯 সঞ্চয় লক্ষ্য অগ্রগতি</h3>
        {onViewAllGoals && (
          <button
            type="button"
            className="btn btn-sm btn-link"
            onClick={onViewAllGoals}
            style={{ padding: 0, fontSize: '0.85rem', color: 'var(--color-primary)' }}
          >
            সব দেখুন →
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {goals.slice(0, 3).map((goal) => {
          const saved = goal.currentAmountPaisa ?? goal.currentSavedPaisa ?? 0n;
          const percent = goal.targetAmountPaisa > 0n
            ? Number((saved * 100n) / goal.targetAmountPaisa)
            : 0;

          return (
            <div key={goal.id} style={{ fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontWeight: 500 }}>
                  <span style={{ marginRight: '4px' }}>{goal.icon || '🎯'}</span>
                  {goal.name}
                </span>
                <span style={{ fontWeight: 600, color: percent >= 100 ? '#10b981' : 'var(--color-text)' }}>
                  {toBengaliNumeral(Math.min(100, Math.round(percent)))}%
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, percent)}%`,
                    backgroundColor: percent >= 100 ? '#10b981' : '#3b82f6',
                    borderRadius: '3px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                <span>সঞ্চিত: {isBalanceHidden ? '••••••' : formatPaisaToBDT(saved)}</span>
                <span>লক্ষ্য: {isBalanceHidden ? '••••••' : formatPaisaToBDT(goal.targetAmountPaisa)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
