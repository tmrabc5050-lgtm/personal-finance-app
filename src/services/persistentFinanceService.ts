/**
 * Personal Finance Super App - Persistent Finance Service
 * Batch 1: Core Finance Engine Implementation
 *
 * Implements IDashboardService with full persistent local storage,
 * exact BigInt paisa accounting, and strict balance reconciliation:
 * - Adding income/expense immediately updates account balances.
 * - Editing reverses previous effects before applying new ones.
 * - Deleting reverses effects on account balances.
 * - Deleting an account is prevented if transactions reference it.
 * - Single source of truth backed by IndexedDB / localStorage.
 */

import {
  Account,
  AccountType,
  CategoryExpense,
  DashboardData,
  MonthlySummary,
  Transaction,
  TransactionType,
} from '../types/dashboard';
import { addPaisa, formatPaisaToDecimalString, subtractPaisa } from '../utils/currency';
import { IDashboardService } from './dashboardService';

export interface TransactionFilterOptions {
  searchQuery?: string;
  type?: 'all' | TransactionType;
  accountId?: 'all' | string;
  category?: 'all' | string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  minAmountPaisa?: bigint;
  maxAmountPaisa?: bigint;
}

export interface FilteredTransactionsResult {
  transactions: Transaction[];
  totalCount: number;
  filteredIncomePaisa: bigint;
  filteredExpensePaisa: bigint;
}
import {
  accountToDTO,
  budgetToDTO,
  dtoToAccount,
  dtoToBudget,
  dtoToGoalContribution,
  dtoToSavingsGoal,
  dtoToTransaction,
  financeStorageEngine,
  goalContributionToDTO,
  savingsGoalToDTO,
  transactionToDTO,
  recurringToDTO,
  dtoToRecurring,
  reconciliationToDTO,
  dtoToReconciliation,
  IFinanceStorageEngine,
} from './storageService';
import {
  Budget,
  BudgetAlert,
  BudgetProgress,
  CategoryBreakdownItem,
  FinancialInsight,
  FinancialReportData,
  GoalContribution,
  GoalContributionType,
  MonthlyBudgetSummary,
  MonthlyComparisonItem,
  PeriodComparison,
  ReportFilterOptions,
  SavingsGoal,
} from '../types/budgetAndGoals';
import {
  RecurringTransaction,
  RecurrenceFrequency,
  RecurringStatus,
  GenerateDuePreview,
  GenerateDueResult,
  DueRecurringOccurrence,
  DashboardPreferences,
  AccountReconciliation,
  ReconciliationStatus,
  CashFlowForecastResult,
  ForecastRangeDays,
  ForecastTimelinePoint,
} from '../types/recurringAndReconciliation';
import { DEFAULT_DASHBOARD_PREFERENCES } from '../data/mockDashboardData';
import { getBengaliMonthYear } from '../utils/date';


export class PersistentFinanceService implements IDashboardService {
  private engine: IFinanceStorageEngine;

  constructor(engine: IFinanceStorageEngine = financeStorageEngine) {
    this.engine = engine;
  }

  /**
   * Ensure database is initialized before performing operations
   */
  private async ensureReady(): Promise<void> {
    await this.engine.initialize();
  }

  // =========================================================================
  // ACCOUNTS MANAGEMENT
  // =========================================================================

  /**
   * Retrieves all user accounts
   */
  async getAccounts(): Promise<Account[]> {
    await this.ensureReady();
    const dtos = await this.engine.readAccounts();
    return dtos.map(dtoToAccount);
  }

  /**
   * Retrieve a single account by ID
   */
  async getAccountById(id: string): Promise<Account | null> {
    const accounts = await this.getAccounts();
    return accounts.find((a) => a.id === id) || null;
  }

  /**
   * Create and persist a new account
   */
  async createAccount(data: {
    name: string;
    type: AccountType;
    initialBalancePaisa: bigint;
    accountNumberMasked?: string;
  }): Promise<Account> {
    await this.ensureReady();
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new Error('অ্যাকাউন্টের নাম আবশ্যক');
    }

    const accounts = await this.getAccounts();
    const newId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newAccount: Account = {
      id: newId,
      name: trimmedName,
      type: data.type,
      accountNumberMasked: data.accountNumberMasked?.trim() || undefined,
      balancePaisa: data.initialBalancePaisa,
      currency: 'BDT',
      updatedAt: now,
    };

    accounts.push(newAccount);
    await this.engine.writeAccounts(accounts.map(accountToDTO));

    return newAccount;
  }

  /**
   * Update an existing account
   */
  async updateAccount(updated: Account): Promise<Account> {
    await this.ensureReady();
    const accounts = await this.getAccounts();
    const index = accounts.findIndex((a) => a.id === updated.id);
    if (index === -1) {
      throw new Error('অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি');
    }

    const trimmedName = updated.name.trim();
    if (!trimmedName) {
      throw new Error('অ্যাকাউন্টের নাম খালি হতে পারে না');
    }

    const accountToSave: Account = {
      ...updated,
      name: trimmedName,
      accountNumberMasked: updated.accountNumberMasked?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    accounts[index] = accountToSave;
    await this.engine.writeAccounts(accounts.map(accountToDTO));
    return accountToSave;
  }

  /**
   * Delete an account with strict orphan transaction protection
   */
  async deleteAccount(id: string): Promise<void> {
    await this.ensureReady();
    const transactions = await this.getTransactions();

    // Check if any transaction references this account
    const hasTransactions = transactions.some(
      (tx) => tx.accountId === id || tx.destinationAccountId === id
    );

    if (hasTransactions) {
      throw new Error(
        'এই অ্যাকাউন্টে লেনদেনের রেকর্ড বিদ্যমান রয়েছে। অ্যাকাউন্ট মুছে ফেললে লেনদেন এতিম (orphan) হয়ে যাবে। প্রথমে সম্পর্কিত লেনদেনগুলো সংশোধন বা মুছে ফেলুন।'
      );
    }

    const accounts = await this.getAccounts();
    const filtered = accounts.filter((a) => a.id !== id);
    if (filtered.length === accounts.length) {
      throw new Error('অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি');
    }

    if (this.engine.deleteByIds) {
      await this.engine.deleteByIds('accounts', [id]);
    }
    await this.engine.writeAccounts(filtered.map(accountToDTO));
  }

  // =========================================================================
  // TRANSACTIONS MANAGEMENT
  // =========================================================================

  /**
   * Retrieves all transactions
   */
  async getTransactions(): Promise<Transaction[]> {
    await this.ensureReady();
    const dtos = await this.engine.readTransactions();
    return dtos.map(dtoToTransaction);
  }

  /**
   * Retrieves recent transactions sorted descending by date/createdAt
   */
  async getRecentTransactions(limit = 10): Promise<Transaction[]> {
    const transactions = await this.getTransactions();
    return [...transactions]
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, limit);
  }

  /**
   * Add a new transaction and update the affected account balance atomically
   */
  async addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    await this.ensureReady();

    if (data.amountPaisa <= 0n) {
      throw new Error('টাকার পরিমাণ অবশ্যই ০-এর বেশি হতে হবে');
    }

    const accounts = await this.getAccounts();
    const accountIndex = accounts.findIndex((a) => a.id === data.accountId);
    if (accountIndex === -1) {
      throw new Error('নির্দিষ্ট অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি');
    }

    let destIndex = -1;
    if (data.type === 'transfer') {
      if (!data.destinationAccountId) {
        throw new Error('স্থানান্তরের জন্য গন্তব্য অ্যাকাউন্ট নির্বাচন করা আবশ্যক');
      }
      if (data.destinationAccountId === data.accountId) {
        throw new Error('উৎস এবং গন্তব্য অ্যাকাউন্ট একই হতে পারে না');
      }
      destIndex = accounts.findIndex((a) => a.id === data.destinationAccountId);
      if (destIndex === -1) {
        throw new Error('গন্তব্য অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি');
      }
    }

    const now = new Date().toISOString();

    // Prevent rapid duplicate submissions (same accounts, type, amount, date within 2 seconds)
    const existingTxs = await this.getTransactions();
    const isDuplicate = existingTxs.some((tx) => {
      const timeDiffMs = Math.abs(new Date(now).getTime() - new Date(tx.createdAt).getTime());
      return (
        timeDiffMs < 2000 &&
        tx.type === data.type &&
        tx.accountId === data.accountId &&
        tx.destinationAccountId === data.destinationAccountId &&
        tx.amountPaisa === data.amountPaisa &&
        tx.date === data.date
      );
    });
    if (isDuplicate) {
      throw new Error('ডুপ্লিকেট সাবমিশন রোধ: একই লেনদেন পুনরায় সাবমিট করা হয়েছে');
    }

    const newTxId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTx: Transaction = {
      ...data,
      id: newTxId,
      createdAt: now,
    };

    // Apply financial balance effect
    const sourceAcc = { ...accounts[accountIndex] };
    if (data.type === 'income') {
      sourceAcc.balancePaisa = addPaisa(sourceAcc.balancePaisa, data.amountPaisa);
    } else if (data.type === 'expense') {
      if (sourceAcc.balancePaisa < data.amountPaisa) {
        throw new Error(
          `অপর্যাপ্ত ব্যালেন্স: "${sourceAcc.name}" অ্যাকাউন্টে পর্যাপ্ত টাকা নেই (প্রয়োজন ৳ ${formatPaisaToDecimalString(
            data.amountPaisa
          )}, বর্তমান ব্যালেন্স ৳ ${formatPaisaToDecimalString(sourceAcc.balancePaisa)})`
        );
      }
      sourceAcc.balancePaisa = subtractPaisa(sourceAcc.balancePaisa, data.amountPaisa);
    } else if (data.type === 'transfer') {
      const fee = data.transferFeePaisa || 0n;
      if (fee < 0n) {
        throw new Error('ট্রান্সফার ফি ঋণাত্মক হতে পারে না');
      }
      const totalDeduction = addPaisa(data.amountPaisa, fee);
      if (sourceAcc.balancePaisa < totalDeduction) {
        throw new Error(
          `অপর্যাপ্ত ব্যালেন্স: "${sourceAcc.name}" অ্যাকাউন্টে পর্যাপ্ত টাকা নেই (প্রয়োজন ৳ ${formatPaisaToDecimalString(
            totalDeduction
          )}, বর্তমান ব্যালেন্স ৳ ${formatPaisaToDecimalString(sourceAcc.balancePaisa)})`
        );
      }
      sourceAcc.balancePaisa = subtractPaisa(sourceAcc.balancePaisa, totalDeduction);

      const destAcc = { ...accounts[destIndex] };
      destAcc.balancePaisa = addPaisa(destAcc.balancePaisa, data.amountPaisa);
      destAcc.updatedAt = now;
      accounts[destIndex] = destAcc;
    }

    sourceAcc.updatedAt = now;
    accounts[accountIndex] = sourceAcc;

    // Persist changes atomically
    const transactions = await this.getTransactions();
    transactions.push(newTx);

    await this.engine.writeAccountsAndTransactions(
      accounts.map(accountToDTO),
      transactions.map(transactionToDTO)
    );

    return newTx;
  }

  /**
   * Edit an existing transaction:
   * Reverses the previous transaction's effect, then applies the updated effect.
   */
  async updateTransaction(updatedTx: Transaction): Promise<Transaction> {
    await this.ensureReady();

    if (updatedTx.amountPaisa <= 0n) {
      throw new Error('টাকার পরিমাণ অবশ্যই ০-এর বেশি হতে হবে');
    }

    const transactions = await this.getTransactions();
    const txIndex = transactions.findIndex((t) => t.id === updatedTx.id);
    if (txIndex === -1) {
      throw new Error('লেনদেনটি খুঁজে পাওয়া যায়নি');
    }

    const oldTx = transactions[txIndex];
    const accounts = await this.getAccounts();
    const now = new Date().toISOString();

    // Step 1: Reverse previous transaction effect
    this.reverseTransactionEffect(oldTx, accounts);

    // Step 2: Apply updated transaction effect
    this.applyTransactionEffect(updatedTx, accounts);

    transactions[txIndex] = {
      ...updatedTx,
      createdAt: oldTx.createdAt, // Preserve original creation timestamp
    };

    // Update timestamps of affected accounts
    for (const acc of accounts) {
      if (
        acc.id === oldTx.accountId ||
        acc.id === oldTx.destinationAccountId ||
        acc.id === updatedTx.accountId ||
        acc.id === updatedTx.destinationAccountId
      ) {
        acc.updatedAt = now;
      }
    }

    // Persist atomically
    await this.engine.writeAccountsAndTransactions(
      accounts.map(accountToDTO),
      transactions.map(transactionToDTO)
    );

    return transactions[txIndex];
  }

  /**
   * Delete a transaction and reverse its effect on account balance
   */
  async deleteTransaction(id: string): Promise<void> {
    await this.ensureReady();
    const transactions = await this.getTransactions();
    const txIndex = transactions.findIndex((t) => t.id === id);
    if (txIndex === -1) {
      throw new Error('লেনদেনটি খুঁজে পাওয়া যায়নি');
    }

    const tx = transactions[txIndex];
    const accounts = await this.getAccounts();
    const now = new Date().toISOString();

    // Reverse financial effect
    this.reverseTransactionEffect(tx, accounts);

    for (const acc of accounts) {
      if (acc.id === tx.accountId || acc.id === tx.destinationAccountId) {
        acc.updatedAt = now;
      }
    }

    transactions.splice(txIndex, 1);

    if (this.engine.deleteByIds) {
      await this.engine.deleteByIds('transactions', [id]);
    }

    await this.engine.writeAccountsAndTransactions(
      accounts.map(accountToDTO),
      transactions.map(transactionToDTO)
    );
  }

  // =========================================================================
  // INTERNAL ACCOUNTING REVERSAL & APPLICATION HELPERS
  // =========================================================================

  private applyTransactionEffect(tx: Transaction, accounts: Account[]): void {
    const source = accounts.find((a) => a.id === tx.accountId);
    if (!source) {
      throw new Error(`অ্যাকাউন্ট "${tx.accountId}" খুঁজে পাওয়া যায়নি`);
    }

    if (tx.type === 'income') {
      source.balancePaisa = addPaisa(source.balancePaisa, tx.amountPaisa);
    } else if (tx.type === 'expense') {
      if (source.balancePaisa < tx.amountPaisa) {
        throw new Error(
          `অপর্যাপ্ত ব্যালেন্স: "${source.name}" অ্যাকাউন্টে পর্যাপ্ত টাকা নেই (প্রয়োজন ৳ ${formatPaisaToDecimalString(
            tx.amountPaisa
          )}, বর্তমান ব্যালেন্স ৳ ${formatPaisaToDecimalString(source.balancePaisa)})`
        );
      }
      source.balancePaisa = subtractPaisa(source.balancePaisa, tx.amountPaisa);
    } else if (tx.type === 'transfer') {
      if (!tx.destinationAccountId) {
        throw new Error('স্থানান্তরের জন্য গন্তব্য অ্যাকাউন্ট আবশ্যক');
      }
      if (tx.accountId === tx.destinationAccountId) {
        throw new Error('উৎস এবং গন্তব্য অ্যাকাউন্ট একই হতে পারে না');
      }
      const dest = accounts.find((a) => a.id === tx.destinationAccountId);
      if (!dest) {
        throw new Error(`গন্তব্য অ্যাকাউন্ট "${tx.destinationAccountId}" খুঁজে পাওয়া যায়নি`);
      }
      const fee = tx.transferFeePaisa || 0n;
      const totalDeduction = addPaisa(tx.amountPaisa, fee);
      if (source.balancePaisa < totalDeduction) {
        throw new Error(
          `অপর্যাপ্ত ব্যালেন্স: "${source.name}" অ্যাকাউন্টে পর্যাপ্ত টাকা নেই (প্রয়োজন ৳ ${formatPaisaToDecimalString(
            totalDeduction
          )}, বর্তমান ব্যালেন্স ৳ ${formatPaisaToDecimalString(source.balancePaisa)})`
        );
      }
      source.balancePaisa = subtractPaisa(source.balancePaisa, totalDeduction);
      dest.balancePaisa = addPaisa(dest.balancePaisa, tx.amountPaisa);
    }
  }

  private reverseTransactionEffect(tx: Transaction, accounts: Account[]): void {
    const source = accounts.find((a) => a.id === tx.accountId);
    if (!source) {
      throw new Error(`পূর্বের অ্যাকাউন্ট "${tx.accountId}" খুঁজে পাওয়া যায়নি`);
    }

    if (tx.type === 'income') {
      // Reversing income: subtract the income amount
      source.balancePaisa = subtractPaisa(source.balancePaisa, tx.amountPaisa);
    } else if (tx.type === 'expense') {
      // Reversing expense: add back the expense amount
      source.balancePaisa = addPaisa(source.balancePaisa, tx.amountPaisa);
    } else if (tx.type === 'transfer') {
      const fee = tx.transferFeePaisa || 0n;
      const totalRefund = addPaisa(tx.amountPaisa, fee);
      source.balancePaisa = addPaisa(source.balancePaisa, totalRefund);

      if (tx.destinationAccountId) {
        const dest = accounts.find((a) => a.id === tx.destinationAccountId);
        if (dest) {
          dest.balancePaisa = subtractPaisa(dest.balancePaisa, tx.amountPaisa);
        }
      }
    }
  }

  // =========================================================================
  // DASHBOARD AGGREGATIONS (IDashboardService Interface)
  // =========================================================================

  /**
   * Total Net Balance = Sum of all accounts' current balance
   */
  async getTotalNetBalance(): Promise<bigint> {
    const accounts = await this.getAccounts();
    return accounts.reduce((total, acc) => addPaisa(total, acc.balancePaisa), 0n);
  }

  /**
   * Calculates monthly income, expenses, and net savings
   */
  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    let totalIncomePaisa = 0n;
    let totalExpensePaisa = 0n;

    const allTxs = await this.getTransactions();
    const monthlyTxs = allTxs.filter((tx) => {
      const parts = tx.date.split('-');
      if (parts.length < 2) return false;
      return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
    });

    for (const tx of monthlyTxs) {
      if (tx.type === 'income') {
        totalIncomePaisa = addPaisa(totalIncomePaisa, tx.amountPaisa);
      } else if (tx.type === 'expense') {
        totalExpensePaisa = addPaisa(totalExpensePaisa, tx.amountPaisa);
      } else if (tx.type === 'transfer') {
        // Transfers are NOT income or expense; only transfer fee is expense
        if (tx.transferFeePaisa && tx.transferFeePaisa > 0n) {
          totalExpensePaisa = addPaisa(totalExpensePaisa, tx.transferFeePaisa);
        }
      }
    }

    const netSavingsPaisa = subtractPaisa(totalIncomePaisa, totalExpensePaisa);

    return {
      year,
      month,
      totalIncomePaisa,
      totalExpensePaisa,
      netSavingsPaisa,
    };
  }

  /**
   * Aggregates expenses by category for a specific month
   */
  async getCategoryExpenses(year: number, month: number): Promise<CategoryExpense[]> {
    const allTxs = await this.getTransactions();
    const monthlyTxs = allTxs.filter((tx) => {
      const parts = tx.date.split('-');
      if (parts.length < 2) return false;
      return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
    });

    const categoryMap = new Map<string, { amountPaisa: bigint; count: number }>();
    let totalExpensePaisa = 0n;

    for (const tx of monthlyTxs) {
      if (tx.type === 'expense') {
        totalExpensePaisa = addPaisa(totalExpensePaisa, tx.amountPaisa);
        const current = categoryMap.get(tx.category) || { amountPaisa: 0n, count: 0 };
        categoryMap.set(tx.category, {
          amountPaisa: addPaisa(current.amountPaisa, tx.amountPaisa),
          count: current.count + 1,
        });
      } else if (tx.type === 'transfer' && tx.transferFeePaisa && tx.transferFeePaisa > 0n) {
        const feeCategory = tx.category || 'ফি ও চার্জ';
        totalExpensePaisa = addPaisa(totalExpensePaisa, tx.transferFeePaisa);
        const current = categoryMap.get(feeCategory) || { amountPaisa: 0n, count: 0 };
        categoryMap.set(feeCategory, {
          amountPaisa: addPaisa(current.amountPaisa, tx.transferFeePaisa),
          count: current.count + 1,
        });
      }
    }

    const categoryExpenses: CategoryExpense[] = [];

    for (const [category, data] of categoryMap.entries()) {
      let percentage = 0;
      if (totalExpensePaisa > 0n) {
        const basisPoints = (data.amountPaisa * 10000n) / totalExpensePaisa;
        percentage = Number(basisPoints) / 100;
      }

      categoryExpenses.push({
        category,
        amountPaisa: data.amountPaisa,
        percentage,
        transactionCount: data.count,
      });
    }

    categoryExpenses.sort((a, b) => (b.amountPaisa > a.amountPaisa ? 1 : -1));

    return categoryExpenses;
  }

  /**
   * Aggregates the full dashboard dataset
   */
  async getDashboardData(year: number, month: number): Promise<DashboardData> {
    await this.ensureReady();
    const [totalNetBalancePaisa, monthlySummary, accounts, recentTransactions, categoryExpenses] =
      await Promise.all([
        this.getTotalNetBalance(),
        this.getMonthlySummary(year, month),
        this.getAccounts(),
        this.getRecentTransactions(10),
        this.getCategoryExpenses(year, month),
      ]);

    return {
      totalNetBalancePaisa,
      monthlySummary,
      accounts,
      recentTransactions,
      categoryExpenses,
    };
  }

  /**
   * Search and filter transactions across multiple dimensions
   */
  async getFilteredTransactions(
    options: TransactionFilterOptions = {}
  ): Promise<FilteredTransactionsResult> {
    const allTxs = await this.getTransactions();
    const accounts = await this.getAccounts();
    const accountMap = new Map<string, string>();
    for (const a of accounts) {
      accountMap.set(a.id, a.name.toLowerCase());
    }

    const {
      searchQuery,
      type = 'all',
      accountId = 'all',
      category = 'all',
      startDate,
      endDate,
      minAmountPaisa,
      maxAmountPaisa,
    } = options;

    const trimmedSearch = searchQuery?.trim().toLowerCase() || '';

    const filtered = allTxs.filter((tx) => {
      // 1. Type filter
      if (type !== 'all' && tx.type !== type) {
        return false;
      }

      // 2. Account filter
      if (accountId !== 'all') {
        const matchesAccount =
          tx.accountId === accountId || tx.destinationAccountId === accountId;
        if (!matchesAccount) return false;
      }

      // 3. Category filter
      if (category !== 'all' && tx.category !== category) {
        return false;
      }

      // 4. Date range filter
      if (startDate && tx.date < startDate) {
        return false;
      }
      if (endDate && tx.date > endDate) {
        return false;
      }

      // 5. Amount range filter
      if (minAmountPaisa !== undefined && tx.amountPaisa < minAmountPaisa) {
        return false;
      }
      if (maxAmountPaisa !== undefined && tx.amountPaisa > maxAmountPaisa) {
        return false;
      }

      // 6. Free text search
      if (trimmedSearch) {
        const matchNote = tx.note?.toLowerCase().includes(trimmedSearch) || false;
        const matchCategory = tx.category.toLowerCase().includes(trimmedSearch);
        const sourceAccName = accountMap.get(tx.accountId) || '';
        const matchSourceAcc = sourceAccName.includes(trimmedSearch);
        const destAccName = tx.destinationAccountId
          ? accountMap.get(tx.destinationAccountId) || ''
          : '';
        const matchDestAcc = destAccName.includes(trimmedSearch);

        if (!matchNote && !matchCategory && !matchSourceAcc && !matchDestAcc) {
          return false;
        }
      }

      return true;
    });

    // Sort descending by date, then createdAt
    filtered.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });

    let filteredIncomePaisa = 0n;
    let filteredExpensePaisa = 0n;
    for (const tx of filtered) {
      if (tx.type === 'income') {
        filteredIncomePaisa = addPaisa(filteredIncomePaisa, tx.amountPaisa);
      } else if (tx.type === 'expense') {
        filteredExpensePaisa = addPaisa(filteredExpensePaisa, tx.amountPaisa);
      } else if (tx.type === 'transfer' && tx.transferFeePaisa && tx.transferFeePaisa > 0n) {
        filteredExpensePaisa = addPaisa(filteredExpensePaisa, tx.transferFeePaisa);
      }
    }

    return {
      transactions: filtered,
      totalCount: filtered.length,
      filteredIncomePaisa,
      filteredExpensePaisa,
    };
  }

  // =========================================================================
  // BUDGET ENGINE (BATCH 3)
  // =========================================================================

  /**
   * Retrieves budgets, optionally filtered by year and month.
   */
  async getBudgets(year?: number, month?: number): Promise<Budget[]> {
    await this.ensureReady();
    const dtos = await this.engine.readBudgets();
    let budgets = dtos.map(dtoToBudget);
    if (year !== undefined) {
      budgets = budgets.filter((b) => b.year === year);
    }
    if (month !== undefined) {
      budgets = budgets.filter((b) => b.month === month);
    }
    return budgets.sort((a, b) => a.category.localeCompare(b.category));
  }

  /**
   * Retrieve a single budget by ID.
   */
  async getBudgetById(id: string): Promise<Budget | null> {
    const budgets = await this.getBudgets();
    return budgets.find((b) => b.id === id) || null;
  }

  /**
   * Create and persist a new budget for a category and month.
   * Enforces positive amount, valid month/year, and prevents duplicate active budgets.
   */
  async createBudget(data: {
    category: string;
    limitPaisa: bigint;
    month: number;
    year: number;
    warningThresholdPercent?: number;
  }): Promise<Budget> {
    await this.ensureReady();
    const trimmedCategory = data.category.trim();
    if (!trimmedCategory) {
      throw new Error('বাজেট ক্যাটাগরি আবশ্যক');
    }
    if (data.limitPaisa <= 0n) {
      throw new Error('বাজেটের পরিমাণ শূন্যের চেয়ে বেশি হতে হবে');
    }
    if (data.month < 1 || data.month > 12) {
      throw new Error('মাসের মান ১ থেকে ১২-এর মধ্যে হতে হবে');
    }
    if (data.year < 2000 || data.year > 2100) {
      throw new Error('সঠিক বছর প্রদান করুন');
    }

    const warningThreshold = data.warningThresholdPercent ?? 80;
    if (warningThreshold < 1 || warningThreshold > 99) {
      throw new Error('সতর্কবার্তা থ্রেশহোল্ড ১% থেকে ৯৯%-এর মধ্যে হতে হবে');
    }

    const allBudgets = await this.getBudgets();
    const isDuplicate = allBudgets.some(
      (b) =>
        b.category.toLowerCase() === trimmedCategory.toLowerCase() &&
        b.month === data.month &&
        b.year === data.year
    );
    if (isDuplicate) {
      throw new Error(
        `"${trimmedCategory}" ক্যাটাগরির জন্য ${data.year} সালের ${data.month}তম মাসে ইতিমধ্যেই একটি সক্রিয় বাজেট রয়েছে`
      );
    }

    const now = new Date().toISOString();
    const newBudget: Budget = {
      id: `bud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category: trimmedCategory,
      amountPaisa: data.limitPaisa,
      limitPaisa: data.limitPaisa,
      month: data.month,
      year: data.year,
      warningThresholdPercent: warningThreshold,
      createdAt: now,
      updatedAt: now,
    };

    allBudgets.push(newBudget);
    await this.engine.writeBudgets(allBudgets.map(budgetToDTO));
    return newBudget;
  }

  /**
   * Update an existing budget.
   */
  async updateBudget(budget: Budget): Promise<Budget> {
    await this.ensureReady();
    const trimmedCategory = budget.category.trim();
    if (!trimmedCategory) {
      throw new Error('বাজেট ক্যাটাগরি আবশ্যক');
    }
    const limit = budget.amountPaisa ?? budget.limitPaisa ?? 0n;
    if (limit <= 0n) {
      throw new Error('বাজেটের পরিমাণ শূন্যের চেয়ে বেশি হতে হবে');
    }
    if (budget.month < 1 || budget.month > 12) {
      throw new Error('মাসের মান ১ থেকে ১২-এর মধ্যে হতে হবে');
    }
    if (budget.year < 2000 || budget.year > 2100) {
      throw new Error('সঠিক বছর প্রদান করুন');
    }

    const warningThreshold = budget.warningThresholdPercent ?? 80;
    if (warningThreshold < 1 || warningThreshold > 99) {
      throw new Error('সতর্কবার্তা থ্রেশহোল্ড ১% থেকে ৯৯%-এর মধ্যে হতে হবে');
    }

    const allBudgets = await this.getBudgets();
    const isDuplicate = allBudgets.some(
      (b) =>
        b.id !== budget.id &&
        b.category.toLowerCase() === trimmedCategory.toLowerCase() &&
        b.month === budget.month &&
        b.year === budget.year
    );
    if (isDuplicate) {
      throw new Error(
        `"${trimmedCategory}" ক্যাটাগরির জন্য ${budget.year} সালের ${budget.month}তম মাসে অন্য একটি বাজেট বিদ্যমান`
      );
    }

    const index = allBudgets.findIndex((b) => b.id === budget.id);
    if (index === -1) {
      throw new Error(`বাজেট পাওয়া যায়নি: ID ${budget.id}`);
    }

    const updated: Budget = {
      ...budget,
      category: trimmedCategory,
      amountPaisa: limit,
      limitPaisa: limit,
      warningThresholdPercent: warningThreshold,
      updatedAt: new Date().toISOString(),
    };

    allBudgets[index] = updated;
    await this.engine.writeBudgets(allBudgets.map(budgetToDTO));
    return updated;
  }

  /**
   * Delete a budget by ID.
   */
  async deleteBudget(id: string): Promise<boolean> {
    await this.ensureReady();
    const allBudgets = await this.getBudgets();
    const remaining = allBudgets.filter((b) => b.id !== id);
    if (this.engine.deleteByIds) {
      await this.engine.deleteByIds('budgets', [id]);
    }
    await this.engine.writeBudgets(remaining.map(budgetToDTO));
    return true;
  }

  /**
   * Calculate budget progress and summary for a given month and year.
   * Strictly filters genuine expenses of the matching category and month.
   */
  async getMonthlyBudgetProgress(year: number, month: number): Promise<MonthlyBudgetSummary> {
    await this.ensureReady();
    const budgets = await this.getBudgets(year, month);
    const transactions = await this.getTransactions();

    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    // Filter genuine expense transactions for this month
    const qualifyingExpenses = transactions.filter(
      (tx) => tx.type === 'expense' && tx.date.startsWith(monthPrefix)
    );

    // Sum actual spending by category
    const spendingMap = new Map<string, bigint>();
    for (const tx of qualifyingExpenses) {
      const current = spendingMap.get(tx.category) || 0n;
      spendingMap.set(tx.category, addPaisa(current, tx.amountPaisa));
    }

    let totalBudgetPaisa = 0n;
    let totalSpentPaisa = 0n;
    let totalExceededPaisa = 0n;
    let categoriesOnTrackCount = 0;
    let categoriesWarningCount = 0;
    let categoriesExceededCount = 0;
    let categoriesNotStartedCount = 0;

    const categoryProgresses: BudgetProgress[] = [];
    const alerts: BudgetAlert[] = [];

    for (const budget of budgets) {
      const limit = budget.amountPaisa ?? budget.limitPaisa ?? 0n;
      const actual = spendingMap.get(budget.category) || 0n;
      const remaining = limit > actual ? subtractPaisa(limit, actual) : 0n;
      const exceeded = actual > limit ? subtractPaisa(actual, limit) : 0n;

      const spentPercent =
        limit > 0n
          ? Math.min(999, Math.round(Number((actual * 10000n) / limit) / 100))
          : 0;

      const threshold = budget.warningThresholdPercent ?? 80;
      let status: BudgetProgress['status'] = 'on_track';

      if (actual === 0n) {
        status = 'not_started';
        categoriesNotStartedCount++;
      } else if (actual > limit) {
        status = 'exceeded';
        categoriesExceededCount++;
      } else if (spentPercent >= threshold) {
        status = 'warning';
        categoriesWarningCount++;
      } else {
        status = 'on_track';
        categoriesOnTrackCount++;
      }

      totalBudgetPaisa = addPaisa(totalBudgetPaisa, limit);
      totalSpentPaisa = addPaisa(totalSpentPaisa, actual);
      if (exceeded > 0n) {
        totalExceededPaisa = addPaisa(totalExceededPaisa, exceeded);
      }

      const progressItem: BudgetProgress = {
        budget,
        spentPaisa: actual,
        actualSpentPaisa: actual,
        remainingPaisa: remaining,
        percentage: spentPercent,
        spentPercent,
        exceededPaisa: exceeded,
        status,
      };
      categoryProgresses.push(progressItem);

      // In-app alerts
      if (status === 'exceeded') {
        alerts.push({
          id: `alert_exc_${budget.id}`,
          budgetId: budget.id,
          category: budget.category,
          severity: 'danger',
          title: `বাজেট অতিক্রম: ${budget.category}`,
          message: `"${budget.category}" খাতে বাজেট সীমা ৳${formatPaisaToDecimalString(limit)} অতিক্রম করে মোট ব্যয় হয়েছে ৳${formatPaisaToDecimalString(actual)}।`,
          spentPercent,
        });
      } else if (status === 'warning') {
        alerts.push({
          id: `alert_warn_${budget.id}`,
          budgetId: budget.id,
          category: budget.category,
          severity: 'warning',
          title: `বাজেট সতর্কতা: ${budget.category}`,
          message: `"${budget.category}" খাতে বাজেট সীমার ${spentPercent}% ব্যয় হয়ে গেছে (${threshold}% সতর্কবার্তা সীমা)।`,
          spentPercent,
        });
      }
    }

    const remainingTotalPaisa =
      totalBudgetPaisa > totalSpentPaisa ? subtractPaisa(totalBudgetPaisa, totalSpentPaisa) : 0n;
    const overallSpentPercent =
      totalBudgetPaisa > 0n
        ? Math.min(999, Math.round(Number((totalSpentPaisa * 10000n) / totalBudgetPaisa) / 100))
        : 0;

    return {
      year,
      month,
      totalBudgetPaisa,
      totalSpentPaisa,
      totalRemainingPaisa: remainingTotalPaisa,
      remainingTotalPaisa,
      totalExceededPaisa,
      overallSpentPercent,
      categoriesOnTrackCount,
      categoriesWarningCount,
      categoriesExceededCount,
      categoriesNotStartedCount,
      items: categoryProgresses,
      categoryProgresses,
      alerts,
    };
  }

  // =========================================================================
  // SAVINGS GOALS ENGINE (BATCH 3)
  // =========================================================================

  /**
   * Retrieves all savings goals with dynamically evaluated statuses.
   */
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    await this.ensureReady();
    const dtos = await this.engine.readSavingsGoals();
    const goals = dtos.map(dtoToSavingsGoal);
    const todayStr = new Date().toISOString().split('T')[0];

    // Dynamically evaluate overdue or completed status
    return goals.map((g) => {
      const saved = g.currentAmountPaisa ?? g.currentSavedPaisa ?? 0n;
      let status: SavingsGoal['status'] = g.status;
      if (saved >= g.targetAmountPaisa) {
        status = 'completed';
      } else if (g.targetDate && g.targetDate < todayStr) {
        status = 'overdue';
      } else {
        status = 'in_progress';
      }
      return {
        ...g,
        currentAmountPaisa: saved,
        currentSavedPaisa: saved,
        status,
      };
    });
  }

  /**
   * Retrieve a single savings goal by ID.
   */
  async getSavingsGoalById(id: string): Promise<SavingsGoal | null> {
    const goals = await this.getSavingsGoals();
    return goals.find((g) => g.id === id) || null;
  }

  /**
   * Create a new savings goal with optional initial saved amount.
   */
  async createSavingsGoal(data: {
    name: string;
    targetAmountPaisa: bigint;
    initialSavedPaisa?: bigint;
    targetDate?: string;
    description?: string;
    category?: string;
    icon?: string;
  }): Promise<SavingsGoal> {
    await this.ensureReady();
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new Error('লক্ষ্যের নাম আবশ্যক');
    }
    if (data.targetAmountPaisa <= 0n) {
      throw new Error('লক্ষ্যমাত্রা শূন্যের চেয়ে বেশি হতে হবে');
    }
    const initialSaved = data.initialSavedPaisa ?? 0n;
    if (initialSaved < 0n) {
      throw new Error('প্রাথমিক সঞ্চয়ের পরিমাণ ঋণাত্মক হতে পারে না');
    }

    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let status: SavingsGoal['status'] = 'in_progress';
    if (initialSaved >= data.targetAmountPaisa) {
      status = 'completed';
    } else if (data.targetDate && data.targetDate < todayStr) {
      status = 'overdue';
    }

    const newGoal: SavingsGoal = {
      id: goalId,
      name: trimmedName,
      targetAmountPaisa: data.targetAmountPaisa,
      currentAmountPaisa: initialSaved,
      currentSavedPaisa: initialSaved,
      targetDate: data.targetDate,
      description: data.description?.trim(),
      category: data.category?.trim(),
      icon: data.icon?.trim() || '🎯',
      status,
      createdAt: now,
      updatedAt: now,
    };

    const allGoals = await this.getSavingsGoals();
    allGoals.push(newGoal);
    await this.engine.writeSavingsGoals(allGoals.map(savingsGoalToDTO));

    // If an initial amount is provided, record an initial contribution record
    if (initialSaved > 0n) {
      const initialContrib: GoalContribution = {
        id: `gcon_${Date.now()}_init`,
        goalId,
        amountPaisa: initialSaved,
        type: 'deposit',
        date: todayStr,
        note: 'প্রাথমিক সঞ্চয়',
        createdAt: now,
      };
      const allContribs = (await this.engine.readGoalContributions()).map(dtoToGoalContribution);
      allContribs.push(initialContrib);
      await this.engine.writeGoalContributions(allContribs.map(goalContributionToDTO));
    }

    return newGoal;
  }

  /**
   * Update an existing savings goal.
   */
  async updateSavingsGoal(goal: SavingsGoal): Promise<SavingsGoal> {
    await this.ensureReady();
    const trimmedName = goal.name.trim();
    if (!trimmedName) {
      throw new Error('লক্ষ্যের নাম আবশ্যক');
    }
    if (goal.targetAmountPaisa <= 0n) {
      throw new Error('লক্ষ্যমাত্রা শূন্যের চেয়ে বেশি হতে হবে');
    }
    const currentSaved = goal.currentAmountPaisa ?? goal.currentSavedPaisa ?? 0n;
    if (currentSaved < 0n) {
      throw new Error('সঞ্চিত পরিমাণ ঋণাত্মক হতে পারে না');
    }

    const allGoals = await this.getSavingsGoals();
    const index = allGoals.findIndex((g) => g.id === goal.id);
    if (index === -1) {
      throw new Error(`সঞ্চয় লক্ষ্য পাওয়া যায়নি: ID ${goal.id}`);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let status: SavingsGoal['status'] = 'in_progress';
    if (currentSaved >= goal.targetAmountPaisa) {
      status = 'completed';
    } else if (goal.targetDate && goal.targetDate < todayStr) {
      status = 'overdue';
    }

    const updated: SavingsGoal = {
      ...goal,
      name: trimmedName,
      currentAmountPaisa: currentSaved,
      currentSavedPaisa: currentSaved,
      status,
      updatedAt: new Date().toISOString(),
    };

    allGoals[index] = updated;
    await this.engine.writeSavingsGoals(allGoals.map(savingsGoalToDTO));
    return updated;
  }

  /**
   * Delete a savings goal and its associated contribution records.
   */
  async deleteSavingsGoal(id: string): Promise<boolean> {
    await this.ensureReady();
    const allGoals = await this.getSavingsGoals();
    const remainingGoals = allGoals.filter((g) => g.id !== id);
    if (remainingGoals.length === allGoals.length) {
      return false;
    }

    // Delete associated contribution records
    const allContribs = (await this.engine.readGoalContributions()).map(dtoToGoalContribution);
    const toDeleteContribIds = allContribs.filter((c) => c.goalId === id).map((c) => c.id);
    const remainingContribs = allContribs.filter((c) => c.goalId !== id);

    if (this.engine.deleteByIds) {
      if (toDeleteContribIds.length > 0) {
        await this.engine.deleteByIds('goal_contributions', toDeleteContribIds);
      }
      await this.engine.deleteByIds('savings_goals', [id]);
    }

    await this.engine.writeSavingsGoals(remainingGoals.map(savingsGoalToDTO));
    await this.engine.writeGoalContributions(remainingContribs.map(goalContributionToDTO));

    return true;
  }

  /**
   * Add a contribution (deposit or withdrawal) to a savings goal.
   * Strictly prevents the saved amount from becoming negative.
   */
  async addGoalContribution(data: {
    goalId: string;
    amountPaisa: bigint;
    type: GoalContributionType;
    note?: string;
    date?: string;
  }): Promise<{ goal: SavingsGoal; contribution: GoalContribution }> {
    await this.ensureReady();
    if (data.amountPaisa <= 0n) {
      throw new Error('লেনদেনের পরিমাণ শূন্যের চেয়ে বেশি হতে হবে');
    }

    const goal = await this.getSavingsGoalById(data.goalId);
    if (!goal) {
      throw new Error(`সঞ্চয় লক্ষ্য পাওয়া যায়নি: ID ${data.goalId}`);
    }

    const currentSaved = goal.currentAmountPaisa ?? goal.currentSavedPaisa ?? 0n;
    let newSavedPaisa: bigint;
    const isWithdrawal = data.type === 'withdrawal' || data.type === 'withdraw';

    if (isWithdrawal) {
      if (data.amountPaisa > currentSaved) {
        throw new Error(
          `উত্তোলনের পরিমাণ (৳${formatPaisaToDecimalString(data.amountPaisa)}) বর্তমান সঞ্চয়ের (৳${formatPaisaToDecimalString(currentSaved)}) চেয়ে বেশি হতে পারে না`
        );
      }
      newSavedPaisa = subtractPaisa(currentSaved, data.amountPaisa);
    } else {
      newSavedPaisa = addPaisa(currentSaved, data.amountPaisa);
    }

    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];
    const date = data.date || todayStr;

    let status: SavingsGoal['status'] = 'in_progress';
    if (newSavedPaisa >= goal.targetAmountPaisa) {
      status = 'completed';
    } else if (goal.targetDate && goal.targetDate < todayStr) {
      status = 'overdue';
    }

    const updatedGoal: SavingsGoal = {
      ...goal,
      currentAmountPaisa: newSavedPaisa,
      currentSavedPaisa: newSavedPaisa,
      status,
      updatedAt: now,
    };

    const contribution: GoalContribution = {
      id: `gcon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      goalId: goal.id,
      amountPaisa: data.amountPaisa,
      type: isWithdrawal ? 'withdrawal' : 'deposit',
      date,
      note: data.note?.trim(),
      createdAt: now,
    };

    // Save updated goal
    const allGoals = await this.getSavingsGoals();
    const goalIndex = allGoals.findIndex((g) => g.id === goal.id);
    if (goalIndex !== -1) {
      allGoals[goalIndex] = updatedGoal;
      await this.engine.writeSavingsGoals(allGoals.map(savingsGoalToDTO));
    }

    // Save contribution
    const allContribs = (await this.engine.readGoalContributions()).map(dtoToGoalContribution);
    allContribs.push(contribution);
    await this.engine.writeGoalContributions(allContribs.map(goalContributionToDTO));

    return { goal: updatedGoal, contribution };
  }

  /**
   * Retrieves contributions for a specific goal or all contributions.
   */
  async getGoalContributions(goalId?: string): Promise<GoalContribution[]> {
    await this.ensureReady();
    const dtos = await this.engine.readGoalContributions();
    let contribs = dtos.map(dtoToGoalContribution);
    if (goalId) {
      contribs = contribs.filter((c) => c.goalId === goalId);
    }
    return contribs.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  // =========================================================================
  // FINANCIAL REPORTS & ANALYTICS (BATCH 3)
  // =========================================================================

  /**
   * Generate complete financial reports and analytics based on filters.
   * Handles zero-income periods, transfer exclusion, and period comparisons.
   */
  async getFinancialReport(options: ReportFilterOptions): Promise<FinancialReportData> {
    await this.ensureReady();
    const allTransactions = await this.getTransactions();
    const allAccounts = await this.getAccounts();
    const allBudgets = await this.getBudgets();

    // Determine current period date boundaries
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let startDate: string;
    let endDate: string;
    let prevStartDate: string;
    let prevEndDate: string;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (options.timeframe === 'last_month') {
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const lastDayOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
      startDate = `${prevYear}-${pad(prevMonth)}-01`;
      endDate = `${prevYear}-${pad(prevMonth)}-${pad(lastDayOfPrevMonth)}`;

      const beforePrevMonth = prevMonth === 1 ? 12 : prevMonth - 1;
      const beforePrevYear = prevMonth === 1 ? prevYear - 1 : prevYear;
      const lastDayOfBefore = new Date(beforePrevYear, beforePrevMonth, 0).getDate();
      prevStartDate = `${beforePrevYear}-${pad(beforePrevMonth)}-01`;
      prevEndDate = `${beforePrevYear}-${pad(beforePrevMonth)}-${pad(lastDayOfBefore)}`;
    } else if (options.timeframe === 'this_year') {
      startDate = `${currentYear}-01-01`;
      endDate = `${currentYear}-12-31`;

      prevStartDate = `${currentYear - 1}-01-01`;
      prevEndDate = `${currentYear - 1}-12-31`;
    } else if (options.timeframe === 'custom' && options.startDate && options.endDate) {
      startDate = options.startDate;
      endDate = options.endDate;

      // Calculate span in milliseconds and derive previous equivalent window
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const spanMs = Math.max(0, endMs - startMs) + 86400000;
      const prevEndMs = startMs - 86400000;
      const prevStartMs = prevEndMs - spanMs + 86400000;

      prevStartDate = new Date(prevStartMs).toISOString().split('T')[0];
      prevEndDate = new Date(prevEndMs).toISOString().split('T')[0];
    } else {
      // Default: 'this_month'
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      startDate = `${currentYear}-${pad(currentMonth)}-01`;
      endDate = `${currentYear}-${pad(currentMonth)}-${pad(lastDay)}`;

      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const lastDayPrev = new Date(prevYear, prevMonth, 0).getDate();
      prevStartDate = `${prevYear}-${pad(prevMonth)}-01`;
      prevEndDate = `${prevYear}-${pad(prevMonth)}-${pad(lastDayPrev)}`;
    }

    // Filter helper for transactions
    const filterTx = (txList: typeof allTransactions, sDate: string, eDate: string) => {
      return txList.filter((tx) => {
        if (tx.date < sDate || tx.date > eDate) return false;
        if (options.accountId && options.accountId !== 'all') {
          if (tx.accountId !== options.accountId && tx.destinationAccountId !== options.accountId) {
            return false;
          }
        }
        if (options.category && options.category !== 'all') {
          if (tx.category !== options.category) return false;
        }
        return true;
      });
    };

    const currentPeriodTxs = filterTx(allTransactions, startDate, endDate);
    const prevPeriodTxs = filterTx(allTransactions, prevStartDate, prevEndDate);

    // Compute Current Period Metrics
    let totalIncomePaisa = 0n;
    let totalExpensePaisa = 0n;
    const categoryTotals = new Map<string, { totalPaisa: bigint; count: number }>();

    for (const tx of currentPeriodTxs) {
      if (tx.type === 'income') {
        totalIncomePaisa = addPaisa(totalIncomePaisa, tx.amountPaisa);
      } else if (tx.type === 'expense') {
        totalExpensePaisa = addPaisa(totalExpensePaisa, tx.amountPaisa);
        const existing = categoryTotals.get(tx.category) || { totalPaisa: 0n, count: 0 };
        categoryTotals.set(tx.category, {
          totalPaisa: addPaisa(existing.totalPaisa, tx.amountPaisa),
          count: existing.count + 1,
        });
      } else if (tx.type === 'transfer' && tx.transferFeePaisa && tx.transferFeePaisa > 0n) {
        totalExpensePaisa = addPaisa(totalExpensePaisa, tx.transferFeePaisa);
      }
    }

    const netCashFlowPaisa = subtractPaisa(totalIncomePaisa, totalExpensePaisa);

    const savingsRatePercent =
      totalIncomePaisa > 0n && netCashFlowPaisa > 0n
        ? Math.round(Number((netCashFlowPaisa * 10000n) / totalIncomePaisa) / 100)
        : 0;

    const expenseToIncomeRatioPercent =
      totalIncomePaisa > 0n
        ? Math.round(Number((totalExpensePaisa * 10000n) / totalIncomePaisa) / 100)
        : totalExpensePaisa > 0n
        ? 100
        : 0;

    // Previous Period Metrics
    let prevIncomePaisa = 0n;
    let prevExpensePaisa = 0n;
    for (const tx of prevPeriodTxs) {
      if (tx.type === 'income') {
        prevIncomePaisa = addPaisa(prevIncomePaisa, tx.amountPaisa);
      } else if (tx.type === 'expense') {
        prevExpensePaisa = addPaisa(prevExpensePaisa, tx.amountPaisa);
      } else if (tx.type === 'transfer' && tx.transferFeePaisa && tx.transferFeePaisa > 0n) {
        prevExpensePaisa = addPaisa(prevExpensePaisa, tx.transferFeePaisa);
      }
    }
    const prevNetCashFlowPaisa = subtractPaisa(prevIncomePaisa, prevExpensePaisa);

    // Percentage changes
    const calcChange = (curr: bigint, prev: bigint): number => {
      if (prev === 0n) return curr > 0n ? 100 : 0;
      return Math.round(Number(((curr - prev) * 10000n) / prev) / 100);
    };

    const comparison: PeriodComparison = {
      previousStartDate: prevStartDate,
      previousEndDate: prevEndDate,
      previousIncomePaisa: prevIncomePaisa,
      previousExpensePaisa: prevExpensePaisa,
      previousNetCashFlowPaisa: prevNetCashFlowPaisa,
      previousPeriodLabel: 'পূর্ববর্তী সমমানের সময়সীমা',
      netSavingsChangePaisa: subtractPaisa(netCashFlowPaisa, prevNetCashFlowPaisa),
      incomeChangePercent: calcChange(totalIncomePaisa, prevIncomePaisa),
      expenseChangePercent: calcChange(totalExpensePaisa, prevExpensePaisa),
      netCashFlowChangePercent: calcChange(netCashFlowPaisa, prevNetCashFlowPaisa),
    };

    // Category breakdown
    const categoryBreakdown: CategoryBreakdownItem[] = [];
    categoryTotals.forEach((data, category) => {
      const percentage =
        totalExpensePaisa > 0n
          ? Math.round(Number((data.totalPaisa * 10000n) / totalExpensePaisa) / 100)
          : 0;
      categoryBreakdown.push({
        category,
        totalPaisa: data.totalPaisa,
        percentage,
        transactionCount: data.count,
      });
    });
    categoryBreakdown.sort((a, b) => (b.totalPaisa > a.totalPaisa ? 1 : -1));

    const topExpenseCategory = categoryBreakdown[0] || null;

    // Monthly Comparison Trends (Last 6 months)
    const monthlyTrend: MonthlyComparisonItem[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const mKey = `${y}-${pad(m)}`;

      let mIncome = 0n;
      let mExpense = 0n;

      for (const tx of allTransactions) {
        if (!tx.date.startsWith(mKey)) continue;
        if (options.accountId && options.accountId !== 'all') {
          if (tx.accountId !== options.accountId && tx.destinationAccountId !== options.accountId) {
            continue;
          }
        }
        if (tx.type === 'income') {
          mIncome = addPaisa(mIncome, tx.amountPaisa);
        } else if (tx.type === 'expense') {
          mExpense = addPaisa(mExpense, tx.amountPaisa);
        } else if (tx.type === 'transfer' && tx.transferFeePaisa && tx.transferFeePaisa > 0n) {
          mExpense = addPaisa(mExpense, tx.transferFeePaisa);
        }
      }

      monthlyTrend.push({
        monthKey: mKey,
        monthLabel: getBengaliMonthYear(y, m),
        year: y,
        month: m,
        incomePaisa: mIncome,
        expensePaisa: mExpense,
        netPaisa: subtractPaisa(mIncome, mExpense),
      });
    }

    // Account Balances
    let totalBalancesPaisa = 0n;
    for (const a of allAccounts) {
      totalBalancesPaisa = addPaisa(totalBalancesPaisa, a.balancePaisa);
    }

    const accountBalances = allAccounts.map((a) => ({
      account: a,
      balancePaisa: a.balancePaisa,
      percentage:
        totalBalancesPaisa > 0n
          ? Math.round(Number((a.balancePaisa * 10000n) / totalBalancesPaisa) / 100)
          : 0,
    }));

    // Generate Factual Deterministic Insights
    const insights: FinancialInsight[] = [];
    if (topExpenseCategory) {
      insights.push({
        type: 'info',
        title: 'সর্বাধিক ব্যয় খাত',
        description: `সর্বাধিক ব্যয় হয়েছে "${topExpenseCategory.category}" খাতে (মোট ব্যয়ের ${topExpenseCategory.percentage}%, ৳${formatPaisaToDecimalString(topExpenseCategory.totalPaisa)})।`,
      });
    }

    if (totalIncomePaisa > 0n) {
      if (netCashFlowPaisa > 0n) {
        insights.push({
          type: 'success',
          title: 'ইতিবাচক ক্যাশ ফ্লো ও সঞ্চয়',
          description: `এই সময়ে আয়ের তুলনায় মোট ব্যয় কম হয়েছে; সঞ্চয়ের হার প্রায় ${savingsRatePercent}% (নেট ক্যাশ ফ্লো ৳${formatPaisaToDecimalString(netCashFlowPaisa)})।`,
        });
      } else if (netCashFlowPaisa < 0n) {
        insights.push({
          type: 'warning',
          title: 'ঋণাত্মক ক্যাশ ফ্লো',
          description: `এই সময়ে আয়ের চেয়ে ব্যয় বেশি হয়েছে (ঘাটতি ৳${formatPaisaToDecimalString(-netCashFlowPaisa)})।`,
        });
      } else {
        insights.push({
          type: 'info',
          title: 'ব্যয় আয়ের সমান',
          description: 'এই সময়ে মোট আয় ও ব্যয় সমান ছিল।',
        });
      }
    } else if (totalExpensePaisa > 0n) {
      insights.push({
        type: 'warning',
        title: 'আয়বিহীন সময়সীমা',
        description: `এই ফিল্টারকৃত সময়ে কোনো আয় রেকর্ড করা হয়নি; মোট ব্যয় হয়েছে ৳${formatPaisaToDecimalString(totalExpensePaisa)}।`,
      });
    } else {
      insights.push({
        type: 'info',
        title: 'লেনদেন তথ্য',
        description: 'এই সময়ে কোনো আয় বা ব্যয়ের লেনদেন পাওয়া যায়নি।',
      });
    }

    if (prevExpensePaisa > 0n) {
      const expChange = comparison.expenseChangePercent;
      if (expChange > 0) {
        insights.push({
          type: 'warning',
          title: 'ব্যয় বৃদ্ধি',
          description: `পূর্ববর্তী সমমানের সময়ের তুলনায় ব্যয় ${expChange}% বৃদ্ধি পেয়েছে।`,
        });
      } else if (expChange < 0) {
        insights.push({
          type: 'success',
          title: 'ব্যয় হ্রাস',
          description: `পূর্ববর্তী সমমানের সময়ের তুলনায় ব্যয় ${Math.abs(expChange)}% হ্রাস পেয়েছে।`,
        });
      } else {
        insights.push({
          type: 'info',
          title: 'অপরিবর্তিত ব্যয়',
          description: 'পূর্ববর্তী সমমানের সময়ের তুলনায় ব্যয় অপরিবর্তিত রয়েছে।',
        });
      }
    }

    // Check budget warnings in current month
    const currentMonthBudgets = allBudgets.filter(
      (b) => b.year === currentYear && b.month === currentMonth
    );
    if (currentMonthBudgets.length > 0) {
      let exceededCount = 0;
      for (const b of currentMonthBudgets) {
        const spent = categoryTotals.get(b.category)?.totalPaisa || 0n;
        const bLimit = b.amountPaisa ?? b.limitPaisa ?? 0n;
        if (spent > bLimit) exceededCount++;
      }
      if (exceededCount > 0) {
        insights.push({
          type: 'warning',
          title: 'বাজেট সীমা অতিক্রম',
          description: `চলতি মাসে ${exceededCount}টি ক্যাটাগরিতে বাজেট সীমা অতিক্রম করেছে।`,
        });
      }
    }

    const categoryExpenses: CategoryExpense[] = categoryBreakdown.map((c) => ({
      category: c.category,
      amountPaisa: c.totalPaisa,
      percentage: c.percentage,
      transactionCount: c.transactionCount,
    }));

    return {
      timeframe: options.timeframe,
      filterOptions: options,
      startDate,
      endDate,
      totalIncomePaisa,
      totalExpensePaisa,
      netCashFlowPaisa,
      savingsRatePercent,
      expenseToIncomeRatioPercent,
      topSpendingCategory: topExpenseCategory
        ? {
            category: topExpenseCategory.category,
            amountPaisa: topExpenseCategory.totalPaisa,
            percentage: topExpenseCategory.percentage,
          }
        : null,
      topExpenseCategory,
      categoryExpenses,
      categoryBreakdown,
      monthlyTrends: monthlyTrend,
      monthlyTrend,
      accountBalances,
      comparison,
      insights,
      transactionCount: currentPeriodTxs.length,
    };
  }

  // =========================================================================
  // BATCH 4 - FEATURE A: RECURRING TRANSACTIONS ENGINE
  // =========================================================================

  /**
   * Helper to advance a date string by a recurrence frequency and interval.
   * Accurately handles:
   * - Daily and weekly jumps.
   * - Month-end clamping (e.g. Jan 31 -> Feb 28/29 -> Mar 31).
   * - Leap years for yearly recurrence (Feb 29 -> Feb 28 on non-leap years).
   */
  calculateNextOccurrenceDate(
    currentDateStr: string,
    frequency: RecurrenceFrequency,
    interval: number = 1,
    anchorDay?: number
  ): string {
    const parts = currentDateStr.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    const safeInterval = Math.max(1, interval || 1);

    if (frequency === 'daily') {
      const dt = new Date(Date.UTC(y, m - 1, d + safeInterval));
      return dt.toISOString().split('T')[0];
    } else if (frequency === 'weekly') {
      const dt = new Date(Date.UTC(y, m - 1, d + safeInterval * 7));
      return dt.toISOString().split('T')[0];
    } else if (frequency === 'monthly') {
      const targetMonthIndex = m - 1 + safeInterval;
      const targetYear = y + Math.floor(targetMonthIndex / 12);
      const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12; // 0-11
      // Days in target month
      const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
      const baseDay = anchorDay ? anchorDay : d;
      const targetDay = Math.min(baseDay, daysInTargetMonth);
      const dt = new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
      return dt.toISOString().split('T')[0];
    } else if (frequency === 'yearly') {
      const targetYear = y + safeInterval;
      const daysInTargetMonth = new Date(Date.UTC(targetYear, m, 0)).getUTCDate();
      const baseDay = anchorDay ? anchorDay : d;
      const targetDay = Math.min(baseDay, daysInTargetMonth);
      const dt = new Date(Date.UTC(targetYear, m - 1, targetDay));
      return dt.toISOString().split('T')[0];
    }

    return currentDateStr;
  }

  /**
   * Retrieves all recurring transaction schedules.
   */
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    await this.ensureReady();
    const dtos = await this.engine.readRecurringTransactions();
    return dtos.map(dtoToRecurring);
  }

  /**
   * Retrieves a single recurring transaction by ID.
   */
  async getRecurringTransactionById(id: string): Promise<RecurringTransaction | null> {
    const all = await this.getRecurringTransactions();
    return all.find((r) => r.id === id) || null;
  }

  /**
   * Create and persist a new recurring transaction schedule.
   */
  async createRecurringTransaction(data: {
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
    status?: RecurringStatus;
  }): Promise<RecurringTransaction> {
    await this.ensureReady();

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new Error('পুনরাবৃত্ত লেনদেনের নাম আবশ্যক');
    }
    if (data.type !== 'income' && data.type !== 'expense') {
      throw new Error('শুধুমাত্র আয় বা ব্যয়ের জন্য পুনরাবৃত্ত লেনদেন সমর্থিত (ট্রান্সফার অসমর্থিত)');
    }
    if (data.amountPaisa <= 0n) {
      throw new Error('টাকার পরিমাণ অবশ্যই ০-এর বেশি হতে হবে');
    }
    const accounts = await this.getAccounts();
    const accountExists = accounts.some((a) => a.id === data.accountId);
    if (!accountExists) {
      throw new Error('নির্দিষ্ট অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি');
    }
    const trimmedCategory = data.category.trim();
    if (!trimmedCategory) {
      throw new Error('ক্যাটাগরি আবশ্যক');
    }
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(data.frequency)) {
      throw new Error('অবৈধ পুনরাবৃত্তির সময়সূচি');
    }

    const interval = Math.max(1, data.interval || 1);
    const startDate = data.startDate || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const newId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newRecurring: RecurringTransaction = {
      id: newId,
      name: trimmedName,
      type: data.type,
      amountPaisa: data.amountPaisa,
      accountId: data.accountId,
      category: trimmedCategory,
      note: data.note?.trim(),
      startDate,
      endDate: data.endDate || undefined,
      frequency: data.frequency,
      interval,
      status: data.status || 'active',
      nextDueDate: startDate,
      createdAt: now,
      updatedAt: now,
    };

    const all = await this.getRecurringTransactions();
    all.push(newRecurring);
    await this.engine.writeRecurringTransactions(all.map(recurringToDTO));
    return newRecurring;
  }

  /**
   * Update an existing recurring transaction schedule.
   */
  async updateRecurringTransaction(updated: RecurringTransaction): Promise<RecurringTransaction> {
    await this.ensureReady();

    if (!updated.name.trim()) {
      throw new Error('পুনরাবৃত্ত লেনদেনের নাম আবশ্যক');
    }
    if (updated.amountPaisa <= 0n) {
      throw new Error('টাকার পরিমাণ অবশ্যই ০-এর বেশি হতে হবে');
    }

    const all = await this.getRecurringTransactions();
    const index = all.findIndex((r) => r.id === updated.id);
    if (index === -1) {
      throw new Error(`পুনরাবৃত্ত লেনদেন পাওয়া যায়নি: ID ${updated.id}`);
    }

    const existing = all[index];
    let nextDueDate = updated.nextDueDate;
    if (updated.startDate !== existing.startDate && !existing.lastGeneratedDate) {
      nextDueDate = updated.startDate;
    }

    const modified: RecurringTransaction = {
      ...updated,
      name: updated.name.trim(),
      category: updated.category.trim(),
      note: updated.note?.trim(),
      interval: Math.max(1, updated.interval || 1),
      nextDueDate,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    all[index] = modified;
    await this.engine.writeRecurringTransactions(all.map(recurringToDTO));
    return modified;
  }

  /**
   * Delete a recurring transaction schedule by ID.
   */
  async deleteRecurringTransaction(id: string): Promise<boolean> {
    await this.ensureReady();
    const all = await this.getRecurringTransactions();
    const filtered = all.filter((r) => r.id !== id);
    if (filtered.length === all.length) {
      return false;
    }
    if (this.engine.deleteByIds) {
      await this.engine.deleteByIds('recurring_transactions', [id]);
    }
    await this.engine.writeRecurringTransactions(filtered.map(recurringToDTO));
    return true;
  }

  /**
   * Preview all due occurrences of active recurring transactions as of a given date (default today).
   * Does NOT modify financial records or write to database.
   */
  async previewDueRecurringTransactions(asOfDate?: string): Promise<GenerateDuePreview> {
    await this.ensureReady();
    const targetDate = asOfDate || new Date().toISOString().split('T')[0];
    const allRecurring = await this.getRecurringTransactions();
    const activeRecurring = allRecurring.filter((r) => r.status === 'active');

    const dueOccurrences: DueRecurringOccurrence[] = [];
    let totalIncomePaisa = 0n;
    let totalExpensePaisa = 0n;

    for (const r of activeRecurring) {
      let candidateDate = r.nextDueDate;
      // Loop to gather all due occurrences up to targetDate
      let guard = 0;
      while (candidateDate <= targetDate && guard < 100) {
        guard++;
        if (r.endDate && candidateDate > r.endDate) {
          break;
        }

        const occurrence: DueRecurringOccurrence = {
          recurringId: r.id,
          recurringName: r.name,
          type: r.type,
          amountPaisa: r.amountPaisa,
          accountId: r.accountId,
          category: r.category,
          note: r.note,
          dueDate: candidateDate,
          idempotencyKey: `rec_${r.id}_${candidateDate}`,
        };

        dueOccurrences.push(occurrence);
        if (r.type === 'income') {
          totalIncomePaisa = addPaisa(totalIncomePaisa, r.amountPaisa);
        } else {
          totalExpensePaisa = addPaisa(totalExpensePaisa, r.amountPaisa);
        }

        const anchorDay = parseInt(r.startDate.split('-')[2], 10);
        candidateDate = this.calculateNextOccurrenceDate(candidateDate, r.frequency, r.interval, anchorDay);
      }
    }

    return {
      dueOccurrences,
      totalCount: dueOccurrences.length,
      totalIncomePaisa,
      totalExpensePaisa,
      netDeltaPaisa: subtractPaisa(totalIncomePaisa, totalExpensePaisa),
    };
  }

  /**
   * Explicitly generate due transactions into the ledger.
   * Enforces:
   * - Strict idempotency (checks existing transaction notes for matching occurrence keys).
   * - Insufficient balance check for expenses (blocks overdraft according to existing rules).
   * - Advances nextDueDate and cancels expired schedules.
   */
  async generateDueRecurringTransactions(asOfDate?: string): Promise<GenerateDueResult> {
    await this.ensureReady();
    const preview = await this.previewDueRecurringTransactions(asOfDate);
    if (preview.dueOccurrences.length === 0) {
      return {
        generatedTransactions: [],
        skippedCount: 0,
        failedErrors: [],
      };
    }

    const allTransactions = await this.getTransactions();
    const allRecurring = await this.getRecurringTransactions();
    const recurringMap = new Map<string, RecurringTransaction>();
    for (const r of allRecurring) {
      recurringMap.set(r.id, { ...r });
    }

    const generatedTransactions: Transaction[] = [];
    const failedErrors: string[] = [];
    let skippedCount = 0;

    for (const occ of preview.dueOccurrences) {
      // 1. Idempotency Check: Was a transaction already created for this recurring occurrence?
      const marker = `[পুনরাবৃত্ত: ${occ.recurringId}@${occ.dueDate}]`;
      const alreadyExists = allTransactions.some(
        (t) => t.note && t.note.includes(marker)
      );

      if (alreadyExists) {
        skippedCount++;
        // Advance schedule in memory if it was behind
        const r = recurringMap.get(occ.recurringId);
        if (r && r.nextDueDate <= occ.dueDate) {
          const anchorDay = parseInt(r.startDate.split('-')[2], 10);
          r.nextDueDate = this.calculateNextOccurrenceDate(occ.dueDate, r.frequency, r.interval, anchorDay);
          r.lastGeneratedDate = occ.dueDate;
        }
        continue;
      }

      // 2. Insufficient Balance Check for Expenses
      if (occ.type === 'expense') {
        const account = await this.getAccountById(occ.accountId);
        if (!account || account.balancePaisa < occ.amountPaisa) {
          const accName = account ? account.name : 'অ্যাকাউন্ট';
          const errMsg = `"${accName}" অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স না থাকায় "${occ.recurringName}" (${occ.dueDate}) খরচটি তৈরি করা যায়নি`;
          failedErrors.push(errMsg);
          skippedCount++;
          continue;
        }
      }

      // 3. Add to ledger atomically through existing transaction engine
      try {
        const fullNote = occ.note ? `${marker} ${occ.note}` : marker;
        const newTx = await this.addTransaction({
          type: occ.type,
          amountPaisa: occ.amountPaisa,
          accountId: occ.accountId,
          category: occ.category,
          note: fullNote,
          date: occ.dueDate,
        });

        generatedTransactions.push(newTx);
        allTransactions.push(newTx);

        // Update recurring schedule state
        const r = recurringMap.get(occ.recurringId);
        if (r) {
          r.lastGeneratedDate = occ.dueDate;
          const anchorDay = parseInt(r.startDate.split('-')[2], 10);
          r.nextDueDate = this.calculateNextOccurrenceDate(occ.dueDate, r.frequency, r.interval, anchorDay);
          if (r.endDate && r.nextDueDate > r.endDate) {
            r.status = 'cancelled';
          }
          r.updatedAt = new Date().toISOString();
        }
      } catch (err: any) {
        failedErrors.push(err.message || 'লেনদেন তৈরিতে ব্যর্থতা');
        skippedCount++;
      }
    }

    // Persist all updated recurring schedules
    const updatedList = Array.from(recurringMap.values());
    await this.engine.writeRecurringTransactions(updatedList.map(recurringToDTO));

    return {
      generatedTransactions,
      skippedCount,
      failedErrors,
    };
  }

  // =========================================================================
  // BATCH 4 - FEATURE B: CUSTOMIZABLE DASHBOARD PREFERENCES
  // =========================================================================

  /**
   * Retrieves dashboard customization preferences.
   * Safely returns default preferences if missing or invalid.
   */
  async getDashboardPreferences(): Promise<DashboardPreferences> {
    await this.ensureReady();
    const dto = await this.engine.readDashboardPreferences();
    if (!dto || !Array.isArray(dto.widgets) || dto.widgets.length === 0) {
      await this.engine.writeDashboardPreferences(DEFAULT_DASHBOARD_PREFERENCES);
      return { ...DEFAULT_DASHBOARD_PREFERENCES };
    }
    return {
      widgets: dto.widgets,
      updatedAt: dto.updatedAt,
    };
  }

  /**
   * Saves updated dashboard customization preferences.
   * Validates widgets and prevents corruption of financial state.
   */
  async saveDashboardPreferences(prefs: DashboardPreferences): Promise<DashboardPreferences> {
    await this.ensureReady();
    if (!prefs || !Array.isArray(prefs.widgets)) {
      throw new Error('অবৈধ ড্যাশবোর্ড কাস্টমাইজেশন পছন্দ');
    }

    const sanitized: DashboardPreferences = {
      widgets: prefs.widgets.map((w, index) => ({
        id: w.id,
        labelBengali: w.labelBengali,
        visible: Boolean(w.visible),
        order: typeof w.order === 'number' ? w.order : index + 1,
        column: w.column === 'side' ? 'side' : 'main',
      })),
      updatedAt: new Date().toISOString(),
    };

    await this.engine.writeDashboardPreferences(sanitized);
    return sanitized;
  }

  /**
   * Reset dashboard preferences to default layout.
   */
  async resetDashboardPreferences(): Promise<DashboardPreferences> {
    await this.ensureReady();
    const defaults = { ...DEFAULT_DASHBOARD_PREFERENCES, updatedAt: new Date().toISOString() };
    await this.engine.writeDashboardPreferences(defaults);
    return defaults;
  }

  // =========================================================================
  // BATCH 4 - FEATURE C: ACCOUNT RECONCILIATION
  // =========================================================================

  /**
   * Calculate exact historical account balance as of a given date (end of date).
   * Rolls back all transactions that occurred strictly AFTER statementDate.
   */
  async calculateHistoricalAccountBalance(
    accountId: string,
    statementDate: string
  ): Promise<{
    appBalancePaisa: bigint;
    transactionsCount: number;
    statementTransactions: Transaction[];
  }> {
    await this.ensureReady();
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new Error(`অ্যাকাউন্ট পাওয়া যায়নি: ID ${accountId}`);
    }

    let rollingBalance = account.balancePaisa;
    const allTxs = await this.getTransactions();

    // Rollback transactions where tx.date > statementDate
    for (const tx of allTxs) {
      if (tx.date > statementDate) {
        if (tx.type === 'income' && tx.accountId === accountId) {
          // Income after date: subtract it
          rollingBalance = subtractPaisa(rollingBalance, tx.amountPaisa);
        } else if (tx.type === 'expense' && tx.accountId === accountId) {
          // Expense after date: add it back
          rollingBalance = addPaisa(rollingBalance, tx.amountPaisa);
        } else if (tx.type === 'transfer') {
          if (tx.accountId === accountId) {
            // Outgoing transfer after date: add back principal + transfer fee
            const totalOut = addPaisa(tx.amountPaisa, tx.transferFeePaisa || 0n);
            rollingBalance = addPaisa(rollingBalance, totalOut);
          } else if (tx.destinationAccountId === accountId) {
            // Incoming transfer after date: subtract principal
            rollingBalance = subtractPaisa(rollingBalance, tx.amountPaisa);
          }
        }
      }
    }

    // Transactions on or near statementDate for user review
    const statementTransactions = allTxs.filter(
      (t) =>
        (t.accountId === accountId || t.destinationAccountId === accountId) &&
        t.date <= statementDate
    );

    return {
      appBalancePaisa: rollingBalance,
      transactionsCount: statementTransactions.length,
      statementTransactions: statementTransactions.slice(-20), // Recent 20 up to date
    };
  }

  /**
   * Create or update a reconciliation record comparing statement balance vs app balance.
   */
  async reconcileAccount(data: {
    accountId: string;
    statementDate: string;
    statementBalancePaisa: bigint;
    notes?: string;
  }): Promise<AccountReconciliation> {
    await this.ensureReady();
    const account = await this.getAccountById(data.accountId);
    if (!account) {
      throw new Error(`অ্যাকাউন্ট পাওয়া যায়নি: ID ${data.accountId}`);
    }

    const { appBalancePaisa } = await this.calculateHistoricalAccountBalance(
      data.accountId,
      data.statementDate
    );

    const differencePaisa = subtractPaisa(data.statementBalancePaisa, appBalancePaisa);
    const status: ReconciliationStatus = differencePaisa === 0n ? 'matched' : 'discrepancy';
    const now = new Date().toISOString();

    const record: AccountReconciliation = {
      id: `recn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      accountId: data.accountId,
      statementDate: data.statementDate,
      statementBalancePaisa: data.statementBalancePaisa,
      appBalancePaisa,
      differencePaisa,
      status,
      notes: data.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    const all = await this.getAccountReconciliations();
    all.push(record);
    await this.engine.writeAccountReconciliations(all.map(reconciliationToDTO));
    return record;
  }

  /**
   * Create an audit-friendly balance adjustment transaction for a discrepancy.
   * Strictly prevents duplicate adjustments for the same reconciliation record.
   */
  async createReconciliationAdjustment(
    reconciliationId: string
  ): Promise<{ reconciliation: AccountReconciliation; transaction: Transaction }> {
    await this.ensureReady();
    const all = await this.getAccountReconciliations();
    const index = all.findIndex((r) => r.id === reconciliationId);
    if (index === -1) {
      throw new Error(`রিকনসিলিয়েশন রেকর্ড পাওয়া যায়নি: ID ${reconciliationId}`);
    }

    const recn = all[index];
    if (recn.status === 'adjusted' || recn.adjustmentTransactionId) {
      throw new Error('এই রিকনসিলিয়েশনের জন্য ইতিমধ্যেই সমন্বয় সম্পন্ন করা হয়েছে');
    }
    if (recn.differencePaisa === 0n) {
      throw new Error('কোনো অমিল নেই (পার্থক্য ৳০.০০), সমন্বয় লেনদেনের প্রয়োজন নেই');
    }

    const isPositive = recn.differencePaisa > 0n;
    const absDiff = isPositive ? recn.differencePaisa : -recn.differencePaisa;
    const diffSignStr = isPositive ? '+' : '-';
    const auditNote = `[অ্যাকাউন্ট রিকনসিলিয়েশন সমন্বয়: বিবরণী তারিখ ${recn.statementDate}, পার্থক্য ${diffSignStr}৳${formatPaisaToDecimalString(absDiff)}] ${recn.notes || ''}`.trim();

    // Create adjustment transaction
    const adjustmentTx = await this.addTransaction({
      type: isPositive ? 'income' : 'expense',
      amountPaisa: absDiff,
      accountId: recn.accountId,
      category: 'ব্যালেন্স সমন্বয়',
      note: auditNote,
      date: recn.statementDate,
    });

    const now = new Date().toISOString();
    const updatedRecn: AccountReconciliation = {
      ...recn,
      status: 'adjusted',
      adjustmentTransactionId: adjustmentTx.id,
      updatedAt: now,
    };

    all[index] = updatedRecn;
    await this.engine.writeAccountReconciliations(all.map(reconciliationToDTO));

    return {
      reconciliation: updatedRecn,
      transaction: adjustmentTx,
    };
  }

  /**
   * Retrieves reconciliation history records (optionally filtered by account).
   */
  async getAccountReconciliations(accountId?: string): Promise<AccountReconciliation[]> {
    await this.ensureReady();
    const dtos = await this.engine.readAccountReconciliations();
    const records = dtos.map(dtoToReconciliation);
    if (accountId && accountId !== 'all') {
      return records.filter((r) => r.accountId === accountId);
    }
    return records;
  }

  // =========================================================================
  // BATCH 4 - FEATURE D: CASH FLOW FORECAST
  // =========================================================================

  /**
   * Transparent, deterministic cash flow forecast for 30, 60, or 90 days.
   * Utilizes starting balance, active recurring transactions, and historical baseline.
   * Excludes transfer principals from income/expenses; prevents double-counting.
   */
  async getCashFlowForecast(rangeDays: ForecastRangeDays = 30): Promise<CashFlowForecastResult> {
    await this.ensureReady();
    const todayStr = new Date().toISOString().split('T')[0];
    const [y, m, d] = todayStr.split('-').map(Number);

    // End date calculation
    const endDt = new Date(Date.UTC(y, m - 1, d + rangeDays));
    const endDateStr = endDt.toISOString().split('T')[0];

    // Current starting balance across all accounts
    const accounts = await this.getAccounts();
    let currentStartingBalancePaisa = 0n;
    for (const acc of accounts) {
      currentStartingBalancePaisa = addPaisa(currentStartingBalancePaisa, acc.balancePaisa);
    }

    // Active recurring transactions
    const allRecurring = await this.getRecurringTransactions();
    const activeRecurring = allRecurring.filter((r) => r.status === 'active');
    const allTxs = await this.getTransactions();

    // Map of scheduled events by date: YYYY-MM-DD -> { incomePaisa, expensePaisa, descriptions }
    const eventMap = new Map<
      string,
      { income: bigint; expense: bigint; descriptions: string[] }
    >();

    let recurringOccurrencesCount = 0;
    let projectedTotalIncomePaisa = 0n;
    let projectedTotalExpensePaisa = 0n;

    for (const r of activeRecurring) {
      let candidate = r.nextDueDate;
      let guard = 0;
      while (candidate <= endDateStr && guard < 100) {
        guard++;
        if (r.endDate && candidate > r.endDate) break;

        // Skip if occurrence was already generated into the ledger
        const marker = `[পুনরাবৃত্ত: ${r.id}@${candidate}]`;
        const alreadyInLedger = allTxs.some((t) => t.note && t.note.includes(marker));

        if (!alreadyInLedger && candidate >= todayStr) {
          recurringOccurrencesCount++;
          if (!eventMap.has(candidate)) {
            eventMap.set(candidate, { income: 0n, expense: 0n, descriptions: [] });
          }
          const item = eventMap.get(candidate)!;

          if (r.type === 'income') {
            item.income = addPaisa(item.income, r.amountPaisa);
            projectedTotalIncomePaisa = addPaisa(projectedTotalIncomePaisa, r.amountPaisa);
            item.descriptions.push(`${r.name} (+৳${formatPaisaToDecimalString(r.amountPaisa)})`);
          } else {
            item.expense = addPaisa(item.expense, r.amountPaisa);
            projectedTotalExpensePaisa = addPaisa(projectedTotalExpensePaisa, r.amountPaisa);
            item.descriptions.push(`${r.name} (-৳${formatPaisaToDecimalString(r.amountPaisa)})`);
          }
        }

        const anchorDay = parseInt(r.startDate.split('-')[2], 10);
        candidate = this.calculateNextOccurrenceDate(candidate, r.frequency, r.interval, anchorDay);
      }
    }

    // Generate timeline points
    const timeline: ForecastTimelinePoint[] = [];
    let runningBalance = currentStartingBalancePaisa;

    // Aggregate into daily or weekly checkpoints
    const step = rangeDays === 90 ? 7 : rangeDays === 60 ? 3 : 1;
    let accumulatedIncome = 0n;
    let accumulatedExpense = 0n;
    let accumulatedDescriptions: string[] = [];

    for (let dayOffset = 1; dayOffset <= rangeDays; dayOffset++) {
      const pointDt = new Date(Date.UTC(y, m - 1, d + dayOffset));
      const curDate = pointDt.toISOString().split('T')[0];
      const ev = eventMap.get(curDate);

      if (ev) {
        accumulatedIncome = addPaisa(accumulatedIncome, ev.income);
        accumulatedExpense = addPaisa(accumulatedExpense, ev.expense);
        accumulatedDescriptions.push(...ev.descriptions);
      }

      if (dayOffset % step === 0 || dayOffset === rangeDays) {
        const netChange = subtractPaisa(accumulatedIncome, accumulatedExpense);
        runningBalance = addPaisa(runningBalance, netChange);

        timeline.push({
          date: curDate,
          projectedIncomePaisa: accumulatedIncome,
          projectedExpensePaisa: accumulatedExpense,
          netChangePaisa: netChange,
          estimatedEndingBalancePaisa: runningBalance,
          sourceDescriptions: [...accumulatedDescriptions],
        });

        accumulatedIncome = 0n;
        accumulatedExpense = 0n;
        accumulatedDescriptions = [];
      }
    }

    const projectedNetChangePaisa = subtractPaisa(
      projectedTotalIncomePaisa,
      projectedTotalExpensePaisa
    );
    const estimatedEndingBalancePaisa = addPaisa(
      currentStartingBalancePaisa,
      projectedNetChangePaisa
    );

    const assumptions: string[] = [
      'বর্তমান সমস্ত হিসাবের মোট ব্যালেন্সকে প্রারম্ভিক স্থিতি হিসেবে বিবেচনা করা হয়েছে।',
      `সক্রিয় ${activeRecurring.length}টি পুনরাবৃত্ত সময়সূচির নির্ধারিত আয় ও ব্যয় প্রক্ষেপণে অন্তর্ভুক্ত।`,
      'অ্যাকাউন্ট স্থানান্তরের (Transfer) মূল অর্থ সার্বিক আয়/ব্যয়ে দ্বৈত গণনা করা হয়নি।',
      'ইতিমধ্যেই লেজারে বাস্তবায়িত পুনরাবৃত্ত লেনদেনগুলোকে পুনরায় গণনা করা হয়নি।',
      'এটি একটি স্বয়ংক্রিয় পূর্বাভাস; কোনো অনাকাঙ্ক্ষিত নতুন খরচ বা অঘোষিত আয় এতে অন্তর্ভুক্ত নয়।',
    ];

    const hasSufficientData = activeRecurring.length > 0 || accounts.length > 0;

    return {
      rangeDays,
      startDate: todayStr,
      endDate: endDateStr,
      currentStartingBalancePaisa,
      projectedTotalIncomePaisa,
      projectedTotalExpensePaisa,
      projectedNetChangePaisa,
      estimatedEndingBalancePaisa,
      timeline,
      assumptions,
      hasSufficientData,
      recurringOccurrencesCount,
    };
  }

  /**
   * Reset database back to default initial seed data
   */
  async resetToDefaults(): Promise<void> {
    await this.engine.resetToDefaults();
  }
}

export const persistentFinanceService = new PersistentFinanceService();
