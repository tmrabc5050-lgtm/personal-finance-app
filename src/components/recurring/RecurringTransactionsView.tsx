/**
 * Personal Finance Super App - Recurring Transactions View
 * Batch 4: Feature A - Recurring Transactions
 */

import React, { useEffect, useState } from 'react';
import { Account, TransactionType } from '../../types/dashboard';
import {
  GenerateDuePreview,
  GenerateDueResult,
  RecurrenceFrequency,
  RecurringStatus,
  RecurringTransaction,
} from '../../types/recurringAndReconciliation';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { formatBengaliDate } from '../../utils/date';
import { GenerateDueModal } from './GenerateDueModal';
import { RecurringTransactionModal } from './RecurringTransactionModal';

export interface RecurringTransactionsViewProps {
  accounts: Account[];
  isBalanceHidden: boolean;
  getRecurringTransactions: () => Promise<RecurringTransaction[]>;
  createRecurringTransaction: (data: {
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
  }) => Promise<RecurringTransaction>;
  updateRecurringTransaction: (recurring: RecurringTransaction) => Promise<RecurringTransaction>;
  deleteRecurringTransaction: (id: string) => Promise<boolean>;
  previewDueRecurringTransactions: (asOfDate?: string) => Promise<GenerateDuePreview>;
  generateDueRecurringTransactions: (asOfDate?: string) => Promise<GenerateDueResult>;
}

export const RecurringTransactionsView: React.FC<RecurringTransactionsViewProps> = ({
  accounts,
  isBalanceHidden,
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  previewDueRecurringTransactions,
  generateDueRecurringTransactions,
}) => {
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | RecurringStatus>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);

  // Generate Due state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  const [duePreview, setDuePreview] = useState<GenerateDuePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecurringTransactions();
      setRecurringList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'পুনরাবৃত্ত লেনদেন লোড করতে সমস্যা হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  const filteredItems = recurringList.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: RecurringTransaction) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleTogglePause = async (item: RecurringTransaction) => {
    const nextStatus: RecurringStatus = item.status === 'active' ? 'paused' : 'active';
    try {
      const updated = await updateRecurringTransaction({
        ...item,
        status: nextStatus,
      });
      setRecurringList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setToastMessage(
        nextStatus === 'paused'
          ? `"${item.name}" সাময়িকভাবে স্থগিত করা হয়েছে।`
          : `"${item.name}" পুনরায় সক্রিয় করা হয়েছে।`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'অবস্থা পরিবর্তন করা সম্ভব হয়নি।');
    }
  };

  const handleDelete = async (item: RecurringTransaction) => {
    if (
      !window.confirm(
        `আপনি কি নিশ্চিত যে "${item.name}" পুনরাবৃত্ত লেনদেনটি বাতিল করতে চান?`
      )
    ) {
      return;
    }
    try {
      await deleteRecurringTransaction(item.id);
      setRecurringList((prev) => prev.filter((r) => r.id !== item.id));
      setToastMessage(`"${item.name}" সফলভাবে মুছে ফেলা হয়েছে।`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বাতিল করা সম্ভব হয়নি।');
    }
  };

  const handleOpenGenerateDue = async () => {
    setIsLoadingPreview(true);
    setError(null);
    try {
      const preview = await previewDueRecurringTransactions();
      setDuePreview(preview);
      setIsGenerateModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বকেয়া হিসাব বের করা সম্ভব হয়নি।');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleGenerateSuccess = (result: GenerateDueResult) => {
    const createdCount = result.generatedTransactions.length;
    let msg = `${toBengaliNumeral(createdCount)}টি নতুন লেনদেন সফলভাবে লেজারে যুক্ত হয়েছে!`;
    if (result.skippedCount > 0) {
      msg += ` (${toBengaliNumeral(result.skippedCount)}টি ইতিমধ্যে তৈরি থাকায় স্কিপ করা হয়েছে)`;
    }
    setToastMessage(msg);
    fetchItems();
  };

  const getFrequencyLabel = (freq: RecurrenceFrequency, interval: number = 1): string => {
    const intervalStr = interval > 1 ? `প্রতি ${toBengaliNumeral(interval)} ` : '';
    switch (freq) {
      case 'daily':
        return interval > 1 ? `${intervalStr}দিন পর` : 'প্রতিদিন';
      case 'weekly':
        return interval > 1 ? `${intervalStr}সপ্তাহ পর` : 'সাপ্তাহিক';
      case 'monthly':
        return interval > 1 ? `${intervalStr}মাস পর` : 'মাসিক';
      case 'yearly':
        return interval > 1 ? `${intervalStr}বছর পর` : 'বার্ষিক';
      default:
        return freq;
    }
  };

  const getStatusBadge = (status: RecurringStatus) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">সক্রিয়</span>;
      case 'paused':
        return <span className="badge badge-warning">স্থগিত (Paused)</span>;
      case 'cancelled':
        return <span className="badge badge-secondary">বাতিল</span>;
      default:
        return null;
    }
  };

  return (
    <div className="recurring-transactions-view" style={{ padding: '16px 0' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontWeight: 500,
          }}
        >
          ✅ {toastMessage}
        </div>
      )}

      {/* Header and Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 4px 0' }}>
            🔄 পুনরাবৃত্ত লেনদেন (Recurring Transactions)
          </h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            মাসিক বেতন, বাড়ি ভাড়া, বিল ও নিয়মিত খরচের স্বয়ংক্রিয় পুনরাবৃত্তি পরিচালনা করুন
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenGenerateDue}
            disabled={isLoadingPreview}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>⚡</span>
            <span>{isLoadingPreview ? 'যাচাই হচ্ছে...' : 'বকেয়া লেনদেন তৈরি করুন'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span>
            <span>নতুন সময়সূচি</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          borderBottom: '1px solid var(--color-border, #e2e8f0)',
          paddingBottom: '8px',
        }}
      >
        <button
          type="button"
          className={`btn-tab ${statusFilter === 'all' ? 'btn-tab-active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          সব ({toBengaliNumeral(recurringList.length)})
        </button>
        <button
          type="button"
          className={`btn-tab ${statusFilter === 'active' ? 'btn-tab-active' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          সক্রিয় ({toBengaliNumeral(recurringList.filter((r) => r.status === 'active').length)})
        </button>
        <button
          type="button"
          className={`btn-tab ${statusFilter === 'paused' ? 'btn-tab-active' : ''}`}
          onClick={() => setStatusFilter('paused')}
        >
          স্থগিত ({toBengaliNumeral(recurringList.filter((r) => r.status === 'paused').length)})
        </button>
      </div>

      {error && (
        <div className="form-error-banner" role="alert" style={{ marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p>পুনরাবৃত্ত লেনদেন লোড হচ্ছে...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            backgroundColor: 'var(--color-surface, #ffffff)',
            borderRadius: '12px',
            border: '1px dashed var(--color-border, #cbd5e1)',
          }}
        >
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>🗓️</span>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>কোনো পুনরাবৃত্ত লেনদেন পাওয়া যায়নি</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            বাড়ি ভাড়া, মাসিক বিল বা নিয়মিত বেতনের মতো পুনরাবৃত্ত সময়সূচি তৈরি করুন।
          </p>
          <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
            + প্রথম পুনরাবৃত্তি যোগ করুন
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredItems.map((item) => {
            const isExpense = item.type === 'expense';
            const accountName = accountMap.get(item.accountId) || 'অ্যাকাউন্ট';

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--color-surface, #ffffff)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600 }}>{item.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {item.category} • {accountName}
                      </span>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div style={{ margin: '12px 0' }}>
                    <span
                      style={{
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        color: isExpense ? 'var(--color-expense, #dc2626)' : 'var(--color-income, #16a34a)',
                      }}
                    >
                      {isExpense ? '− ' : '+ '}
                      {isBalanceHidden ? '••••••' : formatPaisaToBDT(item.amountPaisa)}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--color-text-muted)',
                      backgroundColor: 'var(--color-surface-hover, #f8fafc)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <strong>পৌনঃপুনিকতা:</strong> {getFrequencyLabel(item.frequency, item.interval)}
                    </div>
                    <div>
                      <strong>পরবর্তী তারিখ:</strong> {formatBengaliDate(item.nextDueDate)}
                    </div>
                    {item.lastGeneratedDate && (
                      <div>
                        <strong>সর্বশেষ তৈরি:</strong> {formatBengaliDate(item.lastGeneratedDate)}
                      </div>
                    )}
                  </div>

                  {item.note && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 12px 0', fontStyle: 'italic' }}>
                      &ldquo;{item.note}&rdquo;
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    borderTop: '1px solid var(--color-border, #f1f5f9)',
                    paddingTop: '12px',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleTogglePause(item)}
                    title={item.status === 'active' ? 'স্থগিত করুন' : 'পুনরায় সক্রিয় করুন'}
                  >
                    {item.status === 'active' ? '⏸️ স্থগিত' : '▶️ সক্রিয়'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenEdit(item)}
                  >
                    ✏️ সম্পাদনা
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(item)}
                    title="বাতিল করুন"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <RecurringTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={async (data) => {
          if (editingItem) {
            await updateRecurringTransaction({
              ...editingItem,
              ...data,
            });
            setToastMessage(`"${data.name}" সফলভাবে আপডেট করা হয়েছে।`);
          } else {
            await createRecurringTransaction(data);
            setToastMessage(`"${data.name}" নতুন পুনরাবৃত্ত লেনদেন তৈরি হয়েছে।`);
          }
          await fetchItems();
        }}
        initialRecurring={editingItem}
        accounts={accounts}
      />

      {/* Generate Due Transactions Confirmation Modal */}
      <GenerateDueModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        preview={duePreview}
        onConfirmGenerate={async () => {
          return await generateDueRecurringTransactions();
        }}
        onSuccess={handleGenerateSuccess}
        isBalanceHidden={isBalanceHidden}
      />
    </div>
  );
};
