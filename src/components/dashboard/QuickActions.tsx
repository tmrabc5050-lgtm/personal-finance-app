/**
 * Personal Finance Super App - Quick Actions Component
 * Phase 2B / Phase 2G - QuickActions UI Redesign & Mobile Optimization
 *
 * Modern Professional + Smart Compact Layout
 * - Unified white-surface card design system with Green/Teal accents
 * - Micro icon badges with restrained pastel tints (No clashing colors)
 * - Clear Bengali typography & visible focus indicators
 * - Touch target >= 44px with 3 equal-width actions in a single row on mobile
 */

import React from 'react';

export interface QuickActionsProps {
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onTransfer?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddExpense,
  onAddIncome,
  onTransfer,
}) => {
  return (
    <section className="quick-actions-bar" aria-label="দ্রুত আর্থিক কার্যক্রম">
      {/* 1. Add Expense Button */}
      <button
        type="button"
        className="quick-action-btn btn-expense-action"
        onClick={onAddExpense}
        aria-label="নতুন ব্যয় যুক্ত করুন"
      >
        <span className="quick-action-icon" aria-hidden="true">
          −
        </span>
        <span className="quick-action-label">ব্যয় যোগ</span>
      </button>

      {/* 2. Add Income Button */}
      <button
        type="button"
        className="quick-action-btn btn-income-action"
        onClick={onAddIncome}
        aria-label="নতুন আয় যুক্ত করুন"
      >
        <span className="quick-action-icon" aria-hidden="true">
          +
        </span>
        <span className="quick-action-label">আয় যোগ</span>
      </button>

      {/* 3. Account Transfer Button */}
      <button
        type="button"
        className="quick-action-btn btn-transfer-action"
        onClick={onTransfer}
        aria-label="অ্যাকাউন্টে টাকা স্থানান্তর করুন"
      >
        <span className="quick-action-icon" aria-hidden="true">
          ⇄
        </span>
        <span className="quick-action-label">স্থানান্তর</span>
      </button>
    </section>
  );
};

export default QuickActions;
