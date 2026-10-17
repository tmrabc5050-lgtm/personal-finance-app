/**
 * Personal Finance Super App - Currency & Paisa Arithmetic Utilities
 * Phase 05C - Step 1: Types & Utilities
 *
 * All financial math is strictly executed using integer paisa via BigInt.
 * No JavaScript floating-point arithmetic is permitted.
 */

export const MAX_TRANSACTION_BDT_STR = '999999999.99';
export const MAX_TRANSACTION_PAISA = 99999999999n; // 99,99,99,999.99 BDT in paisa
export const MIN_TRANSACTION_PAISA = 1n; // Minimum non-zero transaction is 1 paisa (৳ 0.01)

export const MIN_SAFE_BALANCE_PAISA = BigInt(Number.MIN_SAFE_INTEGER); // -9,007,199,254,740,991n
export const MAX_SAFE_BALANCE_PAISA = BigInt(Number.MAX_SAFE_INTEGER); //  9,007,199,254,740,991n

/**
 * Strict regex for validating transaction inputs in BDT:
 * - Up to 9 integer digits before dot (max 999,999,999)
 * - Optional decimal point with 1 or 2 digits
 * - No negative signs, no leading zeros (e.g. '01.00' is invalid, '0' and '0.50' are valid)
 */
export const TRANSACTION_INPUT_REGEX = /^(0|[1-9]\d{0,8})(\.\d{1,2})?$/;

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

/**
 * Convert any string containing ASCII digits (0-9) to Bengali digits (০-৯).
 */
export function toBengaliNumeral(input: string | number | bigint): string {
  return input
    .toString()
    .replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)] || digit);
}

/**
 * Validates and converts a BDT decimal string (e.g. "1250.50") into integer paisa (BigInt).
 * Throws an Error with a descriptive message if invalid.
 */
export function parseBDTToPaisa(bdtStr: string): bigint {
  const trimmed = bdtStr.trim();

  if (!trimmed) {
    throw new Error('টাকার পরিমাণ খালি হতে পারে না');
  }

  if (!TRANSACTION_INPUT_REGEX.test(trimmed)) {
    throw new Error('ভুল টাকার ফরম্যাট। উদাহরণ: "১০০" বা "১২৫০.৫০"');
  }

  const [takaPart, rawPaisaPart = ''] = trimmed.split('.');
  const normalizedPaisaPart = rawPaisaPart.padEnd(2, '0');

  const takaBigInt = BigInt(takaPart);
  const paisaBigInt = BigInt(normalizedPaisaPart);

  const totalPaisa = takaBigInt * 100n + paisaBigInt;

  if (totalPaisa > MAX_TRANSACTION_PAISA) {
    throw new Error('লেনদেনের পরিমাণ সর্বোচ্চ সীমা (৳ ৯৯,৯৯,৯৯,৯৯৯.৯৯) অতিক্রম করেছে');
  }

  return totalPaisa;
}

/**
 * Safe conversion from integer paisa (BigInt) to standard decimal string (e.g. 125050n -> "1250.50").
 * Preserves exact precision without float rounding.
 */
export function formatPaisaToDecimalString(paisa: bigint): string {
  const isNegative = paisa < 0n;
  const absPaisa = isNegative ? -paisa : paisa;

  const taka = absPaisa / 100n;
  const remPaisa = absPaisa % 100n;

  const paisaStr = remPaisa.toString().padStart(2, '0');
  const sign = isNegative ? '-' : '';

  return `${sign}${taka.toString()}.${paisaPaisaString(paisaStr)}`;
}

function paisaPaisaString(str: string): string {
  return str;
}

/**
 * Format an integer string into the standard Indian/Bangla numbering format:
 * The last 3 digits are grouped, followed by groups of 2 digits (e.g. 100000 -> "1,00,000").
 */
export function formatIndianGrouping(numericStr: string): string {
  if (numericStr.length <= 3) {
    return numericStr;
  }

  const lastThree = numericStr.slice(-3);
  const remaining = numericStr.slice(0, -3);

  // Group remaining digits by pairs of 2 from right to left
  const groupedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${groupedRemaining},${lastThree}`;
}

export interface FormatBDTOptions {
  showSign?: boolean; // If true, prepend '+' for positive non-zero amounts
  showSymbol?: boolean; // If true (default), prepend '৳ '
  includePaisa?: boolean; // If true (default), include '.০০'
}

/**
 * Format integer paisa (BigInt) into localized Bengali BDT representation.
 * Examples:
 *   10000n     -> "৳ ১০০.০০"
 *   10000000n  -> "৳ ১,০০,০০০.০০"
 *   -50000n    -> "-৳ ৫০০.০০"
 */
export function formatPaisaToBDT(
  paisa: bigint,
  options: FormatBDTOptions = {}
): string {
  const { showSign = false, showSymbol = true, includePaisa = true } = options;

  const isNegative = paisa < 0n;
  const isPositive = paisa > 0n;
  const absPaisa = isNegative ? -paisa : paisa;

  const takaPart = absPaisa / 100n;
  const remPaisaPart = absPaisa % 100n;

  const groupedTaka = formatIndianGrouping(takaPart.toString());
  const bengaliTaka = toBengaliNumeral(groupedTaka);

  let formattedAmount = bengaliTaka;

  if (includePaisa) {
    const paddedPaisa = remPaisaPart.toString().padStart(2, '0');
    const bengaliPaisa = toBengaliNumeral(paddedPaisa);
    formattedAmount += `.${bengaliPaisa}`;
  }

  let signPrefix = '';
  if (isNegative) {
    signPrefix = '-';
  } else if (showSign && isPositive) {
    signPrefix = '+';
  }

  const symbolPrefix = showSymbol ? '৳ ' : '';

  return `${signPrefix}${symbolPrefix}${formattedAmount}`;
}

/**
 * Safe Addition with boundary overflow guard against JavaScript safe integer limits.
 */
export function addPaisa(a: bigint, b: bigint): bigint {
  const result = a + b;
  if (result > MAX_SAFE_BALANCE_PAISA || result < MIN_SAFE_BALANCE_PAISA) {
    throw new RangeError('আর্থিক গণনায় ইন্টিজার সীমা (Safe Integer Overflow) অতিক্রম করেছে');
  }
  return result;
}

/**
 * Safe Subtraction with boundary underflow guard against JavaScript safe integer limits.
 */
export function subtractPaisa(a: bigint, b: bigint): bigint {
  const result = a - b;
  if (result > MAX_SAFE_BALANCE_PAISA || result < MIN_SAFE_BALANCE_PAISA) {
    throw new RangeError('আর্থিক গণনায় ইন্টিজার সীমা (Safe Integer Underflow) অতিক্রম করেছে');
  }
  return result;
}
