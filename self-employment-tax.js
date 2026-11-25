/**
 * self-employment-tax: US self-employment tax and federal income tax estimates for freelancers
 * and 1099 contractors, tax years 2026 and 2027.
 *
 * Follows the IRS forms in order: Schedule C net profit, Schedule SE, the deduction for half the SE tax,
 * the standard deduction, the Section 199A QBI deduction (Form 8995 / 8995-A), the 2026 tax brackets,
 * the 0.9% Additional Medicare Tax (Form 8959), and the quarterly estimated tax rules (Publication 505).
 *
 * Pure functions: no DOM, no network, no storage, no dependencies. Works in Node and in the browser
 * (as window.SelfEmploymentTax). Money in US dollars, unrounded: round only for display.
 *
 * Every figure comes from an IRS or SSA publication listed in TAX_YEARS[year].sources.
 * This is the engine behind JAJPO's free 1099 Tax Calculator: https://jajpo.com/taxes/1099-tax-calculator/
 * Estimates only, not tax advice. MIT License, (c) 2026 JAJPO. https://github.com/jajpo-tools/self-employment-tax
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SelfEmploymentTax = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Tax-year figures. Each year lists its sources; "lastVerified" is when they were last checked against them.
  var TAX_YEARS = {
    2026: {
      year: 2026,
      lastVerified: "2026-11-05",
      brackets: {
        single: [
          [12400, 0.1],
          [50400, 0.12],
          [105700, 0.22],
          [201775, 0.24],
          [256225, 0.32],
          [640600, 0.35],
          [Infinity, 0.37]
        ],
        mfj: [
          [24800, 0.1],
          [100800, 0.12],
          [211400, 0.22],
          [403550, 0.24],
          [512450, 0.32],
          [768700, 0.35],
          [Infinity, 0.37]
        ],
        mfs: [
          [12400, 0.1],
          [50400, 0.12],
          [105700, 0.22],
          [201775, 0.24],
          [256225, 0.32],
          [384350, 0.35],
          [Infinity, 0.37]
        ],
        hoh: [
          [17700, 0.1],
          [67450, 0.12],
          [105700, 0.22],
          [201750, 0.24],
          [256200, 0.32],
          [640600, 0.35],
          [Infinity, 0.37]
        ]
      },
      standardDeduction: {
        single: 16100,
        mfj: 32200,
        mfs: 16100,
        hoh: 24150
      },
      selfEmployment: {
        netEarningsFactor: 0.9235,
        minimumNetEarnings: 400,
        socialSecurityRate: 0.124,
        socialSecurityWageBase: 184500,
        medicareRate: 0.029
      },
      additionalMedicare: {
        rate: 0.009,
        threshold: {
          single: 200000,
          hoh: 200000,
          mfj: 250000,
          mfs: 125000
        }
      },
      qbi: {
        rate: 0.2,
        threshold: {
          single: 201750,
          hoh: 201750,
          mfj: 403500,
          mfs: 201775
        },
        phaseInRange: {
          single: 75000,
          hoh: 75000,
          mfj: 150000,
          mfs: 75000
        },
        wageLimitRate: 0.5,
        wagePropertyRate: 0.25,
        ubiaRate: 0.025,
        minimumDeduction: 400,
        minimumQualifiedIncome: 1000
      },
      qualifiedTips: {
        maxDeduction: 25000,
        phaseOutStart: {
          single: 150000,
          hoh: 150000,
          mfj: 300000
        },
        reductionPerThousand: 100
      },
      estimatedTaxDueDates: ["2026-04-15", "2026-06-15", "2026-09-15", "2027-01-15"],
      estimatedTax: {
        currentYearPercent: 0.9,
        priorYearPercent: 1,
        priorYearHighIncomePercent: 1.1,
        priorYearHighIncomeAgi: {
          single: 150000,
          mfj: 150000,
          hoh: 150000,
          mfs: 75000
        },
        noPenaltyBelow: 1000,
        januaryExceptionFileBy: "2027-02-01",
        filingDeadline: "2027-04-15"
      },
      sources: [
        {
          label: "Rev. Proc. 2025-32 (2026 tax brackets, standard deduction, QBI thresholds)",
          url: "https://www.irs.gov/irb/2025-45_IRB"
        },
        {
          label: "IRS: 2026 tax changes for individuals",
          url: "https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers"
        },
        {
          label: "IRS: Self-employment tax (Social Security and Medicare)",
          url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes"
        },
        {
          label: "SSA: 2026 contribution and benefit base ($184,500)",
          url: "https://www.ssa.gov/oact/cola/cbb.html"
        },
        {
          label: "IRS: Additional Medicare Tax Q&A",
          url: "https://www.irs.gov/businesses/small-businesses-self-employed/questions-and-answers-for-the-additional-medicare-tax"
        },
        {
          label: "IRC section 199A (QBI deduction, incl. $400 minimum)",
          url: "https://www.law.cornell.edu/uscode/text/26/199A"
        },
        {
          label: "Instructions for Form 8995: Qualified Business Income Deduction Simplified Computation",
          url: "https://www.irs.gov/instructions/i8995"
        },
        {
          label: "IRS: Qualified business income deduction",
          url: "https://www.irs.gov/newsroom/qualified-business-income-deduction"
        },
        {
          label: "IRS: About Form W-4, Employee's Withholding Certificate",
          url: "https://www.irs.gov/forms-pubs/about-form-w-4"
        },
        {
          label: "IRS: Tax Withholding Estimator",
          url: "https://www.irs.gov/individuals/tax-withholding-estimator"
        },
        {
          label: "26 U.S.C. 6654(d), (e) and (g): required annual payment, the $1,000 rule, withholding treated as paid evenly",
          url: "https://www.law.cornell.edu/uscode/text/26/6654"
        },
        {
          label: "IRS Form 1040-ES (2026) estimated tax",
          url: "https://www.irs.gov/pub/irs-pdf/f1040es.pdf"
        },
        {
          label: "IRS Publication 505 (2026): Tax Withholding and Estimated Tax",
          url: "https://www.irs.gov/publications/p505"
        },
        {
          label: "T.D. 10044: Occupations That Customarily and Regularly Received Tips (final regulations, Apr 13, 2026)",
          url: "https://www.govinfo.gov/content/pkg/FR-2026-04-13/pdf/2026-07104.pdf"
        },
        {
          label: "Schedule 1-A (Form 1040): Additional Deductions",
          url: "https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf"
        },
        {
          label: "Instructions for Form 8995-A: Qualified Business Income Deduction",
          url: "https://www.irs.gov/instructions/i8995a"
        }
      ]
    },
    2027: {
      year: 2027,
      lastVerified: "2026-11-13",
      brackets: {
        single: [
          [12800, 0.1],
          [52025, 0.12],
          [109125, 0.22],
          [208325, 0.24],
          [264550, 0.32],
          [661375, 0.35],
          [Infinity, 0.37]
        ],
        mfj: [
          [25600, 0.1],
          [104050, 0.12],
          [218250, 0.22],
          [416650, 0.24],
          [529100, 0.32],
          [793650, 0.35],
          [Infinity, 0.37]
        ],
        mfs: [
          [12800, 0.1],
          [52025, 0.12],
          [109125, 0.22],
          [208325, 0.24],
          [264550, 0.32],
          [396825, 0.35],
          [Infinity, 0.37]
        ],
        hoh: [
          [18250, 0.1],
          [69650, 0.12],
          [109100, 0.22],
          [208300, 0.24],
          [264550, 0.32],
          [661350, 0.35],
          [Infinity, 0.37]
        ]
      },
      standardDeduction: {
        single: 16600,
        mfj: 33200,
        mfs: 16600,
        hoh: 24925
      },
      selfEmployment: {
        netEarningsFactor: 0.9235,
        minimumNetEarnings: 400,
        socialSecurityRate: 0.124,
        socialSecurityWageBase: 192300,
        medicareRate: 0.029
      },
      additionalMedicare: {
        rate: 0.009,
        threshold: {
          single: 200000,
          hoh: 200000,
          mfj: 250000,
          mfs: 125000
        }
      },
      qbi: {
        rate: 0.2,
        threshold: {
          single: 208300,
          hoh: 208300,
          mfj: 416600,
          mfs: 208325
        },
        phaseInRange: {
          single: 75000,
          hoh: 75000,
          mfj: 150000,
          mfs: 75000
        },
        wageLimitRate: 0.5,
        wagePropertyRate: 0.25,
        ubiaRate: 0.025,
        minimumDeduction: 415,
        minimumQualifiedIncome: 1030
      },
      qualifiedTips: {
        maxDeduction: 25000,
        phaseOutStart: {
          single: 150000,
          hoh: 150000,
          mfj: 300000
        },
        reductionPerThousand: 100
      },
      estimatedTaxDueDates: ["2027-04-15", "2027-06-15", "2027-09-15", "2028-01-18"],
      estimatedTax: {
        currentYearPercent: 0.9,
        priorYearPercent: 1,
        priorYearHighIncomePercent: 1.1,
        priorYearHighIncomeAgi: {
          single: 150000,
          mfj: 150000,
          hoh: 150000,
          mfs: 75000
        },
        noPenaltyBelow: 1000,
        januaryExceptionFileBy: "2028-01-31",
        filingDeadline: "2028-04-18"
      },
      sources: [
        {
          label: "Rev. Proc. 2026-35 (2027 tax brackets, standard deduction, QBI thresholds, long-term care limits)",
          url: "https://www.irs.gov/pub/irs-drop/rp-26-35.pdf"
        },
        {
          label: "IRS: Tax inflation adjustments for tax year 2027 (IR-2026-133)",
          url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts"
        },
        {
          label: "SSA: 2027 Cost-of-Living Adjustment fact sheet ($192,300 wage base)",
          url: "https://www.ssa.gov/news/en/cola/factsheets/2027.html"
        },
        {
          label: "IRS: Self-employment tax (Social Security and Medicare)",
          url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes"
        },
        {
          label: "IRS: Additional Medicare Tax Q&A",
          url: "https://www.irs.gov/businesses/small-businesses-self-employed/questions-and-answers-for-the-additional-medicare-tax"
        },
        {
          label: "IRC section 199A (QBI deduction, incl. $400 minimum)",
          url: "https://www.law.cornell.edu/uscode/text/26/199A"
        },
        {
          label: "Instructions for Form 8995: Qualified Business Income Deduction Simplified Computation",
          url: "https://www.irs.gov/instructions/i8995"
        },
        {
          label: "IRS: Qualified business income deduction",
          url: "https://www.irs.gov/newsroom/qualified-business-income-deduction"
        },
        {
          label: "IRS: About Form W-4, Employee's Withholding Certificate",
          url: "https://www.irs.gov/forms-pubs/about-form-w-4"
        },
        {
          label: "IRS: Tax Withholding Estimator",
          url: "https://www.irs.gov/individuals/tax-withholding-estimator"
        },
        {
          label: "26 U.S.C. 6654(d), (e) and (g): required annual payment, the $1,000 rule, withholding treated as paid evenly",
          url: "https://www.law.cornell.edu/uscode/text/26/6654"
        },
        {
          label: "T.D. 10044: Occupations That Customarily and Regularly Received Tips (final regulations, Apr 13, 2026)",
          url: "https://www.govinfo.gov/content/pkg/FR-2026-04-13/pdf/2026-07104.pdf"
        },
        {
          label: "Schedule 1-A (Form 1040): Additional Deductions",
          url: "https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf"
        },
        {
          label: "Instructions for Form 8995-A: Qualified Business Income Deduction",
          url: "https://www.irs.gov/instructions/i8995a"
        }
      ]
    }
  };

  var FILING_STATUSES = ['single', 'mfj', 'mfs', 'hoh'];

  function getYear(year) {
    var cfg = TAX_YEARS[year];
    if (!cfg) throw new Error('Unsupported tax year: ' + year);
    return cfg;
  }

  function assertStatus(status) {
    if (FILING_STATUSES.indexOf(status) === -1) throw new Error('Unknown filing status: ' + status);
  }

  /** Federal income tax on ordinary taxable income using the year's bracket table. */
  function incomeTax(taxableIncome, status, year) {
    assertStatus(status);
    var brackets = getYear(year).brackets[status];
    var tax = 0;
    var lower = 0;
    var income = Math.max(0, taxableIncome);
    for (var i = 0; i < brackets.length && income > lower; i++) {
      var upper = brackets[i][0];
      tax += (Math.min(income, upper) - lower) * brackets[i][1];
      lower = upper;
    }
    return tax;
  }

  /** Marginal ordinary-income rate that applies to the last dollar of taxable income. */
  function marginalRate(taxableIncome, status, year) {
    assertStatus(status);
    var brackets = getYear(year).brackets[status];
    for (var i = 0; i < brackets.length; i++) {
      if (taxableIncome <= brackets[i][0]) return brackets[i][1];
    }
    return brackets[brackets.length - 1][1];
  }

  /**
   * Schedule SE: self-employment tax on net profit.
   * `socialSecurityWages` are the person's own W-2 Social Security wages, which use up the wage base first.
   */
  function selfEmploymentTax(netProfit, socialSecurityWages, year) {
    var se = getYear(year).selfEmployment;
    var netEarnings = Math.max(0, netProfit) * se.netEarningsFactor;
    if (netEarnings < se.minimumNetEarnings) {
      return { netEarnings: netEarnings, socialSecurity: 0, medicare: 0, total: 0, deduction: 0, wageBaseRemaining: Math.max(0, se.socialSecurityWageBase - socialSecurityWages) };
    }
    var wageBaseRemaining = Math.max(0, se.socialSecurityWageBase - Math.max(0, socialSecurityWages));
    var socialSecurity = Math.min(netEarnings, wageBaseRemaining) * se.socialSecurityRate;
    var medicare = netEarnings * se.medicareRate;
    var total = socialSecurity + medicare;
    return {
      netEarnings: netEarnings,
      socialSecurity: socialSecurity,
      medicare: medicare,
      total: total,
      deduction: total / 2,
      wageBaseRemaining: wageBaseRemaining
    };
  }

  /** Form 8959: 0.9% Additional Medicare Tax. Wages reduce the threshold available to SE income. */
  function additionalMedicareTax(medicareWages, selfEmploymentEarnings, status, year) {
    assertStatus(status);
    var cfg = getYear(year).additionalMedicare;
    var threshold = cfg.threshold[status];
    var wages = Math.max(0, medicareWages);
    var onWages = Math.max(0, wages - threshold) * cfg.rate;
    var seThreshold = Math.max(0, threshold - wages);
    var onSelfEmployment = Math.max(0, Math.max(0, selfEmploymentEarnings) - seThreshold) * cfg.rate;
    return { onWages: onWages, onSelfEmployment: onSelfEmployment, total: onWages + onSelfEmployment };
  }

  /**
   * Section 199A QBI deduction for one business (IRC 199A; Forms 8995 and 8995-A).
   * `w2WagesPaid` is what the business paid in W-2 wages. A sole proprietor with no staff pays none, so
   * without qualified property the limit above the threshold is $0. An S corporation counts the owner's salary.
   * `more` (optional): { ubia, netCapitalGain, reitDividends, activeBusiness }.
   *   ubia: unadjusted basis immediately after acquisition of qualified property (199A(b)(2)(B)(ii)).
   *   netCapitalGain: net capital gain plus qualified dividends; the income limit is 20% of taxable income minus it (199A(a)(1)(B)).
   *   reitDividends: qualified REIT dividends (Form 1099-DIV box 5); 20% of them is added before the income limit.
   *   activeBusiness: false if the owner doesn't materially participate, which rules out the $400 minimum (199A(i)).
   */
  function qbiDeduction(qualifiedBusinessIncome, taxableIncomeBeforeQbi, status, isSpecifiedService, year, w2WagesPaid, more) {
    assertStatus(status);
    var cfg = getYear(year).qbi;
    var o = more || {};
    var qbi = Math.max(0, qualifiedBusinessIncome);
    var ti = Math.max(0, taxableIncomeBeforeQbi);
    var threshold = cfg.threshold[status];
    var range = cfg.phaseInRange[status];
    var tentative = qbi * cfg.rate;
    var wages = Math.max(0, Number(w2WagesPaid) || 0);
    var ubia = Math.max(0, Number(o.ubia) || 0);
    // Form 8995-A lines 5 to 11: the greater of 50% of W-2 wages, or 25% of W-2 wages plus 2.5% of UBIA.
    var wageLimit = Math.max(wages * cfg.wageLimitRate, wages * cfg.wagePropertyRate + ubia * cfg.ubiaRate);
    var phaseFraction = 0;
    var applicable = 1;
    var deduction;
    var qualifies = true;

    if (ti <= threshold) {
      deduction = tentative;
    } else if (ti >= threshold + range) {
      phaseFraction = 1;
      applicable = isSpecifiedService ? 0 : 1;
      deduction = isSpecifiedService ? 0 : Math.min(tentative, wageLimit);
      if (isSpecifiedService) qualifies = false; // an SSTB above the range is not a qualified trade or business
    } else {
      // Form 8995-A Part III: only part of the gap between 20% of QBI and the wage limit is lost.
      phaseFraction = (ti - threshold) / range;
      applicable = isSpecifiedService ? 1 - phaseFraction : 1; // Schedule A scales QBI and wages alike
      var line3 = tentative * applicable;
      var line10 = wageLimit * applicable;
      deduction = line10 >= line3 ? line3 : line3 - (line3 - line10) * phaseFraction;
    }

    var businessComponent = deduction;
    var reitComponent = Math.max(0, Number(o.reitDividends) || 0) * cfg.rate; // Form 8995 lines 6 to 9
    var netCapitalGain = Math.max(0, Number(o.netCapitalGain) || 0);
    var incomeLimit = Math.max(0, ti - netCapitalGain) * cfg.rate;
    deduction = Math.min(businessComponent + reitComponent, incomeLimit);

    // IRC 199A(i): at least the minimum when QBI from businesses the owner materially participates in reaches the floor.
    var minimumApplied = false;
    if (qualifies && o.activeBusiness !== false && qbi >= cfg.minimumQualifiedIncome && deduction < cfg.minimumDeduction) {
      deduction = cfg.minimumDeduction;
      minimumApplied = true;
    }
    deduction = Math.min(deduction, ti); // a deduction cannot push taxable income below zero

    return {
      deduction: deduction, tentative: tentative, incomeLimit: incomeLimit, phaseFraction: phaseFraction, minimumApplied: minimumApplied,
      businessComponent: businessComponent, reitComponent: reitComponent, wageLimit: wageLimit, applicable: applicable,
      qualifies: qualifies, threshold: threshold, phaseInEnd: threshold + range, netCapitalGain: netCapitalGain
    };
  }

  /**
   * Section 224 qualified tips deduction for a self-employed person (Schedule 1-A lines 5–13).
   * Only tips separately reported on a Form 1099 count, up to net profit. It lowers income tax,
   * never SE tax (T.D. 10044). MAGI here is AGI, since the engine has no foreign income exclusions.
   */
  function qualifiedTipsDeduction(tips, netProfit, magi, status, year) {
    assertStatus(status);
    var cfg = getYear(year).qualifiedTips;
    if (!cfg || status === 'mfs') return 0; // married people must file jointly to claim it
    var allowed = Math.min(Math.max(0, tips), Math.max(0, netProfit), cfg.maxDeduction);
    var over = Math.max(0, magi - cfg.phaseOutStart[status]);
    return Math.max(0, allowed - Math.floor(over / 1000) * cfg.reductionPerThousand);
  }

  function core(p) {
    var cfg = getYear(p.year);
    var netProfit = p.grossIncome - p.businessExpenses;
    var se = selfEmploymentTax(netProfit, p.w2Wages, p.year);
    var medicareWages = p.w2Wages + (p.filingStatus === 'mfj' ? p.spouseW2Wages : 0);
    var addlMedicare = additionalMedicareTax(medicareWages, se.netEarnings, p.filingStatus, p.year);
    var otherIncome = p.w2Wages + (p.filingStatus === 'mfj' ? p.spouseW2Wages : 0) + p.otherIncome;
    // businessAdjustments: self-employed health insurance and retirement deductions. They lower AGI and QBI, never SE tax.
    var agi = otherIncome + netProfit - se.deduction - p.businessAdjustments;
    // Itemized deductions are used only when you pass them and they beat the standard deduction.
    var standardDeduction = Math.max(cfg.standardDeduction[p.filingStatus], p.itemizedDeductions);
    var tipsDeduction = qualifiedTipsDeduction(p.qualifiedTips, netProfit, agi, p.filingStatus, p.year);
    // Form 8995 line 11: the QBI income limit is figured after the Schedule 1-A deductions.
    var taxableBeforeQbi = Math.max(0, agi - standardDeduction - tipsDeduction);
    // IRC 199A(c)(4)(D): tips covered by the Section 224 deduction aren't QBI (tax years after 2024).
    var qbiIncome = Math.max(0, netProfit - se.deduction - p.businessAdjustments - tipsDeduction);
    var qbi = qbiDeduction(qbiIncome, taxableBeforeQbi, p.filingStatus, p.isSpecifiedService, p.year);
    var taxableIncome = Math.max(0, taxableBeforeQbi - qbi.deduction);
    var tax = incomeTax(taxableIncome, p.filingStatus, p.year);
    return {
      netProfit: netProfit,
      se: se,
      additionalMedicare: addlMedicare,
      agi: agi,
      standardDeduction: standardDeduction,
      tipsDeduction: tipsDeduction,
      taxableIncomeBeforeQbi: taxableBeforeQbi,
      qualifiedBusinessIncome: qbiIncome,
      qbi: qbi,
      taxableIncome: taxableIncome,
      incomeTax: tax,
      totalFederalTax: tax + se.total + addlMedicare.total
    };
  }

  function normalize(input) {
    var n = function (v) { var x = Number(v); return isFinite(x) ? x : 0; };
    var p = {
      year: Number(input.year),
      filingStatus: input.filingStatus || 'single',
      grossIncome: Math.max(0, n(input.grossIncome)),
      businessExpenses: Math.max(0, n(input.businessExpenses)),
      w2Wages: Math.max(0, n(input.w2Wages)),
      spouseW2Wages: Math.max(0, n(input.spouseW2Wages)),
      isSpecifiedService: Boolean(input.isSpecifiedService),
      taxAlreadyPaid: Math.max(0, n(input.taxAlreadyPaid)),
      qualifiedTips: Math.max(0, n(input.qualifiedTips)),
      itemizedDeductions: Math.max(0, n(input.itemizedDeductions)),
      businessAdjustments: Math.max(0, n(input.businessAdjustments)),
      otherIncome: Math.max(0, n(input.otherIncome)),
      stateTaxRate: Math.min(0.2, Math.max(0, n(input.stateTaxRate))) // optional flat rate (0–0.2); never changes federal figures
    };
    getYear(p.year);
    assertStatus(p.filingStatus);
    return p;
  }

  /**
   * Full 1099 / self-employment estimate.
   * The "set aside" figures compare the full return with the same return without
   * the self-employment income, so they show only the tax the 1099 work adds.
   * State tax is optional: a flat rate you pass as `stateTaxRate`, applied to net profit. It is reported separately and never changes the federal figures.
   */
  function estimate1099(input) {
    var p = normalize(input);
    var cfg = getYear(p.year);
    var full = core(p);
    var withoutSe = core(Object.assign({}, p, { grossIncome: 0, businessExpenses: 0 }));
    var addedBySelfEmployment = Math.max(0, full.totalFederalTax - withoutSe.totalFederalTax);
    var balance = full.totalFederalTax - p.taxAlreadyPaid;
    var stateTax = Math.max(0, full.netProfit) * p.stateTaxRate;
    var withState = addedBySelfEmployment + stateTax;

    return {
      inputs: p,
      year: p.year,
      lastVerified: cfg.lastVerified,
      netProfit: full.netProfit,
      netEarningsFromSelfEmployment: full.se.netEarnings,
      socialSecurityTax: full.se.socialSecurity,
      medicareTax: full.se.medicare,
      selfEmploymentTax: full.se.total,
      selfEmploymentTaxDeduction: full.se.deduction,
      additionalMedicareTax: full.additionalMedicare.total,
      adjustedGrossIncome: full.agi,
      standardDeduction: full.standardDeduction,
      qualifiedTipsDeduction: full.tipsDeduction,
      taxableIncomeBeforeQbi: full.taxableIncomeBeforeQbi,
      qualifiedBusinessIncome: full.qualifiedBusinessIncome,
      qbiDeduction: full.qbi.deduction,
      qbiMinimumApplied: full.qbi.minimumApplied,
      qbiPhaseFraction: full.qbi.phaseFraction,
      taxableIncome: full.taxableIncome,
      incomeTax: full.incomeTax,
      marginalRate: marginalRate(full.taxableIncome, p.filingStatus, p.year),
      totalFederalTax: full.totalFederalTax,
      taxAddedBySelfEmployment: addedBySelfEmployment,
      setAsideRate: p.grossIncome > 0 ? addedBySelfEmployment / p.grossIncome : 0,
      effectiveRateOnNetProfit: full.netProfit > 0 ? addedBySelfEmployment / full.netProfit : 0,
      equalQuarterlyPayment: addedBySelfEmployment / 4,
      taxAlreadyPaid: p.taxAlreadyPaid,
      balanceAfterPayments: balance,
      estimatedTaxDueDates: cfg.estimatedTaxDueDates.slice(),
      stateTaxRate: p.stateTaxRate,
      stateTax: stateTax,
      taxWithState: withState,
      setAsideRateWithState: p.grossIncome > 0 ? withState / p.grossIncome : 0,
      effectiveRateWithState: full.netProfit > 0 ? withState / full.netProfit : 0
    };
  }

  /**
   * Quarterly estimated-tax plan (Publication 505, regular installment method).
   * Withholding counts as paid in four equal parts; estimated payments already made are
   * assumed to have been made on time. `asOf` is an ISO date (YYYY-MM-DD).
   */
  function estimatedTaxPlan(input) {
    var est = estimate1099(input);
    var p = est.inputs;
    var cfg = getYear(p.year);
    var rules = cfg.estimatedTax;
    var n = function (v) { var x = Number(v); return isFinite(x) && x >= 0 ? x : 0; };
    var withholding = n(input.withholding);
    var estimatedPaid = n(input.estimatedPaid);
    var hasPrior = input.priorYearTax !== undefined && input.priorYearTax !== null && input.priorYearTax !== '' && isFinite(Number(input.priorYearTax));
    var priorYearTax = hasPrior ? n(input.priorYearTax) : null;
    var priorYearAgi = n(input.priorYearAgi);
    var asOf = input.asOf || new Date().toISOString().slice(0, 10);

    var projectedTax = est.totalFederalTax;
    var currentYearTarget = projectedTax * rules.currentYearPercent;
    var priorYearRate = priorYearAgi > rules.priorYearHighIncomeAgi[p.filingStatus] ? rules.priorYearHighIncomePercent : rules.priorYearPercent;
    var priorYearTarget = hasPrior ? priorYearTax * priorYearRate : null;
    var requiredAnnualPayment = hasPrior ? Math.min(currentYearTarget, priorYearTarget) : currentYearTarget;
    var basis = hasPrior && priorYearTarget <= currentYearTarget ? 'prior' : 'current';

    var balanceAfterWithholding = projectedTax - withholding;
    var noPaymentsRequired = balanceAfterWithholding < rules.noPenaltyBelow || (hasPrior && priorYearTax === 0);
    var minimumTotal = noPaymentsRequired ? 0 : Math.max(0, requiredAnnualPayment - withholding);
    var fullTotal = Math.max(0, projectedTax - withholding);

    var dates = cfg.estimatedTaxDueDates;
    var upcoming = dates.filter(function (d) { return d >= asOf; });
    var passedCount = dates.length - upcoming.length;
    var quarterMinimum = minimumTotal / dates.length;
    var pastShortfall = Math.max(0, quarterMinimum * passedCount - estimatedPaid);

    var remainingMinimum = Math.max(0, minimumTotal - estimatedPaid);
    var remainingFull = Math.max(0, fullTotal - estimatedPaid);
    var perMinimum = upcoming.length ? remainingMinimum / upcoming.length : 0;
    var perFull = upcoming.length ? remainingFull / upcoming.length : 0;

    var schedule = dates.map(function (d, i) {
      var isUpcoming = d >= asOf;
      return {
        date: d,
        quarter: i + 1,
        status: !isUpcoming ? 'passed' : (d === upcoming[0] ? 'next' : 'upcoming'),
        regularInstallment: quarterMinimum,
        minimumPayment: isUpcoming ? perMinimum : 0,
        fullPayment: isUpcoming ? perFull : 0
      };
    });

    return {
      estimate: est,
      year: p.year,
      asOf: asOf,
      projectedTax: projectedTax,
      withholding: withholding,
      estimatedPaid: estimatedPaid,
      currentYearTarget: currentYearTarget,
      priorYearTax: priorYearTax,
      priorYearRate: priorYearRate,
      priorYearTarget: priorYearTarget,
      requiredAnnualPayment: noPaymentsRequired ? 0 : requiredAnnualPayment,
      safeHarborBasis: basis,
      noPaymentsRequired: noPaymentsRequired,
      minimumEstimatedTotal: minimumTotal,
      fullEstimatedTotal: fullTotal,
      remainingMinimum: remainingMinimum,
      remainingFull: remainingFull,
      nextDueDate: upcoming.length ? upcoming[0] : null,
      nextMinimumPayment: perMinimum,
      nextFullPayment: perFull,
      upcomingCount: upcoming.length,
      passedCount: passedCount,
      pastShortfall: pastShortfall,
      balanceDueAtFiling: Math.max(0, projectedTax - withholding - estimatedPaid),
      schedule: schedule,
      rules: rules
    };
  }

  return {
    version: '1.0.0',
    FILING_STATUSES: FILING_STATUSES,
    TAX_YEARS: TAX_YEARS,
    supportedYears: function () { return Object.keys(TAX_YEARS).map(Number).sort(); },
    incomeTax: incomeTax,
    marginalRate: marginalRate,
    selfEmploymentTax: selfEmploymentTax,
    additionalMedicareTax: additionalMedicareTax,
    qbiDeduction: qbiDeduction,
    qualifiedTipsDeduction: qualifiedTipsDeduction,
    estimate1099: estimate1099,
    estimatedTaxPlan: estimatedTaxPlan
  };
});
