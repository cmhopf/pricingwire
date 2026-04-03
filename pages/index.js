import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [url, setUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('Professional and persuasive');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAssessment(null);

    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, targetAudience, tone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setAssessment(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
                  disabled={loading}
                  style={{ ...s.button, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? '⏳ Analyzing…' : 'Generate Assessment'}
                </button>
              </div>

              {/* Advanced Toggle */}
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
                    <label style={s.label}>Target Audience <span style={s.optional}>(optional)</span></label>
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

          {/* Loading State */}
          {loading && (
            <div style={{ ...s.card, textAlign: 'center', padding: '48px 32px' }}>
              <div style={s.spinner} />
              <p style={{ color: '#555', marginTop: '16px', fontSize: '15px' }}>
                Analyzing website and generating your Value Impact Assessment…
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={s.errorCard}>
              ⚠️ &nbsp;{error}
            </div>
          )}

          {/* Results */}
          {assessment && (
            <div style={s.results}>

              {/* Result Header */}
              <div style={s.resultHeader}>
                <div style={s.companyName}>{assessment.companyName}</div>
                <p style={s.overviewText}>{assessment.companyOverview}</p>
                <div style={s.valueLine}>"{assessment.valueHeadline}"</div>
              </div>

              {/* MCV + Target Buyer */}
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

              {/* Why Buy + Why Now */}
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

              {/* Run Another */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => { setAssessment(null); setUrl(''); window.scrollTo(0, 0); }}
                  style={{ ...s.button, backgroundColor: '#fff', color: '#1a1a2e', border: '2px solid #1a1a2e' }}
                >
                  ↑ Run Another Assessment
                </button>
              </div>

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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// ── Styles ──────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif',
    color: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
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
    maxWidth: '900px',
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
  optional: {
    fontWeight: '400',
    color: '#999',
    fontSize: '13px',
  },
  inputRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
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
    transition: 'opacity 0.2s',
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
  disclaimer: {
    fontSize: '11px',
    color: '#aaa',
    marginTop: '16px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#4fc3f7',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    margin: '0 auto',
  },
  errorCard: {
    backgroundColor: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: '10px',
    padding: '16px 20px',
    color: '#c53030',
    fontSize: '14px',
    marginBottom: '24px',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  resultHeader: {
    backgroundColor: '#1a1a2e',
    color: 'white',
    borderRadius: '14px',
    padding: '36px 32px',
    textAlign: 'center',
  },
  companyName: {
    fontSize: '28px',
    fontWeight: '800',
    marginBottom: '12px',
  },
  overviewText: {
    opacity: 0.75,
    lineHeight: '1.7',
    fontSize: '15px',
    marginBottom: '20px',
    maxWidth: '640px',
    margin: '0 auto 20px',
  },
  valueLine: {
    fontSize: 'clamp(16px, 2.5vw, 21px)',
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#4fc3f7',
    lineHeight: '1.5',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: '14px',
    padding: '24px',
    boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
    borderTop: '4px solid #ccc',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    marginBottom: '14px',
    marginTop: 0,
  },
  bodyText: {
    fontSize: '14px',
    lineHeight: '1.7',
    color: '#444',
    margin: 0,
  },
  list: {
    paddingLeft: '18px',
    margin: 0,
  },
  listItem: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#444',
    marginBottom: '10px',
  },
  footer: {
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: '40px 24px',
    textAlign: 'center',
    lineHeight: '1.8',
    fontSize: '14px',
  },
};
