/**
 * Personal Finance Super App - Dashboard Customizer Modal
 * Batch 4: Feature B - Customizable Dashboard
 *
 * Allows users to toggle widget visibility, reorder via Move Up / Move Down buttons,
 * and reset to defaults with confirmation.
 */

import React, { useState } from 'react';
import {
  DashboardPreferences,
  DashboardWidgetConfig,
} from '../../types/recurringAndReconciliation';

export interface DashboardCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: DashboardPreferences;
  onSavePreferences: (prefs: DashboardPreferences) => Promise<void>;
  onResetPreferences: () => Promise<void>;
}

export const DashboardCustomizerModal: React.FC<DashboardCustomizerModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  onResetPreferences,
}) => {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>([...preferences.widgets]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Sync state if modal opens
  React.useEffect(() => {
    if (isOpen) {
      setWidgets([...preferences.widgets].sort((a, b) => a.order - b.order));
      setShowResetConfirm(false);
    }
  }, [isOpen, preferences]);

  if (!isOpen) return null;

  const handleToggleVisibility = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setWidgets((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((w, idx) => ({ ...w, order: idx + 1 }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= widgets.length - 1) return;
    setWidgets((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((w, idx) => ({ ...w, order: idx + 1 }));
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSavePreferences({
        widgets: widgets.map((w, idx) => ({ ...w, order: idx + 1 })),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await onResetPreferences();
      setShowResetConfirm(false);
      onClose();
    } catch (err) {
      console.error('Failed to reset preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-customizer-title"
    >
      <div className="modal-container" style={{ maxWidth: '580px' }}>
        <header className="modal-header">
          <h2 id="dashboard-customizer-title" className="modal-title">
            ⚙️ ড্যাশবোর্ড কাস্টমাইজ করুন
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="বন্ধ করুন"
          >
            ✕
          </button>
        </header>

        <div className="modal-body">
          <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            আপনার প্রয়োজন অনুযায়ী ড্যাশবোর্ডের উইজেট প্রদর্শন বা লুকান এবং উপরে-নিচে নিয়ে পছন্দমতো সাজান:
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '360px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {widgets.map((widget, idx) => (
              <div
                key={widget.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: widget.visible
                    ? 'var(--color-surface, #ffffff)'
                    : 'var(--color-surface-hover, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  opacity: widget.visible ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    id={`toggle_${widget.id}`}
                    checked={widget.visible}
                    onChange={() => handleToggleVisibility(widget.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor={`toggle_${widget.id}`}
                    style={{
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      color: 'var(--color-text)',
                    }}
                  >
                    {widget.labelBengali}
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    title="উপরে নিন"
                  >
                    ▲ উপরে
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === widgets.length - 1}
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    title="নিচে নিন"
                  >
                    ▼ নিচে
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showResetConfirm && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#991b1b',
              }}
            >
              <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
                ⚠️ আপনি কি নিশ্চিত যে ড্যাশবোর্ড ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান?
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowResetConfirm(false)}
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  হ্যাঁ, রিসেট করুন
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {!showResetConfirm && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowResetConfirm(true)}
                disabled={isSaving}
                style={{ color: '#dc2626' }}
              >
                🔄 ডিফল্ট করুন
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              বাতিল
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
