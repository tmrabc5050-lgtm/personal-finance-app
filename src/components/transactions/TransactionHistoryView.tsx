/**
 * Personal Finance Super App - Transaction History & Filter View
 * Batch 2: Transfer Engine, Transaction History, Search, Filters & Backup
 *
 * Full-featured financial history with:
 * - Free text search across note, category, account names
 * - Combined filters: type, account, category, date range, min/max amount
 * - Full support for income, expense, and account transfers (with fees)
 * - Pagination (15 items per page) with responsive Bengali UI
 * - Export CSV and Backup & Restore integration
 * - Safe Edit / Delete triggers with privacy masking
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Account, Transaction, TransactionType } from '../../types/dashboard';
import {
  formatPaisaToBDT,
  parseBDTToPaisa,
  toBengaliNumeral,
} from '../../utils/currency';
import { formatRelativeBengaliDate } from '../../utils/date';
import {
  FilteredTransactionsResult,
  TransactionFilterOptions,
} from '../../services/persistentFinanceService';
import { generateTransactionsCSV, downloadCSV } from '../../services/backupService';
import { EmptyState } from '../common/EmptyState';

export interface TransactionHistoryViewProps {
  accounts: Account[];
  isBalanceHidden: boolean;
  onBackToDashboard: () => void;
  onAddTransaction: (type?: TransactionType) => void;
  onTransfer: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onOpenBackup: () => void;
  getFilteredTransactions: (
    options?: TransactionFilterOptions
  ) => Promise<FilteredTransactionsResult>;
  allTransactions: Transaction[];
}

const ITEMS_PER_PAGE = 15;

const TX_TYPE_META: Record<
  TransactionType,
  {
    label: string;
    icon: React.ReactNode;
    amountPrefix: string;
    badgeClass: string;
    amountClass: string;
  }
> = {
  income: {
    label: 'আয়',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="17" y1="7" x2="7" y2="17" />
        <polyline points="17 17 7 17 7 7" />
      </svg>
    ),
    amountPrefix: '+',
    badgeClass: 'badge-income',
    amountClass: 'tx-amount-income',
  },
  expense: {
    label: 'ব্যয়',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    ),
    amountPrefix: '-',
    badgeClass: 'badge-expense',
    amountClass: 'tx-amount-expense',
  },
  transfer: {
    label: 'স্থানান্তর',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 3l4 4-4 4" />
        <path d="M20 7H4" />
        <path d="M8 21l-4-4 4-4" />
        <path d="M4 17h16" />
      </svg>
    ),
    amountPrefix: '',
    badgeClass: 'badge-transfer',
    amountClass: 'tx-amount-transfer',
  },
};

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  accounts,
  isBalanceHidden,
  onBackToDashboard,
  onAddTransaction,
  onTransfer,
  onEditTransaction,
  onDeleteTransaction,
  onOpenBackup,
  getFilteredTransactions,
  allTransactions,
}) => {
  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmountStr, setMinAmountStr] = useState<string>('');
  const [maxAmountStr, setMaxAmountStr] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Result state
  const [result, setResult] = useState<FilteredTransactionsResult>({
    transactions: [],
    totalCount: 0,
    filteredIncomePaisa: 0n,
    filteredExpensePaisa: 0n,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Account map for fast lookup
  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc) => map.set(acc.id, acc.name));
    return map;
  }, [accounts]);

  // Unique categories list
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    allTransactions.forEach((tx) => {
      if (tx.category) cats.add(tx.category);
    });
    return Array.from(cats).sort();
  }, [allTransactions]);

  // Fetch filtered transactions
  const loadFilteredData = useCallback(async () => {
    setIsLoading(true);
    try {
      let minPaisa: bigint | undefined = undefined;
      let maxPaisa: bigint | undefined = undefined;

      if (minAmountStr.trim()) {
        try {
          minPaisa = parseBDTToPaisa(minAmountStr.trim());
        } catch {
          // Ignore invalid parse
        }
      }

      if (maxAmountStr.trim()) {
        try {
          maxPaisa = parseBDTToPaisa(maxAmountStr.trim());
        } catch {
          // Ignore invalid parse
        }
      }

      const options: TransactionFilterOptions = {
        searchQuery,
        type: typeFilter,
        accountId: accountFilter,
        category: categoryFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minAmountPaisa: minPaisa,
        maxAmountPaisa: maxPaisa,
      };

      const res = await getFilteredTransactions(options);
      setResult(res);
      setCurrentPage(1); // Reset to first page on filter change
    } catch (err) {
      console.error('Failed to filter transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    typeFilter,
    accountFilter,
    categoryFilter,
    startDate,
    endDate,
    minAmountStr,
    maxAmountStr,
    getFilteredTransactions,
  ]);

  useEffect(() => {
    loadFilteredData();
  }, [loadFilteredData, allTransactions]);

  // Handle Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setAccountFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
    setMinAmountStr('');
    setMaxAmountStr('');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      typeFilter !== 'all' ||
      accountFilter !== 'all' ||
      categoryFilter !== 'all' ||
      startDate ||
      endDate ||
      minAmountStr.trim() ||
      maxAmountStr.trim()
  );

  // Paginated items
  const totalPages = Math.ceil(result.transactions.length / ITEMS_PER_PAGE) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return result.transactions.slice(start, start + ITEMS_PER_PAGE);
  }, [result.transactions, currentPage]);

  const maskedAmount = '••••••';

  // Quick CSV Export of current filtered view
  const handleExportCurrentCSV = () => {
    const csv = generateTransactionsCSV(result.transactions, accounts);
    downloadCSV(csv, `filtered_transactions_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="tx-history-container">
      {/* 1. Header Toolbar */}
      <div className="tx-history-header">
        <div className="tx-history-title-wrap">
          <button
            type="button"
            className="btn-back-dashboard"
            onClick={onBackToDashboard}
            aria-label="ড্যাশবোর্ডে ফিরে যান"
          >
            ← ড্যাশবোর্ড
          </button>
          <div className="tx-history-titles">
            <h1 className="tx-history-title">লেনদেনের ইতিহাস ও অনুসন্ধান</h1>
            <p className="tx-history-subtitle">
              আপনার সকল আয়, ব্যয় এবং স্থানান্তরের বিবরণ ফিল্টার ও পরিচালনা করুন
            </p>
          </div>
        </div>

        <div className="tx-history-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCurrentCSV}
            title="বর্তমান ফিল্টার করা লেনদেনসমূহ CSV হিসেবে নামান"
          >
            📥 CSV এক্সপোর্ট
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenBackup}
            title="সম্পূর্ণ ব্যাকআপ ও রিস্টোর উইন্ডো খুলুন"
          >
            💾 ব্যাকআপ ও রিস্টোর
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onTransfer}
            title="হিসাব থেকে হিসাবে টাকা স্থানান্তর"
          >
            ⇄ টাকা স্থানান্তর
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onAddTransaction('expense')}
            title="নতুন আয় বা ব্যয় যুক্ত করুন"
          >
            + নতুন লেনদেন
          </button>
        </div>
      </div>

      {/* 2. Combined Filters Bar */}
      <div className="tx-filter-card">
        <div className="tx-filter-row">
          {/* Free Text Search */}
          <div className="tx-filter-group flex-2">
            <label htmlFor="tx-search-input" className="tx-filter-label">
              অনুসন্ধান (নোট, ক্যাটাগরি, অ্যাকাউন্ট)
            </label>
            <div className="tx-search-input-wrap">
              <span className="search-icon" aria-hidden="true">
                🔍
              </span>
              <input
                id="tx-search-input"
                type="text"
                className="input-field search-input"
                placeholder="যেমন: বেতন, বাড়িভাড়া, বিকাশ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="অনুসন্ধান মুছুন"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div className="tx-filter-group">
            <label htmlFor="tx-type-select" className="tx-filter-label">
              ধরন
            </label>
            <select
              id="tx-type-select"
              className="input-field select-field"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="all">সব ধরন</option>
              <option value="income">আয় (+)</option>
              <option value="expense">ব্যয় (-)</option>
              <option value="transfer">স্থানান্তর (⇄)</option>
            </select>
          </div>

          {/* Account Filter */}
          <div className="tx-filter-group">
            <label htmlFor="tx-account-select" className="tx-filter-label">
              অ্যাকাউন্ট
            </label>
            <select
              id="tx-account-select"
              className="input-field select-field"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
            >
              <option value="all">সব অ্যাকাউন্ট</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="tx-filter-group">
            <label htmlFor="tx-cat-select" className="tx-filter-label">
              ক্যাটাগরি
            </label>
            <select
              id="tx-cat-select"
              className="input-field select-field"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">সব ক্যাটাগরি</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Amount Ranges Row */}
        <div className="tx-filter-row sub-row">
          {/* Start Date */}
          <div className="tx-filter-group">
            <label htmlFor="tx-start-date" className="tx-filter-label">
              তারিখ হতে
            </label>
            <input
              id="tx-start-date"
              type="date"
              className="input-field"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="tx-filter-group">
            <label htmlFor="tx-end-date" className="tx-filter-label">
              তারিখ পর্যন্ত
            </label>
            <input
              id="tx-end-date"
              type="date"
              className="input-field"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Min Amount */}
          <div className="tx-filter-group">
            <label htmlFor="tx-min-amount" className="tx-filter-label">
              সর্বনিম্ন (৳)
            </label>
            <input
              id="tx-min-amount"
              type="number"
              min="0"
              step="any"
              className="input-field"
              placeholder="0.00"
              value={minAmountStr}
              onChange={(e) => setMinAmountStr(e.target.value)}
            />
          </div>

          {/* Max Amount */}
          <div className="tx-filter-group">
            <label htmlFor="tx-max-amount" className="tx-filter-label">
              সর্বোচ্চ (৳)
            </label>
            <input
              id="tx-max-amount"
              type="number"
              min="0"
              step="any"
              className="input-field"
              placeholder="100000.00"
              value={maxAmountStr}
              onChange={(e) => setMaxAmountStr(e.target.value)}
            />
          </div>

          {/* Reset Filters */}
          <div className="tx-filter-group btn-group-end">
            <button
              type="button"
              className="btn btn-outline btn-reset-filters"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
            >
              ফিল্টার রিসেট
            </button>
          </div>
        </div>

        {/* 3. Filter Summary & Metrics Ribbon */}
        <div className="tx-summary-ribbon">
          <div className="tx-count-indicator">
            মোট ফলাফল:{' '}
            <strong>{toBengaliNumeral(result.transactions.length)}টি লেনদেন</strong>
            {hasActiveFilters && <span className="active-filter-badge">ফিল্টার সক্রিয়</span>}
          </div>

          <div className="tx-metrics-pills">
            <div className="summary-pill income">
              <span className="pill-dot"></span>
              <span className="pill-label">ফিল্টারকৃত আয়:</span>
              <strong className="pill-val">
                {isBalanceHidden
                  ? maskedAmount
                  : `+${formatPaisaToBDT(result.filteredIncomePaisa)}`}
              </strong>
            </div>

            <div className="summary-pill expense">
              <span className="pill-dot"></span>
              <span className="pill-label">ফিল্টারকৃত ব্যয়:</span>
              <strong className="pill-val">
                {isBalanceHidden
                  ? maskedAmount
                  : `-${formatPaisaToBDT(result.filteredExpensePaisa)}`}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Transactions List */}
      <div className="tx-history-table-card">
        {isLoading ? (
          <div className="tx-history-loading">
            <p>লেনদেন লোড হচ্ছে...</p>
          </div>
        ) : result.transactions.length === 0 ? (
          <div className="tx-history-empty">
            {hasActiveFilters ? (
              <EmptyState
                icon="🔍"
                title="কোনো ফলাফল পাওয়া যায়নি"
                description="আপনার ফিল্টারের শর্তাবলীর সাথে মিলে এমন কোনো লেনদেন নেই। অনুগ্রহ করে অন্য কোনো ফিল্টার নির্বাচন করুন বা রিসেট করুন।"
                actionLabel="সকল ফিল্টার মুছুন"
                onAction={handleResetFilters}
              />
            ) : (
              <EmptyState
                icon="📝"
                title="কোনো লেনদেন রেকর্ড নেই"
                description="আপনার আর্থিক হিসাব পরিচালনা করতে প্রথম লেনদেনটি যুক্ত করুন।"
                actionLabel="+ নতুন লেনদেন যুক্ত করুন"
                onAction={() => onAddTransaction('expense')}
              />
            )}
          </div>
        ) : (
          <>
            <div className="tx-table-responsive">
              <table className="tx-data-table" aria-label="লেনদেনের পূর্ণাঙ্গ তালিকা">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '12%' }}>
                      তারিখ
                    </th>
                    <th scope="col" style={{ width: '12%' }}>
                      ধরন
                    </th>
                    <th scope="col" style={{ width: '22%' }}>
                      হিসাব (Account)
                    </th>
                    <th scope="col" style={{ width: '16%' }}>
                      ক্যাটাগরি
                    </th>
                    <th scope="col" style={{ width: '20%' }}>
                      বিবরণ / নোট
                    </th>
                    <th scope="col" style={{ width: '18%', textAlign: 'right' }}>
                      পরিমাণ (টাকা)
                    </th>
                    <th scope="col" style={{ width: '10%', textAlign: 'center' }}>
                      কার্যক্রম
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((tx) => {
                    const isTransfer = tx.type === 'transfer';
                    const meta = TX_TYPE_META[tx.type] || TX_TYPE_META.expense;
                    const sourceAccName = accountMap.get(tx.accountId) || 'অজানা হিসাব';
                    const destAccName = tx.destinationAccountId
                      ? accountMap.get(tx.destinationAccountId) || 'অজানা গন্তব্য'
                      : '';

                    const formattedAmount = isBalanceHidden
                      ? maskedAmount
                      : `${meta.amountPrefix}${formatPaisaToBDT(tx.amountPaisa, {
                          showSymbol: true,
                        })}`;

                    const formattedFee =
                      isTransfer && tx.transferFeePaisa && tx.transferFeePaisa > 0n
                        ? isBalanceHidden
                          ? maskedAmount
                          : formatPaisaToBDT(tx.transferFeePaisa)
                        : null;

                    return (
                      <tr key={tx.id} className="tx-row-item">
                        {/* 1. Date */}
                        <td className="tx-cell-date">
                          <span className="date-main">{tx.date}</span>
                          <span className="date-rel">{formatRelativeBengaliDate(tx.date)}</span>
                        </td>

                        {/* 2. Type Badge */}
                        <td className="tx-cell-type">
                          <span className={`tx-type-pill ${meta.badgeClass}`}>
                            <span className="tx-pill-icon">{meta.icon}</span>
                            <span className="tx-pill-text">{meta.label}</span>
                          </span>
                        </td>

                        {/* 3. Account Route */}
                        <td className="tx-cell-account">
                          {isTransfer ? (
                            <div className="transfer-route-cell">
                              <span className="route-source" title={`উৎস: ${sourceAccName}`}>
                                {sourceAccName}
                              </span>
                              <span className="route-arrow" aria-hidden="true">
                                →
                              </span>
                              <span className="route-dest" title={`গন্তব্য: ${destAccName}`}>
                                {destAccName}
                              </span>
                            </div>
                          ) : (
                            <span className="account-tag" title={sourceAccName}>
                              🏦 {sourceAccName}
                            </span>
                          )}
                        </td>

                        {/* 4. Category */}
                        <td className="tx-cell-cat">
                          <span className="cat-pill">{tx.category}</span>
                        </td>

                        {/* 5. Note / Description */}
                        <td className="tx-cell-note">
                          <span className="note-text" title={tx.note || tx.category}>
                            {tx.note || <em className="empty-note">—</em>}
                          </span>
                        </td>

                        {/* 6. Amount */}
                        <td className={`tx-cell-amount ${meta.amountClass}`}>
                          <div className="amount-container">
                            <span className="main-amount">{formattedAmount}</span>
                            {formattedFee && (
                              <span className="transfer-fee-badge" title="স্থানান্তর ফি">
                                ফি: {formattedFee}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Actions */}
                        <td className="tx-cell-actions">
                          <div className="row-action-btns">
                            <button
                              type="button"
                              className="action-icon-btn edit-btn"
                              onClick={() => onEditTransaction(tx)}
                              aria-label={`লেনদেন সম্পাদনা: ${tx.note || tx.category}`}
                              title="সম্পাদনা করুন"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="action-icon-btn delete-btn"
                              onClick={() => onDeleteTransaction(tx)}
                              aria-label={`লেনদেন মুছুন: ${tx.note || tx.category}`}
                              title="মুছে ফেলুন"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 5. Pagination Controls */}
            {totalPages > 1 && (
              <div className="tx-pagination-bar" role="navigation" aria-label="পৃষ্ঠা পরিবর্তন">
                <div className="pagination-info">
                  মোট {toBengaliNumeral(result.transactions.length)}টির মধ্যে{' '}
                  {toBengaliNumeral((currentPage - 1) * ITEMS_PER_PAGE + 1)} -{' '}
                  {toBengaliNumeral(
                    Math.min(currentPage * ITEMS_PER_PAGE, result.transactions.length)
                  )}{' '}
                  দেখানো হচ্ছে
                </div>

                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="পূর্ববর্তী পৃষ্ঠা"
                  >
                    ‹ পূর্ববর্তী
                  </button>

                  <span className="pagination-current">
                    পৃষ্ঠা {toBengaliNumeral(currentPage)} / {toBengaliNumeral(totalPages)}
                  </span>

                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="পরবর্তী পৃষ্ঠা"
                  >
                    পরবর্তী ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
