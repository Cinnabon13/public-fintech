import { useEffect, useMemo, useState } from "react";
import "./App.css";

const PLAYBOOK = {
  SaaS: {
    checklist: [
      "Revenue growth: new vs expansion",
      "Net revenue retention (NRR) / churn proxies",
      "Gross margin & hosting costs",
      "Sales efficiency (CAC, payback, magic number proxies)",
      "R&D vs roadmap claims",
      "Deferred revenue & billings commentary",
      "Guidance + pipeline + seasonality",
      "Customer concentration & enterprise cycles",
    ],
    questions: [
      "What drove growth: seats, price, upsell, new logos?",
      "Any change in churn / downgrade behavior?",
      "Are they pulling demand forward with discounting?",
      "What is the biggest constraint: product, sales capacity, demand?",
      "How repeatable is the go-to-market motion?",
    ],
    redFlags: [
      "Revenue up but cash from ops down materially",
      "Huge jump in receivables / DSOs without clear reason",
      "‘Adjusted’ profits while SBC ramps",
      "Big guidance cuts with vague explanations",
    ],
  },
  Consumer: {
    checklist: [
      "Volume vs price mix",
      "Repeat rate / cohort retention proxies",
      "Gross margin: input costs, discounting",
      "Channel mix (online/offline, marketplaces)",
      "Marketing efficiency (ROAS proxies)",
      "Inventory & working capital",
      "Geography-wise performance",
      "Brand vs distribution dependence",
    ],
    questions: [
      "Is growth coming from demand or promotions?",
      "Are they gaining share or riding category tailwinds?",
      "What’s the repeat purchase story?",
      "What happens if marketing spend drops 20%?",
    ],
    redFlags: [
      "Inventory build-up + slowing sales",
      "Margin expansion driven only by price hikes",
      "Overdependence on one channel/marketplace",
    ],
  },
  Fintech: {
    checklist: [
      "Credit risk: delinquencies, write-offs (if lending)",
      "Take rate & pricing power",
      "Fraud + chargebacks + loss rates",
      "Regulatory changes impact",
      "Customer acquisition vs quality",
      "Contribution margin after incentives",
      "Partnership dependence (banks, networks)",
      "Seasonality & cohort performance",
    ],
    questions: [
      "What’s the real unit economics post incentives & losses?",
      "Any change in underwriting standards or mix shift?",
      "Where is growth coming from: new cohorts or reactivation?",
      "What is the regulatory single point of failure?",
    ],
    redFlags: [
      "Rapid growth + rising loss rates",
      "Opaque metrics; only ‘GMV’ without revenue quality",
      "Receivables / float behavior unexplained",
    ],
  },
  Manufacturing: {
    checklist: [
      "Capacity utilization & expansion plans",
      "Order book & pricing trends",
      "Raw material costs & pass-through ability",
      "Working capital cycle",
      "Export/FX exposure",
      "Capex intensity & ROCE",
      "Customer concentration",
      "Safety / compliance issues",
    ],
    questions: [
      "Is demand structural or cyclical?",
      "What’s the bottleneck: capacity, inputs, approvals?",
      "How sensitive is margin to commodities/FX?",
    ],
    redFlags: [
      "Capex spike without ROCE plan",
      "Receivables ballooning",
      "Aggressive revenue recognition language",
    ],
  },
};

function extractSignals(text) {
  const t = (text || "").toLowerCase();
  const hits = [];

  const rules = [
    { key: "pricing", words: ["price increase", "pricing", "discount", "promotion"] },
    { key: "demand", words: ["demand", "slowdown", "weakness", "pipeline"] },
    { key: "guidance", words: ["guidance", "outlook", "revised", "range"] },
    { key: "margin", words: ["gross margin", "margin", "cost pressure", "operating leverage"] },
    { key: "cash", words: ["cash flow", "working capital", "receivables", "inventory"] },
    { key: "risk", words: ["regulatory", "litigation", "fraud", "default", "delinquency"] },
    { key: "competition", words: ["competitive", "market share", "pricing pressure"] },
  ];

  rules.forEach((r) => {
    if (r.words.some((w) => t.includes(w))) hits.push(r.key);
  });

  return Array.from(new Set(hits));
}

export default function App() {
  const [companyType, setCompanyType] = useState("SaaS");
  const [notes, setNotes] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("earningsBrief:v1");
    if (saved) {
      const data = JSON.parse(saved);
      setCompanyType(data.companyType || "SaaS");
      setNotes(data.notes || "");
      setExcerpt(data.excerpt || "");
      setCompanyName(data.companyName || "");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "earningsBrief:v1",
      JSON.stringify({ companyType, notes, excerpt, companyName })
    );
  }, [companyType, notes, excerpt, companyName]);

  const play = PLAYBOOK[companyType];

  const signals = useMemo(() => extractSignals(excerpt), [excerpt]);

  const suggestedQuestions = useMemo(() => {
    const base = [...play.questions];
    if (signals.includes("cash")) base.unshift("Walk me through cash conversion vs reported profits. What changed?");
    if (signals.includes("guidance")) base.unshift("What assumptions drive guidance? What would make you miss it?");
    if (signals.includes("pricing")) base.unshift("How much of growth/margins is price vs volume? Any pushback?");
    if (signals.includes("risk")) base.unshift("What’s the top risk that keeps you up at night and how are you mitigating it?");
    return Array.from(new Set(base)).slice(0, 10);
  }, [play.questions, signals]);

  function exportNotes() {
    const content = [
      `Company: ${companyName || "(not set)"}`,
      `Type: ${companyType}`,
      `--- EXCERPT ---`,
      excerpt || "(empty)",
      `--- NOTES ---`,
      notes || "(empty)",
      `--- CHECKLIST ---`,
      play.checklist.map((x) => `- ${x}`).join("\n"),
      `--- QUESTIONS ---`,
      suggestedQuestions.map((x) => `- ${x}`).join("\n"),
    ].join("\n\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(companyName || "earnings-brief").replaceAll(" ", "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ marginBottom: 4 }}>Earnings Brief</h1>
      <div style={{ opacity: 0.75, marginBottom: 20 }}>
        Paste any excerpt from an annual report / quarterly results / AGM transcript and get an analyst-ready checklist + questions.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Company name</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., HDFC Life / Zomato / Freshworks"
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Company type</label>
          <select
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          >
            {Object.keys(PLAYBOOK).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            Paste excerpt (AR/QR/AGM/results commentary)
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Paste a paragraph or two…"
            rows={10}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />

          <label style={{ display: "block", fontSize: 12, opacity: 0.7, margin: "14px 0 6px" }}>
            Your notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your thesis, what changed, what you believe…"
            rows={6}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={exportNotes}
              style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", cursor: "pointer" }}
            >
              Export to .txt
            </button>
            <button
              onClick={() => { setExcerpt(""); setNotes(""); }}
              style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", cursor: "pointer" }}
            >
              Clear
            </button>
          </div>
        </div>

        <div>
          <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Detected signals</div>
            {signals.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {signals.map((s) => (
                  <span key={s} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #ddd" }}>
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ opacity: 0.7 }}>No obvious keywords yet — paste more text.</div>
            )}
          </div>

          <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Checklist</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {play.checklist.map((c) => <li key={c} style={{ marginBottom: 6 }}>{c}</li>)}
            </ul>
          </div>

          <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Questions to ask management</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {suggestedQuestions.map((q) => <li key={q} style={{ marginBottom: 6 }}>{q}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, opacity: 0.65, fontSize: 12 }}>
        Saved locally in your browser (no server). Version: v1.
      </div>
    </div>
  );

}

