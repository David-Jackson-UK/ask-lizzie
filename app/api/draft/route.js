// ─── Draft Email Generation Endpoint ─────────────────────────────
// Generates three complaint/refund email variants from complaintContext.
// Separate from /api/analyse to keep analysis fast and focused.

const DRAFT_SYSTEM_PROMPT = `You are Lizzie. You are a smart, thoughtful friend helping someone write a clear, composed message about a consumer issue.

You are not a lawyer. You do not give legal advice. You never reference laws, rights, or legal frameworks. You help people sound calm, credible, and confident using natural, everyday language.

Your goal is to produce a message that feels like a capable, thoughtful person wrote it — not a template, not a legal letter, not a complaints form.

═══════════════════════════════════════════════
ABSOLUTE RULES — NO EXCEPTIONS
═══════════════════════════════════════════════

NEVER include:
- Laws, statutes, regulations, or legal frameworks of any kind (e.g. Consumer Rights Act, Sale of Goods Act, GDPR, Trading Standards, Financial Conduct Authority)
- Legal terminology: "entitled", "liable", "breach", "statutory", "legal rights", "consumer rights", "in law", "legally obliged", "under the terms of", "under consumer law"
- Guaranteed outcomes: "you must", "you are required to", "you have no choice", "this means you owe me"
- Threats: "I will take this further", "I will pursue", "I will report you to", "ombudsman", "regulator", "Trading Standards"
- Aggressive, confrontational, or demanding language of any kind
- Formal complaint template language: "I hereby", "I write to formally", "I formally request"

ALWAYS include:
- Natural, everyday English — the kind a calm, composed person would actually write
- Soft, clear framing: "it would help to understand", "I'd appreciate", "before deciding how to proceed", "I'm keen to understand this"
- UK English and British spelling
- Short sentences. One idea per sentence. No em dashes.

═══════════════════════════════════════════════
REASONING MODEL (internal — shapes output, never shown)
═══════════════════════════════════════════════

Before writing, think through:

1. Timing: did this happen soon after purchase or use? If so, mention it naturally. "Stopped working quite soon after purchase" is more persuasive than any legal argument.

2. Normal use: was the item used normally? If the context suggests it was, frame this simply. "Only been used normally" is clear and reasonable.

3. Clarity gaps: what has the other party actually said? Is their explanation specific? If not, asking for clarity is the most sensible first step and the most powerful.

4. Financial risk: if the user is being asked to pay for something (inspection, repair, fee), note that understanding the basis first is reasonable before committing.

5. Resolution path: what does the user actually want? Refund, replacement, explanation, removal of a charge? Frame the request around this specifically.

These five lenses shape the language naturally. They must not appear as analysis or structure in the output.

═══════════════════════════════════════════════
SPEECH-FIRST WRITING RULE (applies to all variants)
═══════════════════════════════════════════════

Every sentence must sound natural when read aloud. Before finalising each variant, read it aloud mentally. If any phrase sounds like it was written rather than spoken, rewrite it.

Banned written-form phrases:
- "I am writing to formally..." → use "I'm getting in touch about..."
- "Before proceeding, I would be grateful..." → use "Before I take this any further, I need to understand..."
- "Please be advised that..." → just say it
- "I wish to draw your attention to..." → use "I want to flag..."
- "I would appreciate your earliest response" → use "I'd like to hear back within 14 days"
- "I hereby..." → cut entirely, just state the action

═══════════════════════════════════════════════
THREE TONE MODES
Genuinely distinct in tone, firmness, and length.
═══════════════════════════════════════════════

Variant 1 — "Friendly"
- Warm, polite, assumes the organisation wants to help
- Opens positively, explains the situation simply
- Asks for resolution or clarification as a reasonable request
- Suitable for a first message, or where the relationship matters
- Uses phrases like: "I wondered if", "it would be really helpful", "I'd appreciate any clarity"
- Length: moderate — enough to tell the story, not so much it overwhelms

Variant 2 — "Firm"
- Clear and composed, not aggressive
- Gently challenges their position or asks them to reconsider
- Uses phrases like: "before committing to this", "I'd like to understand a bit more", "given how quickly this developed"
- Asks for a response within a reasonable time (14 days) without stating it as a demand
- Subtly uses timing, normal use, and clarity gaps where relevant
- Length: similar to Variant 1, slightly more pointed

Variant 3 — "Direct"
- 2-3 sentences only, clear and to the point
- States the issue, states what is wanted, asks for a response
- No preamble, no padding
- Suitable for online forms, live chat, or short replies
- Still calm — directness is not aggression

═══════════════════════════════════════════════
STRUCTURE
═══════════════════════════════════════════════

For Variants 1 and 2:
- Subject line (concise, references the document/order if available)
- Opening: acknowledge their response if there is one, or state why you are writing. One sentence.
- Situation: briefly restate what happened in natural language. Weave in timing ("stopped working quite soon after purchase") or normal use ("used it in a normal way") where relevant.
- Ask: either request clarification or gently push back. Frame as a reasonable next step, not a demand. Use "before deciding how to proceed" or "once I have a clearer picture" to close the loop.
- Closing: signal willingness to resolve, remain constructive. "I look forward to hearing from you."
- [YOUR NAME]

For Variant 3:
- Subject line
- One short paragraph only. No separate sections.

═══════════════════════════════════════════════
BENCHMARK — ALL OUTPUT MUST MATCH THIS STANDARD
═══════════════════════════════════════════════

This is the level every variant should reach:

Subject: Re: Order UBP-55291

Dear HomeTech Customer Support,

Thank you for your response.

Before arranging an engineer visit, it would really help to understand a bit more about what you've identified so far. In particular, I'd appreciate any detail on what "signs of use" you're referring to, and what fault you believe may be present.

The machine stopped working relatively soon after purchase and has only been used normally, so I'm keen to understand this before committing to an inspection.

Once I have a clearer picture, I'll be better placed to decide how to proceed.

I look forward to hearing from you.

Kind regards,
[Name]

Note what this example does well:
- Sounds like a real person, not a template
- Uses timing naturally ("relatively soon after purchase")
- Uses normal use naturally ("only been used normally")
- Asks for clarity before committing, not a legal outcome
- Signals constructive intent throughout
- Contains no legal language whatsoever

Every variant must match this standard of naturalness.

═══════════════════════════════════════════════
FACTS AND PLACEHOLDERS
═══════════════════════════════════════════════

- Use only facts from the context provided. Do not invent amounts, dates, product names, or order numbers.
- Where information is missing, use a placeholder: [DATE], [ORDER NUMBER], [PRODUCT NAME], [AMOUNT], [YOUR NAME]
- Only use placeholders where genuinely needed. Do not over-populate.

═══════════════════════════════════════════════
QUALITY CHECK — BEFORE RESPONDING
═══════════════════════════════════════════════

Ask yourself before writing:
- Does this sound like a real person wrote it, or does it sound like a template?
- Does any variant contain a law, legal term, or rights language? If yes, remove it entirely.
- Does any variant contain a threat or guarantee? If yes, rewrite it.
- Is Variant 3 genuinely short (2-3 sentences)?
- Are the three variants clearly different from each other in tone and length?
- Does the output reach the benchmark standard above?

If the answer to any of these is no, revise before responding.

═══════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════

Respond ONLY with valid JSON. No markdown. No backticks. No preamble.

{
  "variants": [
    {
      "label": "Keep things friendly",
      "subject": "Subject line here",
      "body": "Full message body here"
    },
    {
      "label": "Push back a little",
      "subject": "Subject line here",
      "body": "Full message body here"
    },
    {
      "label": "Be more direct",
      "subject": "Subject line here",
      "body": "Short message body here"
    }
  ]
}`;

// ─── Prohibited language filter ───────────────────────────────────
// Post-processing safety net. Catches anything that slips through the prompt.
const PROHIBITED_PATTERNS = [
  // Laws and statutes
  [/\bConsumer Rights Act\b/gi, "consumer protection rules"],
  [/\bSale of Goods Act\b/gi, "standard consumer expectations"],
  [/\bSupply of Goods and Services Act\b/gi, "standard expectations"],
  [/\bGDPR\b/gi, "data protection rules"],
  [/\bTrading Standards\b/gi, "the relevant authority"],
  [/\bFinancial Ombudsman\b/gi, "the relevant body"],
  [/\bOmbudsman\b/gi, "the relevant body"],
  [/\bFinancial Conduct Authority\b/gi, "the relevant body"],
  [/\bFCA\b/g, "the relevant authority"],
  // Legal terms
  [/\bentitled to\b/gi, "hoping for"],
  [/\byou are entitled\b/gi, "I would appreciate"],
  [/\bI am entitled\b/gi, "I would like"],
  [/\blegally entitled\b/gi, "reasonably expecting"],
  [/\bstatutory rights?\b/gi, "my position"],
  [/\bin breach\b/gi, "not as I would have expected"],
  [/\bbreach of\b/gi, "a problem with"],
  [/\bliable\b/gi, "responsible"],
  [/\bliability\b/gi, "responsibility"],
  [/\blegal obligation\b/gi, "obligation"],
  [/\blegally obliged\b/gi, "expected"],
  [/\bunder the law\b/gi, "in my view"],
  [/\bin law\b/gi, "in practice"],
  [/\bconsumer rights\b/gi, "my position as a customer"],
  [/\byour legal\b/gi, "your"],
  [/\bmy legal\b/gi, "my"],
  [/\bunder consumer law\b/gi, "in my view"],
  [/\bconsumer law\b/gi, "my position"],
  [/\bI hereby\b/gi, "I am writing to"],
  [/\bI write to formally\b/gi, "I am writing to"],
  [/\bI formally\b/gi, "I am writing to"],
  // Threats and escalation
  [/\bI will take (?:this|the matter|it) further\b/gi, "I may need to consider my options"],
  [/\bI will pursue\b/gi, "I would like to resolve"],
  [/\bfurther action\b/gi, "the next steps"],
  [/\bI will report\b/gi, "I may need to contact"],
  [/\bescalate (?:this|the matter)\b/gi, "take this further"],
  [/\bformal complaint\b/gi, "a complaint"],
];

// Ensure label names are always the correct human-friendly versions
// (catches if model uses old names or variations)
const LABEL_MAP = {
  // Legacy names from previous versions — normalise to current labels
  "keep things friendly": "Friendly",
  "calm and cooperative": "Friendly",
  "standard": "Friendly",
  "push back a little": "Firm",
  "firm but reasonable": "Firm",
  "firmer": "Firm",
  "be more direct": "Direct",
  "brief and to the point": "Direct",
  "brief": "Direct",
  "short": "Direct",
  "escalation-ready": "Direct",
};

function normaliseLabel(label) {
  if (!label) return label;
  const key = label.toLowerCase().trim();
  return LABEL_MAP[key] || label;
}

function filterProhibited(text) {
  if (!text) return text;
  let out = text;
  for (const [pattern, replacement] of PROHIBITED_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function filterVariants(variants) {
  if (!Array.isArray(variants)) return variants;
  return variants.map(v => ({
    ...v,
    label: normaliseLabel(v.label),
    subject: filterProhibited(v.subject),
    body: filterProhibited(v.body),
  }));
}

function getClientIP(request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Simple per-IP rate limit: max 10 draft calls per hour
const draftRateStore = new Map();
function checkDraftRate(ip) {
  const now = Date.now();
  const windowMs = 3600000;
  const maxReqs = 10;
  if (!draftRateStore.has(ip)) draftRateStore.set(ip, []);
  const calls = draftRateStore.get(ip).filter(ts => now - ts < windowMs);
  if (calls.length >= maxReqs) return false;
  calls.push(now);
  draftRateStore.set(ip, calls);
  return true;
}

// Mirror of the bot-blocking check in the analyse route.
// Prevents automated tools from hitting the draft endpoint directly.
function isSuspiciousUA(ua) {
  if (!ua) return true;
  return /curl|wget|python-requests|go-http|scrapy|libwww|okhttp|java\/|node-fetch|axios\/[0-9]/i.test(ua);
}

export async function POST(request) {
  const ip = getClientIP(request);
  const contentType = request.headers.get("content-type") || "";
  const ua = request.headers.get("user-agent") || "";

  if (!contentType.includes("application/json")) {
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }

  if (isSuspiciousUA(ua)) {
    return Response.json({ error: "Lizzie is a bit busy right now. Please try again shortly." }, { status: 429 });
  }

  if (!checkDraftRate(ip)) {
    return Response.json({ error: "Lizzie is a bit busy right now. Please try again shortly." }, { status: 429 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Something went wrong. Please try again." }, { status: 400 }); }

  const { mode, complaintContext, documentRequestContext, replyTo, reference, todayFormatted } = body;

  // ── Mode: document request draft ─────────────────────────────────
  // Generates three calm, neutral variants requesting a specific document
  // from the other party. Does not require complaintContext.
  if (mode === "documentRequest") {
    if (!documentRequestContext?.detected) {
      return Response.json({ error: "No document request context provided." }, { status: 400 });
    }

    const drLines = [
      `Document being requested: ${documentRequestContext.documentType}`,
      `Purpose: ${documentRequestContext.requestPurpose || "to understand the full picture before responding"}`,
    ];
    if (documentRequestContext.keyFacts?.length > 0) {
      drLines.push(`Key facts:\n${documentRequestContext.keyFacts.map(f => `- ${f}`).join("\n")}`);
    }
    if (replyTo) drLines.push(`Recipient: ${replyTo}`);
    if (reference) drLines.push(`Reference/account number: ${reference}`);
    if (todayFormatted) drLines.push(`Today's date: ${todayFormatted}`);

    const drSystemPrompt = `You are Lizzie. You help people send calm, clear document request emails.

Generate three variants of an email requesting a specific document from a company or organisation.

ABSOLUTE RULES:
- Calm, neutral, non-confrontational throughout
- Never admit liability, fault, or accept a debt
- Never use legal language, threats, or formal complaint language
- UK English, short sentences, natural spoken rhythm
- No em dashes
- Ask for the document clearly and specifically
- Where appropriate, ask that no further action be taken while the review is ongoing
- Sign off with [YOUR NAME]

THREE VARIANTS:
Variant 1 — "Friendly": warm, assumes good faith, polite request
Variant 2 — "Firm": clear, direct request, slightly more pointed
Variant 3 — "Direct": 2-3 sentences only, states the request plainly

OUTPUT: Respond with ONLY valid JSON, no markdown, no backticks:
{
  "variants": [
    { "label": "Friendly", "subject": "Subject line", "body": "Full email body" },
    { "label": "Firm", "subject": "Subject line", "body": "Full email body" },
    { "label": "Direct", "subject": "Subject line", "body": "2-3 sentence body" }
  ]
}`;

    const drMessage = `Please generate three email variants requesting this document:\n\n${drLines.join("\n")}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          metadata: { user_id: "anonymous" },
          max_tokens: 900,   // 3 short document request emails — 900 is ample
          temperature: 0.3,
          system: drSystemPrompt,
          messages: [{ role: "user", content: drMessage }],
        }),
      });

      if (!response.ok) {
        const d = await response.json().catch(() => null);
        return Response.json({ error: d?.error?.message || `Error ${response.status}` }, { status: response.status });
      }

      const data = await response.json();
      const raw = (data.content || []).map(b => b.type === "text" ? b.text : "").join("");
      const stripped = raw.replace(/```json|```/g, "").trim();
      const match = stripped.match(/\{[\s\S]*\}/);
      if (!match) return Response.json({ error: "Something went wrong. Please try again." }, { status: 422 });

      let result;
      try { result = JSON.parse(match[0]); }
      catch { return Response.json({ error: "Something went wrong. Please try again." }, { status: 422 }); }

      if (!result.variants || !Array.isArray(result.variants)) {
        return Response.json({ error: "Something went wrong. Please try again." }, { status: 422 });
      }

      result.variants = filterVariants(result.variants);
      return Response.json({ ...result, draftMode: "documentRequest" });

    } catch (err) {
      console.error("[draft] Document request error:", err?.name || "UnknownError");
      return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  }

  // ── Mode: complaint reply draft (default) ─────────────────────────
  if (!complaintContext || !complaintContext.detected) {
    return Response.json({ error: "No complaint context provided." }, { status: 400 });
  }

  // Build a concise prompt from the complaint context
  const contextLines = [
    `Issue type: ${complaintContext.issueType || "consumer complaint"}`,
    `Suggested resolution: ${complaintContext.suggestedResolution || "resolution of the issue"}`,
  ];
  if (complaintContext.keyFacts && complaintContext.keyFacts.length > 0) {
    contextLines.push(`Key facts from the document:\n${complaintContext.keyFacts.map(f => `- ${f}`).join("\n")}`);
  }
  if (replyTo) contextLines.push(`Recipient: ${replyTo}`);
  if (reference) contextLines.push(`Reference/account number: ${reference}`);
  if (todayFormatted) contextLines.push(`Today's date: ${todayFormatted}`);

  const userMessage = `Please generate three email variants for this consumer issue:\n\n${contextLines.join("\n")}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        metadata: { user_id: "anonymous" },
        max_tokens: 1100,  // 3 complaint variants with subject lines — 1100 comfortable
        temperature: 0.4,
        system: DRAFT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const d = await response.json().catch(() => null);
      return Response.json({ error: d?.error?.message || `Error ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const raw = (data.content || []).map(b => b.type === "text" ? b.text : "").join("");
    const stripped = raw.replace(/```json|```/g, "").trim();
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return Response.json({ error: "Something went wrong. Please try again." }, { status: 422 });

    let result;
    try { result = JSON.parse(match[0]); }
    catch { return Response.json({ error: "Something went wrong. Please try again." }, { status: 422 }); }

    if (!result.variants || !Array.isArray(result.variants)) {
      return Response.json({ error: "Something went wrong. Please try again." }, { status: 422 });
    }

    result.variants = filterVariants(result.variants);
    return Response.json(result);

  } catch (err) {
    // PRIVACY: log type only, never request body
    console.error("[draft] Server error:", err?.name || "UnknownError");
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
