/**
 * Personal Finance Super App - Backup & CSV Export Service
 * Batch 3: Budget Engine, Financial Reports & Savings Goals
 *
 * Implements:
 * 1. Bengali-friendly CSV Export with UTF-8 BOM encoding for Excel/Spreadsheet.
 * 2. Versioned JSON Backup (v2.0.0) with strict BigInt decimal-string serialization.
 * 3. Backward-compatible validation supporting v1.0.0 and v2.0.0 payloads.
 * 4. Deep validation for budgets, savings goals, contributions, and atomic restore.
 */

import { Account, AccountDTO, Transaction, TransactionDTO } from '../types/dashboard';
import {
  Budget,
  BudgetDTO,
  SavingsGoal,
  SavingsGoalDTO,
  GoalContribution,
  GoalContributionDTO,
} from '../types/budgetAndGoals';
import {
  RecurringTransaction,
  RecurringTransactionDTO,
  DashboardPreferencesDTO,
  AccountReconciliation,
  AccountReconciliationDTO,
} from '../types/recurringAndReconciliation';
import {
  accountToDTO,
  dtoToAccount,
  dtoToTransaction,
  financeStorageEngine,
  transactionToDTO,
  budgetToDTO,
  dtoToBudget,
  savingsGoalToDTO,
  dtoToSavingsGoal,
  goalContributionToDTO,
  dtoToGoalContribution,
  recurringToDTO,
  dtoToRecurring,
  reconciliationToDTO,
  dtoToReconciliation,
} from './storageService';
import { formatPaisaToDecimalString } from '../utils/currency';

export const BACKUP_SCHEMA_VERSION = '3.0.0';
export const SUPPORTED_BACKUP_VERSIONS = ['1.0.0', '2.0.0', '3.0.0'];

export interface JSONBackupPayload {
  schema_version: string;
  app: string;
  export_timestamp: string;
  metadata: {
    total_accounts: number;
    total_transactions: number;
    total_budgets?: number;
    total_savings_goals?: number;
    total_recurring_transactions?: number;
    total_account_reconciliations?: number;
    net_balance_paisa_str: string;
  };
  accounts: AccountDTO[];
  transactions: TransactionDTO[];
  budgets?: BudgetDTO[];
  savings_goals?: SavingsGoalDTO[];
  goal_contributions?: GoalContributionDTO[];
  recurring_transactions?: RecurringTransactionDTO[];
  dashboard_preferences?: DashboardPreferencesDTO;
  account_reconciliations?: AccountReconciliationDTO[];
}

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  preview?: {
    accountCount: number;
    transactionCount: number;
    budgetCount: number;
    goalCount: number;
    savingsGoalCount?: number;
    recurringCount: number;
    reconciliationCount: number;
    totalNetBalancePaisa: bigint;
    accounts: Account[];
    transactions: Transaction[];
    budgets: Budget[];
    savingsGoals: SavingsGoal[];
    goalContributions: GoalContribution[];
    recurringTransactions: RecurringTransaction[];
    dashboardPreferences?: DashboardPreferencesDTO;
    accountReconciliations: AccountReconciliation[];
  };
}

/**
 * Escape a CSV field value
 */
function escapeCSV(field: string): string {
  // Prevent CSV Formula Injection in spreadsheets (Excel/Sheets)
  const safe = /^[=+\-@\t\r]/.test(field) ? `'${field}` : field;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Generate UTF-8 CSV string with BOM for Bengali compatibility
 */
export function generateTransactionsCSV(
  transactions: Transaction[],
  accounts: Account[]
): string {
  const accountMap = new Map<string, string>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc.name);
  }

  const BOM = '\uFEFF';
  const headers = [
    'তারিখ',
    'ধরন',
    'পরিমাণ (টাকা)',
    'উৎস হিসাব',
    'গন্তব্য হিসাব',
    'ক্যাটাগরি',
    'ফি (টাকা)',
    'বিবরণ / নোট',
  ];

  const rows: string[] = [headers.join(',')];

  const typeLabels: Record<string, string> = {
    income: 'আয়',
    expense: 'ব্যয়',
    transfer: 'স্থানান্তর',
  };

  for (const tx of transactions) {
    const typeLabel = typeLabels[tx.type] || tx.type;
    const amountTaka = formatPaisaToDecimalString(tx.amountPaisa);
    const sourceAcc = accountMap.get(tx.accountId) || tx.accountId;
    const destAcc = tx.destinationAccountId
      ? accountMap.get(tx.destinationAccountId) || tx.destinationAccountId
      : '';
    const feeTaka =
      tx.transferFeePaisa !== undefined
        ? formatPaisaToDecimalString(tx.transferFeePaisa)
        : '';
    const note = tx.note || '';

    const row = [
      escapeCSV(tx.date),
      escapeCSV(typeLabel),
      escapeCSV(amountTaka),
      escapeCSV(sourceAcc),
      escapeCSV(destAcc),
      escapeCSV(tx.category),
      escapeCSV(feeTaka),
      escapeCSV(note),
    ];

    rows.push(row.join(','));
  }

  return BOM + rows.join('\r\n');
}

/**
 * Trigger download of CSV in browser
 */
export function downloadCSV(csvContent: string, fileName?: string): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const name = fileName || `transactions_export_${dateStr}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate versioned JSON backup payload (v3.0.0)
 */
export function generateJSONBackup(
  accounts: Account[],
  transactions: Transaction[],
  budgets: Budget[] = [],
  savingsGoals: SavingsGoal[] = [],
  goalContributions: GoalContribution[] = [],
  recurringTransactions: RecurringTransaction[] = [],
  dashboardPreferences?: DashboardPreferencesDTO,
  accountReconciliations: AccountReconciliation[] = []
): string {
  const totalNetPaisa = accounts.reduce((sum, acc) => sum + acc.balancePaisa, 0n);

  const payload: JSONBackupPayload = {
    schema_version: BACKUP_SCHEMA_VERSION,
    app: 'Personal Finance Super App',
    export_timestamp: new Date().toISOString(),
    metadata: {
      total_accounts: accounts.length,
      total_transactions: transactions.length,
      total_budgets: budgets.length,
      total_savings_goals: savingsGoals.length,
      total_recurring_transactions: recurringTransactions.length,
      total_account_reconciliations: accountReconciliations.length,
      net_balance_paisa_str: totalNetPaisa.toString(),
    },
    accounts: accounts.map(accountToDTO),
    transactions: transactions.map(transactionToDTO),
    budgets: budgets.map(budgetToDTO),
    savings_goals: savingsGoals.map(savingsGoalToDTO),
    goal_contributions: goalContributions.map(goalContributionToDTO),
    recurring_transactions: recurringTransactions.map(recurringToDTO),
    dashboard_preferences: dashboardPreferences,
    account_reconciliations: accountReconciliations.map(reconciliationToDTO),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Trigger download of JSON backup in browser
 */
export function downloadJSONBackup(jsonString: string, fileName?: string): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const name = fileName || `finance_backup_${dateStr}.json`;

  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate a backup JSON string strictly before attempting restore.
 * Supports backward-compatible restore for v1.0.0 and current v2.0.0 payloads.
 */
export function validateBackupData(jsonString: string): BackupValidationResult {
  const errors: string[] = [];

  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch (parseErr) {
    return {
      isValid: false,
      errors: ['অবৈধ JSON ফাইল: ফাইলটি সঠিকভাবে পার্স করা সম্ভব হয়নি।'],
    };
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      isValid: false,
      errors: ['ব্যাকআপ ডেটার রুট এলিমেন্ট একটি অবজেক্ট হতে হবে।'],
    };
  }

  // 1. Schema version check
  if (!SUPPORTED_BACKUP_VERSIONS.includes(data.schema_version)) {
    errors.push(
      `অসমর্থিত ব্যাকআপ স্কিমা সংস্করণ: "${data.schema_version}". সমর্থিত সংস্করণ: ${SUPPORTED_BACKUP_VERSIONS.join(', ')}.`
    );
  }

  // 2. Validate accounts
  if (!Array.isArray(data.accounts)) {
    errors.push('accounts ফিল্ড একটি অ্যারে হতে হবে।');
  } else {
    const seenAccountIds = new Set<string>();

    data.accounts.forEach((acc: any, idx: number) => {
      if (typeof acc !== 'object' || acc === null) {
        errors.push(`accounts[${idx}] একটি বৈধ অবজেক্ট হতে হবে।`);
        return;
      }
      if (typeof acc.id !== 'string' || acc.id.trim().length === 0) {
        errors.push(`accounts[${idx}].id খালি হতে পারে না।`);
      } else {
        if (seenAccountIds.has(acc.id)) {
          errors.push(`ডুপ্লিকেট অ্যাকাউন্ট আইডি সনাক্ত হয়েছে: "${acc.id}"`);
        }
        seenAccountIds.add(acc.id);
      }

      if (typeof acc.name !== 'string' || acc.name.trim().length === 0) {
        errors.push(`accounts[${idx}].name খালি হতে পারে না।`);
      }

      if (!['cash', 'bkash', 'nagad', 'bank', 'other'].includes(acc.type)) {
        errors.push(`accounts[${idx}].type অবৈধ: "${acc.type}"`);
      }

      if (
        typeof acc.balancePaisaStr !== 'string' ||
        !/^-?\d+$/.test(acc.balancePaisaStr)
      ) {
        errors.push(`accounts[${idx}].balancePaisaStr একটি পূর্ণসংখ্যা স্ট্রিং হতে হবে।`);
      }
    });
  }

  // 3. Validate transactions
  if (!Array.isArray(data.transactions)) {
    errors.push('transactions ফিল্ড একটি অ্যারে হতে হবে।');
  } else if (Array.isArray(data.accounts)) {
    const accountIdSet = new Set(data.accounts.map((a: any) => a.id));
    const seenTxIds = new Set<string>();

    data.transactions.forEach((tx: any, idx: number) => {
      if (typeof tx !== 'object' || tx === null) {
        errors.push(`transactions[${idx}] একটি বৈধ অবজেক্ট হতে হবে।`);
        return;
      }

      if (typeof tx.id !== 'string' || tx.id.trim().length === 0) {
        errors.push(`transactions[${idx}].id খালি হতে পারে না।`);
      } else {
        if (seenTxIds.has(tx.id)) {
          errors.push(`ডুপ্লিকেট লেনদেন আইডি সনাক্ত হয়েছে: "${tx.id}"`);
        }
        seenTxIds.add(tx.id);
      }

      if (!['income', 'expense', 'transfer'].includes(tx.type)) {
        errors.push(`transactions[${idx}].type অবৈধ: "${tx.type}"`);
      }

      if (typeof tx.amountPaisaStr !== 'string' || !/^\d+$/.test(tx.amountPaisaStr)) {
        errors.push(`transactions[${idx}].amountPaisaStr একটি ধনাত্মক পূর্ণসংখ্যা স্ট্রিং হতে হবে।`);
      }

      // Check account reference
      if (data.accounts.length > 0 && !accountIdSet.has(tx.accountId)) {
        errors.push(
          `transactions[${idx}].accountId ("${tx.accountId}") কোনো বিদ্যমান অ্যাকাউন্টের সাথে মেলে না।`
        );
      }

      if (tx.type === 'transfer') {
        if (!tx.destinationAccountId) {
          errors.push(`transactions[${idx}] স্থানান্তর লেনদেনের গন্তব্য হিসাব নির্ধারণ করা আবশ্যক।`);
        } else if (data.accounts.length > 0 && !accountIdSet.has(tx.destinationAccountId)) {
          errors.push(
            `transactions[${idx}].destinationAccountId ("${tx.destinationAccountId}") কোনো বিদ্যমান অ্যাকাউন্টের সাথে মেলে না।`
          );
        } else if (tx.destinationAccountId === tx.accountId) {
          errors.push(`transactions[${idx}] স্থানান্তর লেনদেনের উৎস ও গন্তব্য হিসাব ভিন্ন হতে হবে।`);
        }
      }

      if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
        errors.push(`transactions[${idx}].date ফর্ম্যাট YYYY-MM-DD হতে হবে।`);
      }
    });
  }

  // 4. Validate budgets (if present, required in v2.0.0, optional in v1.0.0)
  if (data.budgets !== undefined) {
    if (!Array.isArray(data.budgets)) {
      errors.push('budgets ফিল্ড একটি অ্যারে হতে হবে।');
    } else {
      const seenBudgetIds = new Set<string>();
      const seenBudgetKeys = new Set<string>();

      data.budgets.forEach((b: any, idx: number) => {
        if (typeof b !== 'object' || b === null) {
          errors.push(`budgets[${idx}] একটি বৈধ অবজেক্ট হতে হবে।`);
          return;
        }

        if (typeof b.id !== 'string' || b.id.trim().length === 0) {
          errors.push(`budgets[${idx}].id খালি হতে পারে না।`);
        } else {
          if (seenBudgetIds.has(b.id)) {
            errors.push(`ডুপ্লিকেট বাজেট আইডি সনাক্ত হয়েছে: "${b.id}"`);
          }
          seenBudgetIds.add(b.id);
        }

        if (typeof b.category !== 'string' || b.category.trim().length === 0) {
          errors.push(`budgets[${idx}].category খালি হতে পারে না।`);
        }

        if (typeof b.amountPaisaStr !== 'string' || !/^\d+$/.test(b.amountPaisaStr)) {
          errors.push(`budgets[${idx}].amountPaisaStr একটি ধনাত্মক পূর্ণসংখ্যা স্ট্রিং হতে হবে।`);
        }

        if (typeof b.month !== 'number' || b.month < 1 || b.month > 12) {
          errors.push(`budgets[${idx}].month ১ থেকে ১২ এর মধ্যে হতে হবে।`);
        }

        if (typeof b.year !== 'number' || b.year < 2000 || b.year > 2100) {
          errors.push(`budgets[${idx}].year একটি বৈধ সাল হতে হবে।`);
        }

        const bgtKey = `${b.category}_${b.year}_${b.month}`;
        if (seenBudgetKeys.has(bgtKey)) {
          errors.push(`একই মাস ও ক্যাটাগরির জন্য ডুপ্লিকেট বাজেট বিদ্যমান: "${b.category} (${b.month}/${b.year})"`);
        }
        seenBudgetKeys.add(bgtKey);
      });
    }
  }

  // 5. Validate savings_goals (if present)
  if (data.savings_goals !== undefined) {
    if (!Array.isArray(data.savings_goals)) {
      errors.push('savings_goals ফিল্ড একটি অ্যারে হতে হবে।');
    } else {
      const seenGoalIds = new Set<string>();

      data.savings_goals.forEach((g: any, idx: number) => {
        if (typeof g !== 'object' || g === null) {
          errors.push(`savings_goals[${idx}] একটি বৈধ অবজেক্ট হতে হবে।`);
          return;
        }

        if (typeof g.id !== 'string' || g.id.trim().length === 0) {
          errors.push(`savings_goals[${idx}].id খালি হতে পারে না।`);
        } else {
          if (seenGoalIds.has(g.id)) {
            errors.push(`ডুপ্লিকেট সঞ্চয় লক্ষ্য আইডি সনাক্ত হয়েছে: "${g.id}"`);
          }
          seenGoalIds.add(g.id);
        }

        if (typeof g.name !== 'string' || g.name.trim().length === 0) {
          errors.push(`savings_goals[${idx}].name খালি হতে পারে না।`);
        }

        if (typeof g.targetAmountPaisaStr !== 'string' || !/^\d+$/.test(g.targetAmountPaisaStr)) {
          errors.push(`savings_goals[${idx}].targetAmountPaisaStr একটি ধনাত্মক পূর্ণসংখ্যা স্ট্রিং হতে হবে।`);
        }

        if (typeof g.currentAmountPaisaStr !== 'string' || !/^\d+$/.test(g.currentAmountPaisaStr)) {
          errors.push(`savings_goals[${idx}].currentAmountPaisaStr একটি ধনাত্মক পূর্ণসংখ্যা স্ট্রিং হতে হবে।`);
        }
      });
    }
  }

  // 6. Validate goal_contributions (if present)
  if (data.goal_contributions !== undefined) {
    if (!Array.isArray(data.goal_contributions)) {
      errors.push('goal_contributions ফিল্ড একটি অ্যারে হতে হবে।');
    } else {
      const seenContributionIds = new Set<string>();

      data.goal_contributions.forEach((c: any, idx: number) => {
        if (typeof c !== 'object' || c === null) {
          errors.push(`goal_contributions[${idx}] একটি বৈধ অবজেক্ট হতে হবে।`);
          return;
        }

        if (typeof c.id !== 'string' || c.id.trim().length === 0) {
          errors.push(`goal_contributions[${idx}].id খালি হতে পারে না।`);
        } else {
          if (seenContributionIds.has(c.id)) {
            errors.push(`ডুপ্লিকেট কন্ট্রিবিউশন আইডি সনাক্ত হয়েছে: "${c.id}"`);
          }
          seenContributionIds.add(c.id);
        }

        if (typeof c.goalId !== 'string' || c.goalId.trim().length === 0) {
          errors.push(`goal_contributions[${idx}].goalId খালি হতে পারে না।`);
        }

        if (typeof c.amountPaisaStr !== 'string' || !/^\d+$/.test(c.amountPaisaStr)) {
          errors.push(`goal_contributions[${idx}].amountPaisaStr একটি ধনাত্মক পূর্ণসংখ্যা স্ট্রিং হতে হবে।`);
        }

        if (!['deposit', 'withdrawal'].includes(c.type)) {
          errors.push(`goal_contributions[${idx}].type অবশ্যই deposit বা withdrawal হতে হবে।`);
        }
      });
    }
  }

  // 6. Validate recurring_transactions (if present)
  if (data.recurring_transactions !== undefined) {
    if (!Array.isArray(data.recurring_transactions)) {
      errors.push('recurring_transactions ফিল্ড একটি অ্যারে হতে হবে।');
    } else {
      const seenRecurringIds = new Set<string>();
      data.recurring_transactions.forEach((r: any, idx: number) => {
        if (typeof r !== 'object' || r === null) {
          errors.push(`recurring_transactions[${idx}] একটি বৈধ অবজেক্ট হতে হবে।`);
          return;
        }
        if (typeof r.id !== 'string' || r.id.trim().length === 0) {
          errors.push(`recurring_transactions[${idx}].id খালি হতে পারে না।`);
        } else {
          if (seenRecurringIds.has(r.id)) {
            errors.push(`ডুপ্লিকেট পুনরাবৃত্ত লেনদেন আইডি সনাক্ত হয়েছে: "${r.id}"`);
          }
          seenRecurringIds.add(r.id);
        }
        if (typeof r.name !== 'string' || r.name.trim().length === 0) {
          errors.push(`recurring_transactions[${idx}].name খালি হতে পারে না।`);
        }
        if (!['income', 'expense'].includes(r.type)) {
          errors.push(`recurring_transactions[${idx}].type অবশ্যই income বা expense হতে হবে।`);
        }
        if (typeof r.amountPaisaStr !== 'string' || !/^\d+$/.test(r.amountPaisaStr)) {
          errors.push(`recurring_transactions[${idx}].amountPaisaStr একটি ধনাত্মক পূর্ণসংখ্যা স্ট্রিং হতে হবে।`);
        }
        if (!['daily', 'weekly', 'monthly', 'yearly'].includes(r.frequency)) {
          errors.push(`recurring_transactions[${idx}].frequency অবৈধ: "${r.frequency}"`);
        }
        if (!['active', 'paused', 'cancelled'].includes(r.status)) {
          errors.push(`recurring_transactions[${idx}].status অবৈধ: "${r.status}"`);
        }
      });
    }
  }

  // 7. Validate account_reconciliations (if present)
  if (data.account_reconciliations !== undefined) {
    if (!Array.isArray(data.account_reconciliations)) {
      errors.push('account_reconciliations ফিল্ড একটি অ্যারে হতে হবে।');
    } else {
      const seenRecnIds = new Set<string>();
      data.account_reconciliations.forEach((ar: any, idx: number) => {
        if (typeof ar !== 'object' || ar === null) {
          errors.push(`account_reconciliations[${idx}] একটি বৈধ অবজেক্ট হতে হবে।`);
          return;
        }
        if (typeof ar.id !== 'string' || ar.id.trim().length === 0) {
          errors.push(`account_reconciliations[${idx}].id খালি হতে পারে না।`);
        } else {
          if (seenRecnIds.has(ar.id)) {
            errors.push(`ডুপ্লিকেট রিকনসিলিয়েশন আইডি সনাক্ত হয়েছে: "${ar.id}"`);
          }
          seenRecnIds.add(ar.id);
        }
        if (typeof ar.accountId !== 'string' || ar.accountId.trim().length === 0) {
          errors.push(`account_reconciliations[${idx}].accountId খালি হতে পারে না।`);
        }
        if (typeof ar.statementBalancePaisaStr !== 'string' || !/^-?\d+$/.test(ar.statementBalancePaisaStr)) {
          errors.push(`account_reconciliations[${idx}].statementBalancePaisaStr একটি পূর্ণসংখ্যা স্ট্রিং হতে হবে।`);
        }
      });
    }
  }

  // 8. Validate dashboard_preferences (if present)
  if (data.dashboard_preferences !== undefined && data.dashboard_preferences !== null) {
    if (typeof data.dashboard_preferences !== 'object' || !Array.isArray(data.dashboard_preferences.widgets)) {
      errors.push('dashboard_preferences.widgets একটি বৈধ অ্যারে হতে হবে।');
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  // Convert to domain objects for preview
  const accounts: Account[] = data.accounts.map(dtoToAccount);
  const transactions: Transaction[] = data.transactions.map(dtoToTransaction);
  const budgets: Budget[] = Array.isArray(data.budgets) ? data.budgets.map(dtoToBudget) : [];
  const savingsGoals: SavingsGoal[] = Array.isArray(data.savings_goals)
    ? data.savings_goals.map(dtoToSavingsGoal)
    : [];
  const goalContributions: GoalContribution[] = Array.isArray(data.goal_contributions)
    ? data.goal_contributions.map(dtoToGoalContribution)
    : [];
  const recurringTransactions: RecurringTransaction[] = Array.isArray(data.recurring_transactions)
    ? data.recurring_transactions.map(dtoToRecurring)
    : [];
  const accountReconciliations: AccountReconciliation[] = Array.isArray(data.account_reconciliations)
    ? data.account_reconciliations.map(dtoToReconciliation)
    : [];
  const dashboardPreferences: DashboardPreferencesDTO | undefined =
    data.dashboard_preferences && typeof data.dashboard_preferences === 'object'
      ? data.dashboard_preferences
      : undefined;

  const totalNetBalancePaisa = accounts.reduce((sum, a) => sum + a.balancePaisa, 0n);

  return {
    isValid: true,
    errors: [],
    preview: {
      accountCount: accounts.length,
      transactionCount: transactions.length,
      budgetCount: budgets.length,
      goalCount: savingsGoals.length,
      savingsGoalCount: savingsGoals.length,
      recurringCount: recurringTransactions.length,
      reconciliationCount: accountReconciliations.length,
      totalNetBalancePaisa,
      accounts,
      transactions,
      budgets,
      savingsGoals,
      goalContributions,
      recurringTransactions,
      dashboardPreferences,
      accountReconciliations,
    },
  };
}

/**
 * Execute atomic restore of validated backup data across all collections
 */
export async function executeRestore(
  accounts: Account[],
  transactions: Transaction[],
  budgets: Budget[] = [],
  savingsGoals: SavingsGoal[] = [],
  goalContributions: GoalContribution[] = [],
  recurringTransactions: RecurringTransaction[] = [],
  dashboardPreferences?: DashboardPreferencesDTO,
  accountReconciliations: AccountReconciliation[] = []
): Promise<void> {
  const accountDTOs = accounts.map(accountToDTO);
  const transactionDTOs = transactions.map(transactionToDTO);
  const budgetDTOs = budgets.map(budgetToDTO);
  const savingsGoalDTOs = savingsGoals.map(savingsGoalToDTO);
  const goalContributionDTOs = goalContributions.map(goalContributionToDTO);
  const recurringDTOs = recurringTransactions.map(recurringToDTO);
  const reconciliationDTOs = accountReconciliations.map(reconciliationToDTO);

  await financeStorageEngine.writeAllData(
    accountDTOs,
    transactionDTOs,
    budgetDTOs,
    savingsGoalDTOs,
    goalContributionDTOs,
    recurringDTOs,
    dashboardPreferences,
    reconciliationDTOs
  );
}
