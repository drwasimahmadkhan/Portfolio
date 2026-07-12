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

function doGet(e) {
  try {
    const params = e.parameter || {};

    if (params.action === 'events' || params.start || params.end) {
      const calendarId = params.calendarId || CALENDAR_ID;
      const calendar = CalendarApp.getCalendarById(calendarId);

      if (!calendar) {
        return jsonOutput({ ok: false, error: 'Calendar not found. Check CALENDAR_ID.' });
      }

      const start = params.start ? new Date(params.start) : new Date();
      const end = params.end
        ? new Date(params.end)
        : new Date(start.getTime() + (60 * 24 * 60 * 60 * 1000));

      const events = calendar.getEvents(start, end);
      const items = events.map(function (event) {
        return {
          id: event.getId(),
          summary: event.getTitle(),
          status: 'confirmed',
          start: { dateTime: event.getStartTime().toISOString() },
          end: { dateTime: event.getEndTime().toISOString() },
        };
      });

      return jsonOutput({ ok: true, items: items });
    }

    return jsonOutput({ ok: true, message: 'Atelier calendar webhook is running.' });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error) });
  }
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
