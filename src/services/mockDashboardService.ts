/**
 * Personal Finance Super App - Mock Dashboard Service Implementation
 * Phase 05C - Step 2: Mock Data & Service Layer
 *
 * Implements IDashboardService using isolated mock data.
 * Adheres strictly to the accounting rules:
 * 1. Total Net Balance = Sum of all account balances.
 * 2. Transfers do NOT count as income or expense (only transfer fees are treated as expense).
 * 3. All amounts use BigInt Integer Paisa.
 */

import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from '../data/mockDashboardData';
import {
  Account,
  CategoryExpense,
  DashboardData,
  MonthlySummary,
  Transaction,
} from '../types/dashboard';
import { addPaisa, subtractPaisa } from '../utils/currency';
import { IDashboardService } from './dashboardService';

export class MockDashboardService implements IDashboardService {
  private accounts: Account[];
  private transactions: Transaction[];

  constructor(
    initialAccounts: Account[] = MOCK_ACCOUNTS,
    initialTransactions: Transaction[] = MOCK_TRANSACTIONS
  ) {
    // Deep clone to prevent external mutation
    this.accounts = initialAccounts.map((a) => ({ ...a }));
    this.transactions = initialTransactions.map((t) => ({ ...t }));
  }

  /**
   * Retrieves all user accounts
   */
  async getAccounts(): Promise<Account[]> {
    return this.accounts.map((a) => ({ ...a }));
  }

  /**
   * Total Net Balance = Sum of all accounts' current balance
   */
  async getTotalNetBalance(): Promise<bigint> {
    return this.accounts.reduce(
      (total, acc) => addPaisa(total, acc.balancePaisa),
      0n
    );
  }

  /**
   * Retrieves recent transactions sorted newest first
   */
  async getRecentTransactions(limit = 10): Promise<Transaction[]> {
    return [...this.transactions]
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, limit)
      .map((t) => ({ ...t }));
  }

  /**
   * Calculates monthly income and expenses with transfer fee accounting
   */
  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    let totalIncomePaisa = 0n;
    let totalExpensePaisa = 0n;

    const monthlyTxs = this.getTransactionsForMonth(year, month);

    for (const tx of monthlyTxs) {
      if (tx.type === 'income') {
        totalIncomePaisa = addPaisa(totalIncomePaisa, tx.amountPaisa);
      } else if (tx.type === 'expense') {
        totalExpensePaisa = addPaisa(totalExpensePaisa, tx.amountPaisa);
      } else if (tx.type === 'transfer') {
        // Transfer principal is NOT counted as income or expense
        // Only transfer fee, if present, is treated as expense
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
    const monthlyTxs = this.getTransactionsForMonth(year, month);
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
        // Transfer fee categorized under category or default 'ফি ও চার্জ'
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
        // Scale to 2 decimal places: (amount * 10000n) / total -> then / 100
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

    // Sort descending by amount
    categoryExpenses.sort((a, b) => (b.amountPaisa > a.amountPaisa ? 1 : -1));

    return categoryExpenses;
  }

  /**
   * Aggregates the entire dashboard dataset for a given year and month
   */
  async getDashboardData(year: number, month: number): Promise<DashboardData> {
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
   * Helper: filter transactions belonging to a specific year and month
   */
  private getTransactionsForMonth(year: number, month: number): Transaction[] {
    return this.transactions.filter((tx) => {
      const parts = tx.date.split('-');
      if (parts.length < 2) return false;
      const txYear = parseInt(parts[0], 10);
      const txMonth = parseInt(parts[1], 10);
      return txYear === year && txMonth === month;
    });
  }
}

/**
 * Singleton instance for UI consumption
 */
export const mockDashboardService = new MockDashboardService();
