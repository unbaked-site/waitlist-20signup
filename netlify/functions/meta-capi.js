// netlify/functions/meta-capi.js
const crypto = require('crypto');

const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = process.env.META_API_VERSION || 'v18.0';

function sha256Hex(value) {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);

    const {
      event_name,
      event_id,
      email,
      fbp,
      fbc,
      page_url,
      custom_data,
      test_event_code,
    } = body;

    if (!event_name || !event_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing event_name or event_id' }) };
    }

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id, // deduplication
          action_source: 'website',
          event_source_url: page_url,
          user_data: {
            em: email ? [sha256Hex(email.toLowerCase().trim())] : undefined,
            fbp: fbp || undefined,
            fbc: fbc || undefined,
          },
          custom_data: custom_data || {},
        },
      ],
    };

    if (test_event_code) {
      payload.test_event_code = test_event_code;
    }

    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('Meta CAPI error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Meta CAPI failed' }),
    };
  }
}
