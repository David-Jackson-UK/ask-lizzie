#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// ASK LIZZIE — ROUTING REGRESSION TEST HARNESS
// Exercises every meaningful route through the classification,
// authority detection, and sponsor selection pipeline.
// Run: node test-routing.js
// ═══════════════════════════════════════════════════════════════

// ── Import the functions under test ─────────────────────────────
// These are extracted inline from route.js for standalone testing.
// In production, consider exporting them from a shared module.

// ── AUTHORITY_PATTERNS (copied from route.js) ───────────────────
const AUTHORITY_PATTERNS = [
  { key: "energy_dispute", any: [
    /\b(british gas|octopus|eon|edf|ovo|scottish power|npower|bulb|shell energy|sse)\b/i,
    /\b(energy supply|energy supplier|electricity supplier|gas supplier|utility|dual fuel)\b/i,
    /\b(kwh|kilowatt|meter reading|meter readings|standing charge|unit rate|prepayment meter|smart meter)\b/i,
    /\b(electricity and gas|gas and electricity|domestic electricity|domestic gas)\b/i,
  ], amplify: [/\b(bill|statement|estimate|estimated|backdated|overcharge|dispute|arrears|tariff|direct debit|account.*balance)\b/i] },
  { key: "parking_private", any: [
    /\b(parking charge notice|pcn)\b/i,
    /\b(parkingeye|euro car parks|smart parking|ncp|apcoa|british parking association|bpa|international parking community|ipc)\b/i,
  ], amplify: [/\b(private land|retail park|supermarket car park|contravention|breach of contract)\b/i], exclude: [/\bcouncil\b|\blocal authority\b|\bborough\b|\btraffic warden\b/i] },
  { key: "parking_council", any: [
    /\b(penalty charge notice|pcn)\b/i,
  ], amplify: [/\b(council|borough|local authority|traffic management act|tma 2004|civil enforcement officer)\b/i] },
  { key: "debt_collection", any: [
    /\b(debt collection|debt recovery|default notice|overdue account|outstanding balance|final demand)\b/i,
    /\b(lowell|cabot|intrum|pra group|arrow global|link financial|moorcroft|robinson way)\b/i,
  ], amplify: [/\b(pay|legal action|court|claim|enforce|bailiff|ccj)\b/i] },
  // Housing — possession notices, eviction, Section 21/Section 8
  { key: "housing_possession", any: [
    /\bsection\s+21\b/i,
    /\bsection\s+8\b/i,
    /\bpossession\s+(?:order|notice|proceedings|claim)\b/i,
    /\beviction\s+(?:notice|proceedings|order)\b/i,
    /\bnotice\s+(?:to\s+quit|seeking\s+possession|requiring\s+possession)\b/i,
  ], amplify: [/\b(landlord|tenant|tenancy|rent|property|vacate|leave\s+the\s+property)\b/i] },
  // Housing — rent arrears
  { key: "housing_arrears", any: [
    /\brent\s+arrears\b/i,
    /\boverdue\s+rent\b/i,
    /\barrears\s+of\s+rent\b/i,
  ], amplify: [/\b(landlord|tenant|tenancy|property|letting)\b/i] },
  // Tenancy — deposit disputes
  { key: "tenancy_deposit", any: [
    /\b(tenancy deposit|deposit scheme|dps|tds|mydeposits|deposit protection)\b/i,
    /\b(check.?out report|inventory|schedule of condition|end of tenancy|deductions from deposit)\b/i,
  ], amplify: [/\b(landlord|letting agent|tenancy|rental|rented|tenant)\b/i] },
  // Housing — repairs
  { key: "housing_repairs", any: [
    /\b(disrepair|damp|mould|mold|leak|structural\s+damage|unfit\s+for\s+habitation)\b/i,
    /\b(landlord\s+(?:obligation|responsibility|duty|repair))\b/i,
    /\b(housing\s+(?:condition|standard|health\s+and\s+safety|act))\b/i,
  ], amplify: [/\b(landlord|tenant|tenancy|property|rented|rental)\b/i] },
  { key: "complaint_ombudsman", any: [
    /\b(final response|deadlock letter|refer your complaint|eight weeks|ombudsman)\b/i,
  ], amplify: [/\b(complaint|resolution|escalate|dissatisfied)\b/i] },
  { key: "consumer_rights", any: [
    /\b(subscription|membership|auto.?renew|cancellation fee|early termination)\b/i,
  ] },
  { key: "consumer_rights", any: [
    /\b(refund|faulty|not as described|consumer rights act)\b/i,
  ], amplify: [/\b(purchase|order|product|goods|delivery|shop|store|bought|received|item|customer|consumer)\b/i] },
  { key: "insurance_dispute", any: [
    /\b(insurance|insurer|policy|claim|underwriter|premium)\b/i,
  ], amplify: [/\b(rejected|declined|cancelled|void|repudiate|excess|settlement)\b/i] },
  { key: "employment", any: [
    /\b(employer|employee|disciplinary|grievance|notice period|redundancy|dismissal|tribunal|acas)\b/i,
  ], amplify: [/\b(contract|policy|handbook|hearing|warning|termination of employment)\b/i] },
  { key: "council_tax", any: [
    /\bcouncil tax\b/i,
  ] },
  { key: "hmrc", any: [
    /\bhmrc\b/i,
    /\bhm revenue( & | and )customs\b/i,
  ] },
];

function selectAuthorityLinks(text, classification) {
  if (!text || typeof text !== "string") return null;
  if (classification === "sensitive_immigration" || classification === "benefit_overpayment") return null;
  for (const entry of AUTHORITY_PATTERNS) {
    const anyMatch = entry.any.some(p => p.test(text));
    if (!anyMatch) continue;
    if (entry.exclude && entry.exclude.some(p => p.test(text))) continue;
    if (entry.amplify) {
      const amplified = entry.amplify.some(p => p.test(text));
      if (!amplified) continue;
    }
    return { key: entry.key, links: [] };
  }
  return null;
}

// ── Minimal classifyDocument (core logic only) ──────────────────
const IMMIGRATION_STRONG = [
  /\bvisa\s+has\s+been\s+refus/i, /\bleave\s+to\s+remain\s+curtail/i,
  /\bmust\s+leave\s+the\s+UK\b/i, /\bdeportation\b/i,
  /\bimmigration\s+(?:refusal|decision|enforcement)\b/i,
  /\basylum\s+(?:claim|application|refusal|decision)\b/i,
  /\bno\s+recourse\s+to\s+public\s+funds\b/i,
  /\bhome\s+office\s+(?:refusal|decision|notice|order)\b/i,
];
const IMMIGRATION_SUPPORT = [
  /\bhome\s+office\s+decision\b/i, /\bimmigration\s+decision\b/i,
  /\bappeal\s+deadline\b/i, /\bdecision\s+letter\b/i,
  /\bleave\s+to\s+remain\b/i, /\bbiometric\s+residence\s+permit\b/i,
  /\bbrp\b/i, /\bvisa\s+refusal\b/i, /\bimmigration\s+tribunal\b/i,
];
const BENEFIT_OVERPAYMENT_STRONG = [
  /\b(?:dwp|universal\s+credit|housing\s+benefit)\s+overpayment\b/i,
  /\boverpayment\s+of\s+(?:universal\s+credit|housing\s+benefit|benefits?)\b/i,
  /\b(?:dwp|universal\s+credit|benefits?)\s+(?:fraud|investigation|compliance)\b/i,
  /\bbenefit\s+fraud\b/i,
];
const BENEFIT_OVERPAYMENT_SUPPORT = [
  /\breview\s+of\s+your\s+(?:benefits?|claim|universal\s+credit)\b/i,
  /\bdiscrepancy\s+in\s+your\s+(?:income|earnings|claim|declaration)\b/i,
  /\byou\s+(?:owe|must\s+repay|are\s+required\s+to\s+repay)\b/i,
  /\bdepartment\s+for\s+work\s+and\s+pensions\b/i, /\bdwp\b/i,
];
const EMPLOYMENT_SEVERE_PHRASES = [
  /\btermination\s+of\s+(your\s+)?employment\b/i,
  /\b(you\s+(are|have\s+been)\s+)?(summarily\s+)?dismissed\b/i,
  /\bsettlement\s+agreement\b/i, /\bemployment\s+tribunal\b/i,
  /\bmade\s+redundant\b/i, /\bat\s+risk\s+of\s+redundancy\b/i,
  /\bredundancy\s+(notice|confirmed|payment)\b/i,
  /\btupe\b/i, /\btransfer\s+of\s+undertakings\b/i,
];
const EMPLOYMENT_STRONG = [
  /\b(unfair\s+)?dismissal\b/i, /\btermination\s+of\s+employment\b/i,
  /\bredundancy\s+(?:notice|consultation|process|selection|pay)\b/i,
  /\bdisciplinary\s+(?:hearing|meeting|procedure|action|process|outcome)\b/i,
  /\bgross\s+misconduct\b/i, /\bformal\s+grievance\b/i,
  /\bemployment\s+tribunal\b/i, /\bflexible\s+working\s+(?:request|application|policy)\b/i,
  /\bprotected\s+characteristic\b/i, /\bequality\s+act\s+2010\b/i,
];
const EMPLOYMENT_SUPPORT = [
  /\bhr\s+(?:department|team|business\s+partner)\b/i, /\bhuman\s+resources\b/i,
  /\bline\s+manager\b/i, /\bnotice\s+period\b/i,
  /\bcontract\s+of\s+employment\b/i, /\bemployment\s+contract\b/i,
  /\bholiday\s+entitlement\b/i, /\bsettlement\s+agreement\b/i,
  /\bsuspension\s+(?:pending|from\s+work|with\s+pay)\b/i,
];
const EMPLOYMENT_CONTEXT = [
  /\bemployer\b/i, /\bemployee\b/i, /\bworkplace\b/i, /\bat\s+work\b/i,
];
const EMPLOYMENT_EXCLUSIONS_STRONG = [
  /\bsection\s+21\b/i, /\bsection\s+8\b/i, /\beviction\s+notice\b/i,
  /\btenancy\s+agreement\b/i, /\blandlord\b/i, /\brent\s+arrears\b/i,
  /\bpenalty\s+charge\s+notice\b/i, /\bparking\s+charge\s+notice\b/i,
  /\binsurance\s+(?:claim|policy|renewal|certificate)\b/i,
  /\bcounty\s+court\s+judgment\b/i, /\bccj\b/i,
  /\bwithout\s+prejudice\b(?!\s+to\b)/i, /\bprotected\s+conversation\b/i,
];
const EMPLOYMENT_EXCLUSIONS_SOFT = [
  /\brent\b/i, /\blandlord\b/i, /\btenant\b/i, /\binsurance\b/i, /\bparking\b/i,
];
const FORMAL_IMMIGRATION = [
  /\bshare\s+code\b/i, /\bprove\s+your\s+status\b/i, /\bright\s+to\s+work\b/i,
  /\bevisa\b/i, /\buk\s+visas\s+and\s+immigration\b/i,
];
const FORMAL_BENEFITS = [
  /\buniversal\s+credit\b/i, /\bchange\s+of\s+circumstances\b/i,
  /\bjobcentre\b/i, /\bpip\b/i, /\bhousing\s+benefit\b/i, /\bdwp\b/i,
];

function countMatches(text, patterns) {
  return patterns.filter(p => p.test(text)).length;
}

function classifyDocument(text) {
  if (!text || typeof text !== "string") {
    return { classification: "standard", route: null, routeEntry: null, confidence: 0, hidePlacement: false };
  }
  const hasStrongImmigration = IMMIGRATION_STRONG.some(p => p.test(text));
  const immigrationSupportCount = countMatches(text, IMMIGRATION_SUPPORT);
  if (hasStrongImmigration || immigrationSupportCount >= 2) {
    return { classification: "sensitive_immigration", confidence: hasStrongImmigration ? 0.95 : 0.75 };
  }
  const hasEmploymentSevere = EMPLOYMENT_SEVERE_PHRASES.some(p => p.test(text));
  const hasStrongOverpayment = BENEFIT_OVERPAYMENT_STRONG.some(p => p.test(text));
  const overpaymentSupportCount = countMatches(text, BENEFIT_OVERPAYMENT_SUPPORT);
  if (!hasEmploymentSevere && (hasStrongOverpayment || overpaymentSupportCount >= 2)) {
    return { classification: "benefit_overpayment", confidence: hasStrongOverpayment ? 0.95 : 0.75 };
  }
  const hasStrongEmployment = EMPLOYMENT_STRONG.some(p => p.test(text));
  const employmentSupportCount = countMatches(text, EMPLOYMENT_SUPPORT);
  const hasEmploymentContext = EMPLOYMENT_CONTEXT.some(p => p.test(text));
  const hasStrongExclusion = EMPLOYMENT_EXCLUSIONS_STRONG.some(p => p.test(text));
  const softExclusionCount = countMatches(text, EMPLOYMENT_EXCLUSIONS_SOFT);
  const softVeto = !hasStrongEmployment && softExclusionCount > employmentSupportCount;
  const employmentQualifies = hasStrongEmployment || employmentSupportCount >= 2 || (employmentSupportCount >= 1 && hasEmploymentContext);
  if (employmentQualifies && !hasStrongExclusion && !softVeto) {
    const hasSeverePhrase = EMPLOYMENT_SEVERE_PHRASES.some(p => p.test(text));
    let employmentSubType = hasSeverePhrase ? "high_stakes" : "informational";
    const isHighStakes = hasSeverePhrase || /\bsettlement\s+agreement\b/i.test(text) || /\bemployment\s+tribunal\b/i.test(text);
    const isProcessTriggering = !isHighStakes && (
      /\bdisciplinary\s+(?:hearing|meeting)\b/i.test(text) ||
      /\bgross\s+misconduct\b/i.test(text) ||
      /\bformal\s+grievance\b/i.test(text) ||
      /\bsuspension\s+(?:pending|from\s+work|with\s+pay)\b/i.test(text) ||
      /\bflexible\s+working\s+(?:request|refusal|decision)\b/i.test(text)
    );
    if (isHighStakes) employmentSubType = "high_stakes";
    else if (isProcessTriggering) employmentSubType = "process";
    return { classification: "employment", employmentSubType, confidence: hasStrongEmployment ? 0.95 : 0.8 };
  }
  const formalImmigrationCount = countMatches(text, FORMAL_IMMIGRATION);
  const formalBenefitsCount = countMatches(text, FORMAL_BENEFITS);
  if (formalImmigrationCount >= 1 || formalBenefitsCount >= 1) {
    return { classification: "formal_process", confidence: 0.8 };
  }
  return { classification: "standard", confidence: 1 };
}

// ── Sponsor selection (simplified) ──────────────────────────────
const SPONSORS = {
  energy: "Octopus Energy", debt: "StepChange", insurance: "Compare the Market",
  parking: "Which?", tenancy: "Shelter", employment_high_stakes: "Slater and Gordon",
  employment_process: "Acas", consumer: "Which?", tax: "TaxAssist Accountants",
  scam: "Action Fraud", international: "Wise", default: "MoneySupermarket",
};

function selectSponsorName(classification, employmentSubType, isMultilingual, authorityKey) {
  if (classification === "scam") return SPONSORS.scam;
  if (isMultilingual) return SPONSORS.international;
  if (classification === "sensitive_immigration" || classification === "benefit_overpayment") return null;
  if (classification === "employment") {
    return employmentSubType === "high_stakes" ? SPONSORS.employment_high_stakes : SPONSORS.employment_process;
  }
  if (authorityKey) {
    const authorityMap = {
      energy_dispute: SPONSORS.energy,
      parking_private: SPONSORS.parking, parking_council: SPONSORS.parking,
      debt_collection: SPONSORS.debt, tenancy_deposit: SPONSORS.tenancy,
      housing_possession: SPONSORS.tenancy, housing_arrears: SPONSORS.tenancy,
      housing_repairs: SPONSORS.tenancy,
      consumer_rights: SPONSORS.consumer,  // FIXED: was consumer_dispute
      insurance_dispute: SPONSORS.insurance,
      council_tax: SPONSORS.tax, hmrc: SPONSORS.tax,
      complaint_ombudsman: SPONSORS.consumer,
    };
    if (authorityMap[authorityKey]) return authorityMap[authorityKey];
  }
  const map = {
    energy: SPONSORS.energy, debt: SPONSORS.debt, insurance: SPONSORS.insurance,
    parking: SPONSORS.parking, tenancy: SPONSORS.tenancy, consumer: SPONSORS.consumer, tax: SPONSORS.tax,
  };
  return map[classification] || SPONSORS.default;
}

// ── DOMAIN_PROMPT_REGISTRY keys (just check existence) ──────────
const DOMAIN_PROMPT_KEYS = new Set([
  "energy_dispute", "parking_private", "parking_council", "debt_collection",
  "tenancy_deposit", "housing_possession", "housing_arrears", "housing_repairs",
  "insurance_dispute", "council_tax", "hmrc",
  "complaint_ombudsman", "consumer_rights",
]);

// ═══════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════
const FIXTURES = [
  {
    id: 1,
    name: "Employment dismissal",
    text: "Dear John, Following the meeting on 15 April 2026, we are writing to confirm that you have been dismissed from your role as Operations Manager with effect from today. Your final salary and any accrued holiday pay will be paid on 30 April. You have the right to appeal this decision within 5 working days by writing to the HR department. Your employer confirms that this is a dismissal on grounds of misconduct.",
    expected: { classification: "employment", subType: "high_stakes", authorityKey: null, sponsor: "Slater and Gordon" },
  },
  {
    id: 2,
    name: "Employment disciplinary hearing",
    text: "Dear Sarah, I am writing to invite you to a disciplinary hearing on 22 April 2026 at 10am. The allegation relates to gross misconduct. You have the right to be accompanied by a colleague or trade union representative. Please confirm your attendance. HR Department.",
    expected: { classification: "employment", subType: "process", authorityKey: "employment", sponsor: "Acas" },
  },
  {
    id: 3,
    name: "Employment pay/holiday",
    text: "Dear employee, This letter confirms your holiday entitlement for the current leave year is 28 days including bank holidays. Your annual leave balance carried forward is 3 days. Please speak to your line manager if you have any questions. HR Department.",
    expected: { classification: "employment", subType: "informational", authorityKey: null, sponsor: "Acas" },
  },
  {
    id: 4,
    name: "Settlement agreement",
    text: "Dear Mr Smith, Further to our recent discussions, please find enclosed a settlement agreement. This is a legally binding document and you are required to obtain independent legal advice before signing. The employer will contribute up to GBP 500 towards your legal fees. Please sign and send back the agreement by 30 April 2026.",
    expected: { classification: "employment", subType: "high_stakes", authorityKey: null, sponsor: "Slater and Gordon" },
  },
  {
    id: 5,
    name: "Immigration refusal",
    text: "Home Office decision. Your visa has been refused. You must leave the UK within 28 days of this notice. You may have the right to appeal this decision. Please read the enclosed notice carefully.",
    expected: { classification: "sensitive_immigration", authorityKey: null, sponsor: null },
  },
  {
    id: 6,
    name: "Benefit overpayment",
    text: "Department for Work and Pensions. We have identified an overpayment of Universal Credit totalling GBP 2,340. This relates to a discrepancy in your declared earnings between March and September 2025. You are required to repay this amount. Please contact us to arrange a repayment plan.",
    expected: { classification: "benefit_overpayment", authorityKey: null, sponsor: null },
  },
  {
    id: 7,
    name: "Right to work check",
    text: "Dear applicant, To complete your onboarding, we need to verify your right to work in the UK. Please provide your share code from the GOV.UK prove your immigration status service. You can generate a share code at gov.uk/prove-right-to-work.",
    expected: { classification: "formal_process", authorityKey: null, sponsor: "MoneySupermarket" },
  },
  {
    id: 8,
    name: "British Gas energy bill dispute",
    text: "Dear Customer, Your British Gas electricity account shows an outstanding balance of GBP 847.23 based on estimated meter readings. The standing charge and unit rate shown on your latest statement reflect your current tariff. We may need to backdate your bill if actual readings differ significantly from estimates.",
    expected: { classification: "standard", authorityKey: "energy_dispute", sponsor: "Octopus Energy", domainPrompt: true },
  },
  {
    id: 9,
    name: "ParkingEye private charge",
    text: "PARKING CHARGE NOTICE. ParkingEye Limited. Your vehicle was observed in breach of the terms and conditions at Morrisons retail park car park on private land. A charge of GBP 100 is payable within 28 days, reduced to GBP 60 if paid within 14 days.",
    expected: { classification: "standard", authorityKey: "parking_private", sponsor: "Which?", domainPrompt: true },
  },
  {
    id: 10,
    name: "Council PCN",
    text: "PENALTY CHARGE NOTICE. London Borough of Camden. A civil enforcement officer observed your vehicle in contravention of the Traffic Management Act 2004. The council has issued this penalty charge notice. You may pay at the discounted rate of GBP 35 within 14 days or make representations.",
    expected: { classification: "standard", authorityKey: "parking_council", sponsor: "Which?", domainPrompt: true },
  },
  {
    id: 11,
    name: "Lowell debt collection",
    text: "Dear Customer, Lowell Financial Ltd. Debt collection notice. We have acquired your outstanding balance of GBP 1,234.56 from the original creditor. This is a final demand before we consider legal action. Please pay within 14 days to avoid a county court claim and potential bailiff enforcement.",
    expected: { classification: "standard", authorityKey: "debt_collection", sponsor: "StepChange", domainPrompt: true },
  },
  {
    id: 12,
    name: "Tenancy deposit dispute",
    text: "Dear Tenant, Following the end of tenancy inspection and check-out report, we are proposing deductions from your tenancy deposit held by the DPS deposit scheme. The landlord has identified damage beyond normal wear and tear. The letting agent has prepared an inventory comparison. Total proposed deductions: GBP 450.",
    expected: { classification: "standard", authorityKey: "tenancy_deposit", sponsor: "Shelter", domainPrompt: true },
  },
  {
    id: 13,
    name: "Insurance claim rejected",
    text: "Dear Policyholder, We regret to inform you that your insurance claim (reference CL-29384) has been declined. Our underwriter has determined that the damage falls under the policy exclusion for wear and tear. The excess on your policy would have been GBP 250. You may wish to contact us to discuss.",
    expected: { classification: "standard", authorityKey: "insurance_dispute", sponsor: "Compare the Market", domainPrompt: true },
  },
  {
    id: 14,
    name: "Consumer faulty goods refund",
    text: "Dear Customer, Thank you for your email regarding the faulty washing machine. We have inspected the unit and found signs of use. We are unable to offer a refund at this time. The product is not as described in your complaint. You may wish to arrange an independent engineer inspection at your own cost.",
    expected: { classification: "standard", authorityKey: "consumer_rights", sponsor: "Which?", domainPrompt: true },
  },
  {
    id: 15,
    name: "HMRC self-assessment",
    text: "HM Revenue and Customs. HMRC Self-Assessment. Dear Taxpayer, Our records show that your self-assessment filing for the year 2024-25 is overdue. A penalty of GBP 100 has been applied. Please file immediately through your HMRC online account.",
    expected: { classification: "standard", authorityKey: "hmrc", sponsor: "TaxAssist Accountants", domainPrompt: true },
  },
  {
    id: 16,
    name: "Council tax bill",
    text: "Council Tax bill 2026/27. Your property is in council tax band D. The total amount payable for 2026/27 is GBP 2,145.00. A single person discount of 25% has not been applied. If you live alone, please contact us to apply the discount.",
    expected: { classification: "standard", authorityKey: "council_tax", sponsor: "TaxAssist Accountants", domainPrompt: true },
  },
  {
    id: 17,
    name: "Ombudsman deadlock letter",
    text: "Dear Customer, This is our final response to your complaint. We have investigated your concerns and are unable to offer further resolution. If you remain dissatisfied, you may refer your complaint to the Financial Ombudsman Service within six months of this letter. We must inform you that eight weeks have passed since your original complaint.",
    expected: { classification: "standard", authorityKey: "complaint_ombudsman", sponsor: "Which?", domainPrompt: true },
  },
  {
    id: 18,
    name: "Generic letter (no domain)",
    text: "Dear Sir or Madam, Thank you for your recent enquiry. We have noted your comments and will be in touch in due course. Kind regards, Customer Service Team.",
    expected: { classification: "standard", authorityKey: null, sponsor: "MoneySupermarket", domainPrompt: false },
  },
  {
    id: 19,
    name: "Subscription auto-renew",
    text: "Dear Member, Your subscription to Premium Plus will auto-renew on 1 May 2026. The annual membership fee of GBP 79.99 will be charged to your card on file. If you wish to cancel, please do so before the renewal date to avoid the cancellation fee.",
    expected: { classification: "standard", authorityKey: "consumer_rights", sponsor: "Which?", domainPrompt: true },
  },

  // ── ADVERSARIAL / AMBIGUITY FIXTURES ────────────────────────────
  {
    id: "A1",
    name: "Employment + discrimination (should be employment)",
    text: "Dear Ms Khan, Following your formal grievance about workplace discrimination, we are writing to invite you to a grievance hearing. The equality act 2010 protects individuals with a protected characteristic. Your employer takes these matters seriously. Please attend on 28 April at 2pm.",
    expected: { classification: "employment", authorityKey: "employment", sponsor: "Acas" },
  },
  {
    id: "A2",
    name: "Tenancy vs employment exclusion (should be tenancy, not employment)",
    text: "Dear Tenant, Your landlord has given notice under section 21 of the Housing Act. You have a notice period of two months. The tenancy agreement requires you to leave the premises in good condition. A check-out report and inventory inspection will be arranged.",
    expected: { classification: "standard", authorityKey: "housing_possession", sponsor: "Shelter" },
  },
  {
    id: "A3",
    name: "Employment salary overpayment (should NOT be benefit_overpayment)",
    text: "Dear Mr Jones, Following your redundancy on 1 March 2026, we have identified that you were overpaid by GBP 1,200 in your final month. You are required to repay this amount. This relates to your termination of employment and final salary calculation. Your settlement agreement covers the remaining terms.",
    expected: { classification: "employment", subType: "high_stakes", sponsor: "Slater and Gordon" },
  },

  // ── HOUSING DOMAIN FIXTURES ────────────────────────────────────
  {
    id: "H1",
    name: "Section 21 possession notice",
    text: "Dear Tenant, I am writing to give you formal notice under Section 21 of the Housing Act 1988 that I require possession of the property at 14 Elm Street. Your tenancy started 1 September 2024. You are currently in rent arrears totalling two months. You are required to vacate the property by 30 June 2026. If you do not leave by this date, I will apply to the County Court for a possession order. Yours sincerely, Mr J Harrison, Landlord.",
    expected: { classification: "standard", authorityKey: "housing_possession", sponsor: "Shelter", domainPrompt: true },
  },
  {
    id: "H2",
    name: "Section 8 eviction notice",
    text: "Notice seeking possession of a property let on an assured tenancy. Section 8 Housing Act 1988. The landlord intends to apply to the court for an order for possession on ground 8 (rent arrears). The tenant is required to leave the property. Notice served by ABC Lettings on behalf of the landlord.",
    expected: { classification: "standard", authorityKey: "housing_possession", sponsor: "Shelter", domainPrompt: true },
  },
  {
    id: "H3",
    name: "Rent arrears letter (no possession)",
    text: "Dear Tenant, We are writing to inform you that your rent account is in arrears. The overdue rent totals GBP 1,440 representing two months of unpaid rent at GBP 720 per month. Please contact us immediately to discuss a repayment plan. We hope to resolve this without further action. Your landlord, Mr Smith.",
    expected: { classification: "standard", authorityKey: "housing_arrears", sponsor: "Shelter", domainPrompt: true },
  },
  {
    id: "H4",
    name: "Housing disrepair complaint",
    text: "Dear Landlord, I am writing about the damp and mould in the bedroom of my rented property at 22 Oak Lane. The leak from the roof has been reported three times. The property is unfit for habitation in its current condition. I am requesting that you carry out the necessary repairs within 14 days. Yours faithfully, Tenant.",
    expected: { classification: "standard", authorityKey: "housing_repairs", sponsor: "Shelter", domainPrompt: true },
  },
  {
    id: "E1",
    name: "Unknown energy supplier (Northridge-style) with arrears",
    text: "Dear Mr Harper, We are writing regarding your domestic electricity and gas account, which is currently in arrears in the sum of GBP 1,284.67. Your account includes estimated readings between December 2025 and February 2026. If the outstanding balance is not addressed within 14 days, we may take steps including installation of a prepayment meter or referral to a debt recovery agency. Please provide up-to-date meter readings or request a meter inspection. Northridge Energy Supply Ltd.",
    expected: { classification: "standard", authorityKey: "energy_dispute", sponsor: "Octopus Energy", domainPrompt: true },
  },
];

// ═══════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════
let passed = 0;
let failed = 0;
const failures = [];

for (const fixture of FIXTURES) {
  const docClass = classifyDocument(fixture.text);
  const authorityResult = selectAuthorityLinks(fixture.text, docClass.classification);
  const authorityKey = authorityResult?.key || null;
  const sponsor = selectSponsorName(
    docClass.classification,
    docClass.employmentSubType || null,
    false,
    authorityKey
  );
  const hasDomainPrompt = authorityKey ? DOMAIN_PROMPT_KEYS.has(authorityKey) : false;

  const errors = [];
  const exp = fixture.expected;

  if (docClass.classification !== exp.classification) {
    errors.push(`  Classification: got "${docClass.classification}", expected "${exp.classification}"`);
  }
  if (exp.subType && docClass.employmentSubType !== exp.subType) {
    errors.push(`  SubType: got "${docClass.employmentSubType}", expected "${exp.subType}"`);
  }
  if (exp.authorityKey !== undefined && authorityKey !== exp.authorityKey) {
    errors.push(`  Authority key: got "${authorityKey}", expected "${exp.authorityKey}"`);
  }
  if (exp.sponsor !== undefined && sponsor !== exp.sponsor) {
    errors.push(`  Sponsor: got "${sponsor}", expected "${exp.sponsor}"`);
  }
  if (exp.domainPrompt !== undefined && hasDomainPrompt !== exp.domainPrompt) {
    errors.push(`  Domain prompt: got ${hasDomainPrompt}, expected ${exp.domainPrompt}`);
  }

  if (errors.length === 0) {
    passed++;
    console.log(`  PASS  #${fixture.id} ${fixture.name}`);
  } else {
    failed++;
    console.log(`  FAIL  #${fixture.id} ${fixture.name}`);
    errors.forEach(e => console.log(e));
    failures.push({ id: fixture.id, name: fixture.name, errors });
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${FIXTURES.length} fixtures`);
if (failures.length > 0) {
  console.log(`\nFailed fixtures:`);
  failures.forEach(f => {
    console.log(`  #${f.id} ${f.name}`);
    f.errors.forEach(e => console.log(`    ${e.trim()}`));
  });
}
console.log("=".repeat(60));
process.exit(failed > 0 ? 1 : 0);
