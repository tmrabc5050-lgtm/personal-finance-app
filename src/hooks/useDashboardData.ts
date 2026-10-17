/**
 * Personal Finance Super App - Dashboard Data & Engine Hook
 * Batch 1: Core Finance Engine Implementation
 *
 * Connects the UI to the PersistentFinanceService.
 * Exposes reactive dashboard state and atomic financial mutation actions.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  persistentFinanceService,
  PersistentFinanceService,
  TransactionFilterOptions,
  FilteredTransactionsResult,
} from '../services/persistentFinanceService';
import { executeRestore } from '../services/backupService';
import { Account, AccountType, DashboardData, Transaction } from '../types/dashboard';
import {
  Budget,
  FinancialReportData,
  GoalContribution,
  GoalContributionType,
  MonthlyBudgetSummary,
  ReportFilterOptions,
  SavingsGoal,
} from '../types/budgetAndGoals';
import {
  RecurringTransaction,
  RecurrenceFrequency,
  GenerateDuePreview,
  GenerateDueResult,
  DashboardPreferences,
  AccountReconciliation,
  CashFlowForecastResult,
  ForecastRangeDays,
} from '../types/recurringAndReconciliation';
import { TransactionType } from '../types/dashboard';

export interface UseDashboardDataResult {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isBalanceHidden: boolean;
  toggleBalanceVisibility: () => void;
  // Core financial mutations
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<Transaction>;
  updateTransaction: (tx: Transaction) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  createAccount: (data: {
    name: string;
    type: AccountType;
    initialBalancePaisa: bigint;
    accountNumberMasked?: string;
  }) => Promise<Account>;
  updateAccount: (account: Account) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  // Batch 2 features
  getFilteredTransactions: (
    options?: TransactionFilterOptions
  ) => Promise<FilteredTransactionsResult>;
  getAllTransactions: () => Promise<Transaction[]>;
  restoreBackup: (
    accounts: Account[],
    transactions: Transaction[],
    budgets?: Budget[],
    savingsGoals?: SavingsGoal[],
    goalContributions?: GoalContribution[],
    recurringTransactions?: RecurringTransaction[],
    dashboardPreferences?: DashboardPreferences,
    accountReconciliations?: AccountReconciliation[]
  ) => Promise<void>;
  // Batch 3 Budget Engine
  getBudgets: (year?: number, month?: number) => Promise<Budget[]>;
  createBudget: (data: {
    category: string;
    limitPaisa: bigint;
    month: number;
    year: number;
    warningThresholdPercent?: number;
  }) => Promise<Budget>;
  updateBudget: (budget: Budget) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<boolean>;
  getMonthlyBudgetProgress: (year: number, month: number) => Promise<MonthlyBudgetSummary>;
  // Batch 3 Savings Goals
  getSavingsGoals: () => Promise<SavingsGoal[]>;
  createSavingsGoal: (data: {
    name: string;
    targetAmountPaisa: bigint;
    initialSavedPaisa?: bigint;
    targetDate?: string;
    description?: string;
    category?: string;
    icon?: string;
  }) => Promise<SavingsGoal>;
  updateSavingsGoal: (goal: SavingsGoal) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: string) => Promise<boolean>;
  addGoalContribution: (data: {
    goalId: string;
    amountPaisa: bigint;
    type: GoalContributionType;
    note?: string;
    date?: string;
  }) => Promise<{ goal: SavingsGoal; contribution: GoalContribution }>;
  getGoalContributions: (goalId?: string) => Promise<GoalContribution[]>;
  // Batch 3 Reports & Analytics
  getFinancialReport: (options: ReportFilterOptions) => Promise<FinancialReportData>;
  // Batch 4 Feature A: Recurring Transactions
  getRecurringTransactions: () => Promise<RecurringTransaction[]>;
  createRecurringTransaction: (data: {
    name: string;
    type: TransactionType;
    amountPaisa: bigint;
    accountId: string;
    category: string;
    note?: string;
    startDate: string;
    endDate?: string;
    frequency: RecurrenceFrequency;
    interval?: number;
  }) => Promise<RecurringTransaction>;
  updateRecurringTransaction: (recurring: RecurringTransaction) => Promise<RecurringTransaction>;
  deleteRecurringTransaction: (id: string) => Promise<boolean>;
  previewDueRecurringTransactions: (asOfDate?: string) => Promise<GenerateDuePreview>;
  generateDueRecurringTransactions: (asOfDate?: string) => Promise<GenerateDueResult>;
  // Batch 4 Feature B: Dashboard Customization
  getDashboardPreferences: () => Promise<DashboardPreferences>;
  saveDashboardPreferences: (prefs: DashboardPreferences) => Promise<DashboardPreferences>;
  resetDashboardPreferences: () => Promise<DashboardPreferences>;
  // Batch 4 Feature C: Account Reconciliation
  calculateHistoricalAccountBalance: (
    accountId: string,
    statementDate: string
  ) => Promise<{
    appBalancePaisa: bigint;
    transactionsCount: number;
    statementTransactions: Transaction[];
  }>;
  reconcileAccount: (data: {
    accountId: string;
    statementDate: string;
    statementBalancePaisa: bigint;
    notes?: string;
  }) => Promise<AccountReconciliation>;
  createReconciliationAdjustment: (
    reconciliationId: string
  ) => Promise<{
    reconciliation: AccountReconciliation;
    transaction: Transaction;
  }>;
  getAccountReconciliations: (accountId?: string) => Promise<AccountReconciliation[]>;
  // Batch 4 Feature D: Cash Flow Forecast
  getCashFlowForecast: (rangeDays?: ForecastRangeDays) => Promise<CashFlowForecastResult>;
}

export function useDashboardData(
  year: number = 2026,
  month: number = 10,
  service: PersistentFinanceService = persistentFinanceService
): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.getDashboardData(year, month);
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'ড্যাশবোর্ড ডেটা লোড করতে সমস্যা হয়েছে';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, service]);

  useEffect(() => {
    let isMounted = true;

    fetchData().then(() => {
      if (!isMounted) return;
    });

    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  const toggleBalanceVisibility = useCallback(() => {
    setIsBalanceHidden((prev) => !prev);
  }, []);

  const addTransaction = useCallback(
    async (txData: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
      const created = await service.addTransaction(txData);
      await fetchData();
      return created;
    },
    [service, fetchData]
  );

  const updateTransaction = useCallback(
    async (updatedTx: Transaction): Promise<Transaction> => {
      const result = await service.updateTransaction(updatedTx);
      await fetchData();
      return result;
    },
    [service, fetchData]
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      await service.deleteTransaction(id);
      await fetchData();
    },
    [service, fetchData]
  );

  const createAccount = useCallback(
    async (accData: {
      name: string;
      type: AccountType;
      initialBalancePaisa: bigint;
      accountNumberMasked?: string;
    }): Promise<Account> => {
      const result = await service.createAccount(accData);
      await fetchData();
      return result;
    },
    [service, fetchData]
  );

  const updateAccount = useCallback(
    async (account: Account): Promise<Account> => {
      const result = await service.updateAccount(account);
      await fetchData();
      return result;
    },
    [service, fetchData]
  );

  const deleteAccount = useCallback(
    async (id: string): Promise<void> => {
      await service.deleteAccount(id);
      await fetchData();
    },
    [service, fetchData]
  );

  const resetToDefaults = useCallback(async (): Promise<void> => {
    await service.resetToDefaults();
    await fetchData();
  }, [service, fetchData]);

  const getFilteredTransactions = useCallback(
    async (options?: TransactionFilterOptions): Promise<FilteredTransactionsResult> => {
      return await service.getFilteredTransactions(options);
    },
    [service]
  );

  const getAllTransactions = useCallback(async (): Promise<Transaction[]> => {
    return await service.getTransactions();
  }, [service]);

  const restoreBackup = useCallback(
    async (
      accounts: Account[],
      transactions: Transaction[],
      budgets?: Budget[],
      savingsGoals?: SavingsGoal[],
      goalContributions?: GoalContribution[],
      recurringTransactions?: RecurringTransaction[],
      dashboardPreferences?: DashboardPreferences,
      accountReconciliations?: AccountReconciliation[]
    ): Promise<void> => {
      await executeRestore(
        accounts,
        transactions,
        budgets,
        savingsGoals,
        goalContributions,
        recurringTransactions,
        dashboardPreferences,
        accountReconciliations
      );
      await fetchData();
    },
    [fetchData]
  );

  // Batch 3 - Budget Engine
  const getBudgets = useCallback(
    async (year?: number, month?: number): Promise<Budget[]> => {
      return await service.getBudgets(year, month);
    },
    [service]
  );

  const createBudget = useCallback(
    async (budgetData: {
      category: string;
      limitPaisa: bigint;
      month: number;
      year: number;
      warningThresholdPercent?: number;
    }): Promise<Budget> => {
      const created = await service.createBudget(budgetData);
      await fetchData();
      return created;
    },
    [service, fetchData]
  );

  const updateBudget = useCallback(
    async (budget: Budget): Promise<Budget> => {
      const updated = await service.updateBudget(budget);
      await fetchData();
      return updated;
    },
    [service, fetchData]
  );

  const deleteBudget = useCallback(
    async (id: string): Promise<boolean> => {
      const deleted = await service.deleteBudget(id);
      await fetchData();
      return deleted;
    },
    [service, fetchData]
  );

  const getMonthlyBudgetProgress = useCallback(
    async (y: number, m: number): Promise<MonthlyBudgetSummary> => {
      return await service.getMonthlyBudgetProgress(y, m);
    },
    [service]
  );

  // Batch 3 - Savings Goals
  const getSavingsGoals = useCallback(async (): Promise<SavingsGoal[]> => {
    return await service.getSavingsGoals();
  }, [service]);

  const createSavingsGoal = useCallback(
    async (goalData: {
      name: string;
      targetAmountPaisa: bigint;
      initialSavedPaisa?: bigint;
      targetDate?: string;
      description?: string;
      category?: string;
      icon?: string;
    }): Promise<SavingsGoal> => {
      const created = await service.createSavingsGoal(goalData);
      await fetchData();
      return created;
    },
    [service, fetchData]
  );

  const updateSavingsGoal = useCallback(
    async (goal: SavingsGoal): Promise<SavingsGoal> => {
      const updated = await service.updateSavingsGoal(goal);
      await fetchData();
      return updated;
    },
    [service, fetchData]
  );

  const deleteSavingsGoal = useCallback(
    async (id: string): Promise<boolean> => {
      const deleted = await service.deleteSavingsGoal(id);
      await fetchData();
      return deleted;
    },
    [service, fetchData]
  );

  const addGoalContribution = useCallback(
    async (contribData: {
      goalId: string;
      amountPaisa: bigint;
      type: GoalContributionType;
      note?: string;
      date?: string;
    }): Promise<{ goal: SavingsGoal; contribution: GoalContribution }> => {
      const result = await service.addGoalContribution(contribData);
      await fetchData();
      return result;
    },
    [service, fetchData]
  );

  const getGoalContributions = useCallback(
    async (goalId?: string): Promise<GoalContribution[]> => {
      return await service.getGoalContributions(goalId);
    },
    [service]
  );

  // Batch 3 - Reports & Analytics
  const getFinancialReport = useCallback(
    async (options: ReportFilterOptions): Promise<FinancialReportData> => {
      return await service.getFinancialReport(options);
    },
    [service]
  );

  // Batch 4 Feature A: Recurring Transactions
  const getRecurringTransactions = useCallback(async (): Promise<RecurringTransaction[]> => {
    return await service.getRecurringTransactions();
  }, [service]);

  const createRecurringTransaction = useCallback(
    async (data: {
      name: string;
      type: TransactionType;
      amountPaisa: bigint;
      accountId: string;
      category: string;
      note?: string;
      startDate: string;
      endDate?: string;
      frequency: RecurrenceFrequency;
      interval?: number;
    }): Promise<RecurringTransaction> => {
      const created = await service.createRecurringTransaction(data);
      await fetchData();
      return created;
    },
    [service, fetchData]
  );

  const updateRecurringTransaction = useCallback(
    async (recurring: RecurringTransaction): Promise<RecurringTransaction> => {
      const updated = await service.updateRecurringTransaction(recurring);
      await fetchData();
      return updated;
    },
    [service, fetchData]
  );

  const deleteRecurringTransaction = useCallback(
    async (id: string): Promise<boolean> => {
      const deleted = await service.deleteRecurringTransaction(id);
      await fetchData();
      return deleted;
    },
    [service, fetchData]
  );

  const previewDueRecurringTransactions = useCallback(
    async (asOfDate?: string): Promise<GenerateDuePreview> => {
      return await service.previewDueRecurringTransactions(asOfDate);
    },
    [service]
  );

  const generateDueRecurringTransactions = useCallback(
    async (asOfDate?: string): Promise<GenerateDueResult> => {
      const result = await service.generateDueRecurringTransactions(asOfDate);
      await fetchData();
      return result;
    },
    [service, fetchData]
  );

  // Batch 4 Feature B: Dashboard Customization
  const getDashboardPreferences = useCallback(async (): Promise<DashboardPreferences> => {
    return await service.getDashboardPreferences();
  }, [service]);

  const saveDashboardPreferences = useCallback(
    async (prefs: DashboardPreferences): Promise<DashboardPreferences> => {
      return await service.saveDashboardPreferences(prefs);
    },
    [service]
  );

  const resetDashboardPreferences = useCallback(async (): Promise<DashboardPreferences> => {
    return await service.resetDashboardPreferences();
  }, [service]);

  // Batch 4 Feature C: Account Reconciliation
  const calculateHistoricalAccountBalance = useCallback(
    async (
      accountId: string,
      statementDate: string
    ): Promise<{
      appBalancePaisa: bigint;
      transactionsCount: number;
      statementTransactions: Transaction[];
    }> => {
      return await service.calculateHistoricalAccountBalance(accountId, statementDate);
    },
    [service]
  );

  const reconcileAccount = useCallback(
    async (data: {
      accountId: string;
      statementDate: string;
      statementBalancePaisa: bigint;
      notes?: string;
    }): Promise<AccountReconciliation> => {
      return await service.reconcileAccount(data);
    },
    [service]
  );

  const createReconciliationAdjustment = useCallback(
    async (
      reconciliationId: string
    ): Promise<{
      reconciliation: AccountReconciliation;
      transaction: Transaction;
    }> => {
      const result = await service.createReconciliationAdjustment(reconciliationId);
      await fetchData();
      return result;
    },
    [service, fetchData]
  );

  const getAccountReconciliations = useCallback(
    async (accountId?: string): Promise<AccountReconciliation[]> => {
      return await service.getAccountReconciliations(accountId);
    },
    [service]
  );

  // Batch 4 Feature D: Cash Flow Forecast
  const getCashFlowForecast = useCallback(
    async (rangeDays?: ForecastRangeDays): Promise<CashFlowForecastResult> => {
      return await service.getCashFlowForecast(rangeDays);
    },
    [service]
  );

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    isBalanceHidden,
    toggleBalanceVisibility,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    createAccount,
    updateAccount,
    deleteAccount,
    resetToDefaults,
    getFilteredTransactions,
    getAllTransactions,
    restoreBackup,
    getBudgets,
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
  };
}
