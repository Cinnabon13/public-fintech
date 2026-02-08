import { useEffect, useMemo, useState } from "react";

/**
 * Earnings Brief / Company Ramp Tool (VC analyst, 1-hour ramp)
 * - Sector-specific checklist + KPIs + failure modes
 * - Paste excerpts from AR/QR/AGM/transcripts
 * - Build a "Ramp Brief" (bull/base/bear, risks, what to track)
 * - Export as .md or .txt
 *
 * No "questions to management" — purely analyst ramp.
 */

const SECTORS = [
  "Fintech",
  "SaaS",
  "Consumer/D2C",
  "Industrials/Manufacturing",
  "Healthcare",
  "Telecom/Internet",
  "Energy/Materials",
];

const DOC_TYPES = [
  "Quarterly Results",
  "Annual Report",
  "AGM / Transcript",
  "Investor Presentation",
];

const SECTOR_TEMPLATES = {
  Fintech: {
    kpis: [
      "Take rate / net revenue yield",
      "Contribution margin after incentives",
      "Cohort quality (repeat %, retention proxy)",
      "Loss rates / delinquencies (if credit exposure)",
      "Fraud/chargebacks/losses",
      "CAC/payback proxy (sales+marketing vs net adds)",
      "Regulatory exposure (top dependency)",
    ],
    checklist: [
      "What product, who pays, where is pricing power?",
      "Revenue drivers: volume vs take-rate vs mix",
      "Incentive dependence: does growth fall off without subsidies?",
      "Unit economics after losses/fraud/incentives (not just GMV)",
      "Risk: credit/fraud/regulatory — what is the single point of failure?",
      "Distribution: partnerships/banks/networks — concentration risk",
      "Cash conversion: does reported profit translate to cash?",
    ],
    redFlags: [
      "Only GMV growth, unclear net revenue / contribution",
      "Rapid growth + rising loss rates / fraud signals",
      "Regulatory reliance not clearly mitigated",
      "Receivables/float changes unexplained",
      "‘Adjusted’ profits while cash burn worsens",
    ],
    failureModes: [
      "Regulatory clampdown changes unit economics",
      "Incentive wars compress take rates/margins",
      "Fraud/losses spike as cohorts weaken",
      "Distribution partner changes terms / drops support",
    ],
  },

  SaaS: {
    kpis: [
      "Revenue growth split: new vs expansion",
      "NRR / retention proxy (logos, ARR, churn commentary)",
      "Gross margin + hosting costs",
      "Sales efficiency (CAC/payback proxy; S&M vs growth)",
      "R&D vs roadmap velocity (product cadence)",
      "Billings / deferred revenue trend (if disclosed)",
      "Rule of 40 proxy (growth + FCF margin)",
    ],
    checklist: [
      "What is the wedge product and why customers stay (switching costs)?",
      "Growth quality: expansion vs new logos; churn signals",
      "Margin structure: can GM expand with scale?",
      "Sales motion: repeatable vs bespoke enterprise selling",
      "Cash flow vs adjusted margins (SBC, capitalization)",
      "Competitive pressure: pricing/seat compression, bundling threats",
      "Guidance credibility: track record and assumptions",
    ],
    redFlags: [
      "Churn rising or expansion slowing (even if not explicit)",
      "Discounting to sustain growth",
      "SBC rising fast while 'adjusted' profits look good",
      "Receivables spike; DSO deterioration",
      "Big guidance cut + vague language",
    ],
    failureModes: [
      "Market saturates; expansion decelerates",
      "Bundling/competition compresses pricing",
      "Sales efficiency deteriorates as easy buyers exhausted",
      "Product gap → churn / down-sell",
    ],
  },

  "Consumer/D2C": {
    kpis: [
      "Volume vs price vs mix (growth bridge)",
      "Gross margin (input costs, discounting impact)",
      "Repeat purchase / retention proxy",
      "Marketing efficiency proxy (S&M vs incremental revenue)",
      "Channel mix (D2C vs marketplace vs offline)",
      "Inventory days / working capital cycle",
      "Geography/product concentration",
    ],
    checklist: [
      "Is growth real demand or promotion-led?",
      "How strong is brand vs distribution dependence?",
      "Are margins expanding structurally or via temporary price hikes?",
      "Is repeat improving? Any cohort signals?",
      "Inventory discipline: build-up vs sell-through",
      "Channel risk: dependence on one marketplace/channel",
      "Cash conversion and working capital stability",
    ],
    redFlags: [
      "Inventory builds while sales slow",
      "Growth sustained primarily via discounting",
      "Margin expansion only from price hikes",
      "Channel concentration risk",
      "High marketing intensity without durable repeat",
    ],
    failureModes: [
      "Brand demand weakens → constant promotions required",
      "Input costs rise; pricing power insufficient",
      "Channel algorithm/fees change (marketplace dependence)",
      "Inventory mis-forecast → cash crunch",
    ],
  },

  "Industrials/Manufacturing": {
    kpis: [
      "Capacity utilization",
      "Order book / backlog coverage",
      "Pricing vs raw-material cost pass-through",
      "Working capital cycle (inventory/receivables/payables)",
      "ROCE/ROIC and capex intensity",
      "Export/FX exposure",
      "Customer concentration",
    ],
    checklist: [
      "Is demand cyclical or structural? What end-markets matter most?",
      "Capacity and bottlenecks: what limits growth?",
      "Margin drivers: mix, pricing, input costs",
      "Working capital discipline (big swing risk)",
      "Capital allocation: capex rationale, ROCE path",
      "Customer concentration and contract duration",
      "Compliance/safety risks and any contingencies",
    ],
    redFlags: [
      "Capex spike without clear ROCE plan",
      "Receivables ballooning; delayed collections",
      "Aggressive revenue recognition language",
      "Order book weakening while capacity expands",
      "Working capital consumes cash despite profits",
    ],
    failureModes: [
      "Demand downcycle hits utilization and margins",
      "Capex overshoots demand → ROCE collapses",
      "Input cost shock; weak pass-through",
      "Customer concentration leads to volume cliff",
    ],
  },

  Healthcare: {
    kpis: [
      "Revenue split: products/segments/geos",
      "Gross margin by product mix",
      "R&D intensity and pipeline milestones",
      "Regulatory approvals / compliance status",
      "Pricing pressure / reimbursement exposure",
      "Working capital (receivables, inventory)",
      "Litigation/contingent liabilities",
    ],
    checklist: [
      "What is the core driver: portfolio, pipeline, or distribution?",
      "Regulatory/compliance: key approvals, observations, remediation",
      "Pricing pressure: reimbursement, tenders, generics/competition",
      "Product mix: margin quality and sustainability",
      "R&D productivity: milestones, time-to-value",
      "Risk map: litigation, recalls, quality issues",
      "Cash conversion and capital discipline",
    ],
    redFlags: [
      "Regulatory observations without clear remediation timeline",
      "Overdependence on a single molecule/product",
      "Pricing pressure not addressed",
      "Contingent liabilities rising",
      "Inventory issues (expiry/obsolescence risk)",
    ],
    failureModes: [
      "Regulatory event (warning letter/ban) disrupts supply",
      "Key product faces price erosion / competition",
      "Pipeline misses or delays",
      "Quality issues lead to recalls and trust loss",
    ],
  },

  "Telecom/Internet": {
    kpis: [
      "ARPU / revenue per user",
      "Subscriber adds / churn",
      "Network / infra capex intensity",
      "Content costs (if relevant) and margin impact",
      "Unit economics by segment (if disclosed)",
      "Debt/leverage and interest coverage",
      "Cash flow vs capex (FCF profile)",
    ],
    checklist: [
      "Growth: subscribers vs ARPU vs usage",
      "Churn dynamics and retention levers",
      "Cost structure: network, content, support",
      "Capex cycle: is peak capex behind or ahead?",
      "Competition: pricing pressure and market structure",
      "Leverage: balance sheet resilience",
      "Cash conversion after capex and working capital",
    ],
    redFlags: [
      "ARPU down while competition intensifies",
      "High leverage + rising capex needs",
      "Churn rising with weak retention narrative",
      "FCF negative without clear capex normalization plan",
      "Aggressive adjusted metrics vs weak cash",
    ],
    failureModes: [
      "Price wars compress ARPU",
      "Capex blows out (spectrum/network) → leverage stress",
      "Customer churn spikes as competitors bundle",
      "Regulatory pricing/fees change unit economics",
    ],
  },

  "Energy/Materials": {
    kpis: [
      "Realized price vs benchmark",
      "Volume and capacity utilization",
      "Input cost sensitivity (commodities/energy)",
      "Operating leverage / margin cyclicality",
      "Capex plans and payback",
      "Balance sheet resilience (net debt/EBITDA)",
      "ESG/regulatory exposure",
    ],
    checklist: [
      "Where are we in the commodity cycle? What’s the sensitivity?",
      "Pricing: realizations vs benchmark; contract structure",
      "Cost curve position: are they low-cost producer?",
      "Capex: timing, payback, and cycle risk",
      "Hedging policy and risk management (if relevant)",
      "Regulatory/ESG constraints and liabilities",
      "Liquidity and downside survival scenario",
    ],
    redFlags: [
      "Capex expansion at cycle peak",
      "High leverage in a cyclical business",
      "Cost inflation with weak pricing power",
      "Large environmental liabilities",
      "Working capital swings not explained",
    ],
    failureModes: [
      "Commodity downturn collapses margins",
      "Capex committed at wrong part of cycle",
      "Regulatory/ESG restrictions raise costs or limit output",
      "Input shock compresses spreads",
    ],
  },
};

const SIGNAL_RULES = [
  { key: "guidance", label: "Guidance / outlook", words: ["guidance", "outlook", "revised", "range", "visibility"] },
  { key: "pricing", label: "Pricing / discounting", words: ["price", "pricing", "discount", "promotion", "rebate"] },
  { key: "margin", label: "Margins / cost pressure", words: ["gross margin", "margin", "cost pressure", "operating leverage", "input cost"] },
  { key: "cash", label: "Cash / working capital", words: ["cash flow", "working capital", "receivables", "inventory", "payables"] },
  { key: "demand", label: "Demand / backlog", words: ["demand", "slowdown", "weakness", "pipeline", "order book", "backlog"] },
  { key: "risk", label: "Regulatory / legal / risk", words: ["regulatory", "litigation", "fraud", "default", "delinquency", "compliance"] },
  { key: "competition", label: "Competition", words: ["competitive", "market share", "pricing pressure", "competition"] },
  { key: "capex", label: "Capex / capacity", words: ["capex", "capacity", "utilization", "expansion", "plant"] },
  { key: "dilution", label: "Dilution / SBC", words: ["stock-based", "sbc", "dilution", "esop"] },
];

function detectSignals(text) {
  const t = (text || "").toLowerCase();
  const hits = [];
  SIGNAL_RULES.forEach((r) => {
    if (r.words.some((w) => t.includes(w))) hits.push(r.key);
  });
  return Array.from(new Set(hits));
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Pill({ children }) {
  return (
    <span style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #ddd", fontSize: 12 }}>
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 14, marginBottom: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("Ramp Brief"); // Ramp Brief | Signals | Checklist

  // Top metadata
  const [company, setCompany] = useState("");
  const [ticker, setTicker] = useState("");
  const [sector, setSector] = useState("Fintech");
  const [docType, setDocType] = useState("Quarterly Results");

  // Source text
  const [excerpt, setExcerpt] = useState("");

  // Ramp brief fields
  const [businessModel, setBusinessModel] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [keyNumbers, setKeyNumbers] = useState({
    revenue: "",
    growth: "",
    grossMargin: "",
    ebitda: "",
    cfo: "",
    netDebt: "",
  });
  const [bull, setBull] = useState("");
  const [bear, setBear] = useState("");
  const [risks, setRisks] = useState("");
  const [whatToTrack, setWhatToTrack] = useState("");

  // Load/save locally
  useEffect(() => {
    const saved = localStorage.getItem("companyRamp:v1");
    if (saved) {
      const d = JSON.parse(saved);
      setTab(d.tab || "Ramp Brief");
      setCompany(d.company || "");
      setTicker(d.ticker || "");
      setSector(d.sector || "Fintech");
      setDocType(d.docType || "Quarterly Results");
      setExcerpt(d.excerpt || "");
      setBusinessModel(d.businessModel || "");
      setWhatChanged(d.whatChanged || "");
      setKeyNumbers(d.keyNumbers || { revenue: "", growth: "", grossMargin: "", ebitda: "", cfo: "", netDebt: "" });
      setBull(d.bull || "");
      setBear(d.bear || "");
      setRisks(d.risks || "");
      setWhatToTrack(d.whatToTrack || "");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "companyRamp:v1",
      JSON.stringify({
        tab, company, ticker, sector, docType,
        excerpt, businessModel, whatChanged, keyNumbers,
        bull, bear, risks, whatToTrack,
      })
    );
  }, [tab, company, ticker, sector, docType, excerpt, businessModel, whatChanged, keyNumbers, bull, bear, risks, whatToTrack]);

  const template = SECTOR_TEMPLATES[sector];
  const signals = useMemo(() => detectSignals(excerpt), [excerpt]);

  const filenameBase = useMemo(() => {
    const base = (company || "company_ramp").toLowerCase().replaceAll(" ", "_");
    return ticker ? `${base}_${ticker.toLowerCase().replaceAll(" ", "_")}` : base;
  }, [company, ticker]);

  const suggestedTrack = useMemo(() => {
    // If user already filled whatToTrack, keep it. Otherwise suggest sector KPIs + detected-signal nudges.
    const items = new Set(template.kpis);
    if (signals.includes("cash")) items.add("Cash conversion / working capital trend");
    if (signals.includes("margin")) items.add("Gross margin drivers (mix vs pricing vs costs)");
    if (signals.includes("pricing")) items.add("Pricing / discounting intensity");
    if (signals.includes("risk")) items.add("Regulatory / legal exposure updates");
    if (signals.includes("capex")) items.add("Capex/capacity utilization and returns");
    if (signals.includes("dilution")) items.add("SBC/dilution trend and FCF impact");
    return Array.from(items).slice(0, 10);
  }, [template.kpis, signals]);

  function exportRamp(kind = "md") {
    const header =
      `${company || "Company"} ${ticker ? `(${ticker})` : ""}\n` +
      `Sector: ${sector}\n` +
      `Doc: ${docType}`;

    const numbersBlock =
      `Revenue: ${keyNumbers.revenue || "-"}\n` +
      `Growth: ${keyNumbers.growth || "-"}\n` +
      `Gross Margin: ${keyNumbers.grossMargin || "-"}\n` +
      `EBITDA / Operating Profit: ${keyNumbers.ebitda || "-"}\n` +
      `Cash from Ops: ${keyNumbers.cfo || "-"}\n` +
      `Net Debt / Net Cash: ${keyNumbers.netDebt || "-"}`;

    const trackBlock = (whatToTrack || "").trim()
      ? whatToTrack.trim()
      : suggestedTrack.map((x) => `- ${x}`).join("\n");

    if (kind === "md") {
      const md =
        `# ${company || "Company"} ${ticker ? `(${ticker})` : ""}\n\n` +
        `**Sector:** ${sector}  \n` +
        `**Doc:** ${docType}\n\n` +
        `## Business model (plain English)\n${businessModel || "-"}\n\n` +
        `## What changed (this period)\n${whatChanged || "-"}\n\n` +
        `## Key numbers\n- Revenue: ${keyNumbers.revenue || "-"}\n- Growth: ${keyNumbers.growth || "-"}\n- Gross Margin: ${keyNumbers.grossMargin || "-"}\n- EBITDA / Operating Profit: ${keyNumbers.ebitda || "-"}\n- Cash from Ops: ${keyNumbers.cfo || "-"}\n- Net Debt / Net Cash: ${keyNumbers.netDebt || "-"}\n\n` +
        `## Bull case (why it wins)\n${bull || "-"}\n\n` +
        `## Bear case (how it breaks)\n${bear || "-"}\n\n` +
        `## Risks / watchouts\n${risks || "-"}\n\n` +
        `## What to track next 2 quarters\n${trackBlock || "-"}\n\n` +
        `## Sector checklist (1-hour ramp)\n${template.checklist.map((c) => `- ${c}`).join("\n")}\n\n` +
        `## Common red flags\n${template.redFlags.map((c) => `- ${c}`).join("\n")}\n\n` +
        `## Failure modes to sanity-check\n${template.failureModes.map((c) => `- ${c}`).join("\n")}\n\n` +
        `## Source excerpt (pasted)\n${excerpt || "-"}`;
      downloadFile(`${filenameBase}.md`, md);
    } else {
      const txt =
        `${header}\n\n` +
        `BUSINESS MODEL\n${businessModel || "-"}\n\n` +
        `WHAT CHANGED\n${whatChanged || "-"}\n\n` +
        `KEY NUMBERS\n${numbersBlock}\n\n` +
        `BULL CASE\n${bull || "-"}\n\n` +
        `BEAR CASE\n${bear || "-"}\n\n` +
        `RISKS\n${risks || "-"}\n\n` +
        `WHAT TO TRACK (NEXT 2 QUARTERS)\n${trackBlock || "-"}\n\n` +
        `SECTOR CHECKLIST\n${template.checklist.map((c) => `- ${c}`).join("\n")}\n\n` +
        `RED FLAGS\n${template.redFlags.map((c) => `- ${c}`).join("\n")}\n\n` +
        `FAILURE MODES\n${template.failureModes.map((c) => `- ${c}`).join("\n")}\n\n` +
        `SOURCE EXCERPT\n${excerpt || "-"}`;
      downloadFile(`${filenameBase}.txt`, txt);
    }
  }

  const container = { maxWidth: 1150, margin: "0 auto", padding: 24, fontFamily: "system-ui, -apple-system, Arial" };
  const input = { width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" };
  const label = { display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6 };

  return (
    <div style={container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Company Ramp</h1>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            Sector-specific public company ramp in ~1 hour: paste excerpts → fill brief → export.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => exportRamp("md")}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", cursor: "pointer" }}
          >
            Export .md
          </button>
          <button
            onClick={() => exportRamp("txt")}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", cursor: "pointer" }}
          >
            Export .txt
          </button>
        </div>
      </div>

      {/* Top controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.7fr 0.9fr 0.9fr", gap: 12, marginTop: 18 }}>
        <div>
          <label style={label}>Company</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g., Zomato" style={input} />
        </div>
        <div>
          <label style={label}>Ticker (optional)</label>
          <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="e.g., ZOMATO.NS" style={input} />
        </div>
        <div>
          <label style={label}>Sector</label>
          <select value={sector} onChange={(e) => setSector(e.target.value)} style={input}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Doc type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} style={input}>
            {DOC_TYPES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {["Ramp Brief", "Signals", "Checklist"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #ddd",
              cursor: "pointer",
              background: tab === t ? "#111" : "white",
              color: tab === t ? "white" : "#111",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 0.95fr", gap: 16, marginTop: 14 }}>
        {/* Left column */}
        <div>
          <label style={label}>Paste excerpt (AR/QR/AGM/transcript/results commentary)</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={8}
            placeholder="Paste a paragraph or two… (you can paste multiple times; it autosaves locally)"
            style={input}
          />

          {tab === "Ramp Brief" && (
            <>
              <div style={{ marginTop: 12 }}>
                <label style={label}>Business model (plain English)</label>
                <textarea
                  value={businessModel}
                  onChange={(e) => setBusinessModel(e.target.value)}
                  rows={3}
                  placeholder="What do they sell, who pays, why do customers choose them?"
                  style={input}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={label}>What changed (this period)</label>
                <textarea
                  value={whatChanged}
                  onChange={(e) => setWhatChanged(e.target.value)}
                  rows={3}
                  placeholder="Key deltas vs last quarter/year, what drove it (volume/price/mix/cost)…"
                  style={input}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={label}>Key numbers (manual)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input
                    style={input}
                    placeholder="Revenue (e.g., ₹1,200 Cr)"
                    value={keyNumbers.revenue}
                    onChange={(e) => setKeyNumbers({ ...keyNumbers, revenue: e.target.value })}
                  />
                  <input
                    style={input}
                    placeholder="Growth (e.g., +18% YoY / +4% QoQ)"
                    value={keyNumbers.growth}
                    onChange={(e) => setKeyNumbers({ ...keyNumbers, growth: e.target.value })}
                  />
                  <input
                    style={input}
                    placeholder="Gross margin (e.g., 62%)"
                    value={keyNumbers.grossMargin}
                    onChange={(e) => setKeyNumbers({ ...keyNumbers, grossMargin: e.target.value })}
                  />
                  <input
                    style={input}
                    placeholder="EBITDA / Op Profit (e.g., ₹220 Cr / 18%)"
                    value={keyNumbers.ebitda}
                    onChange={(e) => setKeyNumbers({ ...keyNumbers, ebitda: e.target.value })}
                  />
                  <input
                    style={input}
                    placeholder="Cash from Ops (e.g., ₹180 Cr)"
                    value={keyNumbers.cfo}
                    onChange={(e) => setKeyNumbers({ ...keyNumbers, cfo: e.target.value })}
                  />
                  <input
                    style={input}
                    placeholder="Net debt / net cash (e.g., net cash ₹500 Cr)"
                    value={keyNumbers.netDebt}
                    onChange={(e) => setKeyNumbers({ ...keyNumbers, netDebt: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={label}>Bull case (why it wins)</label>
                <textarea
                  value={bull}
                  onChange={(e) => setBull(e.target.value)}
                  rows={3}
                  placeholder="Strongest reasons it compounds: moat, distribution, cost curve, product edge…"
                  style={input}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={label}>Bear case (how it breaks)</label>
                <textarea
                  value={bear}
                  onChange={(e) => setBear(e.target.value)}
                  rows={3}
                  placeholder="Key failure modes: pricing pressure, regulation, churn, cycle, capex mistakes…"
                  style={input}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={label}>Risks / watchouts</label>
                <textarea
                  value={risks}
                  onChange={(e) => setRisks(e.target.value)}
                  rows={3}
                  placeholder="3–5 risks that actually matter; what would be an early warning sign?"
                  style={input}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={label}>What to track (next 2 quarters)</label>
                <textarea
                  value={whatToTrack}
                  onChange={(e) => setWhatToTrack(e.target.value)}
                  rows={3}
                  placeholder="If blank, we’ll suggest sector KPIs automatically."
                  style={input}
                />
              </div>
            </>
          )}
        </div>

        {/* Right column */}
        <div>
          {tab === "Signals" && (
            <>
              <Section title="Detected signals in your excerpt">
                {signals.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {signals.map((s) => (
                      <Pill key={s}>{SIGNAL_RULES.find((r) => r.key === s)?.label || s}</Pill>
                    ))}
                  </div>
                ) : (
                  <div style={{ opacity: 0.7 }}>No obvious keywords yet — paste more text.</div>
                )}
              </Section>

              <Section title="What these signals usually imply">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {signals.includes("cash") && <li style={{ marginBottom: 6 }}>Cash/working capital mentions → check cash conversion vs profits, receivables/inventory trend.</li>}
                  {signals.includes("margin") && <li style={{ marginBottom: 6 }}>Margin language → isolate drivers: mix vs pricing vs cost. Watch sustainability.</li>}
                  {signals.includes("pricing") && <li style={{ marginBottom: 6 }}>Pricing/discounting → ask if growth is volume-led or promo-led; watch elasticity.</li>}
                  {signals.includes("demand") && <li style={{ marginBottom: 6 }}>Demand/backlog/pipeline → check leading indicators and guidance confidence.</li>}
                  {signals.includes("risk") && <li style={{ marginBottom: 6 }}>Regulatory/legal risk → map single-point-of-failure and mitigation timeline.</li>}
                  {signals.includes("capex") && <li style={{ marginBottom: 6 }}>Capex/capacity → check returns (ROCE), cycle timing, and utilization path.</li>}
                  {signals.includes("dilution") && <li style={{ marginBottom: 6 }}>SBC/dilution → compare per-share economics + FCF quality over time.</li>}
                  {signals.includes("competition") && <li style={{ marginBottom: 6 }}>Competition_toggle → watch pricing pressure and share commentary; check margin defense.</li>}
                  {!signals.length && <li style={{ marginBottom: 6 }}>Add more text from the report/transcript to surface signals.</li>}
                </ul>
              </Section>

              <Section title="Suggested KPIs to track (auto)">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {suggestedTrack.map((x) => (
                    <li key={x} style={{ marginBottom: 6 }}>{x}</li>
                  ))}
                </ul>
              </Section>
            </>
          )}

          {tab === "Checklist" && (
            <>
              <Section title={`Sector checklist — ${sector}`}>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {template.checklist.map((c) => <li key={c} style={{ marginBottom: 6 }}>{c}</li>)}
                </ul>
              </Section>

              <Section title="Common red flags">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {template.redFlags.map((c) => <li key={c} style={{ marginBottom: 6 }}>{c}</li>)}
                </ul>
              </Section>

              <Section title="Failure modes to sanity-check">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {template.failureModes.map((c) => <li key={c} style={{ marginBottom: 6 }}>{c}</li>)}
                </ul>
              </Section>
            </>
          )}

          {tab === "Ramp Brief" && (
            <>
              <Section title="What to track (auto suggestions)">
                <div style={{ opacity: 0.8, marginBottom: 8 }}>
                  If you leave the “What to track” field blank, export will include these:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {suggestedTrack.map((x) => <li key={x} style={{ marginBottom: 6 }}>{x}</li>)}
                </ul>
              </Section>

              <Section title="Tip: 1-hour ramp flow">
                <ol style={{ margin: 0, paddingLeft: 18, opacity: 0.85, lineHeight: 1.6 }}>
                  <li>Paste 2–3 key excerpts (business model, segment, guidance/cost/cash).</li>
                  <li>Fill Business model + What changed + Key numbers.</li>
                  <li>Write Bull + Bear in 5–7 bullets each.</li>
                  <li>Pick 5 KPIs to track next 2 quarters and export .md.</li>
                </ol>
              </Section>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18, opacity: 0.6, fontSize: 12 }}>
        Saved locally in your browser. Version: companyRamp:v1.
      </div>
    </div>
  );
}
