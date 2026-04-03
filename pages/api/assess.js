import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, targetAudience, tone } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Please provide a website URL.' });
  }

  try {
    // Fetch the website content
    const siteResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PricingWire/1.0; +https://pricingwire.com)',
      },
    });

    if (!siteResponse.ok) {
      throw new Error(`Could not access that URL (status ${siteResponse.status}). Please check it and try again.`);
    }

    const html = await siteResponse.text();

    // Strip scripts, styles, and HTML tags to get readable text
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

    // Call Anthropic API
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const audienceLine = targetAudience ? `Target Audience: ${targetAudience}` : '';
    const toneLine = tone ? `Tone: ${tone}` : 'Tone: Professional and persuasive';

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
  "companyOverview": "2-3 sentences describing what this company does and who it serves",
  "valueHeadline": "One powerful, memorable sentence that captures the ultimate value this company delivers",
  "mcv": "2-3 sentences describing their single most compelling value differentiator — the thing that makes them truly stand out",
  "whyBuy": ["Compelling reason 1", "Compelling reason 2", "Compelling reason 3", "Compelling reason 4"],
  "whyNow": ["Urgency driver 1", "Urgency driver 2", "Urgency driver 3"],
  "targetBuyer": "A clear description of the ideal buyer persona for this company"
}`,
        },
      ],
    });

    const rawContent = message.content[0].text.trim();

    // Safely parse the JSON response
    let assessment;
    try {
      // Strip any accidental markdown fences just in case
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
