/**
 * Personal Finance Super App - Fictional Mock Dashboard Data
 * Phase 05C - Step 2: Mock Data & Service Layer
 *
 * All records here are strictly fictional for demonstration, testing, and UI preview.
 * Financial amounts are in integer paisa (BigInt).
 */

import { Account, Transaction } from '../types/dashboard';
import {
  RecurringTransaction,
  DashboardPreferences,
  AccountReconciliation,
} from '../types/recurringAndReconciliation';

/**
 * Fictional Demo Accounts
 * Total Net Worth = 1250000n + 845000n + 420000n + 16030000n = 18545000n (৳ ১,৮৫,৪৫০.০০)
 */
export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc_cash',
    name: 'হাতে থাকা নগদ',
    type: 'cash',
    balancePaisa: 1250000n, // ৳ ১২,৫০০.০০
    currency: 'BDT',
    updatedAt: '2026-10-16T10:00:00Z',
  },
  {
    id: 'acc_bkash',
    name: 'বিকাশ ওয়ালেট',
    type: 'bkash',
    accountNumberMasked: '০১৭****১২৩৪',
    balancePaisa: 845000n, // ৳ ৮,৪৫০.০০
    currency: 'BDT',
    updatedAt: '2026-10-16T12:30:00Z',
  },
  {
    id: 'acc_nagad',
    name: 'নগদ ওয়ালেট',
    type: 'nagad',
    accountNumberMasked: '০১৮****৫৬৭৮',
    balancePaisa: 420000n, // ৳ ৪,২০০.০০
    currency: 'BDT',
    updatedAt: '2026-10-15T18:20:00Z',
  },
  {
    id: 'acc_bank',
    name: 'ব্র্যাক ব্যাংক (সঞ্চয়ী)',
    type: 'bank',
    accountNumberMasked: '১৫০১****৭৮৯০',
    balancePaisa: 16030000n, // ৳ ১,৬০,৩০০.০০
    currency: 'BDT',
    updatedAt: '2026-10-16T09:00:00Z',
  },
];

/**
 * Fictional Demo Transactions
 * Contains Income, Expense, and Account Transfer with fee handling.
 */
export const MOCK_TRANSACTIONS: Transaction[] = [
  // October 2026 - Incomes
  {
    id: 'tx_inc_1',
    type: 'income',
    amountPaisa: 6500000n, // ৳ ৬৫,০০০.০০
    accountId: 'acc_bank',
    category: 'বেতন',
    note: 'অক্টোবর মাসের নিয়মিত বেতন',
    date: '2026-10-01',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'tx_inc_2',
    type: 'income',
    amountPaisa: 2000000n, // ৳ ২০,০০০.০০
    accountId: 'acc_bkash',
    category: 'ফ্রিল্যান্সিং',
    note: 'ওয়েব ডেভেলপমেন্ট প্রজেক্ট সম্মানী',
    date: '2026-10-12',
    createdAt: '2026-10-12T15:45:00Z',
  },

  // October 2026 - Expenses
  {
    id: 'tx_exp_1',
    type: 'expense',
    amountPaisa: 2000000n, // ৳ ২০,০০০.০০
    accountId: 'acc_bank',
    category: 'বাসা ভাড়া',
    note: 'অক্টোবর মাসের বাসা ভাড়া',
    date: '2026-10-02',
    createdAt: '2026-10-02T11:30:00Z',
  },
  {
    id: 'tx_exp_2',
    type: 'expense',
    amountPaisa: 425000n, // ৳ ৪,২৫০.০০
    accountId: 'acc_bkash',
    category: 'ইউটিলিটি ও বিল',
    note: 'ডেসকো বিদ্যুৎ ও ফাইবার ইন্টারনেট বিল',
    date: '2026-10-05',
    createdAt: '2026-10-05T14:10:00Z',
  },
  {
    id: 'tx_exp_3',
    type: 'expense',
    amountPaisa: 860000n, // ৳ ৮,৬০০.০০
    accountId: 'acc_cash',
    category: 'খাবার ও বাজার',
    note: 'সাপ্তাহিক কাঁচাবাজার ও মুদি কেনাকাটা',
    date: '2026-10-08',
    createdAt: '2026-10-08T08:30:00Z',
  },
  {
    id: 'tx_exp_4',
    type: 'expense',
    amountPaisa: 280000n, // ৳ ২,৮০০.০০
    accountId: 'acc_nagad',
    category: 'যাতায়াত ও পরিবহন',
    note: 'মাসিক যাতায়াত ও ফুয়েল খরচ',
    date: '2026-10-11',
    createdAt: '2026-10-11T17:00:00Z',
  },
  {
    id: 'tx_exp_5',
    type: 'expense',
    amountPaisa: 350000n, // ৳ ৩,৫০০.০০
    accountId: 'acc_cash',
    category: 'চিকিৎসা ও স্বাস্থ্য',
    note: 'ডাক্তারের ভিজিট ও জরুরি ওষুধ',
    date: '2026-10-14',
    createdAt: '2026-10-14T19:20:00Z',
  },
  {
    id: 'tx_exp_6',
    type: 'expense',
    amountPaisa: 298000n, // ৳ ২,৯৮০.০০
    accountId: 'acc_bkash',
    category: 'খাবার ও বাজার',
    note: 'সুপারশপ বাজার ও প্রয়োজনীয় ফলমূল',
    date: '2026-10-16',
    createdAt: '2026-10-16T12:00:00Z',
  },

  // October 2026 - Account Transfers
  {
    id: 'tx_tr_1',
    type: 'transfer',
    amountPaisa: 1000000n, // ৳ ১০,০০০.০০ স্থানান্তর
    accountId: 'acc_bank', // Source
    destinationAccountId: 'acc_bkash', // Destination
    transferFeePaisa: 0n, // ফ্রি স্থানান্তর
    category: 'স্থানান্তর',
    note: 'ব্যাংক থেকে বিকাশ অ্যাকাউন্টে অ্যাড মানি',
    date: '2026-10-03',
    createdAt: '2026-10-03T16:00:00Z',
  },
  {
    id: 'tx_tr_2',
    type: 'transfer',
    amountPaisa: 500000n, // ৳ ৫,০০০.০০ স্থানান্তর
    accountId: 'acc_bkash', // Source
    destinationAccountId: 'acc_cash', // Destination
    transferFeePaisa: 7000n, // ৳ ৭০.০০ ক্যাশ-আউট ফি (শুধু এটি ব্যয় হিসেবে গণ্য হবে)
    category: 'ফি ও চার্জ',
    note: 'জরুরি প্রয়োজনে বিকাশ থেকে ক্যাশ আউট',
    date: '2026-10-07',
    createdAt: '2026-10-07T18:40:00Z',
  },

  // September 2026 - Historical entries for month-filter verification
  {
    id: 'tx_sep_1',
    type: 'income',
    amountPaisa: 6500000n, // ৳ ৬৫,০০০.০০
    accountId: 'acc_bank',
    category: 'বেতন',
    note: 'সেপ্টেম্বর মাসের বেতন',
    date: '2026-09-01',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'tx_sep_2',
    type: 'expense',
    amountPaisa: 3800000n, // ৳ ৩৮,০০০.০০
    accountId: 'acc_bank',
    category: 'বাসা ভাড়া',
    note: 'সেপ্টেম্বর মাসের বাসা ভাড়া ও ইউটিলিটি',
    date: '2026-09-03',
    createdAt: '2026-09-03T11:00:00Z',
  },
];

/**
 * Fictional Seed Budgets for October 2026
 */
export const MOCK_BUDGETS = [
  {
    id: 'bgt_1',
    category: 'বাজার ও মুদি',
    amountPaisa: 1500000n, // ৳ ১৫,০০০.০০
    month: 10,
    year: 2026,
    warningThresholdPercent: 80,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'bgt_2',
    category: 'ইউটিলিটি ও বিল',
    amountPaisa: 400000n, // ৳ ৪,০০০.০০
    month: 10,
    year: 2026,
    warningThresholdPercent: 80,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'bgt_3',
    category: 'রেস্তোরাঁ ও নাস্তা',
    amountPaisa: 200000n, // ৳ ২,০০০.০০
    month: 10,
    year: 2026,
    warningThresholdPercent: 80,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'bgt_4',
    category: 'যাতায়াত ও ভ্রমণ',
    amountPaisa: 350000n, // ৳ ৩,৫০০.০০
    month: 10,
    year: 2026,
    warningThresholdPercent: 80,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

/**
 * Fictional Seed Savings Goals
 */
export const MOCK_SAVINGS_GOALS = [
  {
    id: 'goal_emergency',
    name: 'জরুরি আর্থিক তহবিল (Emergency Fund)',
    targetAmountPaisa: 10000000n, // ৳ ১,০০,০০০.০০
    currentAmountPaisa: 4500000n, // ৳ ৪৫,০০০.০০ (45%)
    targetDate: '2027-06-30',
    description: '৬ মাসের জীবনযাত্রার ব্যয় সঞ্চয়ের লক্ষ্যমাত্রা',
    category: 'নিরাপত্তা',
    icon: '🛡️',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-10-10T14:00:00Z',
  },
  {
    id: 'goal_laptop',
    name: 'নতুন ওয়ার্কস্টেশন ল্যাপটপ',
    targetAmountPaisa: 8000000n, // ৳ ৮০,০০০.০০
    currentAmountPaisa: 5200000n, // ৳ ৫২,০০০.০০ (65%)
    targetDate: '2026-12-31',
    description: 'কাজের জন্য উচ্চক্ষমতাসম্পন্ন ল্যাপটপ ক্রয়',
    category: 'প্রযুক্তি',
    icon: '💻',
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-10-12T16:00:00Z',
  },
  {
    id: 'goal_tour',
    name: 'সাজেক ও বান্দরবান ভ্রমণ',
    targetAmountPaisa: 2500000n, // ৳ ২৫,০০০.০০
    currentAmountPaisa: 2500000n, // ৳ ২৫,০০০.০০ (100% Completed)
    targetDate: '2026-11-15',
    description: 'শীতকালীন অবকাশ যাপন ও পরিবার নিয়ে ভ্রমণ',
    category: 'ভ্রমণ',
    icon: '✈️',
    createdAt: '2026-07-15T09:00:00Z',
    updatedAt: '2026-10-05T11:00:00Z',
  },
];

/**
 * Fictional Seed Goal Contributions
 */
export const MOCK_GOAL_CONTRIBUTIONS = [
  {
    id: 'gc_1',
    goalId: 'goal_emergency',
    amountPaisa: 2000000n,
    type: 'deposit' as const,
    note: 'প্রথম কিস্তি জমা',
    date: '2026-08-15',
    createdAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'gc_2',
    goalId: 'goal_emergency',
    amountPaisa: 2500000n,
    type: 'deposit' as const,
    note: 'বোনাস থেকে সঞ্চয়',
    date: '2026-10-10',
    createdAt: '2026-10-10T14:00:00Z',
  },
  {
    id: 'gc_3',
    goalId: 'goal_laptop',
    amountPaisa: 3000000n,
    type: 'deposit' as const,
    note: 'সেপ্টেম্বর সঞ্চয়',
    date: '2026-09-10',
    createdAt: '2026-09-10T12:00:00Z',
  },
  {
    id: 'gc_4',
    goalId: 'goal_laptop',
    amountPaisa: 2200000n,
    type: 'deposit' as const,
    note: 'ফ্রিল্যান্সিং আয়ের একাংশ',
    date: '2026-10-12',
    createdAt: '2026-10-12T16:00:00Z',
  },
  {
    id: 'gc_5',
    goalId: 'goal_tour',
    amountPaisa: 2500000n,
    type: 'deposit' as const,
    note: 'ভ্রমণ তহবিলে পূর্ণাঙ্গ জমা',
    date: '2026-10-05',
    createdAt: '2026-10-05T11:00:00Z',
  },
];

/**
 * Fictional Seed Recurring Transactions (Batch 4)
 */
export const MOCK_RECURRING_TRANSACTIONS: RecurringTransaction[] = [
  {
    id: 'rec_salary',
    name: 'মাসিক নিয়মিত বেতন',
    type: 'income',
    amountPaisa: 6500000n, // ৳ ৬৫,০০০.০০
    accountId: 'acc_bank',
    category: 'বেতন',
    note: 'মাসিক নিয়মিত বেতন ক্রেডিট',
    startDate: '2026-08-01',
    frequency: 'monthly',
    interval: 1,
    status: 'active',
    nextDueDate: '2026-11-01',
    lastGeneratedDate: '2026-10-01',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'rec_rent',
    name: 'মাসিক বাড়ি ভাড়া',
    type: 'expense',
    amountPaisa: 2000000n, // ৳ ২০,০০০.০০
    accountId: 'acc_bank',
    category: 'বাসা ভাড়া',
    note: 'মাসিক বাসা ভাড়া প্রদান',
    startDate: '2026-08-02',
    frequency: 'monthly',
    interval: 1,
    status: 'active',
    nextDueDate: '2026-11-02',
    lastGeneratedDate: '2026-10-02',
    createdAt: '2026-08-02T11:00:00Z',
    updatedAt: '2026-10-02T11:00:00Z',
  },
  {
    id: 'rec_internet',
    name: 'ফাইবার ইন্টারনেট বিল',
    type: 'expense',
    amountPaisa: 150000n, // ৳ ১,৫০০.০০
    accountId: 'acc_bkash',
    category: 'ইউটিলিটি ও বিল',
    note: 'ব্রডব্যান্ড ইন্টারনেট সাবস্ক্রিপশন',
    startDate: '2026-09-05',
    frequency: 'monthly',
    interval: 1,
    status: 'active',
    nextDueDate: '2026-11-05',
    lastGeneratedDate: '2026-10-05',
    createdAt: '2026-09-05T14:00:00Z',
    updatedAt: '2026-10-05T14:00:00Z',
  },
  {
    id: 'rec_grocery',
    name: 'সাপ্তাহিক বাজার ও মুদি',
    type: 'expense',
    amountPaisa: 250000n, // ৳ ২,৫০০.০০
    accountId: 'acc_cash',
    category: 'খাবার ও বাজার',
    note: 'সাপ্তাহিক কাঁচাবাজার',
    startDate: '2026-10-01',
    frequency: 'weekly',
    interval: 1,
    status: 'active',
    nextDueDate: '2026-10-22',
    lastGeneratedDate: '2026-10-15',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-15T08:00:00Z',
  },
];

/**
 * Default Dashboard Preferences (Batch 4)
 */
export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  widgets: [
    { id: 'total_balance', labelBengali: 'মোট নিট স্থিতি ও ব্যালেন্স', visible: true, order: 1, column: 'main' },
    { id: 'quick_actions', labelBengali: 'দ্রুত লেনদেন কার্যক্রম', visible: true, order: 2, column: 'main' },
    { id: 'recent_transactions', labelBengali: 'সাম্প্রতিক লেনদেনসমূহ', visible: true, order: 3, column: 'main' },
    { id: 'accounts', labelBengali: 'হিসাব ও ওয়ালেটসমূহ', visible: true, order: 4, column: 'side' },
    { id: 'monthly_chart', labelBengali: 'আয় ও ব্যয়ের তুলনা চার্ট', visible: true, order: 5, column: 'side' },
    { id: 'category_breakdown', labelBengali: 'খাতভিত্তিক ব্যয় বণ্টন', visible: true, order: 6, column: 'side' },
    { id: 'budget_status', labelBengali: 'বাজেট অগ্রগতি সংক্ষেপ', visible: true, order: 7, column: 'main' },
    { id: 'savings_goals', labelBengali: 'সঞ্চয় লক্ষ্য সংক্ষেপ', visible: true, order: 8, column: 'side' },
  ],
  updatedAt: '2026-10-16T10:00:00Z',
};

/**
 * Fictional Seed Reconciliation Records (Batch 4)
 */
export const MOCK_RECONCILIATIONS: AccountReconciliation[] = [
  {
    id: 'recn_seed_1',
    accountId: 'acc_bank',
    statementDate: '2026-10-15',
    statementBalancePaisa: 16030000n,
    appBalancePaisa: 16030000n,
    differencePaisa: 0n,
    status: 'matched',
    notes: '১৫ অক্টোবর ব্র্যাক ব্যাংক স্টেটমেন্টের সাথে হুবহু মিল পাওয়া গেছে',
    createdAt: '2026-10-15T18:00:00Z',
    updatedAt: '2026-10-15T18:00:00Z',
  },
];


