const cron = require('node-cron');
const PreoperationalRecord = require('../models/PreoperationalRecord');
const UserSanction = require('../models/UserSanction');
const WorkCalendar = require('../models/WorkCalendar');
const emailNotificationService = require('./emailNotificationService');

class PreoperationalScheduler {
  constructor() {
    this.jobs = [];
  }

  /**
 * Iniciar todos los cron jobs
 */
start(adminTokens) {
  console.log('📅 Iniciando scheduler de preoperacionales...');

  const job9AM = cron.schedule('0 9 * * *', async () => {
    console.log('🔍 [9:00 AM] Verificando preoperacionales no entregados...');
    await this.checkMissedPreoperacionals(adminTokens);
  }, {
    timezone: 'America/Bogota'
  });

  const job12PM = cron.schedule('0 12 * * *', async () => {
    console.log('⏰ [12:00 PM] Aplicando sanciones automáticas...');
    await this.applySanctions(adminTokens); // ✅ CORREGIDO: usa this.applySanctions
  }, {
    timezone: 'America/Bogota'
  });

  const job7PM = cron.schedule('0 19 * * *', async () => {
    console.log('📊 [7:00 PM] Generando reporte diario...');
    await this.generateDailyReport(adminTokens);
  }, {
    timezone: 'America/Bogota'
  });

  const job745AM = cron.schedule('45 7 * * *', async () => {
    console.log('📢 [7:45 AM] Enviando recordatorio de preoperacional...');
    await this.sendMorningReminder(adminTokens);
  }, {
    timezone: 'America/Bogota'
  });

  this.jobs.push(job9AM, job12PM, job7PM, job745AM);

  console.log('✅ Scheduler iniciado correctamente');
  console.log('   - 7:45 AM: Recordatorio para llenar preoperacional');
  console.log('   - 9:00 AM: Verificación de preoperacionales');
  console.log('   - 12:00 PM: Aplicación de sanciones');
  console.log('   - 7:00 PM: Reporte diario');
}

  /**
   * Detener todos los cron jobs
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    console.log('🛑 Scheduler detenido');
  }

  /**
   * Obtener lista de usuarios que deben llenar preoperacional hoy
   */
  async getUsersForToday() {
    try {
      const response = await fetch('https://supervitec-sgd-clean.vercel.app/api/users-preop');
      const data = await response.json();
      
      if (!data.users || data.users.length === 0) {
        console.log(' No hay usuarios registrados');
        return [];
      }

      const today = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const dayOfWeek = new Date().getDay();

      if (dayOfWeek === 0) {
        console.log(' Hoy es domingo, no hay verificación');
        return [];
      }

      const usersToCheck = [];

      for (const user of data.users) {
        const calendar = await WorkCalendar.findOne({
          userId: user.correo,
          year,
          month
        });

        const isNonWorking = calendar && calendar.nonWorkingDays.includes(today);

        if (!isNonWorking) {
          usersToCheck.push({
            userId: user.correo,
            userName: user.nombre
          });
        }
      }

      return usersToCheck;

    } catch (error) {
      console.error(' Error obteniendo usuarios:', error);
      return [];
    }
  }

  /**
   * Verificar a las 9 AM quiénes no han entregado
   */
  async checkMissedPreoperacionals(tokens) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const users = await this.getUsersForToday();

      console.log(` Verificando ${users.length} usuarios para hoy: ${today}`);

      let missedCount = 0;

      for (const user of users) {
        const record = await PreoperationalRecord.findOne({
          userId: user.userId,
          date: today
        });

        if (!record || record.status === 'no_entregado') {
          console.log(` ${user.userName} NO ha entregado preoperacional`);

          if (!record) {
            await PreoperationalRecord.create({
              userId: user.userId,
              userName: user.userName,
              date: today,
              status: 'no_entregado',
              deliveryTime: null,
              formData: null,
              wasLate: false,
              adminNotified: false
            });
          }

          if (tokens) {
            const sent = await emailNotificationService.notifyMissedPreoperational(
              tokens,
              user.userName,
              user.userId,
              today
            );

            if (sent) {
              await PreoperationalRecord.updateOne(
                { userId: user.userId, date: today },
                { adminNotified: true }
              );
            }
          }

          missedCount++;
        }
      }

      console.log(` Verificación 9 AM completada: ${missedCount} usuarios sin entregar`);

    } catch (error) {
      console.error(' Error en verificación 9 AM:', error);
    }
  }

  /**
   * Aplicar sanciones a las 12 PM a quienes no entregaron
   */
  async applySanctions(tokens) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const users = await this.getUsersForToday();

      console.log(`⚖ Aplicando sanciones para hoy: ${today}`);

      let sanctionedCount = 0;

      for (const user of users) {
        const record = await PreoperationalRecord.findOne({
          userId: user.userId,
          date: today
        });

        if (!record || record.status === 'no_entregado') {
          console.log(` Aplicando sanción a: ${user.userName}`);

          if (record) {
            record.status = 'no_entregado';
            await record.save();
          }

          let sanctions = await UserSanction.findOne({ userId: user.userId });

          if (!sanctions) {
            sanctions = new UserSanction({
              userId: user.userId,
              userName: user.userName,
              totalSanctions: 0,
              sanctionHistory: []
            });
          }

          sanctions.totalSanctions += 1;
          sanctions.sanctionHistory.push({
            date: today,
            reason: 'no_entregado',
            sanctionNumber: sanctions.totalSanctions,
            createdAt: new Date()
          });
          sanctions.lastSanctionDate = new Date();

          if (sanctions.totalSanctions >= 3 && !sanctions.hasCitation) {
            sanctions.hasCitation = true;
            sanctions.citationDate = new Date();

            console.log(` Enviando citación a: ${user.userName}`);

            if (tokens) {
              await emailNotificationService.sendCitationEmail(
                tokens,
                user.userName,
                user.userId,
                sanctions.sanctionHistory
              );
            }
          }

          await sanctions.save();
          sanctionedCount++;

          console.log(`   Sanción #${sanctions.totalSanctions} aplicada a ${user.userName}`);
        }
      }

      console.log(` Sanciones aplicadas: ${sanctionedCount} usuarios`);

    } catch (error) {
      console.error(' Error aplicando sanciones:', error);
    }
  }

  /**
   * Generar reporte diario a las 6 PM
   */
  async generateDailyReport(tokens) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const records = await PreoperationalRecord.find({ date: today });

      const completed = records.filter(r => r.status === 'completado').length;
      const late = records.filter(r => r.status === 'entregado_tarde').length;
      const missed = records.filter(r => r.status === 'no_entregado').length;
      const total = records.length;

      console.log('\n ============ REPORTE DIARIO ============');
      console.log(` Fecha: ${today}`);
      console.log(` Entregados a tiempo: ${completed}`);
      console.log(` Entregados tarde: ${late}`);
      console.log(` No entregados: ${missed}`);
      console.log(`📈 Total registros: ${total}`);
      console.log('=========================================\n');

    } catch (error) {
      console.error(' Error generando reporte:', error);
    }
  }

  /**
   * Ejecutar verificación manual 
   */
  async runManualCheck(tokens) {
    console.log(' Ejecutando verificación manual...');
    await this.checkMissedPreoperacionals(tokens);
    await this.applySanctions(tokens);
  }
}

module.exports = new PreoperationalScheduler();
