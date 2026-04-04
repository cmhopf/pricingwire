import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ReportPage() {
  const router = useRouter();
  const { id } = router.query;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const assessment = report?.assessment;
  const deepAssessment = report?.deepAssessment;
  const sourceUrl = report?.url;

  return (
    <>
      <Head>
        <title>{assessment ? `${assessment.companyName} — Value Impact Assessment` : 'Value Impact Assessment — PricingWire'}</title>
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
          <span style={s.navLogo}>PricingWire</span>
          {sourceUrl && <span style={s.navUrl}>{sourceUrl}</span>}
        </nav>

        <main style={s.main}>

          {loading && (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <p style={s.loadingText}>Loading report…</p>
            </div>
          )}

          {error && <div style={s.errorBox}>⚠️ {error}</div>}

          {/* Quick Assessment */}
          {assessment && (
            <div style={s.resultsWrap}>

              <div style={s.companyBlock}>
                <div style={s.companyName}>{assessment.companyName}</div>
                <p style={s.valueHeadline}>"{assessment.valueHeadline}"</p>
                <p style={s.companyOverview}>{assessment.companyOverview}</p>
              </div>

              <div style={s.divider} />

              <div className="grid-2" style={s.grid2}>
                <div style={s.block}>
                  <div style={s.blockLabel}>⭐ Most Compelling Value</div>
                  <p style={s.blockText}>{assessment.mcv}</p>
                </div>
                <div style={s.block}>
                  <div style={s.blockLabel}>🎯 Ideal Target Buyer</div>
                  <p style={s.blockText}>{assessment.targetBuyer}</p>
                </div>
              </div>

              <div style={s.divider} />

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

            </div>
          )}

          {/* Deep Dive */}
          {deepAssessment && (
            <div style={s.deepWrap}>
              <div style={s.deepHeader}>
                <span style={s.deepPill}>Executive Deep-Dive</span>
                <p style={s.deepSubtitle}>Multi-page analysis · CEO · CRO · CFO</p>
              </div>

              <div style={s.deepSections}>

                <div style={s.deepBlock}>
                  <div style={s.deepBlockLabel}>🔍 Source Audit</div>
                  <div className="md-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepAssessment.sourceAudit}</ReactMarkdown>
                  </div>
                </div>

                <div style={s.deepBlock}>
                  <div style={s.deepBlockLabel}>📊 Executive Impact Table — Top 5</div>
                  <div className="md-content table-wrap">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepAssessment.fullTable}</ReactMarkdown>
                  </div>
                </div>

                <div style={{ ...s.deepBlock, backgroundColor: '#f0fdf9', borderColor: '#99f6e4' }}>
                  <div style={{ ...s.deepBlockLabel, color: '#0d9488' }}>🏆 Refined Top 3 Capabilities</div>
                  <div className="md-content table-wrap">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepAssessment.refinedTable}</ReactMarkdown>
                  </div>
                </div>

                <div style={s.deepBlock}>
                  <div style={s.deepBlockLabel}>🗣️ Persona Objection Responses</div>
                  <p style={s.deepNote}>Anticipating the top objections from CEO, CRO, and CFO — with sharp, confident responses.</p>
                  <div className="md-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepAssessment.personaObjections}</ReactMarkdown>
                  </div>
                </div>

              </div>
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

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .md-content p { font-size: 16px; line-height: 1.75; color: #374151; margin-bottom: 12px; }
        .md-content p:last-child { margin-bottom: 0; }
        .md-content ul { padding-left: 20px; margin-bottom: 12px; }
        .md-content li { font-size: 16px; line-height: 1.7; color: #374151; margin-bottom: 8px; }
        .md-content strong { color: #111827; font-weight: 600; }
        .md-content h3, .md-content h4 { font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 600; color: #111827; margin: 20px 0 8px; }
        .md-content h3:first-child, .md-content h4:first-child { margin-top: 0; }

        .table-wrap { overflow-x: auto; }
        .md-content table { width: 100%; border-collapse: collapse; font-size: 15px; margin-top: 4px; }
        .md-content th { background: #111827; color: #fff; padding: 10px 14px; text-align: left; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
        .md-content th strong { color: #fff; font-weight: 600; }
        .md-content td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; vertical-align: top; line-height: 1.6; color: #374151; }
        .md-content tr:last-child td { border-bottom: none; }
        .md-content tr:nth-child(even) td { background: #fafafa; }
        .md-content tr:hover td { background: #f0fdf9; }

        @media (max-width: 680px) {
          .grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

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
  page: { minHeight: '100vh', fontFamily: font, color: ink, backgroundColor: bg, display: 'flex', flexDirection: 'column' },
  nav: { borderBottom: `1px solid ${border}`, padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: bg },
  navLogo: { fontSize: '17px', fontWeight: '700', color: ink, letterSpacing: '-0.3px' },
  navUrl: { fontSize: '14px', color: muted },
  main: { maxWidth: '880px', margin: '0 auto', padding: '48px 24px 80px', width: '100%', flex: 1 },
  loadingBox: { textAlign: 'center', padding: '40px 24px', border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bgSoft, marginBottom: '24px' },
  spinner: { width: '28px', height: '28px', border: `2px solid ${border}`, borderTopColor: ink, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' },
  loadingText: { fontSize: '16px', color: muted, marginTop: '12px' },
  errorBox: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 18px', color: '#b91c1c', fontSize: '15px', marginBottom: '24px' },
  resultsWrap: { border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden' },
  companyBlock: { padding: '36px 36px 28px', borderBottom: `1px solid ${border}` },
  companyName: { fontSize: '28px', fontWeight: '700', color: ink, marginBottom: '12px', letterSpacing: '-0.5px' },
  valueHeadline: { fontFamily: serif, fontSize: 'clamp(19px, 2.5vw, 24px)', fontStyle: 'italic', color: teal, lineHeight: '1.5', marginBottom: '14px' },
  companyOverview: { fontSize: '16px', color: body, lineHeight: '1.75' },
  divider: { height: '1px', backgroundColor: border },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  block: { padding: '28px 32px', borderRight: `1px solid ${border}` },
  blockLabel: { fontSize: '13px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: muted, marginBottom: '12px' },
  blockText: { fontSize: '16px', lineHeight: '1.75', color: body },
  ul: { paddingLeft: '18px', margin: 0 },
  li: { fontSize: '16px', lineHeight: '1.7', color: body, marginBottom: '10px' },
  deepWrap: { border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden' },
  deepHeader: { padding: '24px 32px', borderBottom: `1px solid ${border}`, backgroundColor: bgSoft, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  deepPill: { fontSize: '13px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: teal, backgroundColor: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: '20px', padding: '4px 12px' },
  deepSubtitle: { fontSize: '14px', color: muted },
  deepSections: { display: 'flex', flexDirection: 'column' },
  deepBlock: { padding: '28px 32px', borderBottom: `1px solid ${border}`, backgroundColor: bg },
  deepBlockLabel: { fontSize: '14px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: ink, marginBottom: '16px' },
  deepNote: { fontSize: '15px', color: muted, marginBottom: '16px', fontStyle: 'italic', lineHeight: '1.6' },
  ctaBox: { border: `1px solid ${border}`, borderRadius: '12px', padding: '32px', textAlign: 'center', backgroundColor: bgSoft },
  ctaText: { fontSize: '17px', color: body, marginBottom: '16px', lineHeight: '1.6' },
  ctaBtn: { display: 'inline-block', backgroundColor: ink, color: '#fff', padding: '11px 24px', borderRadius: '8px', fontWeight: '600', fontSize: '16px', textDecoration: 'none', fontFamily: font },
  footer: { borderTop: `1px solid ${border}`, padding: '40px', textAlign: 'center', backgroundColor: bgSoft },
  footerLogo: { fontSize: '16px', fontWeight: '700', color: ink, marginBottom: '8px' },
  footerText: { fontSize: '15px', color: muted, lineHeight: '1.7', marginBottom: '6px' },
  footerMcv: { fontSize: '14px', color: muted, fontStyle: 'italic' },
};
