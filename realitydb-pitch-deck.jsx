import React, { useState, useEffect, useCallback, useRef } from "react";

/**
 * RealityDB — Investor / AWS Impact Bootcamp pitch deck.
 *
 * A self-contained, dependency-free React component (React only).
 * - Arrow key / Space / Home / End + on-screen button navigation
 * - Slide counter, top progress bar, direction-aware crossfade transitions
 * - Committed dark theme (#06070a ground, #4F7FFF accent)
 *
 * Drop-in usage:  <RealityDBDeck />
 */

const ACCENT = "#4F7FFF";

/* ------------------------------------------------------------------ */
/* Small presentational primitives                                     */
/* ------------------------------------------------------------------ */

function Eyebrow({ n, children }) {
  return (
    <div className="eyebrow">
      {n != null && <span className="eyebrow-num">{n}</span>}
      <span className="eyebrow-label">{children}</span>
    </div>
  );
}

function Check({ children }) {
  return (
    <li className="check">
      <svg className="check-ic" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function Chip({ emoji }) {
  return (
    <span className="chip" aria-hidden="true">
      {emoji}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Slides                                                              */
/* ------------------------------------------------------------------ */

const slides = [
  /* 1 — COVER --------------------------------------------------------*/
  {
    key: "cover",
    render: () => (
      <div className="slide-inner cover">
        <div className="wordmark">
          <span className="mark" aria-hidden="true">
            <span className="mark-dot" />
          </span>
          RealityDB
        </div>
        <h1 className="cover-tag">
          Synthetic Data Infrastructure for{" "}
          <span className="accent">Regulated AI Deployment</span>
        </h1>
        <div className="cover-meta">
          <div className="cover-founder">
            <strong>Eddy Mkwambe</strong>
            <span className="muted">Founder · Mpingo Systems LLC</span>
          </div>
          <div className="cover-loc">
            <span className="muted">Charlotte, NC</span>
            <a className="accent link" href="https://realitydb.dev">
              realitydb.dev
            </a>
          </div>
        </div>
      </div>
    ),
  },

  /* 2 — THE PROBLEM --------------------------------------------------*/
  {
    key: "problem",
    render: () => (
      <div className="slide-inner">
        <Eyebrow n="01">The Problem</Eyebrow>
        <h1 className="title">
          Real data is locked. <br />
          <span className="accent">Fake data is useless.</span>
        </h1>
        <div className="cards cards-3">
          <div className="card">
            <Chip emoji="🔒" />
            <h3>Production data is locked</h3>
            <p className="muted">
              Trapped behind HIPAA, BSA/AML, and GDPR — legally untouchable for
              development and testing.
            </p>
          </div>
          <div className="card">
            <Chip emoji="⏱️" />
            <h3>Manual fake data takes weeks</h3>
            <p className="muted">
              Hand-built datasets are slow to produce and silently break
              referential integrity.
            </p>
          </div>
          <div className="card">
            <Chip emoji="❌" />
            <h3>The market leader is gone</h3>
            <p className="muted">
              Snaplet shut down in 2024, leaving a compliance-grade gap that no
              one has filled.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  /* 3 — THE SOLUTION -------------------------------------------------*/
  {
    key: "solution",
    render: () => (
      <div className="slide-inner">
        <Eyebrow n="02">The Solution</Eyebrow>
        <h1 className="title">
          Production-grade synthetic data in{" "}
          <span className="accent">60 seconds</span>
        </h1>

        <div className="terminal" role="img" aria-label="Terminal command">
          <div className="term-bar">
            <span className="tdot" />
            <span className="tdot" />
            <span className="tdot" />
            <span className="term-title">rdb — zsh</span>
          </div>
          <div className="term-body">
            <code>
              <span className="term-prompt">$</span> rdb lab create{" "}
              <span className="term-arg">us-banking</span>{" "}
              <span className="term-flag">--rows</span>{" "}
              <span className="term-num">50000</span>
              <span className="term-caret" />
            </code>
          </div>
        </div>

        <ul className="checks checks-row">
          <Check>
            <strong>Live PostgreSQL database</strong>
          </Check>
          <Check>
            <strong>50,000 rows</strong> of realistic banking data
          </Check>
          <Check>
            Ready in <strong>60 seconds</strong>
          </Check>
        </ul>
      </div>
    ),
  },

  /* 4 — PRODUCT ------------------------------------------------------*/
  {
    key: "product",
    render: () => (
      <div className="slide-inner">
        <Eyebrow n="03">Product</Eyebrow>
        <h1 className="title">
          13 domain packs. <span className="accent">Built for regulated industries.</span>
        </h1>

        <div className="product-grid">
          <div className="pack-cols">
            <div className="pack-col">
              <div className="pack-head">US Packs</div>
              <ul>
                <li>US Banking</li>
                <li>US Healthcare</li>
                <li>US Telecom</li>
                <li>US Insurance</li>
              </ul>
            </div>
            <div className="pack-col">
              <div className="pack-head">EU Packs</div>
              <ul>
                <li>EU Banking</li>
                <li>EU Healthcare</li>
                <li>EU Telecom</li>
              </ul>
            </div>
            <div className="pack-plus">
              <span className="muted">Plus</span> Fintech · Supply Chain ·
              Oncology · Universal
            </div>
          </div>

          <div className="stat-stack">
            <div className="mini-stat">
              <span className="mini-num small">100%</span>
              <span className="mini-label">Referential Integrity · Temporally Ordered · Research-Calibrated Distributions</span>
            </div>
            <div className="mini-stat">
              <span className="mini-num small">Ed25519</span>
              <span className="mini-label">Cryptographic Watermarking</span>
            </div>
            <div className="mini-stat">
              <span className="mini-num small">Gov-Calibrated</span>
              <span className="mini-label">FDIC · CMS · FFIEC · NAIC distributions</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* 5 — TECHNOLOGY ---------------------------------------------------*/
  {
    key: "technology",
    render: () => (
      <div className="slide-inner">
        <Eyebrow n="04">Technology</Eyebrow>
        <h1 className="title">
          Built <span className="accent">different.</span>
        </h1>
        <div className="cards cards-4">
          <div className="card">
            <Chip emoji="🔐" />
            <h3>Cryptographic Provenance</h3>
            <p className="muted">Ed25519 watermarking on every dataset.</p>
          </div>
          <div className="card">
            <Chip emoji="🎯" />
            <h3>Deterministic Seeding</h3>
            <p className="muted">Same seed = same data, always.</p>
          </div>
          <div className="card">
            <Chip emoji="📊" />
            <h3>Government Calibration</h3>
            <p className="muted">FDIC, CMS, FFIEC and NAIC sourced distributions.</p>
          </div>
          <div className="card">
            <Chip emoji="🏛️" />
            <h3>Compliance Documentation</h3>
            <p className="muted">
              HIPAA attestation, BSA/AML reports, EU AI Act Article 10 readiness.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  /* 6 — MARKET -------------------------------------------------------*/
  {
    key: "market",
    render: () => (
      <div className="slide-inner">
        <Eyebrow n="05">Market</Eyebrow>
        <h1 className="title">
          A <span className="accent">$6.8B</span> market with no compliance leader
        </h1>

        <div className="market-grid">
          <div className="market-hero card">
            <div className="market-flow">
              <span className="market-a">$1.3B</span>
              <span className="market-year">2023</span>
              <svg className="market-arrow" viewBox="0 0 40 12" aria-hidden="true">
                <path d="M0 6h34M30 2l6 4-6 4" />
              </svg>
              <span className="market-b">$6.8B</span>
              <span className="market-year">2028</span>
            </div>
            <div className="market-cagr">
              <strong className="accent">40% CAGR</strong> — synthetic data market
            </div>
          </div>

          <div className="market-side">
            <div className="card compact">
              <h4>Our segment</h4>
              <p className="muted">
                Compliance-grade synthetic data carries a{" "}
                <span className="accent">30–50% price premium</span>. No
                off-the-shelf compliant solution exists.
              </p>
            </div>
            <div className="card compact">
              <h4>Charlotte opportunity</h4>
              <p className="muted">
                2nd largest US banking center — Truist, BofA, Novant, Duke
                Energy. Active outreach:{" "}
                <span className="accent">9 prospects.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* 7 — BUSINESS MODEL ----------------------------------------------*/
  {
    key: "business",
    render: () => (
      <div className="slide-inner">
        <Eyebrow n="06">Business Model</Eyebrow>
        <h1 className="title">
          Three <span className="accent">revenue streams</span>
        </h1>

        <div className="cards cards-3 streams">
          <div className="card">
            <div className="stream-tag">01 · Subscriptions</div>
            <div className="stream-price">
              $39<span className="per">/mo</span>{" "}
              <span className="arrow">→</span> $699<span className="per">/mo</span>
            </div>
            <p className="muted">Builder → Team. Annual plans, unlimited generation.</p>
          </div>
          <div className="card">
            <div className="stream-tag">02 · Custom SOW Builds</div>
            <div className="stream-price">
              $6K <span className="arrow">→</span> $35K
            </div>
            <p className="muted">
              + $299/mo pack hosting (recurring). ~$35K 3-year LTV per client.
            </p>
          </div>
          <div className="card">
            <div className="stream-tag">03 · One-time Packs</div>
            <div className="stream-price">
              $29 <span className="arrow">→</span> $499
            </div>
            <p className="muted">Evaluation → Compliance Bundle.</p>
          </div>
        </div>

        <div className="proj-row">
          <div className="proj">
            <span className="proj-val">$500K</span>
            <span className="proj-label">Year 1 ARR — target</span>
          </div>
          <div className="proj">
            <span className="proj-val">$3M</span>
            <span className="proj-label">Year 3 ARR</span>
          </div>
          <div className="proj">
            <span className="proj-val accent">$15M</span>
            <span className="proj-label">Year 5 ARR — GRC + AI infra</span>
          </div>
        </div>
      </div>
    ),
  },

  /* 8 — TRACTION -----------------------------------------------------*/
  {
    key: "traction",
    render: () => (
      <div className="slide-inner">
        <Eyebrow n="07">Traction</Eyebrow>
        <h1 className="title">
          Built and <span className="accent">shipping</span>
        </h1>

        <div className="cards cards-3 traction">
          <div className="card">
            <h4 className="trac-head">Product</h4>
            <ul className="checks">
              <Check>CLI v2.47.0 on npm</Check>
              <Check>60+ commands · 303/303 smoke tests</Check>
              <Check>13 domain packs · 99/100 quality</Check>
              <Check>SimLab on Neon — live DBs in 60s</Check>
              <Check>Stripe + Dodo payments live</Check>
            </ul>
          </div>
          <div className="card">
            <h4 className="trac-head">Partnerships</h4>
            <ul className="checks">
              <Check>Supabase partner application submitted</Check>
              <Check>Neon Agent Program — Andy replied within 1 hour</Check>
              <Check>Brad Van Vugt (Neon CEO) replied directly</Check>
              <Check>Neon $500 credits received</Check>
            </ul>
          </div>
          <div className="card">
            <h4 className="trac-head">Outreach</h4>
            <ul className="checks">
              <Check>9 Charlotte enterprise prospects contacted</Check>
            </ul>
            <div className="logos">
              {["Truist", "BofA", "Novant", "Atrium", "LendingTree", "Lowe's", "Honeywell", "Crowe", "Protiviti"].map(
                (o) => (
                  <span className="logo-pill" key={o}>
                    {o}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* 9 — THE VISION ---------------------------------------------------*/
  {
    key: "vision",
    render: () => (
      <div className="slide-inner">
        <Eyebrow n="08">The Vision</Eyebrow>
        <h1 className="title">
          From developer tool to{" "}
          <span className="accent">regulated AI infrastructure</span>
        </h1>

        <div className="stages">
          <div className="stage">
            <div className="stage-n">Stage 1</div>
            <div className="stage-when muted">Now</div>
            <h4>Synthetic data for developers</h4>
            <p className="muted">$39/mo subscriptions · $25K custom builds.</p>
          </div>
          <div className="stage-line" aria-hidden="true" />
          <div className="stage">
            <div className="stage-n">Stage 2</div>
            <div className="stage-when muted">12–18 months</div>
            <h4>GRC data infrastructure</h4>
            <p className="muted">
              SR 11-7 model risk docs · DORA Article 9 evidence · $50K–$150K
              annual GRC contracts.
            </p>
          </div>
          <div className="stage-line" aria-hidden="true" />
          <div className="stage">
            <div className="stage-n">Stage 3</div>
            <div className="stage-when muted">2–3 years</div>
            <h4>Air-gapped AI model infra</h4>
            <p className="muted">
              Fine-tune LLMs on synthetic data inside the security perimeter ·
              $500K–$2M deployments.
            </p>
          </div>
        </div>

        <blockquote className="vision-quote">
          “Every regulated institution that wants to deploy AI needs synthetic
          training data. RealityDB is the infrastructure layer that makes
          regulated AI deployment possible.”
        </blockquote>
      </div>
    ),
  },

  /* 10 — THE ASK -----------------------------------------------------*/
  {
    key: "ask",
    render: () => (
      <div className="slide-inner">
        <Eyebrow n="09">The Ask</Eyebrow>
        <h1 className="title">
          What we need — <span className="accent">AWS Impact Bootcamp</span>
        </h1>

        <div className="ask-grid">
          <div className="card">
            <h4 className="trac-head">Use of AWS credits — $100K</h4>
            <ul className="checks">
              <Check>Scale SimLab DB provisioning (Neon + AWS)</Check>
              <Check>Build the RealityDB dashboard on AWS</Check>
              <Check>Compliance-doc generation at scale (Bedrock / Claude)</Check>
              <Check>US-banking & healthcare packs at enterprise scale</Check>
            </ul>
          </div>
          <div className="card">
            <h4 className="trac-head">Use of program</h4>
            <ul className="checks">
              <Check>AWS enterprise intros — Charlotte banks run on AWS</Check>
              <Check>AI/ML infra guidance for regulated industries</Check>
              <Check>Investor network for the Series A path</Check>
            </ul>
          </div>
        </div>

        <div className="team card">
          <div className="team-name">
            <strong>Eddy Mkwambe</strong> — Founder &amp; Technical Director
          </div>
          <div className="team-bio muted">
            MS Mathematical Modelling (U. of Dar es Salaam) · MS Strategic
            Analytics (Brandeis) · 12+ yrs mathematics education · 8 production
            products shipped · Charlotte, NC — in the heart of our market.
          </div>
          <div className="contact">
            <a className="link accent" href="mailto:eddy@mpingo.ai">eddy@mpingo.ai</a>
            <a className="link accent" href="https://realitydb.dev">realitydb.dev</a>
            <a className="link accent" href="https://calendly.com/realitydb">calendly.com/realitydb</a>
          </div>
        </div>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------ */
/* Deck shell                                                          */
/* ------------------------------------------------------------------ */

export default function RealityDBDeck() {
  const [current, setCurrent] = useState(0);
  const total = slides.length;
  const touchX = useRef(null);

  const go = useCallback(
    (next) => {
      setCurrent((c) => Math.max(0, Math.min(total - 1, typeof next === "function" ? next(c) : next)));
    },
    [total]
  );

  const prev = useCallback(() => go((c) => c - 1), [go]);
  const next = useCallback(() => go((c) => c + 1), [go]);

  useEffect(() => {
    const onKey = (e) => {
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          go(0);
          break;
        case "End":
          e.preventDefault();
          go(total - 1);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go, total]);

  const onTouchStart = (e) => (touchX.current = e.changedTouches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    touchX.current = null;
  };

  return (
    <div className="rdb-deck" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{CSS}</style>

      <div className="bg-glow" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

      <div className="progress" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>

      <div className="stage">
        {slides.map((s, i) => (
          <section
            key={s.key}
            className={`slide ${i === current ? "active" : i < current ? "prev" : "next"}`}
            aria-hidden={i !== current}
          >
            {s.render()}
          </section>
        ))}
      </div>

      <div className="chrome">
        <div className="brand-foot">
          <span className="mark small" aria-hidden="true">
            <span className="mark-dot" />
          </span>
          RealityDB
        </div>
        <div className="nav">
          <button className="nav-btn" onClick={prev} disabled={current === 0} aria-label="Previous slide">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="counter">
            <span className="counter-cur">{String(current + 1).padStart(2, "0")}</span>
            <span className="counter-sep">/</span>
            <span className="counter-tot">{String(total).padStart(2, "0")}</span>
          </span>
          <button className="nav-btn" onClick={next} disabled={current === total - 1} aria-label="Next slide">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles (single dark theme, self-contained)                          */
/* ------------------------------------------------------------------ */

const CSS = `
.rdb-deck{
  --bg:#06070a;
  --surface:#0f1119;
  --surface-2:#12141d;
  --line:rgba(255,255,255,.08);
  --line-strong:rgba(255,255,255,.14);
  --accent:#4F7FFF;
  --accent-glow:#8AA6FF;
  --text:#EDF0F6;
  --muted:#8A93A9;
  --green:#39D98A;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;

  position:fixed; inset:0; overflow:hidden;
  background:var(--bg); color:var(--text);
  font-family:var(--sans);
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
.rdb-deck *{box-sizing:border-box;}

/* ambient background */
.bg-glow{
  position:absolute; top:-30vh; left:50%; transform:translateX(-50%);
  width:110vw; height:80vh; pointer-events:none; z-index:0;
  background:radial-gradient(closest-side, rgba(79,127,255,.20), rgba(79,127,255,.06) 45%, transparent 72%);
  filter:blur(6px);
}
.bg-grid{
  position:absolute; inset:0; z-index:0; pointer-events:none; opacity:.5;
  background-image:radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px);
  background-size:34px 34px;
  -webkit-mask-image:radial-gradient(120% 100% at 50% 0%, #000 35%, transparent 78%);
          mask-image:radial-gradient(120% 100% at 50% 0%, #000 35%, transparent 78%);
}

/* progress */
.progress{position:absolute; top:0; left:0; right:0; height:3px; background:rgba(255,255,255,.06); z-index:20;}
.progress-fill{height:100%; background:linear-gradient(90deg,var(--accent),var(--accent-glow)); box-shadow:0 0 16px rgba(79,127,255,.6); transition:width .5s cubic-bezier(.4,0,.2,1);}

/* stage + slides */
.stage{position:absolute; inset:0; z-index:5;}
.slide{
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  padding:clamp(24px,5vw,80px);
  opacity:0; transform:translateX(3%) scale(.985);
  transition:opacity .5s ease, transform .5s cubic-bezier(.4,0,.2,1);
  pointer-events:none; overflow:auto;
}
.slide.prev{transform:translateX(-3%) scale(.985);}
.slide.active{opacity:1; transform:none; pointer-events:auto;}

.slide-inner{width:100%; max-width:1080px; margin:auto;}

/* eyebrow */
.eyebrow{display:flex; align-items:center; gap:12px; margin-bottom:22px;}
.eyebrow-num{
  font:600 12px/1 var(--mono); letter-spacing:.05em; color:var(--accent);
  border:1px solid var(--line-strong); border-radius:6px; padding:6px 8px;
  background:rgba(79,127,255,.08);
}
.eyebrow-label{font:600 12px/1 var(--sans); letter-spacing:.22em; text-transform:uppercase; color:var(--muted);}

/* headings */
.title{
  font:800 clamp(2rem,4.4vw,3.35rem)/1.04 var(--sans);
  letter-spacing:-.02em; text-wrap:balance; margin:0 0 34px;
}
.accent{color:var(--accent);}
.muted{color:var(--muted);}
.link{text-decoration:none; border-bottom:1px solid transparent; transition:border-color .2s;}
.link:hover{border-bottom-color:currentColor;}

/* cards */
.cards{display:grid; gap:18px;}
.cards-3{grid-template-columns:repeat(3,1fr);}
.cards-4{grid-template-columns:repeat(4,1fr);}
.card{
  background:linear-gradient(180deg,var(--surface),var(--surface-2));
  border:1px solid var(--line); border-radius:16px; padding:22px;
}
.card h3{font:700 clamp(1rem,1.4vw,1.18rem)/1.25 var(--sans); margin:16px 0 8px; letter-spacing:-.01em;}
.card h4{font:700 1.02rem/1.2 var(--sans); margin:0 0 8px;}
.card p{font-size:clamp(.9rem,1.05vw,1rem); line-height:1.5; margin:0;}
.card.compact{padding:18px;}

/* emoji chip */
.chip{
  display:inline-flex; align-items:center; justify-content:center;
  width:46px; height:46px; border-radius:12px; font-size:22px;
  background:rgba(79,127,255,.10); border:1px solid var(--line-strong);
}

/* checks */
.checks{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px;}
.checks-row{flex-direction:row; gap:26px; margin-top:30px; flex-wrap:wrap;}
.check{display:flex; align-items:flex-start; gap:11px; font-size:clamp(.92rem,1.1vw,1.05rem); line-height:1.4;}
.check-ic{flex:0 0 auto; width:20px; height:20px; margin-top:1px; fill:none; stroke:var(--green); stroke-width:2.6; stroke-linecap:round; stroke-linejoin:round;}

/* ---- cover ---- */
.cover{display:flex; flex-direction:column; gap:0;}
.wordmark{display:flex; align-items:center; gap:14px; font:800 clamp(1.5rem,2.4vw,2rem)/1 var(--sans); letter-spacing:-.02em; margin-bottom:clamp(28px,5vh,54px);}
.mark{position:relative; width:30px; height:30px; border-radius:9px; background:linear-gradient(135deg,var(--accent),#2a4bd0); display:inline-flex; align-items:center; justify-content:center; box-shadow:0 0 22px rgba(79,127,255,.45);}
.mark.small{width:20px; height:20px; border-radius:6px;}
.mark-dot{width:9px; height:9px; border-radius:50%; background:#fff; box-shadow:0 0 10px #fff;}
.mark.small .mark-dot{width:6px; height:6px;}
.cover-tag{font:800 clamp(2.4rem,6vw,4.6rem)/1.03 var(--sans); letter-spacing:-.03em; text-wrap:balance; margin:0 0 clamp(30px,6vh,60px); max-width:16ch;}
.cover-meta{display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap; padding-top:24px; border-top:1px solid var(--line);}
.cover-founder,.cover-loc{display:flex; flex-direction:column; gap:4px; font-size:1.05rem;}
.cover-loc{text-align:right; align-items:flex-end;}

/* ---- terminal ---- */
.terminal{border:1px solid var(--line-strong); border-radius:14px; overflow:hidden; background:#0a0c12; max-width:760px; box-shadow:0 30px 80px -30px rgba(0,0,0,.8), 0 0 0 1px rgba(79,127,255,.06); margin-bottom:8px;}
.term-bar{display:flex; align-items:center; gap:8px; padding:12px 16px; background:rgba(255,255,255,.03); border-bottom:1px solid var(--line);}
.tdot{width:11px; height:11px; border-radius:50%; background:#2a2e3a;}
.tdot:nth-child(1){background:#ff5f57;} .tdot:nth-child(2){background:#febc2e;} .tdot:nth-child(3){background:#28c840;}
.term-title{margin-left:8px; font:500 12px/1 var(--mono); color:var(--muted);}
.term-body{padding:26px 22px; font:600 clamp(1rem,2vw,1.55rem)/1.4 var(--mono);}
.term-prompt{color:var(--green); margin-right:12px;}
.term-arg{color:var(--accent-glow);}
.term-flag{color:#c98bff;}
.term-num{color:#febc2e;}
.term-caret{display:inline-block; width:11px; height:1.05em; background:var(--accent); margin-left:8px; vertical-align:-2px; animation:blink 1.1s steps(1) infinite;}
@keyframes blink{50%{opacity:0;}}

/* ---- product ---- */
.product-grid{display:grid; grid-template-columns:1.3fr 1fr; gap:22px; align-items:start;}
.pack-cols{display:grid; grid-template-columns:1fr 1fr; gap:18px 24px;}
.pack-head{font:700 .8rem/1 var(--sans); letter-spacing:.16em; text-transform:uppercase; color:var(--accent); margin-bottom:12px;}
.pack-col ul{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; font-size:1.05rem;}
.pack-col li{padding-left:16px; position:relative;}
.pack-col li:before{content:""; position:absolute; left:0; top:.6em; width:5px; height:5px; border-radius:50%; background:var(--accent);}
.pack-plus{grid-column:1 / -1; padding-top:14px; border-top:1px solid var(--line); font-size:.98rem; color:var(--text);}
.pack-plus .muted{margin-right:6px; font-weight:600;}
.stat-stack{display:flex; flex-direction:column; gap:10px;}
.mini-stat{display:flex; align-items:baseline; gap:12px; padding:12px 16px; border:1px solid var(--line); border-radius:12px; background:var(--surface);}
.mini-num{font:800 1.6rem/1 var(--sans); letter-spacing:-.02em; color:var(--accent-glow); min-width:104px;}
.mini-num.small{font-size:1.05rem; letter-spacing:0;}
.mini-den{font-size:.9rem; color:var(--muted); font-weight:600;}
.mini-label{font-size:.86rem; color:var(--muted); line-height:1.3;}

/* ---- market ---- */
.market-grid{display:grid; grid-template-columns:1.15fr 1fr; gap:22px; align-items:stretch;}
.market-hero{display:flex; flex-direction:column; justify-content:center; gap:20px;}
.market-flow{display:grid; grid-template-columns:auto auto auto; align-items:center; gap:6px 20px; justify-content:start;}
.market-a{font:800 2.4rem/1 var(--sans); color:var(--muted); letter-spacing:-.02em;}
.market-b{font:800 3.4rem/1 var(--sans); color:var(--accent); letter-spacing:-.03em;}
.market-year{grid-row:2; font:600 .8rem/1 var(--mono); color:var(--muted); letter-spacing:.05em;}
.market-arrow{grid-row:1 / span 1; width:44px; height:16px; fill:none; stroke:var(--accent); stroke-width:2; stroke-linecap:round; stroke-linejoin:round;}
.market-cagr{font-size:1.05rem; padding-top:16px; border-top:1px solid var(--line);}
.market-side{display:flex; flex-direction:column; gap:16px;}

/* ---- business ---- */
.streams .stream-tag{font:700 .78rem/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--accent); margin-bottom:14px;}
.stream-price{font:800 clamp(1.5rem,2.4vw,2.05rem)/1 var(--sans); letter-spacing:-.02em; margin-bottom:12px;}
.stream-price .per{font-size:.9rem; color:var(--muted); font-weight:600;}
.stream-price .arrow{color:var(--muted); margin:0 4px;}
.proj-row{display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:22px;}
.proj{display:flex; flex-direction:column; gap:6px; padding:18px 22px; border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:12px; background:var(--surface);}
.proj-val{font:800 2rem/1 var(--sans); letter-spacing:-.02em;}
.proj-label{font-size:.86rem; color:var(--muted);}

/* ---- traction ---- */
.traction .card{padding:20px;}
.trac-head{font:700 .8rem/1 var(--sans); letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin:0 0 16px; padding-bottom:12px; border-bottom:1px solid var(--line);}
.traction .checks{gap:11px;}
.traction .check{font-size:.92rem;}
.logos{display:flex; flex-wrap:wrap; gap:7px; margin-top:14px;}
.logo-pill{font:600 .74rem/1 var(--sans); color:var(--text); padding:6px 9px; border:1px solid var(--line-strong); border-radius:7px; background:rgba(255,255,255,.03);}

/* ---- vision ---- */
.stages{display:grid; grid-template-columns:1fr auto 1fr auto 1fr; align-items:stretch; gap:0 18px; margin-bottom:26px;}
.stage{padding:20px; border:1px solid var(--line); border-radius:16px; background:linear-gradient(180deg,var(--surface),var(--surface-2));}
.stage-n{font:800 .9rem/1 var(--sans); color:var(--accent); letter-spacing:.02em;}
.stage-when{font:600 .78rem/1 var(--mono); margin:6px 0 12px; letter-spacing:.04em;}
.stage h4{font:700 1.05rem/1.2 var(--sans); margin:0 0 8px; letter-spacing:-.01em;}
.stage p{font-size:.9rem; line-height:1.45; margin:0;}
.stage-line{align-self:center; width:26px; height:2px; background:linear-gradient(90deg,transparent,var(--accent),transparent);}
.vision-quote{margin:0; padding:22px 26px; border-left:3px solid var(--accent); background:rgba(79,127,255,.06); border-radius:0 12px 12px 0; font:500 clamp(1rem,1.5vw,1.28rem)/1.5 var(--sans); letter-spacing:-.01em; text-wrap:balance;}

/* ---- ask ---- */
.ask-grid{display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:18px;}
.ask-grid .checks{gap:11px;}
.ask-grid .check{font-size:.94rem;}
.team{display:flex; flex-direction:column; gap:10px;}
.team-name{font-size:1.08rem;}
.team-bio{font-size:.92rem; line-height:1.5;}
.contact{display:flex; gap:22px; flex-wrap:wrap; margin-top:6px; font:600 .98rem/1 var(--mono);}

/* chrome */
.chrome{position:absolute; left:0; right:0; bottom:0; z-index:20; display:flex; align-items:center; justify-content:space-between; padding:16px clamp(24px,5vw,54px); pointer-events:none;}
.chrome>*{pointer-events:auto;}
.brand-foot{display:flex; align-items:center; gap:9px; font:700 .95rem/1 var(--sans); letter-spacing:-.01em; color:var(--muted);}
.nav{display:flex; align-items:center; gap:14px;}
.nav-btn{width:42px; height:42px; border-radius:11px; border:1px solid var(--line-strong); background:var(--surface); color:var(--text); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:background .2s, border-color .2s, transform .1s;}
.nav-btn:hover:not(:disabled){background:rgba(79,127,255,.14); border-color:var(--accent);}
.nav-btn:active:not(:disabled){transform:scale(.94);}
.nav-btn:disabled{opacity:.32; cursor:not-allowed;}
.nav-btn svg{width:19px; height:19px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round;}
.nav-btn:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
.counter{font:600 15px/1 var(--mono); letter-spacing:.05em; color:var(--muted); font-variant-numeric:tabular-nums;}
.counter-cur{color:var(--text);}
.counter-sep{margin:0 6px; opacity:.5;}

/* responsive */
@media (max-width:860px){
  .cards-3,.cards-4{grid-template-columns:1fr 1fr;}
  .product-grid,.market-grid,.ask-grid{grid-template-columns:1fr;}
  .stages{grid-template-columns:1fr; gap:12px;}
  .stage-line{display:none;}
  .proj-row{grid-template-columns:1fr;}
}
@media (max-width:560px){
  .cards-3,.cards-4,.pack-cols{grid-template-columns:1fr;}
  .cover-loc{text-align:left; align-items:flex-start;}
}
@media (prefers-reduced-motion:reduce){
  .slide{transition:opacity .01s;}
  .slide.prev,.slide.next{transform:none;}
  .term-caret{animation:none;}
  .progress-fill{transition:none;}
}
`;
