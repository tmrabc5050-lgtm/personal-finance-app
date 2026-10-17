/**
 * Supabase Cloud Storage Engine
 * 
 * Implements IFinanceStorageEngine for multi-user cloud persistence using Supabase PostgreSQL.
 * Every read and write operation is scoped to the authenticated user's ID.
 * Preserves integer-paisa financial model by converting between string paisa and PostgreSQL BIGINT.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import {
  AccountDTO,
  TransactionDTO,
} from '../types/dashboard';
import {
  BudgetDTO,
  SavingsGoalDTO,
  GoalContributionDTO,
} from '../types/budgetAndGoals';
import {
  RecurringTransactionDTO,
  DashboardPreferencesDTO,
  AccountReconciliationDTO,
} from '../types/recurringAndReconciliation';
import { IFinanceStorageEngine } from './storageService';
import {
  MOCK_ACCOUNTS,
  MOCK_TRANSACTIONS,
  MOCK_BUDGETS,
  MOCK_SAVINGS_GOALS,
  MOCK_GOAL_CONTRIBUTIONS,
  MOCK_RECURRING_TRANSACTIONS,
  DEFAULT_DASHBOARD_PREFERENCES,
  MOCK_RECONCILIATIONS,
} from '../data/mockDashboardData';
import {
  accountToDTO,
  transactionToDTO,
  budgetToDTO,
  savingsGoalToDTO,
  goalContributionToDTO,
  recurringToDTO,
  reconciliationToDTO,
} from './storageService';

/**
 * Helper to fetch all rows across 1,000-row boundaries to prevent silent truncation.
 */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export class SupabaseStorageEngine implements IFinanceStorageEngine {
  private userId: string;
  private client: SupabaseClient | null;

  constructor(userId: string, customClient?: SupabaseClient) {
    this.userId = userId;
    this.client = customClient || supabase;
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client is not initialized or configured.');
    }
    return this.client;
  }

  /**
   * Delete records by ID from a given table strictly scoped to current user_id.
   * Resolves Critical C1: guarantees deleted records are removed from PostgreSQL.
   */
  async deleteByIds(
    table: 'accounts' | 'transactions' | 'budgets' | 'savings_goals' | 'goal_contributions' | 'recurring_transactions' | 'account_reconciliations',
    ids: string[]
  ): Promise<void> {
    if (ids.length === 0) return;
    const client = this.getClient();
    const { error } = await client
      .from(table)
      .delete()
      .eq('user_id', this.userId)
      .in('id', ids);

    if (error) throw error;
  }

  async initialize(): Promise<void> {
    // Fresh account initialization: Cloud users start completely clean with zero demo data.
    // The user creates their own accounts and inputs their own financial records.
  }

  async resetToDefaults(): Promise<void> {
    const userSuffix = this.userId.replace(/-/g, '').slice(0, 8);
    const idMap = new Map<string, string>();

    const getScopedId = (origId: string) => {
      if (!idMap.has(origId)) {
        idMap.set(origId, `${origId}_${userSuffix}`);
      }
      return idMap.get(origId)!;
    };

    const defaultAccounts = MOCK_ACCOUNTS.map((a) => {
      const dto = accountToDTO(a);
      return { ...dto, id: getScopedId(dto.id) };
    });

    const defaultTxs = MOCK_TRANSACTIONS.map((t) => {
      const dto = transactionToDTO(t);
      return {
        ...dto,
        id: getScopedId(dto.id),
        accountId: getScopedId(dto.accountId),
        destinationAccountId: dto.destinationAccountId
          ? getScopedId(dto.destinationAccountId)
          : undefined,
      };
    });

    const defaultBudgets = MOCK_BUDGETS.map((b) => {
      const dto = budgetToDTO(b as any);
      return { ...dto, id: getScopedId(dto.id) };
    });

    const defaultGoals = MOCK_SAVINGS_GOALS.map((g) => {
      const dto = savingsGoalToDTO(g as any);
      return { ...dto, id: getScopedId(dto.id) };
    });

    const defaultContributions = MOCK_GOAL_CONTRIBUTIONS.map((c) => {
      const dto = goalContributionToDTO(c as any);
      return {
        ...dto,
        id: getScopedId(dto.id),
        goalId: getScopedId(dto.goalId),
      };
    });

    const defaultRecurring = MOCK_RECURRING_TRANSACTIONS.map((r) => {
      const dto = recurringToDTO(r);
      return {
        ...dto,
        id: getScopedId(dto.id),
        accountId: getScopedId(dto.accountId),
      };
    });

    const defaultPrefs = DEFAULT_DASHBOARD_PREFERENCES;

    const defaultReconciliations = MOCK_RECONCILIATIONS.map((rec) => {
      const dto = reconciliationToDTO(rec);
      return {
        ...dto,
        id: getScopedId(dto.id),
        accountId: getScopedId(dto.accountId),
        adjustmentTransactionId: dto.adjustmentTransactionId
          ? getScopedId(dto.adjustmentTransactionId)
          : undefined,
      };
    });

    await this.writeAllData(
      defaultAccounts,
      defaultTxs,
      defaultBudgets,
      defaultGoals,
      defaultContributions,
      defaultRecurring,
      defaultPrefs,
      defaultReconciliations
    );
  }

  // --- ACCOUNTS ---

  async readAccounts(): Promise<AccountDTO[]> {
    const client = this.getClient();
    const rows = await fetchAll<any>((from, to) =>
      client
        .from('accounts')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      accountNumberMasked: row.account_number_masked || undefined,
      balancePaisaStr: String(row.balance_paisa),
      currency: row.currency || 'BDT',
      updatedAt: row.updated_at,
    }));
  }

  async writeAccounts(accounts: AccountDTO[]): Promise<void> {
    const client = this.getClient();
    const payload = accounts.map((a) => ({
      id: a.id,
      user_id: this.userId,
      name: a.name,
      type: a.type,
      account_number_masked: a.accountNumberMasked || null,
      balance_paisa: a.balancePaisaStr,
      currency: a.currency || 'BDT',
      updated_at: a.updatedAt || new Date().toISOString(),
    }));

    const { error } = await client
      .from('accounts')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  // --- TRANSACTIONS ---

  async readTransactions(): Promise<TransactionDTO[]> {
    const client = this.getClient();
    const rows = await fetchAll<any>((from, to) =>
      client
        .from('transactions')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );

    return rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      amountPaisaStr: String(row.amount_paisa),
      accountId: row.account_id,
      destinationAccountId: row.destination_account_id || undefined,
      transferFeePaisaStr: row.transfer_fee_paisa ? String(row.transfer_fee_paisa) : undefined,
      category: row.category,
      note: row.note || undefined,
      date: row.date,
      createdAt: row.created_at,
    }));
  }

  async writeTransactions(transactions: TransactionDTO[]): Promise<void> {
    const client = this.getClient();
    const payload = transactions.map((t) => ({
      id: t.id,
      user_id: this.userId,
      type: t.type,
      amount_paisa: t.amountPaisaStr,
      account_id: t.accountId,
      destination_account_id: t.destinationAccountId || null,
      transfer_fee_paisa: t.transferFeePaisaStr || '0',
      category: t.category,
      note: t.note || null,
      date: t.date,
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from('transactions')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  async writeAccountsAndTransactions(
    accounts: AccountDTO[],
    transactions: TransactionDTO[]
  ): Promise<void> {
    await this.writeAccounts(accounts);
    await this.writeTransactions(transactions);
  }

  // --- BUDGETS ---

  async readBudgets(): Promise<BudgetDTO[]> {
    const client = this.getClient();
    const rows = await fetchAll<any>((from, to) =>
      client
        .from('budgets')
        .select('*')
        .eq('user_id', this.userId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to)
    );

    return rows.map((row: any) => ({
      id: row.id,
      category: row.category,
      amountPaisaStr: String(row.amount_paisa),
      month: row.month,
      year: row.year,
      warningThresholdPercent: row.warning_threshold_percent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async writeBudgets(budgets: BudgetDTO[]): Promise<void> {
    const client = this.getClient();
    const payload = budgets.map((b) => ({
      id: b.id,
      user_id: this.userId,
      category: b.category,
      amount_paisa: b.amountPaisaStr,
      month: b.month,
      year: b.year,
      warning_threshold_percent: b.warningThresholdPercent,
      created_at: b.createdAt || new Date().toISOString(),
      updated_at: b.updatedAt || new Date().toISOString(),
    }));

    const { error } = await client
      .from('budgets')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  // --- SAVINGS GOALS ---

  async readSavingsGoals(): Promise<SavingsGoalDTO[]> {
    const client = this.getClient();
    const rows = await fetchAll<any>((from, to) =>
      client
        .from('savings_goals')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      targetAmountPaisaStr: String(row.target_amount_paisa),
      currentAmountPaisaStr: String(row.current_amount_paisa),
      targetDate: row.target_date || undefined,
      description: row.description || undefined,
      category: row.category || undefined,
      icon: row.icon || undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async writeSavingsGoals(goals: SavingsGoalDTO[]): Promise<void> {
    const client = this.getClient();
    const payload = goals.map((g) => ({
      id: g.id,
      user_id: this.userId,
      name: g.name,
      target_amount_paisa: g.targetAmountPaisaStr,
      current_amount_paisa: g.currentAmountPaisaStr,
      target_date: g.targetDate || null,
      description: g.description || null,
      category: g.category || null,
      icon: g.icon || null,
      status: g.status || 'in_progress',
      created_at: g.createdAt || new Date().toISOString(),
      updated_at: g.updatedAt || new Date().toISOString(),
    }));

    const { error } = await client
      .from('savings_goals')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  // --- GOAL CONTRIBUTIONS ---

  async readGoalContributions(): Promise<GoalContributionDTO[]> {
    const client = this.getClient();
    const rows = await fetchAll<any>((from, to) =>
      client
        .from('goal_contributions')
        .select('*')
        .eq('user_id', this.userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );

    return rows.map((row: any) => ({
      id: row.id,
      goalId: row.goal_id,
      amountPaisaStr: String(row.amount_paisa),
      type: row.type,
      note: row.note || undefined,
      date: row.date,
      createdAt: row.created_at,
    }));
  }

  async writeGoalContributions(contributions: GoalContributionDTO[]): Promise<void> {
    const client = this.getClient();
    const payload = contributions.map((c) => ({
      id: c.id,
      user_id: this.userId,
      goal_id: c.goalId,
      amount_paisa: c.amountPaisaStr,
      type: c.type,
      note: c.note || null,
      date: c.date,
      created_at: c.createdAt || new Date().toISOString(),
    }));

    const { error } = await client
      .from('goal_contributions')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  // --- RECURRING TRANSACTIONS ---

  async readRecurringTransactions(): Promise<RecurringTransactionDTO[]> {
    const client = this.getClient();
    const rows = await fetchAll<any>((from, to) =>
      client
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      amountPaisaStr: String(row.amount_paisa),
      accountId: row.account_id,
      category: row.category,
      note: row.note || undefined,
      startDate: row.start_date,
      endDate: row.end_date || undefined,
      frequency: row.frequency,
      interval: row.interval,
      status: row.status,
      nextDueDate: row.next_due_date,
      lastGeneratedDate: row.last_generated_date || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async writeRecurringTransactions(recurring: RecurringTransactionDTO[]): Promise<void> {
    const client = this.getClient();
    const payload = recurring.map((r) => ({
      id: r.id,
      user_id: this.userId,
      account_id: r.accountId,
      name: r.name,
      type: r.type,
      amount_paisa: r.amountPaisaStr,
      category: r.category,
      note: r.note || null,
      start_date: r.startDate,
      end_date: r.endDate || null,
      frequency: r.frequency,
      interval: r.interval,
      status: r.status,
      next_due_date: r.nextDueDate,
      last_generated_date: r.lastGeneratedDate || null,
      created_at: r.createdAt || new Date().toISOString(),
      updated_at: r.updatedAt || new Date().toISOString(),
    }));

    const { error } = await client
      .from('recurring_transactions')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  // --- DASHBOARD PREFERENCES ---

  async readDashboardPreferences(): Promise<DashboardPreferencesDTO | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('dashboard_preferences')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      widgets: data.widgets,
      updatedAt: data.updated_at,
    };
  }

  async writeDashboardPreferences(prefs: DashboardPreferencesDTO): Promise<void> {
    const client = this.getClient();
    const { error } = await client
      .from('dashboard_preferences')
      .upsert(
        {
          user_id: this.userId,
          widgets: prefs.widgets,
          updated_at: prefs.updatedAt || new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
  }

  // --- ACCOUNT RECONCILIATIONS ---

  async readAccountReconciliations(): Promise<AccountReconciliationDTO[]> {
    const client = this.getClient();
    const rows = await fetchAll<any>((from, to) =>
      client
        .from('account_reconciliations')
        .select('*')
        .eq('user_id', this.userId)
        .order('statement_date', { ascending: false })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );

    return rows.map((row: any) => ({
      id: row.id,
      accountId: row.account_id,
      statementDate: row.statement_date,
      statementBalancePaisaStr: String(row.statement_balance_paisa),
      appBalancePaisaStr: String(row.app_balance_paisa),
      differencePaisaStr: String(row.difference_paisa),
      status: row.status,
      adjustmentTransactionId: row.adjustment_transaction_id || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async writeAccountReconciliations(reconciliations: AccountReconciliationDTO[]): Promise<void> {
    const client = this.getClient();
    const payload = reconciliations.map((r) => ({
      id: r.id,
      user_id: this.userId,
      account_id: r.accountId,
      statement_date: r.statementDate,
      statement_balance_paisa: r.statementBalancePaisaStr,
      app_balance_paisa: r.appBalancePaisaStr,
      difference_paisa: r.differencePaisaStr,
      status: r.status,
      adjustment_transaction_id: r.adjustmentTransactionId || null,
      notes: r.notes || null,
      created_at: r.createdAt || new Date().toISOString(),
      updated_at: r.updatedAt || new Date().toISOString(),
    }));

    const { error } = await client
      .from('account_reconciliations')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  // --- WRITE ALL DATA (MIGRATION / RESTORE) ---

  async writeAllData(
    accounts: AccountDTO[],
    transactions: TransactionDTO[],
    budgets: BudgetDTO[],
    goals: SavingsGoalDTO[],
    contributions: GoalContributionDTO[],
    recurring: RecurringTransactionDTO[] = [],
    dashboardPrefs?: DashboardPreferencesDTO | null,
    reconciliations: AccountReconciliationDTO[] = []
  ): Promise<void> {
    // 1. Accounts first (foreign key root)
    if (accounts.length > 0) {
      await this.writeAccounts(accounts);
    }
    // 2. Transactions next
    if (transactions.length > 0) {
      await this.writeTransactions(transactions);
    }
    // 3. Budgets
    if (budgets.length > 0) {
      await this.writeBudgets(budgets);
    }
    // 4. Savings Goals
    if (goals.length > 0) {
      await this.writeSavingsGoals(goals);
    }
    // 5. Goal Contributions (references goals)
    if (contributions.length > 0) {
      await this.writeGoalContributions(contributions);
    }
    // 6. Recurring Transactions (references accounts)
    if (recurring.length > 0) {
      await this.writeRecurringTransactions(recurring);
    }
    // 7. Dashboard Preferences
    if (dashboardPrefs) {
      await this.writeDashboardPreferences(dashboardPrefs);
    }
    // 8. Reconciliations (references accounts and transactions)
    if (reconciliations.length > 0) {
      await this.writeAccountReconciliations(reconciliations);
    }
  }
}
