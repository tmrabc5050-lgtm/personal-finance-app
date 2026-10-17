/**
 * Personal Finance Super App - Cash Flow Forecast View
 * Batch 4: Feature D - Cash Flow Forecast
 */

import React, { useEffect, useState } from 'react';
import {
  CashFlowForecastResult,
  ForecastRangeDays,
} from '../../types/recurringAndReconciliation';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { formatBengaliDate } from '../../utils/date';

export interface CashFlowForecastViewProps {
  isBalanceHidden: boolean;
  getCashFlowForecast: (rangeDays?: ForecastRangeDays) => Promise<CashFlowForecastResult>;
}

export const CashFlowForecastView: React.FC<CashFlowForecastViewProps> = ({
  isBalanceHidden,
  getCashFlowForecast,
}) => {
  const [rangeDays, setRangeDays] = useState<ForecastRangeDays>(30);
  const [forecast, setForecast] = useState<CashFlowForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async (days: ForecastRangeDays) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCashFlowForecast(days);
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ক্যাশ ফ্লো পূর্বাভাস তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(rangeDays);
  }, [rangeDays]);

  const handleRangeChange = (days: ForecastRangeDays) => {
    setRangeDays(days);
  };

  return (
    <div className="cash-flow-forecast-view" style={{ padding: '16px 0' }}>
      {/* Header and Range Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 4px 0' }}>
            📈 ক্যাশ ফ্লো পূর্বাভাস (Cash Flow Forecast)
          </h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            ভবিষ্যতের আয়, ব্যয় ও অনুমিত সমাপনী স্থিতি সম্পর্কে স্বচ্ছ ও সুনির্দিষ্ট প্রক্ষেপণ
          </p>
        </div>

        {/* Range Buttons (30, 60, 90 Days) */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            className={`btn-tab ${rangeDays === 30 ? 'btn-tab-active' : ''}`}
            onClick={() => handleRangeChange(30)}
            style={{ padding: '6px 14px' }}
          >
            ৩০ দিন
          </button>
          <button
            type="button"
            className={`btn-tab ${rangeDays === 60 ? 'btn-tab-active' : ''}`}
            onClick={() => handleRangeChange(60)}
            style={{ padding: '6px 14px' }}
          >
            ৬০ দিন
          </button>
          <button
            type="button"
            className={`btn-tab ${rangeDays === 90 ? 'btn-tab-active' : ''}`}
            onClick={() => handleRangeChange(90)}
            style={{ padding: '6px 14px' }}
          >
            ৯০ দিন
          </button>
        </div>
      </div>

      {error && (
        <div className="form-error-banner" role="alert" style={{ marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p>ক্যাশ ফ্লো পূর্বাভাস প্রক্ষেপণ করা হচ্ছে...</p>
        </div>
      ) : !forecast ? null : (
        <div>
          {/* Key Metric Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {/* 1. Starting Balance */}
            <div
              style={{
                backgroundColor: 'var(--color-surface, #ffffff)',
                borderRadius: '10px',
                padding: '16px',
                border: '1px solid var(--color-border, #e2e8f0)',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                প্রারম্ভিক বর্তমান স্থিতি (Starting)
              </span>
              <p style={{ margin: '6px 0 0', fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--color-text)' }}>
                {isBalanceHidden ? '••••••' : formatPaisaToBDT(forecast.currentStartingBalancePaisa)}
              </p>
              <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                আজকের ({formatBengaliDate(forecast.startDate)}) প্রকৃত ব্যালেন্স
              </small>
            </div>

            {/* 2. Projected Income */}
            <div
              style={{
                backgroundColor: 'var(--color-surface, #ffffff)',
                borderRadius: '10px',
                padding: '16px',
                border: '1px solid var(--color-border, #e2e8f0)',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--color-income, #16a34a)' }}>
                প্রত্যাশিত মোট আয় (Projected)
              </span>
              <p
                style={{
                  margin: '6px 0 0',
                  fontWeight: 'bold',
                  fontSize: '1.3rem',
                  color: 'var(--color-income, #16a34a)',
                }}
              >
                +{isBalanceHidden ? '••••••' : formatPaisaToBDT(forecast.projectedTotalIncomePaisa)}
              </p>
              <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                পরবর্তী {toBengaliNumeral(forecast.rangeDays)} দিনের প্রক্ষেপণ
              </small>
            </div>

            {/* 3. Projected Expense */}
            <div
              style={{
                backgroundColor: 'var(--color-surface, #ffffff)',
                borderRadius: '10px',
                padding: '16px',
                border: '1px solid var(--color-border, #e2e8f0)',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--color-expense, #dc2626)' }}>
                প্রত্যাশিত মোট ব্যয় (Projected)
              </span>
              <p
                style={{
                  margin: '6px 0 0',
                  fontWeight: 'bold',
                  fontSize: '1.3rem',
                  color: 'var(--color-expense, #dc2626)',
                }}
              >
                -{isBalanceHidden ? '••••••' : formatPaisaToBDT(forecast.projectedTotalExpensePaisa)}
              </p>
              <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                পুনরাবৃত্ত ও অনুমিত খরচ
              </small>
            </div>

            {/* 4. Estimated Ending Balance */}
            <div
              style={{
                backgroundColor: 'var(--color-surface, #ffffff)',
                borderRadius: '10px',
                padding: '16px',
                border: '2px solid var(--color-primary, #0ea5e9)',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--color-primary, #0ea5e9)', fontWeight: 600 }}>
                অনুমিত সমাপ্তি স্থিতি (Estimated Ending)
              </span>
              <p
                style={{
                  margin: '6px 0 0',
                  fontWeight: 'bold',
                  fontSize: '1.35rem',
                  color:
                    forecast.estimatedEndingBalancePaisa >= 0n
                      ? 'var(--color-text)'
                      : 'var(--color-expense, #dc2626)',
                }}
              >
                {isBalanceHidden ? '••••••' : formatPaisaToBDT(forecast.estimatedEndingBalancePaisa)}
              </p>
              <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                তারিখ: {formatBengaliDate(forecast.endDate)}
              </small>
            </div>
          </div>

          {/* Timeline Table / Visualization */}
          <div
            style={{
              backgroundColor: 'var(--color-surface, #ffffff)',
              borderRadius: '12px',
              border: '1px solid var(--color-border, #e2e8f0)',
              padding: '18px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
                📅 ক্যাশ ফ্লো সময়রেখা (Forecast Timeline)
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {formatBengaliDate(forecast.startDate)} থেকে {formatBengaliDate(forecast.endDate)}
              </span>
            </div>

            {forecast.timeline.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px 0' }}>
                কোনো সময়রেখা তথ্য পাওয়া যায়নি।
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>তারিখ</th>
                      <th style={{ padding: '10px', textAlign: 'right', color: '#16a34a' }}>প্রত্যাশিত আয়</th>
                      <th style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>প্রত্যাশিত ব্যয়</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>নিট পরিবর্তন</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>অনুমিত স্থিতি</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>বিবরণ / উৎস</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.timeline.map((pt, idx) => {
                      const isPositive = pt.netChangePaisa >= 0n;
                      return (
                        <tr
                          key={`${pt.date}_${idx}`}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
                          }}
                        >
                          <td style={{ padding: '10px', fontWeight: 500 }}>
                            {formatBengaliDate(pt.date)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a' }}>
                            {pt.projectedIncomePaisa > 0n
                              ? `+${isBalanceHidden ? '••••••' : formatPaisaToBDT(pt.projectedIncomePaisa)}`
                              : '—'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>
                            {pt.projectedExpensePaisa > 0n
                              ? `-${isBalanceHidden ? '••••••' : formatPaisaToBDT(pt.projectedExpensePaisa)}`
                              : '—'}
                          </td>
                          <td
                            style={{
                              padding: '10px',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: isPositive ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {pt.netChangePaisa === 0n
                              ? '০.০০ ৳'
                              : `${isPositive ? '+' : ''}${isBalanceHidden ? '••••••' : formatPaisaToBDT(pt.netChangePaisa)}`}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                            {isBalanceHidden ? '••••••' : formatPaisaToBDT(pt.estimatedEndingBalancePaisa)}
                          </td>
                          <td style={{ padding: '10px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                            {pt.sourceDescriptions.length > 0
                              ? pt.sourceDescriptions.join(', ')
                              : 'দৈনিক নিয়মিত চক্র'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transparent Assumptions & Legal/Financial Disclaimer */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '16px',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--color-text)' }}>
              🔍 পূর্বাভাসের ভিত্তি ও স্বতঃসিদ্ধ অনুমিতি (Assumptions):
            </h3>
            <ul style={{ margin: '0 0 12px 20px', padding: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {forecast.assumptions.map((ass, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  {ass}
                </li>
              ))}
            </ul>

            <div
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#fde68a',
              }}
            >
              <strong>⚠️ আর্থিক সতর্কবার্তা ও সীমাবদ্ধতা:</strong> এই পূর্বাভাসটি আপনার সক্রিয় পুনরাবৃত্ত
              লেনদেন এবং বর্তমান হিসাবের স্থিতির ওপর ভিত্তি করে তৈরি একটি স্বয়ংক্রিয় প্রক্ষেপণ মাত্র। এটি
              কোনো ভবিষ্যৎ লাভের নিশ্চয়তা নয়। কোনো অপ্রত্যাশিত ব্যয় বা আয় ঘটার সাথে সাথে এই পরিসংখ্যান
              পরিবর্তন হতে পারে।
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
