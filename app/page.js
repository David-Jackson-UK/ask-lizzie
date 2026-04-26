"use client";
import { useState, useRef, useCallback, useEffect, Component } from "react";

// ─── Response ID + UTM helpers ────────────────────────────────────
// response_id is a short anonymous correlation token attached to a
// single results view. It is used to join feedback events with the
// response they relate to, without transmitting any content. Lives
// only in memory on the client. Never sent to the server.
function newResponseId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through */ }
  return "r_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Append UTM parameters to sponsor URLs so downstream attribution
// knows the click came from Lizzie. Never overwrites an existing
// parameter of the same name. Returns the original URL unchanged
// on any failure — click-through must never be broken by tracking.
function decorateUrl(url, params) {
  if (!url || typeof url !== "string") return url;
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params || {})) {
      if (v == null || v === "") continue;
      if (!u.searchParams.has(k)) u.searchParams.set(k, String(v));
    }
    return u.toString();
  } catch {
    return url;
  }
}

// ─── Design System — Ask Lizzie April 2026 ────────────────────
const V = {
  // Ground
  bg:        "#FFFFFF",  // default page and card surface
  paper:     "#FAFAFA",  // warm card surface, reference layer background
  card:      "#FFFFFF",  // card surface (alias)
  surface2:  "#F2F2F7",  // spec rows, key figures, input backgrounds
  // Typography
  ink:       "#1A1A1A",  // all body copy, headings, core UI text
  inkM:      "#1A1A1A",  // body text (was #3A3A3C, updated for consistency)
  inkL:      "#6E6E73",  // subheadings, captions, metadata, footer
  inkF:      "#6E6E73",  // captions, placeholders
  sub:       "#6E6E73",  // alias for sub text
  // Accent
  red:       "#D70015",  // primary CTA, active states, labels
  redDk:     "#A5000F",  // hover/pressed state
  // Borders
  hairline:  "#C6C6C8",  // card borders, dividers — 0.5px
  rule:      "#EAEAEA",  // section dividers — 1px full-bleed
  // Functional — retained for classification + multilingual UI
  moss:      "#3E4B42",
  mossFaint: "#F0F3F1",
  amber:     "#FFFBEB",
  amberBdr:  "#E8C97A",
  amberTxt:  "#7A5500",
  warm:      "#C4956A",
  warmBg:    "#FDF6EF",
  ok:        "#4A7A5A",
  // Aliases expected by unchanged code paths
  parchment: "#FAFAFA",
  borderSoft:"#C6C6C8",
};

// Typography — Playfair Display (serif) + Inter (sans)
const SF = "'Playfair Display',Georgia,serif";   // editorial headlines, big picture
const BF = "Inter,Arial,sans-serif";              // UI, body, labels

// Shadow — minimal, used only on floating cards
const sh = "0 1px 3px rgba(26,26,26,0.04), 0 8px 32px -4px rgba(26,26,26,0.08)";

// Buttons
const bb = {
  fontFamily: BF, fontWeight: 600, border: "none",
  borderRadius: 4,  // design system: --radius-button: 4px
  cursor: "pointer",
  transition: "all 0.15s ease",
  display: "flex", alignItems: "center", justifyContent: "center",
  gap: 8, width: "100%", boxSizing: "border-box",
  fontSize: "0.93rem", letterSpacing: "0",
};
// Primary — Apple News Red
const bm = { ...bb, background: V.red, color: "#FFFFFF", padding: "15px 24px" };
// Secondary — outlined, text only feel
const bg = {
  ...bb, background: "transparent", color: V.red,
  padding: "13px 20px",
  border: `0.5px solid ${V.hairline}`,
  color: V.inkM,
};

// ─── Wordmark — single reusable component ────────────────────────
// Two treatments only:
//   dark=false (default): "Ask" #1A1A1A + "Lizzie" #D70015 — for white backgrounds
//   dark=true: "Ask" #FFFFFF + "Lizzie" #D70015 — for dark backgrounds
function Wordmark({ size = 16, dark = false }) {
  return (
    <span style={{
      fontFamily: SF, fontWeight: 700, fontSize: size,
      letterSpacing: "-0.01em", lineHeight: 1,
    }}>
      <span style={{ color: dark ? "#FFFFFF" : V.ink }}>Ask </span>
      <span style={{ color: V.red }}>Lizzie</span>
    </span>
  );
}

// ─── App Square — single reusable component ──────────────────────
// Brand marker for loading/breathing states and landing page icon.
// Red background with white wordmark when breathing (loading state).
// White background with standard wordmark when static.
// Never uses grey background. Never shows "L".
function AppSquare({ s = 72, breathing = false }) {
  const fs = Math.max(s * 0.19, 10);
  return (
    <div style={{
      width: s, height: s, borderRadius: s * 0.22,
      background: breathing ? V.red : V.bg,
      border: breathing ? "none" : `0.5px solid ${V.hairline}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: SF, fontSize: fs, fontWeight: 700,
      animation: breathing ? "breathe 2.8s ease-in-out infinite" : "none",
      flexShrink: 0,
      letterSpacing: "-0.01em",
      lineHeight: 1,
    }}>
      <span style={{ color: breathing ? "#fff" : V.ink }}>Ask </span>
      <span style={{ color: breathing ? "#fff" : V.red }}>Lizzie</span>
    </div>
  );
}
const Mono = AppSquare;

// ─── Icons ───────────────────────────────────────────────────────
function CamIc() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }
function TypeIc() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>; }
function BackIc() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>; }
function ShieldIc() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function LockIc() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function AlertIc() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={V.warm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function ScamIc() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={V.amberTxt} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function SendIc() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }
function ExtIc() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
function VoiceIc() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>; }
function PlusIc() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function PenIc() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>; }
function CopyIc() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>; }
function LinkIc() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function AskIc() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={V.moss} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function DocIc() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.moss} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function ShredIc() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={V.moss} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="4" y1="14" x2="20" y2="14" strokeDasharray="2 2"/></svg>; }

// ─── Utilities ───────────────────────────────────────────────────
function scrubPII(t) { if (!t) return t; let r = t; r = r.replace(/\b(\d[ \-]?){12,18}\d\b/g, m => "**** **** **** " + m.replace(/\D/g, "").slice(-4)); r = r.replace(/\b[A-Za-z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Da-d]\b/g, m => "NI: **** **" + m.replace(/\s/g, "").slice(-3, -1)); r = r.replace(/\b\d{2}[\s\-]\d{2}[\s\-]\d{2}\b/g, "**-**-**"); return r; }
const SAFE = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_PDF_BYTES = 5 * 1024 * 1024;   // 5MB
const MAX_TEXT_CHARS = 10000;

async function processFile(f) {
  const isPdf = f.type === "application/pdf" || f.name?.toLowerCase().endsWith(".pdf");
  const maxBytes = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (f.size > maxBytes) {
    const label = isPdf ? "5MB" : "10MB";
    throw new Error(`This file is too large for Lizzie to read. Please try a smaller file (under ${label}).`);
  }
  if (isPdf) { const u = await rd(f); return { base64: u.split(",")[1], mediaType: "application/pdf" }; }
  const u = await rd(f); try { const img = await li(u); let w = img.width, h = img.height; const M = 1400; if (w > M || h > M) { const r = Math.min(M / w, M / h); w = Math.round(w * r); h = Math.round(h * r); } const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); return { base64: c.toDataURL("image/jpeg", 0.8).split(",")[1], mediaType: "image/jpeg" }; } catch { const b = u.split(",")[1]; const raw = u.match(/data:([^;]+);/)?.[1] || "image/jpeg"; return { base64: b, mediaType: SAFE.has(raw) ? raw : "image/jpeg" }; }
}
function rd(f) { return new Promise((r, j) => { const x = new FileReader(); x.onload = () => r(x.result); x.onerror = () => j(new Error("Read failed")); x.readAsDataURL(f); }); }
function li(s) { return new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error("Failed")); i.src = s; }); }
// ─── FeedbackRow — structured, consent-gated feedback ─────────────
// Emits a GA4 event with structured context (response_id,
// classification, employment_subtype, timestamp) so feedback can be
// joined to the response type that generated it. Content is NEVER
// sent — only the note length and the signal. Fires only when
// analytics consent has been granted.
function FeedbackRow({ responseId, classification, employmentSubType }) {
  const [state, setState] = useState("idle"); // idle | asking | thanked
  const [why, setWhy] = useState("");

  const baseParams = {
    response_id: responseId || null,
    classification: classification || "standard",
    employment_subtype: employmentSubType || null,
    timestamp: Date.now(),
  };

  const submitPositive = () => {
    fireEvent("feedback", { ...baseParams, signal: "positive" });
    setState("thanked");
  };
  const openNegative = () => setState("asking");
  const submitNegative = () => {
    fireEvent("feedback", {
      ...baseParams,
      signal: "negative",
      // Truncate severely so no personal content can be exfiltrated via the note
      note_length: why.length,
    });
    setState("thanked");
  };

  if (state === "thanked") {
    return (
      <div style={{ textAlign: "center", padding: "14px 16px", margin: "8px 0 0" }}>
        <p style={{ margin: 0, fontFamily: BF, fontSize: "0.82rem", color: V.moss, fontWeight: 600 }}>
          Thank you. Every signal helps Lizzie get better.
        </p>
      </div>
    );
  }

  if (state === "asking") {
    return (
      <div style={{
        background: V.surface2, borderRadius: 12, padding: "14px 16px",
        margin: "8px 0 0", border: `0.5px solid ${V.hairline}`,
      }}>
        <p style={{ margin: "0 0 8px", fontSize: "0.8rem", fontWeight: 700, color: V.ink }}>What went wrong?</p>
        <input
          type="text"
          value={why}
          onChange={e => setWhy(e.target.value.slice(0, 140))}
          placeholder="One short line is enough (optional)"
          style={{
            width: "100%", border: `0.5px solid ${V.hairline}`, borderRadius: 8,
            padding: "10px 12px", fontSize: "0.85rem", fontFamily: BF,
            color: V.ink, background: V.card, outline: "none", boxSizing: "border-box",
            marginBottom: 10,
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setState("idle")} style={{
            ...bb, flex: "1 1 auto", background: "transparent",
            border: `0.5px solid ${V.hairline}`, color: V.inkL,
            padding: "10px 14px", fontSize: "0.8rem", fontWeight: 600,
          }}>Cancel</button>
          <button onClick={submitNegative} style={{
            ...bb, flex: "1 1 auto", background: V.ink, color: "#fff",
            padding: "10px 14px", fontSize: "0.8rem", fontWeight: 700,
          }}>Send</button>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "0.68rem", color: V.inkL, lineHeight: 1.6 }}>
          Your note is not stored. We only record that feedback was sent.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "8px 0 0" }}>
      <p style={{ margin: 0, fontSize: "0.78rem", color: V.inkL, fontWeight: 500 }}>Was this helpful?</p>
      <button onClick={submitPositive} style={{
        fontFamily: BF, background: "transparent", border: `0.5px solid ${V.hairline}`,
        borderRadius: 8, padding: "6px 12px", cursor: "pointer",
        fontSize: "0.78rem", color: V.inkM, fontWeight: 600,
      }}>Yes</button>
      <button onClick={openNegative} style={{
        fontFamily: BF, background: "transparent", border: `0.5px solid ${V.hairline}`,
        borderRadius: 8, padding: "6px 12px", cursor: "pointer",
        fontSize: "0.78rem", color: V.inkM, fontWeight: 600,
      }}>Not quite</button>
    </div>
  );
}

// ─── Progressive status for the working screen ────────────────────
// Cycles through warm, human progress statements so the load doesn't
// feel static. Each message is true to what the backend is doing.
function ProgressiveStatus() {
  const steps = [
    "Lizzie is reading",
    "Working out what this is about",
    "Checking if anything's urgent",
    "Thinking about what matters",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => Math.min(x + 1, steps.length - 1)), 2200);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <>
      <h1 style={{ fontFamily: SF, fontSize: "1.25rem", fontWeight: 800, margin: "24px 0 8px", color: V.ink, letterSpacing: "-0.03em", minHeight: "1.6em", transition: "opacity 0.3s ease" }} key={i}>
        {steps[i]}<Dots />
      </h1>
      <p style={{ fontSize: "0.85rem", color: V.inkL, fontWeight: 400 }}>This usually takes a few seconds</p>
    </>
  );
}

function Dots() { const [d, setD] = useState(0); useEffect(() => { const t = setInterval(() => setD(x => (x + 1) % 4), 500); return () => clearInterval(t); }, []); return <span style={{ display: "inline-block", width: 20, textAlign: "left" }}>{"...".slice(0, d)}</span>; }

// ─── Transition overlay — "Lizzie's had a look" moment ───────────
function ResultsTransition({ onDone }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 400); }, 1200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: V.card,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.4s ease",
      pointerEvents: visible ? "all" : "none",
    }}>
      <Mono s={56} />
      <p style={{
        fontFamily: SF, fontSize: "1.1rem", fontWeight: 700,
        color: V.ink, margin: "20px 0 8px", letterSpacing: "-0.02em",
        animation: "fadeUp 0.5s ease both",
      }}>Lizzie's had a look.</p>
      <p style={{
        fontFamily: BF, fontSize: "0.88rem", color: V.inkL,
        margin: 0, fontWeight: 400,
        animation: "fadeUp 0.5s ease 0.15s both",
      }}>Here's what she found.</p>
    </div>
  );
}
// ─── Analytics — consent-gated ────────────────────────────────────
// fireEvent is a no-op unless consent has been explicitly granted and
// gtag.js has been loaded. This preserves the privacy-first posture:
// no events leave the device without explicit opt-in.
function fireEvent(name, params) {
  if (typeof window === "undefined") return;
  if (!window.__lizzieAnalyticsEnabled) return;
  if (!window.gtag) return;
  try { window.gtag("event", name, params); } catch { /* never block UI */ }
}

// ─── Consent state helpers ────────────────────────────────────────
// Persisted in localStorage so the user isn't re-prompted every visit.
// Values: "granted" | "denied" | null (undecided).
const CONSENT_KEY = "lizzie_consent_v1";

function readConsent() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(CONSENT_KEY); } catch { return null; }
}
function writeConsent(value) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(CONSENT_KEY, value); } catch { /* ignore */ }
}
function clearConsent() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(CONSENT_KEY); } catch { /* ignore */ }
}

// Load gtag.js on demand, only after consent is granted.
function loadAnalyticsScript() {
  if (typeof window === "undefined") return;
  if (window.__lizzieGtagLoaded) return;
  window.__lizzieGtagLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=G-0ECBFR0SNC";
  document.head.appendChild(s);
  // Flip Consent Mode flags to granted
  if (window.gtag) {
    window.gtag("consent", "update", {
      analytics_storage: "granted",
    });
    window.gtag("js", new Date());
    window.gtag("config", "G-0ECBFR0SNC", { anonymize_ip: true });
  }
  window.__lizzieAnalyticsEnabled = true;
}

function revokeAnalytics() {
  if (typeof window === "undefined") return;
  window.__lizzieAnalyticsEnabled = false;
  if (window.gtag) {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
    });
  }
  // Clear any GA cookies already set
  try {
    document.cookie.split(";").forEach(c => {
      const name = c.split("=")[0].trim();
      if (name.startsWith("_ga")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      }
    });
  } catch { /* ignore */ }
}

// ═════════════════════════════════════════════════════════════════
// AD REGISTRY
// Each entry is keyed by BCP-47 language code (or "default").
// To add a new language deal: add one entry below.
// ═════════════════════════════════════════════════════════════════
// CATEGORY SPONSOR REGISTRY
// Slot 1 (CPM banner) — language-matched, shown on every result.
// Slot 2 (CPA card)   — classification-matched, highest-intent placement.
//
// Slot 2 (CPA) is rendered FIRST because it is higher-value and more
// contextually useful. Slot 1 (CPM) follows as a supplementary placement.
//
// Slot 2 entries: keyed by document classification from classifyDocument().
// Each entry has: partner, headline, subtext, cta, url
// The card copy is written to feel like a Lizzie recommendation, not an ad.
//
// Non-English sessions: Slot 1 is overridden with an international money
// transfer brand (Wise) when detectedLanguage indicates a non-English browser.
// ═════════════════════════════════════════════════════════════════

// ── Slot 2: Category-specific CPA sponsors ────────────────────────
// Keyed by classification string returned by classifyDocument().
// Falls back to DEFAULT_FALLBACK_SPONSOR when no match found.
const CATEGORY_SPONSOR_REGISTRY = {

  energy: {
    partner:  "Octopus Energy",
    headline: "Lizzie suggests: check if you're on the right tariff",
    subtext:  "Octopus Energy is the UK's most trusted supplier — and over 60% of homes would pay less switching to them.",
    cta:      "See what Octopus offers",
    url:      "https://octopus.energy",
  },

  parking: {
    partner:  "Which?",
    headline: "Lizzie suggests: know your rights before you pay",
    subtext:  "Which? explains exactly what private parking companies can and cannot enforce — and how to challenge a charge.",
    cta:      "Read Which? guidance",
    url:      "https://www.which.co.uk/consumer-rights/advice/private-parking-charges",
  },

  tenancy: {
    partner:  "Shelter",
    headline: "Lizzie suggests: get free housing advice",
    subtext:  "Shelter is the UK's leading housing charity. If you have a dispute with your landlord, their advisers can help.",
    cta:      "Get advice from Shelter",
    url:      "https://www.shelter.org.uk",
  },

  debt: {
    partner:  "StepChange",
    headline: "Lizzie suggests: get free debt advice",
    subtext:  "StepChange is the UK's largest debt charity — free, confidential, and no judgment. Over 5 million people helped last year.",
    cta:      "Talk to StepChange for free",
    url:      "https://www.stepchange.org",
  },

  insurance: {
    partner:  "Compare the Market",
    headline: "Lizzie suggests: check what you're paying for cover",
    subtext:  "Compare the Market checks prices from over 100 insurers in minutes. It may be worth seeing what else is available.",
    cta:      "Compare insurance",
    url:      "https://www.comparethemarket.com",
  },

  employment: {
    partner:  "Slater and Gordon",
    headline: "Lizzie suggests: speak to an employment solicitor",
    subtext:  "Slater and Gordon offer a fixed-fee initial employment consultation for £150. No obligation — just clear guidance on your position.",
    cta:      "Book a consultation",
    url:      "https://www.slatergordon.co.uk/employment-law-solicitors/",
  },

  subscription: {
    partner:  "Which?",
    headline: "Lizzie suggests: get consumer rights support",
    subtext:  "Which? members get expert consumer rights guidance and access to their legal team. From £10.75 per month.",
    cta:      "Join Which?",
    url:      "https://www.which.co.uk",
  },

  hmrc: {
    partner:  "TaxAssist Accountants",
    headline: "Lizzie suggests: talk to a local tax specialist",
    subtext:  "TaxAssist has over 400 offices across the UK and offers a free initial consultation on HMRC letters and tax disputes.",
    cta:      "Find a local accountant",
    url:      "https://www.taxassist.co.uk",
  },

  council_tax: {
    partner:  "Citizens Advice",
    headline: "Lizzie suggests: get free council tax advice",
    subtext:  "Citizens Advice explains your options on council tax arrears, liability orders, and what to do if bailiffs are mentioned.",
    cta:      "Get advice",
    url:      "https://www.citizensadvice.org.uk/debt-and-money/council-tax-debt/",
  },

  scam: {
    partner:  "Action Fraud",
    headline: "Report this to Action Fraud",
    subtext:  "Action Fraud is the UK's national reporting centre for fraud and cybercrime. Reporting takes minutes and is completely free.",
    cta:      "Report to Action Fraud",
    url:      "https://www.actionfraud.police.uk",
  },

  // ── Default (standard / unmatched) ───────────────────────────
  standard: {
    partner:  "MoneySupermarket",
    headline: "Lizzie suggests: see if you could pay less",
    subtext:  "MoneySupermarket compares thousands of deals on energy, insurance, broadband and more — it takes about two minutes.",
    cta:      "Compare and save",
    url:      "https://www.moneysupermarket.com",
  },
};

// ── Slot 1: CPM display banner registry ───────────────────────────
// Language-matched for non-English sessions. English default: MoneySupermarket.
// Non-English sessions override to international money transfer brands.
const AD_REGISTRY = {
  default: {
    partner:        "MoneySupermarket",
    headline:       "Could you be paying less?",
    subtext:        "Compare thousands of deals on energy, insurance, broadband and more.",
    cta:            "Compare now",
    url:            "https://www.moneysupermarket.com",
    sponsoredLabel: "Sponsored",
  },

  // Non-English languages → Wise (international money transfer)
  // Covers Polish, Romanian, Urdu, Bengali, Arabic, Spanish, French,
  // Portuguese, Mandarin, Punjabi, Somali, Hindi — all key Lizzie languages.
  pl: { partner: "Wise", headline: "Wyślij pieniądze do domu z Wise", subtext: "Kurs średni rynkowy. Bez ukrytych opłat. Przelew w minutach.", cta: "Wyślij z Wise", url: "https://wise.com/gb/", sponsoredLabel: "Sponsorowane" },
  ro: { partner: "Wise", headline: "Trimite bani acasă cu Wise", subtext: "Cursul valutar real. Fără comisioane ascunse. Transfer în minute.", cta: "Trimite cu Wise", url: "https://wise.com/gb/", sponsoredLabel: "Sponsorizat" },
  es: { partner: "Wise", headline: "Envía dinero a casa con Wise", subtext: "El tipo de cambio real. Sin comisiones ocultas. Transferencia en minutos.", cta: "Enviar con Wise", url: "https://wise.com/gb/", sponsoredLabel: "Patrocinado" },
  fr: { partner: "Wise", headline: "Envoyez de l'argent chez vous avec Wise", subtext: "Le vrai taux de change. Pas de frais cachés. Virement en quelques minutes.", cta: "Envoyer avec Wise", url: "https://wise.com/gb/", sponsoredLabel: "Sponsorisé" },
  de: { partner: "Wise", headline: "Senden Sie Geld nach Hause mit Wise", subtext: "Der faire Wechselkurs. Keine versteckten Gebühren. Überweisung in Minuten.", cta: "Mit Wise senden", url: "https://wise.com/gb/", sponsoredLabel: "Gesponsert" },
  pt: { partner: "Wise", headline: "Envie dinheiro para casa com a Wise", subtext: "A taxa de câmbio real. Sem taxas ocultas. Transferência em minutos.", cta: "Enviar com Wise", url: "https://wise.com/gb/", sponsoredLabel: "Patrocinado" },
  ar: { partner: "Wise", headline: "أرسل الأموال إلى المنزل مع Wise", subtext: "سعر الصرف الحقيقي. بدون رسوم خفية. تحويل في دقائق.", cta: "أرسل مع Wise", url: "https://wise.com/gb/", sponsoredLabel: "برعاية" },
  ur: { partner: "Wise", headline: "Wise کے ساتھ گھر پیسے بھیجیں", subtext: "حقیقی ایکسچینج ریٹ۔ کوئی پوشیدہ فیس نہیں۔ منٹوں میں ٹرانسفر۔", cta: "Wise سے بھیجیں", url: "https://wise.com/gb/", sponsoredLabel: "اشتہار" },
  hi: { partner: "Wise", headline: "Wise के साथ घर पैसे भेजें", subtext: "असली विनिमय दर। कोई छुपी फीस नहीं। मिनटों में ट्रांसफर।", cta: "Wise से भेजें", url: "https://wise.com/gb/", sponsoredLabel: "प्रायोजित" },
  bn: { partner: "Wise", headline: "Wise দিয়ে বাড়িতে টাকা পাঠান", subtext: "প্রকৃত বিনিময় হার। কোনো লুকানো ফি নেই। মিনিটে ট্রান্সফার।", cta: "Wise দিয়ে পাঠান", url: "https://wise.com/gb/", sponsoredLabel: "স্পনসর্ড" },
  zh: { partner: "Wise", headline: "用 Wise 汇款回家", subtext: "真实汇率。无隐藏费用。几分钟内完成转账。", cta: "用 Wise 汇款", url: "https://wise.com/gb/", sponsoredLabel: "赞助" },
  pa: { partner: "Wise", headline: "Wise ਨਾਲ ਘਰ ਪੈਸੇ ਭੇਜੋ", subtext: "ਅਸਲ ਵਟਾਂਦਰਾ ਦਰ। ਕੋਈ ਲੁਕੇ ਖਰਚੇ ਨਹੀਂ। ਮਿੰਟਾਂ ਵਿੱਚ ਟ੍ਰਾਂਸਫਰ।", cta: "Wise ਨਾਲ ਭੇਜੋ", url: "https://wise.com/gb/", sponsoredLabel: "ਸਪਾਂਸਰਡ" },
  so: { partner: "Wise", headline: "Xawaaladda guriga ku dir Wise", subtext: "Kursiga xaqiiqda ah. Lacag qarsoon ma jirto. Wareejin daqiiqadaha.", cta: "Dir Wise", url: "https://wise.com/gb/", sponsoredLabel: "La maaliyay" },
};

// ═════════════════════════════════════════════════════════════════
// SUPPORT REGISTRY
// Shown instead of ads in sensitive scenarios.
// Keyed by docClassification value.
// To add a new sensitive category: add one entry below.
// Fields: type, partner, headline, subtext, cta, url, label
//   type   — always "support" (distinguishes from ad entries)
//   label  — shown where ads show "Sponsored"; always "Support"
//   partner — not translated (proper name)
//   url     — not translated
// ═════════════════════════════════════════════════════════════════
const SUPPORT_REGISTRY = {
  sensitive_immigration: {
    type:    "support",
    partner: "Migrant Help",
    headline: "Get help with your immigration situation",
    subtext:  "Independent support for people navigating UK immigration processes.",
    cta:      "Contact Migrant Help",
    url:      "https://www.migranthelpuk.org/",
    label:    "Support",
  },
  benefit_overpayment: {
    type:    "support",
    partner: "Citizens Advice",
    headline: "Get help understanding this request",
    subtext:  "Free, independent support for benefits and repayment issues.",
    cta:      "Speak to Citizens Advice",
    url:      "https://www.citizensadvice.org.uk/",
    label:    "Support",
  },
  // Add further sensitive categories here as needed.
  // Extendable without touching any other logic.
};

// ═════════════════════════════════════════════════════════════════
// SUPPORT TRANSLATIONS
// Provides localised copy for support card headline, subtext, and CTA.
// Partner names and URLs are NEVER translated — always shown as-is.
// Language codes match LANG_NAMES keys and the BCP-47 base codes used
// throughout the language system.
// ═════════════════════════════════════════════════════════════════
const SUPPORT_TRANSLATIONS = {
  sensitive_immigration: {
    pl: { headline: "Uzyskaj pomoc w swojej sprawie imigracyjnej",     subtext: "Niezależne wsparcie dla osób poruszających się w procesach imigracyjnych w Wielkiej Brytanii.", cta: "Skontaktuj się z Migrant Help" },
    es: { headline: "Obtén ayuda con tu situación migratoria",          subtext: "Apoyo independiente para personas que navegan procesos de inmigración en el Reino Unido.",         cta: "Contactar con Migrant Help" },
    fr: { headline: "Obtenez de l'aide pour votre situation migratoire", subtext: "Soutien indépendant pour les personnes naviguant dans les procédures d'immigration au Royaume-Uni.", cta: "Contacter Migrant Help" },
    de: { headline: "Holen Sie sich Hilfe zu Ihrer Einwanderungssituation", subtext: "Unabhängige Unterstützung für Menschen, die britische Einwanderungsverfahren durchlaufen.",   cta: "Migrant Help kontaktieren" },
    ro: { headline: "Obțineți ajutor pentru situația dumneavoastră de imigrare", subtext: "Sprijin independent pentru persoanele care navighează procesele de imigrare din Marea Britanie.", cta: "Contactați Migrant Help" },
    pt: { headline: "Obtenha ajuda com a sua situação de imigração",    subtext: "Apoio independente para pessoas que navegam nos processos de imigração no Reino Unido.",          cta: "Contactar Migrant Help" },
    ar: { headline: "احصل على مساعدة في وضعك المتعلق بالهجرة",        subtext: "دعم مستقل للأشخاص الذين يتعاملون مع إجراءات الهجرة في المملكة المتحدة.",                       cta: "تواصل مع Migrant Help" },
    ur: { headline: "اپنی امیگریشن صورتحال میں مدد حاصل کریں",        subtext: "برطانیہ میں امیگریشن کے عمل سے گزرنے والے افراد کے لیے آزاد مدد۔",                              cta: "Migrant Help سے رابطہ کریں" },
    hi: { headline: "अपनी आव्रजन स्थिति में सहायता प्राप्त करें",     subtext: "यूके के आव्रजन प्रक्रियाओं से गुजरने वाले लोगों के लिए स्वतंत्र सहायता।",                    cta: "Migrant Help से संपर्क करें" },
    zh: { headline: "获取移民情况方面的帮助",                            subtext: "为在英国处理移民程序的人士提供独立支持。",                                                            cta: "联系 Migrant Help" },
    bn: { headline: "আপনার ইমিগ্রেশন পরিস্থিতিতে সাহায্য পান",       subtext: "যুক্তরাজ্যে ইমিগ্রেশন প্রক্রিয়ার মধ্য দিয়ে যাওয়া মানুষদের জন্য স্বাধীন সহায়তা।",          cta: "Migrant Help-এর সাথে যোগাযোগ করুন" },
    so: { headline: "Hel caawimaad xaaladaada socdaalka ah",            subtext: "Taageero madax-banaan oo loogu talagalay dadka u gudba habaabyada socdaalka ee UK.",                cta: "La xiriir Migrant Help" },
  },
  benefit_overpayment: {
    pl: { headline: "Uzyskaj pomoc w zrozumieniu tej kwestii",          subtext: "Bezpłatne, niezależne wsparcie w sprawach zasiłków i zwrotów nadpłat.",                            cta: "Porozmawiaj z Citizens Advice" },
    es: { headline: "Obtén ayuda para entender esta solicitud",          subtext: "Apoyo gratuito e independiente para problemas de prestaciones y pagos en exceso.",                   cta: "Habla con Citizens Advice" },
    fr: { headline: "Obtenez de l'aide pour comprendre cette demande",  subtext: "Soutien gratuit et indépendant pour les questions de prestations et de trop-perçus.",               cta: "Parler à Citizens Advice" },
    de: { headline: "Holen Sie sich Hilfe beim Verständnis dieses Antrags", subtext: "Kostenlose, unabhängige Unterstützung bei Leistungs- und Rückzahlungsfragen.",                  cta: "Mit Citizens Advice sprechen" },
    ro: { headline: "Obțineți ajutor pentru a înțelege această solicitare", subtext: "Sprijin gratuit și independent pentru probleme legate de prestații și plăți în exces.",          cta: "Discutați cu Citizens Advice" },
    pt: { headline: "Obtenha ajuda para perceber este pedido",           subtext: "Apoio gratuito e independente para questões de prestações e pagamentos em excesso.",                 cta: "Fale com o Citizens Advice" },
    ar: { headline: "احصل على مساعدة في فهم هذا الطلب",               subtext: "دعم مجاني ومستقل لمشكلات المزايا والمبالغ المُسترجعة.",                                            cta: "تحدث مع Citizens Advice" },
    ur: { headline: "اس درخواست کو سمجھنے میں مدد حاصل کریں",        subtext: "فوائد اور واپسی کے مسائل کے لیے مفت، آزاد مدد۔",                                                    cta: "Citizens Advice سے بات کریں" },
    hi: { headline: "इस अनुरोध को समझने में सहायता प्राप्त करें",    subtext: "लाभ और अधिक भुगतान के मुद्दों के लिए निःशुल्क, स्वतंत्र सहायता।",                             cta: "Citizens Advice से बात करें" },
    zh: { headline: "获取帮助以了解此请求",                              subtext: "针对福利和超额付款问题的免费独立支持。",                                                              cta: "联系 Citizens Advice" },
    bn: { headline: "এই অনুরোধটি বুঝতে সাহায্য পান",                  subtext: "সুবিধা এবং অতিরিক্ত পরিশোধের সমস্যার জন্য বিনামূল্যে, স্বাধীন সহায়তা।",                     cta: "Citizens Advice-এর সাথে কথা বলুন" },
    so: { headline: "Hel caawimaad si aad u fahanto codsigan",          subtext: "Taageero bilaash ah, madax-banaan oo loogu talagalay arrimaha faa'iidooyinka iyo lacagaha dib-u-celinta.", cta: "La hadal Citizens Advice" },
  },
};

/**
 * selectPlacement — Slot 1 (CPM banner) selector.
 * Returns a support card for sensitive classifications, or a language-matched
 * CPM banner ad for everything else. Non-English browsers get Wise.
 */
function selectPlacement(classification, langCode) {
  if (classification && SUPPORT_REGISTRY[classification]) {
    const base = SUPPORT_REGISTRY[classification];
    const langBase = langCode && langCode !== "en" ? langCode.toLowerCase().split("-")[0] : null;
    const t = langBase && SUPPORT_TRANSLATIONS[classification]?.[langBase];
    return {
      ...base,
      headline: t?.headline || base.headline,
      subtext:  t?.subtext  || base.subtext,
      cta:      t?.cta      || base.cta,
      type: "support",
    };
  }
  if (!langCode) return { ...AD_REGISTRY.default, type: "ad", langMatch: false };
  const base = langCode.toLowerCase().split("-")[0];
  if (AD_REGISTRY[base]) return { ...AD_REGISTRY[base], type: "ad", langMatch: true };
  return { ...AD_REGISTRY.default, type: "ad", langMatch: false };
}

/**
 * selectCPASponsor — Slot 2 (CPA card) selector.
 * Routes to the highest-value contextually matched sponsor by document
 * classification. Falls back to MoneySupermarket for unmatched types.
 * Returns a placement object compatible with CommercialSupportCard.
 */
function selectCPASponsor(classification) {
  // Normalise employment sub-types — all route to the employment sponsor
  const key = classification === "formal_process" ? "standard"
             : classification || "standard";
  const entry = CATEGORY_SPONSOR_REGISTRY[key] || CATEGORY_SPONSOR_REGISTRY.standard;
  return {
    sponsor_tier:     "TIER_1",
    sponsor_name:     entry.partner,
    sponsor_category: key,
    deep_link:        entry.url,
    display_text:     entry.subtext,
    // Pass through headline and cta for CommercialSupportCard to use
    _headline:        entry.headline,
    _cta:             entry.cta,
  };
}

// Keep selectAd for backwards compatibility with handleCompare
function selectAd(langCode) {
  if (!langCode) return { ...AD_REGISTRY.default, langMatch: false };
  const base = langCode.toLowerCase().split("-")[0];
  if (AD_REGISTRY[base]) return { ...AD_REGISTRY[base], langMatch: true };
  return { ...AD_REGISTRY.default, langMatch: false };
}

// ─── Ad analytics ─────────────────────────────────────────────────
function fireAdImpression(ad, userLang) {
  fireEvent("ad_impression", {
    ad_partner:        ad.partner,
    placement:         "post-analysis",
    user_language:     userLang || "en",
    ad_language_match: ad.langMatch,
    timestamp:         Date.now(),
  });
}
function fireAdClick(ad, userLang) {
  fireEvent("ad_click", {
    ad_partner:      ad.partner,
    destination_url: ad.url,
    user_language:   userLang || "en",
    ad_language_match: ad.langMatch,
    timestamp:       Date.now(),
  });
}

// ─── Support analytics ────────────────────────────────────────────
function fireSupportImpression(entry, classification, userLang) {
  fireEvent("support_impression", {
    partner:        entry.partner,
    classification: classification || "unknown",
    user_language:  userLang || "en",
    timestamp:      Date.now(),
  });
}
function fireSupportClick(entry, classification, userLang) {
  fireEvent("support_click", {
    partner:        entry.partner,
    classification: classification || "unknown",
    user_language:  userLang || "en",
    timestamp:      Date.now(),
  });
}

// ─── Banner — unified ad component for both ad slots ──────────────
// Single shared component used for both the primary ad slot (language-
// matched from AD_REGISTRY) and the secondary contextual sponsor slot.
// Identical in typography, padding, border radius, spacing, and CTA
// placement. Design language: restrained, premium, Apple-like.
//
// Visual treatment:
//   - Light neutral tint (surface2) — subtle prominence without noise
//   - Hairline border — consistent with Lizzie's card system
//   - Soft shadow matching other cards
//   - Small "Sponsored" label in tertiary ink
//   - Title in SF serif, body in BF sans, arrow-right CTA
//
// Props:
//   label:     small uppercase kicker (e.g. "Sponsored")
//   title:     bold headline
//   body:      supporting sentence
//   cta:       CTA button text
//   url:       target URL — UTM-decorated before window.open
//   slot:      "primary" | "secondary" — used for UTM content tag
//   campaign:  document classification for UTM campaign tag
//   onClick:   optional analytics hook (impression + click)
//   onImpression: fired once on mount
function Banner({ label, title, body, cta, url, slot, campaign, onClick, onImpression }) {
  const lastClick = useRef(0);
  const impressed = useRef(false);

  useEffect(() => {
    if (!impressed.current) {
      impressed.current = true;
      if (onImpression) onImpression();
    }
  }, [onImpression]);

  function handleClick(e) {
    const now = Date.now();
    if (now - lastClick.current < 2000) { e.preventDefault(); return; }
    lastClick.current = now;
    try { if (onClick) onClick(); } catch { /* never block navigation */ }
    const decorated = decorateUrl(url, {
      utm_source:   "lizzie",
      utm_medium:   "banner",
      utm_campaign: campaign || "standard",
      utm_content:  slot || "primary",
    });
    window.open(decorated, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{
      background: "none",
      borderRadius: 0,
      border: "none",
      padding: 0,
    }}>
      {label && (
        <p style={{
          margin: "0 0 6px",
          fontFamily: BF, fontSize: 10, fontWeight: 700,
          color: V.sub, textTransform: "uppercase", letterSpacing: "0.14em",
        }}>{label}</p>
      )}
      <p style={{
        margin: "0 0 4px",
        fontFamily: BF, fontSize: 15, fontWeight: 700,
        color: V.ink, lineHeight: 1.3,
      }}>{title}</p>
      {body && (
        <p style={{
          margin: "0 0 12px",
          fontFamily: BF, fontSize: 13, lineHeight: 1.55,
          color: V.sub, fontWeight: 400,
        }}>{body}</p>
      )}
      <button
        onClick={handleClick}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: BF, fontSize: 13, fontWeight: 600,
          color: V.ink,
          background: "none",
          border: `1px solid ${V.hairline}`,
          borderRadius: 4,
          padding: "9px 14px",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
        }}
      >
        {cta}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>
  );
}

// ─── AdBanner — backwards-compatible shim forwarding to Banner ────
// Kept as a thin wrapper so any call sites using the legacy API keep
// working. All new styling flows through Banner above.
function AdBanner({ ad, userLang, onImpression, slot, campaign }) {
  return (
    <Banner
      label={ad.sponsoredLabel || "Sponsored"}
      title={ad.headline}
      body={ad.subtext}
      cta={ad.cta}
      url={ad.url}
      slot={slot || "primary"}
      campaign={campaign || "standard"}
      onClick={() => fireAdClick(ad, userLang)}
      onImpression={onImpression}
    />
  );
}

// ─── SupportCard — calm, non-promotional, rendered in the same slot ─
// Visually distinct from AdBanner: softer background, outlined button,
// "Support" label rather than "Sponsored", no commercial framing.
// Multilingual: headline, subtext, cta are translated by the server when
// responseLang is set; partner name and url are never translated.
function SupportCard({ entry, classification, userLang, onImpression }) {
  const lastClick = useRef(0);
  const impressed = useRef(false);

  useEffect(() => {
    if (!impressed.current) {
      impressed.current = true;
      if (onImpression) onImpression();
    }
  }, [onImpression]);

  function handleClick(e) {
    const now = Date.now();
    if (now - lastClick.current < 2000) { e.preventDefault(); return; }
    lastClick.current = now;
    fireSupportClick(entry, classification, userLang);
    window.open(entry.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{
      background: V.paper, borderRadius: 6, padding: "18px 20px",
      border: `0.5px solid ${V.hairline}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.13em", color: V.sub }}>{entry.label}</p>
          <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: V.ink, fontFamily: BF }}>{entry.headline}</p>
          <p style={{ margin: 0, fontSize: 12, color: V.sub, lineHeight: 1.5 }}>{entry.subtext}</p>
        </div>
        <button onClick={handleClick} style={{
          fontFamily: BF, fontWeight: 600, fontSize: 13,
          background: "transparent", color: V.ink,
          border: `1px solid ${V.hairline}`, borderRadius: 4,
          padding: "9px 14px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          transition: "border-color 0.15s ease",
        }}>
          {entry.cta}
        </button>
      </div>
    </div>
  );
}

// ─── Commercial Support Card ─────────────────────────────────────
// Driven by the Commercial Routing Engine sponsor object:
//   { sponsor_tier, sponsor_name, sponsor_category, deep_link, display_text }
//
// Tier-based rendering:
//   TIER_1 — highly specific title derived from category
//   TIER_2 — broader contextual framing
//   TIER_3 — neutral fallback wording
//
// Design principle: this is a support layer that happens to be commercial.
// No badges, no urgency, no marketing language. Tone must match Lizzie.

// ── Fallback sponsor ──────────────────────────────────────────────
// Always rendered when the routing engine returns no payload, or when
// the payload fails validation. Ensures commercial coverage in all
// non-suppressed scenarios. Update deep_link to the most appropriate
// product-level URL when category-specific landing pages are agreed.
// Bills comparison is the most broadly relevant generic destination
// for Ask Lizzie users — covers energy, broadband, insurance, phone.
const DEFAULT_FALLBACK_SPONSOR = {
  sponsor_tier:     "TIER_3",
  sponsor_name:     "MoneySuperMarket",
  sponsor_category: "general_comparison",
  deep_link:        "https://www.moneysupermarket.com/bills/",
  display_text:     "A simple way to sense-check what you're currently paying is to compare available options.",
};

// ── Suppression list ──────────────────────────────────────────────
// Commercial content is suppressed ONLY for the classifications named here.
// This list is intentionally narrow. Every entry must have a documented reason.
// Do not add classifications speculatively — only suppress where there is a
// clear ethical, legal, or product trust reason to do so.
const COMMERCIAL_SUPPRESSED_CLASSIFICATIONS = new Set([
  "sensitive_immigration",  // Legal proceedings risk; user vulnerability high; support card shown instead
  "benefit_overpayment",    // DWP/compliance context; commercial promotion inappropriate; support card shown instead
]);

// ── Category → title map (TIER_1) ────────────────────────────────
const SPONSOR_TITLES = {
  broadband:    "Compare broadband options",
  energy:       "Check your energy costs",
  insurance:    "Review your cover options",
  mortgage:     "Explore your mortgage options",
  credit:       "Understand your credit options",
  loans:        "Compare personal loan options",
  savings:      "Check available savings rates",
  utilities:    "Compare your utility costs",
  mobile:       "Compare mobile phone plans",
  travel:       "Check your travel insurance",
};

// ── CTA labels — calm, advisory, never transactional ─────────────
const SPONSOR_CTAS = {
  TIER_1: "Compare options",
  TIER_2: "See your options",
  TIER_3: "Check available deals",
};

/**
 * normaliseSponsor — validate and clean a raw sponsor payload.
 *
 * Accepts the raw object from the routing engine (or null/undefined).
 * Normalises category to lowercase + trimmed.
 * Falls back to DEFAULT_FALLBACK_SPONSOR when any required field is missing.
 * Always returns a clean, renderable object — never null.
 *
 * Required fields: sponsor_name, sponsor_category, deep_link, display_text.
 * sponsor_tier defaults to TIER_3 if absent.
 */
function normaliseSponsor(raw) {
  const hasRequiredFields =
    raw &&
    typeof raw.sponsor_name === "string" && raw.sponsor_name.trim() &&
    typeof raw.deep_link    === "string" && raw.deep_link.trim() &&
    typeof raw.display_text === "string" && raw.display_text.trim();

  const base = hasRequiredFields ? raw : DEFAULT_FALLBACK_SPONSOR;

  return {
    sponsor_tier:     base.sponsor_tier || "TIER_3",
    sponsor_name:     base.sponsor_name.trim(),
    sponsor_category: (base.sponsor_category || "general_comparison").toLowerCase().trim(),
    deep_link:        base.deep_link.trim(),
    display_text:     base.display_text.trim(),
    // Accept both "headline"/"cta" (server categorySponsor entries)
    // and "_headline"/"_cta" (client selectCPASponsor entries).
    // Server entries use headline/cta; client registry uses _headline/_cta.
    _headline:        base._headline || base.headline || null,
    _cta:             base._cta     || base.cta      || null,
  };
}

/**
 * deriveSponsorPlacement — convert a normalised sponsor into an internal
 * placement entry compatible with the existing selectPlacement shape.
 * Input must already be normalised by normaliseSponsor — never called raw.
 */
function deriveSponsorPlacement(sponsor) {
  const cat  = sponsor.sponsor_category;
  const tier = sponsor.sponsor_tier;

  // If the sponsor was selected by selectCPASponsor, it carries _headline and
  // _cta directly from CATEGORY_SPONSOR_REGISTRY — use those verbatim.
  // This ensures the copy feels like a Lizzie recommendation, not generic filler.
  let title = sponsor._headline || "Explore your options";
  if (!sponsor._headline) {
    if (tier === "TIER_1") {
      const matched = Object.keys(SPONSOR_TITLES).find(k => cat.includes(k));
      title = matched ? SPONSOR_TITLES[matched] : "Explore your options";
    } else if (tier === "TIER_2") {
      title = cat && cat !== "general_comparison"
        ? `Compare your ${cat.replace(/_/g, " ")} options`
        : "Explore available options";
    }
  }

  return {
    type:             "sponsor",
    partner:          sponsor.sponsor_name,
    sponsor_tier:     tier,
    sponsor_category: sponsor.sponsor_category,
    headline:         title,
    subtext:          sponsor.display_text,
    cta:              sponsor._cta || SPONSOR_CTAS[tier] || SPONSOR_CTAS.TIER_3,
    url:              sponsor.deep_link,
  };
}

function CommercialSupportCard({ sponsor, userLang, onImpression, campaign }) {
  const placement = deriveSponsorPlacement(normaliseSponsor(sponsor));

  return (
    <div style={{ padding: "14px 20px", borderBottom: `1px solid ${V.rule}` }}>
      <div style={{
        background: V.paper, border: `0.5px solid ${V.hairline}`,
        borderRadius: 6, padding: "18px 20px",
      }}>
      <Banner
        label="Sponsored"
        title={placement.headline}
        body={placement.subtext}
        cta={placement.cta}
        url={placement.url}
        slot="secondary"
        campaign={campaign || "standard"}
        onClick={() => {
          try {
            fireEvent("sponsor_click", {
              sponsor_name:     placement.partner,
              sponsor_tier:     placement.sponsor_tier,
              sponsor_category: placement.sponsor_category,
              user_language:    userLang || "en",
              timestamp:        Date.now(),
            });
          } catch { /* never block navigation */ }
        }}
        onImpression={onImpression}
      />
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────
function Card({ title, amber, children, style: s, delay }) {
  return (
    <div style={{
      background: amber ? V.amber : V.bg,
      borderRadius: 0,
      padding: "28px 20px",
      marginBottom: 0,
      border: "none",
      borderBottom: `1px solid ${V.rule}`,
      animation: delay !== undefined ? `fadeUp 0.45s ease ${delay}ms both` : undefined,
      ...s
    }}>
      {title && (
        <span style={{
          fontFamily: BF, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.13em",
          display: "block", marginBottom: 14,
          color: amber ? V.amberTxt : V.sub, lineHeight: 1,
        }}>{title}</span>
      )}
      {children}
    </div>
  );
}

// ─── Category label mapping (user-facing, plain English) ────────
const CATEGORY_LABELS = {
  employment:              "Employment matter",
  sensitive_immigration:   "Immigration matter",
  benefit_overpayment:     "Benefits issue",
  formal_process:          "Official process",
  energy:                  "Energy bill issue",
  parking:                 "Parking fine",
  debt:                    "Debt issue",
  tenancy:                 "Tenancy issue",
  insurance:               "Insurance matter",
  consumer:                "Consumer issue",
  tax:                     "Tax matter",
  scam:                    "Possible scam",
  // Domain keys from authority detection
  energy_dispute:          "Energy bill issue",
  parking_private:         "Private parking charge",
  parking_council:         "Council parking fine",
  debt_collection:         "Debt collection",
  tenancy_deposit:         "Tenancy deposit issue",
  housing_possession:      "Tenancy issue",
  housing_arrears:         "Rent arrears",
  housing_repairs:         "Housing repairs issue",
  insurance_dispute:       "Insurance dispute",
  council_tax:             "Council tax",
  hmrc:                    "HMRC correspondence",
  complaint_ombudsman:     "Formal complaint",
  consumer_rights:         "Consumer rights issue",
};
// Display heading resolver — derives the results page heading from the
// Big Picture narrative ONLY. Does not use classifier, sponsor, domain key,
// or ad routing. This prevents misclassification from leaking into the UI.
function deriveDisplayHeading(bigPicture) {
  if (!bigPicture) return "Document issue";
  const bp = bigPicture.toLowerCase();

  // Employment — check first, most common high-stakes category
  if (/\b(employ|employer|dismiss|redundan|disciplinary|grievance|settlement agreement|notice period|tribunal|acas|gross misconduct|unfair dismissal|termination of employment|hr department)\b/.test(bp)) return "Employment matter";

  // Housing / tenancy
  if (/\b(landlord|tenant|tenancy|eviction|possession|rent arrears|section 21|section 8|deposit scheme|letting agent)\b/.test(bp)) return "Tenancy issue";

  // Energy
  if (/\b(energy|gas bill|electricity|meter reading|kwh|standing charge|tariff|energy supplier|british gas|octopus|eon|edf|ovo)\b/.test(bp)) return "Energy bill issue";

  // Parking
  if (/\b(parking charge|pcn|parking fine|parkingeye|penalty charge notice|contravention)\b/.test(bp)) return "Parking fine";

  // Debt
  if (/\b(debt collect|default notice|outstanding balance|final demand|bailiff|ccj|county court judgment)\b/.test(bp)) return "Debt issue";

  // Insurance
  if (/\b(insurance claim|insurer|policy.*(?:reject|declin|cancel|void)|underwriter|premium.*(?:increas|cancel))\b/.test(bp)) return "Insurance matter";

  // Council tax
  if (/\bcouncil tax\b/.test(bp)) return "Council tax";

  // HMRC
  if (/\b(hmrc|hm revenue|self.assessment|tax return)\b/.test(bp)) return "HMRC correspondence";

  // Consumer
  if (/\b(subscription|auto.?renew|cancellation fee|refund|faulty|not as described|consumer rights)\b/.test(bp)) return "Consumer issue";

  // Benefits
  if (/\b(universal credit|dwp|benefit.*overpayment|housing benefit)\b/.test(bp)) return "Benefits issue";

  // Immigration
  if (/\b(visa|leave to remain|deportation|home office|asylum|immigration)\b/.test(bp)) return "Immigration matter";

  return "Document issue";
}

const LANG_NAMES = {
  en: "English", pl: "Polski", es: "Español", fr: "Français",
  de: "Deutsch", ro: "Română", pt: "Português",
  ar: "العربية", ur: "اردو", hi: "हिंदी", zh: "中文",
  bn: "বাংলা", so: "Soomaali",
};

function GlobeIc() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

// ─── ConsentBanner ────────────────────────────────────────────────
// Shown on first visit. Respects the user's choice for all future visits.
// No tracking fires until the user explicitly accepts.
// "Only the essentials" is the default friendly path, honouring the brand.
function ConsentBanner({ onDecide }) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    if (!stored) {
      setVisible(true);
    } else if (stored === "granted") {
      loadAnalyticsScript();
    }
  }, []);

  const accept = () => {
    writeConsent("granted");
    loadAnalyticsScript();
    setVisible(false);
    onDecide?.("granted");
  };
  const decline = () => {
    writeConsent("denied");
    revokeAnalytics();
    setVisible(false);
    onDecide?.("denied");
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 150,
      background: V.card, borderTop: `0.5px solid ${V.hairline}`,
      boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
      padding: "16px 20px 20px", paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
      animation: "fadeUp 0.4s ease both",
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <p style={{
          fontFamily: SF, fontSize: "1rem", fontWeight: 800,
          color: V.ink, margin: "0 0 6px", letterSpacing: "-0.02em",
        }}>A quick word about privacy.</p>
        <p style={{
          fontFamily: BF, fontSize: "0.85rem", lineHeight: 1.6,
          color: V.inkM, margin: "0 0 12px", fontWeight: 400,
        }}>
          Lizzie works without signing you up or storing your documents. She uses a small amount of anonymous analytics to understand what's working. You decide whether to allow it.
        </p>
        {expanded && (
          <div style={{
            background: V.surface2, borderRadius: 10, padding: "12px 14px",
            margin: "0 0 12px",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: "0.78rem", fontWeight: 700, color: V.ink }}>What "only the essentials" means</p>
            <p style={{ margin: 0, fontSize: "0.78rem", color: V.inkM, lineHeight: 1.6 }}>
              No analytics. No cookies. No tracking of any kind. Lizzie still works exactly the same. You can change this any time from the Privacy page.
            </p>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={decline} style={{
            ...bb, flex: "1 1 auto", minWidth: 140,
            background: V.surface2, color: V.inkM,
            padding: "13px 16px", fontSize: "0.85rem", fontWeight: 700,
            border: `0.5px solid ${V.hairline}`,
          }}>Only the essentials</button>
          <button onClick={accept} style={{
            ...bb, flex: "1 1 auto", minWidth: 140,
            background: V.ink, color: "#fff",
            padding: "13px 16px", fontSize: "0.85rem", fontWeight: 700,
          }}>Allow analytics</button>
        </div>
        {!expanded && (
          <button onClick={() => setExpanded(true)} style={{
            fontFamily: BF, background: "none", border: "none",
            fontSize: "0.75rem", color: V.inkL, fontWeight: 500,
            cursor: "pointer", padding: "10px 0 0", textDecoration: "underline",
          }}>What does "only the essentials" mean?</button>
        )}
      </div>
    </div>
  );
}

// ─── ErrorBoundary ────────────────────────────────────────────────
// Catches render crashes inside the results view. Keeps the app alive
// and lets the user retry rather than seeing a blank white screen.
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) {
    // PRIVACY: log the error name only, never error content which may include document text
    if (typeof window !== "undefined" && window.console) {
      console.error("[lizzie] Render error:", error?.name || "UnknownError");
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: BF, minHeight: "100vh", background: V.bg,
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", textAlign: "center", padding: 32,
        }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: V.warmBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={V.warm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: SF, fontSize: "1.15rem", fontWeight: 700, margin: "0 0 8px", color: V.ink }}>Something went wrong</h1>
          <p style={{ fontSize: "0.9rem", color: V.inkM, margin: "0 0 24px", maxWidth: 320, lineHeight: 1.6 }}>
            Lizzie's had a hiccup. Refreshing usually fixes it.
          </p>
          <button onClick={() => { if (typeof window !== "undefined") window.location.reload(); }} style={{
            ...bm, maxWidth: 240, fontSize: "0.9rem",
          }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LangPill({ effectiveLang, userLang, langOverride, onOverride, showPicker, setShowPicker }) {
  const isEnglish = !effectiveLang || effectiveLang === "en";
  const displayName = LANG_NAMES[effectiveLang] || "English";
  const isOverridden = !!langOverride;

  const pillBg     = isEnglish ? "transparent" : V.mossFaint;
  const pillBorder = isEnglish ? "transparent"  : V.borderSoft;
  const labelColor = isEnglish ? V.inkF         : V.inkM;
  const nameColor  = isEnglish ? V.inkL         : V.moss;
  const nameWeight = isEnglish ? 600            : 700;

  return (
    <div style={{ marginBottom: 16, position: "relative" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        background: pillBg, borderRadius: 20, padding: "7px 12px",
        border: `1px solid ${pillBorder}`, cursor: "pointer",
      }} onClick={() => setShowPicker(s => !s)}>
        <GlobeIc />
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: labelColor }}>
          Lizzie will respond in <strong style={{ color: nameColor, fontWeight: nameWeight }}>{displayName}</strong>
        </span>
        {isOverridden && <span style={{ fontSize: "0.68rem", fontWeight: 600, color: V.inkF }}>(changed)</span>}
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: nameColor, marginLeft: 2 }}>{showPicker ? "▲" : "▼"}</span>
      </div>
      {showPicker && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
          background: V.card, borderRadius: 14, border: `1px solid ${V.borderSoft}`,
          boxShadow: "0 4px 20px rgba(26,26,26,0.12)", padding: 8, minWidth: 200,
        }}>
          <p style={{ margin: "4px 8px 8px", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: V.inkF }}>Choose language</p>
          {Object.entries(LANG_NAMES).map(([code, name]) => (
            <button key={code} onClick={() => { onOverride(code); setShowPicker(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              fontFamily: BF, fontSize: "0.83rem", fontWeight: 600,
              padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer",
              background: effectiveLang === code ? V.mossFaint : "transparent",
              color: effectiveLang === code ? V.moss : V.inkM,
              transition: "background 0.1s ease",
            }}>
              {name}
              {code === userLang && code !== "en" && (
                <span style={{ marginLeft: 6, fontSize: "0.65rem", color: V.inkF }}>(your browser)</span>
              )}
            </button>
          ))}
          {langOverride && (
            <button onClick={() => { onOverride(null); setShowPicker(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              fontFamily: BF, fontSize: "0.75rem", fontWeight: 700, color: V.inkL,
              padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer",
              background: "transparent", borderTop: `1px solid ${V.borderSoft}`, marginTop: 4,
            }}>Reset to browser default</button>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
export default function AskLizzie() {
  const [page, setPage] = useState("home");
  const [results, setResults] = useState(null);
  const [responseId, setResponseId] = useState(null);
  const [docCtx, setDocCtx] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [showPromise, setShowPromise] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [shredding, setShredding] = useState(false);
  const [selPw, setSelPw] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [fQ, setFQ] = useState("");
  const [fA, setFA] = useState(null);
  const [fLoad, setFLoad] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [adImpressed, setAdImpressed] = useState(false);
  const [sponsorImpressed, setSponsorImpressed] = useState(false);
  // sponsor: object from the Commercial Routing Engine, or null.
  // Set this from wherever your routing engine delivers its payload.
  // Shape: { sponsor_tier, sponsor_name, sponsor_category, deep_link, display_text }
  const [sponsor, setSponsor] = useState(null);
  const [draftState, setDraftState] = useState("idle"); // idle | loading | done | dismissed
  const [draftVariants, setDraftVariants] = useState(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState(null);
  // Document request draft — parallel to complaint draft, independent state
  const [docReqState, setDocReqState] = useState("idle"); // idle | loading | done | dismissed
  const [docReqVariants, setDocReqVariants] = useState(null);
  const [activeDocReqVariant, setActiveDocReqVariant] = useState(0);
  const [copiedDocReqIdx, setCopiedDocReqIdx] = useState(null);
  const [userLang, setUserLang] = useState(null);       // detected browser language code e.g. "pl"
  const [langOverride, setLangOverride] = useState(null); // user-selected override
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const lastAdClick = useRef(0);
  const fileRef = useRef(null);
  // Set to the decoded email text when launched from the Gmail extension.
  // Set to the decoded email text when launched from the Gmail extension.
  // Watched by the auto-submit effect below.
  const fromExtensionRef = useRef(null);
  // One-time guard — prevents double submission on re-renders or hydration
  // differences in production builds.
  const hasSubmittedRef = useRef(false);

  // Detect browser language on mount
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const raw = navigator.language || navigator.languages?.[0] || "en";
      // Normalise to base code: "pl-PL" -> "pl"
      const base = raw.toLowerCase().split("-")[0];
      setUserLang(base);
    }
  }, []);

  const go = useCallback((p) => { setPage(p); window.scrollTo(0, 0); }, []);

  // ── Gmail extension ingestion ───────────────────────────────
  // On mount, check for ?lizzie_text= in the URL (set by the Chrome extension).
  // Also reads ?source= for future extensibility (Outlook, etc.) — not used yet.
  // Runs once only. Does not affect any manual flow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      // const source = params.get("source"); // reserved: "gmail" | "outlook" etc.
      const raw = params.get("lizzie_text");
      if (!raw) return;

      // Decode safely — Gmail content can occasionally produce malformed
      // percent-encoding, so we fall back to the raw string rather than crashing.
      let text = raw;
      try { text = decodeURIComponent(raw); }
      catch { /* fallback to raw */ }

      // Enforce the same length limit as manual input
      if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS);

      // Guard: require at least 20 characters of real content
      if (text.trim().length < 20) return;

      // Populate the visible textarea and flag for auto-submit
      setInputText(text);
      fromExtensionRef.current = text;

      // Clean the URL so the param does not persist on reload
      window.history.replaceState({}, "", window.location.pathname);
    } catch {
      // URL parsing failed — proceed normally, do not surface an error
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-submit for extension flow ─────────────────────────
  // Fires after go is stable (deps: [go]).
  // hasSubmittedRef prevents double submission on re-renders or
  // production hydration differences.
  // Reads lang from effectiveLangRef.current at call time — never stale.
  // AbortController provides a 15s hard timeout — prevents the user
  // being stuck on the working screen if the network or API hangs.
  useEffect(() => {
    if (!fromExtensionRef.current || hasSubmittedRef.current) return;

    // Lock immediately — subsequent renders cannot re-enter
    hasSubmittedRef.current = true;
    const text = fromExtensionRef.current;
    fromExtensionRef.current = null;

    go("working");
    setStatus("Lizzie is reading your email");

    const lang = effectiveLangRef.current; // always current
    const scrubbed = scrubPII(text.trim());

    // AbortController: cancel the request after 15 seconds.
    // The timeout is cleared on both success and failure so it does
    // not fire after the fetch has already resolved.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // useEffect callbacks must not be async — use a named inner function.
    const run = async () => {
      try {
        const r = await fetch("/api/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: scrubbed, preferredLang: lang }),
          signal: controller.signal,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Something went wrong");
        setResults(d);
        setSponsor(d.categorySponsor || null);
        setDocCtx(scrubbed);
        setShowTransition(true);
      } catch (e) {
        const msg = e.name === "AbortError"
          ? "This is taking longer than expected. Please try again."
          : (e.message || "Something went wrong");
        setError(msg);
        go("error");
      } finally {
        clearTimeout(timeout);
      }
    };

    run();

    // Cleanup: if the component unmounts while the request is in flight
    // (e.g. user navigates away), abort the fetch to prevent state updates
    // on an unmounted component.
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]); // fromExtensionRef and hasSubmittedRef are refs — not state
  const reset = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    if (results) {
      setShredding(true);
      setTimeout(() => {
        setShredding(false); setResults(null); setResponseId(null); setDocCtx(""); setError(""); setInputText(""); setInputUrl("");
        setSelPw(null); setShowDetail(false); setFQ(""); setFA(null); setSpeaking(false); setAdImpressed(false);
        setDraftState("idle"); setDraftVariants(null); setActiveVariant(0); setCopiedIdx(null);
        setDocReqState("idle"); setDocReqVariants(null); setActiveDocReqVariant(0); setCopiedDocReqIdx(null);
        setLangOverride(null); go("home");
      }, 900);
    } else {
      setResults(null); setResponseId(null); setDocCtx(""); setError(""); setInputText(""); setInputUrl("");
      setSelPw(null); setShowDetail(false); setFQ(""); setFA(null);
      setDraftState("idle"); setDraftVariants(null); setActiveVariant(0); setCopiedIdx(null);
      setDocReqState("idle"); setDocReqVariants(null); setActiveDocReqVariant(0); setCopiedDocReqIdx(null);
      setLangOverride(null); go("home");
    }
  }, [go, results]);

  // Mint a fresh response_id whenever a new result arrives. Used as an
  // anonymous correlation token for feedback events. Never persisted.
  useEffect(() => {
    if (results && !responseId) setResponseId(newResponseId());
    if (!results && responseId) setResponseId(null);
  }, [results, responseId]);

  const effectiveLang = langOverride ?? userLang ?? "en"; // responseLang: override → browser → English

  // Keep a ref that always holds the current effectiveLang.
  // This ensures submit handlers always read the live value even if
  // useCallback has not yet been recreated after a language change.
  const effectiveLangRef = useRef(effectiveLang);
  useEffect(() => { effectiveLangRef.current = effectiveLang; }, [effectiveLang]);

  const api = useCallback(async (b) => {
    const r = await fetch("/api/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Something went wrong"); return d;
  }, []);

  const handleFile = useCallback(async (f) => {
    if (!f) return; go("working"); setStatus("Getting your document ready");
    const lang = effectiveLangRef.current;
    let base64, mediaType;
    try { ({ base64, mediaType } = await processFile(f)); } catch (e) { setError(e.message); go("error"); return; }
    setStatus("Lizzie is reading");
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) { setStatus("Still working on it…"); await new Promise(r => setTimeout(r, 1500)); }
        const d = await api({ image: base64, mediaType, preferredLang: lang });
        setResults(d); setSponsor(d.categorySponsor || null); setDocCtx(JSON.stringify(d)); setShowTransition(true);
        return;
      } catch (e) { if (attempt === 1) { setError(e.message); go("error"); } }
    }
  }, [api, go]);

  const handleText = useCallback(async () => {
    if (!inputText.trim()) return;
    if (inputText.trim().length > MAX_TEXT_CHARS) { setError("This document is too long for Lizzie to review in one go. Try the most relevant page or section."); go("error"); return; }
    go("working"); setStatus("Lizzie is reading");
    const lang = effectiveLangRef.current;
    const s = scrubPII(inputText.trim());
    // Silent client-side retry: one automatic retry on transient server/network errors
    // before surfacing the error screen. Handles Anthropic 529 overload transparently.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          setStatus("Still working on it…");
          await new Promise(r => setTimeout(r, 1500));
        }
        const d = await api({ text: s, preferredLang: lang });
        setResults(d); setSponsor(d.categorySponsor || null); setDocCtx(s); setShowTransition(true);
        return;
      } catch (e) {
        if (attempt === 1) { setError(e.message); go("error"); }
      }
    }
  }, [inputText, api, go]);

  const handleUrl = useCallback(async () => {
    if (!inputUrl.trim()) return; go("working"); setStatus("Lizzie is reading the page");
    const lang = effectiveLangRef.current;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) { setStatus("Still working on it…"); await new Promise(r => setTimeout(r, 1500)); }
        const d = await api({ url: inputUrl.trim(), preferredLang: lang });
        setResults(d); setSponsor(d.categorySponsor || null); setDocCtx(inputUrl.trim()); setShowTransition(true);
        return;
      } catch (e) { if (attempt === 1) { setError(e.message); go("error"); } }
    }
  }, [inputUrl, api, go]);

  const handleFollow = useCallback(async (q) => {
    const question = q || fQ; if (!question.trim()) return;
    setFLoad(true); setFA(null); setFQ(question);
    try { const d = await api({ followUp: question, documentContext: docCtx }); setFA(d); }
    catch { setFA({ answer: "Sorry, I couldn't find that in the document." }); }
    setFLoad(false);
  }, [fQ, docCtx, api]);

  const handleVoice = useCallback(() => {
    if (!results || typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    // Build full summary including pathways
    const parts = [results.bigPicture, results.emotionalSignal, "The important bit. " + results.importantBit];
    if (results.pathways && results.pathways.length > 0) {
      parts.push("What people often do next.");
      results.pathways.slice(0, 3).forEach((p, i) => {
        if (i === 0) parts.push("A good place to start: " + p.title + ". " + p.detail);
        else parts.push(p.title + ". " + p.detail);
      });
    }
    const t = parts.filter(Boolean).join(". ");
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "en-GB"; u.rate = 0.88;
    // Prefer female British voice
    const voices = window.speechSynthesis.getVoices();
    const femaleGB = voices.find(v => v.lang.startsWith("en-GB") && /female|samantha|kate|fiona|martha|serena/i.test(v.name));
    const anyFemale = voices.find(v => v.lang.startsWith("en") && /female|samantha|kate|fiona|martha|serena|victoria|karen|moira|tessa/i.test(v.name));
    const anyGB = voices.find(v => v.lang.startsWith("en-GB"));
    const chosen = femaleGB || anyFemale || anyGB || voices[0];
    if (chosen) u.voice = chosen;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u); setSpeaking(true);
  }, [results, speaking]);

  const shareText = results ? `Lizzie helped me understand a document.\n\n${results.bigPicture || ""}\n\nThe important bit: ${results.importantBit || ""}\n\nTry Ask Lizzie: asklizzie.co.uk` : "";

  const pwMailto = useCallback((p) => {
    const to = results?.replyTo || ""; const ref = results?.reference ? `Re: ${results.reference}` : "Regarding your recent letter";
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(ref)}&body=${encodeURIComponent(p.draftReply || "")}`;
  }, [results]);

  const handleCompare = useCallback((p) => {
    fireEvent("comparison_click", { category: results?.bigPicture?.toLowerCase().includes("energy") ? "energy" : results?.bigPicture?.toLowerCase().includes("insurance") ? "insurance" : "utilities", document_type: "letter", cta_label: p.actionLabel || "compare options", user_language: effectiveLang || "en" });
    window.open(p.actionUrl || "https://www.moneysupermarket.com", "_blank");
  }, [results, effectiveLang]);

  const handleDraft = useCallback(async () => {
    if (!results?.complaintContext) return;
    setDraftState("loading");
    setDraftVariants(null);
    try {
      const r = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "complaint",
          complaintContext: results.complaintContext,
          replyTo: results.replyTo || null,
          reference: results.reference || null,
          todayFormatted: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong");
      setDraftVariants(d.variants);
      setActiveVariant(0);
      setDraftState("done");
      fireEvent("draft_generated", { issue_type: results.complaintContext.issueType });
    } catch {
      setDraftState("idle");
    }
  }, [results]);

  // Document request draft handler — independent of complaint draft
  const handleDocReq = useCallback(async () => {
    if (!results?.documentRequestContext?.detected) return;
    setDocReqState("loading");
    setDocReqVariants(null);
    try {
      const r = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "documentRequest",
          documentRequestContext: results.documentRequestContext,
          replyTo: results.replyTo || null,
          reference: results.reference || null,
          todayFormatted: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong");
      setDocReqVariants(d.variants);
      setActiveDocReqVariant(0);
      setDocReqState("done");
      fireEvent("doc_request_generated", { document_type: results.documentRequestContext.documentType });
    } catch {
      setDocReqState("idle");
    }
  }, [results]);

  const handleCopy = useCallback((text, idx) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
        fireEvent("draft_copied", { variant: idx });
      });
    }
  }, []);

  const handleCopyDocReq = useCallback((text, idx) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedDocReqIdx(idx);
        setTimeout(() => setCopiedDocReqIdx(null), 2000);
        fireEvent("doc_request_copied", { variant: idx });
      });
    }
  }, []);

  const shell = { fontFamily: BF, minHeight: "100vh", fontSize: "0.9rem", lineHeight: 1.6, background: V.bg };
  const box = { maxWidth: 680, margin: "0 auto", padding: "0 20px" };

  const Head = ({ back }) => (
    <div style={{
      padding: "16px 20px 12px", maxWidth: 680, margin: "0 auto",
      display: "flex", alignItems: "center", gap: 10,
      borderBottom: `0.5px solid ${V.hairline}`,
    }}>
      {back && (
        <button onClick={reset} style={{
          background: "none", border: "none", cursor: "pointer",
          color: V.red, padding: "4px 6px", borderRadius: 6,
          display: "flex", alignItems: "center",
        }}><BackIc /></button>
      )}
      <Wordmark size={17} />
    </div>
  );

  // ── SHREDDING ──────────────────────────────────────────────
  if (shredding) {
    return (
      <div style={{ ...shell, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
        <div style={{ animation: "shred 0.8s ease-in forwards" }}><ShredIc /></div>
        <p style={{ marginTop: 20, fontSize: "0.9rem", color: V.inkL, fontWeight: 600, animation: "fadeUp 0.5s ease 0.4s both" }}>All done. Your document has been removed.</p>
      </div>
    );
  }

  // ── PROMISE ────────────────────────────────────────────────
  const LizziePromise = () => {
    if (!showPromise) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }} onClick={() => setShowPromise(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: V.card, borderRadius: 20, padding: "32px 28px", maxWidth: 420, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(26,26,26,0.15)" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: V.mossFaint, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}><LockIc /></div>
          <h2 style={{ fontFamily: SF, fontSize: "1.2rem", fontWeight: 700, color: V.ink, textAlign: "center", margin: "0 0 6px" }}>How Lizzie looks after your privacy</h2>
          <p style={{ fontSize: "0.9rem", color: V.inkM, textAlign: "center", margin: "0 0 22px", fontWeight: 600 }}>Your documents are private. Here is how she handles them.</p>
          {[
            { b: "No account needed.", r: "You don't sign up, log in, or give us your name or email." },
            { b: "No documents stored.", r: "There is no database. Once your session ends, your document is gone from our servers." },
            { b: "No history kept.", r: "We don't keep a record of what you've uploaded or what Lizzie told you." },
            { b: "Card numbers masked in text.", r: "Card, NI, and sort code numbers are hidden before pasted text is sent. For photos, cover anything sensitive before uploading." },
            { b: "Encrypted in transit.", r: "All data between your phone and our servers is protected by the same encryption used in online banking." },
            { b: "Your data is never sold.", r: "We do not share your information with advertisers or marketing companies." },
            { b: "Anthropic processes your document.", r: "Claude, built by Anthropic, reads and interprets it. Your data is not used to train their models. Anthropic may retain it for up to 30 days for safety monitoring, then delete it." },
            { b: "Analytics only if you opt in.", r: "Nothing is tracked unless you choose 'Allow analytics' on first visit. You can change your mind any time." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "11px 0", borderTop: i ? `1px solid ${V.borderSoft}` : "none" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: V.moss, flexShrink: 0, marginTop: 7 }} />
              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, fontWeight: 500 }}><strong style={{ color: V.ink }}>{item.b}</strong> {item.r}</p>
            </div>
          ))}
          <button onClick={() => { setShowPromise(false); setShowPrivacy(true); }} style={{ ...bg, fontSize: "0.8rem", marginTop: 18 }}>Full privacy policy</button>
          <button onClick={() => setShowPromise(false)} style={{ ...bm, marginTop: 10 }}>Got it</button>
        </div>
      </div>
    );
  };

  // ── PRIVACY ────────────────────────────────────────────────
  const Privacy = () => {
    if (!showPrivacy) return null;
    const S = ({ title, children }) => (
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: SF, fontSize: "0.95rem", fontWeight: 700, color: V.ink, margin: "0 0 6px" }}>{title}</h3>
        <div style={{ fontSize: "0.85rem", lineHeight: 1.7, color: V.inkM }}>{children}</div>
      </div>
    );
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }} onClick={() => setShowPrivacy(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: V.card, borderRadius: 20, padding: "32px 24px", maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(26,26,26,0.15)" }}>
          <h2 style={{ fontFamily: SF, fontSize: "1.15rem", fontWeight: 700, color: V.ink, margin: "0 0 4px" }}>Privacy Policy</h2>
          <p style={{ fontSize: "0.75rem", color: V.inkF, margin: "0 0 22px", fontWeight: 600 }}>Ask Lizzie. Last updated March 2026.</p>

          <S title="Who we are">
            <p style={{ margin: 0 }}>Ask Lizzie is operated by [Company Name], registered in England and Wales ([Company Number]). Registered address: [Address]. For data protection queries, contact privacy@asklizzie.co.uk.</p>
          </S>

          <S title="What Lizzie does">
            <p style={{ margin: 0 }}>Lizzie helps you understand everyday documents such as letters, bills, notices and contracts. You share a document by taking a photo, uploading a file, or pasting text. Lizzie reads it and provides a plain English explanation, highlights what matters, and suggests practical next steps. She may also generate a draft reply or link to external services.</p>
          </S>

          <S title="What personal data is processed">
            <p style={{ margin: "0 0 6px" }}>When you use Lizzie, the content of your document is sent to our server for processing. This may include personal information visible in the document, such as your name, address, account numbers, payment details, or reference numbers.</p>
            <p style={{ margin: "0 0 6px" }}><strong>For pasted text:</strong> sensitive structured data (card numbers, National Insurance numbers, sort codes) is automatically masked on your device before transmission.</p>
            <p style={{ margin: "0 0 6px" }}><strong>For photos and PDFs:</strong> the full file is sent as uploaded. Automatic masking is not applied to images because it is not technically reliable. If your document shows card or account numbers you would rather hide, cover them before photographing.</p>
            <p style={{ margin: "0 0 6px" }}>We do not collect your name, email address, or any login credentials. No account is required.</p>
            <p style={{ margin: 0 }}>If you have given analytics consent, Google Analytics may set its own cookies and process a limited set of anonymous events about your use of the app. You can withdraw analytics consent at any time from the footer of this page.</p>
          </S>

          <S title="Our lawful basis for processing">
            <p style={{ margin: "0 0 6px" }}>We process your data on the basis of legitimate interest (Article 6(1)(f) UK GDPR). Our legitimate interest is to provide you with a useful service that helps you understand documents and make informed decisions. This processing is necessary to deliver the service you have chosen to use, and we consider the impact on your privacy to be low given that no data is stored after your session.</p>
            <p style={{ margin: 0 }}>We do not process special category data (such as health, racial, or political data) as a matter of course. If a document you upload happens to contain such data, it is processed only to provide you with an explanation and is not retained.</p>
          </S>

          <S title="How your document is processed">
            <p style={{ margin: "0 0 6px" }}>Your document is sent from your device to our server, hosted by Netlify Inc (based in the United States). From there, it is forwarded to Anthropic (also US-based) for AI analysis. The analysis is returned to our server and then to your device.</p>
            <p style={{ margin: 0 }}>All data is encrypted in transit using industry-standard TLS encryption.</p>
          </S>

          <S title="Third-party processors">
            <p style={{ margin: "0 0 6px" }}><strong>Anthropic.</strong> Your document content is processed by Anthropic's AI service (Claude). Anthropic's API policy is that data sent via the API is not used to train their models. By default, Anthropic may retain request and response data for up to 30 days for safety and abuse monitoring, after which it is deleted. For enterprise customers, Anthropic offers a zero-data-retention option which we use where available.</p>
            <p style={{ margin: 0 }}><strong>Netlify.</strong> Our server runs on Netlify's infrastructure. Standard server logs (such as request timestamps and IP addresses) may be retained by Netlify in accordance with their data processing terms. Document content is never intentionally logged by us.</p>
          </S>

          <S title="International data transfers">
            <p style={{ margin: 0 }}>Your data is transferred to the United States for processing by Netlify and Anthropic. These transfers are protected by appropriate safeguards, including the service providers' data processing agreements and, where applicable, Standard Contractual Clauses approved by the UK Information Commissioner's Office.</p>
          </S>

          <S title="Data retention">
            <p style={{ margin: "0 0 6px" }}>Ask Lizzie does not have a database. Your documents are not stored by the app. Document content exists temporarily in your browser's memory during your session and is cleared when the session ends.</p>
            <p style={{ margin: 0 }}>Limited technical data (such as server logs) may be retained temporarily by Netlify and Anthropic as part of their standard infrastructure operations, typically for up to 30 days.</p>
          </S>

          <S title="Automated decision-making">
            <p style={{ margin: 0 }}>Lizzie uses AI to analyse your documents and generate explanations. This is automated processing, but it does not produce decisions with legal or similarly significant effects on you. Lizzie provides guidance for your consideration. All decisions remain with you.</p>
          </S>

          <S title="Your rights">
            <p style={{ margin: "0 0 6px" }}>Under UK GDPR, you have the right to access your personal data, request its correction or deletion, restrict or object to processing, and receive your data in a portable format. Because Ask Lizzie does not store your documents or maintain user accounts, there is no personal data held by us to access, correct, or delete after your session ends.</p>
            <p style={{ margin: "0 0 6px" }}>If you have questions about data processed by Anthropic or Netlify, you may contact those companies directly using the details in their respective privacy policies.</p>
            <p style={{ margin: 0 }}>You have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk if you believe your data has been handled unlawfully.</p>
          </S>

          <S title="Security">
            <p style={{ margin: 0 }}>We use encryption in transit (TLS) to protect your data between your device and our servers. Client-side masking is applied to sensitive structured data in text input. We do not store documents, which substantially reduces the risk of a data breach.</p>
          </S>

          <S title="Changes to this policy">
            <p style={{ margin: 0 }}>If we make material changes to this policy, we will update this page and the date shown above. We recommend reviewing it from time to time.</p>
          </S>

          <S title="Contact">
            <p style={{ margin: 0 }}>For any questions about this privacy policy or how your data is handled, contact privacy@asklizzie.co.uk.</p>
          </S>

          <button onClick={() => setShowPrivacy(false)} style={{ ...bm, marginTop: 8 }}>Close</button>
        </div>
      </div>
    );
  };

  // ── TERMS OF USE ───────────────────────────────────────────
  const Terms = () => {
    if (!showTerms) return null;
    const S = ({ title, children }) => (
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: SF, fontSize: "0.95rem", fontWeight: 700, color: V.ink, margin: "0 0 6px" }}>{title}</h3>
        <div style={{ fontSize: "0.85rem", lineHeight: 1.7, color: V.inkM }}>{children}</div>
      </div>
    );
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }} onClick={() => setShowTerms(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: V.card, borderRadius: 20, padding: "32px 24px", maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(26,26,26,0.15)" }}>
          <h2 style={{ fontFamily: SF, fontSize: "1.15rem", fontWeight: 700, color: V.ink, margin: "0 0 4px" }}>Terms of Use</h2>
          <p style={{ fontSize: "0.75rem", color: V.inkF, margin: "0 0 22px", fontWeight: 600 }}>Ask Lizzie. Last updated March 2026.</p>
          <S title="General information only">
            <p style={{ margin: 0 }}>Ask Lizzie provides general guidance to help you understand letters, bills, and documents. It does not provide legal, financial, or professional advice.</p>
          </S>
          <S title="Your responsibility">
            <p style={{ margin: 0 }}>You are responsible for any decisions you make. Lizzie can help you think through your options, but the final decision is always yours. You should verify information independently where it matters.</p>
          </S>
          <S title="No reliance">
            <p style={{ margin: 0 }}>The information Lizzie provides may be incomplete or inaccurate. It should not be relied on as your sole source of information for important decisions.</p>
          </S>
          <S title="No liability">
            <p style={{ margin: 0 }}>We accept no liability for actions taken, losses incurred, or decisions made based on Lizzie's outputs.</p>
          </S>
          <S title="Your documents">
            <p style={{ margin: 0 }}>Letters and documents are provided by you. Lizzie does not verify their authenticity or accuracy.</p>
          </S>
          <S title="No guarantee of outcomes">
            <p style={{ margin: 0 }}>Lizzie cannot guarantee any legal outcomes, dispute results, or financial savings.</p>
          </S>
          <S title="How Lizzie works">
            <p style={{ margin: 0 }}>Lizzie uses AI to analyse documents. Her responses may contain errors and the service is continuously improving.</p>
          </S>
          <S title="No professional relationship">
            <p style={{ margin: 0 }}>Using Lizzie does not create a solicitor-client, adviser-client, or any other professional relationship.</p>
          </S>
          <S title="Service provided as-is">
            <p style={{ margin: 0 }}>This service is provided as-is, without warranty of any kind. We do not guarantee that the service will be uninterrupted, error-free, or suitable for any particular purpose.</p>
          </S>
          <S title="Limitation of liability">
            <p style={{ margin: 0 }}>To the fullest extent permitted by law, we exclude all liability for any loss, damage, or expense arising from the use of this service.</p>
          </S>
          <S title="Governing law">
            <p style={{ margin: 0 }}>These terms are governed by the laws of England and Wales.</p>
          </S>
          <button onClick={() => setShowTerms(false)} style={{ ...bm, marginTop: 8 }}>Close</button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // HOME
  // ═══════════════════════════════════════════════════════════
  if (page === "home") {
    return (
      <div style={shell}>
        <LizziePromise /><Privacy /><Terms />
        <ConsentBanner />
        <div style={{ ...box, paddingTop: 80, paddingBottom: 56, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Mono s={72} />
          <p style={{
            fontSize: 11, fontWeight: 700, color: V.red,
            textTransform: "uppercase", letterSpacing: "0.13em",
            margin: "24px 0 12px", fontFamily: BF,
          }}>Don't let the jargon win</p>
          <h1 style={{
            fontFamily: SF, fontSize: 36, fontWeight: 700,
            lineHeight: 1.2, margin: "0 0 16px",
            color: V.ink, maxWidth: 380,
          }}>
            Got a letter you're not sure about?
          </h1>
          <p style={{ fontFamily: BF, fontSize: 16, color: V.sub, margin: "0 0 8px", fontWeight: 400, maxWidth: 300, lineHeight: 1.62 }}>
            Lizzie reads it carefully and tells you what it means, what matters, and what to do next.
          </p>
          <p style={{ fontFamily: BF, fontSize: 13, color: V.sub, margin: "0 0 36px", fontWeight: 400, maxWidth: 280, lineHeight: 1.6, fontStyle: "italic" }}>
            No sign-up. Nothing stored. She's just got you.
          </p>
          <button onClick={() => go("input")} style={{ ...bm, maxWidth: 300, padding: "16px 32px", fontSize: "0.97rem" }}>
            Lizzie, take a look
          </button>
          <p style={{ fontSize: "0.75rem", color: V.inkL, margin: "16px 0 0", fontWeight: 400 }}>
            Letters, bills, contracts or terms
          </p>
          <button onClick={() => setShowPromise(true)} style={{ ...bb, background: "transparent", border: "none", fontSize: "0.78rem", color: V.inkL, padding: "24px 0", gap: 6, maxWidth: 300, fontWeight: 500 }}>
            <ShieldIc /> How Lizzie looks after your privacy
          </button>
          <p style={{ fontSize: "0.62rem", color: V.inkF, fontWeight: 400, margin: "0 0 8px", lineHeight: 1.7, maxWidth: 300 }}>
            Lizzie provides general guidance, not legal or financial advice.
          </p>
          <button onClick={() => setShowTerms(true)} style={{ ...bb, background: "transparent", border: "none", fontSize: "0.62rem", color: V.inkF, padding: 0, textDecoration: "underline", width: "auto" }}>Terms of use</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // INPUT
  // ═══════════════════════════════════════════════════════════
  if (page === "input") {
    const nonEnglishDetected = userLang && userLang !== "en" && !langOverride;
    return (
      <div style={shell}>
        <Head back />
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        <div style={{ ...box, paddingTop: 20, paddingBottom: 56 }}>
          <h1 style={{ fontFamily: SF, fontSize: "1.5rem", fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.03em", color: V.ink }}>Show Lizzie your document</h1>
          <p style={{ fontSize: "0.85rem", color: V.inkM, margin: "0 0 16px", fontWeight: 400, lineHeight: 1.6 }}>Choose whichever is easiest</p>

          {/* Warm language nudge for non-English browsers */}
          {nonEnglishDetected && (
            <div style={{
              background: V.mossFaint, borderRadius: 12, padding: "12px 16px", marginBottom: 14,
              border: `1px solid ${V.borderSoft}`, display: "flex", alignItems: "center", gap: 10,
            }}>
              <GlobeIc />
              <p style={{ margin: 0, fontSize: "0.8rem", color: V.inkM, fontWeight: 500, lineHeight: 1.5 }}>
                Lizzie can also explain this in{" "}
                <button onClick={() => { setLangOverride(userLang); }} style={{
                  fontFamily: BF, fontWeight: 700, color: V.moss, background: "none",
                  border: "none", cursor: "pointer", padding: 0, fontSize: "0.8rem", textDecoration: "underline",
                }}>{LANG_NAMES[userLang] || userLang}</button>
                {" "}if that's easier.
              </p>
            </div>
          )}

          <LangPill
            effectiveLang={effectiveLang}
            userLang={userLang}
            langOverride={langOverride}
            onOverride={setLangOverride}
            showPicker={showLangPicker}
            setShowPicker={setShowLangPicker}
          />

          {/* Pre-upload privacy nudge — shown before camera/file opens */}
          <div style={{
            background: V.surface2, borderRadius: 10, padding: "10px 14px",
            marginBottom: 12, border: `0.5px solid ${V.hairline}`,
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.inkL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ margin: 0, fontSize: "0.78rem", color: V.inkM, lineHeight: 1.55, fontWeight: 400 }}>
              Quick check: cover any account numbers or anything you'd rather keep private before taking the photo.
            </p>
          </div>

          <button onClick={() => fileRef.current?.click()} style={{ ...bm, marginBottom: 16 }}><CamIc /> Take a photo or choose a file</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "8px 0", padding: "0 4px" }}>
            <div style={{ flex: 1, height: 1, background: V.borderSoft }} />
            <span style={{ fontSize: "0.66rem", fontWeight: 700, color: V.inkF, textTransform: "uppercase", letterSpacing: "0.12em" }}>or</span>
            <div style={{ flex: 1, height: 1, background: V.borderSoft }} />
          </div>
          <Card style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <TypeIc />
              <span style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: V.inkF }}>Type or paste the text</span>
            </div>
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Paste the letter, email or notice here..." style={{ width: "100%", minHeight: 140, border: `0.5px solid ${V.hairline}`, borderRadius: 10, padding: "12px 14px", fontSize: "0.9rem", fontFamily: BF, lineHeight: 1.65, color: V.ink, background: V.surface2, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            <button onClick={handleText} disabled={!inputText.trim()} style={{ ...bm, marginTop: 14, opacity: inputText.trim() ? 1 : 0.35 }}>Let Lizzie look at this</button>
          </Card>
          <Card style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <LinkIc />
              <span style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: V.inkF }}>Paste a link</span>
            </div>
            <input value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleUrl(); }}
              placeholder="Paste the link to the page you're looking at" style={{ width: "100%", border: `0.5px solid ${V.hairline}`, borderRadius: 10, padding: "12px 14px", fontSize: "0.9rem", fontFamily: BF, lineHeight: 1.65, color: V.ink, background: V.surface2, outline: "none", boxSizing: "border-box" }} />
            <button onClick={handleUrl} disabled={!inputUrl.trim()} style={{ ...bm, marginTop: 14, opacity: inputUrl.trim() ? 1 : 0.35 }}>Let Lizzie look at this</button>
          </Card>
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: V.inkF, marginTop: 20, fontWeight: 400, letterSpacing: "0.04em" }}>No account. Nothing is stored.</p>
        </div>
      </div>
    );
  }

  // ── WORKING ──────────────────────────────────────────────
  if (page === "working") {
    return (
      <div style={shell}>
        <Head />
        {showTransition && results && (
          <ResultsTransition onDone={() => { setShowTransition(false); go("results"); }} />
        )}
        <div style={{ ...box, paddingTop: 80, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Mono s={60} breathing />
          <ProgressiveStatus />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ERROR
  // ═══════════════════════════════════════════════════════════
  if (page === "error") {
    return (
      <div style={shell}>
        <Head back />
        <div style={{ ...box, paddingTop: 48, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: V.warmBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}><AlertIc /></div>
          <h1 style={{ fontFamily: SF, fontSize: "1.15rem", fontWeight: 700, margin: "0 0 8px" }}>
            {error && (error.toLowerCase().includes("busy") || error.toLowerCase().includes("try again") || error.toLowerCase().includes("went wrong"))
              ? "Lizzie hit a snag"
              : "Lizzie couldn't read that"}
          </h1>
          <p style={{ fontSize: "0.9rem", color: V.inkM, margin: "0 0 6px", maxWidth: 340 }}>{error}</p>
          <p style={{ fontSize: "0.8rem", color: V.inkL, margin: "0 0 24px", maxWidth: 300 }}>Try a clearer photo, or paste the text instead.</p>
          <button onClick={() => go("input")} style={{ ...bm, maxWidth: 300 }}>Try again</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════
  if (page === "results" && results) {
    const r = results;

    return (
      <ErrorBoundary>
      <div style={shell}>
        <Head back /><LizziePromise /><Privacy /><Terms />
        <ConsentBanner />
        <div style={{ ...box, paddingTop: 4, paddingBottom: 48 }}>

          {/* Scam Shield — visually unmistakable caution, editorially neutral */}
          {r.scamWarning && (
            <div style={{
              background: V.amber, borderRadius: 16, padding: "18px 20px", marginBottom: 16,
              border: `1.5px solid ${V.amberBdr}`, boxShadow: `0 0 0 3px rgba(200,146,42,0.08)`,
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, marginTop: 1 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={V.amberBdr} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: "0.85rem", fontWeight: 800, color: V.amberTxt, letterSpacing: "-0.01em" }}>Check before acting</p>
                  <p style={{ margin: 0, fontSize: "0.83rem", lineHeight: 1.65, color: V.amberTxt }}>{r.scamWarning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Safe Error State — multilingual complexity guard */}
          {r.safeErrorState && r.detectedLanguage && (
            <div style={{
              background: V.mossFaint, borderRadius: 16, padding: "16px 20px", marginBottom: 16,
              border: `1px solid ${V.borderSoft}`,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={V.moss} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: "0 0 3px", fontSize: "0.8rem", fontWeight: 700, color: V.moss }}>Lizzie is being careful here</p>
                  <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.6, color: V.inkM }}>
                    This document uses technical language. To avoid getting anything wrong, Lizzie has explained the full detail in English, with a short summary in {r.detectedLanguage}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Multilingual indicator — standard (non-safe-error) */}
          {r.isMultilingual && !r.safeErrorState && r.detectedLanguage && (
            <div style={{
              background: V.mossFaint, borderRadius: 12, padding: "10px 16px", marginBottom: 14,
              border: `1px solid ${V.borderSoft}`, display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={V.moss} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <p style={{ margin: 0, fontSize: "0.75rem", color: V.inkM, fontWeight: 600 }}>
                Lizzie is explaining this in {r.detectedLanguage}. Draft replies are in English so the company understands you clearly.
              </p>
            </div>
          )}

          {/* Sensitive */}
          {r.sensitive && (
            <Card accent>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <AlertIc />
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, fontWeight: 600 }}>This looks like a sensitive document. Lizzie will guide you carefully.</p>
              </div>
            </Card>
          )}

          {/* DOCUMENT HEADER — entry point and orientation */}
          <div style={{
            padding: "22px 20px 18px",
            borderBottom: `1px solid ${V.rule}`,
            background: V.bg,
            animation: "fadeUp 0.45s ease 120ms both",
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.13em", textTransform: "uppercase",
              color: V.red, display: "block", marginBottom: 7,
            }}>
              {deriveDisplayHeading(r.bigPicture)}
            </span>
            <h1 style={{
              fontFamily: SF, fontWeight: 700, fontSize: 28,
              lineHeight: 1.18, color: V.ink, marginBottom: 6,
            }}>
              Here's what Lizzie found.
            </h1>
            <p style={{ fontSize: 13, color: V.sub }}>
              Analysed just now{r.pathways ? ` · ${Math.min(r.pathways.length, 3)} actions to consider` : ""}
            </p>
          </div>

          {/* 1. BIG PICTURE */}
          <Card title="The big picture" delay={0}>
            <p style={{ margin: "0 0 18px", fontFamily: SF, fontSize: 17, lineHeight: 1.55, fontWeight: 400, color: V.ink }}>{r.bigPicture}</p>
            {/* KEY FIGURES STRIP — surfaces the 3 numbers users need at a glance */}
            {r.keyFigures && r.keyFigures.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(r.keyFigures.length, 3)}, 1fr)`,
                background: V.surface2,
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 24,
              }}>
                {r.keyFigures.slice(0, 3).map((fig, i) => (
                  <div key={i} style={{
                    padding: "14px 14px 14px 16px",
                    borderLeft: i > 0 ? `0.5px solid ${V.hairline}` : "none",
                  }}>
                    <span style={{ fontSize: 11, color: V.sub, display: "block", marginBottom: 5, lineHeight: 1.3 }}>{fig.label}</span>
                    <div style={{
                      fontFamily: SF, fontWeight: 700,
                      fontSize: fig.isDeadline ? 18 : 22,
                      color: (fig.isAmount || fig.isDeadline) ? V.red : V.ink,
                    }}>{fig.value}</div>
                  </div>
                ))}
              </div>
            )}
            {r.emotionalSignal && (
              <div style={{
                margin: "0 0 24px",
                padding: "2px 0 2px 16px",
                borderLeft: `3px solid ${V.red}`,
              }}>
                <p style={{ margin: 0, fontFamily: BF, fontSize: 14, lineHeight: 1.65, fontWeight: 400, color: V.sub }}>{r.emotionalSignal}</p>
              </div>
            )}
          </Card>

          {/* 2. WHAT MATTERS — numbered key points */}
          {r.importantBit && (
            <Card title="What matters" delay={80}>
              {(() => {
                // Split the importantBit into sentences for numbered display.
                // If the model returns a single string, split on '. ' to create items.
                const raw = r.importantBit;
                const items = raw.includes('\n')
                  ? raw.split('\n').map(s => s.trim()).filter(Boolean)
                  : raw.split(/(?<=\.)\s+/).filter(s => s.length > 10).slice(0, 5);
                if (items.length <= 1) {
                  // Single item — render as plain text, no numbering
                  return <p style={{ margin: 0, fontFamily: BF, fontSize: 15, lineHeight: 1.62, fontWeight: 400, color: V.ink }}>{raw}</p>;
                }
                return items.map((item, idx) => (
                  <div key={idx} style={{
                    display: "flex", gap: 14, alignItems: "flex-start",
                    padding: idx === 0 ? "0 0 13px" : "13px 0",
                    borderBottom: idx < items.length - 1 ? `0.5px solid ${V.rule}` : "none",
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      border: `1.5px solid ${V.hairline}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <span style={{ fontFamily: BF, fontSize: 10, fontWeight: 700, color: V.sub }}>{idx + 1}</span>
                    </div>
                    <p style={{ margin: 0, fontFamily: BF, fontSize: 15, lineHeight: 1.62, color: V.ink }}>{(() => {
                      const dotIdx = item.indexOf(". ");
                      if (dotIdx === -1 || dotIdx > 60) return item;
                      const lead = item.slice(0, dotIdx + 1);
                      const body = item.slice(dotIdx + 2);
                      return <><strong>{lead}</strong> {body}</>;
                    })()}</p>
                  </div>
                ));
              })()}
            </Card>
          )}

          {/* EMOTIONAL ANCHOR — removed in v1.1.
               Previously read "You're not in immediate trouble. Here's what to do next."
               Removed because it can reassure users for documents (CCJs, short-deadline
               PCNs, HMRC compliance) where the sensitive flag doesn't fire reliably.
               If we need a calming line, generate it server-side from urgencyLevel. */}

          {/* 3. PATHWAYS */}
          {r.pathways && r.pathways.length > 0 && (
            <div style={{ padding: "28px 20px 32px", borderBottom: `1px solid ${V.rule}`, animation: "fadeUp 0.45s ease 160ms both" }}>

              {/* Section label */}
              <p style={{
                fontFamily: BF, fontSize: 11, fontWeight: 700,
                color: V.sub, margin: "0 0 18px",
                textTransform: "uppercase", letterSpacing: "0.13em",
              }}>What to do next</p>

              {r.pathways.slice(0, 3).map((p, i) => {
                const isOpen = selPw === i;
                const at = p.actionType || "none";
                const isFirst = i === 0;
                const stepNum = i + 1;

                // Inline action label — shown at title level without expansion
                // Only for email and link types that have a meaningful action
                const inlineActionLabel = at === "email"
                  ? (p.actionLabel || "Draft reply")
                  : at === "link"
                  ? (p.actionLabel || null)
                  : null;

                return (
                  <div key={i}>
                    <div onClick={() => setSelPw(isOpen ? null : i)} style={{
                      padding: isFirst ? "0 0 20px" : "18px 0 20px",
                      cursor: "pointer",
                      position: "relative",
                    }}>
                      {/* Thread connector between steps */}
                      {i < r.pathways.slice(0, 3).length - 1 && (
                        <div style={{
                          position: "absolute", left: 11, top: 28, width: 1, bottom: 4,
                          background: V.rule,
                        }} />
                      )}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          {/* Step number circle */}
                          <div style={{
                            width: 24, height: 24, borderRadius: "50%",
                            background: isFirst ? V.red : V.surface2,
                            border: isFirst ? "none" : `0.5px solid ${V.hairline}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{
                              fontFamily: BF, fontSize: 11, fontWeight: 700,
                              color: isFirst ? "#fff" : V.sub, lineHeight: 1,
                            }}>{stepNum}</span>
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          {/* "Start here" badge on first item only */}
                          {isFirst && !isOpen && (
                            <span style={{
                              display: "inline-block",
                              margin: "0 0 6px",
                              fontSize: 10, fontWeight: 700,
                              color: V.red,
                              background: "#FFF0F1",
                              borderRadius: 3,
                              padding: "3px 7px",
                              textTransform: "uppercase", letterSpacing: "0.1em",
                              fontFamily: BF,
                            }}>Start here</span>
                          )}
                          <p style={{ margin: "0 0 5px", fontSize: 15, fontWeight: 700, color: V.ink, fontFamily: BF, lineHeight: 1.3 }}>{p.title}</p>
                          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: V.sub, fontWeight: 400 }}>{p.detail}</p>
                          {p.outcome && !isOpen && (
                            <p style={{ margin: "8px 0 0", fontSize: 13, color: V.sub, fontWeight: 400, fontStyle: "italic", lineHeight: 1.5 }}>{p.outcome.replace(/\s+([.,;:!?])/g, "$1")}</p>
                          )}
                            {/* Inline action pill — visible without expanding */}
                            {inlineActionLabel && !isOpen && (
                              <div
                                onClick={(e) => { e.stopPropagation(); setSelPw(i); }}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  marginTop: 8,
                                  padding: "5px 10px",
                                  background: V.surface2,
                                  border: `0.5px solid ${V.hairline}`,
                                  borderRadius: 20,
                                  cursor: "pointer",
                                }}
                              >
                                <PenIc />
                                <span style={{
                                  fontFamily: BF, fontSize: "0.72rem", fontWeight: 700,
                                  color: V.inkM,
                                }}>
                                  {inlineActionLabel}
                                </span>
                              </div>
                            )}
                          </div>
                        {/* Chevron */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={V.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s ease" }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>

                      {/* Action — expanded */}
                      {isOpen && at !== "none" && (
                        <div style={{ marginTop: 14, marginLeft: 34 }} onClick={(e) => e.stopPropagation()}>
                          {at === "email" && (
                            <>
                              <a href={pwMailto(p)} style={{ ...bm, textDecoration: "none", color: "#fff", fontSize: "0.88rem" }}>
                                <SendIc /> {p.actionLabel || "Prepare email"}
                              </a>
                              <p style={{ margin: "8px 0 0", fontSize: "0.7rem", color: V.inkL, lineHeight: 1.65, textAlign: "center" }}>
                                Draft for your consideration. Review before sending.
                              </p>
                              {r.sensitive && (
                                <p style={{ margin: "6px 0 0", fontSize: "0.76rem", color: V.inkM, fontStyle: "italic", textAlign: "center" }}>That's a good first step. You've asked them to explain their position.</p>
                              )}
                            </>
                          )}
                          {at === "link" && (
                            <button onClick={() => handleCompare(p)} style={{ ...bm, fontSize: "0.88rem" }}>
                              <ExtIc /> {p.actionLabel || "Compare options"}
                            </button>
                          )}
                          {at === "account" && (
                            <a href={p.actionUrl || "#"} target="_blank" rel="noopener noreferrer" style={{ ...bm, textDecoration: "none", color: "#fff", fontSize: "0.88rem" }}>
                              <ExtIc /> {p.actionLabel || "Go to your account"}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Hairline divider between items */}
                    {i < r.pathways.slice(0, 3).length - 1 && (
                      <div style={{ height: "0.5px", background: V.hairline }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Caution note — always shown, #D70015 */}
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${V.rule}` }}>
            <p style={{ margin: 0, fontFamily: BF, fontSize: 12, color: V.red, fontWeight: 400, lineHeight: 1.5 }}>
              This is general guidance to help you think things through. You may want to speak to a professional before acting.
            </p>
          </div>

          {/* 4. DETAIL (collapsible) */}
          {r.threePoints && r.threePoints.length > 0 && (
            <Card>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: V.inkL, flexShrink: 0, marginTop: 8 }} />
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.7, color: V.inkM }}>{r.threePoints[0]}</p>
              </div>
              {!showDetail && r.threePoints.length > 1 && (
                <button onClick={() => setShowDetail(true)} style={{ fontFamily: BF, background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, color: V.moss, padding: "10px 0 0 15px" }}>See the detail</button>
              )}
              {showDetail && r.threePoints.slice(1).map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: V.inkL, flexShrink: 0, marginTop: 8 }} />
                  <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.7, color: V.inkM }}>{t}</p>
                </div>
              ))}
            </Card>
          )}

          {/* ─── COMMERCIAL ZONE ──────────────────────────────────────────
               THREE-ELEMENT LAYOUT:

               1. Slot 1 — CommercialSupportCard (CPA, category-matched)
                  Highest-value placement. Rendered FIRST at peak user intent —
                  immediately after pathways, before further content.
                  Copy written as a Lizzie recommendation, not an ad.
                  Suppressed for sensitive_immigration and benefit_overpayment.

               2. helpfulNextStep — Claude-generated contextual hint (optional)

               3. Authority Information Box — verified UK authority sources.

               4. Slot 2 — AdBanner (CPM, language-matched from AD_REGISTRY)
                  Non-English browsers: Wise international money transfer.
                  English browsers: MoneySupermarket comparison.
                  Support card shown instead for sensitive classifications.

               Position: after pathways, before Going further draft section. */}

          {/* Slot 1: CPA sponsor card — category-matched, Lizzie recommendation framing.
               Priority: server-provided categorySponsor (already routed correctly server-side).
               Fallback: client selectCPASponsor using docClassification.classification.
               The server is the single source of truth for contextual sponsor selection. */}
          {!COMMERCIAL_SUPPRESSED_CLASSIFICATIONS.has(r.docClassification?.classification) && (() => {
            const classification = r.docClassification?.classification;
            // Server categorySponsor is the single source of truth for Slot 1.
            // The server selects the contextual sponsor with full sub-type awareness
            // (employment high_stakes → Slater & Gordon, process → Acas, etc.).
            // selectCPASponsor is retained only as a last-resort safety net in case
            // the server response is missing categorySponsor entirely — which should
            // never happen in normal operation.
            const cpaSponsor = r.categorySponsor
              ? normaliseSponsor(r.categorySponsor)
              : normaliseSponsor(null);  // falls back to DEFAULT_FALLBACK_SPONSOR

            return (
              <CommercialSupportCard
                sponsor={cpaSponsor}
                userLang={effectiveLang}
                campaign={classification || "standard"}
                onImpression={() => {
                  if (!sponsorImpressed) {
                    setSponsorImpressed(true);
                    fireEvent("sponsor_impression", {
                      sponsor_name:     cpaSponsor.sponsor_name,
                      sponsor_tier:     cpaSponsor.sponsor_tier,
                      sponsor_category: cpaSponsor.sponsor_category,
                      user_language:    effectiveLang || "en",
                    });
                  }
                }}
              />
            );
          })()}

          {/* helpfulNextStep — REMOVED per review.
               The content under the former "Legal facts" / "Helpful context" label
               was model-generated and could imply legal advice. Removed entirely
               until content can be reviewed and reframed as non-advisory.
               The helpfulNextStep data is still returned by the API but not rendered. */}

          {/* AUTHORITY INFORMATION BOX — trust anchor between the two ad slots.
               Renders only when server-side detection has matched the document
               to a verified authoritative source (Ofgem, FCA, Citizens Advice,
               Financial Ombudsman, GOV.UK, Acas). Maximum 2 links. No filler,
               no heading label, no dividers. Binary: shown or not shown.
               Serves as a trust anchor between the primary and secondary ad. */}
          {Array.isArray(r.docClassification?.authorityLinks?.links) && r.docClassification.authorityLinks.links.length > 0 && (
            <div style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${V.rule}`,
              animation: "fadeUp 0.45s ease 280ms both",
            }}>
              <div style={{ background: V.paper, border: `0.5px solid ${V.hairline}`, borderRadius: 6, overflow: "hidden" }}>
              {r.docClassification.authorityLinks.links.slice(0, 2).map((link, i) => (
                <div key={i} style={{
                  padding: "14px 16px",
                  borderBottom: i < r.docClassification.authorityLinks.links.slice(0, 2).length - 1 ? `0.5px solid ${V.rule}` : "none",
                }}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => fireEvent("authority_link_click", { key: r.docClassification.authorityLinks.key, index: i })}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      textDecoration: "none", color: "inherit",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: "0 0 3px", fontFamily: BF, fontSize: 14, fontWeight: 600,
                        color: V.ink, lineHeight: 1.3,
                      }}>{link.label}</p>
                      <p style={{
                        margin: 0, fontFamily: BF, fontSize: 12, lineHeight: 1.5,
                        color: V.sub, fontWeight: 400,
                      }}>{link.rationale}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 12 }}>
                      <path d="M7 17L17 7"/><polyline points="7 7 17 7 17 17"/>
                    </svg>
                  </a>
                </div>
              ))}
              </div>
            </div>
          )}

          {/* Slot 2: CPM AdBanner — language-matched (Wise for non-English, MoneySupermarket for English).
               Support card shown instead for sensitive classifications. */}
          {!r.docClassification?.hidePlacement && (() => {
            const classification = r.docClassification?.classification;
            const placement = selectPlacement(classification, effectiveLang);

            if (placement.type === "support") {
              return (
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${V.rule}` }}>
                <SupportCard
                  entry={placement}
                  classification={classification}
                  userLang={effectiveLang}
                  onImpression={() => { if (!adImpressed) { setAdImpressed(true); fireSupportImpression(placement, classification, effectiveLang); } }}
                />
                </div>
              );
            }

            return (
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${V.rule}` }}>
              <div style={{ background: V.paper, border: `0.5px solid ${V.hairline}`, borderRadius: 6, padding: "18px 20px" }}>
              <AdBanner
                ad={placement}
                userLang={effectiveLang}
                slot="secondary"
                campaign={r.docClassification?.classification || "standard"}
                onImpression={() => { if (!adImpressed) { setAdImpressed(true); fireAdImpression(placement, effectiveLang); } }}
              />
              </div>
              </div>
            );
          })()}

          {/* ── GOING FURTHER — single draft reply with tone toggle ──────
               Appears only when complaintContext is detected.
               Document request drafts are handled inline at step level.
               Hierarchy: idle (invite) → loading → done (tone toggle + draft).  */}
          {r.complaintContext?.detected && draftState !== "dismissed" && (
            <div id="lizzie-draft-card" style={{ marginBottom: 16 }}>

              {/* Section divider + label — "Going further" */}
              <div style={{ height: "0.5px", background: V.hairline, margin: "8px 0 20px" }} />
              <p style={{
                fontFamily: BF, fontSize: "0.68rem", fontWeight: 800,
                color: V.inkM, margin: "0 0 14px",
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>Going further</p>

              {/* ── IDLE ── */}
              {draftState === "idle" && (
                <div style={{
                  background: V.card, borderRadius: 16,
                  border: `0.5px solid ${V.hairline}`,
                  padding: "18px 20px",
                  boxShadow: "0 0.5px 0 rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <p style={{
                    margin: "0 0 4px",
                    fontFamily: SF, fontSize: "1rem", fontWeight: 700,
                    color: V.ink, letterSpacing: "-0.01em", lineHeight: 1.3,
                  }}>Want Lizzie to draft a reply?</p>
                  <p style={{
                    margin: "0 0 14px",
                    fontFamily: BF, fontSize: "0.85rem", lineHeight: 1.6,
                    color: V.inkM, fontWeight: 400,
                  }}>
                    She'll write a clear, calm message you can send or adapt. You choose the tone after.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleDraft} style={{
                      ...bb, flex: 1,
                      background: V.red, color: "#fff",
                      padding: "14px 18px", fontSize: "0.88rem", fontWeight: 700,
                      borderRadius: 12,
                    }}>
                      <PenIc /> Draft a reply
                    </button>
                    <button onClick={() => setDraftState("dismissed")} style={{
                      ...bb, flex: "0 0 auto", width: "auto", padding: "14px 16px",
                      background: "transparent", border: `0.5px solid ${V.hairline}`,
                      fontSize: "0.82rem", color: V.inkL, borderRadius: 12,
                    }}>
                      Not needed
                    </button>
                  </div>
                </div>
              )}

              {/* ── LOADING ── */}
              {draftState === "loading" && (
                <div style={{
                  background: V.card, borderRadius: 16, padding: "28px 22px",
                  border: `0.5px solid ${V.hairline}`, textAlign: "center",
                  boxShadow: "0 0.5px 0 rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <Mono s={36} breathing />
                  <p style={{ margin: "14px 0 0", fontSize: "0.9rem", color: V.inkM, fontWeight: 600 }}>
                    Lizzie is drafting your message<Dots />
                  </p>
                </div>
              )}

              {/* ── DONE: tone toggle above, single draft below ── */}
              {draftState === "done" && draftVariants && (
                <div style={{ animation: "fadeUp 0.4s ease both" }}>

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{
                      fontFamily: BF, fontSize: "0.63rem", fontWeight: 700,
                      color: V.inkF, margin: 0,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                    }}>Your draft reply</p>
                    <button onClick={() => { setDraftState("idle"); setDraftVariants(null); }} style={{
                      fontFamily: BF, background: "none", border: "none", cursor: "pointer",
                      fontSize: "0.78rem", fontWeight: 600, color: V.inkL, padding: 0,
                    }}>Start again</button>
                  </div>

                  {/* Tone toggle — segmented control */}
                  <div style={{
                    display: "flex", gap: 4, marginBottom: 10,
                    background: V.surface2, borderRadius: 10, padding: "4px",
                  }}>
                    {draftVariants.map((v, i) => (
                      <button key={i} onClick={() => setActiveVariant(i)} style={{
                        fontFamily: BF, fontWeight: 700, fontSize: "0.8rem",
                        flex: 1, padding: "9px 6px", borderRadius: 7,
                        border: "none", cursor: "pointer",
                        background: activeVariant === i ? V.card : "transparent",
                        color: activeVariant === i ? V.ink : V.inkL,
                        boxShadow: activeVariant === i ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.15s ease",
                        lineHeight: 1.2,
                      }}>{v.label}</button>
                    ))}
                  </div>

                  {/* Active draft */}
                  {draftVariants[activeVariant] && (
                    <div style={{
                      background: V.card, borderRadius: 14,
                      border: `0.5px solid ${V.hairline}`,
                      overflow: "hidden",
                      boxShadow: "0 0.5px 0 rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
                    }}>
                      <div style={{ padding: "14px 18px 10px", borderBottom: `0.5px solid ${V.hairline}` }}>
                        <p style={{ margin: "0 0 2px", fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: V.inkF }}>Subject</p>
                        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: V.ink }}>{draftVariants[activeVariant].subject}</p>
                      </div>
                      <div style={{ padding: "14px 18px" }}>
                        <pre style={{
                          margin: 0, fontSize: "0.85rem", lineHeight: 1.8, color: V.inkM,
                          fontFamily: BF, whiteSpace: "pre-wrap", wordBreak: "break-word",
                        }}>{draftVariants[activeVariant].body}</pre>
                      </div>
                      <div style={{ padding: "0 18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <p style={{ margin: 0, fontSize: "0.72rem", color: V.inkL, lineHeight: 1.6, flex: 1, minWidth: 180 }}>
                          Review before sending. This is a starting point.
                        </p>
                        <button
                          onClick={() => handleCopy(`Subject: ${draftVariants[activeVariant].subject}\n\n${draftVariants[activeVariant].body}`, activeVariant)}
                          style={{
                            fontFamily: BF, fontWeight: 700, fontSize: "0.78rem",
                            background: copiedIdx === activeVariant ? V.ok : V.surface2,
                            color: copiedIdx === activeVariant ? "#fff" : V.moss,
                            border: `0.5px solid ${copiedIdx === activeVariant ? V.ok : V.hairline}`,
                            borderRadius: 10, padding: "9px 16px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <CopyIc /> {copiedIdx === activeVariant ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}

                  <p style={{ margin: "10px 0 0", fontSize: "0.7rem", color: V.inkF, lineHeight: 1.7, textAlign: "center" }}>
                    Lizzie does her best, but check the detail before you send.{" "}
                    <a href="/how-lizzie-works" style={{ color: V.inkF, textDecoration: "underline" }}>How Lizzie works</a>
                  </p>

                  {r.isMultilingual && r.multilingualDisclaimer && (
                    <div style={{ margin: "8px 0 0", padding: "10px 14px", background: V.mossFaint, borderRadius: 10, border: `0.5px solid ${V.hairline}` }}>
                      <p style={{ margin: 0, fontSize: "0.72rem", color: V.inkM, lineHeight: 1.7, fontStyle: "italic" }}>
                        {r.multilingualDisclaimer}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Document request draft — only renders when docReqState is loading or done.
               The idle state is handled inline at step level via the pill.
               This renders the draft output after the user clicks the inline pill. */}
          {r.documentRequestContext?.detected && docReqState !== "idle" && docReqState !== "dismissed" && (
            <div id="lizzie-docreq-card" style={{ marginBottom: 16 }}>

              {/* ── LOADING ── */}
              {docReqState === "loading" && (
                <div style={{
                  background: V.card, borderRadius: 16, padding: "28px 22px",
                  border: `0.5px solid ${V.hairline}`, textAlign: "center",
                  boxShadow: "0 0.5px 0 rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <Mono s={36} breathing />
                  <p style={{ margin: "14px 0 0", fontSize: "0.9rem", color: V.inkM, fontWeight: 600 }}>
                    Drafting your request<Dots />
                  </p>
                </div>
              )}

              {/* ── DONE ── */}
              {docReqState === "done" && docReqVariants && (
                <div style={{ animation: "fadeUp 0.4s ease both" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{
                      fontFamily: BF, fontSize: "0.63rem", fontWeight: 700,
                      color: V.inkF, margin: 0,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                    }}>Your document request</p>
                    <button onClick={() => { setDocReqState("idle"); setDocReqVariants(null); }} style={{
                      fontFamily: BF, background: "none", border: "none", cursor: "pointer",
                      fontSize: "0.78rem", fontWeight: 600, color: V.inkL, padding: 0,
                    }}>Start again</button>
                  </div>
                  <div style={{
                    display: "flex", gap: 4, marginBottom: 10,
                    background: V.surface2, borderRadius: 10, padding: "4px",
                  }}>
                    {docReqVariants.map((v, i) => (
                      <button key={i} onClick={() => setActiveDocReqVariant(i)} style={{
                        fontFamily: BF, fontWeight: 700, fontSize: "0.8rem",
                        flex: 1, padding: "9px 6px", borderRadius: 7,
                        border: "none", cursor: "pointer",
                        background: activeDocReqVariant === i ? V.card : "transparent",
                        color: activeDocReqVariant === i ? V.ink : V.inkL,
                        boxShadow: activeDocReqVariant === i ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.15s ease",
                        lineHeight: 1.2,
                      }}>{v.label}</button>
                    ))}
                  </div>
                  {docReqVariants[activeDocReqVariant] && (
                    <div style={{
                      background: V.card, borderRadius: 14,
                      border: `0.5px solid ${V.hairline}`,
                      overflow: "hidden",
                      boxShadow: "0 0.5px 0 rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
                    }}>
                      <div style={{ padding: "14px 18px 10px", borderBottom: `0.5px solid ${V.hairline}` }}>
                        <p style={{ margin: "0 0 2px", fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: V.inkF }}>Subject</p>
                        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: V.ink }}>{docReqVariants[activeDocReqVariant].subject}</p>
                      </div>
                      <div style={{ padding: "14px 18px" }}>
                        <pre style={{
                          margin: 0, fontSize: "0.85rem", lineHeight: 1.8, color: V.inkM,
                          fontFamily: BF, whiteSpace: "pre-wrap", wordBreak: "break-word",
                        }}>{docReqVariants[activeDocReqVariant].body}</pre>
                      </div>
                      <div style={{ padding: "0 18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <p style={{ margin: 0, fontSize: "0.72rem", color: V.inkL, lineHeight: 1.6, flex: 1, minWidth: 180 }}>
                          Review before sending. This is a starting point.
                        </p>
                        <button
                          onClick={() => handleCopyDocReq(
                            `Subject: ${docReqVariants[activeDocReqVariant].subject}\n\n${docReqVariants[activeDocReqVariant].body}`,
                            activeDocReqVariant
                          )}
                          style={{
                            fontFamily: BF, fontWeight: 700, fontSize: "0.78rem",
                            background: copiedDocReqIdx === activeDocReqVariant ? V.ok : V.surface2,
                            color: copiedDocReqIdx === activeDocReqVariant ? "#fff" : V.moss,
                            border: `0.5px solid ${copiedDocReqIdx === activeDocReqVariant ? V.ok : V.hairline}`,
                            borderRadius: 10, padding: "9px 16px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <CopyIc /> {copiedDocReqIdx === activeDocReqVariant ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}
                  <p style={{ margin: "10px 0 0", fontSize: "0.7rem", color: V.inkF, lineHeight: 1.7, textAlign: "center" }}>
                    Lizzie does her best, but check the detail before you send.{" "}
                    <a href="/how-lizzie-works" style={{ color: V.inkF, textDecoration: "underline" }}>How Lizzie works</a>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 5. ASK LIZZIE */}
          <button onClick={handleVoice} style={{ ...bg, marginBottom: 16, fontSize: "0.8rem", background: speaking ? V.mossFaint : "transparent", color: V.inkM, borderColor: V.borderSoft, letterSpacing: "0.02em" }}>
            <VoiceIc /> {speaking ? "Stop listening" : "Hear the summary"}
          </button>

          <div style={{ background: V.surface2, padding: "24px 20px", borderBottom: `1px solid ${V.rule}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={V.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontFamily: BF, fontSize: 15, fontWeight: 700, color: V.ink }}>Still unsure? <Wordmark size={15} /></span>
            </div>
            <p style={{ fontFamily: BF, fontSize: 13, color: V.sub, marginBottom: 14 }}>It might help to check:</p>
            {r.suggestedQuestions && r.suggestedQuestions.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                {r.suggestedQuestions.slice(0, 2).map((q, i) => (
                  <button key={i} onClick={() => handleFollow(q)} style={{
                    fontFamily: BF, fontSize: 13, fontWeight: 400,
                    background: V.bg, border: `0.5px solid ${V.hairline}`,
                    borderRadius: 6, padding: "11px 14px", cursor: "pointer",
                    color: V.ink, textAlign: "left", width: "100%",
                    lineHeight: 1.45, transition: "border-color 0.15s ease",
                    marginBottom: 8, display: "block",
                  }}>{q}</button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={fQ} onChange={(e) => setFQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleFollow(); }}
                placeholder="Type your question..." style={{ flex: 1, border: `0.5px solid ${V.hairline}`, borderRadius: 6, padding: "11px 14px", fontSize: 14, fontFamily: BF, color: V.ink, background: V.bg, outline: "none" }} />
              <button onClick={() => handleFollow()} disabled={!fQ.trim() || fLoad} style={{ background: V.red, color: "#fff", border: "none", borderRadius: 6, padding: "0 18px", fontFamily: BF, fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: fQ.trim() ? 1 : 0.35, whiteSpace: "nowrap", transition: "background 0.15s" }}>Ask</button>
            </div>
            {fLoad && <p style={{ margin: "12px 0 0", fontSize: 13, color: V.sub, fontStyle: "italic" }}>Lizzie is checking<Dots /></p>}
            {fA && (
              <div style={{ background: V.bg, borderRadius: 6, padding: "16px 18px", marginTop: 14, border: `0.5px solid ${V.hairline}` }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.62, color: V.ink }}>{fA.answer}</p>
                {fA.fromDocument !== false && (
                  <p style={{ margin: "10px 0 0", fontSize: 11, color: V.sub, fontStyle: "italic" }}>Based on the document you shared.</p>
                )}
              </div>
            )}
          </div>

          {/* 6. SHARE */}
          <div style={{
            borderTop: `0.5px solid ${V.hairline}`,
            paddingTop: 20, marginTop: 8, marginBottom: 4,
          }}>
            <p style={{
              fontFamily: BF, fontSize: "0.78rem", fontWeight: 600,
              color: V.inkL, margin: "0 0 4px", textAlign: "center",
            }}>Know someone dealing with something similar?</p>
            <p style={{
              fontFamily: BF, fontSize: "0.7rem", fontWeight: 400,
              color: V.inkF, margin: "0 0 10px", textAlign: "center", lineHeight: 1.5,
            }}>A short summary of what Lizzie told you will be included.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener" style={{ ...bg, flex: 1, textDecoration: "none", fontSize: "0.76rem", padding: "11px 8px", letterSpacing: "0.01em" }}>WhatsApp</a>
              <a href={`mailto:?subject=${encodeURIComponent("Lizzie helped me understand something")}&body=${encodeURIComponent(shareText)}`} style={{ ...bg, flex: 1, textDecoration: "none", fontSize: "0.76rem", padding: "11px 8px", letterSpacing: "0.01em" }}>Email</a>
              <a href={`sms:?body=${encodeURIComponent(shareText)}`} style={{ ...bg, flex: 1, textDecoration: "none", fontSize: "0.76rem", padding: "11px 8px", letterSpacing: "0.01em" }}>Text</a>
            </div>
          </div>

          {/* RESET — given context and slightly more presence */}
          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <p style={{
              fontFamily: BF, fontSize: "0.78rem", fontWeight: 500,
              color: V.inkL, margin: "0 0 10px", textAlign: "center",
            }}>Done with this one?</p>
            <button onClick={reset} style={{
              ...bg, fontSize: "0.88rem", letterSpacing: "0.01em",
              background: V.surface2, borderColor: V.hairline, color: V.inkM,
              fontWeight: 600,
            }}><PlusIc /> Ask Lizzie about another document</button>
          </div>

          {/* COMPLETION MOMENT — signals the end of the experience */}
          <div style={{ textAlign: "center", marginTop: 24, marginBottom: 8 }}>
            <div style={{ width: 32, height: "0.5px", background: V.hairline, margin: "0 auto 12px" }} />
            <p style={{ fontFamily: SF, fontSize: "0.9rem", fontWeight: 600, color: V.inkL, margin: 0, fontStyle: "italic", letterSpacing: "-0.01em" }}>
              That's everything Lizzie has on this one.
            </p>
          </div>

          {/* FEEDBACK — lightweight, never blocks, never stores */}
          <FeedbackRow
            responseId={responseId}
            classification={results?.docClassification?.classification || "standard"}
            employmentSubType={results?.docClassification?.employmentSubType || null}
          />

          <div style={{ padding: "18px 20px 24px", textAlign: "center" }}>
            {/* Wordmark */}
            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: 16, color: V.ink, marginBottom: 6, textAlign: "center" }}>
              <Wordmark size={16} />
            </p>
            <p style={{ fontSize: 11, color: V.sub, fontWeight: 400, margin: "0 0 4px", lineHeight: 1.6, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
              Lizzie provides general guidance, not legal or professional advice. For complex matters, always consult a qualified solicitor.
            </p>
            <p style={{ fontSize: 11, color: V.sub, margin: "0 0 14px" }}>
              <a href="/how-lizzie-works" style={{ color: V.sub, textDecoration: "underline", textUnderlineOffset: 2 }}>
                How Lizzie works
              </a>
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
              <button onClick={() => setShowPrivacy(true)} style={{ ...bb, background: "transparent", border: "none", fontSize: 11, color: V.sub, padding: 0, textDecoration: "underline", width: "auto" }}>Privacy</button>
              <button onClick={() => setShowTerms(true)} style={{ ...bb, background: "transparent", border: "none", fontSize: 11, color: V.sub, padding: 0, textDecoration: "underline", width: "auto" }}>Terms of use</button>
              <button onClick={() => { clearConsent(); revokeAnalytics(); window.location.reload(); }} style={{ ...bb, background: "transparent", border: "none", fontSize: 11, color: V.sub, padding: 0, textDecoration: "underline", width: "auto" }}>Reset analytics choice</button>
            </div>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  return null;
}
