// Netlify Function: proxies newsletter sign-ups to the Beehiiv API so the
// API key is never shipped to the browser.
//
// Required environment variable (set in Netlify → Site settings → Environment):
//   BEEHIIV_API_KEY          – your Beehiiv API v2 key (ROTATE the old leaked one)
// Optional:
//   BEEHIIV_PUBLICATION_ID   – defaults to the flo publication below
const PUBLICATION_ID =
  process.env.BEEHIIV_PUBLICATION_ID || 'e8599000-065f-465e-8e40-513c833e026a';

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ message: 'Server not configured' }) };
  }

  let email;
  try {
    ({ email } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid request' }) };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Valid email required' }) };
  }

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email: true,
          utm_source: 'flo-website',
          utm_medium: 'organic',
          utm_campaign: 'email-cta'
        })
      }
    );

    const data = await res.json().catch(() => ({}));
    // Pass through the shape the client already expects: { data: { status } }
    return { statusCode: res.ok ? 200 : res.status, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ message: 'Upstream error' }) };
  }
};
