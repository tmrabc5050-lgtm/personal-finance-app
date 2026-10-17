/**
 * Personal Finance Super App - Header Component
 * Phase 2I - Navigation Functional Fix
 */

import React from 'react';
import { getBengaliMonthYear } from '../../utils/date';
import { useAuth } from '../../hooks/useAuth';

export interface HeaderProps {
  year?: number;
  month?: number;
  onMonthChange?: (year: number, month: number) => void;
  activeSection?: string;
  onNavigate?: (section: string) => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  year = 2026,
  month = 10,
  onMonthChange,
  activeSection = 'dashboard',
  onNavigate,
  onOpenAuth,
}) => {
  const monthYearLabel = getBengaliMonthYear(year, month);
  const { user, authMode } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড' },
    { id: 'wallets', label: 'ওয়ালেট' },
    { id: 'transactions', label: 'লেনদেন' },
    { id: 'recurring', label: 'পুনরাবৃত্ত' },
    { id: 'forecast', label: 'পূর্বাভাস' },
    { id: 'reconciliation', label: 'মিলকরণ' },
    { id: 'budgets', label: 'বাজেট' },
    { id: 'reports', label: 'রিপোর্ট' },
    { id: 'goals', label: 'সঞ্চয়' },
  ];

  return (
    <header className="site-header" role="banner">
      <div className="header-container">
        <a
          href="#dashboard"
          className="brand-wrapper"
          aria-label="ব্যক্তিগত অর্থ ব্যবস্থাপনা হোম"
          onClick={() => onNavigate?.('dashboard')}
        >
          <span className="brand-badge" aria-hidden="true">
            ৳
          </span>
          <div className="brand-title-wrap">
            <span className="brand-title">ব্যক্তিগত অর্থ ব্যবস্থাপনা</span>
          </div>
        </a>

        <div className="header-actions">
          {/* Auth Status & Profile Button */}
          <button
            type="button"
            onClick={onOpenAuth}
            className={`header-auth-badge ${user && authMode === 'cloud' ? 'header-auth-badge-cloud' : ''}`}
            aria-label={user ? `লগইনকৃত অ্যাকাউন্ট: ${user.email}` : 'গেস্ট মোড - লগইন বা সাইন আপ করুন'}
            title={user ? `${user.email} (ক্লাউড মোড)` : 'গেস্ট মোড (লগইন করুন)'}
          >
            <span
              className={`auth-status-dot ${
                user && authMode === 'cloud' ? 'auth-status-dot-cloud' : 'auth-status-dot-local'
              }`}
            />
            <span>
              {user ? (user.displayName || user.email.split('@')[0]) : 'গেস্ট মোড (লগইন)'}
            </span>
          </button>

          {/* Month Selector */}
          <div className="header-date-badge" aria-label={`বর্তমান নির্বাচিত মাস: ${monthYearLabel}`}>
            <span aria-hidden="true" style={{ marginRight: '4px' }}>📅</span>
            {onMonthChange ? (
              <select
                aria-label="মাস নির্বাচন করুন"
                value={`${year}-${month}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number);
                  onMonthChange(y, m);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  color: 'inherit',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="2026-10">অক্টোবর ২০২৬</option>
                <option value="2026-9">সেপ্টেম্বর ২০২৬</option>
              </select>
            ) : (
              <span>{monthYearLabel}</span>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="site-nav" aria-label="মূল নেভিগেশন">
            <ul className="nav-list">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onNavigate?.(item.id)}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
