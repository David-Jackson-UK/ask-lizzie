import Link from "next/link";

export const metadata = {
  title: "How Lizzie works | Ask Lizzie",
  description: "How Lizzie uses AI to help with everyday documents, and what to keep in mind.",
};

const V = {
  parchment: "#F7F3F0", card: "#FFF", ink: "#1A1A1A", inkM: "#4A4A4A",
  inkL: "#7A7A7A", inkF: "#A8A8A8", moss: "#3E4B42", mossDk: "#2F3A32",
  mossFaint: "#F2F5F3", borderSoft: "#EBE7E3", warm: "#C4956A",
};
const SF = "'Playfair Display',Georgia,serif";
const BF = "'Nunito',Arial,sans-serif";

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{
        fontFamily: SF, fontSize: "1.1rem", fontWeight: 700, color: V.ink,
        margin: "0 0 12px", letterSpacing: "-0.02em", lineHeight: 1.3,
      }}>{title}</h2>
      <div style={{ fontFamily: BF, fontSize: "0.9rem", lineHeight: 1.75, color: V.inkM }}>
        {children}
      </div>
    </div>
  );
}

function Rule({ children }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%", background: V.moss,
        flexShrink: 0, marginTop: 8,
      }} />
      <p style={{ margin: 0, fontFamily: BF, fontSize: "0.9rem", lineHeight: 1.75, color: V.inkM }}>
        {children}
      </p>
    </div>
  );
}

export default function HowLizzieWorks() {
  return (
    <div style={{ fontFamily: BF, minHeight: "100vh", background: V.parchment }}>

      {/* Header */}
      <div style={{ background: V.card, borderBottom: `1px solid ${V.borderSoft}`, padding: "20px 24px 16px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <Link href="/" style={{ fontFamily: BF, fontSize: "0.8rem", fontWeight: 700, color: V.moss, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: V.parchment,
              border: `2px solid ${V.ink}`, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: SF, fontSize: 20, fontWeight: 700, color: V.ink, flexShrink: 0,
            }}>L</div>
            <div>
              <h1 style={{ fontFamily: SF, fontSize: "1.25rem", fontWeight: 700, color: V.ink, margin: 0, letterSpacing: "-0.02em" }}>
                How Lizzie works
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: V.inkL, fontWeight: 500 }}>
                And some important things to keep in mind
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* Intro */}
        <div style={{
          background: V.mossFaint, borderRadius: 16, padding: "22px 24px", marginBottom: 32,
          border: `1px solid ${V.borderSoft}`,
        }}>
          <p style={{ margin: 0, fontFamily: BF, fontSize: "0.92rem", lineHeight: 1.75, color: V.inkM, fontWeight: 500 }}>
            Lizzie is here to help you make sense of confusing letters, bills, and documents. She reads what you share, explains it in plain English, and suggests sensible next steps. She is not a lawyer or financial adviser, and she is not infallible. This page explains how she works and where her limits are.
          </p>
        </div>

        <Section title="What Lizzie does">
          <p style={{ margin: "0 0 12px" }}>
            Lizzie uses artificial intelligence to read documents you share with her. She analyses the content, explains what it means in straightforward language, and suggests what people typically do next in similar situations.
          </p>
          <p style={{ margin: 0 }}>
            She can help with bills, letters, parking notices, subscription renewals, debt letters, and a range of other everyday documents. She is designed to give you a clearer picture so you can make a more confident decision.
          </p>
        </Section>

        <Section title="What to keep in mind">
          <Rule>Lizzie's responses are based only on what she can see in the document you share. If a document is unclear, incomplete, or contains errors, her response may reflect that.</Rule>
          <Rule>AI can make mistakes. Lizzie may occasionally misread, misinterpret, or miss something. Her analysis is a starting point, not a final answer.</Rule>
          <Rule>She does not have access to your account history, previous correspondence, or any context beyond what you provide. The more clearly something is written in the document, the better she can work with it.</Rule>
          <Rule>Responses may sometimes be incomplete. Complex or ambiguous documents are harder for any system to interpret reliably.</Rule>
        </Section>

        <Section title="Draft emails and letters">
          <p style={{ margin: "0 0 12px" }}>
            When Lizzie suggests a draft email or letter, it is a starting point. It is written to be neutral, polite, and position-preserving. Before you send anything, please read it carefully.
          </p>
          <Rule>Check that the details are correct, including names, references, and dates.</Rule>
          <Rule>Adjust the tone or content to fit your situation and relationship with the organisation.</Rule>
          <Rule>If the situation is serious, consider having a professional review it before sending.</Rule>
          <p style={{ margin: "12px 0 0" }}>
            A draft is not a finished letter. It is a template to help you get started.
          </p>
        </Section>

        <Section title="Review before acting">
          <p style={{ margin: 0 }}>
            Always review Lizzie's output carefully before doing anything, particularly if money, legal rights, or formal processes are involved. If something feels wrong or uncertain, trust that instinct and look into it further. Lizzie is here to help you think, not to think for you.
          </p>
        </Section>

        <Section title="Lizzie guides, she does not advise">
          <p style={{ margin: "0 0 12px" }}>
            There is an important difference between guidance and advice. Lizzie helps you understand a situation and consider your options. She does not tell you what to do, and her responses should not be treated as legal, financial, or professional advice.
          </p>
          <p style={{ margin: 0 }}>
            If your situation involves significant money, legal proceedings, employment rights, or anything where getting it wrong could seriously affect you, please speak to a qualified professional. Citizens Advice, a solicitor, an accountant, or a relevant regulator may all be able to help depending on the situation.
          </p>
        </Section>

        <Section title="Your privacy">
          <p style={{ margin: 0 }}>
            Lizzie does not store the documents you share. Your document is used to generate a response and then discarded. Nothing is retained. You can read more in the privacy information available within the app.
          </p>
        </Section>

        <Section title="Documents in other languages">
          <p style={{ margin: "0 0 12px" }}>
            Lizzie can read documents written in languages other than English, including Spanish, French, German, Polish, Romanian, Portuguese, Arabic, Urdu, Hindi, Chinese, Bengali, and Somali. When she detects a non-English document, she explains the situation in that language wherever she can.
          </p>
          <Rule>Lizzie's explanations in other languages are AI-generated guides, not official or certified translations, and may not be suitable for simplified AI-guided interpretation of complex or specialist documents. The original English document remains the only authoritative version.</Rule>
          <Rule>For complex or technical documents in another language, Lizzie may explain the situation in English and provide a short summary in your language. This is a safety measure to avoid getting something important wrong.</Rule>
          <Rule>Draft reply emails are always written in English so the organisation you are writing to can understand your position clearly.</Rule>
          <Rule>If you are unsure about anything in Lizzie's explanation, please check with a fluent speaker or a professional before acting.</Rule>
        </Section>

        {/* Limitations anchor for disclaimer links */}
        <div id="limitations">
          <Section title="Limitations and important disclaimer">
            <p style={{ margin: "0 0 12px" }}>
              Lizzie is an AI-powered guidance tool. She is designed to be useful, careful, and honest about what she does not know. But she has real limitations that you should be aware of.
            </p>
            <Rule>Lizzie may misread, misinterpret, or miss information, particularly in complex, technical, or ambiguous documents.</Rule>
            <Rule>Her analysis is based only on what you share with her. She has no access to your history, previous correspondence, or wider context.</Rule>
            <Rule>Date calculations are handled carefully, but if a document is ambiguous about deadlines, Lizzie will say so rather than guess.</Rule>
            <Rule>Lizzie does not provide legal, financial, or professional advice. Her responses are guidance to help you think through a situation, not instructions to follow.</Rule>
            <Rule>Lizzie's explanations in languages other than English are AI-assisted guides and may not be suitable for simplified AI-guided interpretation of complex or specialist documents, not certified translations.</Rule>
            <p style={{ margin: "12px 0 0" }}>
              Always review what Lizzie tells you before acting, especially where money, legal matters, or formal processes are involved. When in doubt, seek professional advice.
            </p>
          </Section>
        </div>

        {/* Closing note */}
        <div style={{
          borderTop: `1px solid ${V.borderSoft}`, paddingTop: 28, marginTop: 8,
          textAlign: "center",
        }}>
          <p style={{ fontFamily: BF, fontSize: "0.82rem", lineHeight: 1.7, color: V.inkL, margin: "0 0 20px", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            Lizzie is built to be useful, honest, and careful. She will always try to give you a clear, considered response. She asks only that you do the same before acting on it.
          </p>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: BF, fontWeight: 700, fontSize: "0.88rem", color: "#fff",
            background: V.moss, borderRadius: 14, padding: "14px 24px",
            textDecoration: "none", transition: "background 0.15s ease",
          }}>
            Back to Lizzie
          </Link>
        </div>

      </div>
    </div>
  );
}
