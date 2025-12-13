// netlify/functions/track-tiktok.js
const fetch = require('node-fetch');
const crypto = require('crypto');

const TIKTOK_PIXEL_ID = process.env.TIKTOK_PIXEL_ID;
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      event_name = 'Join the waitlist',
      event_id,
      email,
      phone,
      page_url,
      content_id,
      content_type,
      content_name,
      ttclid,
      ttp
    } = body;

    const timestamp = Math.floor(Date.now() / 1000);

    // Netlify provides client IP via x-forwarded-for
    const client_ip = (event.headers['x-forwarded-for'] || '').split(',')[0] || null;
    const client_user_agent = event.headers['user-agent'] || body.client_user_agent || null;

    // Hash PII server-side
    const hashedEmail = email ? sha256Hex(email.trim().toLowerCase()) : undefined;
    const hashedPhone = phone ? sha256Hex(phone.replace(/[^0-9]/g, '')) : undefined;

    const tiktokPayload = {
      pixel_code: TIKTOK_PIXEL_ID,
      timestamp,
      event: event_name,
      event_id,
      properties: {
        page_url,
        content_id,
        content_type,
        content_name,
        ttclid,
        ttp
      },
      user: {
        ...(hashedEmail ? { email: hashedEmail } : {}),
        ...(hashedPhone ? { phone: hashedPhone } : {}),
        client_ip,
        client_user_agent
      },
    test_event_code: TEST65495 
    };

    const url = `https://business-api.tiktok.com/open_api/v1.3/event/track/?access_token=${encodeURIComponent(TIKTOK_ACCESS_TOKEN)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tiktokPayload)
    });

    const text = await res.text();
    return { statusCode: 200, body: JSON.stringify({ ok: true, tiktokResponse: text }) };
  } catch (err) {
    console.error('track-tiktok error', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
