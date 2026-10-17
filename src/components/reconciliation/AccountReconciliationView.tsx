/**
 * Personal Finance Super App - Account Reconciliation View
 * Batch 4: Feature C - Account Reconciliation
 */

import React, { useEffect, useState } from 'react';
import { Account, Transaction } from '../../types/dashboard';
import {
  AccountReconciliation,
  ReconciliationStatus,
} from '../../types/recurringAndReconciliation';
import { formatPaisaToBDT, toBengaliNumeral } from '../../utils/currency';
import { formatBengaliDate } from '../../utils/date';
import { ReconciliationModal } from './ReconciliationModal';

export interface AccountReconciliationViewProps {
  accounts: Account[];
  isBalanceHidden: boolean;
  getAccountReconciliations: (accountId?: string) => Promise<AccountReconciliation[]>;
  calculateHistoricalAccountBalance: (
    accountId: string,
    statementDate: string
  ) => Promise<{
    appBalancePaisa: bigint;
    transactionsCount: number;
    statementTransactions: Transaction[];
  }>;
  reconcileAccount: (data: {
    accountId: string;
    statementDate: string;
    statementBalancePaisa: bigint;
    notes?: string;
  }) => Promise<AccountReconciliation>;
  createReconciliationAdjustment: (
    reconciliationId: string
  ) => Promise<{
    reconciliation: AccountReconciliation;
    transaction: Transaction;
  }>;
}

export const AccountReconciliationView: React.FC<AccountReconciliationViewProps> = ({
  accounts,
  isBalanceHidden,
  getAccountReconciliations,
  calculateHistoricalAccountBalance,
  reconcileAccount,
  createReconciliationAdjustment,
}) => {
  const [reconciliations, setReconciliations] = useState<AccountReconciliation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReconciliationStatus>('all');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const fetchReconciliations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAccountReconciliations(
        selectedAccountId === 'all' ? undefined : selectedAccountId
      );
      setReconciliations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'রিকনসিলিয়েশন তালিকা লোড করতে সমস্যা হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliations();
  }, [selectedAccountId]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  const filteredItems = reconciliations.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const handleCreateAdjustment = async (rec: AccountReconciliation) => {
    const diffSign = rec.differencePaisa > 0n ? 'ঘাটতি' : 'অতিরিক্ত';
    const absDiffStr = formatPaisaToBDT(rec.differencePaisa < 0n ? -rec.differencePaisa : rec.differencePaisa);

    if (
      !window.confirm(
        `আপনি কি নিশ্চিত যে এই রিকনসিলিয়েশনের ${absDiffStr} টাকার ${diffSign} সমন্বয় করার জন্য একটি অডিট লেনদেন (Adjustment) তৈরি করতে চান?`
      )
    ) {
      return;
    }

    try {
      setAdjustingId(rec.id);
      const res = await createReconciliationAdjustment(rec.id);
      setReconciliations((prev) =>
        prev.map((item) => (item.id === rec.id ? res.reconciliation : item))
      );
      setToastMessage('অ্যাকাউন্টে সমন্বয় লেনদেন সফলভাবে রেকর্ড করা হয়েছে!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'সমন্বয় লেনদেন তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setAdjustingId(null);
    }
  };

  const getStatusBadge = (status: ReconciliationStatus) => {
    switch (status) {
      case 'matched':
        return <span className="badge badge-success">মিল সম্পন্ন (Matched)</span>;
      case 'discrepancy':
        return <span className="badge badge-danger">গরমিল রয়েছে (Discrepancy)</span>;
      case 'adjusted':
        return <span className="badge badge-warning">সমন্বিত (Adjusted)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="account-reconciliation-view" style={{ padding: '16px 0' }}>
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

      {/* Header */}
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
            ⚖️ অ্যাকাউন্ট রিকনসিলিয়েশন (Bank Reconciliation)
          </h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            বাহ্যিক ব্যাংক বিবরণী বা ক্যাশ গণনার সাথে লেজারের লেনদেনের সামঞ্জস্য নিশ্চিত করুন
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>+</span>
          <span>নতুন রিকনসিলিয়েশন</span>
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn-tab ${statusFilter === 'all' ? 'btn-tab-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            সব ({toBengaliNumeral(reconciliations.length)})
          </button>
          <button
            type="button"
            className={`btn-tab ${statusFilter === 'matched' ? 'btn-tab-active' : ''}`}
            onClick={() => setStatusFilter('matched')}
          >
            মিলেছে ({toBengaliNumeral(reconciliations.filter((r) => r.status === 'matched').length)})
          </button>
          <button
            type="button"
            className={`btn-tab ${statusFilter === 'discrepancy' ? 'btn-tab-active' : ''}`}
            onClick={() => setStatusFilter('discrepancy')}
          >
            গরমিল ({toBengaliNumeral(reconciliations.filter((r) => r.status === 'discrepancy').length)})
          </button>
          <button
            type="button"
            className={`btn-tab ${statusFilter === 'adjusted' ? 'btn-tab-active' : ''}`}
            onClick={() => setStatusFilter('adjusted')}
          >
            সমন্বিত ({toBengaliNumeral(reconciliations.filter((r) => r.status === 'adjusted').length)})
          </button>
        </div>

        <div>
          <select
            className="form-select"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            style={{ width: 'auto', minWidth: '180px' }}
          >
            <option value="all">সব অ্যাকাউন্ট</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
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
          <p>রিকনসিলিয়েশন তালিকা লোড হচ্ছে...</p>
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
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>📊</span>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>কোনো রিকনসিলিয়েশন রেকর্ড পাওয়া যায়নি</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            আপনার অ্যাকাউন্টের ব্যালেন্স স্টেটমেন্টের সাথে তুলনা করে নিখুঁত হিসেব বজায় রাখুন।
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + নতুন রিকনসিলিয়েশন শুরু করুন
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredItems.map((rec) => {
            const accName = accountMap.get(rec.accountId) || 'অ্যাকাউন্ট';
            const hasDiff = rec.differencePaisa !== 0n;

            return (
              <div
                key={rec.id}
                style={{
                  backgroundColor: 'var(--color-surface, #ffffff)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  padding: '18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 600 }}>{accName}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      স্টেটমেন্ট তারিখ: <strong>{formatBengaliDate(rec.statementDate)}</strong> • রেকর্ড তারিখ: {formatBengaliDate(rec.createdAt.split('T')[0])}
                    </span>
                  </div>
                  <div>{getStatusBadge(rec.status)}</div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    backgroundColor: 'var(--color-surface-hover, #f8fafc)',
                    padding: '14px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>স্টেটমেন্ট ব্যালেন্স</span>
                    <p style={{ margin: '4px 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {isBalanceHidden ? '••••••' : formatPaisaToBDT(rec.statementBalancePaisa)}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>অ্যাপ লেজার ব্যালেন্স</span>
                    <p style={{ margin: '4px 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {isBalanceHidden ? '••••••' : formatPaisaToBDT(rec.appBalancePaisa)}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>পার্থক্য (Difference)</span>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        color:
                          rec.differencePaisa === 0n
                            ? 'var(--color-income, #16a34a)'
                            : 'var(--color-expense, #dc2626)',
                      }}
                    >
                      {isBalanceHidden
                        ? '••••••'
                        : `${rec.differencePaisa > 0n ? '+' : ''}${formatPaisaToBDT(rec.differencePaisa)}`}
                    </p>
                  </div>
                </div>

                {rec.notes && (
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    📝 নোট: {rec.notes}
                  </p>
                )}

                {rec.status === 'discrepancy' && hasDiff && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--color-border, #f1f5f9)',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      লেজারে সমপরিমাণ সমন্বয় লেনদেন তৈরি করতে চান?
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-warning"
                      onClick={() => handleCreateAdjustment(rec)}
                      disabled={adjustingId === rec.id}
                      style={{ fontWeight: 600 }}
                    >
                      {adjustingId === rec.id ? 'সমন্বয় হচ্ছে...' : '🛠️ সমন্বয় লেনদেন তৈরি করুন (Adjustment)'}
                    </button>
                  </div>
                )}

                {rec.status === 'adjusted' && (
                  <div
                    style={{
                      paddingTop: '8px',
                      borderTop: '1px solid var(--color-border, #f1f5f9)',
                      fontSize: '0.8rem',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>✅ এই রিকনসিলিয়েশনের জন্য অডিট সমন্বয় লেনদেন সফলভাবে যুক্ত করা হয়েছে।</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Reconciliation Modal */}
      <ReconciliationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accounts={accounts}
        onCalculateHistoricalBalance={calculateHistoricalAccountBalance}
        onSaveReconciliation={reconcileAccount}
        onSuccess={() => {
          setToastMessage('নতুন রিকনসিলিয়েশন রেকর্ড সংরক্ষিত হয়েছে!');
          fetchReconciliations();
        }}
        isBalanceHidden={isBalanceHidden}
      />
    </div>
  );
};
