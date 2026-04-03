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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDeepLoading(true);
    setError('');
    setDeepError('');
    setAssessment(null);
    setDeepAssessment(null);

    // Both calls fire in parallel — quick one surfaces first
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
    setUrl('');
    window.scrollTo(0, 0);
  };

  const showDeepSection = deepLoading || deepAssessment || deepError;

  return (
    <>
      <Head>
        <title>Value Impact Assessment — PricingWire</title>
        <meta name="description" content="Instantly generate a compelling value story for your company." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💡</text></svg>" />
      </Head>

      <div style={s.page}>

        {/* ── HEADER ── */}
        <header style={s.header}>
          <div style={s.logoLabel}>PricingWire</div>
          <h1 style={s.heroTitle}>Value Impact Assessment</h1>
          <p style={s.heroSub}>
            Instantly generate a compelling value story that highlights{' '}
            <strong style={{ color: '#4fc3f7' }}>"Why Buy?"</strong> and{' '}
            <strong style={{ color: '#4fc3f7' }}>"Why Now?"</strong>
          </p>
        </header>

        {/* ── MAIN ── */}
        <main style={s.main}>

          {/* Input Card */}
          <div style={s.card}>
            <form onSubmit={handleSubmit}>
              <label style={s.label}>Enter your company's website:</label>
              <div className="input-row" style={s.inputRow}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourcompany.com"
                  required
                  style={s.input}
                />
                <button
                  type="submit"
                  disabled={loading || deepLoading}
                  style={{
                    ...s.button,
                    opacity: (loading || deepLoading) ? 0.7 : 1,
                    cursor: (loading || deepLoading) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? '⏳ Analyzing…' : 'Generate Assessment'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={s.advancedToggle}
              >
                Advanced Options {showAdvanced ? '▲' : '▼'}
              </button>

              {showAdvanced && (
                <div className="advanced-grid" style={s.advancedGrid}>
                  <div>
                    <label style={s.label}>
                      Target Audience <span style={s.optional}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. VP of Sales at mid-market SaaS companies"
                      style={s.input}
                    />
                  </div>
                  <div>
                    <label style={s.label}>Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      style={s.input}
                    >
                      <option>Professional and persuasive</option>
                      <option>Bold and direct</option>
                      <option>Consultative and thoughtful</option>
                      <option>Energetic and inspiring</option>
                    </select>
                  </div>
                </div>
              )}

              <p style={s.disclaimer}>
                By submitting a URL, you confirm you have permission to analyze that website's public content.
              </p>
            </form>
          </div>

          {/* Quick Assessment Loading */}
          {loading && (
            <div style={{ ...s.card, textAlign: 'center', padding: '48px 32px' }}>
              <div style={s.spinner} />
              <p style={{ color: '#555', marginTop: '16px', fontSize: '15px' }}>
                Generating your Value Impact Assessment…
              </p>
            </div>
          )}

          {error && <div style={s.errorCard}>⚠️ &nbsp;{error}</div>}

          {/* ── QUICK ASSESSMENT RESULTS ── */}
          {assessment && (
            <div style={s.results}>
              <div style={s.resultHeader}>
                <div style={s.companyName}>{assessment.companyName}</div>
                <p style={s.overviewText}>{assessment.companyOverview}</p>
                <div style={s.valueLine}>"{assessment.valueHeadline}"</div>
              </div>

              <div className="grid-2col" style={s.grid}>
                <div style={{ ...s.resultCard, borderTopColor: '#4fc3f7' }}>
                  <h3 style={s.sectionTitle}>⭐ Most Compelling Value</h3>
                  <p style={s.bodyText}>{assessment.mcv}</p>
                </div>
                <div style={{ ...s.resultCard, borderTopColor: '#a78bfa' }}>
                  <h3 style={s.sectionTitle}>🎯 Ideal Target Buyer</h3>
                  <p style={s.bodyText}>{assessment.targetBuyer}</p>
                </div>
              </div>

              <div className="grid-2col" style={s.grid}>
                <div style={{ ...s.resultCard, borderTopColor: '#34d399' }}>
                  <h3 style={s.sectionTitle}>✅ Why Buy?</h3>
                  <ul style={s.list}>
                    {assessment.whyBuy.map((item, i) => (
                      <li key={i} style={s.listItem}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ ...s.resultCard, borderTopColor: '#f59e0b' }}>
                  <h3 style={s.sectionTitle}>⚡ Why Now?</h3>
                  <ul style={s.list}>
                    {assessment.whyNow.map((item, i) => (
                      <li key={i} style={s.listItem}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── EXECUTIVE DEEP-DIVE SECTION ── */}
          {showDeepSection && (
            <div style={s.deepSection}>
              <div style={s.deepDivider}>
                <div style={s.deepDividerLine} />
                <div style={s.deepDividerLabel}>⚡ Executive Deep-Dive Analysis</div>
                <div style={s.deepDividerLine} />
              </div>

              {deepLoading && (
                <div style={{ ...s.card, textAlign: 'center', padding: '48px 32px' }}>
                  <div style={s.spinnerDeep} />
                  <p style={{ color: '#555', marginTop: '16px', fontSize: '15px' }}>
                    Crawling subpages and building executive analysis…
                  </p>
                  <p style={{ color: '#aaa', marginTop: '8px', fontSize: '13px' }}>
                    This takes 20–40 seconds — we're analyzing multiple pages for deeper insight
                  </p>
                </div>
              )}

              {deepError && <div style={s.errorCard}>⚠️ &nbsp;{deepError}</div>}

              {deepAssessment && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* Source Audit */}
                  <div style={{ ...s.deepCard, borderLeftColor: '#94a3b8' }}>
                    <h3 style={{ ...s.deepSectionTitle, color: '#475569' }}>
                      🔍 Source Audit &amp; Research Transparency
                    </h3>
                    <div className="md-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {deepAssessment.sourceAudit}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Full 5-Row Table */}
                  <div style={{ ...s.deepCard, borderLeftColor: '#4fc3f7' }}>
                    <h3 style={{ ...s.deepSectionTitle, color: '#0e7490' }}>
                      📊 Executive Impact Table — Top 5 Capabilities
                    </h3>
                    <div className="md-content" style={{ overflowX: 'auto' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {deepAssessment.fullTable}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Refined Top 3 */}
                  <div style={{ ...s.deepCard, borderLeftColor: '#34d399', backgroundColor: '#f0fdf4' }}>
                    <h3 style={{ ...s.deepSectionTitle, color: '#065f46' }}>
                      🏆 Refined Top 3 — Most Compelling Capabilities
                    </h3>
                    <div className="md-content" style={{ overflowX: 'auto' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {deepAssessment.refinedTable}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Persona Objections */}
                  <div style={{ ...s.deepCard, borderLeftColor: '#a78bfa' }}>
                    <h3 style={{ ...s.deepSectionTitle, color: '#5b21b6' }}>
                      🗣️ Persona Objection Responses
                    </h3>
                    <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px', marginTop: '-4px' }}>
                      CEO · CRO · CFO — top objections with sharp, confident responses
                    </p>
                    <div className="md-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {deepAssessment.personaObjections}
                      </ReactMarkdown>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Run Another */}
          {assessment && !loading && (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button
                onClick={handleReset}
                style={{
                  ...s.button,
                  backgroundColor: '#fff',
                  color: '#1a1a2e',
                  border: '2px solid #1a1a2e',
                }}
              >
                ↑ Run Another Assessment
              </button>
            </div>
          )}

        </main>

        {/* ── FOOTER ── */}
        <footer style={s.footer}>
          <p style={{ marginBottom: '8px' }}>
            <strong>PricingWire</strong> helps technology innovators discover, communicate and monetize their most compelling value advantages.
          </p>
          <p style={{ opacity: 0.6, fontSize: '13px' }}>
            Your <strong>Most Compelling Value (MCV)</strong> is the fastest path to revenue growth and retention.
          </p>
        </footer>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .md-content table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 8px;
        }
        .md-content th {
          background: #1a1a2e;
          color: white;
          padding: 10px 14px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
        }
        .md-content td {
          padding: 10px 14px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
          line-height: 1.55;
          color: #334155;
          font-size: 13px;
        }
        .md-content tr:nth-child(even) td { background: #f8fafc; }
        .md-content tr:hover td { background: #f1f5f9; }
        .md-content ul { padding-left: 18px; margin: 4px 0; }
        .md-content li { margin-bottom: 8px; line-height: 1.6; color: #334155; font-size: 14px; }
        .md-content p { margin: 0 0 10px; line-height: 1.65; color: #334155; font-size: 14px; }
        .md-content strong { color: #1a1a2e; }
        .md-content th strong { color: white; }
        .md-content h3, .md-content h4 { margin: 18px 0 8px; color: #1a1a2e; }

        @media (max-width: 640px) {
          .grid-2col { grid-template-columns: 1fr !important; }
          .input-row { flex-direction: column !important; }
          .advanced-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif',
    color: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: '64px 24px 56px',
    textAlign: 'center',
  },
  logoLabel: {
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    color: '#4fc3f7',
    marginBottom: '20px',
  },
  heroTitle: {
    fontSize: 'clamp(28px, 5vw, 48px)',
    fontWeight: '800',
    letterSpacing: '-1px',
    margin: '0 0 16px',
  },
  heroSub: {
    fontSize: '17px',
    opacity: 0.8,
    maxWidth: '540px',
    margin: '0 auto',
    lineHeight: '1.7',
  },
  main: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '40px 20px 60px',
    width: '100%',
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '14px',
    padding: '32px',
    boxShadow: '0 2px 24px rgba(0,0,0,0.08)',
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontWeight: '600',
    fontSize: '14px',
    marginBottom: '8px',
    color: '#333',
  },
  optional: { fontWeight: '400', color: '#999', fontSize: '13px' },
  inputRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
  input: {
    flex: 1,
    padding: '11px 14px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#1a1a2e',
    minWidth: 0,
    backgroundColor: 'white',
  },
  button: {
    padding: '11px 26px',
    backgroundColor: '#1a1a2e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  advancedToggle: {
    background: 'none',
    border: 'none',
    color: '#4fc3f7',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: '16px',
    fontFamily: 'inherit',
  },
  advancedGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    borderTop: '1px solid #f0f0f0',
    paddingTop: '20px',
    marginBottom: '8px',
  },
  disclaimer: { fontSize: '11px', color: '#aaa', marginTop: '16px' },
  spinner: {
    width: '36px', height: '36px',
    border: '3px solid #e2e8f0', borderTopColor: '#4fc3f7',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto',
  },
  spinnerDeep: {
    width: '36px', height: '36px',
    border: '3px solid #e2e8f0', borderTopColor: '#a78bfa',
    borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto',
  },
  errorCard: {
    backgroundColor: '#fff5f5', border: '1px solid #feb2b2',
    borderRadius: '10px', padding: '16px 20px',
    color: '#c53030', fontSize: '14px', marginBottom: '24px',
  },
  results: { display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '8px' },
  resultHeader: {
    backgroundColor: '#1a1a2e', color: 'white',
    borderRadius: '14px', padding: '36px 32px', textAlign: 'center',
  },
  companyName: { fontSize: '28px', fontWeight: '800', marginBottom: '12px' },
  overviewText: {
    opacity: 0.75, lineHeight: '1.7', fontSize: '15px',
    marginBottom: '20px', maxWidth: '640px', margin: '0 auto 20px',
  },
  valueLine: {
    fontSize: 'clamp(16px, 2.5vw, 21px)',
    fontWeight: '700', fontStyle: 'italic', color: '#4fc3f7', lineHeight: '1.5',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  resultCard: {
    backgroundColor: 'white', borderRadius: '14px', padding: '24px',
    boxShadow: '0 2px 20px rgba(0,0,0,0.07)', borderTop: '4px solid #ccc',
  },
  sectionTitle: { fontSize: '15px', fontWeight: '700', marginBottom: '14px', marginTop: 0 },
  bodyText: { fontSize: '14px', lineHeight: '1.7', color: '#444', margin: 0 },
  list: { paddingLeft: '18px', margin: 0 },
  listItem: { fontSize: '14px', lineHeight: '1.6', color: '#444', marginBottom: '10px' },
  deepSection: { marginTop: '12px' },
  deepDivider: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', marginTop: '12px' },
  deepDividerLine: { flex: 1, height: '1px', backgroundColor: '#e2e8f0' },
  deepDividerLabel: {
    fontSize: '13px', fontWeight: '700', color: '#64748b',
    whiteSpace: 'nowrap', letterSpacing: '0.5px', textTransform: 'uppercase',
  },
  deepCard: {
    backgroundColor: 'white', borderRadius: '14px', padding: '28px 32px',
    boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
    borderLeft: '4px solid #ccc',
  },
  deepSectionTitle: { fontSize: '16px', fontWeight: '700', marginBottom: '16px', marginTop: 0 },
  footer: {
    backgroundColor: '#1a1a2e', color: 'white',
    padding: '40px 24px', textAlign: 'center', lineHeight: '1.8', fontSize: '14px',
  },
};
