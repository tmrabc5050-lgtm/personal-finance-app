import React, { useState, useMemo } from 'react';
import { Account, AccountType, Transaction, TransactionType } from '../../types/dashboard';
import { formatPaisaToBDT } from '../../utils/currency';

export interface WalletsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  isBalanceHidden: boolean;
  onToggleHideBalance: () => void;
  onOpenAddAccount: () => void;
  onOpenEditAccount: (account: Account) => void;
  onOpenTransfer: (sourceAccountId?: string) => void;
  onOpenAddTransaction: (type: TransactionType, accountId?: string) => void;
  onBackToDashboard: () => void;
  onAutoSeedBangladeshiWallets: () => Promise<void>;
}

export const WalletsView: React.FC<WalletsViewProps> = ({
  accounts,
  transactions,
  isBalanceHidden,
  onToggleHideBalance,
  onOpenAddAccount,
  onOpenEditAccount,
  onOpenTransfer,
  onOpenAddTransaction,
  onBackToDashboard,
  onAutoSeedBangladeshiWallets,
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Total balance across all accounts
  const totalBalancePaisa = useMemo(() => {
    return accounts.reduce((acc, a) => acc + a.balancePaisa, 0n);
  }, [accounts]);

  // Breakdown by wallet category
  const breakdown = useMemo(() => {
    let mfsBalance = 0n; // Mobile Financial Services (bKash, Nagad, Rocket)
    let bankBalance = 0n;
    let cashBalance = 0n;
    let otherBalance = 0n;

    accounts.forEach((a) => {
      if (a.type === 'bkash' || a.type === 'nagad') {
        mfsBalance += a.balancePaisa;
      } else if (a.type === 'bank') {
        bankBalance += a.balancePaisa;
      } else if (a.type === 'cash') {
        cashBalance += a.balancePaisa;
      } else {
        otherBalance += a.balancePaisa;
      }
    });

    return { mfsBalance, bankBalance, cashBalance, otherBalance };
  }, [accounts]);

  // Check if standard Bangladeshi wallets are present
  const hasBkash = accounts.some((a) => a.type === 'bkash');
  const hasNagad = accounts.some((a) => a.type === 'nagad');
  const hasBank = accounts.some((a) => a.type === 'bank');
  const hasMissingBangladeshiWallets = !hasBkash || !hasNagad || !hasBank;

  // Handle auto-seeding standard Bangladeshi wallets
  const handleAutoSeed = async () => {
    setIsSeeding(true);
    try {
      await onAutoSeedBangladeshiWallets();
    } finally {
      setIsSeeding(false);
    }
  };

  // Filter transactions for the selected wallet (if any)
  const walletTransactions = useMemo(() => {
    if (!selectedWalletId) return [];
    return transactions.filter(
      (tx) => tx.accountId === selectedWalletId || tx.destinationAccountId === selectedWalletId
    );
  }, [transactions, selectedWalletId]);

  const selectedWallet = accounts.find((a) => a.id === selectedWalletId);

  const getWalletBadgeClass = (type: AccountType) => {
    switch (type) {
      case 'bkash':
        return 'badge-bkash';
      case 'nagad':
        return 'badge-nagad';
      case 'bank':
        return 'badge-bank';
      case 'cash':
        return 'badge-cash';
      default:
        return 'badge-other';
    }
  };

  const getWalletTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'bkash':
        return 'বিকাশ (bKash)';
      case 'nagad':
        return 'নগদ (Nagad)';
      case 'bank':
        return 'ব্যাংক (Bank)';
      case 'cash':
        return 'হাতে নগদ (Cash)';
      default:
        return 'অন্যান্য ওয়ালেট (Wallet)';
    }
  };

  const getWalletIcon = (type: AccountType) => {
    switch (type) {
      case 'bkash':
        return '📱';
      case 'nagad':
        return '⚡';
      case 'bank':
        return '🏦';
      case 'cash':
        return '💵';
      default:
        return '💳';
    }
  };

  return (
    <div className="wallets-view-container">
      {/* Top Header & Navigation */}
      <div className="wallets-header-bar">
        <div className="wallets-header-left">
          <button
            type="button"
            className="btn-back-dashboard"
            onClick={onBackToDashboard}
            aria-label="ড্যাশবোর্ডে ফিরুন"
          >
            ← ড্যাশবোর্ড
          </button>
          <div>
            <h1 className="wallets-title">👛 আমার ওয়ালেট ও অ্যাকাউন্টস</h1>
            <p className="wallets-subtitle">
              আপনার নগদ টাকা, বিকাশ, নগদ, ব্যাংক ও অন্যান্য অ্যাকাউন্টের ব্যালেন্স ও স্থানান্তর
            </p>
          </div>
        </div>

        <div className="wallets-header-actions">
          <button
            type="button"
            className="btn-wallet-action-transfer"
            onClick={() => onOpenTransfer()}
          >
            <span>⇄</span> স্থানান্তর
          </button>
          <button
            type="button"
            className="btn-wallet-action-add"
            onClick={onOpenAddAccount}
          >
            <span>+</span> নতুন ওয়ালেট
          </button>
        </div>
      </div>

      {/* Total Balance Hero Card */}
      <div className="wallets-hero-card">
        <div className="wallets-hero-top">
          <span className="wallets-hero-label">সর্বমোট ব্যালেন্স (সমস্ত ওয়ালেট)</span>
          <button
            type="button"
            className="privacy-toggle-btn"
            onClick={onToggleHideBalance}
            title={isBalanceHidden ? 'ব্যালেন্স দেখুন' : 'ব্যালেন্স লুকান'}
          >
            {isBalanceHidden ? '👁️ প্রকাশ' : '🔒 লুকান'}
          </button>
        </div>
        <div className="wallets-hero-amount">
          {isBalanceHidden ? '••••••••' : formatPaisaToBDT(totalBalancePaisa)}
        </div>

        {/* Wealth Breakdown Chips */}
        <div className="wallets-breakdown-row">
          <div className="wallet-chip chip-mfs">
            <span className="chip-label">📱 মোবাইল ব্যাংকিং</span>
            <span className="chip-amount">
              {isBalanceHidden ? '••••••' : formatPaisaToBDT(breakdown.mfsBalance)}
            </span>
          </div>
          <div className="wallet-chip chip-bank">
            <span className="chip-label">🏦 ব্যাংক হিসাব</span>
            <span className="chip-amount">
              {isBalanceHidden ? '••••••' : formatPaisaToBDT(breakdown.bankBalance)}
            </span>
          </div>
          <div className="wallet-chip chip-cash">
            <span className="chip-label">💵 হাতে থাকা ক্যাশ</span>
            <span className="chip-amount">
              {isBalanceHidden ? '••••••' : formatPaisaToBDT(breakdown.cashBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-Add Popular Bangladeshi Wallets Banner (if not already added) */}
      {hasMissingBangladeshiWallets && (
        <div className="bangladesh-wallets-banner">
          <div className="banner-text-content">
            <div className="banner-title">
              <span className="banner-flag">🇧🇩</span> জনপ্রিয় বাংলাদেশি ওয়ালেট যুক্ত করুন
            </div>
            <div className="banner-desc">
              বিকাশ, নগদ, এবং ব্যাংক অ্যাকাউন্টগুলো এক ক্লিকেই আপনার তালিকায় যোগ করে নিন।
            </div>
          </div>
          <button
            type="button"
            className="btn-autoseed-wallets"
            onClick={handleAutoSeed}
            disabled={isSeeding}
          >
            {isSeeding ? 'যুক্ত হচ্ছে...' : '⚡ বাংলাদেশি ওয়ালেটসমূহ যোগ করুন'}
          </button>
        </div>
      )}

      {/* Wallets Grid List */}
      <div className="wallets-grid-header">
        <h2 className="section-title">সক্রিয় ওয়ালেটসমূহ ({accounts.length}টি)</h2>
        <span className="section-hint">যেকোনো ওয়ালেটে ক্লিক করে লেনদেনের হিসাব দেখুন</span>
      </div>

      <div className="wallets-card-grid">
        {accounts.map((account) => {
          const isSelected = selectedWalletId === account.id;
          return (
            <div
              key={account.id}
              className={`wallet-glass-card ${isSelected ? 'wallet-card-selected' : ''}`}
              onClick={() => setSelectedWalletId(isSelected ? null : account.id)}
            >
              <div className="wallet-card-header">
                <div className="wallet-card-brand">
                  <span className="wallet-type-icon">{getWalletIcon(account.type)}</span>
                  <div>
                    <h3 className="wallet-card-name">{account.name}</h3>
                    <span className="wallet-card-mask">
                      {account.accountNumberMasked || getWalletTypeLabel(account.type)}
                    </span>
                  </div>
                </div>
                <span className={`account-type-badge ${getWalletBadgeClass(account.type)}`}>
                  {account.type.toUpperCase()}
                </span>
              </div>

              <div className="wallet-card-balance-box">
                <span className="balance-label">বর্তমান স্থিতি</span>
                <div className="wallet-card-balance">
                  {isBalanceHidden ? '••••••' : formatPaisaToBDT(account.balancePaisa)}
                </div>
              </div>

              {/* Action Buttons for this Wallet */}
              <div
                className="wallet-card-actions"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="btn-wallet-deposit"
                  onClick={() => onOpenAddTransaction('income', account.id)}
                  title="এই ওয়ালেটে আয়/টাকা যোগ করুন"
                >
                  + আয় যোগ
                </button>
                <button
                  type="button"
                  className="btn-wallet-withdraw"
                  onClick={() => onOpenAddTransaction('expense', account.id)}
                  title="এই ওয়ালেট থেকে ব্যয়/খরচ করুন"
                >
                  - ব্যয়
                </button>
                <button
                  type="button"
                  className="btn-wallet-transfer-item"
                  onClick={() => onOpenTransfer(account.id)}
                  title="অন্য ওয়ালেটে টাকা পাঠান"
                >
                  ⇄
                </button>
                <button
                  type="button"
                  className="btn-wallet-edit-item"
                  onClick={() => onOpenEditAccount(account)}
                  title="ওয়ালেটের তথ্য এডিট করুন"
                >
                  ⚙️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Wallet Detail & Transactions Drawer */}
      {selectedWallet && (
        <div className="wallet-detail-section">
          <div className="wallet-detail-header">
            <h3>
              {selectedWallet.name} - লেনদেনের বিবরণ ({walletTransactions.length}টি)
            </h3>
            <button
              type="button"
              className="btn-close-detail"
              onClick={() => setSelectedWalletId(null)}
            >
              ✕ বন্ধ করুন
            </button>
          </div>

          {walletTransactions.length === 0 ? (
            <div className="wallet-tx-empty">
              <span>এই ওয়ালেটে এখনো কোনো লেনদেন নথিভুক্ত করা হয়নি।</span>
            </div>
          ) : (
            <div className="wallet-tx-table-wrap">
              <table className="tx-data-table">
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>ধরণ ও বিবরণ</th>
                    <th>ক্যাটাগরি</th>
                    <th style={{ textAlign: 'right' }}>পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  {walletTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';
                    return (
                      <tr key={tx.id} className="tx-row-item">
                        <td>{tx.date}</td>
                        <td>
                          <strong>{tx.type === 'transfer' ? 'ওয়ালেট স্থানান্তর' : tx.note || 'লেনদেন'}</strong>
                        </td>
                        <td>
                          <span className="cat-pill">{tx.category || 'সাধারণ'}</span>
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 'bold',
                            color: isIncome
                              ? 'var(--color-income-text)'
                              : isTransfer
                              ? 'var(--color-transfer-text)'
                              : 'var(--color-expense-text)',
                          }}
                        >
                          {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}
                          {isBalanceHidden ? '••••••' : formatPaisaToBDT(tx.amountPaisa)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
