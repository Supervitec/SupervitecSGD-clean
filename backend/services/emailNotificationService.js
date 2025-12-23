const { google } = require('googleapis');

class EmailNotificationService {
  constructor() {
    this.adminEmail = process.env.ADMIN_EMAIL || 'supervitecapp@gmail.com';
  }

  /**
   * Helper: Crear cliente OAuth2
   */
  _getOAuthClient(tokens) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  }

  /**
   * Helper: Enviar email genérico
   */
  async _sendEmail(tokens, to, subject, htmlBody, cc = null) {
    try {
      const oauth2Client = this._getOAuthClient(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const messageParts = [
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `To: ${to}`,
      ];

      if (cc) {
        messageParts.push(`Cc: ${cc}`);
      }

      messageParts.push(`Subject: ${subject}`, '', htmlBody);

      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log(` Email enviado a ${to} - ID: ${response.data.id}`);
      return { success: true, messageId: response.data.id, to };
    } catch (error) {
      console.error(` Error enviando email a ${to}:`, error.message);
      return { success: false, error: error.message, to };
    }
  }

  /**
   * Enviar notificación de preoperacional no entregado
   */
  async notifyMissedPreoperational(tokens, userName, userId, date) {
    const subject = `🚨 Preoperacional NO entregado - ${userName}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">🚨 Alerta de Preoperacional</h2>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h3 style="color: #1f2937;">Preoperacional NO Entregado</h3>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 10px 0;"><strong>Usuario:</strong> ${userName}</p>
            <p style="margin: 10px 0;"><strong>ID:</strong> ${userId}</p>
            <p style="margin: 10px 0;"><strong>Fecha:</strong> ${date}</p>
            <p style="margin: 10px 0;"><strong>Estado:</strong> NO ENTREGADO</p>
          </div>
          
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
            <p style="margin: 0; color: #991b1b;">
               El usuario no entregó su preoperacional. Se ha aplicado una sanción automática.
              Al acumular <strong>3 faltas</strong>, se procederá con citación formal.
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: 600;">
              Ver Dashboard
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>SupervitecSGD - Sistema de Gestión de Documentos</p>
          <p>${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
        </div>
      </div>
    `;

    return await this._sendEmail(tokens, this.adminEmail, subject, body);
  }

  /**
 * 🔥 Enviar citación por acumular 3 sanciones
 */
async sendCitationEmail(tokens, userName, userId, sanctionHistory, userEmail = null) {
  const subject = `CITACION FORMAL - ${userName}`;
  
  // Construir tabla de historial
  const sanctionsHTML = sanctionHistory
    .slice(-5) // Últimas 5 faltas
    .map((s, idx) => {
      const reasonText = s.reason === 'no_entregado' 
        ? 'No entregado' 
        : s.reason === 'entregado_tarde'
        ? 'Entregado tarde'
        : s.reason;
      
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; text-align: center;">#${s.sanctionNumber}</td>
          <td style="padding: 10px;">${s.date}</td>
          <td style="padding: 10px;">${reasonText}</td>
        </tr>
      `;
    }).join('');

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">CITACION FORMAL</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px;">
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1f2937; margin-top: 0;">Notificación de Citación</h3>
          
          <p style="color: #374151; line-height: 1.6;">
            Estimado/a <strong>${userName}</strong>,
          </p>
          
          <p style="color: #374151; line-height: 1.6;">
            Por medio del presente, le informamos que ha acumulado <strong style="color: #dc2626;">3 faltas</strong> 
            en el cumplimiento de su labor.
          </p>
        </div>

        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #dc2626; margin-top: 0;">📋 Historial de Faltas</h4>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Sanción</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Fecha</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Motivo</th>
              </tr>
            </thead>
            <tbody>
              ${sanctionsHTML}
            </tbody>
          </table>
        </div>

        <div style="background: #fef2f2; padding: 20px; border-left: 4px solid #dc2626; border-radius: 4px; margin-bottom: 20px;">
          <h4 style="color: #991b1b; margin-top: 0;">⚠️ Consecuencias</h4>
          <ul style="color: #991b1b; line-height: 1.8; margin: 10px 0;">
            <li>Amonestación por escrito</li>
            <li>Reunión obligatoria con área administrativa</li>
            <li>Futuras faltas pueden resultar en suspensión</li>
          </ul>
        </div>

        <div style="background: #dbeafe; padding: 20px; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 20px;">
          <h4 style="color: #1e40af; margin-top: 0;">📌 Acciones Requeridas</h4>
          <ol style="color: #1e40af; line-height: 1.8; margin: 10px 0;">
            <li>Presentarse en la oficina o comunicarse allí</li>
            <li>Confirmar recibido respondiendo vía WhatsApp</li>
          </ol>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
             style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    display: inline-block;
                    font-weight: 600;
                    font-size: 16px;">
            📱 Ver mi Perfil
          </a>
        </div>
      </div>
      
      <div style="background: #1f2937; padding: 25px; border-radius: 0 0 10px 10px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 13px;">
          <strong style="color: white;">Supervitec - Departamento SST</strong><br>
          Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}<br>
          Documento oficial generado automáticamente
        </p>
      </div>
    </div>
  `;

  const results = [];

  
    
    // Email al admin
    const adminResult = await this._sendEmail(
      tokens, 
      this.adminEmail, 
      subject, 
      body
    );
    results.push(adminResult);

  if (userEmail && userEmail.includes('@')) {
    try {
      console.log(`📧 Enviando citación al conductor: ${userEmail}`);
      const userResult = await this._sendEmail(tokens, userEmail, subject, body);
      results.push({ to: userEmail, ...userResult });
      console.log(` Email enviado exitosamente a ${userEmail}`);
    } catch (error) {
      console.error(`❌ Error enviando a ${userEmail}:`, error.message);
      results.push({ to: userEmail, success: false, error: error.message });
    }
  } else {
    console.warn(`⚠️ No se proporcionó email del conductor (userId: ${userId})`);
  }
  
  try {
    console.log(`📧 Enviando copia al admin: ${this.adminEmail}`);
    const adminResult = await this._sendEmail(tokens, this.adminEmail, subject, body);
    results.push({ to: this.adminEmail, ...adminResult });
  } catch (error) {
    console.error(`❌ Error enviando al admin:`, error.message);
    results.push({ to: this.adminEmail, success: false, error: error.message });
  }

  return results;
}

  /**
   * Notificar entrega tardía 
   */
  async notifyLateDelivery(tokens, userName, userId, date, deliveryTime) {
    const timeStr = new Date(deliveryTime).toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });

    const subject = ` Preoperacional entregado TARDE - ${userName}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;"> Entrega Tardía</h2>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h3 style="color: #1f2937;">Preoperacional Entregado con Retraso</h3>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 10px 0;"><strong>Usuario:</strong> ${userName}</p>
            <p style="margin: 10px 0;"><strong>ID:</strong> ${userId}</p>
            <p style="margin: 10px 0;"><strong>Fecha:</strong> ${date}</p>
            <p style="margin: 10px 0;"><strong>Hora de entrega:</strong> ${timeStr}</p>
            <p style="margin: 10px 0;"><strong>Límite esperado:</strong> 9:00 AM</p>
          </div>
          
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d;">
            <p style="margin: 0; color: #92400e;">
               El usuario entregó su preoperacional después de las 9:00 AM.
              Se ha registrado como <strong>entrega tardía</strong>.
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: 600;">
              Ver Dashboard
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>SupervitecSGD - Sistema de Gestión de Documentos</p>
        </div>
      </div>
    `;

    return await this._sendEmail(tokens, this.adminEmail, subject, body);
  }
}

module.exports = new EmailNotificationService();
