const { google } = require('googleapis');

/**
 * Crear evento de citación en Google Calendar
 */
async function createCitationEvent(tokens, citationData) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const event = {
      summary: ` CITACIÓN: ${citationData.userName}`,
      description: `
 **Citación Preoperacional**

**Usuario:** ${citationData.userName}
**ID:** ${citationData.userId}
**Motivo:** ${citationData.reason}
**Detalles:** ${citationData.reasonDetails || 'N/A'}

 **IMPORTANTE:** Marcar asistencia en el sistema después de la reunión.
      `.trim(),
      start: {
        dateTime: citationData.citationDate.toISOString(),
        timeZone: 'America/Bogota'
      },
      end: {
        dateTime: new Date(citationData.citationDate.getTime() + 30 * 60000).toISOString(), 
        timeZone: 'America/Bogota'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },   
          { method: 'popup', minutes: 15 },   
          { method: 'email', minutes: 1440 } 
        ]
      },
      colorId: '11'
    };
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all'
    });
    
    console.log(' Evento creado en Google Calendar:', response.data.id);
    return response.data.id;
    
  } catch (error) {
    console.error(' Error creando evento en Calendar:', error.message);
    throw error;
  }
}

/**
 * Eliminar evento de Google Calendar
 */
async function deleteCitationEvent(tokens, eventId) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });
    
    console.log(' Evento eliminado de Google Calendar');
    
  } catch (error) {
    console.error(' Error eliminando evento:', error.message);
  }
}

module.exports = {
  createCitationEvent,
  deleteCitationEvent
};
