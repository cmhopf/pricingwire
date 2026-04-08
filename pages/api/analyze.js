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

// ── Anthropic client — module scope for warm-invocation efficiency ────────────
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, singlePageOnly, personas } = req.body;
  const effectivePersonas = (Array.isArray(personas) && personas.length > 0) ? personas : ['CEO', 'CRO', 'CFO'];
  const personaList = effectivePersonas.join(', ');
  const personaSlash = effectivePersonas.join('/');

  if (!url) {
    return res.status(400).json({ error: 'Please provide a website URL.' });
  }

  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; PricingWire/1.0)' };

  // ── Step 1: Fetch homepage ────────────────────────────────────────────────
  let homepageHtml = '';
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
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
      const result = fetchResults[i];
      const { ok, html } = (result.status === 'fulfilled' && result.value) ? result.value : { ok: false, html: '' };
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
  const pagesBlock = '--- CONTENT START ---\n\n' + pages.map(p =>
    `--- PAGE: ${p.title} ---\nURL: ${p.url}\nSTATUS: ${p.status}\n${p.text ? `CONTENT:\n${p.text}` : '(no content retrieved)'}`
  ).join('\n\n') + '\n\n--- CONTENT END ---';

  // ── Step 4: Call Anthropic ────────────────────────────────────────────────

  const systemPrompt = `You are a world-class B2B value messaging strategist specializing in helping technology companies communicate compelling value to executive buyers. You produce structured, insight-rich analysis with zero fluff. Tone throughout all output: Professional, Persuasive and Succinct.`;

  const userPrompt = `Analyze the following website content and produce a comprehensive value assessment. Return your response as a single valid JSON object with exactly these keys: sourceAudit, fullTable, personaObjections, companyName, companyOverview, valueHeadline, targetBuyer, payoffMonth1, payoffMonth3, payoffMonth6, payoffBeyond, nextStep1, nextStep2, nextStep3.

Website: ${url}

Pages selected for relevance to this company's value proposition:
${pagesBlock}

Evaluate ONLY the content between --- CONTENT START --- and --- CONTENT END --- above. Do not draw on any source outside that boundary.
If you recognize this company from prior training, set that aside. Every claim you make must be directly defensible from the extracted content provided.
If the extracted content does not contain enough information to support a confident conclusion for any field, state that explicitly — do not supplement with assumed or inferred knowledge.

Follow these exact instructions for each section:

STEP 0 — SOURCE AUDIT (key: "sourceAudit")
Return a markdown-formatted transparency report:
- State the total number of unique subpages analyzed${singlePageOnly ? ' — add exactly this note after the count: (user selected "Analyze this Page Only")' : usedSitemap ? ' — add exactly this note after the count: (pages discovered via sitemap.xml)' : ''}
- A bulleted list of page titles/URLs assessed
- For each page, one sentence on the specific insight discovered there
- CRITICAL: If any page was blocked by a robots.txt file or failed to load, explicitly flag that URL

STEP 1 — IDENTIFY TOP CAPABILITIES (internal — informs Steps 2 and 3 only)
Identify the absolute top 5 most compelling and differentiating capabilities or benefits that solve the biggest pains for: ${personaList}. Rank them in order from most compelling/impactful to least.

STEP 1B — RANK BY STRATEGIC MERIT (internal — determines table row order)
Evaluate all 5 capabilities and produce a definitive ranking from most to least compelling, weighing these five factors in order of importance:

1. Urgency and cost of inaction — how burning is this problem, and what does it cost to leave it unsolved?
2. Relevance to ${personaSlash} — how directly does this capability address a known priority for the specific personas selected? A capability irrelevant to ${personaSlash} must rank lower regardless of its strength on other factors.
3. Proximity to revenue — how directly does this capability connect to pipeline growth, retention, or expansion for ${personaSlash}?
4. Breadth of impact across personas — does this capability matter to all of ${personaSlash} simultaneously, or only to one? Broader alignment ranks higher.
5. Measurability of ROI — can the outcome be quantified with real metrics that ${personaSlash} can report and defend?

This ranking is final — row 1 of the table must be the single most compelling capability, row 5 the least. Do not default to the order from Step 1 — re-evaluate deliberately against these five factors in sequence.

STEP 2 — FULL VALUE IMPACT TABLE (key: "fullTable")
Return ONLY a markdown table with exactly these 5 columns in bold headers:
| **Capability** | **Life Without** | **Life With** | **How to Measure** | **Why Care** |
- Exactly 5 rows, one per capability, ordered most compelling first (row 1 = highest impact, row 5 = lowest)
- Each cell: 1–2 short sentences, under 50 words
- Life Without/With contrasts must be sharp, emotional, and outcome-focused — emphasizing time savings, cost reduction, revenue growth, and risk reduction
- Tailor all pain points and Why Care statements specifically to ${personaSlash} priorities and vocabulary
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
- Each set of bullets must collectively address: ROI justification, risk mitigation, and ease of adoption — in a sharp, confident manner

STEP 4 — COMPANY PROFILE
Using all pages analyzed, return the following keys:
- "companyName": The company name
- "companyOverview": What this company does and who it serves. HARD LIMIT: 310 characters maximum — count every character and optimize wording to fit precisely within this limit.
- "valueHeadline": One powerful, memorable sentence that captures the ultimate value this company delivers. Keep it concise — no more than 12 words so it displays comfortably on 2 lines.
- "targetBuyer": ONE sentence describing the ideal buyer persona — no semicolons splitting into multiple thoughts

CRITICAL RULES FOR STEP 4 — violating any of these is unacceptable:
- companyOverview MUST be 310 characters or fewer — count every character carefully
- targetBuyer MUST be a single sentence only

STEP 5 — VALUE TIMELINE
Return 4 flat string keys. Each value is a markdown string with exactly 2 bullet points (- prefix). Draw entirely from the analysis above — never invent facts. Write each bullet as a direct, declarative statement — no "you will" or "you'll" language. Begin each bullet with an action verb. Tailor all outcomes to ${personaSlash} priorities.

CRITICAL: All 4 keys — payoffMonth1, payoffMonth3, payoffMonth6, payoffBeyond — MUST be present and non-empty. Each must represent a meaningfully distinct but credible and realistic time horizon. IF content is similar, the same or not credible based on website content review, THEN populate with "nothing credible found for this window of time". Skipping any period is not permitted.

"payoffMonth1": 2 bullets — specific quick wins visible in the first 30 days, beginning with an action verb.
"payoffMonth3": 2 bullets — measurable progress by 90 days that a ${personaSlash} can report upward.
"payoffMonth6": 2 bullets — significant ROI clearly visible and defensible at 6 months.
"payoffBeyond": 2 bullets — compounding competitive advantage beyond 6 months.

STEP 6 — NEXT STEPS (keys: "nextStep1", "nextStep2", "nextStep3")
The user of PricingWire is the company whose website was just analyzed. They are using this assessment to validate, operationalize, and monetize their Most Compelling Value. Produce exactly 3 prioritized next steps written directly to this company — not to their customers or prospects.

Draw from three possible themes and sequence them in whatever order is most relevant to this specific company's situation:

VALIDATE — Help the company confirm that the MCV findings in this report resonate with real prospects and customers before fully committing. This is the natural home for an "Always Be Experimenting" mindset — encourage a focused pilot, a targeted test conversation, or a quick win that can be measured and validated with minimal risk.

OPERATIONALIZE — Guide the company to take the specific messaging, value table, and findings from this report and actively use them in sales conversations, discovery calls, proposals, customer success interactions, and internal alignment.

MONETIZE — Push the company to use what gets validated to evaluate their pricing, packaging, expansion opportunities, retention levers, and whether they can accelerate time-to-value for customers to drive growth.

Return each as a flat markdown string using this exact structure:

**Priority #[N]: [Short, action-oriented title specific to this company]**

- [Bullet 1 — one succinct, clear, actionable sentence grounded in this company's specific situation.]
- [Bullet 2 — one additional sentence only if genuinely needed. Omit if one bullet is sufficient.]

CRITICAL RULES FOR STEP 6:
- Exactly 3 next steps — no more, no fewer
- Address the company directly — never write from the perspective of their customers or prospects
- Each priority title must be specific to this company's situation — never generic
- Maximum 2 bullets per priority — 1 bullet is acceptable and preferred if sufficient
- At least one priority MUST encourage an "Always Be Experimenting" mindset — Claude decides which priority this fits best
- Order the three priorities by what is most urgent and impactful for this specific company
- All content must be grounded in the website analysis — never invent facts

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
