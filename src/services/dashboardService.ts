/**
 * Personal Finance Super App - Dashboard Service Interface
 * Phase 05C - Step 2: Mock Data & Service Layer
 *
 * Designed to seamlessly decouple UI from the underlying storage mechanism.
 * Current implementation uses MockDashboardService; future implementation will use DexieDashboardService.
 */

import {
  Account,
  CategoryExpense,
  DashboardData,
  MonthlySummary,
  Transaction,
} from '../types/dashboard';

export interface IDashboardService {
  /**
   * Retrieves the full aggregated dashboard payload for the specified year and month.
   */
  getDashboardData(year: number, month: number): Promise<DashboardData>;

  /**
   * Retrieves all user accounts and their current balances.
   */
  getAccounts(): Promise<Account[]>;

  /**
   * Calculates total net worth strictly as the sum of all accounts' current balances.
   */
  getTotalNetBalance(): Promise<bigint>;

  /**
   * Retrieves recent transactions sorted descending by date/time.
   */
  getRecentTransactions(limit?: number): Promise<Transaction[]>;

  /**
   * Retrieves monthly income, expense (including transfer fees), and net savings for a given month.
   */
  getMonthlySummary(year: number, month: number): Promise<MonthlySummary>;

  /**
   * Retrieves expense distribution aggregated by category for a given month.
   */
  getCategoryExpenses(year: number, month: number): Promise<CategoryExpense[]>;
}
