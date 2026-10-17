/**
 * Personal Finance Super App - Main Application
 * Batch 1: Core Finance Engine & Persistent Transaction Management
 */

import { useState, useEffect, useRef } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { BalanceHero } from './components/dashboard/BalanceHero';
import { QuickActions } from './components/dashboard/QuickActions';
import { AccountGrid } from './components/dashboard/AccountGrid';
import { MonthlyChart } from './components/dashboard/MonthlyChart';
import { CategoryBreakdown } from './components/dashboard/CategoryBreakdown';
import { RecentTransactions } from './components/dashboard/RecentTransactions';
import { ErrorBanner } from './components/common/ErrorBanner';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { TransactionModal } from './components/transactions/TransactionModal';
import { TransferModal } from './components/transactions/TransferModal';
import { TransactionHistoryView } from './components/transactions/TransactionHistoryView';
import { BudgetOverviewView } from './components/budgets/BudgetOverviewView';
import { FinancialReportsView } from './components/reports/FinancialReportsView';
import { SavingsGoalsView } from './components/goals/SavingsGoalsView';
import { RecurringTransactionsView } from './components/recurring/RecurringTransactionsView';
import { AccountReconciliationView } from './components/reconciliation/AccountReconciliationView';
import { CashFlowForecastView } from './components/forecast/CashFlowForecastView';
import { DashboardCustomizerModal } from './components/dashboard/DashboardCustomizerModal';
import { BudgetSummaryWidget } from './components/dashboard/BudgetSummaryWidget';
import { GoalsSummaryWidget } from './components/dashboard/GoalsSummaryWidget';
import { BackupModal } from './components/backup/BackupModal';
import { AccountModal } from './components/accounts/AccountModal';
import { AuthModal } from './components/auth/AuthModal';
import { MigrationModal } from './components/auth/MigrationModal';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import {
  inspectLocalDataForMigration,
  MigrationSummary,
} from './services/migrationService';
import { SupabaseStorageEngine } from './services/supabaseStorageEngine';
import {
  persistentFinanceService,
  PersistentFinanceService,
} from './services/persistentFinanceService';
import { Account, AccountType, Transaction, TransactionType } from './types/dashboard';
import {
  DashboardPreferences,
} from './types/recurringAndReconciliation';
import { DEFAULT_DASHBOARD_PREFERENCES } from './data/mockDashboardData';
import { formatPaisaToBDT } from './utils/currency';

interface FeedbackToast {
  type: 'success' | 'error' | 'info';
  message: string;
}

export type AppView =
  | 'dashboard'
  | 'history'
  | 'budgets'
  | 'reports'
  | 'goals'
  | 'recurring'
  | 'reconciliation'
  | 'forecast';

function AppContent() {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [feedbackToast, setFeedbackToast] = useState<FeedbackToast | null>(null);

  // Dashboard Preferences & Customizer
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(
    DEFAULT_DASHBOARD_PREFERENCES
  );
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);

  // Modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [txModalDefaultType, setTxModalDefaultType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [editingTransfer, setEditingTransfer] = useState<Transaction | null>(null);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Auth & Cloud Storage State
  const { user, authMode } = useAuth();
  const [activeService, setActiveService] = useState<PersistentFinanceService>(persistentFinanceService);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState<boolean>(false);
  const [localMigrationSummary, setLocalMigrationSummary] = useState<MigrationSummary | null>(null);
  const [cloudStorageEngine, setCloudStorageEngine] = useState<SupabaseStorageEngine | null>(null);
  const promptedMigrationUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (user && authMode === 'cloud') {
      const cloudEngine = new SupabaseStorageEngine(user.id);
      setCloudStorageEngine(cloudEngine);
      const cloudService = new PersistentFinanceService(cloudEngine);
      setActiveService(cloudService);

      // Check if local non-empty data exists and prompt migration once per user
      if (promptedMigrationUserRef.current !== user.id) {
        promptedMigrationUserRef.current = user.id;
        inspectLocalDataForMigration().then(({ hasData, summary }) => {
          if (hasData) {
            setLocalMigrationSummary(summary);
            setIsMigrationModalOpen(true);
          }
        });
      }
    } else {
      setCloudStorageEngine(null);
      setActiveService(persistentFinanceService);
    }
  }, [user, authMode]);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const {
    data,
    isLoading,
    error,
    refetch,
    isBalanceHidden,
    toggleBalanceVisibility,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    createAccount,
    updateAccount,
    deleteAccount,
    getFilteredTransactions,
    getAllTransactions,
    restoreBackup,
    createBudget,
    updateBudget,
    deleteBudget,
    getMonthlyBudgetProgress,
    getSavingsGoals,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addGoalContribution,
    getGoalContributions,
    getFinancialReport,
    getRecurringTransactions,
    createRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    previewDueRecurringTransactions,
    generateDueRecurringTransactions,
    getDashboardPreferences,
    saveDashboardPreferences,
    resetDashboardPreferences,
    calculateHistoricalAccountBalance,
    reconcileAccount,
    createReconciliationAdjustment,
    getAccountReconciliations,
    getCashFlowForecast,
  } = useDashboardData(selectedYear, selectedMonth, activeService);

  // Load saved dashboard preferences on mount
  useEffect(() => {
    getDashboardPreferences()
      .then((prefs) => {
        if (prefs && Array.isArray(prefs.widgets) && prefs.widgets.length > 0) {
          setDashboardPreferences(prefs);
        }
      })
      .catch(console.error);
  }, [getDashboardPreferences]);

  // Refresh all transactions whenever data changes
  useEffect(() => {
    getAllTransactions().then(setAllTransactions).catch(console.error);
  }, [data, getAllTransactions]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!feedbackToast) return;
    const timer = setTimeout(() => {
      setFeedbackToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [feedbackToast]);

  // Synchronize active section with URL hash and scrolling
  useEffect(() => {
    const validSections = ['dashboard', 'transactions', 'accounts', 'reports'];

    const initialHash = window.location.hash.replace('#', '');
    if (validSections.includes(initialHash)) {
      setActiveSection(initialHash);
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (validSections.includes(hash)) {
        setActiveSection(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    let observer: IntersectionObserver | null = null;
    const elements = validSections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if ('IntersectionObserver' in window && elements.length > 0) {
      observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries.filter((entry) => entry.isIntersecting);
          if (visibleEntries.length > 0) {
            visibleEntries.sort(
              (a, b) =>
                Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top)
            );
            setActiveSection(visibleEntries[0].target.id);
          }
        },
        {
          rootMargin: '-80px 0px -50% 0px',
          threshold: [0, 0.25, 0.5],
        }
      );

      elements.forEach((el) => observer?.observe(el));
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      observer?.disconnect();
    };
  }, []);

  // =========================================================================
  // TRANSACTION ACTION HANDLERS
  // =========================================================================

  const handleOpenAddExpense = () => {
    setEditingTx(null);
    setTxModalDefaultType('expense');
    setIsTxModalOpen(true);
  };

  const handleOpenAddIncome = () => {
    setEditingTx(null);
    setTxModalDefaultType('income');
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    if (tx.type === 'transfer') {
      setEditingTransfer(tx);
      setIsTransferModalOpen(true);
    } else {
      setEditingTx(tx);
      setTxModalDefaultType(tx.type);
      setIsTxModalOpen(true);
    }
  };

  const handleSaveTransfer = async (transferData: {
    type: 'transfer';
    amountPaisa: bigint;
    accountId: string;
    destinationAccountId: string;
    transferFeePaisa?: bigint;
    category: string;
    note?: string;
    date: string;
  }) => {
    try {
      if (editingTransfer) {
        await updateTransaction({
          ...editingTransfer,
          ...transferData,
        });
        setFeedbackToast({
          type: 'success',
          message: `সফল: স্থানান্তর লেনদেন সফলভাবে হালনাগাদ করা হয়েছে (${formatPaisaToBDT(
            transferData.amountPaisa
          )})।`,
        });
      } else {
        await addTransaction(transferData);
        setFeedbackToast({
          type: 'success',
          message: `সফল: ${formatPaisaToBDT(
            transferData.amountPaisa
          )} সফলভাবে স্থানান্তর করা হয়েছে!`,
        });
      }
      setIsTransferModalOpen(false);
      setEditingTransfer(null);
    } catch (err) {
      setFeedbackToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'স্থানান্তর সংরক্ষণ ব্যর্থ হয়েছে।',
      });
      throw err;
    }
  };

  const handleSaveTransaction = async (txData: {
    type: TransactionType;
    amountPaisa: bigint;
    accountId: string;
    category: string;
    note?: string;
    date: string;
  }) => {
    try {
      if (editingTx) {
        await updateTransaction({
          ...editingTx,
          ...txData,
        });
        setFeedbackToast({
          type: 'success',
          message: `সফল: লেনদেনটি সফলভাবে হালনাগাদ করা হয়েছে (${formatPaisaToBDT(txData.amountPaisa)})।`,
        });
      } else {
        await addTransaction(txData);
        setFeedbackToast({
          type: 'success',
          message:
            txData.type === 'income'
              ? `সফল: নতুন আয় ${formatPaisaToBDT(txData.amountPaisa)} সফলভাবে যুক্ত হয়েছে!`
              : `সফল: নতুন ব্যয় ${formatPaisaToBDT(txData.amountPaisa)} সফলভাবে যুক্ত হয়েছে!`,
        });
      }
    } catch (err) {
      setFeedbackToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'লেনদেন সংরক্ষণ করতে সমস্যা হয়েছে।',
      });
      throw err;
    }
  };

  const handleDeleteTxPrompt = (tx: Transaction) => {
    const isTransfer = tx.type === 'transfer';
    const title = isTransfer
      ? 'স্থানান্তর লেনদেন মুছে ফেলার নিশ্চিতকরণ'
      : 'লেনদেন মুছে ফেলার নিশ্চিতকরণ';
    const message = isTransfer
      ? `আপনি কি নিশ্চিতভাবে ${formatPaisaToBDT(
          tx.amountPaisa
        )} স্থানান্তর লেনদেনটি মুছে ফেলতে চান? উভয় অ্যাকাউন্টের ব্যালেন্স ও স্থানান্তর ফি পূর্বাবস্থায় সমন্বয় করা হবে।`
      : `আপনি কি নিশ্চিতভাবে "${tx.note || tx.category}" (${formatPaisaToBDT(
          tx.amountPaisa
        )}) লেনদেনটি মুছে ফেলতে চান? সংশ্লিষ্ট অ্যাকাউন্টের ব্যালেন্স পূর্বাবস্থায় সমন্বয় করা হবে।`;

    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmLabel: 'হ্যাঁ, মুছে ফেলুন',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteTransaction(tx.id);
          setIsTxModalOpen(false);
          setIsTransferModalOpen(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setFeedbackToast({
            type: 'success',
            message: 'সফল: লেনদেনটি সফলভাবে মুছে ফেলা হয়েছে এবং ব্যালেন্স সমন্বয় করা হয়েছে।',
          });
        } catch (err) {
          setFeedbackToast({
            type: 'error',
            message: err instanceof Error ? err.message : 'লেনদেন মুছতে সমস্যা হয়েছে।',
          });
        }
      },
    });
  };

  // =========================================================================
  // ACCOUNT ACTION HANDLERS
  // =========================================================================

  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (account: Account) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (accountData: {
    name: string;
    type: AccountType;
    accountNumberMasked?: string;
    initialBalancePaisa?: bigint;
  }) => {
    try {
      if (editingAccount) {
        await updateAccount({
          ...editingAccount,
          name: accountData.name,
          type: accountData.type,
          accountNumberMasked: accountData.accountNumberMasked,
        });
        setFeedbackToast({
          type: 'success',
          message: `সফল: "${accountData.name}" অ্যাকাউন্ট সফলভাবে হালনাগাদ করা হয়েছে!`,
        });
      } else {
        await createAccount({
          name: accountData.name,
          type: accountData.type,
          initialBalancePaisa: accountData.initialBalancePaisa || 0n,
          accountNumberMasked: accountData.accountNumberMasked,
        });
        setFeedbackToast({
          type: 'success',
          message: `সফল: "${accountData.name}" নতুন অ্যাকাউন্ট তৈরি হয়েছে!`,
        });
      }
    } catch (err) {
      setFeedbackToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'অ্যাকাউন্ট সংরক্ষণ ব্যর্থ হয়েছে।',
      });
      throw err;
    }
  };

  const handleDeleteAccountPrompt = (accountId: string) => {
    const acc = data?.accounts.find((a) => a.id === accountId);
    const accName = acc?.name || 'অ্যাকাউন্ট';

    setConfirmDialog({
      isOpen: true,
      title: 'অ্যাকাউন্ট মুছে ফেলার নিশ্চিতকরণ',
      message: `আপনি কি নিশ্চিতভাবে "${accName}" অ্যাকাউন্টটি মুছে ফেলতে চান? যদি এই অ্যাকাউন্টে কোনো লেনদেন বিদ্যমান থাকে, তবে তা এতিম (orphan) হওয়া রোধে মোছা যাবে না।`,
      confirmLabel: 'হ্যাঁ, অ্যাকাউন্ট মুছুন',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteAccount(accountId);
          setIsAccountModalOpen(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setFeedbackToast({
            type: 'success',
            message: `সফল: "${accName}" অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।`,
          });
        } catch (err) {
          setFeedbackToast({
            type: 'error',
            message: err instanceof Error ? err.message : 'অ্যাকাউন্ট মোছা যায়নি।',
          });
        }
      },
    });
  };

  const handleTransferClick = () => {
    setEditingTransfer(null);
    setIsTransferModalOpen(true);
  };

  const handleNavigate = (section: string) => {
    setActiveSection(section);
    if (section === 'transactions') {
      setCurrentView('history');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'budgets') {
      setCurrentView('budgets');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'reports') {
      setCurrentView('reports');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'goals') {
      setCurrentView('goals');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'recurring') {
      setCurrentView('recurring');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'reconciliation') {
      setCurrentView('reconciliation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'forecast') {
      setCurrentView('forecast');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentView('dashboard');
      setTimeout(() => {
        const el = document.getElementById(section);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  };

  const activeNavSection = currentView === 'dashboard' ? activeSection : currentView === 'history' ? 'transactions' : currentView;

  return (
    <div className="app-shell">
      {/* 1. Header with Month Selection and Desktop Nav */}
      <Header
        year={selectedYear}
        month={selectedMonth}
        onMonthChange={(y, m) => {
          setSelectedYear(y);
          setSelectedMonth(m);
        }}
        activeSection={activeNavSection}
        onNavigate={handleNavigate}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      <main className="main-content" id="main-content" role="main">
        {/* Error State Banner */}
        {error && <ErrorBanner message={error} onRetry={refetch} />}

        {/* Action Feedback Toast Notification */}
        {feedbackToast && (
          <div
            className={
              feedbackToast.type === 'success'
                ? 'app-toast-success'
                : feedbackToast.type === 'error'
                ? 'app-toast-error'
                : 'demo-toast'
            }
            role="status"
            aria-live="polite"
          >
            <span>
              {feedbackToast.type === 'success'
                ? '✓ '
                : feedbackToast.type === 'error'
                ? '⚠️ '
                : 'ℹ️ '}
              {feedbackToast.message}
            </span>
            <button
              type="button"
              className={
                feedbackToast.type === 'info' ? 'demo-toast-close' : 'app-toast-close'
              }
              onClick={() => setFeedbackToast(null)}
              aria-label="বিজ্ঞপ্তি বন্ধ করুন"
            >
              ×
            </button>
          </div>
        )}

        {/* View Switcher: History, Budgets, Reports, Goals vs Dashboard Grid */}
        {currentView === 'history' ? (
          <TransactionHistoryView
            accounts={data?.accounts ?? []}
            isBalanceHidden={isBalanceHidden}
            onBackToDashboard={() => {
              setCurrentView('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAddTransaction={(type) => {
              setEditingTx(null);
              setTxModalDefaultType(type || 'expense');
              setIsTxModalOpen(true);
            }}
            onTransfer={handleTransferClick}
            onEditTransaction={handleOpenEditTx}
            onDeleteTransaction={handleDeleteTxPrompt}
            onOpenBackup={() => setIsBackupModalOpen(true)}
            getFilteredTransactions={getFilteredTransactions}
            allTransactions={allTransactions}
          />
        ) : currentView === 'budgets' ? (
          <BudgetOverviewView
            isBalanceHidden={isBalanceHidden}
            getMonthlyBudgetProgress={getMonthlyBudgetProgress}
            createBudget={createBudget}
            updateBudget={updateBudget}
            deleteBudget={deleteBudget}
          />
        ) : currentView === 'reports' ? (
          <FinancialReportsView
            isBalanceHidden={isBalanceHidden}
            getFinancialReport={getFinancialReport}
          />
        ) : currentView === 'goals' ? (
          <SavingsGoalsView
            isBalanceHidden={isBalanceHidden}
            getSavingsGoals={getSavingsGoals}
            createSavingsGoal={createSavingsGoal}
            updateSavingsGoal={updateSavingsGoal}
            deleteSavingsGoal={deleteSavingsGoal}
            addGoalContribution={addGoalContribution}
            getGoalContributions={getGoalContributions}
          />
        ) : currentView === 'recurring' ? (
          <RecurringTransactionsView
            accounts={data?.accounts ?? []}
            isBalanceHidden={isBalanceHidden}
            getRecurringTransactions={getRecurringTransactions}
            createRecurringTransaction={createRecurringTransaction}
            updateRecurringTransaction={updateRecurringTransaction}
            deleteRecurringTransaction={deleteRecurringTransaction}
            previewDueRecurringTransactions={previewDueRecurringTransactions}
            generateDueRecurringTransactions={generateDueRecurringTransactions}
          />
        ) : currentView === 'reconciliation' ? (
          <AccountReconciliationView
            accounts={data?.accounts ?? []}
            isBalanceHidden={isBalanceHidden}
            getAccountReconciliations={getAccountReconciliations}
            calculateHistoricalAccountBalance={calculateHistoricalAccountBalance}
            reconcileAccount={reconcileAccount}
            createReconciliationAdjustment={createReconciliationAdjustment}
          />
        ) : currentView === 'forecast' ? (
          <CashFlowForecastView
            isBalanceHidden={isBalanceHidden}
            getCashFlowForecast={getCashFlowForecast}
          />
        ) : (
          <div>
            {/* Customize Dashboard Control Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setIsCustomizerOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                aria-label="ড্যাশবোর্ড উইজেট কাস্টমাইজ করুন"
              >
                <span>⚙️</span>
                <span>ড্যাশবোর্ড কাস্টমাইজ করুন</span>
              </button>
            </div>

            <div className="dashboard-grid">
              {/* Left Column (Primary Financial Feed) */}
              <div className="dashboard-main-col">
                {(() => {
                  const sorted = [...dashboardPreferences.widgets]
                    .sort((a, b) => a.order - b.order)
                    .filter((w) => w.visible && w.column === 'main');

                  return sorted.map((w) => {
                    switch (w.id) {
                      case 'total_balance':
                        return (
                          <div key={w.id} id="dashboard">
                            <BalanceHero
                              totalNetBalancePaisa={data?.totalNetBalancePaisa ?? 0n}
                              totalIncomePaisa={data?.monthlySummary.totalIncomePaisa ?? 0n}
                              totalExpensePaisa={data?.monthlySummary.totalExpensePaisa ?? 0n}
                              isBalanceHidden={isBalanceHidden}
                              onToggleVisibility={toggleBalanceVisibility}
                              isLoading={isLoading}
                            />
                          </div>
                        );
                      case 'quick_actions':
                        return (
                          <QuickActions
                            key={w.id}
                            onAddExpense={handleOpenAddExpense}
                            onAddIncome={handleOpenAddIncome}
                            onTransfer={handleTransferClick}
                          />
                        );
                      case 'recent_transactions':
                        return (
                          <div key={w.id} id="transactions">
                            <RecentTransactions
                              transactions={data?.recentTransactions ?? []}
                              accounts={data?.accounts ?? []}
                              isBalanceHidden={isBalanceHidden}
                              isLoading={isLoading}
                              onAddNewTransaction={handleOpenAddExpense}
                              onEditTransaction={handleOpenEditTx}
                              onDeleteTransaction={(tx) => handleDeleteTxPrompt(tx)}
                              onViewAll={() => {
                                setCurrentView('history');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            />
                          </div>
                        );
                      case 'budget_status':
                        return (
                          <BudgetSummaryWidget
                            key={w.id}
                            getMonthlyBudgetProgress={getMonthlyBudgetProgress}
                            year={selectedYear}
                            month={selectedMonth}
                            isBalanceHidden={isBalanceHidden}
                            onViewAllBudgets={() => handleNavigate('budgets')}
                          />
                        );
                      case 'savings_goals':
                        return (
                          <GoalsSummaryWidget
                            key={w.id}
                            getSavingsGoals={getSavingsGoals}
                            isBalanceHidden={isBalanceHidden}
                            onViewAllGoals={() => handleNavigate('goals')}
                          />
                        );
                      default:
                        return null;
                    }
                  });
                })()}
              </div>

              {/* Right Column (Accounts & Analytics) */}
              <div className="dashboard-side-col">
                {(() => {
                  const sorted = [...dashboardPreferences.widgets]
                    .sort((a, b) => a.order - b.order)
                    .filter((w) => w.visible && w.column === 'side');

                  return sorted.map((w) => {
                    switch (w.id) {
                      case 'accounts':
                        return (
                          <div key={w.id} id="accounts">
                            <AccountGrid
                              accounts={data?.accounts ?? []}
                              isBalanceHidden={isBalanceHidden}
                              isLoading={isLoading}
                              onAddAccount={handleOpenAddAccount}
                              onEditAccount={handleOpenEditAccount}
                            />
                          </div>
                        );
                      case 'monthly_chart':
                        return (
                          <div key={w.id} id="reports">
                            <MonthlyChart
                              summary={data?.monthlySummary ?? null}
                              isBalanceHidden={isBalanceHidden}
                              isLoading={isLoading}
                            />
                          </div>
                        );
                      case 'category_breakdown':
                        return (
                          <CategoryBreakdown
                            key={w.id}
                            categories={data?.categoryExpenses ?? []}
                            isBalanceHidden={isBalanceHidden}
                            isLoading={isLoading}
                          />
                        );
                      case 'budget_status':
                        return (
                          <BudgetSummaryWidget
                            key={w.id}
                            getMonthlyBudgetProgress={getMonthlyBudgetProgress}
                            year={selectedYear}
                            month={selectedMonth}
                            isBalanceHidden={isBalanceHidden}
                            onViewAllBudgets={() => handleNavigate('budgets')}
                          />
                        );
                      case 'savings_goals':
                        return (
                          <GoalsSummaryWidget
                            key={w.id}
                            getSavingsGoals={getSavingsGoals}
                            isBalanceHidden={isBalanceHidden}
                            onViewAllGoals={() => handleNavigate('goals')}
                          />
                        );
                      default:
                        return null;
                    }
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <BottomNav
        activeSection={currentView === 'history' ? 'transactions' : currentView}
        onNavigate={handleNavigate}
        onQuickActionClick={handleOpenAddExpense}
      />

      {/* Semantic Footer */}
      <footer className="site-footer" role="contentinfo">
        <div className="footer-container">
          <p>© ব্যক্তিগত অর্থ ব্যবস্থাপনা সুপার অ্যাপ — পার্সোনাল ফাইন্যান্স ইঞ্জিন (Batch 4)</p>
        </div>
      </footer>

      {/* Modal 1: Transaction Modal (Add/Edit Income/Expense) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        onDelete={async (id) => {
          const tx = allTransactions.find((t) => t.id === id);
          if (tx) {
            handleDeleteTxPrompt(tx);
          }
        }}
        accounts={data?.accounts || []}
        initialTransaction={editingTx}
        defaultType={txModalDefaultType}
        defaultYear={selectedYear}
        defaultMonth={selectedMonth}
      />

      {/* Modal 2: Transfer Modal (Account-to-Account Transfers) */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setEditingTransfer(null);
        }}
        onSave={handleSaveTransfer}
        onDelete={async (id) => {
          const tx = allTransactions.find((t) => t.id === id);
          if (tx) {
            handleDeleteTxPrompt(tx);
          }
        }}
        accounts={data?.accounts || []}
        initialTransfer={editingTransfer}
        defaultYear={selectedYear}
        defaultMonth={selectedMonth}
      />

      {/* Modal 3: Backup & Restore Modal (CSV & JSON v3.0) */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        accounts={data?.accounts || []}
        transactions={allTransactions}
        onRestore={async (
          accounts,
          transactions,
          budgets,
          savingsGoals,
          goalContributions,
          recurring,
          prefs,
          reconciliations
        ) => {
          await restoreBackup(
            accounts,
            transactions,
            budgets,
            savingsGoals,
            goalContributions,
            recurring,
            prefs,
            reconciliations
          );
          if (prefs) {
            setDashboardPreferences(prefs);
          }
        }}
        onSuccessMessage={(msg) => setFeedbackToast({ type: 'success', message: msg })}
        onErrorMessage={(msg) => setFeedbackToast({ type: 'error', message: msg })}
      />

      {/* Modal 4: Account Modal (Add/Edit) */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        onDelete={async (id) => {
          handleDeleteAccountPrompt(id);
        }}
        initialAccount={editingAccount}
      />

      {/* Modal 5: Dashboard Customizer Modal */}
      <DashboardCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        preferences={dashboardPreferences}
        onSavePreferences={async (prefs) => {
          const saved = await saveDashboardPreferences(prefs);
          setDashboardPreferences(saved);
          setFeedbackToast({ type: 'success', message: 'ড্যাশবোর্ড পছন্দসমূহ সফলভাবে সংরক্ষিত হয়েছে!' });
        }}
        onResetPreferences={async () => {
          const reset = await resetDashboardPreferences();
          setDashboardPreferences(reset);
          setFeedbackToast({ type: 'success', message: 'ড্যাশবোর্ড ডিফল্ট অবস্থায় ফিরিয়ে আনা হয়েছে।' });
        }}
      />

      {/* Modal 5: Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Auth & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccessMessage={(msg) => setFeedbackToast({ type: 'success', message: msg })}
        onErrorMessage={(msg) => setFeedbackToast({ type: 'error', message: msg })}
      />

      {/* Safe Local Data Migration Modal */}
      {user && cloudStorageEngine && localMigrationSummary && (
        <MigrationModal
          isOpen={isMigrationModalOpen}
          onClose={() => setIsMigrationModalOpen(false)}
          userId={user.id}
          userEmail={user.email}
          localSummary={localMigrationSummary}
          cloudEngine={cloudStorageEngine}
          onMigrationComplete={() => {
            setIsMigrationModalOpen(false);
            refetch();
            setFeedbackToast({
              type: 'success',
              message: 'লোকাল ডেটা সফলভাবে ক্লাউডে স্থানান্তরিত হয়েছে!',
            });
          }}
          onKeepClean={() => {
            setIsMigrationModalOpen(false);
            refetch();
            setFeedbackToast({
              type: 'info',
              message: 'নতুন ক্লাউড অ্যাকাউন্ট প্রস্তুত। লোকাল ডেটা ডিভাইসে অক্ষত রয়েছে।',
            });
          }}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
