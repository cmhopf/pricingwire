import Anthropic from '@anthropic-ai/sdk';

// ── RETIRED — this endpoint is no longer called by the frontend ─────────────
// Kept for reference. Returns 410 Gone to prevent unauthorized use.
export default async function handler(req, res) {
  return res.status(410).json({ error: 'This endpoint has been retired.' });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { analysis, personas, tone } = req.body;

  if (!analysis) {
    return res.status(400).json({ error: 'No analysis context provided.' });
  }

  const effectivePersonas = (Array.isArray(personas) && personas.length > 0) ? personas : ['CEO', 'CRO', 'CFO'];
  const personaSlash = effectivePersonas.join('/');
  const effectiveTone = tone || 'Professional and persuasive';

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a world-class B2B value messaging strategist specializing in helping technology companies communicate compelling value to executive buyers. You produce structured, insight-rich analysis with zero fluff.`;

  const userPrompt = `Generate a detailed Value Impact Story for ${analysis.companyName} based on the analysis context below.

Tone for all narrative content: ${effectiveTone}
Target personas: ${personaSlash}

COMPANY CONTEXT:
Company: ${analysis.companyName}
Overview: ${analysis.companyOverview}
Value Headline: ${analysis.valueHeadline}
Most Compelling Value:
${analysis.mcv}

Why Buy:
${Array.isArray(analysis.whyBuy) ? analysis.whyBuy.map(x => `- ${x}`).join('\n') : analysis.whyBuy}

Why Now:
${Array.isArray(analysis.whyNow) ? analysis.whyNow.map(x => `- ${x}`).join('\n') : analysis.whyNow}

Value Impact Table (capabilities ranked most compelling first):
${analysis.fullTable}

Return ONLY a valid JSON object with exactly these 7 keys: storySituation, storyRisks, storyOpportunity, payoffMonth1, payoffMonth3, payoffMonth6, payoffBeyond.

VOICE: Write entirely in second person ("you", "your") addressing the ${personaSlash} directly. Situation may open with social-proof framing ("Most ${personaSlash}s in your space...") before shifting to "you". Risks use "If you...", "Without this, you...". Opportunity uses "Today you..." → "With ${analysis.companyName}, you...". Payoff uses commitment language: "In the first 30 days you will...", "By month 3 you'll...", "Within 6 months you will...". Never use third-person. Tone: ${effectiveTone}.

All values are markdown bullet points (- prefix). Draw only from the context above.

"storySituation": 4–5 bullets. Open 1–2 with social-proof framing, then shift to direct "you". Cover current approach, pressures, gaps, and frustrations — before any solution is mentioned.

"storyRisks": 4–5 bullets using "If you...", "Every quarter you delay...", "Without this..." framing. Cover lost revenue, churn, competitive irrelevance, and cost of inaction for a ${personaSlash}.

"storyOpportunity": 4–5 bullets, one per top capability in Value Impact Table rank order. Each bullet: **[Capability]**: Today you [life without]. With ${analysis.companyName}, you [life with] — tracked by [metric], which means [why care].

"payoffMonth1": 2–3 bullets — quick wins visible in the first 30 days, using "you will" language.

"payoffMonth3": 2–3 bullets — measurable progress by 90 days a ${personaSlash} can report upward.

"payoffMonth6": 2–3 bullets — significant ROI clearly visible and defensible at 6 months.

"payoffBeyond": 2–3 bullets — compounding competitive advantage beyond 6 months.

CRITICAL: Return ONLY a valid JSON object. No preamble, no markdown fences, no commentary outside the JSON.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const raw = message.content[0].text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    let valueStory;
    try {
      valueStory = JSON.parse(raw);
    } catch {
      throw new Error('Could not parse Value Story response. Please try again.');
    }

    return res.status(200).json(valueStory);

  } catch (err) {
    console.error('Value story error:', err);
    return res.status(500).json({ error: err.message || 'Something went wrong. Please try again.' });
  }
}
