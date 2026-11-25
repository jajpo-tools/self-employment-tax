// Type definitions for self-employment-tax

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';
export type TaxYear = 2026 | 2027;

export interface EstimateInput {
  year: TaxYear;
  /** Defaults to 'single'. */
  filingStatus?: FilingStatus;
  /** 1099 / business income for the year. */
  grossIncome?: number;
  businessExpenses?: number;
  /** Your own W-2 wages (they use up the Social Security wage base first). */
  w2Wages?: number;
  /** Spouse's W-2 wages; only used when filingStatus is 'mfj'. */
  spouseW2Wages?: number;
  /** Specified service trade or business (consulting, law, health, finance...) for the QBI rules. */
  isSpecifiedService?: boolean;
  /** Federal tax already paid or withheld, for balanceAfterPayments. */
  taxAlreadyPaid?: number;
  /** Tips separately reported on a Form 1099 (Section 224). */
  qualifiedTips?: number;
  /** Used only when larger than the standard deduction. */
  itemizedDeductions?: number;
  /** Self-employed health insurance and retirement contributions: lower AGI and QBI, never SE tax. */
  businessAdjustments?: number;
  otherIncome?: number;
  /** Optional flat state rate from 0 to 0.2, applied to net profit. Never changes the federal figures. */
  stateTaxRate?: number;
}

export interface Estimate {
  inputs: Required<EstimateInput>;
  year: TaxYear;
  lastVerified: string;
  netProfit: number;
  netEarningsFromSelfEmployment: number;
  socialSecurityTax: number;
  medicareTax: number;
  selfEmploymentTax: number;
  selfEmploymentTaxDeduction: number;
  additionalMedicareTax: number;
  adjustedGrossIncome: number;
  standardDeduction: number;
  qualifiedTipsDeduction: number;
  taxableIncomeBeforeQbi: number;
  qualifiedBusinessIncome: number;
  qbiDeduction: number;
  qbiMinimumApplied: boolean;
  qbiPhaseFraction: number;
  taxableIncome: number;
  incomeTax: number;
  marginalRate: number;
  totalFederalTax: number;
  /** Federal tax the self-employment income adds on top of everything else. */
  taxAddedBySelfEmployment: number;
  /** taxAddedBySelfEmployment / grossIncome: the share of each payment to set aside. */
  setAsideRate: number;
  effectiveRateOnNetProfit: number;
  equalQuarterlyPayment: number;
  taxAlreadyPaid: number;
  balanceAfterPayments: number;
  estimatedTaxDueDates: string[];
  stateTaxRate: number;
  stateTax: number;
  taxWithState: number;
  setAsideRateWithState: number;
  effectiveRateWithState: number;
}

export interface PlanInput extends EstimateInput {
  /** Federal income tax withheld from W-2 pay this year (counts as paid evenly). */
  withholding?: number;
  /** Estimated payments already made this year. */
  estimatedPaid?: number;
  /** Last year's total tax, for the 100% / 110% safe harbor. */
  priorYearTax?: number | string | null;
  priorYearAgi?: number;
  /** YYYY-MM-DD; defaults to today. */
  asOf?: string;
}

export interface Installment {
  date: string;
  quarter: number;
  status: 'passed' | 'next' | 'upcoming';
  regularInstallment: number;
  minimumPayment: number;
  fullPayment: number;
}

export interface Plan {
  estimate: Estimate;
  year: TaxYear;
  asOf: string;
  projectedTax: number;
  withholding: number;
  estimatedPaid: number;
  currentYearTarget: number;
  priorYearTax: number | null;
  priorYearRate: number;
  priorYearTarget: number | null;
  requiredAnnualPayment: number;
  safeHarborBasis: 'prior' | 'current';
  noPaymentsRequired: boolean;
  minimumEstimatedTotal: number;
  fullEstimatedTotal: number;
  remainingMinimum: number;
  remainingFull: number;
  nextDueDate: string | null;
  nextMinimumPayment: number;
  nextFullPayment: number;
  upcomingCount: number;
  passedCount: number;
  pastShortfall: number;
  balanceDueAtFiling: number;
  schedule: Installment[];
  rules: Record<string, unknown>;
}

export interface SelfEmploymentTaxResult {
  netEarnings: number;
  socialSecurity: number;
  medicare: number;
  total: number;
  deduction: number;
  wageBaseRemaining: number;
}

export interface QbiOptions {
  ubia?: number;
  netCapitalGain?: number;
  reitDividends?: number;
  activeBusiness?: boolean;
}

export interface QbiResult {
  deduction: number;
  tentative: number;
  incomeLimit: number;
  phaseFraction: number;
  minimumApplied: boolean;
  businessComponent: number;
  reitComponent: number;
  wageLimit: number;
  applicable: number;
  qualifies: boolean;
  threshold: number;
  phaseInEnd: number;
  netCapitalGain: number;
}

export const version: string;
export const FILING_STATUSES: FilingStatus[];
export const TAX_YEARS: Record<TaxYear, Record<string, any>>;
export function supportedYears(): TaxYear[];
export function incomeTax(taxableIncome: number, status: FilingStatus, year: TaxYear): number;
export function marginalRate(taxableIncome: number, status: FilingStatus, year: TaxYear): number;
export function selfEmploymentTax(netProfit: number, socialSecurityWages: number, year: TaxYear): SelfEmploymentTaxResult;
export function additionalMedicareTax(medicareWages: number, selfEmploymentEarnings: number, status: FilingStatus, year: TaxYear): { onWages: number; onSelfEmployment: number; total: number };
export function qbiDeduction(qualifiedBusinessIncome: number, taxableIncomeBeforeQbi: number, status: FilingStatus, isSpecifiedService: boolean, year: TaxYear, w2WagesPaid?: number, more?: QbiOptions): QbiResult;
export function qualifiedTipsDeduction(tips: number, netProfit: number, magi: number, status: FilingStatus, year: TaxYear): number;
export function estimate1099(input: EstimateInput): Estimate;
export function estimatedTaxPlan(input: PlanInput): Plan;
