// netlify/functions/get-slots.js
// Returns available time slots for a given date from Cal.com API v2

const CAL_API_KEY = process.env.CAL_API_KEY;
const CAL_EVENT_TYPE_ID = 6136770;
const CAL_API_BASE = "https://api.cal.com/v2";

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const { date } = event.queryStringParameters || {};

  if (!date) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing date parameter" }),
    };
  }

  // Build start/end for the full day
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.000Z`;

  try {
    const url = `${CAL_API_BASE}/slots/available?eventTypeId=${CAL_EVENT_TYPE_ID}&startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`;

    const res = await fetch(url, {
      headers: {
        "cal-api-version": "2024-08-13",
        Authorization: `Bearer ${CAL_API_KEY}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Cal.com slots error:", JSON.stringify(data));
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: "Failed to fetch slots", detail: data }),
      };
    }

    // Cal.com returns { data: { slots: { "2026-07-01": [ { time: "2026-07-01T09:00:00.000Z" }, ... ] } } }
    const slotsForDate = data?.data?.slots?.[date] || [];
    const availableTimes = slotsForDate.map((slot) => {
      const d = new Date(slot.time);
      const h = String(d.getUTCHours()).padStart(2, "0");
      const m = String(d.getUTCMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: availableTimes }),
    };
  } catch (err) {
    console.error("Network error:", err);
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "Network error", detail: err.message }),
    };
  }
};
