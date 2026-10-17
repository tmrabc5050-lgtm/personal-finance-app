/**
 * Personal Finance Super App - Financial Reports & Analytics View
 * Batch 3: Budget Engine, Financial Reports & Savings Goals
 */

import React, { useEffect, useState } from 'react';
import { FinancialReportData, ReportFilterOptions, ReportTimeframe } from '../../types/budgetAndGoals';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { formatBengaliDate } from '../../utils/date';

export interface FinancialReportsViewProps {
  isBalanceHidden: boolean;
  getFinancialReport: (options: ReportFilterOptions) => Promise<FinancialReportData>;
}

const CATEGORY_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#64748b'
];

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  isBalanceHidden,
  getFinancialReport,
}) => {
  const [timeframe, setTimeframe] = useState<ReportTimeframe>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [report, setReport] = useState<FinancialReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (overrideOptions?: ReportFilterOptions) => {
    setIsLoading(true);
    setError(null);
    try {
      const options: ReportFilterOptions = overrideOptions || {
        timeframe,
        startDate: timeframe === 'custom' ? customStartDate : undefined,
        endDate: timeframe === 'custom' ? customEndDate : undefined,
      };
      const data = await getFinancialReport(options);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'রিপোর্ট তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeframe !== 'custom') {
      fetchReport({ timeframe });
    }
  }, [timeframe]);

  const handleApplyCustomFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) {
      alert('শুরু ও শেষের তারিখ নির্বাচন করুন');
      return;
    }
    if (customStartDate > customEndDate) {
      alert('শুরুর তারিখ শেষের তারিখের চেয়ে পূর্বে হতে হবে');
      return;
    }
    fetchReport({
      timeframe: 'custom',
      startDate: customStartDate,
      endDate: customEndDate,
    });
  };

  const handleResetFilters = () => {
    setTimeframe('this_month');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  return (
    <div className="financial-reports-view">
      {/* Title & Filter Bar */}
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="view-title" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary, #111827)' }}>
            আর্থিক প্রতিবেদন ও বিশ্লেষণ (Reports & Analytics)
          </h1>
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            আপনার আয়, ব্যয়, নেট ক্যাশ ফ্লো ও সঞ্চয়ের বিশদ পরিসংখ্যান
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filter-pill-group" style={{ display: 'inline-flex', background: 'var(--color-card-bg, #ffffff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '3px' }}>
            {[
              { key: 'this_month', label: 'চলতি মাস' },
              { key: 'last_month', label: 'পূর্ববর্তী মাস' },
              { key: 'this_year', label: 'চলতি বছর' },
              { key: 'custom', label: 'কাস্টম রেঞ্জ' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`filter-pill-btn ${timeframe === item.key ? 'active' : ''}`}
                onClick={() => setTimeframe(item.key as ReportTimeframe)}
                style={{
                  background: timeframe === item.key ? 'var(--color-primary, #10b981)' : 'transparent',
                  color: timeframe === item.key ? '#ffffff' : 'var(--color-text-primary, #374151)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: timeframe === item.key ? 600 : 400,
                  transition: 'all 0.2s',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {timeframe !== 'this_month' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetFilters}
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            >
              রিসেট
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {timeframe === 'custom' && (
        <form
          onSubmit={handleApplyCustomFilter}
          className="dashboard-card"
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="report-start-date" style={{ fontSize: '0.85rem', fontWeight: 600 }}>শুরু:</label>
            <input
              id="report-start-date"
              type="date"
              className="form-input"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="report-end-date" style={{ fontSize: '0.85rem', fontWeight: 600 }}>শেষ:</label>
            <input
              id="report-end-date"
              type="date"
              className="form-input"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
            ফিল্টার প্রয়োগ করুন
          </button>
        </form>
      )}

      {/* Loading or Error State */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-secondary, #6b7280)' }}>
          রিপোর্ট তৈরি হচ্ছে...
        </div>
      ) : error ? (
        <div className="alert-banner alert-banner-danger" style={{ padding: '1rem', borderRadius: '8px' }}>
          {error}
        </div>
      ) : !report ? null : (
        <>
          {/* Active Date Period Subtitle */}
          <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--color-text-secondary, #6b7280)' }}>
            সময়সীমা: <strong>{formatBengaliDate(report.startDate)}</strong> থেকে <strong>{formatBengaliDate(report.endDate)}</strong>
            &nbsp;• মোট লেনদেন: {toBengaliNumeral(report.transactionCount)}টি
          </div>

          {/* Key Metrics Cards */}
          <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Total Income */}
            <div className="dashboard-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
                মোট অর্জিত আয়
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary, #10b981)' }}>
                {isBalanceHidden ? '••••••' : formatPaisaToBDT(report.totalIncomePaisa)}
              </div>
              {report.comparison && (
                <div style={{ fontSize: '0.8rem', marginTop: '0.35rem', color: report.comparison.incomeChangePercent >= 0 ? '#10b981' : '#ef4444' }}>
                  {report.comparison.incomeChangePercent >= 0 ? '▲' : '▼'}&nbsp;
                  {toBengaliNumeral(Math.abs(report.comparison.incomeChangePercent))}% পূর্ববর্তী সময়ের তুলনায়
                </div>
              )}
            </div>

            {/* Total Expenses */}
            <div className="dashboard-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
                মোট ব্যয় (ট্রান্সফার ফিসহ)
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger, #ef4444)' }}>
                {isBalanceHidden ? '••••••' : formatPaisaToBDT(report.totalExpensePaisa)}
              </div>
              {report.comparison && (
                <div style={{ fontSize: '0.8rem', marginTop: '0.35rem', color: report.comparison.expenseChangePercent > 0 ? '#ef4444' : '#10b981' }}>
                  {report.comparison.expenseChangePercent >= 0 ? '▲' : '▼'}&nbsp;
                  {toBengaliNumeral(Math.abs(report.comparison.expenseChangePercent))}% পূর্ববর্তী সময়ের তুলনায়
                </div>
              )}
            </div>

            {/* Net Cash Flow */}
            <div className="dashboard-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
                নেট ক্যাশ ফ্লো (আয় - ব্যয়)
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: report.netCashFlowPaisa >= 0n ? 'var(--color-primary, #10b981)' : 'var(--color-danger, #ef4444)' }}>
                {isBalanceHidden ? '••••••' : formatPaisaToBDT(report.netCashFlowPaisa, { showSign: true })}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.35rem' }}>
                {report.netCashFlowPaisa >= 0n ? 'উদ্বৃত্ত সঞ্চয়' : 'ঘাটতি রয়েছে'}
              </div>
            </div>

            {/* Savings Rate & Ratio */}
            <div className="dashboard-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
                সঞ্চয়ের হার / ব্যয় অনুপাত
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary, #111827)' }}>
                {toBengaliNumeral(report.savingsRatePercent)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.35rem' }}>
                আয়ের বিপরীতে ব্যয়: {toBengaliNumeral(report.expenseToIncomeRatioPercent)}%
              </div>
            </div>
          </div>

          {/* Charts Row 1: Income vs Expense Trend & Net Cash Flow Trend */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Chart 1: Income vs Expense Trend */}
            <div className="dashboard-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
                মাসিক আয় বনাম ব্যয় ট্রেন্ড (বিগত ৬ মাস)
              </h3>
              {report.monthlyTrends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>কোনো তথ্য নেই</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(() => {
                    let maxMonthVal = 1n;
                    for (const m of report.monthlyTrends) {
                      if (m.incomePaisa > maxMonthVal) maxMonthVal = m.incomePaisa;
                      if (m.expensePaisa > maxMonthVal) maxMonthVal = m.expensePaisa;
                    }

                    return report.monthlyTrends.map((point) => {
                      const incPct = maxMonthVal > 0n ? Math.max(3, Number((point.incomePaisa * 100n) / maxMonthVal)) : 0;
                      const expPct = maxMonthVal > 0n ? Math.max(3, Number((point.expensePaisa * 100n) / maxMonthVal)) : 0;

                      return (
                        <div key={point.monthKey} style={{ fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 600 }}>{point.monthLabel}</span>
                            <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
                              আয়: {isBalanceHidden ? '••••••' : formatPaisaToBDT(point.incomePaisa)} | ব্যয়: {isBalanceHidden ? '••••••' : formatPaisaToBDT(point.expensePaisa)}
                            </span>
                          </div>
                          {/* Income bar */}
                          <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '2px' }}>
                            <div style={{ width: `${incPct}%`, height: '100%', background: '#10b981', borderRadius: '4px' }} />
                          </div>
                          {/* Expense bar */}
                          <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${expPct}%`, height: '100%', background: '#ef4444', borderRadius: '4px' }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }} /> আয়
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px', display: 'inline-block' }} /> ব্যয়
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Net Cash Flow Trend */}
            <div className="dashboard-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
                মাসিক নেট ক্যাশ ফ্লো ট্রেন্ড (উদ্বৃত্ত বা ঘাটতি)
              </h3>
              {report.monthlyTrends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>কোনো তথ্য নেই</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {(() => {
                    let maxNetVal = 1n;
                    for (const m of report.monthlyTrends) {
                      const abs = m.netPaisa < 0n ? -m.netPaisa : m.netPaisa;
                      if (abs > maxNetVal) maxNetVal = abs;
                    }

                    return report.monthlyTrends.map((point) => {
                      const isPositive = point.netPaisa >= 0n;
                      const absVal = isPositive ? point.netPaisa : -point.netPaisa;
                      const pct = maxNetVal > 0n ? Math.max(4, Math.min(100, Number((absVal * 100n) / maxNetVal))) : 0;

                      return (
                        <div key={point.monthKey} style={{ fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 600 }}>{point.monthLabel}</span>
                            <span style={{ color: isPositive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                              {isBalanceHidden ? '••••••' : formatPaisaToBDT(point.netPaisa, { showSign: true })}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '10px', background: '#f3f4f6', borderRadius: '5px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: isPositive ? 'var(--color-primary, #10b981)' : 'var(--color-danger, #ef4444)',
                                borderRadius: '5px',
                              }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Charts Row 2: Expense Distribution by Category & Account Balances */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Category Expenses Breakdown */}
            <div className="dashboard-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
                ক্যাটাগরিভিত্তিক ব্যয়ের বিভাজন
              </h3>
              {report.categoryExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>কোনো ব্যয় লেনদেন পাওয়া যায়নি</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {report.categoryExpenses.map((cat, idx) => {
                    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                    return (
                      <div key={cat.category} style={{ fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                            <strong>{cat.category}</strong>
                          </span>
                          <span>
                            {isBalanceHidden ? '••••••' : formatPaisaToBDT(cat.amountPaisa)} ({toBengaliNumeral(cat.percentage)}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%`, height: '100%', background: color, borderRadius: '4px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Account Balances Breakdown */}
            <div className="dashboard-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
                অ্যাকাউন্টভিত্তিক বর্তমান ব্যালেন্স
              </h3>
              {report.accountBalances.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>কোনো অ্যাকাউন্ট পাওয়া যায়নি</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {report.accountBalances.map((item, idx) => {
                    const color = CATEGORY_COLORS[(idx + 4) % CATEGORY_COLORS.length];
                    return (
                      <div key={item.account.id} style={{ fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>
                            <strong>{item.account.name}</strong> ({item.account.type === 'bkash' ? 'বিকাশ' : item.account.type === 'nagad' ? 'নগদ ওয়ালেট' : item.account.type === 'cash' ? 'ক্যাশ' : 'অন্যান্য'})
                          </span>
                          <span>
                            {isBalanceHidden ? '••••••' : formatPaisaToBDT(item.balancePaisa)} ({toBengaliNumeral(item.percentage)}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.max(3, item.percentage))}%`, height: '100%', background: color, borderRadius: '4px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Deterministic Financial Insights Panel */}
          {report.insights.length > 0 && (
            <div className="dashboard-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
                আর্থিক পর্যবেক্ষণ ও অন্তর্দৃষ্টি (Deterministic Insights)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {report.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: insight.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : insight.type === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                      borderLeft: `4px solid ${insight.type === 'success' ? '#10b981' : insight.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                      {insight.type === 'success' ? '✓ ' : insight.type === 'warning' ? '⚠️ ' : '💡 '}
                      {insight.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #4b5563)' }}>
                      {insight.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Category Expense Table */}
          {report.categoryExpenses.length > 0 && (
            <div className="dashboard-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
                বিস্তারিত ব্যয় বিবরণী তালিকা
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border, #e5e7eb)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>ক্যাটাগরি</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>লেনদেনের সংখ্যা</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>মোট ব্যয়</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>শতকরা অংশ (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categoryExpenses.map((cat) => (
                      <tr key={cat.category} style={{ borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{cat.category}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{toBengaliNumeral(cat.transactionCount)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-danger, #ef4444)', fontWeight: 600 }}>
                          {isBalanceHidden ? '••••••' : formatPaisaToBDT(cat.amountPaisa)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{toBengaliNumeral(cat.percentage)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
