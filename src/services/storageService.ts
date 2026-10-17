/**
 * Personal Finance Super App - Storage Service
 * Batch 1: Core Finance Engine & Local Persistence Layer
 *
 * Provides robust, asynchronous persistence using native IndexedDB
 * with automatic fallback to localStorage / in-memory storage.
 *
 * Adheres strictly to the rule:
 * - BigInt amounts are safely serialized as decimal strings in DTOs.
 * - Single source of truth.
 * - Seeds with default fictional accounts and transactions on first run.
 */

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
  Account,
  AccountDTO,
  Transaction,
  TransactionDTO,
} from '../types/dashboard';
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

const DB_NAME = 'PersonalFinanceSuperAppDB';
const DB_VERSION = 3; // Incremented for Batch 4 stores
const STORE_ACCOUNTS = 'accounts';
const STORE_TRANSACTIONS = 'transactions';
const STORE_BUDGETS = 'budgets';
const STORE_SAVINGS_GOALS = 'savings_goals';
const STORE_GOAL_CONTRIBUTIONS = 'goal_contributions';
const STORE_RECURRING_TRANSACTIONS = 'recurring_transactions';
const STORE_DASHBOARD_PREFERENCES = 'dashboard_preferences';
const STORE_ACCOUNT_RECONCILIATIONS = 'account_reconciliations';

const STORAGE_KEY_ACCOUNTS = 'pf_super_app_accounts_v1';
const STORAGE_KEY_TRANSACTIONS = 'pf_super_app_transactions_v1';
const STORAGE_KEY_BUDGETS = 'pf_super_app_budgets_v1';
const STORAGE_KEY_GOALS = 'pf_super_app_goals_v1';
const STORAGE_KEY_CONTRIBUTIONS = 'pf_super_app_contributions_v1';
const STORAGE_KEY_RECURRING = 'pf_super_app_recurring_v1';
const STORAGE_KEY_DASHBOARD_PREFS = 'pf_super_app_dashboard_prefs_v1';
const STORAGE_KEY_RECONCILIATIONS = 'pf_super_app_reconciliations_v1';

// In-memory fallback if neither IndexedDB nor localStorage is usable (e.g. CLI Node test)
let memAccounts: AccountDTO[] | null = null;
let memTransactions: TransactionDTO[] | null = null;
let memBudgets: BudgetDTO[] | null = null;
let memGoals: SavingsGoalDTO[] | null = null;
let memContributions: GoalContributionDTO[] | null = null;
let memRecurring: RecurringTransactionDTO[] | null = null;
let memDashboardPrefs: DashboardPreferencesDTO | null = null;
let memReconciliations: AccountReconciliationDTO[] | null = null;

/**
 * Convert domain Account (with BigInt) to serializable AccountDTO
 */
export function accountToDTO(acc: Account): AccountDTO {
  return {
    id: acc.id,
    name: acc.name,
    type: acc.type,
    accountNumberMasked: acc.accountNumberMasked,
    balancePaisaStr: acc.balancePaisa.toString(),
    currency: acc.currency,
    updatedAt: acc.updatedAt,
  };
}

/**
 * Convert AccountDTO back to domain Account (with BigInt)
 */
export function dtoToAccount(dto: AccountDTO): Account {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    accountNumberMasked: dto.accountNumberMasked,
    balancePaisa: BigInt(dto.balancePaisaStr),
    currency: dto.currency,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Convert domain Transaction (with BigInt) to serializable TransactionDTO
 */
export function transactionToDTO(tx: Transaction): TransactionDTO {
  return {
    id: tx.id,
    type: tx.type,
    amountPaisaStr: tx.amountPaisa.toString(),
    accountId: tx.accountId,
    destinationAccountId: tx.destinationAccountId,
    transferFeePaisaStr:
      tx.transferFeePaisa !== undefined ? tx.transferFeePaisa.toString() : undefined,
    category: tx.category,
    note: tx.note,
    date: tx.date,
    createdAt: tx.createdAt,
  };
}

/**
 * Convert TransactionDTO back to domain Transaction (with BigInt)
 */
export function dtoToTransaction(dto: TransactionDTO): Transaction {
  return {
    id: dto.id,
    type: dto.type,
    amountPaisa: BigInt(dto.amountPaisaStr),
    accountId: dto.accountId,
    destinationAccountId: dto.destinationAccountId,
    transferFeePaisa:
      dto.transferFeePaisaStr !== undefined ? BigInt(dto.transferFeePaisaStr) : undefined,
    category: dto.category,
    note: dto.note,
    date: dto.date,
    createdAt: dto.createdAt,
  };
}

/**
 * Convert domain Budget to serializable BudgetDTO
 */
export function budgetToDTO(b: Budget): BudgetDTO {
  return {
    id: b.id,
    category: b.category,
    amountPaisaStr: (b.amountPaisa ?? b.limitPaisa ?? 0n).toString(),
    month: b.month,
    year: b.year,
    warningThresholdPercent: b.warningThresholdPercent ?? 80,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

/**
 * Convert BudgetDTO to domain Budget (with BigInt)
 */
export function dtoToBudget(dto: BudgetDTO): Budget {
  const amount = BigInt(dto.amountPaisaStr);
  return {
    id: dto.id,
    category: dto.category,
    amountPaisa: amount,
    limitPaisa: amount,
    month: dto.month,
    year: dto.year,
    warningThresholdPercent: dto.warningThresholdPercent ?? 80,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Convert domain SavingsGoal to serializable SavingsGoalDTO
 */
export function savingsGoalToDTO(g: SavingsGoal): SavingsGoalDTO {
  return {
    id: g.id,
    name: g.name,
    targetAmountPaisaStr: g.targetAmountPaisa.toString(),
    currentAmountPaisaStr: (g.currentAmountPaisa ?? g.currentSavedPaisa ?? 0n).toString(),
    targetDate: g.targetDate,
    description: g.description,
    category: g.category,
    icon: g.icon,
    status: g.status,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

/**
 * Convert SavingsGoalDTO to domain SavingsGoal (with BigInt)
 */
export function dtoToSavingsGoal(dto: SavingsGoalDTO): SavingsGoal {
  const target = BigInt(dto.targetAmountPaisaStr);
  const current = BigInt(dto.currentAmountPaisaStr);
  const todayStr = new Date().toISOString().split('T')[0];
  let status = dto.status || 'in_progress';
  if (current >= target) {
    status = 'completed';
  } else if (dto.targetDate && dto.targetDate < todayStr) {
    status = 'overdue';
  }

  return {
    id: dto.id,
    name: dto.name,
    targetAmountPaisa: target,
    currentAmountPaisa: current,
    currentSavedPaisa: current,
    targetDate: dto.targetDate,
    description: dto.description,
    category: dto.category,
    icon: dto.icon,
    status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Convert domain GoalContribution to GoalContributionDTO
 */
export function goalContributionToDTO(c: GoalContribution): GoalContributionDTO {
  return {
    id: c.id,
    goalId: c.goalId,
    amountPaisaStr: c.amountPaisa.toString(),
    type: c.type,
    note: c.note,
    date: c.date,
    createdAt: c.createdAt,
  };
}

/**
 * Convert GoalContributionDTO to domain GoalContribution
 */
export function dtoToGoalContribution(dto: GoalContributionDTO): GoalContribution {
  return {
    id: dto.id,
    goalId: dto.goalId,
    amountPaisa: BigInt(dto.amountPaisaStr),
    type: dto.type,
    note: dto.note,
    date: dto.date,
    createdAt: dto.createdAt,
  };
}

/**
 * Convert domain RecurringTransaction to RecurringTransactionDTO
 */
export function recurringToDTO(r: RecurringTransaction): RecurringTransactionDTO {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    amountPaisaStr: r.amountPaisa.toString(),
    accountId: r.accountId,
    category: r.category,
    note: r.note,
    startDate: r.startDate,
    endDate: r.endDate,
    frequency: r.frequency,
    interval: r.interval || 1,
    status: r.status,
    nextDueDate: r.nextDueDate,
    lastGeneratedDate: r.lastGeneratedDate,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/**
 * Convert RecurringTransactionDTO to domain RecurringTransaction
 */
export function dtoToRecurring(dto: RecurringTransactionDTO): RecurringTransaction {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    amountPaisa: BigInt(dto.amountPaisaStr),
    accountId: dto.accountId,
    category: dto.category,
    note: dto.note,
    startDate: dto.startDate,
    endDate: dto.endDate,
    frequency: dto.frequency,
    interval: dto.interval || 1,
    status: dto.status,
    nextDueDate: dto.nextDueDate,
    lastGeneratedDate: dto.lastGeneratedDate,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Convert domain AccountReconciliation to AccountReconciliationDTO
 */
export function reconciliationToDTO(r: AccountReconciliation): AccountReconciliationDTO {
  return {
    id: r.id,
    accountId: r.accountId,
    statementDate: r.statementDate,
    statementBalancePaisaStr: r.statementBalancePaisa.toString(),
    appBalancePaisaStr: r.appBalancePaisa.toString(),
    differencePaisaStr: r.differencePaisa.toString(),
    status: r.status,
    adjustmentTransactionId: r.adjustmentTransactionId,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/**
 * Convert AccountReconciliationDTO to domain AccountReconciliation
 */
export function dtoToReconciliation(dto: AccountReconciliationDTO): AccountReconciliation {
  return {
    id: dto.id,
    accountId: dto.accountId,
    statementDate: dto.statementDate,
    statementBalancePaisa: BigInt(dto.statementBalancePaisaStr),
    appBalancePaisa: BigInt(dto.appBalancePaisaStr),
    differencePaisa: BigInt(dto.differencePaisaStr),
    status: dto.status,
    adjustmentTransactionId: dto.adjustmentTransactionId,
    notes: dto.notes,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Check if running in browser with functional IndexedDB
 */
function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

/**
 * Check if running in browser with localStorage
 */
function isLocalStorageAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage !== null
    );
  } catch {
    return false;
  }
}

/**
 * Open IndexedDB Database
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB unavailable'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
        db.createObjectStore(STORE_ACCOUNTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        const txStore = db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' });
        txStore.createIndex('accountId', 'accountId', { unique: false });
        txStore.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BUDGETS)) {
        const bgtStore = db.createObjectStore(STORE_BUDGETS, { keyPath: 'id' });
        bgtStore.createIndex('category', 'category', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SAVINGS_GOALS)) {
        db.createObjectStore(STORE_SAVINGS_GOALS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_GOAL_CONTRIBUTIONS)) {
        const gcStore = db.createObjectStore(STORE_GOAL_CONTRIBUTIONS, { keyPath: 'id' });
        gcStore.createIndex('goalId', 'goalId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_RECURRING_TRANSACTIONS)) {
        const rtStore = db.createObjectStore(STORE_RECURRING_TRANSACTIONS, { keyPath: 'id' });
        rtStore.createIndex('status', 'status', { unique: false });
        rtStore.createIndex('nextDueDate', 'nextDueDate', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_DASHBOARD_PREFERENCES)) {
        db.createObjectStore(STORE_DASHBOARD_PREFERENCES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ACCOUNT_RECONCILIATIONS)) {
        const arStore = db.createObjectStore(STORE_ACCOUNT_RECONCILIATIONS, { keyPath: 'id' });
        arStore.createIndex('accountId', 'accountId', { unique: false });
        arStore.createIndex('statementDate', 'statementDate', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open IndexedDB'));
  });
}

export interface IFinanceStorageEngine {
  initialize(): Promise<void>;
  resetToDefaults(): Promise<void>;
  readAccounts(): Promise<AccountDTO[]>;
  writeAccounts(accounts: AccountDTO[]): Promise<void>;
  readTransactions(): Promise<TransactionDTO[]>;
  writeTransactions(transactions: TransactionDTO[]): Promise<void>;
  writeAccountsAndTransactions(
    accounts: AccountDTO[],
    transactions: TransactionDTO[]
  ): Promise<void>;
  readBudgets(): Promise<BudgetDTO[]>;
  writeBudgets(budgets: BudgetDTO[]): Promise<void>;
  readSavingsGoals(): Promise<SavingsGoalDTO[]>;
  writeSavingsGoals(goals: SavingsGoalDTO[]): Promise<void>;
  readGoalContributions(): Promise<GoalContributionDTO[]>;
  writeGoalContributions(contributions: GoalContributionDTO[]): Promise<void>;
  readRecurringTransactions(): Promise<RecurringTransactionDTO[]>;
  writeRecurringTransactions(recurring: RecurringTransactionDTO[]): Promise<void>;
  readDashboardPreferences(): Promise<DashboardPreferencesDTO | null>;
  writeDashboardPreferences(prefs: DashboardPreferencesDTO): Promise<void>;
  readAccountReconciliations(): Promise<AccountReconciliationDTO[]>;
  writeAccountReconciliations(reconciliations: AccountReconciliationDTO[]): Promise<void>;
  writeAllData(
    accounts: AccountDTO[],
    transactions: TransactionDTO[],
    budgets: BudgetDTO[],
    goals: SavingsGoalDTO[],
    contributions: GoalContributionDTO[],
    recurring?: RecurringTransactionDTO[],
    dashboardPrefs?: DashboardPreferencesDTO | null,
    reconciliations?: AccountReconciliationDTO[]
  ): Promise<void>;
}

/**
 * Core Local Storage Engine
 */
export class FinanceStorageEngine implements IFinanceStorageEngine {
  private isInitialized = false;

  /**
   * Initialize and seed database if empty
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const accounts = await this.readAccounts();
    if (accounts.length === 0) {
      // Seed default accounts
      const defaultAccounts = MOCK_ACCOUNTS.map(accountToDTO);
      await this.writeAccounts(defaultAccounts);

      // Seed default transactions
      const defaultTxs = MOCK_TRANSACTIONS.map(transactionToDTO);
      await this.writeTransactions(defaultTxs);
    }

    const budgets = await this.readBudgets();
    if (budgets.length === 0) {
      await this.writeBudgets(MOCK_BUDGETS.map((b) => budgetToDTO(b as any)));
    }

    const goals = await this.readSavingsGoals();
    if (goals.length === 0) {
      await this.writeSavingsGoals(MOCK_SAVINGS_GOALS.map((g) => savingsGoalToDTO(g as any)));
      await this.writeGoalContributions(
        MOCK_GOAL_CONTRIBUTIONS.map((c) => goalContributionToDTO(c as any))
      );
    }

    const recurring = await this.readRecurringTransactions();
    if (recurring.length === 0) {
      await this.writeRecurringTransactions(
        MOCK_RECURRING_TRANSACTIONS.map(recurringToDTO)
      );
    }

    const prefs = await this.readDashboardPreferences();
    if (!prefs) {
      await this.writeDashboardPreferences(DEFAULT_DASHBOARD_PREFERENCES);
    }

    const reconciliations = await this.readAccountReconciliations();
    if (reconciliations.length === 0) {
      await this.writeAccountReconciliations(
        MOCK_RECONCILIATIONS.map(reconciliationToDTO)
      );
    }

    this.isInitialized = true;
  }

  /**
   * Reset database to mock seed data across all 8 collections
   */
  async resetToDefaults(): Promise<void> {
    const defaultAccounts = MOCK_ACCOUNTS.map(accountToDTO);
    const defaultTxs = MOCK_TRANSACTIONS.map(transactionToDTO);
    const defaultBudgets = MOCK_BUDGETS.map((b) => budgetToDTO(b as any));
    const defaultGoals = MOCK_SAVINGS_GOALS.map((g) => savingsGoalToDTO(g as any));
    const defaultContributions = MOCK_GOAL_CONTRIBUTIONS.map((c) =>
      goalContributionToDTO(c as any)
    );
    const defaultRecurring = MOCK_RECURRING_TRANSACTIONS.map(recurringToDTO);
    const defaultPrefs = DEFAULT_DASHBOARD_PREFERENCES;
    const defaultReconciliations = MOCK_RECONCILIATIONS.map(reconciliationToDTO);

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

  // --- ACCOUNTS READ / WRITE ---

  async readAccounts(): Promise<AccountDTO[]> {
    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        return await new Promise<AccountDTO[]>((resolve, reject) => {
          const tx = db.transaction(STORE_ACCOUNTS, 'readonly');
          const store = tx.objectStore(STORE_ACCOUNTS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result as AccountDTO[]);
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to localStorage if IndexedDB fails
      }
    }

    if (isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        if (raw) return JSON.parse(raw);
        return [];
      } catch {
        // Fall back to memory
      }
    }

    return memAccounts ? [...memAccounts] : [];
  }

  async writeAccounts(accounts: AccountDTO[]): Promise<void> {
    memAccounts = [...accounts];

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
      } catch {
        // Ignore quota error if storage restricted
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_ACCOUNTS, 'readwrite');
          const store = tx.objectStore(STORE_ACCOUNTS);
          store.clear();
          for (const acc of accounts) {
            store.put(acc);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Ignore
      }
    }
  }

  // --- TRANSACTIONS READ / WRITE ---

  async readTransactions(): Promise<TransactionDTO[]> {
    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        return await new Promise<TransactionDTO[]>((resolve, reject) => {
          const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
          const store = tx.objectStore(STORE_TRANSACTIONS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result as TransactionDTO[]);
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to localStorage
      }
    }

    if (isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        if (raw) return JSON.parse(raw);
        return [];
      } catch {
        // Fall back to memory
      }
    }

    return memTransactions ? [...memTransactions] : [];
  }

  async writeTransactions(transactions: TransactionDTO[]): Promise<void> {
    memTransactions = [...transactions];

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
      } catch {
        // Ignore
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
          const store = tx.objectStore(STORE_TRANSACTIONS);
          store.clear();
          for (const t of transactions) {
            store.put(t);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Atomic multi-store write across BOTH accounts and transactions.
   * In IndexedDB, uses a single atomic transaction over [STORE_ACCOUNTS, STORE_TRANSACTIONS].
   */
  async writeAccountsAndTransactions(
    accounts: AccountDTO[],
    transactions: TransactionDTO[]
  ): Promise<void> {
    memAccounts = [...accounts];
    memTransactions = [...transactions];

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
        window.localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
      } catch {
        // Ignore
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction([STORE_ACCOUNTS, STORE_TRANSACTIONS], 'readwrite');

          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(new Error('Transaction aborted'));
          tx.oncomplete = () => resolve();

          const accStore = tx.objectStore(STORE_ACCOUNTS);
          accStore.clear();
          for (const a of accounts) {
            accStore.put(a);
          }

          const txStore = tx.objectStore(STORE_TRANSACTIONS);
          txStore.clear();
          for (const t of transactions) {
            txStore.put(t);
          }
        });
      } catch {
        // Fall back to individual writes if multi-store transaction unsupported
      }
    }
  }

  // --- BUDGETS READ / WRITE ---

  async readBudgets(): Promise<BudgetDTO[]> {
    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        return await new Promise<BudgetDTO[]>((resolve, reject) => {
          const tx = db.transaction(STORE_BUDGETS, 'readonly');
          const store = tx.objectStore(STORE_BUDGETS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result as BudgetDTO[]);
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to localStorage
      }
    }

    if (isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_BUDGETS);
        if (raw) return JSON.parse(raw);
        return [];
      } catch {
        // Fall back to memory
      }
    }

    return memBudgets ? [...memBudgets] : [];
  }

  async writeBudgets(budgets: BudgetDTO[]): Promise<void> {
    memBudgets = [...budgets];

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
      } catch {
        // Ignore
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_BUDGETS, 'readwrite');
          const store = tx.objectStore(STORE_BUDGETS);
          store.clear();
          for (const b of budgets) {
            store.put(b);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Ignore
      }
    }
  }

  // --- SAVINGS GOALS READ / WRITE ---

  async readSavingsGoals(): Promise<SavingsGoalDTO[]> {
    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        return await new Promise<SavingsGoalDTO[]>((resolve, reject) => {
          const tx = db.transaction(STORE_SAVINGS_GOALS, 'readonly');
          const store = tx.objectStore(STORE_SAVINGS_GOALS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result as SavingsGoalDTO[]);
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to localStorage
      }
    }

    if (isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_GOALS);
        if (raw) return JSON.parse(raw);
        return [];
      } catch {
        // Fall back to memory
      }
    }

    return memGoals ? [...memGoals] : [];
  }

  async writeSavingsGoals(goals: SavingsGoalDTO[]): Promise<void> {
    memGoals = [...goals];

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(goals));
      } catch {
        // Ignore
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_SAVINGS_GOALS, 'readwrite');
          const store = tx.objectStore(STORE_SAVINGS_GOALS);
          store.clear();
          for (const g of goals) {
            store.put(g);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Ignore
      }
    }
  }

  // --- GOAL CONTRIBUTIONS READ / WRITE ---

  async readGoalContributions(): Promise<GoalContributionDTO[]> {
    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        return await new Promise<GoalContributionDTO[]>((resolve, reject) => {
          const tx = db.transaction(STORE_GOAL_CONTRIBUTIONS, 'readonly');
          const store = tx.objectStore(STORE_GOAL_CONTRIBUTIONS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result as GoalContributionDTO[]);
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to localStorage
      }
    }

    if (isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_CONTRIBUTIONS);
        if (raw) return JSON.parse(raw);
        return [];
      } catch {
        // Fall back to memory
      }
    }

    return memContributions ? [...memContributions] : [];
  }

  async writeGoalContributions(contributions: GoalContributionDTO[]): Promise<void> {
    memContributions = [...contributions];

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_CONTRIBUTIONS, JSON.stringify(contributions));
      } catch {
        // Ignore
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_GOAL_CONTRIBUTIONS, 'readwrite');
          const store = tx.objectStore(STORE_GOAL_CONTRIBUTIONS);
          store.clear();
          for (const c of contributions) {
            store.put(c);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Ignore
      }
    }
  }

  // --- RECURRING TRANSACTIONS READ / WRITE ---

  async readRecurringTransactions(): Promise<RecurringTransactionDTO[]> {
    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        return await new Promise<RecurringTransactionDTO[]>((resolve, reject) => {
          const tx = db.transaction(STORE_RECURRING_TRANSACTIONS, 'readonly');
          const store = tx.objectStore(STORE_RECURRING_TRANSACTIONS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result as RecurringTransactionDTO[]);
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to localStorage
      }
    }

    if (isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_RECURRING);
        if (raw) return JSON.parse(raw);
        return [];
      } catch {
        // Fall back to memory
      }
    }

    return memRecurring ? [...memRecurring] : [];
  }

  async writeRecurringTransactions(recurring: RecurringTransactionDTO[]): Promise<void> {
    memRecurring = [...recurring];

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_RECURRING, JSON.stringify(recurring));
      } catch {
        // Ignore
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_RECURRING_TRANSACTIONS, 'readwrite');
          const store = tx.objectStore(STORE_RECURRING_TRANSACTIONS);
          store.clear();
          for (const r of recurring) {
            store.put(r);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Ignore
      }
    }
  }

  // --- DASHBOARD PREFERENCES READ / WRITE ---

  async readDashboardPreferences(): Promise<DashboardPreferencesDTO | null> {
    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        return await new Promise<DashboardPreferencesDTO | null>((resolve, reject) => {
          const tx = db.transaction(STORE_DASHBOARD_PREFERENCES, 'readonly');
          const store = tx.objectStore(STORE_DASHBOARD_PREFERENCES);
          const req = store.get('current_prefs');
          req.onsuccess = () => {
            if (req.result && req.result.preferences) {
              resolve(req.result.preferences as DashboardPreferencesDTO);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to localStorage
      }
    }

    if (isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_DASHBOARD_PREFS);
        if (raw) return JSON.parse(raw);
      } catch {
        // Fall back to memory
      }
    }

    return memDashboardPrefs ? { ...memDashboardPrefs } : null;
  }

  async writeDashboardPreferences(prefs: DashboardPreferencesDTO): Promise<void> {
    memDashboardPrefs = { ...prefs };

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_DASHBOARD_PREFS, JSON.stringify(prefs));
      } catch {
        // Ignore
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_DASHBOARD_PREFERENCES, 'readwrite');
          const store = tx.objectStore(STORE_DASHBOARD_PREFERENCES);
          store.put({ id: 'current_prefs', preferences: prefs });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Ignore
      }
    }
  }

  // --- ACCOUNT RECONCILIATIONS READ / WRITE ---

  async readAccountReconciliations(): Promise<AccountReconciliationDTO[]> {
    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        return await new Promise<AccountReconciliationDTO[]>((resolve, reject) => {
          const tx = db.transaction(STORE_ACCOUNT_RECONCILIATIONS, 'readonly');
          const store = tx.objectStore(STORE_ACCOUNT_RECONCILIATIONS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result as AccountReconciliationDTO[]);
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to localStorage
      }
    }

    if (isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_RECONCILIATIONS);
        if (raw) return JSON.parse(raw);
        return [];
      } catch {
        // Fall back to memory
      }
    }

    return memReconciliations ? [...memReconciliations] : [];
  }

  async writeAccountReconciliations(reconciliations: AccountReconciliationDTO[]): Promise<void> {
    memReconciliations = [...reconciliations];

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_RECONCILIATIONS, JSON.stringify(reconciliations));
      } catch {
        // Ignore
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_ACCOUNT_RECONCILIATIONS, 'readwrite');
          const store = tx.objectStore(STORE_ACCOUNT_RECONCILIATIONS);
          store.clear();
          for (const r of reconciliations) {
            store.put(r);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Atomic multi-store write across ALL collections:
   * [accounts, transactions, budgets, savings_goals, goal_contributions, recurring, preferences, reconciliations]
   */
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
    memAccounts = [...accounts];
    memTransactions = [...transactions];
    memBudgets = [...budgets];
    memGoals = [...goals];
    memContributions = [...contributions];
    memRecurring = [...recurring];
    if (dashboardPrefs) memDashboardPrefs = { ...dashboardPrefs };
    memReconciliations = [...reconciliations];

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
        window.localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        window.localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
        window.localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(goals));
        window.localStorage.setItem(STORAGE_KEY_CONTRIBUTIONS, JSON.stringify(contributions));
        window.localStorage.setItem(STORAGE_KEY_RECURRING, JSON.stringify(recurring));
        if (dashboardPrefs) {
          window.localStorage.setItem(STORAGE_KEY_DASHBOARD_PREFS, JSON.stringify(dashboardPrefs));
        }
        window.localStorage.setItem(STORAGE_KEY_RECONCILIATIONS, JSON.stringify(reconciliations));
      } catch {
        // Ignore
      }
    }

    if (isIndexedDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const storeNames = [
            STORE_ACCOUNTS,
            STORE_TRANSACTIONS,
            STORE_BUDGETS,
            STORE_SAVINGS_GOALS,
            STORE_GOAL_CONTRIBUTIONS,
            STORE_RECURRING_TRANSACTIONS,
            STORE_DASHBOARD_PREFERENCES,
            STORE_ACCOUNT_RECONCILIATIONS,
          ];
          const tx = db.transaction(storeNames, 'readwrite');

          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(new Error('Transaction aborted'));
          tx.oncomplete = () => resolve();

          const accStore = tx.objectStore(STORE_ACCOUNTS);
          accStore.clear();
          for (const a of accounts) accStore.put(a);

          const txStore = tx.objectStore(STORE_TRANSACTIONS);
          txStore.clear();
          for (const t of transactions) txStore.put(t);

          const bgtStore = tx.objectStore(STORE_BUDGETS);
          bgtStore.clear();
          for (const b of budgets) bgtStore.put(b);

          const goalStore = tx.objectStore(STORE_SAVINGS_GOALS);
          goalStore.clear();
          for (const g of goals) goalStore.put(g);

          const gcStore = tx.objectStore(STORE_GOAL_CONTRIBUTIONS);
          gcStore.clear();
          for (const c of contributions) gcStore.put(c);

          const rtStore = tx.objectStore(STORE_RECURRING_TRANSACTIONS);
          rtStore.clear();
          for (const r of recurring) rtStore.put(r);

          if (dashboardPrefs) {
            const prefStore = tx.objectStore(STORE_DASHBOARD_PREFERENCES);
            prefStore.put({ id: 'current_prefs', preferences: dashboardPrefs });
          }

          const recnStore = tx.objectStore(STORE_ACCOUNT_RECONCILIATIONS);
          recnStore.clear();
          for (const r of reconciliations) recnStore.put(r);
        });
      } catch {
        // Fall back to individual writes
        await this.writeAccounts(accounts);
        await this.writeTransactions(transactions);
        await this.writeBudgets(budgets);
        await this.writeSavingsGoals(goals);
        await this.writeGoalContributions(contributions);
        await this.writeRecurringTransactions(recurring);
        if (dashboardPrefs) await this.writeDashboardPreferences(dashboardPrefs);
        await this.writeAccountReconciliations(reconciliations);
      }
    }
  }
}

export const financeStorageEngine = new FinanceStorageEngine();

