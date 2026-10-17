/**
 * Personal Finance Super App - Empty State Component
 * Phase 05C - Step 3: UI Tokens, Hooks & Dashboard Components
 */

import React from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = '📂',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="empty-state-box" role="status">
      <span className="empty-state-icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="quick-action-btn btn-income-action"
          style={{ marginTop: 'var(--spacing-2)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
