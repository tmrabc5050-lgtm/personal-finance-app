/**
 * Personal Finance Super App - Budget Overview View
 * Batch 3: Budget Engine, Financial Reports & Savings Goals
 */

import React, { useEffect, useState } from 'react';
import { Budget, MonthlyBudgetSummary } from '../../types/budgetAndGoals';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { getBengaliMonthYear } from '../../utils/date';
import { BudgetModal } from './BudgetModal';

export interface BudgetOverviewViewProps {
  isBalanceHidden: boolean;
  getMonthlyBudgetProgress: (year: number, month: number) => Promise<MonthlyBudgetSummary>;
  createBudget: (data: {
    category: string;
    limitPaisa: bigint;
    month: number;
    year: number;
    warningThresholdPercent?: number;
  }) => Promise<Budget>;
  updateBudget: (budget: Budget) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<boolean>;
}

export const BudgetOverviewView: React.FC<BudgetOverviewViewProps> = ({
  isBalanceHidden,
  getMonthlyBudgetProgress,
  createBudget,
  updateBudget,
  deleteBudget,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [summary, setSummary] = useState<MonthlyBudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBudgetSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMonthlyBudgetProgress(selectedYear, selectedMonth);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বাজেট তথ্য লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetSummary();
  }, [selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const handleSaveBudget = async (data: {
    category: string;
    limitPaisa: bigint;
    month: number;
    year: number;
    warningThresholdPercent?: number;
  }) => {
    if (editingBudget) {
      await updateBudget({
        ...editingBudget,
        category: data.category,
        amountPaisa: data.limitPaisa,
        limitPaisa: data.limitPaisa,
        month: data.month,
        year: data.year,
        warningThresholdPercent: data.warningThresholdPercent ?? 80,
      });
    } else {
      await createBudget(data);
    }
    await fetchBudgetSummary();
  };

  const handleDeleteBudget = async (id: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই বাজেটটি মুছে ফেলতে চান?')) {
      try {
        setDeletingId(id);
        await deleteBudget(id);
        await fetchBudgetSummary();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'বাজেট মুছতে সমস্যা হয়েছে');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'exceeded':
        return <span className="status-badge status-badge-danger">বাজেট অতিক্রম</span>;
      case 'warning':
        return <span className="status-badge status-badge-warning">সতর্কবার্তা</span>;
      case 'not_started':
        return <span className="status-badge status-badge-neutral">শুরু হয়নি</span>;
      case 'on_track':
      default:
        return <span className="status-badge status-badge-success">সঠিক পথে</span>;
    }
  };

  const renderProgressBarColor = (status: string) => {
    switch (status) {
      case 'exceeded':
        return 'var(--color-danger, #ef4444)';
      case 'warning':
        return 'var(--color-warning, #f59e0b)';
      case 'not_started':
        return 'var(--color-gray-400, #9ca3af)';
      case 'on_track':
      default:
        return 'var(--color-primary, #10b981)';
    }
  };

  const currentMonthLabel = getBengaliMonthYear(selectedYear, selectedMonth);

  return (
    <div className="budget-overview-view">
      {/* Month Navigation Header */}
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="view-title" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary, #111827)' }}>
            বাজেট ব্যবস্থাপনা (Budget Engine)
          </h1>
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            মাসিক ব্যয় নিয়ন্ত্রণ করুন এবং পরিকল্পিত সীমার মধ্যে থাকুন
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Month Selector Buttons */}
          <div className="month-nav-group" style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--color-card-bg, #ffffff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '2px' }}>
            <button
              type="button"
              className="month-nav-btn"
              onClick={handlePrevMonth}
              title="পূর্ববর্তী মাস"
              aria-label="পূর্ববর্তী মাস"
              style={{ background: 'none', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '6px', fontSize: '1rem' }}
            >
              ◀
            </button>
            <span style={{ fontWeight: 600, padding: '0 8px', minWidth: '130px', textAlign: 'center', fontSize: '0.95rem' }}>
              {currentMonthLabel}
            </span>
            <button
              type="button"
              className="month-nav-btn"
              onClick={handleNextMonth}
              title="পরবর্তী মাস"
              aria-label="পরবর্তী মাস"
              style={{ background: 'none', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '6px', fontSize: '1rem' }}
            >
              ▶
            </button>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleCurrentMonth}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            চলতি মাস
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditingBudget(null);
              setIsModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>+</span> <span>নতুন বাজেট</span>
          </button>
        </div>
      </div>

      {/* In-App Alerts Banner */}
      {summary && summary.alerts && summary.alerts.length > 0 && (
        <div className="budget-alerts-container" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {summary.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-banner ${alert.severity === 'danger' ? 'alert-banner-danger' : 'alert-banner-warning'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                borderLeft: `4px solid ${alert.severity === 'danger' ? '#ef4444' : '#f59e0b'}`,
                background: alert.severity === 'danger' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{alert.severity === 'danger' ? '🚨' : '⚠️'}</span>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.1rem' }}>{alert.title}</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #4b5563)' }}>{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="dashboard-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
              মোট মাসিক বাজেট
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary, #111827)' }}>
              {isBalanceHidden ? '••••••' : formatPaisaToBDT(summary.totalBudgetPaisa)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.25rem' }}>
              নির্ধারিত মোট ক্যাটাগরি সীমা
            </div>
          </div>

          <div className="dashboard-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
              প্রকৃত ব্যয় (কোয়ালিফাইং)
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger, #ef4444)' }}>
              {isBalanceHidden ? '••••••' : formatPaisaToBDT(summary.totalSpentPaisa)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.25rem' }}>
              বাজেটের প্রায় {toBengaliNumeral(summary.overallSpentPercent ?? 0)}%
            </div>
          </div>

          <div className="dashboard-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
              অবশিষ্ট বাজেট
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (summary.totalRemainingPaisa ?? summary.remainingTotalPaisa ?? 0n) > 0n ? 'var(--color-primary, #10b981)' : 'var(--color-gray-500, #6b7280)' }}>
              {isBalanceHidden ? '••••••' : formatPaisaToBDT(summary.totalRemainingPaisa ?? summary.remainingTotalPaisa ?? 0n)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.25rem' }}>
              {summary.totalExceededPaisa > 0n
                ? `অতিক্রম: ${isBalanceHidden ? '••••••' : formatPaisaToBDT(summary.totalExceededPaisa)}`
                : 'সকল সীমার মধ্যে রয়েছে'}
            </div>
          </div>

          <div className="dashboard-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
              ক্যাটাগরি স্ট্যাটাস
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <span className="status-badge status-badge-success" title="সঠিক পথে">
                ✓ {toBengaliNumeral(summary.categoriesOnTrackCount)}
              </span>
              <span className="status-badge status-badge-warning" title="সতর্কবার্তা">
                ⚠️ {toBengaliNumeral(summary.categoriesWarningCount)}
              </span>
              <span className="status-badge status-badge-danger" title="বাজেট অতিক্রম">
                ✕ {toBengaliNumeral(summary.categoriesExceededCount)}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.5rem' }}>
              মোট {toBengaliNumeral(summary.items.length)}টি ক্যাটাগরি
            </div>
          </div>
        </div>
      )}

      {/* Progress Bars & Category List */}
      <div className="dashboard-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
          ক্যাটাগরিভিত্তিক বাজেট অগ্রগতি ({currentMonthLabel})
        </h2>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary, #6b7280)' }}>
            বাজেট লোড হচ্ছে...
          </div>
        ) : error ? (
          <div className="alert-banner alert-banner-danger" style={{ padding: '1rem', borderRadius: '8px' }}>
            {error}
          </div>
        ) : !summary || summary.items.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📊</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary, #111827)' }}>
              {currentMonthLabel} এর জন্য কোনো বাজেট নির্ধারণ করা হয়নি
            </h3>
            <p style={{ color: 'var(--color-text-secondary, #6b7280)', maxWidth: '420px', margin: '0.5rem auto 1.5rem auto', fontSize: '0.9rem' }}>
              আপনার খরচ পরিকল্পিত সীমার মধ্যে রাখতে ক্যাটাগরি অনুযায়ী বাজেট নির্ধারণ করুন।
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setEditingBudget(null);
                setIsModalOpen(true);
              }}
            >
              + প্রথম বাজেট তৈরি করুন
            </button>
          </div>
        ) : (
          <div className="budget-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {summary.items.map((item) => {
              const b = item.budget;
              const limit = b.amountPaisa ?? b.limitPaisa ?? 0n;
              const spent = item.spentPaisa ?? item.actualSpentPaisa ?? 0n;
              const pct = item.percentage ?? item.spentPercent ?? 0;
              const barColor = renderProgressBarColor(item.status);
              const progressWidth = Math.min(100, Math.max(0, pct));

              return (
                <div
                  key={b.id}
                  className="budget-progress-row"
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    background: 'var(--color-bg-secondary, #f9fafb)',
                  }}
                >
                  {/* Category Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary, #111827)' }}>
                        {b.category}
                      </span>
                      {renderStatusBadge(item.status)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title="সম্পাদনা"
                        onClick={() => {
                          setEditingBudget(b);
                          setIsModalOpen(true);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '0.9rem' }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="মুছুন"
                        disabled={deletingId === b.id}
                        onClick={() => handleDeleteBudget(b.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '0.9rem', color: 'var(--color-danger, #ef4444)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar Track */}
                  <div
                    className="progress-track"
                    style={{
                      width: '100%',
                      height: '10px',
                      borderRadius: '5px',
                      background: 'var(--color-border, #e5e7eb)',
                      overflow: 'hidden',
                      position: 'relative',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div
                      className="progress-fill"
                      style={{
                        height: '100%',
                        width: `${progressWidth}%`,
                        backgroundColor: barColor,
                        borderRadius: '5px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Amounts & Stats Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--color-text-secondary, #4b5563)' }}>
                    <span>
                      ব্যয়: <strong>{isBalanceHidden ? '••••••' : formatPaisaToBDT(spent)}</strong> ({toBengaliNumeral(pct)}%)
                    </span>
                    <span>
                      সীমা: <strong>{isBalanceHidden ? '••••••' : formatPaisaToBDT(limit)}</strong>
                    </span>
                    <span>
                      {item.status === 'exceeded' ? (
                        <span style={{ color: 'var(--color-danger, #ef4444)', fontWeight: 600 }}>
                          অতিরিক্ত: {isBalanceHidden ? '••••••' : formatPaisaToBDT(item.exceededPaisa)}
                        </span>
                      ) : (
                        <span>
                          অবশিষ্ট: <strong>{isBalanceHidden ? '••••••' : formatPaisaToBDT(item.remainingPaisa)}</strong>
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget Create / Edit Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBudget}
        initialBudget={editingBudget}
        defaultYear={selectedYear}
        defaultMonth={selectedMonth}
      />
    </div>
  );
};
