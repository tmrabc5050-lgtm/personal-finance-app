/**
 * Personal Finance Super App - Reusable Accessible Confirmation Dialog
 * Batch 1: Core Finance Engine Implementation
 */

import React, { useEffect } from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'নিশ্চিত করুন',
  cancelLabel = 'বাতিল',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal-container confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-warning-icon" aria-hidden="true">
              ⚠️
            </span>
            <h2 id="confirm-dialog-title" className="modal-title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            aria-label="সতর্কবার্তা বন্ধ করুন"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <p id="confirm-dialog-desc" className="confirm-dialog-message">
            {message}
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-modal-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDestructive ? 'btn-modal-destructive' : 'btn-modal-primary'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'অপেক্ষা করুন...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
