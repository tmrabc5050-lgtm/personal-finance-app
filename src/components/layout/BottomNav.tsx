/**
 * Personal Finance Super App - Mobile Bottom Navigation Component
 * Phase 2I - Navigation Functional Fix
 */

import React from 'react';

export interface BottomNavProps {
  activeSection?: string;
  onQuickActionClick?: () => void;
  onNavigate?: (section: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeSection = 'dashboard',
  onQuickActionClick,
  onNavigate,
}) => {
  return (
    <nav className="bottom-nav" aria-label="মোবাইল তলদেশ নেভিগেশন">
      <div className="bottom-nav-container">
        <a
          href="#dashboard"
          className={`bottom-nav-item ${activeSection === 'dashboard' ? 'bottom-nav-item-active' : ''}`}
          aria-current={activeSection === 'dashboard' ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onNavigate?.('dashboard');
          }}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            🏠
          </span>
          <span>ড্যাশবোর্ড</span>
        </a>

        <a
          href="#wallets"
          className={`bottom-nav-item ${activeSection === 'wallets' ? 'bottom-nav-item-active' : ''}`}
          aria-current={activeSection === 'wallets' ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onNavigate?.('wallets');
          }}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            👛
          </span>
          <span>ওয়ালেট</span>
        </a>

        {/* Central Prominent Floating Action */}
        <button
          type="button"
          className="bottom-nav-fab"
          aria-label="দ্রুত লেনদেন যুক্ত করুন"
          onClick={onQuickActionClick}
        >
          +
        </button>

        <a
          href="#transactions"
          className={`bottom-nav-item ${activeSection === 'transactions' ? 'bottom-nav-item-active' : ''}`}
          aria-current={activeSection === 'transactions' ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onNavigate?.('transactions');
          }}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            📝
          </span>
          <span>লেনদেন</span>
        </a>

        <a
          href="#budgets"
          className={`bottom-nav-item ${activeSection === 'budgets' ? 'bottom-nav-item-active' : ''}`}
          aria-current={activeSection === 'budgets' ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onNavigate?.('budgets');
          }}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            📋
          </span>
          <span>বাজেট</span>
        </a>

        <a
          href="#reports"
          className={`bottom-nav-item ${activeSection === 'reports' ? 'bottom-nav-item-active' : ''}`}
          aria-current={activeSection === 'reports' ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onNavigate?.('reports');
          }}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            📊
          </span>
          <span>রিপোর্ট</span>
        </a>
      </div>
    </nav>
  );
};

export default BottomNav;
