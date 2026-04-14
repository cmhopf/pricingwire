import Anthropic from '@anthropic-ai/sdk';

// ── RETIRED — this endpoint is no longer called by the frontend ─────────────
// Kept for reference. Returns 410 Gone to prevent unauthorized use.
export default async function handler(req, res) {
  return res.status(410).json({ error: 'This endpoint has been retired.' });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, targetAudience, tone } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Please provide a website URL.' });
  }

  try {
    const siteResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PricingWire/1.0; +https://pricingwire.com)',
      },
    });

    if (!siteResponse.ok) {
      throw new Error(`Could not access that URL (status ${siteResponse.status}). Please check it and try again.`);
    }

    const html = await siteResponse.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 6000);

    if (!text || text.length < 50) {
      throw new Error('Could not extract enough content from that URL. Please try a different page.');
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const audienceLine = targetAudience ? `Target Audience: ${targetAudience}` : '';
    const toneLine = tone ? `Tone: ${tone}` : 'Tone: Professional and persuasive';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a world-class B2B value messaging strategist. Your specialty is helping technology companies articulate their most compelling value in a way that drives purchasing decisions.

Analyze this company website and produce a Value Impact Assessment.

Website URL: ${url}
${audienceLine}
${toneLine}

Website Content:
${text}

Return ONLY a valid JSON object — no preamble, no explanation, no markdown code fences. Use exactly these keys:

{
  "companyName": "The company name",
  "companyOverview": "What this company does and who it serves. HARD LIMIT: 310 characters maximum — count every character and optimize the wording to fit precisely within this limit.",
  "valueHeadline": "One powerful, memorable sentence that captures the ultimate value this company delivers",
  "mcv": "A markdown string structured EXACTLY as follows: ONE succinct opening sentence that captures their single most compelling value differentiator. Then a blank line. Then 3–5 bullet points using - prefix, each bullet being one concise phrase or sentence that reinforces or expands on that differentiator.",
  "whyBuy": ["Succinct compelling reason 1", "Succinct compelling reason 2", "Succinct compelling reason 3", "Succinct compelling reason 4"],
  "whyNow": ["Succinct urgency driver 1", "Succinct urgency driver 2", "Succinct urgency driver 3"],
  "targetBuyer": "ONE relevant succinct sentence describing the ideal buyer persona for this company."
}

CRITICAL RULES — violating any of these is unacceptable:
- companyOverview MUST be 310 characters or fewer — count every character carefully
- whyBuy MUST contain EXACTLY 4 items — no more, no fewer
- whyNow MUST contain EXACTLY 3 items — no more, no fewer
- targetBuyer MUST be a single sentence only — no semicolons splitting into multiple thoughts
- mcv MUST be a markdown string: one sentence, then a blank line, then bullet points prefixed with -`,
        },
      ],
    });

    const rawContent = message.content[0].text.trim();

    let assessment;
    try {
      const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      assessment = JSON.parse(cleaned);
    } catch {
      throw new Error('The assessment could not be parsed. Please try again.');
    }

    return res.status(200).json(assessment);

  } catch (error) {
    console.error('Assessment error:', error);
    return res.status(500).json({
      error: error.message || 'Something went wrong. Please try again.',
    });
  }
}
