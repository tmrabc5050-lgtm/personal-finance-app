/**
 * Personal Finance Super App - Local Data Migration Modal
 * 
 * Complies with Master Rule #7:
 * - Prompts the user upon sign in if local IndexedDB data exists.
 * - Clear choices:
 *   1. Import existing local data into this user's cloud workspace.
 *   2. Start with a clean cloud workspace and keep local data untouched.
 * - Automatically generates a downloadable JSON backup BEFORE importing.
 * - Scopes all entities to authenticated user_id.
 * - Fully styled with standard Vanilla CSS tokens (no broken Tailwind utilities).
 */

import React, { useState } from 'react';
import {
  MigrationSummary,
  executeLocalToCloudMigration,
} from '../../services/migrationService';
import { SupabaseStorageEngine } from '../../services/supabaseStorageEngine';
import { toBengaliNumeral } from '../../utils/currency';

export interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  localSummary: MigrationSummary;
  cloudEngine: SupabaseStorageEngine;
  onMigrationComplete: (importedSummary: MigrationSummary) => void;
  onKeepClean: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  localSummary,
  cloudEngine,
  onMigrationComplete,
  onKeepClean,
}) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backupDownloadUrl, setBackupDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartImport = async () => {
    setIsMigrating(true);
    setErrorMsg(null);

    const result = await executeLocalToCloudMigration(userId, cloudEngine);
    setIsMigrating(false);

    if (result.success) {
      if (result.backupBlobUrl) {
        setBackupDownloadUrl(result.backupBlobUrl);
      }
      onMigrationComplete(result.importedCounts);
    } else {
      setErrorMsg(result.errorMessage || 'ক্লাউডে ডেটা স্থানান্তরে সমস্যা হয়েছে।');
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMigrating) onClose();
      }}
    >
      <div
        className="modal-container"
        style={{ maxWidth: '520px', width: '92%' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-modal-title"
      >
        {/* Header */}
        <div className="modal-header" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                style={{ width: '24px', height: '24px' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <h2 id="migration-modal-title" className="modal-title" style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>
                লোকাল ডেটা ক্লাউডে স্থানান্তর করবেন?
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted, #64748b)' }}>
                অ্যাকাউন্ট: <strong style={{ color: 'var(--color-text-main, #1e293b)' }}>{userEmail}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isMigrating}
            aria-label="উইন্ডো বন্ধ করুন"
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--color-text-muted, #475569)' }}>
            আপনার ব্রাউজারে ইতিমধ্যে কিছু পূর্ববর্তী আর্থিক তথ্য সংরক্ষিত রয়েছে। আপনি কি এই তথ্যগুলো আপনার বর্তমান ক্লাউড অ্যাকাউন্টে আপলোড করে সিঙ্ক করতে চান?
          </p>

          {/* Local Data Stats Breakdown */}
          <div
            style={{
              padding: '0.875rem 1rem',
              borderRadius: '12px',
              backgroundColor: 'var(--color-card-bg-subtle, #f8fafc)',
              border: '1px solid var(--color-border-subtle, #e2e8f0)',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.625rem',
              fontSize: '0.825rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>অ্যাকাউন্ট:</span>{' '}
              <strong style={{ color: 'var(--color-text-main, #0f172a)' }}>
                {toBengaliNumeral(localSummary.accountsCount)} টি
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>লেনদেন:</span>{' '}
              <strong style={{ color: 'var(--color-text-main, #0f172a)' }}>
                {toBengaliNumeral(localSummary.transactionsCount)} টি
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>বাজেট:</span>{' '}
              <strong style={{ color: 'var(--color-text-main, #0f172a)' }}>
                {toBengaliNumeral(localSummary.budgetsCount)} টি
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>সঞ্চয় লক্ষ্য:</span>{' '}
              <strong style={{ color: 'var(--color-text-main, #0f172a)' }}>
                {toBengaliNumeral(localSummary.goalsCount)} টি
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>পুনরাবৃত্ত লেনদেন:</span>{' '}
              <strong style={{ color: 'var(--color-text-main, #0f172a)' }}>
                {toBengaliNumeral(localSummary.recurringCount)} টি
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>রিকনসিলিয়েশন:</span>{' '}
              <strong style={{ color: 'var(--color-text-main, #0f172a)' }}>
                {toBengaliNumeral(localSummary.reconciliationsCount)} টি
              </strong>
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.8rem',
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🛡️</span>
            <span>
              <strong>নিরাপত্তা গ্যারান্টি:</strong> মাইগ্রেশনের পূর্বে একটি স্বয়ংক্রিয় ব্যাকআপ তৈরি হবে। আপনার লোকাল ডাটা সম্পূর্ণ অক্ষত থাকবে।
            </span>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.825rem',
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {backupDownloadUrl && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                fontSize: '0.825rem',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>প্রাক-মাইগ্রেশন ব্যাকআপ ফাইল প্রস্তুত:</span>
              <a
                href={backupDownloadUrl}
                download={`pre_migration_backup_${new Date().toISOString().slice(0, 10)}.json`}
                style={{
                  padding: '0.35rem 0.75rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                }}
              >
                ডাউনলোড
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onKeepClean}
            disabled={isMigrating}
            className="btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.625rem 1rem' }}
          >
            না, লোকাল ডেটা ছাড়া শুরু করুন
          </button>

          <button
            type="button"
            onClick={handleStartImport}
            disabled={isMigrating}
            className="btn-primary"
            style={{
              fontSize: '0.85rem',
              padding: '0.625rem 1.25rem',
              backgroundColor: '#059669',
              borderColor: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {isMigrating ? (
              <span>মাইগ্রেশন হচ্ছে...</span>
            ) : (
              <>
                <span>☁️</span>
                <span>হ্যাঁ, ক্লাউডে স্থানান্তর করুন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
