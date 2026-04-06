import Anthropic from '@anthropic-ai/sdk';

// ── Strip HTML tags and return clean text ─────────────────────────────────────
function extractText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Pull internal links from HTML (fallback when sitemap unavailable) ─────────
function extractLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const matches = [...html.matchAll(/href=["']([^"']+)["']/gi)];
  const seen = new Set();
  const links = [];
  for (const match of matches) {
    try {
      const resolved = new URL(match[1], baseUrl);
      if (
        resolved.hostname === base.hostname &&
        (resolved.protocol === 'http:' || resolved.protocol === 'https:') &&
        !resolved.pathname.match(/\.(pdf|png|jpg|jpeg|gif|svg|css|js|ico|xml|json)$/i) &&
        !seen.has(resolved.pathname)
      ) {
        seen.add(resolved.pathname);
        links.push(resolved.href);
      }
    } catch { /* skip malformed URLs */ }
  }
  return links;
}

// ── Filter sitemap <loc> entries to same-hostname, non-static URLs ────────────
function filterSitemapUrls(locs, base) {
  const seen = new Set();
  return locs.filter(loc => {
    try {
      const u = new URL(loc);
      if (u.hostname !== base.hostname) return false;
      if (!['http:', 'https:'].includes(u.protocol)) return false;
      if (u.pathname.match(/\.(pdf|png|jpg|jpeg|gif|svg|css|js|ico|xml|json)$/i)) return false;
      if (seen.has(u.pathname)) return false;
      seen.add(u.pathname);
      return true;
    } catch { return false; }
  });
}

// ── Fetch and parse sitemap.xml — returns filtered URL array or null ──────────
async function fetchSitemapUrls(baseUrl, headers) {
  const base = new URL(baseUrl);
  const candidates = [
    `${base.origin}/sitemap.xml`,
    `${base.origin}/sitemap_index.xml`,
  ];
  for (const sitemapUrl of candidates) {
    try {
      const r = await fetch(sitemapUrl, { headers, signal: AbortSignal.timeout(5000) });
      if (!r.ok) continue;
      const xml = await r.text();
      if (!xml.includes('<loc>')) continue;
      let locs = [];
      if (xml.includes('<sitemapindex')) {
        const childUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
          .map(m => m[1].trim()).slice(0, 3);
        const childResults = await Promise.allSettled(
          childUrls.map(u =>
            fetch(u, { headers, signal: AbortSignal.timeout(4000) })
              .then(r => r.ok ? r.text() : '').catch(() => '')
          )
        );
        for (const result of childResults) {
          if (result.status === 'fulfilled' && result.value) {
            const childLocs = [...result.value.matchAll(/<loc>([^<]+)<\/loc>/gi)]
              .map(m => m[1].trim());
            locs.push(...childLocs);
            if (locs.length >= 200) break;
          }
        }
      } else {
        locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
          .map(m => m[1].trim()).slice(0, 200);
      }
      const filtered = filterSitemapUrls(locs, base);
      if (filtered.length > 0) return filtered;
    } catch { continue; }
  }
  return null;
}

// ── Extract <title> and <meta name="description"> as a scorable string ────────
function extractTitleAndMeta(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const metaMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const meta = metaMatch ? metaMatch[1].trim() : '';
  return `${title} ${meta}`.toLowerCase();
}

// ── Score a text string against the keyword dictionary ───────────────────────
function scoreText(text, keywords) {
  return keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0);
}

// ── Expanded keyword dictionary (product + investor/founder signals) ──────────
const priorityKeywords = [
  'product', 'solution', 'feature', 'platform', 'use',
  'pricing', 'benefit', 'why', 'how', 'about',
  'customer', 'case', 'results', 'proof', 'partner',
  'team', 'investor', 'market', 'growth', 'vision',
  'story', 'leadership', 'traction', 'metric',
];

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, singlePageOnly, personas, tone } = req.body;
  const effectivePersonas = (Array.isArray(personas) && personas.length > 0) ? personas : ['CEO', 'CRO', 'CFO'];
  const personaList = effectivePersonas.join(', ');
  const personaSlash = effectivePersonas.join('/');
  const effectiveTone = tone || 'Professional and persuasive';

  if (!url) {
    return res.status(400).json({ error: 'Please provide a website URL.' });
  }

  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; PricingWire/1.0)' };

  // ── Step 1: Fetch homepage ────────────────────────────────────────────────
  let homepageHtml = '';
  try {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`Homepage returned status ${r.status}`);
    homepageHtml = await r.text();
  } catch (err) {
    return res.status(500).json({ error: `Could not access ${url}: ${err.message}` });
  }

  // ── Step 2: Discover, score, and fetch subpages ───────────────────────────
  const pages = [{
    url,
    title: 'Homepage',
    text: extractText(homepageHtml).substring(0, 2000),
    status: 'ok',
  }];

  let usedSitemap = false;

  if (!singlePageOnly) {
    // Phase A — sitemap first, fall back to link scraping
    const sitemapResult = await fetchSitemapUrls(url, headers);
    usedSitemap = sitemapResult !== null && sitemapResult.length > 0;
    const candidateUrls = usedSitemap ? sitemapResult : extractLinks(homepageHtml, url);

    // Phase B — URL scoring, top 14 candidates
    const urlScored = candidateUrls
      .map(link => ({ link, urlScore: scoreText(link.toLowerCase(), priorityKeywords) }))
      .sort((a, b) => b.urlScore - a.urlScore)
      .slice(0, 14);

    // Phase C — parallel fetch, title+meta re-scoring, top 7 selected
    const fetchResults = await Promise.allSettled(
      urlScored.map(({ link }) =>
        fetch(link, { headers, signal: AbortSignal.timeout(4000) })
          .then(r => r.ok ? r.text().then(html => ({ ok: true, html })) : Promise.resolve({ ok: false, html: '' }))
          .catch(() => ({ ok: false, html: '' }))
      )
    );

    const enriched = urlScored.map((candidate, i) => {
      const { ok, html } = fetchResults[i].value;
      const titleMetaText = ok ? extractTitleAndMeta(html) : '';
      const titleMetaScore = scoreText(titleMetaText, priorityKeywords);
      return { ...candidate, ok, html: ok ? html : null, titleMetaScore };
    });

    enriched.sort((a, b) => (b.urlScore + b.titleMetaScore) - (a.urlScore + a.titleMetaScore));

    for (const candidate of enriched.slice(0, 7)) {
      if (!candidate.html) {
        pages.push({ url: candidate.link, title: candidate.link, text: '', status: 'failed to load' });
        continue;
      }
      const titleMatch = candidate.html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : candidate.link;
      pages.push({
        url: candidate.link,
        title,
        text: extractText(candidate.html).substring(0, 1500),
        status: 'ok',
      });
    }
  }

  // ── Step 3: Build content block for Claude ────────────────────────────────
  const pagesBlock = pages.map(p =>
    `--- PAGE: ${p.title} ---\nURL: ${p.url}\nSTATUS: ${p.status}\n${p.text ? `CONTENT:\n${p.text}` : '(no content retrieved)'}`
  ).join('\n\n');

  // ── Step 4: Call Anthropic ────────────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a world-class B2B value messaging strategist specializing in helping technology companies communicate compelling value to executive buyers. You produce structured, insight-rich analysis with zero fluff.`;

  const userPrompt = `Analyze the following website content and produce a comprehensive value assessment. Return your response as a single valid JSON object with exactly these keys: sourceAudit, fullTable, personaObjections, companyName, companyOverview, valueHeadline, mcv, whyBuy, whyNow, targetBuyer, valueStory.

Tone for all written narrative content: ${effectiveTone}

Website: ${url}

Pages analyzed:
${pagesBlock}

Follow these exact instructions for each section:

STEP 0 — SOURCE AUDIT (key: "sourceAudit")
Return a markdown-formatted transparency report:
- State the total number of unique subpages analyzed${singlePageOnly ? ' — add exactly this note after the count: (user selected "Analyze this Page Only")' : usedSitemap ? ' — add exactly this note after the count: (pages discovered via sitemap.xml)' : ''}
- A bulleted list of page titles/URLs assessed
- For each page, one sentence on the specific insight discovered there
- Note any pages that were blocked or failed to load

STEP 1 — IDENTIFY TOP CAPABILITIES (internal — informs Steps 2 and 3 only)
Identify the absolute top 5 most compelling and differentiating capabilities or benefits that solve the biggest pains for: ${personaList}. Rank them in order from most compelling/impactful to least.

STEP 2 — FULL VALUE IMPACT TABLE (key: "fullTable")
Return ONLY a markdown table with exactly these 5 columns in bold headers:
| **Capability** | **Life Without** | **Life With** | **How to Measure** | **Why Care** |
- Exactly 5 rows, one per capability, ordered most compelling first (row 1 = highest impact, row 5 = lowest)
- Each cell: 1–2 short sentences, under 50 words
- Life Without/With contrasts must be sharp, emotional, outcome-focused
- Tailor pain points and Why Care to ${personaSlash} priorities
- For the "How to Measure" and "Why Care" columns ONLY: separate each distinct point with " >> " so they can be displayed as individual bullet points. Example for How to Measure: "Track pipeline conversion weekly >> Review win/loss reports monthly >> Monitor deal velocity in CRM"

STEP 3 — PERSONA OBJECTION RESPONSES (key: "personaObjections")
Return markdown-formatted objection handling for ${personaList}. For each persona, provide exactly 2 objections with responses. Use EXACTLY this format for every objection block:

**[Persona Name]**

**"[Objection stated as a direct quote]"**

- [One sentence response.]
- [One sentence response.]
- [Optional third bullet — one sentence only if genuinely needed.]

**"[Second objection stated as a direct quote]"**

- [One sentence response.]
- [One sentence response.]
- [Optional third bullet — one sentence only if genuinely needed.]

CRITICAL FORMATTING RULES FOR STEP 3:
- The objection text in quotes MUST be wrapped in bold markdown: **"..."**
- Leave exactly one blank line between the bolded objection and its bullet-point responses
- Each bullet MUST be exactly one sentence — no run-ons, no semicolons joining two thoughts
- Maximum 3 bullets per objection response

STEP 4 — COMPANY PROFILE + VALUE STORY
Using all pages analyzed, return the following keys:
- "companyName": The company name
- "companyOverview": What this company does and who it serves. HARD LIMIT: 310 characters maximum — count every character and optimize wording to fit precisely within this limit.
- "valueHeadline": One powerful, memorable sentence that captures the ultimate value this company delivers. Keep it concise — no more than 12 words so it displays comfortably on 2 lines.
- "mcv": A markdown string structured EXACTLY as follows: ONE succinct opening sentence capturing the single most compelling value differentiator. Then a blank line. Then 3–5 bullet points using - prefix, each reinforcing or expanding on that differentiator.
- "whyBuy": Array of EXACTLY 4 succinct, compelling reasons to buy
- "whyNow": Array of EXACTLY 3 succinct urgency drivers
- "targetBuyer": ONE sentence describing the ideal buyer persona — no semicolons splitting into multiple thoughts

CRITICAL RULES FOR STEP 4 — violating any of these is unacceptable:
- companyOverview MUST be 310 characters or fewer — count every character carefully
- whyBuy MUST contain EXACTLY 4 items — no more, no fewer
- whyNow MUST contain EXACTLY 3 items — no more, no fewer
- targetBuyer MUST be a single sentence only
- mcv MUST follow the exact structure: one sentence, blank line, then bullet points with - prefix

STEP 5 — VALUE IMPACT STORY (key: "valueStory")
Return a nested JSON object with exactly 4 keys: situation, risks, opportunity, payoff. Draw entirely from the analysis above — never invent facts. Favor bullet points. Tailor everything to ${personaSlash}.

"situation": Markdown string. 4–5 bullet points (- prefix) demonstrating deep understanding of the prospect's world — their operational pressures, strategic environment, and current reality. Write in a way that makes them feel clearly understood.

"risks": Markdown string. 4–5 bullet points (- prefix) covering the specific consequences of not making this a top priority. Be concrete — include lost revenue, customer churn, competitive irrelevance, missed opportunities, and the compounding cost of delay.

"opportunity": Markdown string. 4–5 bullet points (- prefix) connecting the top capabilities to measurable prospect outcomes. For each, briefly capture the shift (life without → life with) and what success looks like. Pull directly from the capabilities in the fullTable, most compelling first.

"payoff": Nested object with exactly 4 keys — month1, month3, month6, beyond — each a markdown string of 2–3 specific, measurable bullet points (- prefix):
  month1: Quick wins and early leading indicators visible within 30 days
  month3: Measurable progress and initial business impact within 90 days
  month6: Significant ROI and outcomes becoming clearly visible within 6 months
  beyond: Sustained competitive advantage and transformational results after 6 months

CRITICAL: Return ONLY a valid JSON object. No preamble, no markdown fences, no commentary outside the JSON.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const raw = message.content[0].text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(raw);
    } catch {
      throw new Error('Could not parse assessment response. Please try again.');
    }

    return res.status(200).json(analysis);

  } catch (err) {
    console.error('Analyze error:', err);
    return res.status(500).json({ error: err.message || 'Something went wrong. Please try again.' });
  }
}
