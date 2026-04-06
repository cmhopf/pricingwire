import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AssessmentTable, sliceMarkdownTable } from '../../lib/tableHelpers';
import { font, serif, teal, ink, body, muted, border, bg, bgSoft } from '../../lib/designTokens';

export default function ReportPage() {
  const router = useRouter();
  const { id } = router.query;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auditExpanded, setAuditExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/get-report?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setReport(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Backward compatibility: reports saved before the merge used
  // { assessment, deepAssessment }. New reports use { analysis }.
  const analysis = report?.analysis ||
    (report?.assessment ? { ...report.assessment, ...(report?.deepAssessment || {}) } : null);

  const sourceUrl = report?.url;
  const personas  = report?.personas || ['CEO', 'CRO', 'CFO'];

  // mcvCount: use saved value if present and valid, otherwise default to 4
  const mcvCount = (report?.mcvCount && [3, 4, 5].includes(report.mcvCount))
    ? report.mcvCount
    : 4;

  return (
    <>
      <Head>
        <title>{analysis ? `${analysis.companyName} — Value Impact Assessment` : 'Value Impact Assessment — PricingWire'}</title>
        <meta name="description" content="Value Impact Assessment powered by PricingWire" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💡</text></svg>" />
      </Head>

      <div style={s.page}>

        {/* Nav */}
        <nav style={s.nav}>
          <div style={s.navTitleRow}>
            <span style={s.navTitle}>Value Impact Assessment</span>
            <span style={s.navBy}>&nbsp;&nbsp;by PricingWire</span>
          </div>
          {sourceUrl && (
            <div style={s.navOrigin}>Assessment originated from: {sourceUrl}</div>
          )}
        </nav>

        <main style={s.main}>

          {loading && (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <p style={s.loadingText}>Loading report…</p>
            </div>
          )}

          {error && <div style={s.errorBox}>⚠️ {error}</div>}

          {/* ── EXECUTIVE DEEP-DIVE ── */}
          {analysis && (
            <div style={s.deepWrap}>

              <div style={s.deepHeader}>
                <span style={s.deepPill}>Executive Deep-Dive</span>
                <p style={s.deepSubtitle}>Multi-page analysis · {personas.join(' · ')}</p>
              </div>

              {/* Company Name + Value Headline + Overview */}
              <div style={s.companyBlock}>
                <div style={s.companyName}>{analysis.companyName}</div>
                <p style={s.valueHeadline}>&quot;{analysis.valueHeadline}&quot;</p>
                <p style={s.companyOverview}>{analysis.companyOverview}</p>
              </div>

              <div style={s.divider} />

              {/* Brief Value Story — full width */}
              <div style={s.block}>
                <div style={s.blockLabel}>⭐ Brief Value Story</div>
                <div className="md-content block-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.mcv}</ReactMarkdown>
                </div>
              </div>

              <div style={s.divider} />

              {/* Ideal Target Buyer — full width */}
              <div style={s.block}>
                <div style={s.blockLabel}>🎯 Ideal Target Buyer(s)</div>
                <p style={s.blockText}>{analysis.targetBuyer}</p>
              </div>

              <div style={s.divider} />

              {/* Why Buy | Why Now */}
              <div className="grid-2" style={s.grid2}>
                <div style={{ ...s.block, borderRight: `1px solid ${border}` }}>
                  <div style={{ ...s.blockLabel, color: '#0d9488' }}>✅ Why Buy?</div>
                  <ul style={s.ul}>
                    {(analysis.whyBuy || []).map((item, i) => <li key={i} style={s.li}>{item}</li>)}
                  </ul>
                </div>
                <div style={s.block}>
                  <div style={{ ...s.blockLabel, color: '#d97706' }}>⚡ Why Now?</div>
                  <ul style={s.ul}>
                    {(analysis.whyNow || []).map((item, i) => <li key={i} style={s.li}>{item}</li>)}
                  </ul>
                </div>
              </div>

              <div style={s.divider} />

              {/* Value Impact — MCV Table */}
              <div style={s.deepBlock}>
                <div style={s.deepBlockLabel}>📊 Value Impact — Most Compelling Value (MCV) — Top {mcvCount}</div>
                <AssessmentTable
                  markdown={sliceMarkdownTable(analysis.fullTable, mcvCount)}
                  bulletCols={[3, 4]}
                  className="table-wrap"
                />
              </div>

              {/* Value Timeline */}
              <div style={s.deepBlock}>
                <div style={s.deepBlockLabel}>📈 Value Timeline</div>
                <p style={s.deepNote}>Measurable outcomes your buyers can expect over time.</p>
                {[
                  { period: 'Within 1 Month',     content: analysis.payoffMonth1 },
                  { period: 'Within 3 Months',    content: analysis.payoffMonth3 },
                  { period: 'Within 6 Months',    content: analysis.payoffMonth6 },
                  { period: '6+ Months & Beyond', content: analysis.payoffBeyond },
                ].map(({ period, content }, i, arr) => (
                  <div key={i} style={{
                    paddingTop:    i === 0 ? '0' : '16px',
                    paddingBottom: i < arr.length - 1 ? '16px' : '0',
                    borderBottom:  i < arr.length - 1 ? `1px solid ${border}` : 'none',
                  }}>
                    <div style={s.timelinePeriod}>{period}</div>
                    <div className="md-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>

              {/* Persona Objection Responses — fully visible on shared reports */}
              <div style={{ ...s.deepBlock, borderBottom: 'none' }}>
                <div style={s.deepBlockLabel}>💬 Persona Objection Responses</div>
                <p style={s.deepNote}>
                  Anticipating the top objections from {personas.join(', ')} — with sharp, confident responses.
                </p>
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.personaObjections}</ReactMarkdown>
                </div>
              </div>

            </div>
          )}

          {/* ── SOURCE AUDIT — collapsible ── */}
          {analysis && (
            <div style={s.auditWrap}>
              <button onClick={() => setAuditExpanded(prev => !prev)} style={s.auditToggle}>
                <span style={{ ...s.deepBlockLabel, marginBottom: 0 }}>🔍 Source Audit</span>
                <span style={s.auditChevron}>{auditExpanded ? '▲' : '▼'}</span>
              </button>
              {auditExpanded && (
                <div style={{ marginTop: '20px' }} className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.sourceAudit}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          {report && (
            <div style={s.ctaBox}>
              <p style={s.ctaText}>Want a Value Impact Assessment for your own company?</p>
              <a href="/" style={s.ctaBtn}>Generate Your Own Assessment →</a>
            </div>
          )}

        </main>

        <footer style={s.footer}>
          <p style={s.footerLogo}>PricingWire</p>
          <p style={s.footerText}>Helping technology innovators discover, communicate, and monetize their most compelling value advantages.</p>
          <p style={s.footerMcv}>Your Most Compelling Value (MCV) is the fastest path to revenue growth and retention.</p>
        </footer>

      </div>
    </>
  );
}

// ── Style objects ──────────────────────────────────────────────────────────────
const s = {
  page:        { minHeight: '100vh', fontFamily: font, color: ink, backgroundColor: bg, display: 'flex', flexDirection: 'column' },
  nav:         { borderBottom: `1px solid ${border}`, padding: '20px 40px', backgroundColor: bg, textAlign: 'center' },
  navTitleRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'center' },
  navTitle:    { fontFamily: serif, fontSize: '40px', fontWeight: '700', color: ink, letterSpacing: '-0.3px' },
  navBy:       { fontFamily: font, fontSize: '20px', fontWeight: '400', color: '#9ca3af' },
  navOrigin:   { fontFamily: font, fontSize: '16px', fontWeight: '400', color: muted, marginTop: '5px' },
  main:        { maxWidth: '880px', margin: '0 auto', padding: '48px 24px 80px', width: '100%', flex: 1 },

  loadingBox:  { textAlign: 'center', padding: '40px 24px', border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bgSoft, marginBottom: '24px' },
  spinner:     { width: '28px', height: '28px', border: `2px solid ${border}`, borderTopColor: ink, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' },
  loadingText: { fontSize: '16px', fontWeight: '500', color: ink, marginTop: '14px' },
  errorBox:    { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 18px', color: '#b91c1c', fontSize: '15px', marginBottom: '24px' },

  deepWrap:     { border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden' },
  deepHeader:   { padding: '24px 32px', borderBottom: `1px solid ${border}`, backgroundColor: bgSoft, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  deepPill:     { fontSize: '13px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: teal, backgroundColor: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: '20px', padding: '4px 12px' },
  deepSubtitle: { fontSize: '14px', color: muted },

  companyBlock:    { padding: '36px 36px 28px', borderBottom: `1px solid ${border}` },
  companyName:     { fontSize: '28px', fontWeight: '700', color: ink, marginBottom: '12px', letterSpacing: '-0.5px' },
  valueHeadline:   { fontFamily: serif, fontSize: 'clamp(19px, 2.5vw, 24px)', color: '#5A5A5A', lineHeight: '1.5', marginBottom: '14px' },
  companyOverview: { fontSize: '16px', color: body, lineHeight: '1.75' },

  divider:    { height: '1px', backgroundColor: border },
  grid2:      { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  block:      { padding: '28px 32px' },
  blockLabel: { fontSize: '13px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: muted, marginBottom: '12px' },
  blockText:  { fontSize: '16px', lineHeight: '1.75', color: body },
  ul:         { paddingLeft: '18px', margin: 0 },
  li:         { fontSize: '16px', lineHeight: '1.7', color: body, marginBottom: '10px' },

  deepBlock:      { padding: '28px 32px', borderBottom: `1px solid ${border}`, backgroundColor: bg },
  deepBlockLabel: { fontSize: '14px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: ink, marginBottom: '16px' },
  deepNote:       { fontSize: '15px', color: muted, marginBottom: '16px', fontStyle: 'italic', lineHeight: '1.6' },

  timelinePeriod: { fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: teal, marginBottom: '8px' },

  auditWrap:    { border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', padding: '20px 32px' },
  auditToggle:  { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 0, fontFamily: font },
  auditChevron: { fontSize: '11px', color: muted, marginLeft: '12px' },

  ctaBox:  { border: `1px solid ${border}`, borderRadius: '12px', padding: '32px', textAlign: 'center', backgroundColor: bgSoft },
  ctaText: { fontSize: '17px', color: body, marginBottom: '16px', lineHeight: '1.6' },
  ctaBtn:  { display: 'inline-block', backgroundColor: ink, color: '#fff', padding: '11px 24px', borderRadius: '8px', fontWeight: '600', fontSize: '16px', textDecoration: 'none', fontFamily: font },

  footer:     { borderTop: `1px solid ${border}`, padding: '40px', textAlign: 'center', backgroundColor: bgSoft },
  footerLogo: { fontSize: '21px', fontWeight: '700', color: ink, marginBottom: '8px' },
  footerText: { fontSize: '20px', color: muted, lineHeight: '1.7', marginBottom: '6px' },
  footerMcv:  { fontSize: '18px', color: muted, fontStyle: 'italic' },
};
