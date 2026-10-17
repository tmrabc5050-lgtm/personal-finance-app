/**
 * Personal Finance Super App - Dashboard & Domain Types
 * Phase 05C - Step 1: Types & Utilities
 */

export type AccountType = 'cash' | 'bkash' | 'nagad' | 'bank' | 'other';

export type TransactionType = 'income' | 'expense' | 'transfer';

/**
 * Core Account Domain Entity
 * All financial amounts are strictly in integer paisa (bigint)
 */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  accountNumberMasked?: string;
  balancePaisa: bigint;
  currency: 'BDT';
  updatedAt: string; // ISO 8601
}

/**
 * Serializable Account Data Transfer Object (DTO)
 * Used for future JSON backup/restore or IPC without BigInt serialization errors
 */
export interface AccountDTO {
  id: string;
  name: string;
  type: AccountType;
  accountNumberMasked?: string;
  balancePaisaStr: string; // Decimal string representing integer paisa (e.g. "18545000")
  currency: 'BDT';
  updatedAt: string;
}

/**
 * Core Transaction Domain Entity
 */
export interface Transaction {
  id: string;
  type: TransactionType;
  amountPaisa: bigint;
  accountId: string; // Source account (or destination for standalone income)
  destinationAccountId?: string; // Required when type === 'transfer'
  transferFeePaisa?: bigint; // Transfer fee (strictly treated as expense, never affects transfer principal)
  category: string;
  note?: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO 8601 timestamp
}

/**
 * Serializable Transaction DTO for future JSON backup/restore
 */
export interface TransactionDTO {
  id: string;
  type: TransactionType;
  amountPaisaStr: string;
  accountId: string;
  destinationAccountId?: string;
  transferFeePaisaStr?: string;
  category: string;
  note?: string;
  date: string;
  createdAt: string;
}

/**
 * Category-wise expense breakdown item
 */
export interface CategoryExpense {
  category: string;
  amountPaisa: bigint;
  percentage: number; // 0 to 100 for display
  transactionCount: number;
}

/**
 * Monthly Cash Flow Summary
 * Note: Net balance is NOT income - expense; this tracks monthly delta
 */
export interface MonthlySummary {
  year: number;
  month: number; // 1 - 12
  totalIncomePaisa: bigint;
  totalExpensePaisa: bigint; // Includes regular expenses + transfer fees
  netSavingsPaisa: bigint; // totalIncomePaisa - totalExpensePaisa
}

/**
 * Aggregated Dashboard Data Payload
 */
export interface DashboardData {
  totalNetBalancePaisa: bigint; // Strictly calculated as sum of all accounts' current balances
  monthlySummary: MonthlySummary;
  accounts: Account[];
  recentTransactions: Transaction[];
  categoryExpenses: CategoryExpense[];
}

/**
 * Future-ready Dashboard Service Interface (compatible with Mock and Dexie)
 */
export interface IDashboardService {
  getDashboardData(year: number, month: number): Promise<DashboardData>;
}
