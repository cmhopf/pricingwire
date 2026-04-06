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

All values are markdown strings using bullet points (- prefix). Draw entirely from the analysis context above — never invent facts. Tailor everything to ${personaSlash}.

"storySituation": 4–5 bullet points that demonstrate a clear-eyed understanding of the prospect's current reality — their existing approach, operational pressures, strategic environment, and the specific gaps or frustrations that make this problem worth solving. Write from the prospect's point of view, in a way that makes them feel seen and understood before any solution is mentioned.

"storyRisks": 4–5 bullet points covering the specific consequences of not making this a top priority. Be concrete — include lost revenue, customer churn, competitive irrelevance, missed opportunities, and the compounding cost of delay.

"storyOpportunity": 4–5 bullet points — one per top capability, ordered most compelling first (matching the rank order of the Value Impact Table). Each bullet must address all four dimensions in a single concise statement: the Capability itself, the current-state reality (Life Without), the transformed state (Life With), how success is measured (How to Measure), and why it matters to the buyer (Why Care). Pull all content directly from the Value Impact Table — do not invent new capabilities. Format each bullet so the capability name is bolded, followed by the contrast and payoff in plain prose. Example structure: "**[Capability]**: Today [life without]. With [company], [life with] — measured by [metric], which matters because [why care]."

"payoffMonth1": 2–3 bullet points — specific quick wins and early leading indicators visible within 30 days.

"payoffMonth3": 2–3 bullet points — measurable progress and initial business impact within 90 days.

"payoffMonth6": 2–3 bullet points — significant ROI and outcomes becoming clearly visible within 6 months.

"payoffBeyond": 2–3 bullet points — sustained competitive advantage and transformational results after 6 months.

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
