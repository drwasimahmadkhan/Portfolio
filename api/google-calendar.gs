/**
 * GOOGLE CALENDAR — ONE-TIME SETUP (5 minutes)
 * --------------------------------------------
 * 1. Open https://script.google.com → New project
 * 2. Paste this entire file into Code.gs
 * 3. Set CALENDAR_ID below to your calendar ID (same as in .env)
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web app URL into your .env:
 *    Calendar_Webhook=https://script.google.com/macros/s/...../exec
 */

const CALENDAR_ID = 'PASTE_YOUR_CALENDAR_ID_FROM_DOT_ENV';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const calendarId = data.calendarId || CALENDAR_ID;
    const calendar = CalendarApp.getCalendarById(calendarId);

    if (!calendar) {
      return jsonOutput({ ok: false, error: 'Calendar not found. Check CALENDAR_ID.' });
    }

    const start = new Date(data.start);
    const end = new Date(data.end);
    const options = {
      description: data.description || '',
      location: data.location || '',
    };

    if (data.email) {
      options.guests = data.email;
    }

    const event = calendar.createEvent(data.summary || 'Atelier Session', start, end, options);

    return jsonOutput({
      ok: true,
      eventId: event.getId(),
      htmlLink: event.getId() ? 'https://calendar.google.com/calendar' : '',
    });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error) });
  }
}

function doGet() {
  return jsonOutput({ ok: true, message: 'Atelier calendar webhook is running.' });
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
