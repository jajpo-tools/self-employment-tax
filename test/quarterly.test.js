// Quarterly estimated tax plan (Publication 505, regular installment method).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const TAX = require('..');

const close = (actual, expected, msg) =>
  assert.ok(Math.abs(actual - expected) < 0.005, `${msg || ''} expected ${expected}, got ${actual}`);

const base = { year: 2026, filingStatus: 'single', grossIncome: 60000, businessExpenses: 8000 };

test('prior-year safe harbor is lower, so $2,000 a quarter avoids the penalty', () => {
  const r = TAX.estimatedTaxPlan({ ...base, priorYearTax: 8000, priorYearAgi: 45000, asOf: '2026-03-01' });
  close(r.projectedTax, 10193.09);
  close(r.currentYearTarget, 0.9 * r.projectedTax);
  close(r.priorYearTarget, 8000);
  assert.equal(r.safeHarborBasis, 'prior');
  close(r.requiredAnnualPayment, 8000);
  assert.equal(r.upcomingCount, 4);
  close(r.nextMinimumPayment, 2000);
  close(r.nextFullPayment, r.projectedTax / 4);
  assert.equal(r.nextDueDate, '2026-04-15');
});

test('110% of prior-year tax when prior AGI is over $150,000 ($75,000 married filing separately)', () => {
  close(TAX.estimatedTaxPlan({ ...base, grossIncome: 300000, priorYearTax: 50000, priorYearAgi: 160000, asOf: '2026-01-01' }).priorYearTarget, 55000);
  close(TAX.estimatedTaxPlan({ ...base, filingStatus: 'mfs', grossIncome: 300000, priorYearTax: 50000, priorYearAgi: 80000, asOf: '2026-01-01' }).priorYearTarget, 55000);
  close(TAX.estimatedTaxPlan({ ...base, filingStatus: 'mfs', grossIncome: 300000, priorYearTax: 50000, priorYearAgi: 70000, asOf: '2026-01-01' }).priorYearTarget, 50000);
});

test('without prior-year figures the 90% current-year rule is used', () => {
  const r = TAX.estimatedTaxPlan({ ...base, asOf: '2026-01-01' });
  assert.equal(r.safeHarborBasis, 'current');
  close(r.requiredAnnualPayment, 0.9 * r.projectedTax);
  assert.equal(TAX.estimatedTaxPlan({ ...base, priorYearTax: '', asOf: '2026-01-01' }).priorYearTarget, null);
});

test('withholding lowers the installments and counts as paid evenly', () => {
  const r = TAX.estimatedTaxPlan({ ...base, withholding: 4000, asOf: '2026-01-01' });
  close(r.minimumEstimatedTotal, 0.9 * r.projectedTax - 4000);
  close(r.nextMinimumPayment, (0.9 * r.projectedTax - 4000) / 4);
});

test('no payments required under $1,000 owed, or with no tax last year', () => {
  const small = TAX.estimatedTaxPlan({ ...base, grossIncome: 9000, businessExpenses: 0, w2Wages: 40000, withholding: 6000, asOf: '2026-01-01' });
  assert.equal(small.noPaymentsRequired, true);
  assert.equal(small.nextMinimumPayment, 0);
  const noTax = TAX.estimatedTaxPlan({ ...base, priorYearTax: 0, asOf: '2026-01-01' });
  assert.equal(noTax.noPaymentsRequired, true);
  assert.ok(noTax.nextFullPayment > 0, 'still shows what to pay to owe nothing at filing');
});

test('late in the year: missed installments are flagged and the rest is due on Jan 15', () => {
  const r = TAX.estimatedTaxPlan({ ...base, priorYearTax: 8000, estimatedPaid: 2000, asOf: '2026-11-03' });
  assert.equal(r.passedCount, 3);
  assert.equal(r.nextDueDate, '2027-01-15');
  close(r.pastShortfall, 4000);
  close(r.nextMinimumPayment, 6000);
  assert.deepEqual(r.schedule.map((s) => s.status), ['passed', 'passed', 'passed', 'next']);
});

test('after the last due date nothing is left to schedule', () => {
  const r = TAX.estimatedTaxPlan({ ...base, asOf: '2027-02-10' });
  assert.equal(r.upcomingCount, 0);
  assert.equal(r.nextDueDate, null);
  close(r.balanceDueAtFiling, r.projectedTax);
});

test('2027 due dates fall on business days', () => {
  const c = TAX.TAX_YEARS[2027];
  const day = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay();
  for (const d of [...c.estimatedTaxDueDates, c.estimatedTax.filingDeadline]) assert.ok(day(d) >= 1 && day(d) <= 5, d);
  assert.equal(c.estimatedTaxDueDates[3], '2028-01-18'); // Jan 15 is a Saturday, Jan 17 is MLK Day
});
