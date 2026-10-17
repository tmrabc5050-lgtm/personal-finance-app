/**
 * Personal Finance Super App - Bengali Date Formatting Utilities
 * Phase 05C - Step 1: Types & Utilities
 */

import { toBengaliNumeral } from './currency';

export const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
] as const;

export const BENGALI_DAYS = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
] as const;

/**
 * Parses a YYYY-MM-DD string safely into year, month, and day components.
 */
function parseISODateParts(isoDateStr: string): { year: number; month: number; day: number } {
  const parts = isoDateStr.split('T')[0].split('-');
  if (parts.length !== 3) {
    throw new Error(`অবৈধ তারিখ ফরম্যাট: "${isoDateStr}". প্রত্যাশিত ফরম্যাট: YYYY-MM-DD`);
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`তারিখের মান সঠিক নয়: "${isoDateStr}"`);
  }

  return { year, month, day };
}

/**
 * Format ISO date string into standard Bengali date: "১৬ অক্টোবর ২০২৬"
 */
export function formatBengaliDate(isoDateStr: string): string {
  const { year, month, day } = parseISODateParts(isoDateStr);
  const bengaliDay = toBengaliNumeral(day);
  const bengaliMonthName = BENGALI_MONTHS[month - 1];
  const bengaliYear = toBengaliNumeral(year);

  return `${bengaliDay} ${bengaliMonthName} ${bengaliYear}`;
}

/**
 * Format ISO date string with day name: "শুক্রবার, ১৬ অক্টোবর ২০২৬"
 */
export function formatBengaliDateWithDay(isoDateStr: string): string {
  const { year, month, day } = parseISODateParts(isoDateStr);
  const dateObj = new Date(year, month - 1, day);
  const dayName = BENGALI_DAYS[dateObj.getDay()];

  const bengaliDay = toBengaliNumeral(day);
  const bengaliMonthName = BENGALI_MONTHS[month - 1];
  const bengaliYear = toBengaliNumeral(year);

  return `${dayName}, ${bengaliDay} ${bengaliMonthName} ${bengaliYear}`;
}

/**
 * Format relative date for transaction feeds:
 * - "আজ, ১৬ অক্টোবর"
 * - "গতকাল, ১৫ অক্টোবর"
 * - "১৬ অক্টোবর ২০২৬"
 */
export function formatRelativeBengaliDate(isoDateStr: string, referenceDate: Date = new Date()): string {
  const { year, month, day } = parseISODateParts(isoDateStr);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  const isToday = year === refYear && month === refMonth && day === refDay;

  // Check if yesterday
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    year === yesterday.getFullYear() &&
    month === yesterday.getMonth() + 1 &&
    day === yesterday.getDate();

  const bengaliDay = toBengaliNumeral(day);
  const bengaliMonthName = BENGALI_MONTHS[month - 1];

  if (isToday) {
    return `আজ, ${bengaliDay} ${bengaliMonthName}`;
  }

  if (isYesterday) {
    return `গতকাল, ${bengaliDay} ${bengaliMonthName}`;
  }

  const bengaliYear = toBengaliNumeral(year);
  return `${bengaliDay} ${bengaliMonthName} ${bengaliYear}`;
}

/**
 * Format Year and Month in Bengali: "অক্টোবর ২০২৬"
 */
export function getBengaliMonthYear(year: number, month: number): string {
  if (month < 1 || month > 12) {
    throw new RangeError(`মাসের মান ১ থেকে ১২-এর মধ্যে হতে হবে। দেওয়া হয়েছে: ${month}`);
  }

  const monthName = BENGALI_MONTHS[month - 1];
  const bengaliYear = toBengaliNumeral(year);

  return `${monthName} ${bengaliYear}`;
}
