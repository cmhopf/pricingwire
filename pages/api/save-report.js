import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { analysis, url, personas, mcvCount } = req.body;

  if (!analysis) {
    return res.status(400).json({ error: 'No analysis data provided.' });
  }

  try {
    // Timestamp prefix eliminates collision risk; random suffix adds entropy
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    const data = {
      id,
      url,
      analysis,
      personas: (Array.isArray(personas) && personas.length > 0) ? personas : ['CEO', 'CRO', 'CFO'],
      mcvCount: (typeof mcvCount === 'number' && [3, 4, 5].includes(mcvCount)) ? mcvCount : 3,
      createdAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, 'utf-8');

    const { url: blobUrl } = await put(`reports/${id}.json`, buffer, {
      access: 'public',
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log('Report saved:', blobUrl);
    return res.status(200).json({ id });

  } catch (err) {
    console.error('Save report error:', err);
    return res.status(500).json({
      error: `Save failed: ${err.message || 'Unknown error'}`,
    });
  }
}
