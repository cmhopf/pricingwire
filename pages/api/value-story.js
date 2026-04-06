import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
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

VOICE RULES — apply across every section without exception:
- Write in second person ("you", "your") throughout — speak directly to the ${personaSlash} reading this
- Situation may open bullets with light social-proof framing ("Most [persona]s in your space are navigating...") before shifting to direct "you" language — this makes observations feel validated, not assumed
- Risks use direct "If you..." / "Without this..." / "The longer you wait..." framing to create honest urgency
- Opportunity uses "Today you..." → "With ${analysis.companyName}, you..." contrast per capability
- Payoff uses commitment language: "In the first 30 days you will...", "By month 3 you'll see...", "Within 6 months you will have..."
- Never use third-person ("they", "companies", "organizations") — always address the reader directly
- Tone: ${effectiveTone}

All values are markdown strings using bullet points (- prefix). Draw entirely from the analysis context above — never invent facts. Tailor everything to ${personaSlash}.

"storySituation": 4–5 bullet points. Open with 1–2 bullets using social-proof framing ("Most ${personaSlash}s in your space are dealing with...") to establish that this is a recognized, validated challenge — then shift to direct "you" language for the remaining bullets to make it personal. Cover their existing approach, operational pressures, strategic environment, and the specific gaps or frustrations that make this worth solving. The reader should feel clearly seen before any solution is mentioned.

"storyRisks": 4–5 bullet points in direct second-person. Use "If you don't...", "Every quarter you delay...", "Without this, you risk..." framing. Be concrete — address lost revenue, customer churn, competitive irrelevance, missed opportunities, and the compounding cost of inaction specific to a ${personaSlash}.

"storyOpportunity": 4–5 bullet points — one per top capability, ordered most compelling first (matching the rank order of the Value Impact Table). Each bullet must address all four dimensions in a single concise statement using second-person contrast: the Capability (bolded), the current-state reality in "you" language (Life Without), the transformed state in "you" language (Life With), how success is measured (How to Measure), and why it matters to this buyer (Why Care). Pull all content directly from the Value Impact Table — do not invent new capabilities. Example structure: "**[Capability]**: Today you [life without]. With ${analysis.companyName}, you [life with] — tracked by [metric], which means [why care for ${personaSlash}]."

"payoffMonth1": 2–3 bullet points using commitment language — "In the first 30 days you will see...", "Within your first month you'll have...". Specific quick wins and early leading indicators the ${personaSlash} will be able to point to.

"payoffMonth3": 2–3 bullet points — "By month 3 you'll see...", "Within 90 days you will have...". Measurable progress and initial business impact a ${personaSlash} can report upward.

"payoffMonth6": 2–3 bullet points — "Within 6 months you will have...", "By the half-year mark you'll be...". Significant ROI and outcomes that are clearly visible and defensible.

"payoffBeyond": 2–3 bullet points — "Beyond 6 months, you'll have built...", "Long-term, you will...". Sustained competitive advantage and transformational results that compound over time.

CRITICAL: Return ONLY a valid JSON object. No preamble, no markdown fences, no commentary outside the JSON.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
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
