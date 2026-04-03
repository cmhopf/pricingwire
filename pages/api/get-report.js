import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'No report ID provided.' });
  }

  try {
    const { blobs } = await list({ prefix: `reports/${id}` });

    if (!blobs || blobs.length === 0) {
      return res.status(404).json({ error: 'Report not found. It may have expired or the link may be incorrect.' });
    }

    const response = await fetch(blobs[0].url);
    if (!response.ok) {
      throw new Error('Could not retrieve report data.');
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Get report error:', err);
    return res.status(500).json({ error: err.message || 'Could not load report. Please try again.' });
  }
}
