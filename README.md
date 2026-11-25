# self-employment-tax

[![tests](https://github.com/jajpo-tools/self-employment-tax/actions/workflows/test.yml/badge.svg)](https://github.com/jajpo-tools/self-employment-tax/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A JavaScript library for **US self-employment tax and federal income tax on 1099 income**, for tax years 2026 and 2027. It gives a freelancer's whole federal picture in one call: Schedule SE, the QBI deduction, the Additional Medicare Tax, the share of each payment to set aside, and a quarterly estimated tax plan with the IRS safe harbor rules.

- **Follows the IRS forms in order:** Schedule C, Schedule SE, Form 1040, Form 8995 / 8995-A, Form 8959, Publication 505.
- **IRS-sourced:** every figure in the file has its source listed in `TAX_YEARS[year].sources`.
- **Tested:** 29 tests, including the IRS bracket tables and the worked examples in the IRS Q&A.
- **Small:** one file, zero dependencies, works in Node and the browser.

This is the engine that runs JAJPO's free [1099 Tax Calculator](https://jajpo.com/taxes/1099-tax-calculator/), so you can see every result worked out step by step on a real page.

## Install

```bash
npm install github:jajpo-tools/self-employment-tax
```

Or in a browser, with no build step:

```html
<script src="https://cdn.jsdelivr.net/gh/jajpo-tools/self-employment-tax@main/self-employment-tax.js"></script>
<script>
  const r = SelfEmploymentTax.estimate1099({ year: 2026, grossIncome: 60000, businessExpenses: 8000 });
</script>
```

## Example: a freelancer with $60,000 of 1099 income

```js
const tax = require('self-employment-tax');

const r = tax.estimate1099({
  year: 2026,
  filingStatus: 'single',      // 'single' | 'mfj' | 'mfs' | 'hoh'
  grossIncome: 60000,          // 1099 income
  businessExpenses: 8000
});
```

| Step | Result |
|---|---|
| Net profit (Schedule C) | $52,000.00 |
| Self-employment tax: 15.3% of 92.35% of profit (Schedule SE) | $7,347.37 |
| Deduction for half the SE tax | $3,673.68 |
| Adjusted gross income | $48,326.32 |
| Standard deduction | $16,100.00 |
| QBI deduction: 20%, capped by taxable income (Form 8995) | $6,445.26 |
| Taxable income | $25,781.05 |
| Federal income tax | $2,845.73 |
| **Total federal tax** | **$10,193.09** |
| Set aside from each payment (`setAsideRate`) | 16.99% |
| Equal quarterly payment | $2,548.27 |

State income tax isn't included. You can pass an optional flat `stateTaxRate` (for example `0.05`), which is reported separately and never changes the federal figures.

## Quarterly estimated taxes

```js
const plan = tax.estimatedTaxPlan({
  year: 2026, grossIncome: 60000, businessExpenses: 8000,
  priorYearTax: 8000,      // last year's total tax: the 100% safe harbor
  priorYearAgi: 45000,     // over $150,000 makes it 110%
  asOf: '2026-03-01'
});

plan.safeHarborBasis;      // 'prior': 100% of last year's tax is less than 90% of this year's
plan.nextDueDate;          // '2026-04-15'
plan.nextMinimumPayment;   // 2000: the least that avoids the underpayment penalty
plan.nextFullPayment;      // 2548.27: pay this to owe nothing at filing time
plan.schedule;             // all four due dates with their status
```

It handles W-2 withholding (treated as paid evenly through the year), payments already made, missed installments, the $1,000 rule, and the zero-tax-last-year rule.

## More use cases

```js
// Side income on top of a salary: only the tax the 1099 work adds
tax.estimate1099({ year: 2026, grossIncome: 10000, w2Wages: 50000 }).taxAddedBySelfEmployment; // ≈ 2305

// Married filing jointly: a spouse's wages move the brackets but not your Social Security wage base
tax.estimate1099({ year: 2026, filingStatus: 'mfj', grossIncome: 90000, spouseW2Wages: 180000 });

// The pieces on their own
tax.selfEmploymentTax(100000, 150000, 2026);              // wage base shared with W-2 wages
tax.additionalMedicareTax(130000, 145000, 'single', 2026); // 0.9% over $200,000
tax.qbiDeduction(150000, 239250, 'single', true, 2026);    // a specified service business in the phase-in
tax.incomeTax(60000, 'single', 2026);                      // the bracket table
```

TypeScript definitions are included (`index.d.ts`).

## What it covers

| Rule | Details |
|---|---|
| Self-employment tax | 92.35% of net profit; none under $400 of net earnings (about $433 of profit); 12.4% Social Security up to the wage base ($184,500 in 2026, $192,300 in 2027), shared with W-2 wages; 2.9% Medicare with no limit; half deductible |
| Additional Medicare Tax | 0.9% over $200,000 single, $250,000 joint, $125,000 separate, with wages using up the threshold first |
| QBI deduction (Section 199A) | 20% of QBI, capped at 20% of taxable income; the phase-in above $201,750 / $403,500 (2026); specified service businesses; the W-2 wage and property limit; the $400 minimum (2026) and $415 (2027); capital gains and REIT dividends |
| Qualified tips (Section 224) | Up to $25,000, with the phase-out; lowers income tax, never SE tax, and isn't counted as QBI |
| Income tax | 2026 and 2027 brackets for all four filing statuses; standard or itemized deduction |
| Estimated tax | The four due dates, the 90% / 100% / 110% safe harbors, the $1,000 rule, withholding |

**Not covered:** state tax brackets, credits (child tax credit, EITC and others), capital gains rates, the alternative minimum tax, and S corporation payroll. It estimates; it doesn't file a return.

## How it's tested

```bash
npm test
```

The tests check the brackets against the tax amounts printed in Rev. Proc. 2025-32 and Rev. Proc. 2026-35, and the Additional Medicare Tax against the IRS Q&A examples. They also cover the QBI rules case by case, full worked examples for 2026 and 2027, the safe harbor rules, and edge cases: $433 vs $434 of profit, a business loss, spouse wages, and bad input.

## Tax figures as data

If you only need the numbers (brackets, thresholds, limits, due dates) as JSON or CSV, see [us-tax-data](https://github.com/jajpo-tools/us-tax-data).

## Not tax advice

These are estimates for planning, built from public IRS publications. They can't account for everything on a real return. Check the [IRS sources](https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes) or a tax professional before you rely on a figure.

## License

MIT. Maintained by [JAJPO](https://jajpo.com/): free tax and invoicing tools for US freelancers.
