/**
 * Personal Finance Super App - Budget, Savings Goals & Financial Report Types
 * Batch 3: Budget Engine, Financial Reports & Savings Goals
 */

import { Account, CategoryExpense } from './dashboard';

// ============================================================================
// BUDGET TYPES
// ============================================================================

export type BudgetStatus = 'not_started' | 'on_track' | 'warning' | 'exceeded';

export interface Budget {
  id: string;
  category: string;
  amountPaisa: bigint; // primary limit
  limitPaisa?: bigint; // alias for clarity
  month: number; // 1 - 12
  year: number;
  warningThresholdPercent: number; // Default 80
  createdAt: string;
  updatedAt: string;
}

export interface BudgetDTO {
  id: string;
  category: string;
  amountPaisaStr: string;
  month: number;
  year: number;
  warningThresholdPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  category: string;
  severity: 'warning' | 'danger';
  title: string;
  message: string;
  spentPercent: number;
}

export interface BudgetProgress {
  budget: Budget;
  spentPaisa: bigint;
  actualSpentPaisa?: bigint; // alias
  remainingPaisa: bigint;
  percentage: number; // 0 to 100+
  spentPercent?: number; // alias
  exceededPaisa: bigint;
  status: BudgetStatus;
}

export interface MonthlyBudgetSummary {
  year: number;
  month: number;
  totalBudgetPaisa: bigint;
  totalSpentPaisa: bigint;
  totalRemainingPaisa: bigint;
  remainingTotalPaisa?: bigint; // alias
  totalExceededPaisa: bigint;
  overallSpentPercent?: number;
  categoriesOnTrackCount: number;
  categoriesWarningCount: number;
  categoriesExceededCount: number;
  categoriesNotStartedCount: number;
  items: BudgetProgress[];
  categoryProgresses?: BudgetProgress[]; // alias
  alerts?: BudgetAlert[];
}

// ============================================================================
// SAVINGS GOAL TYPES
// ============================================================================

export type GoalStatus = 'in_progress' | 'completed' | 'overdue';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmountPaisa: bigint;
  currentAmountPaisa: bigint;
  currentSavedPaisa?: bigint; // alias
  targetDate?: string; // YYYY-MM-DD
  description?: string;
  category?: string;
  icon?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoalDTO {
  id: string;
  name: string;
  targetAmountPaisaStr: string;
  currentAmountPaisaStr: string;
  targetDate?: string;
  description?: string;
  category?: string;
  icon?: string;
  status?: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export type GoalContributionType = 'deposit' | 'withdrawal' | 'withdraw';

export interface GoalContribution {
  id: string;
  goalId: string;
  amountPaisa: bigint;
  type: 'deposit' | 'withdrawal';
  note?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface GoalContributionDTO {
  id: string;
  goalId: string;
  amountPaisaStr: string;
  type: 'deposit' | 'withdrawal';
  note?: string;
  date: string;
  createdAt: string;
}

export interface SavingsGoalProgress {
  goal: SavingsGoal;
  remainingPaisa: bigint;
  percentage: number;
  status: GoalStatus;
  contributions: GoalContribution[];
}

// ============================================================================
// FINANCIAL REPORT & ANALYTICS TYPES
// ============================================================================

export type ReportTimeframe = 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface ReportFilterOptions {
  timeframe: ReportTimeframe;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  selectedYear?: number;
  selectedMonth?: number;
  accountId?: string;
  category?: string;
}

export interface MonthlyTrendPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "অক্টোবর"
  year: number;
  month: number;
  incomePaisa: bigint;
  expensePaisa: bigint;
  netPaisa: bigint;
}

export type MonthlyComparisonItem = MonthlyTrendPoint;

export interface CategoryBreakdownItem {
  category: string;
  totalPaisa: bigint;
  percentage: number;
  transactionCount: number;
}

export interface PeriodComparison {
  incomeChangePercent: number; // positive = increased, negative = decreased
  expenseChangePercent: number;
  netSavingsChangePaisa: bigint;
  previousIncomePaisa: bigint;
  previousExpensePaisa: bigint;
  previousNetCashFlowPaisa?: bigint;
  netCashFlowChangePercent?: number;
  previousPeriodLabel?: string;
  previousStartDate?: string;
  previousEndDate?: string;
}

export interface FinancialInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface FinancialReportData {
  timeframe: ReportTimeframe;
  startDate: string;
  endDate: string;
  totalIncomePaisa: bigint;
  totalExpensePaisa: bigint;
  netCashFlowPaisa: bigint;
  savingsRatePercent: number; // 0 - 100
  expenseToIncomeRatioPercent: number;
  topSpendingCategory: {
    category: string;
    amountPaisa: bigint;
    percentage: number;
  } | null;
  categoryExpenses: CategoryExpense[];
  monthlyTrends: MonthlyTrendPoint[];
  accountBalances: {
    account: Account;
    balancePaisa: bigint;
    percentage: number;
  }[];
  comparison?: PeriodComparison;
  insights: FinancialInsight[];
  transactionCount: number;
  filterOptions?: ReportFilterOptions;
  topExpenseCategory?: CategoryBreakdownItem | null;
  categoryBreakdown?: CategoryBreakdownItem[];
  monthlyTrend?: MonthlyTrendPoint[];
}
