/**
 * Personal Finance Super App - Batch 4 Types
 * Feature A: Recurring Transactions
 * Feature B: Customizable Dashboard
 * Feature C: Account Reconciliation
 * Feature D: Cash Flow Forecast
 */

import { Transaction, TransactionType } from './dashboard';

// ============================================================================
// FEATURE A: RECURRING TRANSACTIONS TYPES
// ============================================================================

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringStatus = 'active' | 'paused' | 'cancelled';

export interface RecurringTransaction {
  id: string;
  name: string;
  type: TransactionType; // 'income' | 'expense' ('transfer' documented as unsupported for ledger safety)
  amountPaisa: bigint;
  accountId: string;
  category: string;
  note?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // Optional YYYY-MM-DD
  frequency: RecurrenceFrequency;
  interval: number; // e.g. 1 for every month, 2 for every 2 weeks
  status: RecurringStatus;
  nextDueDate: string; // YYYY-MM-DD
  lastGeneratedDate?: string; // YYYY-MM-DD
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface RecurringTransactionDTO {
  id: string;
  name: string;
  type: TransactionType;
  amountPaisaStr: string;
  accountId: string;
  category: string;
  note?: string;
  startDate: string;
  endDate?: string;
  frequency: RecurrenceFrequency;
  interval: number;
  status: RecurringStatus;
  nextDueDate: string;
  lastGeneratedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DueRecurringOccurrence {
  recurringId: string;
  recurringName: string;
  type: TransactionType;
  amountPaisa: bigint;
  accountId: string;
  category: string;
  note?: string;
  dueDate: string; // YYYY-MM-DD
  idempotencyKey: string; // `rec_${recurringId}_${dueDate}`
}

export interface GenerateDuePreview {
  dueOccurrences: DueRecurringOccurrence[];
  totalCount: number;
  totalIncomePaisa: bigint;
  totalExpensePaisa: bigint;
  netDeltaPaisa: bigint;
}

export interface GenerateDueResult {
  generatedTransactions: Transaction[];
  skippedCount: number; // Skipped due to already existing idempotency key or insufficient funds
  failedErrors: string[];
}

// ============================================================================
// FEATURE B: CUSTOMIZABLE DASHBOARD TYPES
// ============================================================================

export type DashboardWidgetId =
  | 'total_balance'
  | 'monthly_summary'
  | 'quick_actions'
  | 'recent_transactions'
  | 'accounts'
  | 'monthly_chart'
  | 'category_breakdown'
  | 'budget_status'
  | 'savings_goals';

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  labelBengali: string;
  visible: boolean;
  order: number;
  column: 'main' | 'side'; // Main feed (left) or side analytics (right)
}

export interface DashboardPreferences {
  widgets: DashboardWidgetConfig[];
  updatedAt: string;
}

export interface DashboardPreferencesDTO {
  widgets: DashboardWidgetConfig[];
  updatedAt: string;
}

// ============================================================================
// FEATURE C: ACCOUNT RECONCILIATION TYPES
// ============================================================================

export type ReconciliationStatus = 'matched' | 'discrepancy' | 'adjusted';

export interface AccountReconciliation {
  id: string;
  accountId: string;
  statementDate: string; // YYYY-MM-DD
  statementBalancePaisa: bigint;
  appBalancePaisa: bigint;
  differencePaisa: bigint; // statementBalancePaisa - appBalancePaisa
  status: ReconciliationStatus;
  adjustmentTransactionId?: string;
  notes?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface AccountReconciliationDTO {
  id: string;
  accountId: string;
  statementDate: string;
  statementBalancePaisaStr: string;
  appBalancePaisaStr: string;
  differencePaisaStr: string;
  status: ReconciliationStatus;
  adjustmentTransactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// FEATURE D: CASH FLOW FORECAST TYPES
// ============================================================================

export type ForecastRangeDays = 30 | 60 | 90;

export interface ForecastTimelinePoint {
  date: string; // YYYY-MM-DD
  projectedIncomePaisa: bigint;
  projectedExpensePaisa: bigint;
  netChangePaisa: bigint;
  estimatedEndingBalancePaisa: bigint;
  sourceDescriptions: string[]; // e.g. "বেতন (পুনরাবৃত্ত)", "দৈনিক গড় খরচ"
}

export interface CashFlowForecastResult {
  rangeDays: ForecastRangeDays;
  startDate: string; // YYYY-MM-DD (today)
  endDate: string;   // YYYY-MM-DD
  currentStartingBalancePaisa: bigint;
  projectedTotalIncomePaisa: bigint;
  projectedTotalExpensePaisa: bigint;
  projectedNetChangePaisa: bigint;
  estimatedEndingBalancePaisa: bigint;
  timeline: ForecastTimelinePoint[];
  assumptions: string[];
  hasSufficientData: boolean;
  recurringOccurrencesCount: number;
}
