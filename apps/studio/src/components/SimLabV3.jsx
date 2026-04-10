import { useState, useRef, useEffect } from "react";

const BRAND = { primary: "#06d6a0", dark: "#0a0f1a", surface: "#111827", border: "#1e293b", muted: "#64748b", text: "#e2e8f0", accent: "#06d6a0", danger: "#ef4444", warning: "#f59e0b", success: "#06d6a0", info: "#38bdf8" };

const SANDBOXES = [
  { id: "sb-a7f2c1", name: "fraud-testing", template: "banking", tables: 16, rows: 50000, status: "active", ttl: "18h", conn: "postgresql://lab_a7f2c1:s3cr3tK3y@ep-bold-leaf.neon.tech/neondb", createdBy: "Eddy M.", source: "manual" },
  { id: "sb-b3e9d4", name: "oncology-demo", template: "oncology", tables: 20, rows: 100000, status: "active", ttl: "6h", conn: "postgresql://lab_b3e9d4:p4ssW0rd@ep-wild-river.neon.tech/neondb", createdBy: "Eddy M.", source: "manual" },
  { id: "sb-ci4821", name: "ci-pr-4821", template: "ecommerce", tables: 6, rows: 10000, status: "creating", ttl: "2h", conn: "", createdBy: "GitHub Actions", source: "ci", pr: "#4821" },
];

const SCENARIOS = [
  { id: "fraud-spike", label: "Fraud spike", desc: "60% of fraud alerts concentrated in a 2-week window. Risk scores elevated." },
  { id: "churn-wave", label: "Churn wave", desc: "30% of subscriptions cancel in one month." },
  { id: "holiday-rush", label: "Holiday rush", desc: "50% of orders in Nov-Dec with higher values." },
  { id: "data-breach", label: "Data breach", desc: "Audit log spike. Mass password resets." },
  { id: "payment-failures", label: "Payment failures", desc: "Failure rate jumps to 25%." },
  { id: "seasonal-enrollment", label: "Seasonal enrollment", desc: "65% of registrations in Aug-Sep." },
];

const ANOMALY_TAGS = ["Pressure spike", "Failed login surge", "Extreme transaction", "Mass password reset", "Account lockout wave", "Duplicate records", "Null injection", "Schema violation"];

const TEMPLATES = [
  { name: "Banking", tables: 16, domain: "BFSI" },
  { name: "Oncology", tables: 20, domain: "Healthcare" },
  { name: "E-commerce", tables: 6, domain: "Retail" },
  { name: "EduNode MTSS", tables: 30, domain: "Education" },
  { name: "Restaurant", tables: 14, domain: "Retail" },
  { name: "Supply chain", tables: 24, domain: "Logistics" },
  { name: "SaaS platform", tables: 6, domain: "SaaS" },
  { name: "Healthcare EHR", tables: 22, domain: "Healthcare" },
];

const maskConn = (c) => c.replace(/:([^@]+)@/, ":***@");

export default function SimLab() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState("sandboxes");
  const [menuOpen, setMenuOpen] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [toast, setToast] = useState(null);
  const [scenario, setScenario] = useState("fraud-spike");
  const [intensity, setIntensity] = useState(2);
  const [train, setTrain] = useState(70);
  const [test, setTest] = useState(20);
  const [anomalies, setAnomalies] = useState(new Set(["Pressure spike", "Extreme transaction"]));
  const [anomalyFreq, setAnomalyFreq] = useState(2);
  const [whatifFeature, setWhatifFeature] = useState("income");
  const [whatifShift, setWhatifShift] = useState(20);
  const [newTpl, setNewTpl] = useState("Banking");
  const [newRows, setNewRows] = useState(10000);
  const [newTTL, setNewTTL] = useState("24h");
  const [newName, setNewName] = useState("");

  const val = Math.max(0, 100 - train - test);
  const fire = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const t = dark ? {
    bg: "#0a0f1a", surface: "#111827", card: "#1a2332", border: "#1e293b", borderH: "#334155",
    text: "#e2e8f0", muted: "#94a3b8", hint: "#64748b", accent: "#06d6a0", accentBg: "rgba(6,214,160,0.1)",
    danger: "#ef4444", dangerBg: "rgba(239,68,68,0.1)", warn: "#f59e0b", warnBg: "rgba(245,158,11,0.1)",
    info: "#38bdf8", infoBg: "rgba(56,189,248,0.1)", pill: "#1e293b", pillActive: "#06d6a0", pillActiveText: "#0a0f1a",
    input: "#1a2332", inputBorder: "#334155", modal: "rgba(0,0,0,0.6)"
  } : {
    bg: "#ffffff", surface: "#f8fafc", card: "#ffffff", border: "#e2e8f0", borderH: "#cbd5e1",
    text: "#0f172a", muted: "#64748b", hint: "#94a3b8", accent: "#059669", accentBg: "rgba(5,150,105,0.08)",
    danger: "#dc2626", dangerBg: "rgba(220,38,38,0.08)", warn: "#d97706", warnBg: "rgba(217,119,6,0.08)",
    info: "#0284c7", infoBg: "rgba(2,132,199,0.08)", pill: "#f1f5f9", pillActive: "#059669", pillActiveText: "#ffffff",
    input: "#ffffff", inputBorder: "#e2e8f0", modal: "rgba(0,0,0,0.4)"
  };

  const inputStyle = { background: t.input, border: `0.5px solid ${t.inputBorder}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit" };
  const selectStyle = { ...inputStyle, flex: 1 };
  const btnPrimary = { background: t.accent, color: dark ? "#0a0f1a" : "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const btnGhost = { background: "transparent", border: `0.5px solid ${t.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, color: t.muted, cursor: "pointer", fontFamily: "inherit" };

  const Label = ({ children }) => <span style={{ fontSize: 13, color: t.muted, minWidth: 110, display: "inline-block" }}>{children}</span>;

  const Badge = ({ status }) => {
    const c = status === "active" ? { bg: t.accentBg, c: t.accent, dot: t.accent } : status === "creating" ? { bg: t.warnBg, c: t.warn, dot: t.warn } : { bg: t.dangerBg, c: t.danger, dot: t.danger };
    return <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 12, fontWeight: 500, background: c.bg, color: c.c, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{status}
    </span>;
  };

  const menuRef = useRef();
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const menuItems = (sb) => [
    { icon: "📋", label: "Copy connection", action: () => { navigator.clipboard?.writeText(sb.conn); fire("Copied"); } },
    { icon: "⏱", label: "Extend +24h", action: () => fire(`Extended ${sb.name}`) },
    { icon: "📸", label: "Snapshot", action: () => fire("Snapshot created") },
    { icon: "🔗", label: "Share access", action: () => fire("Share link generated") },
    { icon: "🔍", label: "SQL editor", action: () => fire("Opening editor...") },
    null,
    ...(sb.source === "ci" ? [{ icon: "↗", label: `View PR ${sb.pr}`, action: () => {} }] : []),
    { icon: "🗑", label: "Delete", danger: true, action: () => setShowDelete(sb) },
  ];

  const tabs = [
    { id: "sandboxes", label: "Sandboxes" },
    { id: "scenario", label: "Simulate scenario" },
    { id: "split", label: "ML split" },
    { id: "anomaly", label: "Inject anomalies" },
    { id: "whatif", label: "What-if analysis" },
  ];

  return <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: t.bg, color: t.text, padding: "24px 28px", borderRadius: 16, minHeight: 600, transition: "all 0.2s" }}>

    {toast && <div style={{ position: "fixed", top: 20, right: 20, background: t.card, border: `0.5px solid ${t.accent}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, color: t.accent, zIndex: 200, display: "flex", gap: 6, alignItems: "center" }}>✓ {toast}</div>}

    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${t.accent}, #38bdf8)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#0a0f1a" }}>R</div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: "-0.3px" }}>RealityDB</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: t.accent, letterSpacing: "-0.3px", marginLeft: 4 }}>SimLab</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 12, color: t.muted, textAlign: "right" }}>
          <div style={{ fontWeight: 500, color: t.text }}>Eddy Mkwambe</div>
          <div>Core · Mpingo Systems</div>
        </div>
        <button onClick={() => setDark(!dark)} style={{ ...btnGhost, padding: "6px 10px", fontSize: 14 }} title={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? "☀" : "🌙"}</button>
        <button onClick={() => setShowNew(true)} style={btnPrimary}>+ New sandbox</button>
      </div>
    </div>

    {/* Metrics */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 24 }}>
      {[
        { label: "Active sandboxes", value: "3", sub: "of 5 (Core)", trend: null },
        { label: "Rows this month", value: "142K", sub: "500K limit", trend: "▲ 12%" },
        { label: "Templates", value: "8", sub: "5 domains", trend: null },
        { label: "Avg speed", value: "175K/s", sub: "rows/sec", trend: null },
      ].map((m, i) => <div key={i} style={{ background: t.surface, borderRadius: 12, padding: "16px 18px", border: `0.5px solid ${t.border}` }}>
        <div style={{ fontSize: 11, color: t.hint, textTransform: "uppercase", letterSpacing: "0.5px" }}>{m.label}</div>
        <div style={{ fontSize: 26, fontWeight: 600, color: t.text, margin: "4px 0 2px", letterSpacing: "-0.5px" }}>{m.value}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: t.muted }}>{m.sub}</span>
          {m.trend && <span style={{ fontSize: 11, color: t.accent }}>{m.trend}</span>}
        </div>
      </div>)}
    </div>

    {/* Pill Tabs */}
    <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
      {tabs.map(tb => <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "8px 18px", fontSize: 13, borderRadius: 20, cursor: "pointer", fontWeight: tab === tb.id ? 600 : 400, background: tab === tb.id ? t.pillActive : t.pill, color: tab === tb.id ? t.pillActiveText : t.muted, border: tab === tb.id ? "none" : `0.5px solid ${t.border}`, fontFamily: "inherit", transition: "all 0.15s" }}>{tb.label}</button>)}
    </div>

    {/* SANDBOXES */}
    {tab === "sandboxes" && <div style={{ background: t.card, border: `0.5px solid ${t.border}`, borderRadius: 12, padding: "4px 20px" }}>
      {SANDBOXES.map((sb, i) => <div key={sb.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 0", borderBottom: i < SANDBOXES.length - 1 ? `0.5px solid ${t.border}` : "none" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{sb.name}</span>
            <Badge status={sb.status} />
            {sb.source === "ci" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: t.infoBg, color: t.info }}>CI/CD</span>}
          </div>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>{sb.template} · {sb.tables} tables · {(sb.rows/1000)}K rows · expires {sb.ttl} · {sb.createdBy}</div>
          {sb.conn && <div onClick={() => { setRevealed(p => ({ ...p, [sb.id]: !p[sb.id] })); navigator.clipboard?.writeText(sb.conn); fire("Copied"); }} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: t.info, background: t.infoBg, padding: "4px 10px", borderRadius: 6, display: "inline-block", cursor: "pointer" }}>
            {revealed[sb.id] ? sb.conn : maskConn(sb.conn)}
          </div>}
          {sb.pr && <span style={{ fontSize: 11, color: t.info, marginLeft: 8, cursor: "pointer" }}>PR {sb.pr} ↗</span>}
        </div>
        <div style={{ position: "relative" }} ref={menuOpen === sb.id ? menuRef : null}>
          <button onClick={() => setMenuOpen(menuOpen === sb.id ? null : sb.id)} style={{ background: "transparent", border: `0.5px solid ${t.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: t.muted, fontSize: 16 }}>⋯</button>
          {menuOpen === sb.id && <div style={{ position: "absolute", right: 0, top: 32, background: t.card, border: `0.5px solid ${t.borderH}`, borderRadius: 10, padding: "4px 0", zIndex: 10, minWidth: 180, boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.08)" }}>
            {menuItems(sb).map((item, j) => item === null ? <div key={j} style={{ borderTop: `0.5px solid ${t.border}`, margin: "4px 0" }} /> : <div key={j} onClick={() => { item.action(); setMenuOpen(null); }} style={{ padding: "8px 14px", fontSize: 13, cursor: "pointer", color: item.danger ? t.danger : t.text, display: "flex", gap: 8, alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = t.surface} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{item.icon} {item.label}</div>)}
          </div>}
        </div>
      </div>)}
    </div>}

    {/* SCENARIO */}
    {tab === "scenario" && <div style={{ background: t.card, border: `0.5px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Apply scenario to sandbox</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Target</Label><select style={selectStyle}><option>fraud-testing (banking)</option><option>oncology-demo</option></select></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Scenario</Label><select style={selectStyle} value={scenario} onChange={e => setScenario(e.target.value)}>{SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
      <div style={{ fontSize: 12, color: t.muted, padding: "10px 14px", background: t.surface, borderRadius: 8, marginBottom: 12, lineHeight: 1.6, border: `0.5px solid ${t.border}` }}>{SCENARIOS.find(s => s.id === scenario)?.desc}</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Intensity</Label><input type="range" min={1} max={3} step={1} value={intensity} onChange={e => setIntensity(+e.target.value)} style={{ flex: 1, accentColor: t.accent }} /><span style={{ fontSize: 13, fontWeight: 500, minWidth: 60 }}>{["Low", "Medium", "High"][intensity - 1]}</span></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}><Label>Timeline</Label><select style={selectStyle}><option>12 months</option><option>6 months</option><option>4 weeks</option></select></div>
      <button onClick={() => sendPrompt(`Run ${scenario} scenario on fraud-testing with ${["low","medium","high"][intensity-1]} intensity`)} style={btnPrimary}>Run simulation ↗</button>
    </div>}

    {/* ML SPLIT */}
    {tab === "split" && <div style={{ background: t.card, border: `0.5px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Export for ML training</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Source</Label><select style={selectStyle}><option>fraud-testing (banking)</option><option>oncology-demo</option></select></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center" }}><Label>Train</Label><input type="range" min={50} max={90} step={5} value={train} onChange={e => setTrain(+e.target.value)} style={{ flex: 1, accentColor: t.accent }} /><span style={{ fontSize: 13, fontWeight: 600, minWidth: 40, textAlign: "right" }}>{train}%</span></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center" }}><Label>Test</Label><input type="range" min={5} max={30} step={5} value={test} onChange={e => setTest(+e.target.value)} style={{ flex: 1, accentColor: t.accent }} /><span style={{ fontSize: 13, fontWeight: 600, minWidth: 40, textAlign: "right" }}>{test}%</span></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Validation</Label><span style={{ fontSize: 14, fontWeight: 600, color: val < 0 ? t.danger : t.accent }}>{val}%</span></div>
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 12, background: t.surface }}>
        <div style={{ width: `${train}%`, background: "#06d6a0", transition: "width 0.2s" }} />
        <div style={{ width: `${test}%`, background: "#f59e0b", transition: "width 0.2s" }} />
        <div style={{ width: `${Math.max(0,val)}%`, background: "#38bdf8", transition: "width 0.2s" }} />
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: t.muted, marginBottom: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#06d6a0" }} />Train</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b" }} />Test</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#38bdf8" }} />Val</span>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, display: "flex", gap: 12, alignItems: "center" }}><Label>Strategy</Label><select style={selectStyle}><option>Random</option><option>Temporal</option><option>Stratified</option></select></div>
        <div style={{ flex: 1, display: "flex", gap: 12, alignItems: "center" }}><Label>Format</Label><select style={selectStyle}><option>Parquet</option><option>CSV</option><option>SQL</option><option>JSON</option></select></div>
      </div>
      <button onClick={() => sendPrompt(`Generate ${train}/${test}/${val} ML split from fraud-testing in Parquet`)} style={btnPrimary}>Generate split ↗</button>
    </div>}

    {/* ANOMALY */}
    {tab === "anomaly" && <div style={{ background: t.card, border: `0.5px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Inject controlled anomalies</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Target</Label><select style={selectStyle}><option>fraud-testing (banking)</option><option>oncology-demo</option></select></div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: t.muted, marginBottom: 8 }}>Anomaly types</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ANOMALY_TAGS.map(tag => <span key={tag} onClick={() => { const n = new Set(anomalies); n.has(tag) ? n.delete(tag) : n.add(tag); setAnomalies(n); }} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 16, cursor: "pointer", fontWeight: anomalies.has(tag) ? 600 : 400, background: anomalies.has(tag) ? t.accentBg : t.surface, color: anomalies.has(tag) ? t.accent : t.muted, border: `0.5px solid ${anomalies.has(tag) ? t.accent : t.border}`, transition: "all 0.15s" }}>{tag}</span>)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Frequency</Label><input type="range" min={1} max={10} step={1} value={anomalyFreq} onChange={e => setAnomalyFreq(+e.target.value)} style={{ flex: 1, accentColor: t.accent }} /><span style={{ fontSize: 13, fontWeight: 600, minWidth: 40, textAlign: "right" }}>{anomalyFreq}%</span></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}><Label>Seed</Label><input type="number" defaultValue={42} style={{ ...inputStyle, width: 80 }} /><span style={{ fontSize: 11, color: t.hint }}>Same seed = same anomalies</span></div>
      <button onClick={() => sendPrompt(`Inject ${[...anomalies].join(", ")} at ${anomalyFreq}% into fraud-testing`)} style={btnPrimary}>Inject and create sandbox ↗</button>
    </div>}

    {/* WHAT-IF */}
    {tab === "whatif" && <div style={{ background: t.card, border: `0.5px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>What-if analysis (counterfactual)</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Source</Label><select style={selectStyle}><option>fraud-testing (banking)</option><option>oncology-demo</option></select></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Feature</Label><select style={selectStyle} value={whatifFeature} onChange={e => setWhatifFeature(e.target.value)}>{["income", "credit_score", "age", "account_balance", "transaction_amount"].map(f => <option key={f}>{f}</option>)}</select></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Shift type</Label><select style={selectStyle}><option>Increase by %</option><option>Decrease by %</option><option>Set fixed</option><option>Randomize range</option></select></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}><Label>Amount</Label><input type="range" min={5} max={50} step={5} value={whatifShift} onChange={e => setWhatifShift(+e.target.value)} style={{ flex: 1, accentColor: t.accent }} /><span style={{ fontSize: 13, fontWeight: 600, minWidth: 50, textAlign: "right", color: t.accent }}>+{whatifShift}%</span></div>
      <div style={{ fontSize: 12, color: t.muted, padding: "12px 14px", background: t.surface, borderRadius: 8, marginBottom: 16, lineHeight: 1.6, border: `0.5px solid ${t.border}` }}>
        Generate parallel dataset where <strong style={{ color: t.accent }}>{whatifFeature}</strong> is increased by <strong style={{ color: t.accent }}>{whatifShift}%</strong>. Creates a new sandbox branch. Original unchanged.
      </div>
      <button onClick={() => sendPrompt(`Counterfactual: ${whatifFeature} +${whatifShift}% from fraud-testing`)} style={btnPrimary}>Generate counterfactual ↗</button>
    </div>}

    {/* NEW SANDBOX MODAL */}
    {showNew && <div style={{ position: "fixed", inset: 0, background: t.modal, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowNew(false)}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.card, borderRadius: 16, padding: 24, maxWidth: 460, width: "100%", border: `0.5px solid ${t.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Create new sandbox</span>
          <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", color: t.muted, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Label>Template</Label><select style={selectStyle} value={newTpl} onChange={e => setNewTpl(e.target.value)}>{TEMPLATES.map(tp => <option key={tp.name}>{tp.name} ({tp.tables} tables)</option>)}</select></div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Label>Rows</Label><select style={selectStyle} value={newRows} onChange={e => setNewRows(+e.target.value)}>{[1000,5000,10000,50000,100000,500000].map(r => <option key={r} value={r}>{(r/1000)}K</option>)}</select></div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Label>TTL</Label><select style={selectStyle} value={newTTL} onChange={e => setNewTTL(e.target.value)}><option value="4h">4h</option><option value="24h">24h</option><option value="48h">48h</option><option value="72h">72h</option><option value="7d">7 days</option></select></div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Label>Name</Label><input style={selectStyle} placeholder="e.g. fraud-testing" value={newName} onChange={e => setNewName(e.target.value)} /></div>
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: 16, marginTop: 4, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setShowNew(false)} style={btnGhost}>Cancel</button>
            <button onClick={() => { setShowNew(false); sendPrompt(`Create ${newTpl} sandbox, ${(newRows/1000)}K rows, TTL ${newTTL}${newName ? ', name: ' + newName : ''}`); }} style={btnPrimary}>Create sandbox ↗</button>
          </div>
        </div>
      </div>
    </div>}

    {/* DELETE MODAL */}
    {showDelete && <div style={{ position: "fixed", inset: 0, background: t.modal, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowDelete(null)}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.card, borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", border: `0.5px solid ${t.border}` }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Delete sandbox</div>
        <p style={{ fontSize: 13, color: t.muted, lineHeight: 1.6, marginBottom: 16 }}>Delete <strong style={{ color: t.text }}>{showDelete.name}</strong>? This permanently destroys the database branch. Cannot be undone.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => setShowDelete(null)} style={btnGhost}>Cancel</button>
          <button onClick={() => { fire(`Deleted ${showDelete.name}`); setShowDelete(null); }} style={{ ...btnPrimary, background: t.danger, color: "#fff" }}>Delete</button>
        </div>
      </div>
    </div>}

    {/* Footer */}
    <div style={{ marginTop: 24, paddingTop: 16, borderTop: `0.5px solid ${t.border}`, display: "flex", justifyContent: "space-between", fontSize: 11, color: t.hint }}>
      <span>RealityDB SimLab v2.21.0 · Mpingo Systems LLC</span>
      <div style={{ display: "flex", gap: 16 }}>
        <span style={{ cursor: "pointer" }}>Docs</span>
        <span style={{ cursor: "pointer" }}>API</span>
        <span style={{ cursor: "pointer" }}>Billing</span>
        <span style={{ cursor: "pointer" }}>Audit log</span>
      </div>
    </div>
  </div>;
}
