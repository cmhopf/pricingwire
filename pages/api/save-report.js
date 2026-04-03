import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { assessment, deepAssessment, url } = req.body;

  if (!assessment) {
    return res.status(400).json({ error: 'No assessment data provided.' });
  }

  try {
    // Generate a short random ID
    const id = Math.random().toString(36).substring(2, 10);

    const data = {
      id,
      url,
      assessment,
      deepAssessment: deepAssessment || null,
      createdAt: new Date().toISOString(),
    };

    await put(`reports/${id}.json`, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
    });

    return res.status(200).json({ id });

  } catch (err) {
    console.error('Save report error:', err);
    return res.status(500).json({ error: 'Could not save report. Please try again.' });
  }
}
