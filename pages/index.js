import { useState } from 'react';
import Head from 'next/head';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Home() {
  const [url, setUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('Professional and persuasive');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [deepAssessment, setDeepAssessment] = useState(null);
  const [error, setError] = useState('');
  const [deepError, setDeepError] = useState('');
  const [shareId, setShareId] = useState(null);
  const [shareStatus, setShareStatus] = useState('idle');
  const [shareError, setShareError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDeepLoading(true);
    setError('');
    setDeepError('');
    setAssessment(null);
    setDeepAssessment(null);
    setShareId(null);
    setShareStatus('idle');
    setShareError('');

    const quickPromise = fetch('/api/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, targetAudience, tone }),
    });

    const deepPromise = fetch('/api/deep-assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    quickPromise
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAssessment(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    deepPromise
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setDeepAssessment(data);
      })
      .catch(err => setDeepError(err.message))
      .finally(() => setDeepLoading(false));
  };

  const handleReset = () => {
    setAssessment(null);
    setDeepAssessment(null);
    setShareId(null);
    setShareStatus('idle');
    setShareError('');
    setUrl('');
    window.scrollTo(0, 0);
  };

  const handleShare = async () => {
    setShareStatus('saving');
    try {
      const response = await fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment, deepAssessment, url }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const shareUrl = `${window.location.origin}/report/${data.id}`;
      setShareId(shareUrl);
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('ready'), 1500);
      } catch {
        setShareStatus('ready');
      }
    } catch (err) {
      console.error('Share error:', err);
      setShareError(err.message || 'Unknown error');
      setShareStatus('error');
    }
  };

  return (
    <>
      <Head>
        <title>Value Impact Assessment — PricingWire</title>
        <meta name="description" content="Instantly generate a compelling value story for your company." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💡</text></svg>" />
      </Head>

      <div style={s.page}>

        {/* ── HERO ── */}
        <section style={s.hero}>
          <p style={s.heroEyebrow}>For Technology Innovators</p>
          <h1 style={s.heroTitle}>Value Impact Assessment</h1>
          <p style={s.heroSub}>
            Instantly generate a compelling value story that highlights <strong>&quot;Why Buy?&quot;</strong> and <strong>&quot;Why Now?&quot;</strong>
          </p>
        </section>

        {/* ── MAIN ── */}
        <main style={s.main}>

          {/* ── INPUT CARD ── */}
          <div style={s.inputCard}>
            <form onSubmit={handleSubmit}>
              <label style={s.label}>Company website URL</label>
              <div className="input-row" style={s.inputRow}>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yourcompany.com"
                  required
                  style={s.input}
                />
                <button
                  type="submit"
                  disabled={loading || deepLoading}
                  style={{
                    ...s.btn,
                    opacity: (loading || deepLoading) ? 0.6 : 1,
                    cursor: (loading || deepLoading) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Analyzing…' : 'Generate →'}
                </button>
              </div>

              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} style={s.advToggle}>
                {showAdvanced ? '▲' : '▼'} Advanced options
              </button>

              {showAdvanced && (
                <div className="adv-grid" style={s.advGrid}>
                  <div>
                    <label style={s.label}>Target audience <span style={s.optional}>(optional)</span></label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value)}
                      placeholder="e.g. VP of Sales at mid-market SaaS"
                      style={s.input}
                    />
                  </div>
                  <div>
                    <label style={s.label}>Tone</label>
                    <select value={tone} onChange={e => setTone(e.target.value)} style={s.input}>
                      <option>Professional and persuasive</option>
                      <option>Bold and direct</option>
                      <option>Consultative and thoughtful</option>
                      <option>Energetic and inspiring</option>
                    </select>
                  </div>
                </div>
              )}

              <p style={s.disclaimer}>
                By submitting a URL, you confirm you have permission to analyze that website&apos;s public content.
              </p>
            </form>
          </div>

          {/* ── ERRORS ── */}
          {error && <div style={s.errorBox}>⚠️ {error}</div>}
          {deepError && <div style={s.errorBox}>⚠️ {deepError}</div>}

          {/* ── COMPREHENSIVE LOADING SPINNER ── */}
          {(loading || deepLoading) && (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <p style={s.loadingText}>Comprehensive Assessment in Progress ... this may take ~40–50 seconds</p>
            </div>
          )}

          {/* ── YOUR MOST COMPELLING VALUE (MCV) — TOP SECTION ── */}
          {deepAssessment && (
            <div style={s.mcvSection}>
              <h2 style={s.mcvHeading}>Your Most Compelling Value (MCV)</h2>
              <div className="md-content mcv-table-wrap table-wrap">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepAssessment.refinedTable}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* ── EXECUTIVE DEEP-DIVE SECTION ── */}
          {assessment && (
            <div style={s.deepWrap}>

              {/* Deep-Dive Header */}
              <div style={s.deepHeader}>
                <span style={s.deepPill}>Executive Deep-Dive</span>
                <p style={s.deepSubtitle}>Multi-page analysis · CEO · CRO · CFO</p>
              </div>

              {/* Company Name + Value Headline + Company Overview */}
              <div style={s.companyBlock}>
                <div style={s.companyName}>{assessment.companyName}</div>
                <p style={s.valueHeadline}>&quot;{assessment.valueHeadline}&quot;</p>
                <p style={s.companyOverview}>{assessment.companyOverview}</p>
              </div>

              <div style={s.divider} />

              {/* Brief Value Story | Ideal Target Buyer(s) */}
              <div className="grid-2" style={s.grid2}>
                <div style={s.block}>
                  <div style={s.blockLabel}>⭐ Brief Value Story</div>
                  <div className="md-content block-md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{assessment.mcv}</ReactMarkdown>
                  </div>
                </div>
                <div style={s.block}>
                  <div style={s.blockLabel}>🎯 Ideal Target Buyer(s)</div>
                  <p style={s.blockText}>{assessment.targetBuyer}</p>
                </div>
              </div>

              <div style={s.divider} />

              {/* Why Buy | Why Now */}
              <div className="grid-2" style={s.grid2}>
                <div style={s.block}>
                  <div style={{ ...s.blockLabel, color: '#0d9488' }}>✅ Why Buy?</div>
                  <ul style={s.ul}>
                    {assessment.whyBuy.map((item, i) => (
                      <li key={i} style={s.li}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div style={s.block}>
                  <div style={{ ...s.blockLabel, color: '#d97706' }}>⚡ Why Now?</div>
                  <ul style={s.ul}>
                    {assessment.whyNow.map((item, i) => (
                      <li key={i} style={s.li}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Deep-dive specifics — populate once deepAssessment is ready */}
              {deepAssessment && (
                <>
                  <div style={s.divider} />

                  {/* Executive Impact Table — Top 5 */}
                  <div style={s.deepBlock}>
                    <div style={s.deepBlockLabel}>📊 Executive Impact Table — Top 5</div>
                    <div className="md-content table-wrap">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepAssessment.fullTable}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Persona Objection Responses */}
                  <div style={s.deepBlock}>
                    <div style={s.deepBlockLabel}>🗣️ Persona Objection Responses</div>
                    <p style={s.deepNote}>Anticipating the top objections from CEO, CRO, and CFO — with sharp, confident responses.</p>
                    <div className="md-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepAssessment.personaObjections}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Source Audit */}
                  <div style={s.deepBlock}>
                    <div style={s.deepBlockLabel}>🔍 Source Audit</div>
                    <div className="md-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepAssessment.sourceAudit}</ReactMarkdown>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

          {/* ── ACTIONS ── */}
          {assessment && !loading && !deepLoading && (
            <div style={s.actionsWrap}>

              {shareId && (shareStatus === 'ready' || shareStatus === 'copied') && (
                <div style={s.shareLinkBox}>
                  <p style={s.shareLinkLabel}>
                    {shareStatus === 'copied' ? '✅ Copied to clipboard!' : '🔗 Shareable link'}
                  </p>
                  <div style={s.shareLinkRow}>
                    <input readOnly value={shareId} onFocus={e => e.target.select()} style={s.shareLinkInput} />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareId).catch(() => {});
                        setShareStatus('copied');
                        setTimeout(() => setShareStatus('ready'), 2000);
                      }}
                      style={s.copyBtn}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {shareStatus === 'error' && (
                <p style={{ color: '#b91c1c', fontSize: '15px', textAlign: 'center' }}>
                  ⚠️ {shareError || 'Could not save report — please try again.'}
                </p>
              )}

              <div style={s.actionBtns}>
                {!shareId && (
                  <button
                    onClick={handleShare}
                    disabled={shareStatus === 'saving'}
                    style={{
                      ...s.btn,
                      backgroundColor: '#0d9488',
                      opacity: shareStatus === 'saving' ? 0.6 : 1,
                      cursor: shareStatus === 'saving' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {shareStatus === 'saving' ? 'Saving…' : '🔗 Generate Share Link'}
                  </button>
                )}
                <button onClick={handleReset} style={s.btnOutline}>
                  ↑ Run Another Assessment
                </button>
              </div>

            </div>
          )}

        </main>

        {/* ── FOOTER ── */}
        <footer style={s.footer}>
          <p style={s.footerLogo}>PricingWire</p>
          <p style={s.footerText}>
            Helping technology innovators discover, communicate, and monetize their most compelling value advantages.
          </p>
          <p style={s.footerMcv}>Your Most Compelling Value (MCV) is the fastest path to revenue growth and retention.</p>
        </footer>

      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── General markdown styles ── */
        .md-content p {
          font-size: 16px; line-height: 1.75; color: #374151;
          margin-bottom: 12px;
        }
        .md-content p:last-child { margin-bottom: 0; }
        .md-content ul { padding-left: 20px; margin-bottom: 12px; }
        .md-content li {
          font-size: 16px; line-height: 1.7; color: #374151;
          margin-bottom: 8px;
        }
        .md-content strong { color: #111827; font-weight: 600; }
        .md-content h3, .md-content h4 {
          font-family: 'DM Sans', sans-serif;
          font-size: 17px; font-weight: 600;
          color: #111827; margin: 20px 0 8px;
        }
        .md-content h3:first-child, .md-content h4:first-child { margin-top: 0; }

        /* ── Table styles ── */
        .table-wrap { overflow-x: auto; }
        .md-content table {
          width: 100%; border-collapse: collapse;
          font-size: 15px; margin-top: 4px;
        }
        .md-content th {
          background: #111827; color: #fff;
          padding: 10px 14px; text-align: left;
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        .md-content th strong { color: #fff; font-weight: 600; }
        .md-content td {
          padding: 12px 14px; border-bottom: 1px solid #f3f4f6;
          vertical-align: top; line-height: 1.6; color: #374151;
        }
        .md-content tr:last-child td { border-bottom: none; }
        .md-content tr:nth-child(even) td { background: #fafafa; }
        .md-content tr:hover td { background: #f0fdf9; }

        /* ── MCV table — clean alternating, no green tint ── */
        .mcv-table-wrap tr:nth-child(odd) td { background: #ffffff !important; }
        .mcv-table-wrap tr:nth-child(even) td { background: #f9fafb !important; }
        .mcv-table-wrap tr:hover td { background: #f5f5f5 !important; }

        /* ── Brief Value Story block markdown — compact sizing ── */
        .block-md p { font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 8px; }
        .block-md p:last-child { margin-bottom: 0; }
        .block-md ul { padding-left: 18px; margin-top: 4px; margin-bottom: 0; }
        .block-md li { font-size: 15px; line-height: 1.65; color: #374151; margin-bottom: 6px; }

        @media (max-width: 680px) {
          .grid-2 { grid-template-columns: 1fr !important; }
          .input-row { flex-direction: column !important; }
          .adv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const font = "'DM Sans', -apple-system, sans-serif";
const serif = "'DM Serif Display', Georgia, serif";
const teal = '#0d9488';
const ink = '#111827';
const body = '#374151';
const muted = '#6b7280';
const border = '#e5e7eb';
const bg = '#ffffff';
const bgSoft = '#f9fafb';

const s = {
  page: {
    minHeight: '100vh', fontFamily: font, color: ink,
    backgroundColor: bg, display: 'flex', flexDirection: 'column',
  },

  // Hero
  hero: {
    padding: '80px 40px 64px', textAlign: 'center',
    borderBottom: `1px solid ${border}`, backgroundColor: bg,
  },
  heroEyebrow: {
    fontSize: '13px', fontWeight: '600', letterSpacing: '2px',
    textTransform: 'uppercase', color: teal, marginBottom: '20px',
  },
  heroTitle: {
    fontFamily: serif, fontSize: 'clamp(38px, 5vw, 62px)',
    fontWeight: '400', color: ink, lineHeight: '1.15',
    marginBottom: '20px', letterSpacing: '-0.5px',
  },
  heroSub: {
    fontSize: '18px', color: body, lineHeight: '1.75',
    maxWidth: '480px', margin: '0 auto',
  },

  // Main
  main: {
    maxWidth: '880px', margin: '0 auto',
    padding: '48px 24px 80px', width: '100%', flex: 1,
  },

  // Input card
  inputCard: {
    border: `1px solid ${border}`, borderRadius: '12px',
    padding: '32px', backgroundColor: bg,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '32px',
  },
  label: {
    display: 'block', fontSize: '15px', fontWeight: '600',
    color: ink, marginBottom: '8px',
  },
  optional: { fontWeight: '400', color: muted },
  inputRow: { display: 'flex', gap: '10px', marginBottom: '16px' },
  input: {
    flex: 1, padding: '10px 14px', fontSize: '16px',
    border: `1px solid ${border}`, borderRadius: '8px',
    fontFamily: font, color: ink, backgroundColor: bg,
    outline: 'none', minWidth: 0,
  },
  btn: {
    padding: '10px 22px', backgroundColor: ink, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '16px',
    fontWeight: '600', cursor: 'pointer', fontFamily: font,
    whiteSpace: 'nowrap', letterSpacing: '-0.2px',
  },
  btnOutline: {
    padding: '10px 22px', backgroundColor: bg, color: ink,
    border: `1px solid ${border}`, borderRadius: '8px', fontSize: '16px',
    fontWeight: '500', cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap',
  },
  advToggle: {
    background: 'none', border: 'none', fontSize: '14px',
    color: muted, cursor: 'pointer', fontFamily: font,
    padding: '0 0 16px', fontWeight: '500',
  },
  advGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
    paddingTop: '16px', borderTop: `1px solid ${border}`, marginBottom: '4px',
  },
  disclaimer: { fontSize: '13px', color: muted, marginTop: '16px' },

  // Loading
  loadingBox: {
    textAlign: 'center', padding: '40px 24px',
    border: `1px solid ${border}`, borderRadius: '12px',
    backgroundColor: bgSoft, marginBottom: '24px',
  },
  spinner: {
    width: '28px', height: '28px',
    border: `2px solid ${border}`, borderTopColor: ink,
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    margin: '0 auto',
  },
  loadingText: {
    fontSize: '16px', fontWeight: '500', color: ink, marginTop: '14px',
  },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '8px', padding: '14px 18px',
    color: '#b91c1c', fontSize: '15px', marginBottom: '24px',
  },

  // Your MCV section (top)
  mcvSection: {
    border: `1px solid ${border}`, borderRadius: '12px',
    backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    marginBottom: '24px', overflow: 'hidden', padding: '32px',
    animation: 'fadeUp 0.4s ease forwards',
  },
  mcvHeading: {
    fontFamily: font, fontSize: '22px', fontWeight: '700',
    color: ink, marginBottom: '20px', letterSpacing: '-0.3px',
  },

  // Executive Deep-Dive wrapper
  deepWrap: {
    border: `1px solid ${border}`, borderRadius: '12px',
    backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    marginBottom: '24px', overflow: 'hidden',
    animation: 'fadeUp 0.4s ease forwards',
  },
  deepHeader: {
    padding: '24px 32px', borderBottom: `1px solid ${border}`,
    backgroundColor: bgSoft, display: 'flex',
    alignItems: 'center', gap: '16px', flexWrap: 'wrap',
  },
  deepPill: {
    fontSize: '13px', fontWeight: '700', letterSpacing: '1.5px',
    textTransform: 'uppercase', color: teal,
    backgroundColor: '#f0fdf9', border: '1px solid #99f6e4',
    borderRadius: '20px', padding: '4px 12px',
  },
  deepSubtitle: { fontSize: '14px', color: muted },

  // Company block (inside deepWrap)
  companyBlock: {
    padding: '36px 36px 28px', borderBottom: `1px solid ${border}`,
  },
  companyName: {
    fontSize: '28px', fontWeight: '700', color: ink,
    marginBottom: '12px', letterSpacing: '-0.5px',
  },
  valueHeadline: {
    fontFamily: serif, fontSize: 'clamp(19px, 2.5vw, 24px)',
    color: '#5A5A5A', lineHeight: '1.5', marginBottom: '14px',
  },
  companyOverview: {
    fontSize: '16px', color: body, lineHeight: '1.75',
  },

  divider: { height: '1px', backgroundColor: border },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  block: {
    padding: '28px 32px',
    borderRight: `1px solid ${border}`,
  },
  blockLabel: {
    fontSize: '13px', fontWeight: '700', letterSpacing: '1px',
    textTransform: 'uppercase', color: muted, marginBottom: '12px',
  },
  blockText: {
    fontSize: '16px', lineHeight: '1.75', color: body,
  },
  ul: { paddingLeft: '18px', margin: 0 },
  li: {
    fontSize: '16px', lineHeight: '1.7', color: body,
    marginBottom: '10px',
  },

  // Deep content blocks (impact table, objections, source audit)
  deepBlock: {
    padding: '28px 32px', borderBottom: `1px solid ${border}`,
    backgroundColor: bg,
  },
  deepBlockLabel: {
    fontSize: '14px', fontWeight: '700', letterSpacing: '0.8px',
    textTransform: 'uppercase', color: ink, marginBottom: '16px',
  },
  deepNote: {
    fontSize: '15px', color: muted, marginBottom: '16px',
    fontStyle: 'italic', lineHeight: '1.6',
  },

  // Actions
  actionsWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '16px', marginTop: '8px',
  },
  shareLinkBox: {
    width: '100%', maxWidth: '560px',
    border: `1px solid #99f6e4`, borderRadius: '10px',
    padding: '18px 20px', backgroundColor: '#f0fdf9',
  },
  shareLinkLabel: {
    fontSize: '15px', fontWeight: '600', color: '#0f766e',
    marginBottom: '10px',
  },
  shareLinkRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  shareLinkInput: {
    flex: 1, padding: '8px 12px', fontSize: '14px',
    border: `1px solid ${border}`, borderRadius: '6px',
    fontFamily: 'monospace', color: body,
    backgroundColor: bg, minWidth: 0,
  },
  copyBtn: {
    padding: '8px 16px', backgroundColor: teal, color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '15px',
    fontWeight: '600', cursor: 'pointer', fontFamily: font,
  },
  actionBtns: {
    display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center',
  },

  // Footer
  footer: {
    borderTop: `1px solid ${border}`, padding: '40px 40px',
    textAlign: 'center', backgroundColor: bgSoft,
  },
  footerLogo: {
    fontSize: '16px', fontWeight: '700', color: ink, marginBottom: '8px',
  },
  footerText: {
    fontSize: '15px', color: muted, lineHeight: '1.7', marginBottom: '6px',
  },
  footerMcv: {
    fontSize: '14px', color: muted, fontStyle: 'italic',
  },
};
