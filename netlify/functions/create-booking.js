// netlify/functions/create-booking.js
// Cal.com API v2 — creates a booking and sends confirmation
// Docs: https://cal.com/docs/api-reference/v2/bookings/create-a-booking

const CAL_API_KEY  = process.env.CAL_API_KEY;   // set in Netlify env vars
const CAL_USERNAME = process.env.CAL_USERNAME;   // e.g. dmitry-diwolf-kazakov-er9woz
const CAL_EVENT_SLUG = process.env.CAL_EVENT_SLUG || 'auto-service';
const CAL_API_BASE  = 'https://api.cal.com/v2';

exports.handler = async (event) => {
  // Only POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { serviceId, serviceName, date, time, name, phone, email, comment } = body;

  // Validate required fields
  if (!date || !time || !name || !phone) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: date, time, name, phone' }),
    };
  }

  // Build ISO datetime for Cal.com
  // Cal.com expects UTC ISO string
  const startIso = `${date}T${time}:00.000Z`;

  // Get event type ID first (needed for booking)
  let eventTypeId;
  try {
    eventTypeId = await getEventTypeId();
  } catch (err) {
    console.error('Failed to get event type:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Could not fetch event type from Cal.com' }),
    };
  }

  // Create booking
  const bookingPayload = {
    eventTypeId,
    start: startIso,
    attendee: {
      name,
      email: email || `noemail+${Date.now()}@placeholder.com`,
      timeZone: 'Europe/Berlin',
    },
    metadata: {
      phone,
      service: serviceName || serviceId || '',
      comment: comment || '',
    },
    // Optional: pass service as notes
    ...(comment || serviceName
      ? { notes: [serviceName, comment].filter(Boolean).join(' — ') }
      : {}),
  };

  try {
    const res = await fetch(`${CAL_API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13',
        Authorization: `Bearer ${CAL_API_KEY}`,
      },
      body: JSON.stringify(bookingPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Cal.com booking error:', data);
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data?.message || 'Cal.com booking failed', detail: data }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        bookingId: data?.data?.id,
        bookingUid: data?.data?.uid,
        status: data?.data?.status,
      }),
    };
  } catch (err) {
    console.error('Network error calling Cal.com:', err);
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Network error', detail: err.message }),
    };
  }
};

// Fetch the event type ID by slug
async function getEventTypeId() {
  const res = await fetch(
    `${CAL_API_BASE}/event-types?username=${CAL_USERNAME}&eventSlug=${CAL_EVENT_SLUG}`,
    {
      headers: {
        'cal-api-version': '2024-08-13',
        Authorization: `Bearer ${CAL_API_KEY}`,
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || 'Failed to fetch event types');
  }

  const eventType = data?.data?.[0];
  if (!eventType?.id) {
    throw new Error(`Event type not found: ${CAL_USERNAME}/${CAL_EVENT_SLUG}`);
  }

  return eventType.id;
}
