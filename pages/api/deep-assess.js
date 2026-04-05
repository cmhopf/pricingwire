import Anthropic from '@anthropic-ai/sdk';

// Strip HTML tags and return clean text
function extractText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pull internal links from HTML
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
    } catch {
      // skip malformed URLs
    }
  }

  return links;
}

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

  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; PricingWire/1.0)',
  };

  // ── Step 1: Fetch homepage ──────────────────────────────────────────
  let homepageHtml = '';
  try {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`Homepage returned status ${r.status}`);
    homepageHtml = await r.text();
  } catch (err) {
    return res.status(500).json({ error: `Could not access ${url}: ${err.message}` });
  }

  // ── Step 2 & 3: Discover + fetch subpages (skipped if singlePageOnly) ──
  const pages = [{
    url,
    title: 'Homepage',
    text: extractText(homepageHtml).substring(0, 2000),
    status: 'ok',
  }];

  if (!singlePageOnly) {
    const allLinks = extractLinks(homepageHtml, url);

    const priorityKeywords = ['product', 'solution', 'feature', 'about', 'pricing', 'platform', 'why', 'how', 'benefit', 'customer', 'case', 'use'];
    const scored = allLinks.map(link => {
      const lower = link.toLowerCase();
      const score = priorityKeywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
      return { link, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const subpageUrls = scored.slice(0, 7).map(x => x.link);

    for (const subUrl of subpageUrls) {
      try {
        const r = await fetch(subUrl, { headers, signal: AbortSignal.timeout(6000) });
        if (!r.ok) {
          pages.push({ url: subUrl, title: subUrl, text: '', status: `blocked (HTTP ${r.status})` });
          continue;
        }
        const html = await r.text();

        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : subUrl;

        pages.push({
          url: subUrl,
          title,
          text: extractText(html).substring(0, 1500),
          status: 'ok',
        });
      } catch (err) {
        const reason = err.name === 'TimeoutError' ? 'timed out' : 'failed to load';
        pages.push({ url: subUrl, title: subUrl, text: '', status: reason });
      }
    }
  }

  // ── Step 4: Build content block for Claude ──────────────────────────
  const pagesBlock = pages.map(p =>
    `--- PAGE: ${p.title} ---\nURL: ${p.url}\nSTATUS: ${p.status}\n${p.text ? `CONTENT:\n${p.text}` : '(no content retrieved)'}`
  ).join('\n\n');

  // ── Step 5: Call Anthropic ──────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a world-class B2B value messaging strategist specializing in helping technology companies communicate compelling value to executive buyers. You produce structured, insight-rich analysis with zero fluff.`;

  const userPrompt = `Analyze the following website content and produce a structured deep-dive assessment. Return your response as a single valid JSON object with exactly these keys: sourceAudit, fullTable, refinedTable, personaObjections.

Website: ${url}

Pages analyzed:
${pagesBlock}

Follow these exact instructions for each section:

STEP 0 — SOURCE AUDIT (key: "sourceAudit")
Return a markdown-formatted transparency report:
- State the total number of unique subpages analyzed${singlePageOnly ? ' — add exactly this note after the count: (user selected "Analyze this Page Only")' : ''}
- A bulleted list of page titles/URLs assessed
- For each page, one sentence on the specific insight discovered there
- Flag any pages that were blocked or failed to load

STEP 1 — IDENTIFY TOP CAPABILITIES (internal — informs Steps 2 & 3 only)
Identify the absolute top 5 most compelling and differentiating capabilities or benefits that solve the biggest pains for: ${personaList}.

STEP 2 — FULL EXECUTIVE IMPACT TABLE (key: "fullTable")
Return ONLY a markdown table with exactly these 5 columns in bold headers:
| **Capability** | **Life Without** | **Life With** | **How to Measure** | **Why Care** |
- 5 rows, one per capability
- Each cell: 1–2 short sentences, under 50 words
- Life Without/With contrasts must be sharp, emotional, outcome-focused
- Tailor pain points and Why Care to ${personaSlash} priorities
- For the "How to Measure" and "Why Care" columns ONLY: separate each distinct point with " >> " so they can be displayed as individual bullet points. Example for How to Measure: "Track pipeline conversion weekly >> Review win/loss reports monthly >> Monitor deal velocity in CRM"

STEP 3 — REFINED TOP 3 TABLE (key: "refinedTable")
Evaluate all 5 rows and return ONLY the 3 most compelling as a markdown table using identical column formatting. No intro or explanation. Apply the same " >> " separator rule for the "How to Measure" and "Why Care" columns.

STEP 4 — PERSONA OBJECTION RESPONSES (key: "personaObjections")
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

CRITICAL FORMATTING RULES FOR STEP 4:
- The objection text in quotes MUST be wrapped in bold markdown: **"..."**
- Leave exactly one blank line between the bolded objection and its bullet-point responses
- Each bullet MUST be exactly one sentence — no run-ons, no semicolons joining two thoughts
- Maximum 3 bullets per objection response

CRITICAL: Return ONLY a valid JSON object. No preamble, no markdown fences, no commentary outside the JSON.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });

    const raw = message.content[0].text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error('Could not parse deep assessment response. Please try again.');
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error('Deep assess error:', err);
    return res.status(500).json({ error: err.message || 'Something went wrong. Please try again.' });
  }
}
