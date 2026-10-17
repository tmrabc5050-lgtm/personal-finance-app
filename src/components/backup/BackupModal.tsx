/**
 * Personal Finance Super App - Backup & Restore Modal
 * Batch 2: Transfer Engine, Transaction History, Search, Filters & Backup
 *
 * Provides:
 * - 1-Click CSV export with Bengali UTF-8 BOM
 * - 1-Click versioned JSON backup download
 * - Safe JSON restore with deep validation, data preview, and explicit confirmation
 */

import React, { useState, useRef } from 'react';
import { Account, Transaction } from '../../types/dashboard';
import { Budget, GoalContribution, SavingsGoal } from '../../types/budgetAndGoals';
import {
  downloadCSV,
  downloadJSONBackup,
  generateTransactionsCSV,
  generateJSONBackup,
  validateBackupData,
  BackupValidationResult,
} from '../../services/backupService';
import { persistentFinanceService } from '../../services/persistentFinanceService';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';

import {
  RecurringTransaction,
  DashboardPreferences,
  AccountReconciliation,
} from '../../types/recurringAndReconciliation';

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  transactions: Transaction[];
  onRestore: (
    accounts: Account[],
    transactions: Transaction[],
    budgets?: Budget[],
    savingsGoals?: SavingsGoal[],
    goalContributions?: GoalContribution[],
    recurringTransactions?: RecurringTransaction[],
    dashboardPreferences?: DashboardPreferences,
    accountReconciliations?: AccountReconciliation[]
  ) => Promise<void>;
  onSuccessMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  accounts,
  transactions,
  onRestore,
  onSuccessMessage,
  onErrorMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'restore'>('export');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    try {
      const csv = generateTransactionsCSV(transactions, accounts);
      downloadCSV(csv);
      onSuccessMessage('সফল: লেনদেনের ইতিহাস CSV হিসেবে ডাউনলোড শুরু হয়েছে!');
    } catch (err) {
      onErrorMessage(err instanceof Error ? err.message : 'CSV তৈরিতে সমস্যা হয়েছে।');
    }
  };

  const handleExportJSON = async () => {
    try {
      const budgets = await persistentFinanceService.getBudgets();
      const goals = await persistentFinanceService.getSavingsGoals();
      const contribs = await persistentFinanceService.getGoalContributions();
      const recurring = await persistentFinanceService.getRecurringTransactions();
      const prefs = await persistentFinanceService.getDashboardPreferences();
      const reconciliations = await persistentFinanceService.getAccountReconciliations();
      const json = generateJSONBackup(
        accounts,
        transactions,
        budgets,
        goals,
        contribs,
        recurring,
        prefs,
        reconciliations
      );
      downloadJSONBackup(json);
      onSuccessMessage('সফল: সম্পূর্ণ ডেটা ব্যাকআপ (JSON v3.0) ডাউনলোড হয়েছে!');
    } catch (err) {
      onErrorMessage(err instanceof Error ? err.message : 'ব্যাকআপ তৈরিতে সমস্যা হয়েছে।');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setValidationResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const result = validateBackupData(content);
        setValidationResult(result);
      }
    };
    reader.onerror = () => {
      setValidationResult({
        isValid: false,
        errors: ['ফাইলটি পড়তে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'],
      });
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!validationResult || !validationResult.isValid || !validationResult.preview) {
      return;
    }

    setIsRestoring(true);
    try {
      await onRestore(
        validationResult.preview.accounts,
        validationResult.preview.transactions,
        validationResult.preview.budgets,
        validationResult.preview.savingsGoals,
        validationResult.preview.goalContributions,
        validationResult.preview.recurringTransactions,
        validationResult.preview.dashboardPreferences,
        validationResult.preview.accountReconciliations
      );
      onSuccessMessage(
        `সফল: ${toBengaliNumeral(validationResult.preview.accountCount)}টি অ্যাকাউন্ট, ${toBengaliNumeral(
          validationResult.preview.transactionCount
        )}টি লেনদেন${
          validationResult.preview.budgetCount
            ? `, ${toBengaliNumeral(validationResult.preview.budgetCount)}টি বাজেট`
            : ''
        }${
          validationResult.preview.savingsGoalCount
            ? `, ${toBengaliNumeral(validationResult.preview.savingsGoalCount)}টি সঞ্চয় লক্ষ্য`
            : ''
        }${
          validationResult.preview.recurringCount
            ? `, ${toBengaliNumeral(validationResult.preview.recurringCount)}টি পুনরাবৃত্ত লেনদেন`
            : ''
        }${
          validationResult.preview.reconciliationCount
            ? `, ${toBengaliNumeral(validationResult.preview.reconciliationCount)}টি রিকনসিলিয়েশন`
            : ''
        } সফলভাবে রিস্টোর করা হয়েছে!`
      );
      onClose();
    } catch (err) {
      onErrorMessage(err instanceof Error ? err.message : 'রিস্টোর করতে সমস্যা হয়েছে।');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleResetFile = () => {
    setSelectedFileName('');
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRestoring) {
          onClose();
        }
      }}
    >
      <div className="modal-dialog backup-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge" aria-hidden="true">
              💾
            </span>
            <h2 id="backup-modal-title" className="modal-title">
              ডেটা ব্যাকআপ ও এক্সপোর্ট
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            disabled={isRestoring}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="backup-tab-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'export'}
            className={`backup-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            📥 এক্সপোর্ট ও ব্যাকআপ
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'restore'}
            className={`backup-tab-btn ${activeTab === 'restore' ? 'active' : ''}`}
            onClick={() => setActiveTab('restore')}
          >
            📤 ডেটা রিস্টোর (Restore)
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body backup-modal-body">
          {activeTab === 'export' ? (
            <div className="backup-export-section">
              <p className="backup-description">
                আপনার আর্থিক তথ্যের নিয়মিত ব্যাকআপ রাখুন। যেকোনো সময় আপনার হিসাবসমূহ ও লেনদেনের ইতিহাস
                এক্সপোর্ট করে স্প্রেডশীট সফটওয়্যারে (Excel, Google Sheets) দেখতে পারেন।
              </p>

              <div className="backup-stats-badge">
                <span>বর্তমান রেকর্ড: <strong>{toBengaliNumeral(accounts.length)}টি</strong> অ্যাকাউন্ট</span>
                <span>•</span>
                <span><strong>{toBengaliNumeral(transactions.length)}টি</strong> লেনদেন</span>
              </div>

              <div className="backup-actions-grid">
                <div className="backup-action-card">
                  <div className="backup-card-icon">📊</div>
                  <div className="backup-card-info">
                    <h3>CSV এক্সপোর্ট</h3>
                    <p>
                      এক্সেল ও স্প্রেডশীটে খোলার উপযোগী বাংলা ইউনিকোড (UTF-8 BOM) সমর্থিত লেনদেন তালিকা।
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary backup-action-btn"
                    onClick={handleExportCSV}
                    disabled={transactions.length === 0}
                  >
                    CSV ডাউনলোড করুন
                  </button>
                </div>

                <div className="backup-action-card highlight">
                  <div className="backup-card-icon">🔒</div>
                  <div className="backup-card-info">
                    <h3>সম্পূর্ণ ব্যাকআপ (JSON)</h3>
                    <p>
                      ভবিষ্যতে রিস্টোর করার জন্য অ্যাকাউন্টের ব্যালেন্স ও নির্ভুল BigInt পয়সা সহ পূর্ণাঙ্গ ব্যাকআপ।
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary backup-action-btn"
                    onClick={handleExportJSON}
                  >
                    JSON ব্যাকআপ ডাউনলোড
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="backup-restore-section">
              <p className="backup-description">
                আপনার পূর্বের ব্যাকআপ করা <code>.json</code> ফাইল আপলোড করে ডেটা পুনরুদ্ধার করুন।
                রিস্টোর করার পূর্বে সিস্টেম স্বয়ংক্রিয়ভাবে ফাইলের সত্যতা ও বৈধতা যাচাই করবে।
              </p>

              {/* File Input Box */}
              {!validationResult?.isValid && (
                <div className="backup-upload-box">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="backup-file-input"
                    accept=".json,application/json"
                    className="backup-file-input-hidden"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="backup-file-input" className="backup-upload-label">
                    <span className="backup-upload-icon">📁</span>
                    <span className="backup-upload-text">
                      {selectedFileName ? selectedFileName : 'একটি JSON ব্যাকআপ ফাইল নির্বাচন করুন'}
                    </span>
                    <span className="backup-upload-subtext">ক্লিক করে ফাইল ব্রাউজ করুন</span>
                  </label>
                </div>
              )}

              {/* Validation Failure Alert */}
              {validationResult && !validationResult.isValid && (
                <div className="backup-error-banner" role="alert">
                  <div className="backup-error-header">
                    <span>⚠️ ব্যাকআপ ফাইলটি অগ্রহণযোগ্য বা ত্রুটিযুক্ত:</span>
                    <button
                      type="button"
                      className="backup-reset-link"
                      onClick={handleResetFile}
                    >
                      অন্য ফাইল দিন
                    </button>
                  </div>
                  <ul className="backup-error-list">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Valid Backup Preview & Confirmation */}
              {validationResult && validationResult.isValid && validationResult.preview && (
                <div className="backup-preview-card">
                  <div className="backup-preview-header">
                    <h4>✓ ব্যাকআপ যাচাই সফল হয়েছে — ডেটা প্রিভিউ</h4>
                    <button
                      type="button"
                      className="backup-reset-link"
                      onClick={handleResetFile}
                      disabled={isRestoring}
                    >
                      ফাইল পরিবর্তন
                    </button>
                  </div>

                  <div className="backup-preview-metrics">
                    <div className="backup-metric-item">
                      <span className="metric-label">অ্যাকাউন্ট সংখ্যা:</span>
                      <strong className="metric-value">
                        {toBengaliNumeral(validationResult.preview.accountCount)} টি
                      </strong>
                    </div>
                    <div className="backup-metric-item">
                      <span className="metric-label">মোট লেনদেন:</span>
                      <strong className="metric-value">
                        {toBengaliNumeral(validationResult.preview.transactionCount)} টি
                      </strong>
                    </div>
                    <div className="backup-metric-item">
                      <span className="metric-label">মোট নেট ব্যালেন্স:</span>
                      <strong className="metric-value">
                        {formatPaisaToBDT(validationResult.preview.totalNetBalancePaisa)}
                      </strong>
                    </div>
                    {validationResult.preview.budgetCount !== undefined && (
                      <div className="backup-metric-item">
                        <span className="metric-label">বাজেট সংখ্যা:</span>
                        <strong className="metric-value">
                          {toBengaliNumeral(validationResult.preview.budgetCount)} টি
                        </strong>
                      </div>
                    )}
                    {validationResult.preview.savingsGoalCount !== undefined && (
                      <div className="backup-metric-item">
                        <span className="metric-label">সঞ্চয় লক্ষ্য:</span>
                        <strong className="metric-value">
                          {toBengaliNumeral(validationResult.preview.savingsGoalCount)} টি
                        </strong>
                      </div>
                    )}
                    {validationResult.preview.recurringCount !== undefined && (
                      <div className="backup-metric-item">
                        <span className="metric-label">পুনরাবৃত্ত লেনদেন:</span>
                        <strong className="metric-value">
                          {toBengaliNumeral(validationResult.preview.recurringCount)} টি
                        </strong>
                      </div>
                    )}
                    {validationResult.preview.reconciliationCount !== undefined && (
                      <div className="backup-metric-item">
                        <span className="metric-label">রিকনসিলিয়েশন:</span>
                        <strong className="metric-value">
                          {toBengaliNumeral(validationResult.preview.reconciliationCount)} টি
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="backup-warning-box">
                    <span className="warning-icon">⚠️</span>
                    <p>
                      <strong>সতর্কতা:</strong> ডেটা রিস্টোর করলে বর্তমানের বিদ্যমান সকল অ্যাকাউন্ট এবং
                      লেনদেনের তথ্য ব্যাকআপ ফাইলের ডেটা দ্বারা প্রতিস্থাপিত হবে। এই পরিবর্তন অপরিবর্তনযোগ্য।
                    </p>
                  </div>

                  <div className="backup-confirm-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleResetFile}
                      disabled={isRestoring}
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleConfirmRestore}
                      disabled={isRestoring}
                    >
                      {isRestoring ? 'রিস্টোর হচ্ছে...' : 'নিশ্চিতভাবে রিস্টোর করুন'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={isRestoring}
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
