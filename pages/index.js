import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AssessmentTable, sliceMarkdownTable } from '../lib/tableHelpers';
import { font, serif, teal, ink, body, muted, border, bg, bgSoft } from '../lib/designTokens';

// ── MCV count — fixed at Top 4 ────────────────────────────────────────────────
const mcvCount = 3;

// ── Loading step messages ──────────────────────────────────────────────────────
const PRESET_PERSONAS = ['CEO', 'CRO', 'CFO', 'CMO', 'CIO', 'CTO'];

const LOADING_STEPS = [
  { doing: 'Fetching homepage HTML',                next: 'Discovering pages via sitemap' },
  { doing: 'Discovering pages via sitemap',         next: 'Selecting the most relevant pages' },
  { doing: 'Fetching and analyzing selected pages', next: 'Building your value assessment' },
  { doing: 'Building your value assessment',        next: 'Finalizing and formatting your report' },
  { doing: 'Finalizing and formatting your report', next: 'Almost ready…' },
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [tone, setTone] = useState('');
  const [reportTone, setReportTone] = useState('Professional and persuasive');
  const [singlePageOnly, setSinglePageOnly] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState(['CEO', 'CRO', 'CFO']);
  const [otherPersonaChecked, setOtherPersonaChecked] = useState(false);
  const [otherPersona, setOtherPersona] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [shareId, setShareId] = useState(null);
  const [shareStatus, setShareStatus] = useState('idle');
  const [shareError, setShareError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [vsUnlocked, setVsUnlocked] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const activePersonas = [
    ...selectedPersonas,
    ...(otherPersonaChecked && otherPersona.trim() ? [otherPersona.trim()] : []),
  ];

  // ── Advance loading step on a timer while request is in flight ────────────
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const timer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 9000);
    return () => clearInterval(timer);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const effectiveTone = tone.trim() || 'Professional and persuasive';
    setReportTone(effectiveTone);
    setTone('');
    setLoading(true);
    setError('');
    setAnalysis(null);
    setShareId(null);
    setShareStatus('idle');
    setShareError('');
    setVsUnlocked(false);
    setAuditExpanded(false);

    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, singlePageOnly, personas: activePersonas, tone: effectiveTone }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setShowAdvanced(false);
    setAnalysis(null);
    setShareId(null);
    setShareStatus('idle');
    setShareError('');
    setUrl('');
    setSinglePageOnly(false);
    setSelectedPersonas(['CEO', 'CRO', 'CFO']);
    setOtherPersonaChecked(false);
    setOtherPersona('');
    setEmailInput('');
    setVsUnlocked(false);
    setAuditExpanded(false);
    setTone('');
    setReportTone('Professional and persuasive');
    window.scrollTo(0, 0);
  };

  const handleShare = async () => {
    setShareStatus('saving');
    try {
      const response = await fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, url, personas: activePersonas, mcvCount, tone: reportTone }),
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

  const handleUnlock = (e) => {
    e.preventDefault();
    setVsUnlocked(true);
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

        {/* ── 100VH WRAPPER — keeps footer below fold on first load ── */}
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

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
          {!analysis && !loading && (
          <div style={s.inputCard}>
            <form onSubmit={handleSubmit}>
              <label style={s.label}>Company website URL</label>
              <div className="input-row" style={s.inputRow}>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://..."
                  required
                  style={s.input}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{ ...s.btn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Analyzing…' : 'Generate →'}
                </button>
              </div>

              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} style={s.advToggle}>
                {showAdvanced ? '▲' : '▼'} Advanced options
              </button>

              {showAdvanced && (
                <>
                  {/* 1. Analyze this Page Only */}
                  <div style={s.checkboxRow}>
                    <label style={s.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={singlePageOnly}
                        onChange={e => setSinglePageOnly(e.target.checked)}
                        style={s.checkbox}
                      />
                      Analyze this Page Only
                    </label>
                    <span style={s.checkboxHint}>Skip subpage crawling — analyze only the submitted URL</span>
                  </div>

                  {/* 2. Target Personas */}
                  <div style={s.personaSection}>
                    <label style={s.label}>
                      Target Personas
                      <span style={s.optional}> (select up to 4)</span>
                      {activePersonas.length >= 4 && (
                        <span style={s.personaMaxNote}> — maximum reached</span>
                      )}
                    </label>
                    <div style={s.personaGrid}>
                      {PRESET_PERSONAS.map(p => {
                        const isChecked = selectedPersonas.includes(p);
                        const isDisabled = !isChecked && activePersonas.length >= 4;
                        return (
                          <label key={p} style={{ ...s.personaItem, opacity: isDisabled ? 0.38 : 1 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isDisabled}
                              onChange={e => {
                                setSelectedPersonas(prev =>
                                  e.target.checked ? [...prev, p] : prev.filter(x => x !== p)
                                );
                              }}
                              style={s.checkbox}
                            />
                            {p}
                          </label>
                        );
                      })}
                      <label style={{ ...s.personaItem, opacity: (!otherPersonaChecked && activePersonas.length >= 4) ? 0.38 : 1 }}>
                        <input
                          type="checkbox"
                          checked={otherPersonaChecked}
                          disabled={!otherPersonaChecked && activePersonas.length >= 4}
                          onChange={e => {
                            setOtherPersonaChecked(e.target.checked);
                            if (!e.target.checked) setOtherPersona('');
                          }}
                          style={s.checkbox}
                        />
                        Other:
                      </label>
                      {otherPersonaChecked && (
                        <input
                          type="text"
                          value={otherPersona}
                          onChange={e => setOtherPersona(e.target.value)}
                          placeholder="e.g. VP Sales"
                          style={s.personaOtherInput}
                          maxLength={40}
                        />
                      )}
                    </div>
                  </div>

                  {/* 3. Replace Tone */}
                  <div style={s.personaSection}>
                    <label style={s.label}>Replace Tone</label>
                    <input
                      type="text"
                      value={tone}
                      onChange={e => setTone(e.target.value)}
                      placeholder="Default: Professional & Persuasive. (max 30 chars.)"
                      maxLength={30}
                      style={{ ...s.input, marginTop: '2px', width: '100%', flex: 'none' }}
                    />
                  </div>
                </>
              )}

              <p style={s.disclaimer}>
                By submitting a URL, you confirm you have permission to analyze that website&apos;s public content.
              </p>
              <p style={{ ...s.disclaimer, marginTop: '8px' }}>
                While rare, some websites prevent analysis of their content.
              </p>
            </form>
          </div>
          )}{/* end !analysis input card */}

          {/* ── ERROR ── */}
          {error && <div style={s.errorBox}>⚠️ {error}</div>}

          {/* ── LOADING STATE ── */}
          {loading && (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <p style={s.loadingText}>{LOADING_STEPS[loadingStep].doing}</p>
              <p style={s.loadingNext}>Next: {LOADING_STEPS[loadingStep].next}</p>
              <p style={s.loadingTiming}>Your thorough Assessment may require ~60–90 seconds.</p>
            </div>
          )}

          {/* ── EXECUTIVE DEEP-DIVE ── */}
          {analysis && (
            <div style={s.deepWrap}>

              {/* Header */}
              <div style={s.deepHeader}>
                <span style={s.deepPill}>Executive Deep-Dive</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <p style={s.deepSubtitle}>Multi-page analysis · {activePersonas.join(' · ')}</p>
                  <p style={s.deepSubtitle}>Tone: {reportTone}</p>
                </div>
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
                  <div style={s.blockLabel}>✅ Why Buy?</div>
                  <ul style={s.ul}>
                    {(analysis.whyBuy || []).map((item, i) => <li key={i} style={s.li}>{item}</li>)}
                  </ul>
                </div>
                <div style={s.block}>
                  <div style={s.blockLabel}>⚡ Why Now?</div>
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

              {/* Persona Objection Responses — blur-gated on content only */}
              <div style={{ ...s.deepBlock, borderBottom: 'none' }}>
                <div style={s.deepBlockLabel}>💬 Persona Objection Responses</div>
                <p style={s.deepNote}>
                  Anticipating the top objections from {activePersonas.join(', ')} — with sharp, confident responses.
                </p>

                <div style={{ position: 'relative' }}>

                  {/* Blurred content */}
                  <div style={{
                    filter:        vsUnlocked ? 'none' : 'blur(5px)',
                    userSelect:    vsUnlocked ? 'auto' : 'none',
                    pointerEvents: vsUnlocked ? 'auto' : 'none',
                    transition:    'filter 0.5s ease',
                  }}>
                    <div className="md-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.personaObjections}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Email unlock overlay */}
                  {!vsUnlocked && (
                    <div style={s.blurOverlay}>
                      <div style={s.blurGate}>
                        <div style={s.gateLock}>🔓</div>
                        <h2 style={s.gateTitle}>Unlock Objection Responses</h2>
                        <p style={s.gateSub}>
                          See sharp, confident responses to the top objections from {activePersonas.join(', ')}.
                        </p>
                        <form onSubmit={handleUnlock} style={s.gateForm}>
                          <input
                            type="email"
                            required
                            value={emailInput}
                            onChange={e => setEmailInput(e.target.value)}
                            placeholder="Your work email"
                            style={s.gateInput}
                          />
                          <button type="submit" style={s.gateBtn}>Unlock Now →</button>
                        </form>
                        <p style={s.gatePrivacy}>No spam — only used to unlock your results.</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

          {/* ── ACTIONS ── */}
          {analysis && !loading && (
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

              {!shareId && (
                <div style={s.actionBtns}>
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
                </div>
              )}

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

        </main>

        </div>{/* end 100vh wrapper */}

        {/* ── FOOTER ── */}
        <footer style={s.footer}>
          <p style={s.footerText}>
            PricingWire helps you quantify, communicate, and monetize your Most Compelling Value (MCV).
          </p>
          <a
            href="https://www.pricingwire.com/pricing-strategy-sessions"
            target="_blank"
            rel="noopener noreferrer"
            style={s.footerLink}
          >
            Click to Book a Strategy Session
          </a>
        </footer>

      </div>
    </>
  );
}

// ── Style objects ──────────────────────────────────────────────────────────────
const s = {
  page:        { minHeight: '100vh', fontFamily: font, color: ink, backgroundColor: bg, display: 'flex', flexDirection: 'column' },
  hero:        { padding: '62px 40px 50px', textAlign: 'center', borderBottom: `1px solid ${border}`, backgroundColor: bg },
  heroEyebrow: { fontSize: '13px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', color: teal, marginBottom: '20px' },
  heroTitle:   { fontFamily: serif, fontSize: 'clamp(38px, 5vw, 62px)', fontWeight: '400', color: ink, lineHeight: '1.15', marginBottom: '20px', letterSpacing: '-0.5px' },
  heroSub:     { fontSize: '18px', color: body, lineHeight: '1.75', maxWidth: '480px', margin: '0 auto' },
  main:        { maxWidth: '880px', margin: '0 auto', padding: '48px 24px 80px', width: '100%', flex: 1 },

  inputCard:  { border: `1px solid ${border}`, borderRadius: '12px', padding: '32px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '32px' },
  label:      { display: 'block', fontSize: '15px', fontWeight: '600', color: ink, marginBottom: '8px' },
  optional:   { fontWeight: '400', color: muted },
  inputRow:   { display: 'flex', gap: '10px', marginBottom: '16px' },
  input:      { flex: 1, padding: '10px 14px', fontSize: '16px', border: `1px solid ${border}`, borderRadius: '8px', fontFamily: font, color: ink, backgroundColor: bg, outline: 'none', minWidth: 0 },
  btn:        { padding: '10px 22px', backgroundColor: ink, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap', letterSpacing: '-0.2px' },
  advToggle:  { background: 'none', border: 'none', fontSize: '14px', color: muted, cursor: 'pointer', fontFamily: font, padding: '0 0 16px', fontWeight: '500' },

  checkboxRow:    { display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '14px', marginBottom: '4px', borderTop: `1px solid ${border}` },
  checkboxLabel:  { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', fontWeight: '600', color: ink, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' },
  checkbox:       { width: '15px', height: '15px', accentColor: teal, cursor: 'pointer' },
  checkboxHint:   { fontSize: '13px', color: muted, marginTop: '6px' },

  personaSection:    { paddingTop: '16px', borderTop: `1px solid ${border}`, marginBottom: '4px' },
  personaGrid:       { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px', alignItems: 'center' },
  personaItem:       { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: ink, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' },
  personaOtherInput: { padding: '5px 10px', fontSize: '14px', border: `1px solid ${border}`, borderRadius: '6px', fontFamily: font, color: ink, backgroundColor: bg, outline: 'none', width: '160px' },
  personaMaxNote:    { fontWeight: '500', color: '#d97706', fontSize: '13px' },

  disclaimer: { fontSize: '13px', color: muted, marginTop: '16px' },

  loadingBox:    { textAlign: 'center', padding: '40px 24px', border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bgSoft, marginBottom: '24px' },
  spinner:       { width: '28px', height: '28px', border: `2px solid ${border}`, borderTopColor: ink, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' },
  loadingText:   { fontSize: '16px', fontWeight: '500', color: ink, marginTop: '14px' },
  loadingNext:   { fontSize: '13px', color: muted, marginTop: '6px' },
  loadingTiming: { fontSize: '13px', color: muted, marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${border}` },

  errorBox: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 18px', color: '#b91c1c', fontSize: '15px', marginBottom: '24px' },

  deepWrap:     { border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden', animation: 'fadeUp 0.4s ease forwards' },
  deepHeader:   { padding: '24px 32px', borderBottom: `1px solid ${border}`, backgroundColor: bgSoft, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  deepPill:     { fontSize: '13px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: teal, backgroundColor: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: '20px', padding: '4px 12px' },
  deepSubtitle: { fontSize: '14px', color: muted },

  companyBlock:    { padding: '36px 36px 28px', borderBottom: `1px solid ${border}` },
  companyName:     { fontSize: '28px', fontWeight: '700', color: ink, marginBottom: '12px', letterSpacing: '-0.5px' },
  valueHeadline:   { fontFamily: serif, fontSize: 'clamp(19px, 2.5vw, 24px)', color: ink, lineHeight: '1.5', marginBottom: '14px' },
  companyOverview: { fontSize: '16px', color: body, lineHeight: '1.75' },

  divider:    { height: '1px', backgroundColor: border },
  grid2:      { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  block:      { padding: '28px 32px' },
  blockLabel: { fontSize: '16px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: ink, marginBottom: '12px' },
  blockText:  { fontSize: '16px', lineHeight: '1.75', color: body },
  ul:         { paddingLeft: '18px', margin: 0 },
  li:         { fontSize: '16px', lineHeight: '1.7', color: body, marginBottom: '10px' },

  deepBlock:      { padding: '28px 32px', borderBottom: `1px solid ${border}`, backgroundColor: bg },
  deepBlockLabel: { fontSize: '16px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: ink, marginBottom: '16px' },
  deepNote:       { fontSize: '15px', color: muted, marginBottom: '16px', fontStyle: 'italic', lineHeight: '1.6' },

  timelinePeriod: { fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: teal, marginBottom: '8px' },

  blurOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '40px', backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: '8px' },
  blurGate:    { maxWidth: '420px', width: '100%', textAlign: 'center', backgroundColor: bg, border: `1px solid #99f6e4`, borderRadius: '12px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  gateLock:    { fontSize: '28px', marginBottom: '12px' },
  gateTitle:   { fontFamily: serif, fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: '400', color: ink, marginBottom: '10px', letterSpacing: '-0.3px' },
  gateSub:     { fontSize: '15px', color: body, lineHeight: '1.65', marginBottom: '20px' },
  gateForm:    { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '10px' },
  gateInput:   { flex: '1', minWidth: '200px', maxWidth: '260px', padding: '10px 14px', fontSize: '15px', border: `1px solid #5eead4`, borderRadius: '8px', fontFamily: font, color: ink, backgroundColor: bg, outline: 'none' },
  gateBtn:     { padding: '10px 20px', backgroundColor: teal, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' },
  gatePrivacy: { fontSize: '13px', color: muted },

  auditWrap:    { border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', padding: '20px 32px', animation: 'fadeUp 0.4s ease forwards' },
  auditToggle:  { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 0, fontFamily: font },
  auditChevron: { fontSize: '11px', color: muted, marginLeft: '12px' },

  actionsWrap:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '8px', marginBottom: '32px' },
  shareLinkBox:   { width: '100%', maxWidth: '560px', border: '1px solid #99f6e4', borderRadius: '10px', padding: '18px 20px', backgroundColor: '#f0fdf9' },
  shareLinkLabel: { fontSize: '15px', fontWeight: '600', color: '#0f766e', marginBottom: '10px' },
  shareLinkRow:   { display: 'flex', gap: '8px', alignItems: 'center' },
  shareLinkInput: { flex: 1, padding: '8px 12px', fontSize: '14px', border: `1px solid ${border}`, borderRadius: '6px', fontFamily: 'monospace', color: body, backgroundColor: bg, minWidth: 0 },
  copyBtn:        { padding: '8px 16px', backgroundColor: teal, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: font },
  actionBtns:     { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' },

  footer:      { borderTop: `1px solid ${border}`, padding: '40px', textAlign: 'center', backgroundColor: bgSoft },
  footerText:  { fontSize: '15px', color: body, lineHeight: '1.7', marginBottom: '14px' },
  footerLink:  { fontSize: '13px', color: teal, textDecoration: 'none', fontWeight: '500' },
};
