/**
 * Personal Finance Super App - Savings Goals View
 * Batch 3: Budget Engine, Financial Reports & Savings Goals
 */

import React, { useEffect, useState } from 'react';
import { GoalContribution, GoalContributionType, GoalStatus, SavingsGoal } from '../../types/budgetAndGoals';
import { addPaisa, formatPaisaToBDT, subtractPaisa, toBengaliNumeral } from '../../utils/currency';
import { formatBengaliDate } from '../../utils/date';
import { GoalContributionModal } from './GoalContributionModal';
import { GoalHistoryModal } from './GoalHistoryModal';
import { SavingsGoalModal } from './SavingsGoalModal';

export interface SavingsGoalsViewProps {
  isBalanceHidden: boolean;
  getSavingsGoals: () => Promise<SavingsGoal[]>;
  createSavingsGoal: (data: {
    name: string;
    targetAmountPaisa: bigint;
    initialSavedPaisa?: bigint;
    targetDate?: string;
    description?: string;
    category?: string;
    icon?: string;
  }) => Promise<SavingsGoal>;
  updateSavingsGoal: (goal: SavingsGoal) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: string) => Promise<boolean>;
  addGoalContribution: (data: {
    goalId: string;
    amountPaisa: bigint;
    type: GoalContributionType;
    note?: string;
    date?: string;
  }) => Promise<{ goal: SavingsGoal; contribution: GoalContribution }>;
  getGoalContributions: (goalId?: string) => Promise<GoalContribution[]>;
}

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  isBalanceHidden,
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addGoalContribution,
  getGoalContributions,
}) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('all');

  // Modals state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [activeGoalForContrib, setActiveGoalForContrib] = useState<SavingsGoal | null>(null);
  const [contribType, setContribType] = useState<GoalContributionType>('deposit');
  const [activeGoalForHistory, setActiveGoalForHistory] = useState<SavingsGoal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGoals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSavingsGoals();
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'সঞ্চয় লক্ষ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleSaveGoal = async (data: {
    name: string;
    targetAmountPaisa: bigint;
    initialSavedPaisa?: bigint;
    targetDate?: string;
    description?: string;
    category?: string;
    icon?: string;
  }) => {
    if (editingGoal) {
      const currentSaved = editingGoal.currentAmountPaisa ?? editingGoal.currentSavedPaisa ?? 0n;
      await updateSavingsGoal({
        ...editingGoal,
        name: data.name,
        targetAmountPaisa: data.targetAmountPaisa,
        currentAmountPaisa: currentSaved,
        currentSavedPaisa: currentSaved,
        targetDate: data.targetDate,
        description: data.description,
        icon: data.icon,
      });
    } else {
      await createSavingsGoal(data);
    }
    await fetchGoals();
  };

  const handleDeleteGoal = async (id: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই সঞ্চয় লক্ষ্যটি মুছে ফেলতে চান? এতে এর সকল জমার বিবরণও মুছে যাবে।')) {
      try {
        setDeletingId(id);
        await deleteSavingsGoal(id);
        await fetchGoals();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'সঞ্চয় লক্ষ্য মুছতে সমস্যা হয়েছে');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleSaveContribution = async (data: {
    goalId: string;
    amountPaisa: bigint;
    type: GoalContributionType;
    note?: string;
    date?: string;
  }) => {
    await addGoalContribution(data);
    await fetchGoals();
  };

  // Filtered goals
  const filteredGoals = goals.filter((g) => {
    if (statusFilter === 'all') return true;
    return g.status === statusFilter;
  });

  // Aggregated totals
  let totalTargetPaisa = 0n;
  let totalSavedPaisa = 0n;
  let completedCount = 0;
  let inProgressCount = 0;
  let overdueCount = 0;

  for (const g of goals) {
    totalTargetPaisa = addPaisa(totalTargetPaisa, g.targetAmountPaisa);
    const saved = g.currentAmountPaisa ?? g.currentSavedPaisa ?? 0n;
    totalSavedPaisa = addPaisa(totalSavedPaisa, saved);
    if (g.status === 'completed') completedCount++;
    else if (g.status === 'overdue') overdueCount++;
    else inProgressCount++;
  }

  const overallProgressPercent =
    totalTargetPaisa > 0n
      ? Math.min(100, Math.round(Number((totalSavedPaisa * 10000n) / totalTargetPaisa) / 100))
      : 0;

  const renderStatusBadge = (status: GoalStatus) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge status-badge-success">সম্পন্ন</span>;
      case 'overdue':
        return <span className="status-badge status-badge-danger">সময়োত্তীর্ণ</span>;
      case 'in_progress':
      default:
        return <span className="status-badge status-badge-warning">চলমান</span>;
    }
  };

  return (
    <div className="savings-goals-view">
      {/* Header */}
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="view-title" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary, #111827)' }}>
            সঞ্চয় লক্ষ্য (Savings Goals)
          </h1>
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            ভবিষ্যৎ পরিকল্পনা ও লক্ষ্যমাত্রার বিপরীতে অর্থ সঞ্চয় করুন
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingGoal(null);
            setIsGoalModalOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <span>+</span> <span>নতুন সঞ্চয় লক্ষ্য</span>
        </button>
      </div>

      {/* Educational Notice Banner */}
      <div
        className="info-banner"
        style={{
          background: 'rgba(59, 130, 246, 0.08)',
          borderLeft: '4px solid #3b82f6',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: 'var(--color-text-secondary, #374151)',
        }}
      >
        💡 <strong>সঞ্চয় বরাদ্দ ট্র্যাকিং:</strong> সঞ্চয় লক্ষ্যসমূহ আপনার জমার পরিকল্পনা পর্যবেক্ষণ করে। এখানে জমা বা উত্তোলন করলে অ্যাকাউন্ট ব্যালেন্স থেকে স্বয়ংক্রিয়ভাবে অর্থ কর্তন করা হয় না যাতে কোনো লেনদেন দ্বৈত গণনা না হয়।
      </div>

      {/* Summary Statistics Cards */}
      <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="dashboard-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
            মোট সঞ্চয় লক্ষ্যমাত্রা
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary, #111827)' }}>
            {isBalanceHidden ? '••••••' : formatPaisaToBDT(totalTargetPaisa)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.25rem' }}>
            সকল সক্রিয় লক্ষ্যের যোগফল
          </div>
        </div>

        <div className="dashboard-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
            মোট সঞ্চিত অর্থ
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary, #10b981)' }}>
            {isBalanceHidden ? '••••••' : formatPaisaToBDT(totalSavedPaisa)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.25rem' }}>
            সামগ্রিক অর্জন: {toBengaliNumeral(overallProgressPercent)}%
          </div>
        </div>

        <div className="dashboard-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
            অবশিষ্ট সঞ্চয় প্রয়োজন
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalTargetPaisa > totalSavedPaisa ? 'var(--color-warning, #f59e0b)' : 'var(--color-primary, #10b981)' }}>
            {isBalanceHidden ? '••••••' : formatPaisaToBDT(totalTargetPaisa > totalSavedPaisa ? subtractPaisa(totalTargetPaisa, totalSavedPaisa) : 0n)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.25rem' }}>
            {totalSavedPaisa >= totalTargetPaisa ? 'লক্ষ্যমাত্রা অর্জিত!' : 'পরিকল্পনামাফিক সঞ্চয় চালিয়ে যান'}
          </div>
        </div>

        <div className="dashboard-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: '0.25rem' }}>
            লক্ষ্যসমূহের অবস্থা
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            <span className="status-badge status-badge-warning" title="চলমান">
              ⏳ {toBengaliNumeral(inProgressCount)}
            </span>
            <span className="status-badge status-badge-success" title="সম্পন্ন">
              ✓ {toBengaliNumeral(completedCount)}
            </span>
            {overdueCount > 0 && (
              <span className="status-badge status-badge-danger" title="সময়োত্তীর্ণ">
                ⚠️ {toBengaliNumeral(overdueCount)}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: '0.5rem' }}>
            মোট {toBengaliNumeral(goals.length)}টি লক্ষ্য
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'সকল লক্ষ্য' },
          { key: 'in_progress', label: 'চলমান' },
          { key: 'completed', label: 'সম্পন্ন' },
          { key: 'overdue', label: 'সময়োত্তীর্ণ' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`btn ${statusFilter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(tab.key as any)}
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary, #6b7280)' }}>
          সঞ্চয় লক্ষ্য লোড হচ্ছে...
        </div>
      ) : error ? (
        <div className="alert-banner alert-banner-danger">{error}</div>
      ) : filteredGoals.length === 0 ? (
        <div className="dashboard-card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎯</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary, #111827)' }}>
            কোনো সঞ্চয় লক্ষ্য পাওয়া যায়নি
          </h3>
          <p style={{ color: 'var(--color-text-secondary, #6b7280)', maxWidth: '420px', margin: '0.5rem auto 1.5rem auto', fontSize: '0.9rem' }}>
            নতুন বাড়ি, গাড়ি, উচ্চশিক্ষা বা জরুরি তহবিলের জন্য আপনার প্রথম সঞ্চয় লক্ষ্য নির্ধারণ করুন।
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditingGoal(null);
              setIsGoalModalOpen(true);
            }}
          >
            + প্রথম সঞ্চয় লক্ষ্য তৈরি করুন
          </button>
        </div>
      ) : (
        <div className="goals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredGoals.map((g) => {
            const saved = g.currentAmountPaisa ?? g.currentSavedPaisa ?? 0n;
            const remaining = g.targetAmountPaisa > saved ? subtractPaisa(g.targetAmountPaisa, saved) : 0n;
            const pct = g.targetAmountPaisa > 0n
              ? Math.min(100, Math.round(Number((saved * 10000n) / g.targetAmountPaisa) / 100))
              : 0;

            const isDone = g.status === 'completed';

            return (
              <div
                key={g.id}
                className="dashboard-card goal-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '12px',
                  border: isDone ? '2px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--color-border, #e5e7eb)',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '2rem', lineHeight: 1 }}>{g.icon || '🎯'}</span>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary, #111827)' }}>
                          {g.name}
                        </h3>
                        {g.targetDate && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #6b7280)' }}>
                            লক্ষ্য তারিখ: {formatBengaliDate(g.targetDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    {renderStatusBadge(g.status)}
                  </div>

                  {g.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #4b5563)', margin: '0 0 0.75rem 0' }}>
                      {g.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>অগ্রগতি</span>
                      <strong style={{ color: 'var(--color-primary, #10b981)' }}>{toBengaliNumeral(pct)}%</strong>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '10px',
                        borderRadius: '5px',
                        background: 'var(--color-border, #e5e7eb)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: isDone ? 'var(--color-primary, #10b981)' : 'linear-gradient(90deg, #10b981, #059669)',
                          borderRadius: '5px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Financial Stats */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      background: 'var(--color-bg-secondary, #f9fafb)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--color-text-secondary, #6b7280)', display: 'block' }}>বর্তমান সঞ্চয়</span>
                      <strong style={{ color: 'var(--color-primary, #10b981)', fontSize: '0.85rem' }}>
                        {isBalanceHidden ? '••••••' : formatPaisaToBDT(saved)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary, #6b7280)', display: 'block' }}>লক্ষ্যমাত্রা</span>
                      <strong style={{ fontSize: '0.85rem' }}>
                        {isBalanceHidden ? '••••••' : formatPaisaToBDT(g.targetAmountPaisa)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary, #6b7280)', display: 'block' }}>অবশিষ্ট</span>
                      <strong style={{ fontSize: '0.85rem', color: isDone ? 'var(--color-primary, #10b981)' : 'var(--color-text-primary, #111827)' }}>
                        {isDone ? 'অর্জিত ✓' : isBalanceHidden ? '••••••' : formatPaisaToBDT(remaining)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setActiveGoalForContrib(g);
                        setContribType('deposit');
                      }}
                      style={{ padding: '6px 10px', fontSize: '0.85rem', justifyContent: 'center' }}
                    >
                      + জমা করুন
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setActiveGoalForContrib(g);
                        setContribType('withdrawal');
                      }}
                      disabled={saved <= 0n}
                      style={{ padding: '6px 10px', fontSize: '0.85rem', justifyContent: 'center' }}
                    >
                      - উত্তোলন
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
                    <button
                      type="button"
                      onClick={() => setActiveGoalForHistory(g)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary, #10b981)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                    >
                      বিবরণী দেখুন 📋
                    </button>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title="সম্পাদনা"
                        onClick={() => {
                          setEditingGoal(g);
                          setIsGoalModalOpen(true);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="মুছুন"
                        disabled={deletingId === g.id}
                        onClick={() => handleDeleteGoal(g.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-danger, #ef4444)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Savings Goal Create / Edit Modal */}
      <SavingsGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSaveGoal}
        initialGoal={editingGoal}
      />

      {/* Add / Withdraw Contribution Modal */}
      <GoalContributionModal
        isOpen={!!activeGoalForContrib}
        onClose={() => setActiveGoalForContrib(null)}
        goal={activeGoalForContrib}
        defaultType={contribType}
        onSave={handleSaveContribution}
      />

      {/* Contribution History Modal */}
      <GoalHistoryModal
        isOpen={!!activeGoalForHistory}
        onClose={() => setActiveGoalForHistory(null)}
        goal={activeGoalForHistory}
        getGoalContributions={getGoalContributions}
      />
    </div>
  );
};
