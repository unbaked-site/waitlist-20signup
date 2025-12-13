// netlify/functions/meta-capi.js
// Node 18+ recommended on Netlify (for global fetch). See notes below if you need Node 16.

const crypto = require('crypto');

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const API_VERSION = process.env.META_API_VERSION || 'v18.0';

function sha256Hex(input = '') {
  return crypto.createHash('sha256').update(String(input).trim().toLowerCase()).digest('hex');
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const {
      event_name,
      event_id,
      email,
      fbp,
      fbc,
      page_url,
      test_event_code, // optional for debugging
      custom_data // optional object for things like content_name
    } = body;

    if (!event_name || !event_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing event_name or event_id' }) };
    }
    if (!PIXEL_ID || !ACCESS_TOKEN) {
      console.error('Missing META_PIXEL_ID or META_ACCESS_TOKEN env vars');
      return { statusCode: 500, body: 'Server misconfiguration' };
    }

    const event_time = Math.floor(Date.now() / 1000);

    // Build user_data - only include what you have and hash/email here
    const user_data = {
      client_user_agent: (event.headers && (event.headers['user-agent'] || event.headers['User-Agent'])) || '',
    };

    if (email) user_data.em = sha256Hex(email);
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;

    const eventObject = {
      event_name,
      event_time,
      event_id,
      action_source: 'website',
      user_data,
      event_source_url: page_url,
    };

    if (custom_data) eventObject.custom_data = custom_data;

    const payload = { data: [eventObject] };

    // Build URL
    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}` +
                (test_event_code ? `&test_event_code=${encodeURIComponent(test_event_code)}` : '');

    // Send to Meta
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error('Meta CAPI error', resp.status, text);
      return { statusCode: 502, body: text };
    }

    // Return Meta's response (JSON string)
    return { statusCode: 200, body: text };
  } catch (err) {
    console.error('meta-capi error', err);
    return { statusCode: 500, body: String(err) };
  }
};
