// netlify/functions/create-booking.js
// Cal.com API v2 — creates a booking
// Docs: https://cal.com/docs/api-reference/v2/bookings/create-a-booking

const CAL_API_KEY = process.env.CAL_API_KEY;
const CAL_EVENT_TYPE_ID = 6136770; // Запис на сервіс
const CAL_API_BASE = "https://api.cal.com/v2";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { serviceId, serviceName, date, time, name, phone, email, comment } =
    body;

  if (!date || !time || !name || !phone) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing required fields: date, time, name, phone",
      }),
    };
  }

  const startIso = `${date}T${time}:00.000Z`;

  const bookingPayload = {
    eventTypeId: CAL_EVENT_TYPE_ID,
    start: startIso,
    attendee: {
      name,
      email: email || `noemail+${Date.now()}@placeholder.com`,
      timeZone: "Europe/Berlin",
      phoneNumber: phone,
    },
    metadata: {
      phone,
      service: serviceName || serviceId || "",
      comment: comment || "",
    },
    notes: [serviceName, comment].filter(Boolean).join(" — ") || undefined,
  };

  try {
    const res = await fetch(`${CAL_API_BASE}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13",
        Authorization: `Bearer ${CAL_API_KEY}`,
      },
      body: JSON.stringify(bookingPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Cal.com error:", JSON.stringify(data));
      return {
        statusCode: res.status,
        body: JSON.stringify({
          error:
            data?.error?.message || data?.message || "Cal.com booking failed",
          detail: data,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        bookingId: data?.data?.id,
        bookingUid: data?.data?.uid,
        status: data?.data?.status,
      }),
    };
  } catch (err) {
    console.error("Network error:", err);
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "Network error", detail: err.message }),
    };
  }
};
