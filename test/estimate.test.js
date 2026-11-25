// Run with: npm test (Node's built-in test runner, no dependencies)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const TAX = require('..');

const close = (actual, expected, msg, tol = 0.005) =>
  assert.ok(Math.abs(actual - expected) < tol, `${msg || ''} expected ${expected}, got ${actual}`);

test('2026 brackets reproduce the base tax amounts printed in Rev. Proc. 2025-32', () => {
  const published = [
    ['single', 12400, 1240], ['single', 50400, 5800], ['single', 105700, 17966],
    ['single', 201775, 41024], ['single', 256225, 58448], ['single', 640600, 192979.25],
    ['mfj', 24800, 2480], ['mfj', 100800, 11600], ['mfj', 211400, 35932],
    ['mfj', 403550, 82048], ['mfj', 512450, 116896], ['mfj', 768700, 206583.5],
    ['hoh', 17700, 1770], ['hoh', 67450, 7740], ['hoh', 105700, 16155],
    ['hoh', 201750, 39207], ['hoh', 256200, 56631], ['hoh', 640600, 191171],
    ['mfs', 256225, 58448], ['mfs', 384350, 103291.75]
  ];
  for (const [status, income, tax] of published) close(TAX.incomeTax(income, status, 2026), tax, `${status} @ ${income}`);
});

test('2027 brackets reproduce the base tax amounts printed in Rev. Proc. 2026-35', () => {
  const printed = {
    single: [[12800, 1280], [52025, 5987], [109125, 18549], [208325, 42357], [264550, 60349], [661375, 199237.75]],
    mfj: [[25600, 2560], [104050, 11974], [218250, 37098], [416650, 84714], [529100, 120698], [793650, 213290.5]],
    hoh: [[18250, 1825], [69650, 7993], [109100, 16672], [208300, 40480], [264550, 58480], [661350, 197360]],
    mfs: [[396825, 106645.25]]
  };
  for (const [status, rows] of Object.entries(printed)) {
    for (const [income, tax] of rows) close(TAX.incomeTax(income, status, 2027), tax, `${status} @ ${income}`, 0.001);
  }
});

test('income tax is zero for zero or negative taxable income', () => {
  assert.equal(TAX.incomeTax(0, 'single', 2026), 0);
  assert.equal(TAX.incomeTax(-5000, 'mfj', 2026), 0);
});

test('no self-employment tax when net earnings are under $400 (about $433 of profit)', () => {
  assert.equal(TAX.selfEmploymentTax(430, 0, 2026).total, 0); // 430 × 0.9235 = 397.11
  assert.equal(TAX.selfEmploymentTax(433, 0, 2026).total, 0);
  close(TAX.selfEmploymentTax(434, 0, 2026).total, 400.799 * 0.153); // 434 × 0.9235 = 400.80
});

test('Social Security stops at the wage base, which W-2 wages use up first', () => {
  const se = TAX.selfEmploymentTax(100000, 150000, 2026);
  close(se.netEarnings, 92350);
  close(se.socialSecurity, 34500 * 0.124); // $184,500 − $150,000 left
  close(se.medicare, 92350 * 0.029);
  assert.equal(TAX.selfEmploymentTax(100000, 200000, 2026).socialSecurity, 0);
  close(TAX.selfEmploymentTax(250000, 0, 2027).socialSecurity, 23845.2); // $192,300 × 12.4%
});

test('Additional Medicare Tax matches the IRS Q&A worked examples', () => {
  // Single, $130,000 wages, $145,000 self-employment income: tax on $75,000
  close(TAX.additionalMedicareTax(130000, 145000, 'single', 2026).total, 75000 * 0.009);
  // Married filing separately, $200,000 wages, $150,000 SE income: $75,000 of wages and all the SE income
  close(TAX.additionalMedicareTax(200000, 150000, 'mfs', 2026).total, (75000 + 150000) * 0.009);
});

test('QBI: 20% below the threshold, limited to 20% of taxable income', () => {
  close(TAX.qbiDeduction(50000, 100000, 'single', false, 2026).deduction, 10000);
  close(TAX.qbiDeduction(50000, 30000, 'single', false, 2026).deduction, 6000);
});

test('QBI phase-in for ordinary and specified service businesses with no W-2 wages', () => {
  const ti = 201750 + 30000; // 40% into the $75,000 single range
  close(TAX.qbiDeduction(100000, ti, 'single', false, 2026).deduction, 20000 * 0.6);
  close(TAX.qbiDeduction(100000, ti, 'single', true, 2026).deduction, 20000 * 0.6 * 0.6);
  const half = TAX.qbiDeduction(150000, 239250, 'single', true, 2026, 0);
  close(half.phaseFraction, 0.5);
  close(half.deduction, 7500);
  close(TAX.qbiDeduction(150000, 239250, 'single', false, 2026, 40000).deduction, 25000);
});

test('QBI above the phase-in range: wage and property limit; nothing for a specified service business', () => {
  const none = TAX.qbiDeduction(150000, 300000, 'single', false, 2026, 0);
  close(none.wageLimit, 0);
  assert.equal(none.deduction, 400); // still a qualified business, so the minimum applies
  close(TAX.qbiDeduction(150000, 300000, 'single', false, 2026, 0, { activeBusiness: false }).deduction, 0);
  close(TAX.qbiDeduction(150000, 300000, 'single', false, 2026, 40000).deduction, 20000); // 50% of wages
  close(TAX.qbiDeduction(150000, 300000, 'single', false, 2026, 10000, { ubia: 400000 }).deduction, 12500); // 25% wages + 2.5% UBIA
  const sstb = TAX.qbiDeduction(150000, 300000, 'single', true, 2026, 40000);
  assert.equal(sstb.deduction, 0);
  assert.equal(sstb.qualifies, false);
});

test('QBI minimum: $400 with at least $1,000 of QBI (2026); $415 and $1,030 (2027)', () => {
  const small = TAX.qbiDeduction(1200, 50000, 'single', false, 2026);
  assert.equal(small.deduction, 400);
  assert.equal(small.minimumApplied, true);
  close(TAX.qbiDeduction(999, 50000, 'single', false, 2026).deduction, 999 * 0.2);
  assert.equal(TAX.qbiDeduction(1200, 300, 'single', false, 2026).deduction, 300); // never more than taxable income
  assert.equal(TAX.qbiDeduction(1029, 300000, 'single', false, 2027).deduction, 0);
  assert.equal(TAX.qbiDeduction(100000, 300000, 'single', false, 2027).deduction, 415);
});

test('QBI: capital gains come off the income limit; REIT dividends add 20%', () => {
  close(TAX.qbiDeduction(50000, 100000, 'single', false, 2026, 0, { netCapitalGain: 60000 }).deduction, 8000);
  close(TAX.qbiDeduction(50000, 100000, 'single', false, 2026, 0, { reitDividends: 5000 }).deduction, 11000);
  close(TAX.qbiDeduction(50000, 52000, 'single', false, 2026, 0, { reitDividends: 5000 }).deduction, 10400);
});

test('worked example: single, $60,000 of 1099 income, $8,000 of expenses (2026)', () => {
  const r = TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 60000, businessExpenses: 8000 });
  const seTax = 52000 * 0.9235 * 0.153;
  const agi = 52000 - seTax / 2;
  const before = agi - 16100;
  const qbi = Math.min(0.2 * agi, 0.2 * before);
  const incomeTax = 1240 + 0.12 * (before - qbi - 12400);
  close(r.selfEmploymentTax, seTax, 'SE tax');
  close(r.qbiDeduction, qbi, 'QBI');
  close(r.incomeTax, incomeTax, 'income tax');
  close(r.totalFederalTax, 10193.09, 'total');
  close(r.taxAddedBySelfEmployment, r.totalFederalTax);
  assert.equal(r.marginalRate, 0.12);
});

test('worked example: single, $70,000 of income, $10,000 of expenses (2027)', () => {
  const r = TAX.estimate1099({ year: 2027, filingStatus: 'single', grossIncome: 70000, businessExpenses: 10000 });
  close(r.selfEmploymentTax, 8477.73, 'SE tax', 0.01);
  close(r.adjustedGrossIncome, 55761.135, 'AGI', 0.01);
  close(r.qbiDeduction, 7832.227, 'QBI', 0.01);
  close(r.incomeTax, 3503.469, 'income tax', 0.01);
  close(r.totalFederalTax, 11981.199, 'total', 0.01);
});

test('side income: $10,000 of profit alone, then on top of a $50,000 salary', () => {
  const alone = TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 10000 });
  assert.equal(Math.round(alone.selfEmploymentTax), 1413);
  assert.equal(alone.incomeTax, 0);
  const withJob = TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 10000, w2Wages: 50000 });
  assert.equal(Math.round(withJob.taxAddedBySelfEmployment), 2305);
  assert.equal(Math.round(withJob.setAsideRate * 100), 23);
});

test('set-aside figures count only the tax the 1099 work adds', () => {
  const r = TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 20000, w2Wages: 70000 });
  const wagesOnly = TAX.estimate1099({ year: 2026, filingStatus: 'single', w2Wages: 70000 });
  close(r.taxAddedBySelfEmployment, r.totalFederalTax - wagesOnly.totalFederalTax);
  close(r.setAsideRate, r.taxAddedBySelfEmployment / 20000);
  close(r.equalQuarterlyPayment, r.taxAddedBySelfEmployment / 4);
});

test('optional state rate: a flat share of net profit, kept apart from federal tax', () => {
  const base = { year: 2026, filingStatus: 'single', grossIncome: 60000, businessExpenses: 8000 };
  const federal = TAX.estimate1099(base);
  const r = TAX.estimate1099({ ...base, stateTaxRate: 0.05 });
  close(r.stateTax, 2600);
  close(r.taxWithState, 10193.09 + 2600);
  close(r.totalFederalTax, federal.totalFederalTax);
  assert.equal(TAX.estimate1099({ ...base, stateTaxRate: 0.5 }).stateTaxRate, 0.2, 'capped at 20%');
  assert.equal(TAX.estimate1099({ ...base, businessExpenses: 70000, stateTaxRate: 0.05 }).stateTax, 0, 'no state tax on a loss');
});

test('qualified tips: deducted from income tax, not SE tax, and not counted as QBI', () => {
  const tips = TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 40000, qualifiedTips: 5000 });
  const none = TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 40000 });
  close(tips.qualifiedTipsDeduction, 5000);
  close(tips.selfEmploymentTax, none.selfEmploymentTax);
  assert.ok(tips.qbiDeduction < none.qbiDeduction);
  assert.equal(TAX.qualifiedTipsDeduction(5000, 40000, 50000, 'mfs', 2026), 0, 'married filing separately cannot claim it');
  assert.equal(TAX.qualifiedTipsDeduction(30000, 40000, 160500, 'single', 2026), 25000 - 10 * 100);
});

test('a business loss lowers other income and creates no SE tax or QBI deduction', () => {
  const r = TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 5000, businessExpenses: 9000, w2Wages: 60000 });
  assert.equal(r.selfEmploymentTax, 0);
  assert.equal(r.qbiDeduction, 0);
  close(r.adjustedGrossIncome, 56000);
  assert.equal(r.taxAddedBySelfEmployment, 0);
});

test('married filing jointly: spouse wages count for brackets but not for your wage base', () => {
  const r = TAX.estimate1099({ year: 2026, filingStatus: 'mfj', grossIncome: 90000, spouseW2Wages: 180000 });
  close(r.socialSecurityTax, 90000 * 0.9235 * 0.124);
  close(r.adjustedGrossIncome, 180000 + 90000 - r.selfEmploymentTaxDeduction);
  close(r.additionalMedicareTax, Math.max(0, 180000 + 90000 * 0.9235 - 250000) * 0.009);
  const single = TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 50000, spouseW2Wages: 99999 });
  close(single.totalFederalTax, TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 50000 }).totalFederalTax);
});

test('invalid input is rejected or cleaned', () => {
  assert.throws(() => TAX.estimate1099({ year: 2019, filingStatus: 'single' }), /Unsupported tax year/);
  assert.throws(() => TAX.estimate1099({ year: 2026, filingStatus: 'widow' }), /Unknown filing status/);
  assert.equal(TAX.estimate1099({ year: 2026, filingStatus: 'single', grossIncome: 'abc', businessExpenses: -50 }).totalFederalTax, 0);
});

test('supported years and sources', () => {
  assert.deepEqual(TAX.supportedYears(), [2026, 2027]);
  for (const y of TAX.supportedYears()) {
    assert.ok(TAX.TAX_YEARS[y].sources.length >= 5);
    for (const s of TAX.TAX_YEARS[y].sources) assert.match(s.url, /^https:\/\/(www\.irs\.gov|www\.ssa\.gov|www\.law\.cornell\.edu|www\.govinfo\.gov)\//);
  }
});
