/**
 * Personal Finance Super App - Goal Contribution History Modal
 * Batch 3: Budget Engine, Financial Reports & Savings Goals
 */

import React, { useEffect, useState } from 'react';
import { GoalContribution, SavingsGoal } from '../../types/budgetAndGoals';
import { formatPaisaToBDT } from '../../utils/currency';
import { formatBengaliDate } from '../../utils/date';

export interface GoalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  getGoalContributions: (goalId: string) => Promise<GoalContribution[]>;
}

export const GoalHistoryModal: React.FC<GoalHistoryModalProps> = ({
  isOpen,
  onClose,
  goal,
  getGoalContributions,
}) => {
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !goal) return;
    setIsLoading(true);
    getGoalContributions(goal.id)
      .then((data) => setContributions(data))
      .catch(() => setContributions([]))
      .finally(() => setIsLoading(false));
  }, [isOpen, goal, getGoalContributions]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !goal) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-history-title"
        style={{ maxWidth: '520px' }}
      >
        <div className="modal-header">
          <h2 id="goal-history-title" className="modal-title">
            {goal.icon} {goal.name} — জমার বিবরণী
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="উইন্ডো বন্ধ করুন"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '1rem 0', maxHeight: '60vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-secondary, #6b7280)' }}>
              বিবরণী লোড হচ্ছে...
            </div>
          ) : contributions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-secondary, #6b7280)' }}>
              এই লক্ষ্যে এখনো কোনো জমার বা উত্তোলনের রেকর্ড নেই।
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {contributions.map((c) => {
                const isDeposit = c.type === 'deposit';
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border, #e5e7eb)',
                      background: 'var(--color-bg-secondary, #f9fafb)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span
                          className={`status-badge ${isDeposit ? 'status-badge-success' : 'status-badge-danger'}`}
                          style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                        >
                          {isDeposit ? 'জমা' : 'উত্তোলন'}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #4b5563)' }}>
                          {formatBengaliDate(c.date)}
                        </span>
                      </div>
                      {c.note && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary, #111827)' }}>
                          {c.note}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: isDeposit ? 'var(--color-primary, #10b981)' : 'var(--color-danger, #ef4444)',
                      }}
                    >
                      {isDeposit ? '+' : '-'}{formatPaisaToBDT(c.amountPaisa)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
