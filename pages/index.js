import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Assessment table helpers ───────────────────────────────────────────────────
function parseMarkdownTable(markdown) {
  if (!markdown) return null;
  const lines = markdown.trim().split('\n').filter(l => l.trim());
  if (lines.length < 3) return null;
  const parseRow = (line) =>
    line.split('|').slice(1, -1).map(cell => cell.trim().replace(/\*\*/g, ''));
  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);
  return { headers, rows };
}

// ── Slice a markdown table to the first n data rows ───────────────────────────
function sliceMarkdownTable(markdown, n) {
  if (!markdown) return markdown;
  const lines = markdown.trim().split('\n').filter(l => l.trim());
  if (lines.length < 3) return markdown;
  // lines[0] = header row, lines[1] = separator, lines[2+] = data rows
  return [lines[0], lines[1], ...lines.slice(2, 2 + n)].join('\n');
}

function AssessmentTable({ markdown, bulletCols = [], className = '' }) {
  const table = parseMarkdownTable(markdown);
  if (!table) return null;
  return (
    <div style={{ overflowX: 'auto' }} className={`md-content ${className}`}>
      <table>
        <thead>
          <tr>{table.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>
                  {bulletCols.includes(ci) ? (
                    <ul style={{ paddingLeft: '16px', margin: 0 }}>
                      {cell.split(' >> ').map(s => s.trim()).filter(Boolean).map((item, ii) => (
                        <li key={ii} style={{ marginBottom: '5px', lineHeight: '1.5', fontSize: '14px' }}>{item}</li>
                      ))}
                    </ul>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const [tone, setTone] = useState('Professional and persuasive');
  const [singlePageOnly, setSinglePageOnly] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState(['CEO', 'CRO', 'CFO']);
  const [otherPersonaChecked, setOtherPersonaChecked] = useState(false);
  const [otherPersona, setOtherPersona] = useState('');
  const [mcvCount, setMcvCount] = useState(3);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [shareId, setShareId] = useState(null);
  const [shareStatus, setShareStatus] = useState('idle');
  const [shareError, setShareError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [valueStory, setValueStory] = useState(null);
  const [vsLoading, setVsLoading] = useState(false);
  const [vsError, setVsError] = useState('');
  const vsAbortRef = React.useRef(null);
  const vsTimeoutRef = React.useRef(null);

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
    setLoading(true);
    setError('');
    setAnalysis(null);
    setShareId(null);
    setShareStatus('idle');
    setShareError('');
    setValueStory(null);
    setVsError('');

    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, singlePageOnly, personas: activePersonas, tone }),
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
    setAnalysis(null);
    setShareId(null);
    setShareStatus('idle');
    setShareError('');
    setUrl('');
    setSinglePageOnly(false);
    setSelectedPersonas(['CEO', 'CRO', 'CFO']);
    setOtherPersonaChecked(false);
    setOtherPersona('');
    setMcvCount(3);
    setEmailInput('');
    setValueStory(null);
    setVsError('');
    window.scrollTo(0, 0);
  };

  const handleShare = async () => {
    setShareStatus('saving');
    try {
      const response = await fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: valueStory ? { ...analysis, ...valueStory } : analysis,
          url,
          personas: activePersonas,
          mcvCount,
        }),
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

  const handleUnlock = async (e) => {
    e.preventDefault();
    setVsLoading(true);
    setVsError('');
    const controller = new AbortController();
    vsAbortRef.current = controller;
    let timedOut = false;
    vsTimeoutRef.current = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 45000);
    try {
      const r = await fetch('/api/value-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, personas: activePersonas, tone }),
        signal: controller.signal,
      });
      if (!r.ok) {
        let msg = `Server error (${r.status}) — please try again.`;
        try {
          const text = await r.text();
          const errData = JSON.parse(text);
          if (errData.error) msg = errData.error;
        } catch { /* keep generic message */ }
        throw new Error(msg);
      }
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setValueStory(data);
    } catch (err) {
      if (err.name === 'AbortError' && timedOut) {
        setVsError('TIMEOUT');
      } else if (err.name !== 'AbortError') {
        setVsError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      clearTimeout(vsTimeoutRef.current);
      vsAbortRef.current = null;
      setVsLoading(false);
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

                {/* 3. MCV Capability Count */}
                <div style={s.personaSection}>
                  <label style={s.label}>
                    Capabilities to Display
                    <span style={s.optional}> (Most Compelling Value table)</span>
                  </label>
                  <div style={s.mcvCountRow}>
                    {[3, 4, 5].map(n => (
                      <label key={n} style={s.mcvCountOption}>
                        <input
                          type="radio"
                          name="mcvCount"
                          value={n}
                          checked={mcvCount === n}
                          onChange={() => setMcvCount(n)}
                          style={s.radio}
                        />
                        Top {n}
                      </label>
                    ))}
                  </div>
                  <p style={s.checkboxHint}>Controls how many capabilities appear in the Value Impact — MCV table</p>
                </div>

                {/* 4. Tone */}
                <div style={s.personaSection}>
                  <label style={s.label}>Tone</label>
                  <select value={tone} onChange={e => setTone(e.target.value)} style={{ ...s.input, marginTop: '2px' }}>
                    <option>Professional and persuasive</option>
                    <option>Bold and direct</option>
                    <option>Consultative and thoughtful</option>
                    <option>Energetic and inspiring</option>
                  </select>
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

          {/* ── ERROR ── */}
          {error && <div style={s.errorBox}>⚠️ {error}</div>}

          {/* ── LOADING STATE ── */}
          {loading && (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <p style={s.loadingText}>{LOADING_STEPS[loadingStep].doing}</p>
              <p style={s.loadingNext}>Next: {LOADING_STEPS[loadingStep].next}</p>
              <p style={s.loadingTiming}>Your thorough Assessment may require ~60–75 seconds.</p>
            </div>
          )}

          {/* ── EXECUTIVE DEEP-DIVE ── */}
          {analysis && (
            <div style={s.deepWrap}>

              {/* Header */}
              <div style={s.deepHeader}>
                <span style={s.deepPill}>Executive Deep-Dive</span>
                <p style={s.deepSubtitle}>Multi-page analysis · {activePersonas.join(' · ')}</p>
              </div>

              {/* Company Name + Value Headline + Overview */}
              <div style={s.companyBlock}>
                <div style={s.companyName}>{analysis.companyName}</div>
                <p style={s.valueHeadline}>&quot;{analysis.valueHeadline}&quot;</p>
                <p style={s.companyOverview}>{analysis.companyOverview}</p>
              </div>

              <div style={s.divider} />

              {/* Brief Value Story | Ideal Target Buyer */}
              <div className="grid-2" style={s.grid2}>
                <div style={s.block}>
                  <div style={s.blockLabel}>⭐ Brief Value Story</div>
                  <div className="md-content block-md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.mcv}</ReactMarkdown>
                  </div>
                </div>
                <div style={s.block}>
                  <div style={s.blockLabel}>🎯 Ideal Target Buyer(s)</div>
                  <p style={s.blockText}>{analysis.targetBuyer}</p>
                </div>
              </div>

              <div style={s.divider} />

              {/* Why Buy | Why Now */}
              <div className="grid-2" style={s.grid2}>
                <div style={s.block}>
                  <div style={{ ...s.blockLabel, color: '#0d9488' }}>✅ Why Buy?</div>
                  <ul style={s.ul}>
                    {analysis.whyBuy.map((item, i) => <li key={i} style={s.li}>{item}</li>)}
                  </ul>
                </div>
                <div style={s.block}>
                  <div style={{ ...s.blockLabel, color: '#d97706' }}>⚡ Why Now?</div>
                  <ul style={s.ul}>
                    {analysis.whyNow.map((item, i) => <li key={i} style={s.li}>{item}</li>)}
                  </ul>
                </div>
              </div>

              <div style={s.divider} />

              {/* Value Impact — MCV Table (sliced to mcvCount rows) */}
              <div style={s.deepBlock}>
                <div style={s.deepBlockLabel}>📊 Value Impact — Most Compelling Value (MCV) — Top {mcvCount}</div>
                <AssessmentTable
                  markdown={sliceMarkdownTable(analysis.fullTable, mcvCount)}
                  bulletCols={[3, 4]}
                  className="table-wrap"
                />
              </div>

              {/* Persona Objection Responses */}
              <div style={{ ...s.deepBlock, borderBottom: 'none' }}>
                <div style={s.deepBlockLabel}>💬 Persona Objection Responses</div>
                <p style={s.deepNote}>Anticipating the top objections from {activePersonas.join(', ')} — with sharp, confident responses.</p>
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.personaObjections}</ReactMarkdown>
                </div>
              </div>

            </div>
          )}

          {/* ── EMAIL GATE — shown after main report, before Value Story is unlocked ── */}
          {analysis && !valueStory && !vsLoading && (
            <div style={s.gateWrap}>
              <div style={s.gateInner}>
                <div style={s.gateLock}>🔓</div>
                <h2 style={s.gateTitle}>Unlock Your Value Story</h2>
                <p style={s.gateSub}>
                  Get a deeper narrative — Situation, Risks, Opportunity, and a month-by-month Payoff timeline — tailored to {activePersonas.join(', ')}.
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
                  <button type="submit" style={s.gateBtn}>
                    Unlock Now →
                  </button>
                </form>
                <p style={s.gatePrivacy}>No spam — only used to unlock your Value Story.</p>
                {vsError && (
                  vsError === 'TIMEOUT'
                    ? <p style={s.gateError}>
                        The value details exceed this tool&apos;s current complexity threshold.{' '}
                        <a href="https://pricingwire.com/contact" target="_blank" rel="noreferrer" style={{ color: '#b91c1c' }}>
                          Contact Chris Hopf here
                        </a>{' '}
                        to discuss further.
                      </p>
                    : <p style={s.gateError}>⚠️ {vsError}</p>
                )}
              </div>
            </div>
          )}

          {/* ── VALUE STORY LOADING ── */}
          {vsLoading && (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <p style={s.loadingText}>Generating your Value Story…</p>
              <p style={s.loadingNext}>Building Situation · Risks · Opportunity · Payoff</p>
              <p style={s.loadingTiming}>This takes about 20–30 seconds.</p>
            </div>
          )}

          {/* ── VALUE STORY (unlocked) ── */}
          {analysis && valueStory && (
            <div style={s.storyWrap}>

              <div style={s.storyHeader}>
                <span style={s.storyPill}>Value Story</span>
                <p style={s.storySubtitle}>Situation · Risks · Opportunity · Payoff</p>
              </div>

              {/* Situation */}
              <div style={s.deepBlock}>
                <div style={s.deepBlockLabel}>🧭 Situation</div>
                <p style={s.deepNote}>A clear-eyed view of where your prospects are today.</p>
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{valueStory.storySituation}</ReactMarkdown>
                </div>
              </div>

              {/* Risks */}
              <div style={s.deepBlock}>
                <div style={s.deepBlockLabel}>⚠️ Risks</div>
                <p style={s.deepNote}>What&apos;s at stake if this isn&apos;t addressed as a priority.</p>
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{valueStory.storyRisks}</ReactMarkdown>
                </div>
              </div>

              {/* Opportunity */}
              <div style={s.deepBlock}>
                <div style={s.deepBlockLabel}>💡 Opportunity</div>
                <p style={s.deepNote}>Where your capabilities create the most compelling advantage.</p>
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{valueStory.storyOpportunity}</ReactMarkdown>
                </div>
              </div>

              {/* Payoff */}
              <div style={{ ...s.deepBlock, borderBottom: 'none' }}>
                <div style={s.deepBlockLabel}>📈 Payoff</div>
                <p style={s.deepNote}>Measurable outcomes your buyers can expect over time.</p>
                <div className="payoff-grid" style={s.payoffGrid}>
                  {[
                    { period: 'Within 1 Month',       content: valueStory.payoffMonth1 },
                    { period: 'Within 3 Months',      content: valueStory.payoffMonth3 },
                    { period: 'Within 6 Months',      content: valueStory.payoffMonth6 },
                    { period: '6+ Months and Beyond', content: valueStory.payoffBeyond },
                  ].map(({ period, content }, i) => (
                    <div key={i} style={{
                      ...s.payoffCell,
                      borderRight:  i % 2 === 0 ? `1px solid ${border}` : 'none',
                      borderBottom: i < 2        ? `1px solid ${border}` : 'none',
                    }}>
                      <div style={s.payoffPeriod}>{period}</div>
                      <div className="md-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
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

          {/* ── SOURCE AUDIT ── */}
          {analysis && (
            <div style={s.auditWrap}>
              <div style={s.deepBlockLabel}>🔍 Source Audit</div>
              <div className="md-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.sourceAudit}</ReactMarkdown>
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

        .md-content p { font-size: 16px; line-height: 1.75; color: #374151; margin-bottom: 12px; }
        .md-content p:last-child { margin-bottom: 0; }
        .md-content ul { padding-left: 20px; margin-bottom: 12px; }
        .md-content li { font-size: 16px; line-height: 1.7; color: #374151; margin-bottom: 8px; }
        .md-content strong { color: #111827; font-weight: 600; }
        .md-content h3, .md-content h4 {
          font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 600;
          color: #111827; margin: 20px 0 8px;
        }
        .md-content h3:first-child, .md-content h4:first-child { margin-top: 0; }

        .table-wrap { overflow-x: auto; }
        .md-content table { width: 100%; border-collapse: collapse; font-size: 15px; margin-top: 4px; }
        .md-content th { background: #111827; color: #fff; padding: 10px 14px; text-align: left; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
        .md-content th strong { color: #fff; font-weight: 600; }
        .md-content td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; vertical-align: top; line-height: 1.6; color: #374151; }
        .md-content tr:last-child td { border-bottom: none; }
        .md-content tr:nth-child(even) td { background: #fafafa; }
        .md-content tr:hover td { background: #f0fdf9; }

        .block-md p { font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 8px; }
        .block-md p:last-child { margin-bottom: 0; }
        .block-md ul { padding-left: 18px; margin-top: 4px; margin-bottom: 0; }
        .block-md li { font-size: 15px; line-height: 1.65; color: #374151; margin-bottom: 6px; }

        @media (max-width: 680px) {
          .grid-2 { grid-template-columns: 1fr !important; }
          .input-row { flex-direction: column !important; }
          .payoff-grid { grid-template-columns: 1fr !important; }
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
  page: { minHeight: '100vh', fontFamily: font, color: ink, backgroundColor: bg, display: 'flex', flexDirection: 'column' },
  hero: { padding: '62px 40px 50px', textAlign: 'center', borderBottom: `1px solid ${border}`, backgroundColor: bg },
  heroEyebrow: { fontSize: '13px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', color: teal, marginBottom: '20px' },
  heroTitle: { fontFamily: serif, fontSize: 'clamp(38px, 5vw, 62px)', fontWeight: '400', color: ink, lineHeight: '1.15', marginBottom: '20px', letterSpacing: '-0.5px' },
  heroSub: { fontSize: '18px', color: body, lineHeight: '1.75', maxWidth: '480px', margin: '0 auto' },
  main: { maxWidth: '880px', margin: '0 auto', padding: '48px 24px 80px', width: '100%', flex: 1 },

  inputCard: { border: `1px solid ${border}`, borderRadius: '12px', padding: '32px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '32px' },
  label: { display: 'block', fontSize: '15px', fontWeight: '600', color: ink, marginBottom: '8px' },
  optional: { fontWeight: '400', color: muted },
  inputRow: { display: 'flex', gap: '10px', marginBottom: '16px' },
  input: { flex: 1, padding: '10px 14px', fontSize: '16px', border: `1px solid ${border}`, borderRadius: '8px', fontFamily: font, color: ink, backgroundColor: bg, outline: 'none', minWidth: 0 },
  btn: { padding: '10px 22px', backgroundColor: ink, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap', letterSpacing: '-0.2px' },
  btnOutline: { padding: '10px 22px', backgroundColor: bg, color: ink, border: `1px solid ${border}`, borderRadius: '8px', fontSize: '16px', fontWeight: '500', cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' },
  advToggle: { background: 'none', border: 'none', fontSize: '14px', color: muted, cursor: 'pointer', fontFamily: font, padding: '0 0 16px', fontWeight: '500' },

  checkboxRow: { display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '14px', marginBottom: '4px', borderTop: `1px solid ${border}` },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', fontWeight: '600', color: ink, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' },
  checkbox: { width: '15px', height: '15px', accentColor: teal, cursor: 'pointer' },
  checkboxHint: { fontSize: '13px', color: muted, marginTop: '6px' },

  personaSection: { paddingTop: '16px', borderTop: `1px solid ${border}`, marginBottom: '4px' },
  personaGrid: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px', alignItems: 'center' },
  personaItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: ink, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' },
  personaOtherInput: { padding: '5px 10px', fontSize: '14px', border: `1px solid ${border}`, borderRadius: '6px', fontFamily: font, color: ink, backgroundColor: bg, outline: 'none', width: '160px' },
  personaMaxNote: { fontWeight: '500', color: '#d97706', fontSize: '13px' },

  mcvCountRow: { display: 'flex', gap: '24px', marginTop: '10px', alignItems: 'center' },
  mcvCountOption: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', fontWeight: '500', color: ink, cursor: 'pointer', userSelect: 'none' },
  radio: { width: '15px', height: '15px', accentColor: teal, cursor: 'pointer' },

  disclaimer: { fontSize: '13px', color: muted, marginTop: '16px' },

  loadingBox: { textAlign: 'center', padding: '40px 24px', border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bgSoft, marginBottom: '24px' },
  spinner: { width: '28px', height: '28px', border: `2px solid ${border}`, borderTopColor: ink, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' },
  loadingText: { fontSize: '16px', fontWeight: '500', color: ink, marginTop: '14px' },
  loadingNext: { fontSize: '13px', color: muted, marginTop: '6px' },
  loadingTiming: { fontSize: '13px', color: muted, marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${border}` },

  errorBox: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 18px', color: '#b91c1c', fontSize: '15px', marginBottom: '24px' },

  deepWrap: { border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden', animation: 'fadeUp 0.4s ease forwards' },
  deepHeader: { padding: '24px 32px', borderBottom: `1px solid ${border}`, backgroundColor: bgSoft, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  deepPill: { fontSize: '13px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: teal, backgroundColor: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: '20px', padding: '4px 12px' },
  deepSubtitle: { fontSize: '14px', color: muted },

  companyBlock: { padding: '36px 36px 28px', borderBottom: `1px solid ${border}` },
  companyName: { fontSize: '28px', fontWeight: '700', color: ink, marginBottom: '12px', letterSpacing: '-0.5px' },
  valueHeadline: { fontFamily: serif, fontSize: 'clamp(19px, 2.5vw, 24px)', color: '#5A5A5A', lineHeight: '1.5', marginBottom: '14px' },
  companyOverview: { fontSize: '16px', color: body, lineHeight: '1.75' },

  divider: { height: '1px', backgroundColor: border },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  block: { padding: '28px 32px', borderRight: `1px solid ${border}` },
  blockLabel: { fontSize: '13px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: muted, marginBottom: '12px' },
  blockText: { fontSize: '16px', lineHeight: '1.75', color: body },
  ul: { paddingLeft: '18px', margin: 0 },
  li: { fontSize: '16px', lineHeight: '1.7', color: body, marginBottom: '10px' },

  deepBlock: { padding: '28px 32px', borderBottom: `1px solid ${border}`, backgroundColor: bg },
  deepBlockLabel: { fontSize: '14px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: ink, marginBottom: '16px' },
  deepNote: { fontSize: '15px', color: muted, marginBottom: '16px', fontStyle: 'italic', lineHeight: '1.6' },

  storyWrap: { border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden', animation: 'fadeUp 0.4s ease forwards' },
  storyHeader: { padding: '24px 32px', borderBottom: `1px solid ${border}`, backgroundColor: bgSoft, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  storyPill: { fontSize: '13px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: teal, backgroundColor: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: '20px', padding: '4px 12px' },
  storySubtitle: { fontSize: '14px', color: muted },

  payoffGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '16px', borderTop: `1px solid ${border}` },
  payoffCell: { padding: '20px 24px' },
  payoffPeriod: { fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: teal, marginBottom: '10px' },

  auditWrap: { border: `1px solid ${border}`, borderRadius: '12px', backgroundColor: bg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', padding: '28px 32px', animation: 'fadeUp 0.4s ease forwards' },

  gateWrap: { border: `1px solid #99f6e4`, borderRadius: '12px', backgroundColor: '#f0fdf9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '24px', padding: '44px 32px', textAlign: 'center', animation: 'fadeUp 0.4s ease forwards' },
  gateInner: { maxWidth: '460px', margin: '0 auto' },
  gateLock: { fontSize: '32px', marginBottom: '16px' },
  gateTitle: { fontFamily: serif, fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: '400', color: ink, marginBottom: '12px', letterSpacing: '-0.3px' },
  gateSub: { fontSize: '16px', color: body, lineHeight: '1.7', marginBottom: '24px' },
  gateForm: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' },
  gateInput: { flex: '1', minWidth: '220px', maxWidth: '280px', padding: '10px 14px', fontSize: '16px', border: `1px solid #5eead4`, borderRadius: '8px', fontFamily: font, color: ink, backgroundColor: bg, outline: 'none' },
  gateBtn: { padding: '10px 22px', backgroundColor: teal, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' },
  gatePrivacy: { fontSize: '13px', color: muted, marginTop: '4px' },
  gateError: { color: '#b91c1c', fontSize: '14px', marginTop: '12px' },
  cancelBtn: { marginTop: '16px', padding: '7px 18px', backgroundColor: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: font },

  actionsWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '8px', marginBottom: '32px' },
  shareLinkBox: { width: '100%', maxWidth: '560px', border: '1px solid #99f6e4', borderRadius: '10px', padding: '18px 20px', backgroundColor: '#f0fdf9' },
  shareLinkLabel: { fontSize: '15px', fontWeight: '600', color: '#0f766e', marginBottom: '10px' },
  shareLinkRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  shareLinkInput: { flex: 1, padding: '8px 12px', fontSize: '14px', border: `1px solid ${border}`, borderRadius: '6px', fontFamily: 'monospace', color: body, backgroundColor: bg, minWidth: 0 },
  copyBtn: { padding: '8px 16px', backgroundColor: teal, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: font },
  actionBtns: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' },

  footer: { borderTop: `1px solid ${border}`, padding: '40px 40px', textAlign: 'center', backgroundColor: bgSoft },
  footerLogo: { fontSize: '21px', fontWeight: '700', color: ink, marginBottom: '8px' },
  footerText: { fontSize: '20px', color: muted, lineHeight: '1.7', marginBottom: '6px' },
  footerMcv: { fontSize: '18px', color: muted, fontStyle: 'italic' },
};
