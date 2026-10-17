/**
 * Personal Finance Super App - Category Breakdown Component
 * Phase 2F - CategoryBreakdown UI Redesign
 *
 * Modern Professional + Smart Compact Layout
 * - White + Green/Teal professional theme with restrained progress bars
 * - Prominent highlight for top-spending category
 * - Clear category name, contextual icon, expense amount, and percentage
 * - Zero-value bar safety (strictly 0% width when 0)
 * - Complete privacy masking of both amounts and sensitive percentages
 * - Fully responsive across Desktop, Tablet, and Mobile
 */

import React from 'react';
import { CategoryExpense } from '../../types/dashboard';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';

export interface CategoryBreakdownProps {
  categories: CategoryExpense[];
  isBalanceHidden?: boolean;
  isLoading?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  'বাসা ভাড়া': '🏠',
  'খাবার ও বাজার': '🛒',
  'ইউটিলিটি ও বিল': '💡',
  'যাতায়াত': '🚗',
  'চিকিৎসা ও ওষুধ': '💊',
  'বিনোদন': '🎬',
  'শিক্ষা': '📚',
  'কেনাকাটা': '🛍️',
  'অন্যান্য': '🏷️',
};

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories,
  isBalanceHidden = false,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <section className="dash-card" aria-label="ক্যাটাগরি ভিত্তিক ব্যয় লোড হচ্ছে">
        <div className="card-header-row">
          <Skeleton height="1.25rem" width="45%" />
          <Skeleton height="0.875rem" width="18%" />
        </div>
        <div className="category-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <Skeleton height="2.5rem" />
          <Skeleton height="2.5rem" />
          <Skeleton height="2.5rem" />
          <Skeleton height="2.5rem" />
        </div>
      </section>
    );
  }

  const maskedAmount = '••••••';

  // Identify highest spending category index (first non-zero item)
  const topCategoryIndex = categories.findIndex((c) => c.amountPaisa > 0n);

  return (
    <section className="dash-card" aria-labelledby="category-breakdown-title">
      <div className="card-header-row">
        <h2 id="category-breakdown-title" className="card-title">
          ক্যাটাগরি অনুযায়ী ব্যয়
        </h2>
        <span
          className="card-subtitle"
          style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          {toBengaliNumeral(categories.length)}টি খাত
        </span>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon="📊"
          title="কোনো ব্যয়ের হিসাব নেই"
          description="এই মাসে এখনও কোনো ব্যয় রেকর্ড করা হয়নি।"
        />
      ) : (
        <div
          className="category-list"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          {categories.map((item, index) => {
            const isTop = index === topCategoryIndex && item.amountPaisa > 0n;
            const icon = CATEGORY_ICONS[item.category] || '🏷️';

            const displayAmount = isBalanceHidden
              ? maskedAmount
              : formatPaisaToBDT(item.amountPaisa);

            const safePct = Math.max(0, isNaN(item.percentage) ? 0 : item.percentage);
            const formattedPct = toBengaliNumeral(safePct.toFixed(1));

            // Strictly 0% fill if amount is 0 or percentage is 0
            const fillWidth =
              safePct > 0 && item.amountPaisa > 0n
                ? `${Math.max(safePct, 3)}%`
                : '0%';

            return (
              <div
                key={item.category}
                className="category-item"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  padding: '0.5rem 0.375rem',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-app)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Meta row: Category name, icon, badges & Amount */}
                <div
                  className="category-item-header"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <div
                    className="category-name-wrap"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{ fontSize: '0.875rem', lineHeight: 1, flexShrink: 0 }}
                      aria-hidden="true"
                    >
                      {icon}
                    </span>

                    <span
                      style={{
                        fontWeight: isTop ? 600 : 500,
                        fontSize: '0.8125rem',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.category}
                    >
                      {item.category}
                    </span>

                    {/* Top spending category pill */}
                    {isTop && (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          padding: '1px 5px',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--color-primary-50)',
                          border: '1px solid rgba(13, 148, 136, 0.25)',
                          color: 'var(--color-primary-700)',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        সর্বোচ্চ
                      </span>
                    )}

                    {/* Percentage: strictly hidden in privacy mode */}
                    {!isBalanceHidden && (
                      <span
                        className="category-pct"
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        ({formattedPct}%)
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: isTop ? 'var(--color-primary-800)' : 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      letterSpacing: isBalanceHidden ? '0.1em' : 'normal',
                    }}
                    aria-live="polite"
                  >
                    {displayAmount}
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div
                  className="category-track"
                  style={{
                    height: '0.4375rem',
                    backgroundColor: 'var(--color-neutral-100)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  aria-hidden="true"
                >
                  <div
                    className="category-fill"
                    style={{
                      width: fillWidth,
                      height: '100%',
                      background: isTop
                        ? 'linear-gradient(90deg, #0d9488, #0f766e)'
                        : 'linear-gradient(90deg, #2dd4bf, #0d9488)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.4s ease-out',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CategoryBreakdown;
