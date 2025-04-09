import { db } from './db';
import * as schema from '../shared/schema';
import * as storage from './storage';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Servizio per gestire il salvataggio periodico dei dati di trend
 */
export class TrendService {
  /**
   * Genera e salva tutti i tipi di trend per un consulente
   * @param advisorId - ID del consulente
   */
  async generateAndSaveTrendsForAdvisor(advisorId: number): Promise<void> {
    try {
      const now = new Date();
      console.log(`[TrendService] Inizio generazione trend per advisor ${advisorId}`);
      
      // Ottieni l'utente per verificare la data di iscrizione
      const advisor = await db.select().from(schema.users).where(eq(schema.users.id, advisorId)).limit(1);
      if (!advisor || advisor.length === 0) {
        console.log(`[TrendService] Advisor con ID ${advisorId} non trovato, skip generazione trend`);
        return;
      }
      
      const userCreatedAt = advisor[0].createdAt || new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      console.log(`[TrendService] Advisor ${advisorId} creato il ${userCreatedAt.toISOString()}`);
      
      // Ottieni tutti i clienti del consulente
      const clients = await db.select().from(schema.clients).where(eq(schema.clients.advisorId, advisorId));
      console.log(`[TrendService] Advisor ${advisorId} ha ${clients.length} clienti`);
      
      // Ottieni tutti i log dei clienti del consulente
      const clientIds = clients.map(client => client.id);
      const logs = clientIds.length > 0 
        ? await db.select().from(schema.clientLogs).where(and(
            eq(schema.clientLogs.createdBy, advisorId),
            gte(schema.clientLogs.logDate, this.getOneYearAgo(now))
          ))
        : [];
      console.log(`[TrendService] Trovati ${logs.length} log per i clienti dell'advisor ${advisorId}`);
        
      // Prima di generare nuovi dati, elimina tutte le statistiche precedenti per questo consulente
      await this.deleteAllTrendDataForAdvisor(advisorId);
      
      // Calcola solo i trend per diversi timeframe
      // Questo genererà tutti i dati di cui abbiamo bisogno
      await this.generateTimeframeTrends(advisorId, now, clients, logs, userCreatedAt);
      
      // Generiamo alcuni trend di base anche se non ci sono dati sufficienti
      if (clients.length === 0) {
        console.log(`[TrendService] Advisor ${advisorId} non ha clienti, generazione trend di base con valori zero`);
        // Genera trend di base con valori a zero
        await this.generateBasicZeroTrends(advisorId, now);
      }
      
      console.log(`[TrendService] Generazione trend completata per advisor ${advisorId}`);
    } catch (error) {
      console.error(`[TrendService] Errore durante la generazione trend per advisor ${advisorId}:`, error);
    }
  }
  
  /**
   * Genera trend di base con valori a zero per consulenti senza clienti
   */
  private async generateBasicZeroTrends(advisorId: number, date: Date): Promise<void> {
    const timeframes = [
      { code: '1w', days: 7, label: '1 Settimana' },
      { code: '1m', days: 30, label: '1 Mese' },
      { code: '3m', days: 90, label: '3 Mesi' },
      { code: '6m', days: 180, label: '6 Mesi' },
      { code: '1y', days: 365, label: '1 Anno' }
    ];
    
    for (const timeframe of timeframes) {
      // Periodo di tempo
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - timeframe.days);
      
      // Trend di base
      await storage.saveTrendData(
        advisorId, 
        `lead_count_${timeframe.code}`, 
        date, 
        0, 
        "0",
        { 
          type: 'timeframe',
          timeframe: timeframe.code,
          timeframeLabel: timeframe.label,
          startDate,
          endDate: date,
          originalType: 'lead_count',
          count: 0
        }
      );
      
      await storage.saveTrendData(
        advisorId, 
        `prospect_count_${timeframe.code}`, 
        date, 
        0, 
        "0",
        { 
          type: 'timeframe',
          timeframe: timeframe.code,
          timeframeLabel: timeframe.label,
          startDate,
          endDate: date,
          originalType: 'prospect_count',
          count: 0
        }
      );
      
      await storage.saveTrendData(
        advisorId, 
        `active_client_count_${timeframe.code}`, 
        date, 
        0, 
        "0",
        { 
          type: 'timeframe',
          timeframe: timeframe.code,
          timeframeLabel: timeframe.label,
          startDate,
          endDate: date,
          originalType: 'active_client_count',
          count: 0
        }
      );
    }
  }
  
  /**
   * Elimina tutti i dati di trend per un consulente
   * @param advisorId - ID del consulente
   */
  private async deleteAllTrendDataForAdvisor(advisorId: number): Promise<void> {
    try {
      // Importa direttamente dalla radice per evitare problemi di path
      const schema = await import('@shared/schema');
      
      // Elimina tutti i dati di trend per questo consulente
      await db.delete(schema.trendData)
        .where(eq(schema.trendData.advisorId, advisorId));
      
      console.log(`Deleted all previous trend data for advisor ${advisorId}`);
    } catch (error) {
      console.error(`Error deleting trend data for advisor ${advisorId}:`, error);
    }
  }
  
  /**
   * Genera e salva i dati di trend per diversi timeframe
   * @param advisorId - ID del consulente
   * @param currentDate - Data corrente
   * @param clients - Lista dei clienti del consulente
   * @param logs - Lista dei log del consulente
   */
  private async generateTimeframeTrends(
    advisorId: number, 
    currentDate: Date,
    clients: schema.Client[],
    logs: schema.ClientLog[],
    userCreatedAt: Date
  ): Promise<void> {
    try {
      // Definisci i timeframe che vuoi salvare
      const timeframes = [
        { code: '1w', days: 7, label: '1 Settimana' },
        { code: '1m', days: 30, label: '1 Mese' },
        { code: '3m', days: 90, label: '3 Mesi' },
        { code: '6m', days: 180, label: '6 Mesi' },
        { code: '1y', days: 365, label: '1 Anno' }
      ];
      
      // Calcola quanti giorni sono passati dall'iscrizione
      const daysSinceRegistration = Math.floor((currentDate.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Filtra i timeframe in base alla data di iscrizione
      const validTimeframes = timeframes.filter(timeframe => {
        // Se l'utente è iscritto da meno giorni del timeframe, non calcoliamo quella statistica
        return daysSinceRegistration >= timeframe.days;
      });

      console.log(`Generando statistiche per ${validTimeframes.length} timeframe validi.`);
      
      // Per ogni timeframe valido, calcola e salva i dati aggregati
      for (const timeframe of validTimeframes) {
        // Calcola il periodo di tempo
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - timeframe.days);
        
        console.log(`Timeframe: ${timeframe.code}, startDate: ${startDate.toISOString()}`);

        // 1. Conteggio lead
        const leadCount = clients.filter(client => 
          !client.isOnboarded && 
          !client.isArchived &&
          client.createdAt && // Verifica che createdAt esista
          new Date(client.createdAt) < startDate // Verifica che sia stato creato prima dell'inizio del periodo
        ).length;
        
        await storage.saveTrendData(
          advisorId, 
          `lead_count_${timeframe.code}`, 
          currentDate, 
          leadCount, 
          leadCount.toString(),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'lead_count',
            count: leadCount
          }
        );
        
        // 2. Conteggio prospect
        const prospectCount = clients.filter(client => 
          client.isOnboarded && 
          !client.active && 
          !client.isArchived
        ).length;
        
        await storage.saveTrendData(
          advisorId, 
          `prospect_count_${timeframe.code}`, 
          currentDate, 
          prospectCount, 
          prospectCount.toString(),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'prospect_count',
            count: prospectCount
          }
        );
        
        // 3. Conteggio clienti attivi
        // Filtriamo i clienti che erano già attivi all'INIZIO del periodo (activatedAt < startDate)
        const activeClientsInPeriod = clients.filter(client => {
          // Il cliente deve essere attivo e non archiviato
          const isActive = client.active === true && !client.isArchived;
          
          // Deve avere una data di attivazione
          if (!isActive || !client.activatedAt) return false;
          
          // La data di attivazione deve essere PRECEDENTE alla data di inizio periodo
          const activatedAt = new Date(client.activatedAt);
          return activatedAt < startDate;
        });
        
        const clientCountActive = activeClientsInPeriod.length;
        
        console.log(`Timeframe ${timeframe.code}: trovati ${clientCountActive} clienti attivi (attivati prima di ${startDate.toISOString()})`);
        
        await storage.saveTrendData(
          advisorId, 
          `active_client_count_${timeframe.code}`, 
          currentDate, 
          clientCountActive, 
          clientCountActive.toString(),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'active_client_count',
            count: clientCountActive
          }
        );
        
        // 4. Tassi di conversione
        const recentProspects = clients.filter(client => 
          client.isOnboarded && 
          client.onboardedAt && 
          new Date(client.onboardedAt) >= startDate
        ).length;
        
        const totalLeads = clients.filter(client => 
          !client.isArchived
        ).length;
        
        const leadToProspectRate = totalLeads > 0 ? (recentProspects / totalLeads) * 100 : 0;
        
        await storage.saveTrendData(
          advisorId, 
          `conversion_rate_lead_to_prospect_${timeframe.code}`, 
          currentDate, 
          Math.round(leadToProspectRate), 
          leadToProspectRate.toFixed(2),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'conversion_rate_lead_to_prospect',
            periodDays: timeframe.days,
            newProspects: recentProspects,
            totalLeads: totalLeads
          }
        );
        
        const recentActive = clients.filter(client => 
          client.active && 
          client.activatedAt && 
          new Date(client.activatedAt) >= startDate
        ).length;
        
        const totalProspects = clients.filter(client => 
          client.isOnboarded && 
          !client.isArchived
        ).length;
        
        const prospectToActiveRate = totalProspects > 0 ? (recentActive / totalProspects) * 100 : 0;
        
        await storage.saveTrendData(
          advisorId, 
          `conversion_rate_prospect_to_client_${timeframe.code}`, 
          currentDate, 
          Math.round(prospectToActiveRate), 
          prospectToActiveRate.toFixed(2),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'conversion_rate_prospect_to_client',
            periodDays: timeframe.days,
            newActive: recentActive,
            totalProspects: totalProspects
          }
        );
        
        // 5. Tempi medi
        const onboardedClients = clients.filter(client => 
          client.isOnboarded && 
          client.onboardedAt && 
          client.createdAt
        );
        
        let totalDaysAsLead = 0;
        for (const client of onboardedClients) {
          const createdAt = new Date(client.createdAt!);
          const onboardedAt = new Date(client.onboardedAt!);
          const daysAsLead = Math.floor((onboardedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          totalDaysAsLead += daysAsLead;
        }
        
        const avgDaysAsLead = onboardedClients.length > 0 ? totalDaysAsLead / onboardedClients.length : 0;
        
        await storage.saveTrendData(
          advisorId, 
          `average_time_as_lead_${timeframe.code}`, 
          currentDate, 
          Math.round(avgDaysAsLead), 
          avgDaysAsLead.toFixed(1),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'average_time_as_lead',
            totalDays: totalDaysAsLead,
            clientCount: onboardedClients.length
          }
        );
        
        const activeClients = clients.filter(client => 
          client.active && 
          client.activatedAt && 
          client.onboardedAt
        );
        
        let totalDaysAsProspect = 0;
        for (const client of activeClients) {
          const onboardedAt = new Date(client.onboardedAt!);
          const activatedAt = new Date(client.activatedAt!);
          const daysAsProspect = Math.floor((activatedAt.getTime() - onboardedAt.getTime()) / (1000 * 60 * 60 * 24));
          totalDaysAsProspect += daysAsProspect;
        }
        
        const avgDaysAsProspect = activeClients.length > 0 ? totalDaysAsProspect / activeClients.length : 0;
        
        await storage.saveTrendData(
          advisorId, 
          `average_time_as_prospect_${timeframe.code}`, 
          currentDate, 
          Math.round(avgDaysAsProspect), 
          avgDaysAsProspect.toFixed(1),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'average_time_as_prospect',
            totalDays: totalDaysAsProspect,
            clientCount: activeClients.length
          }
        );
        
        // 6. Comunicazioni
        const activeClientsCount = clients.filter(client => client.active && !client.isArchived).length;
        if (activeClientsCount > 0) {
          // Filtra i log per periodo
          const periodLogs = logs.filter(log => 
            new Date(log.logDate) >= startDate && 
            new Date(log.logDate) <= currentDate
          );
          
          // Email
          const emailCount = periodLogs.filter(log => log.type === 'email').length;
          const weeksInPeriod = Math.max(1, Math.ceil((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
          const emailPerClient = (emailCount / activeClientsCount) / weeksInPeriod;
          await storage.saveTrendData(
            advisorId, 
            `email_per_client_${timeframe.code}`, 
            currentDate, 
            Math.round(emailPerClient * 100), 
            emailPerClient.toFixed(2),
            { 
              type: 'timeframe',
              timeframe: timeframe.code,
              timeframeLabel: timeframe.label,
              startDate,
              endDate: currentDate,
              originalType: 'email_per_client',
              periodDays: timeframe.days,
              totalCount: emailCount,
              activeClients: activeClientsCount,
              weeksInPeriod
            }
          );
          
          // Chiamate
          const callCount = periodLogs.filter(log => log.type === 'call').length;
          const callPerClient = (callCount / activeClientsCount) / weeksInPeriod;
          await storage.saveTrendData(
            advisorId, 
            `call_per_client_${timeframe.code}`, 
            currentDate, 
            Math.round(callPerClient * 100), 
            callPerClient.toFixed(2),
            { 
              type: 'timeframe',
              timeframe: timeframe.code,
              timeframeLabel: timeframe.label,
              startDate,
              endDate: currentDate,
              originalType: 'call_per_client',
              periodDays: timeframe.days,
              totalCount: callCount,
              activeClients: activeClientsCount,
              weeksInPeriod
            }
          );
          
          // Incontri
          const meetingCount = periodLogs.filter(log => log.type === 'meeting').length;
          const meetingPerClient = (meetingCount / activeClientsCount) / weeksInPeriod;
          await storage.saveTrendData(
            advisorId, 
            `meeting_per_client_${timeframe.code}`, 
            currentDate, 
            Math.round(meetingPerClient * 100), 
            meetingPerClient.toFixed(2),
            { 
              type: 'timeframe',
              timeframe: timeframe.code,
              timeframeLabel: timeframe.label,
              startDate,
              endDate: currentDate,
              originalType: 'meeting_per_client',
              periodDays: timeframe.days,
              totalCount: meetingCount,
              activeClients: activeClientsCount,
              weeksInPeriod
            }
          );
        }
        
        // 7. Nuovi lead/prospect al giorno
        
        // Filtra i clienti creati nel periodo specificato
        const periodsClients = clients.filter(client => 
          client.createdAt && 
          new Date(client.createdAt) >= startDate && 
          new Date(client.createdAt) <= currentDate
        );
        
        // Nuovi lead al giorno
        const newLeadsCount = periodsClients.length;
        const days = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const avgLeadsPerDay = days > 0 ? newLeadsCount / days : 0;
        
        await storage.saveTrendData(
          advisorId, 
          `new_leads_per_day_${timeframe.code}`, 
          currentDate, 
          Math.round(avgLeadsPerDay),
          avgLeadsPerDay.toFixed(2),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'new_leads_per_day',
            totalCount: newLeadsCount,
            days: days
          }
        );
        
        // Nuovi prospect al giorno
        const newProspectsCount = periodsClients.filter(client => 
          client.isOnboarded && 
          client.onboardedAt && 
          new Date(client.onboardedAt) >= startDate && 
          new Date(client.onboardedAt) <= currentDate
        ).length;
        
        const avgProspectsPerDay = days > 0 ? newProspectsCount / days : 0;
        
        await storage.saveTrendData(
          advisorId, 
          `new_prospects_per_day_${timeframe.code}`, 
          currentDate, 
          Math.round(avgProspectsPerDay),
          avgProspectsPerDay.toFixed(2),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'new_prospects_per_day',
            totalCount: newProspectsCount,
            days: days
          }
        );

        // Calcola gli asset medi per i nuovi prospect e clienti attivi
        const newProspectsInPeriod = clients.filter(client => 
          client.isOnboarded && !client.isArchived && !client.active && 
          client.onboardedAt && new Date(client.onboardedAt) >= startDate
        );
        
        const newActiveClientsInPeriod = clients.filter(client => 
          client.isOnboarded && !client.isArchived && client.active && 
          client.onboardedAt && new Date(client.onboardedAt) >= startDate
        );

        // Calcola la media degli asset per i nuovi prospect
        const assetsPerNewProspect = newProspectsInPeriod.length > 0 ? 
          newProspectsInPeriod.reduce((sum, client) => sum + (client.totalAssets || 0), 0) / newProspectsInPeriod.length : 0;
        
        // Calcola la media degli asset per i nuovi clienti attivi
        const assetsPerNewActiveClient = newActiveClientsInPeriod.length > 0 ? 
          newActiveClientsInPeriod.reduce((sum, client) => sum + (client.totalAssets || 0), 0) / newActiveClientsInPeriod.length : 0;

        // Aggiungi i nuovi trend ai risultati
        await storage.saveTrendData(
          advisorId, 
          `assets_per_new_prospect_${timeframe.code}`, 
          currentDate, 
          Math.round(assetsPerNewProspect),
          assetsPerNewProspect.toFixed(2),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'assets_per_new_prospect',
            totalCount: newProspectsInPeriod.length,
            totalAssets: newProspectsInPeriod.reduce((sum, client) => sum + (client.totalAssets || 0), 0)
          }
        );

        await storage.saveTrendData(
          advisorId, 
          `assets_per_new_active_client_${timeframe.code}`, 
          currentDate, 
          Math.round(assetsPerNewActiveClient),
          assetsPerNewActiveClient.toFixed(2),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'assets_per_new_active_client',
            totalCount: newActiveClientsInPeriod.length,
            totalAssets: newActiveClientsInPeriod.reduce((sum, client) => sum + (client.totalAssets || 0), 0)
          }
        );

        // Calcola gli asset medi per tutti i clienti attivi nel periodo specificato
        const assetsPerActiveClient = await this.calculateAssetsPerActiveClient(clients, startDate, currentDate);

        // Filtra i clienti attivi per il periodo attuale - Usa la stessa lista di clienti attivi calcolata sopra
        // Modifica qui: usiamo activeClientsInPeriod invece di ricalcolare

        // Salvataggio dei dati nel database
        await storage.saveTrendData(
          advisorId, 
          `assets_per_active_client_${timeframe.code}`, 
          currentDate, 
          Math.round(assetsPerActiveClient),
          assetsPerActiveClient.toFixed(2),
          { 
            type: 'timeframe',
            timeframe: timeframe.code,
            timeframeLabel: timeframe.label,
            startDate,
            endDate: currentDate,
            originalType: 'assets_per_active_client',
            totalCount: activeClientsInPeriod.length,
            totalAssets: activeClientsInPeriod.reduce((sum, client) => sum + (client.totalAssets || 0), 0)
          }
        );
      }
    } catch (error) {
      console.error(`Error generating timeframe trends for advisor ${advisorId}:`, error);
    }
  }
  
  /**
   * Genera trend per tutti i consulenti
   */
  async generateTrendsForAllAdvisors(): Promise<void> {
    try {
      // Ottieni tutti i consulenti
      const advisors = await db.select().from(schema.users);
      console.log(`Found ${advisors.length} advisors to generate trends for`);
      
      // Genera trend per ogni consulente
      for (const advisor of advisors) {
        await this.generateAndSaveTrendsForAdvisor(advisor.id);
      }
      
      console.log(`Generated trends for ${advisors.length} advisors`);
    } catch (error) {
      console.error('Error generating trends for all advisors:', error);
    }
  }
  
  /**
   * Salva i trend del numero di lead
   */
  private async saveLeadCountTrend(advisorId: number, clients: schema.Client[], date: Date): Promise<void> {
    try {
      const leadCount = clients.filter(client => 
        !client.isOnboarded && 
        !client.isArchived
      ).length;
      
      await storage.saveTrendData(
        advisorId, 
        'lead_count', 
        date, 
        leadCount, 
        leadCount.toString(),
        { type: 'snapshot', count: leadCount }
      );
    } catch (error) {
      console.error(`Error saving lead count trend for advisor ${advisorId}:`, error);
    }
  }
  
  /**
   * Salva i trend del numero di prospect
   */
  private async saveProspectCountTrend(advisorId: number, clients: schema.Client[], date: Date): Promise<void> {
    try {
      const prospectCount = clients.filter(client => 
        client.isOnboarded && 
        !client.active && 
        !client.isArchived
      ).length;
      
      await storage.saveTrendData(
        advisorId, 
        'prospect_count', 
        date, 
        prospectCount, 
        prospectCount.toString(),
        { type: 'snapshot', count: prospectCount }
      );
    } catch (error) {
      console.error(`Error saving prospect count trend for advisor ${advisorId}:`, error);
    }
  }
  
  /**
   * Salva i trend del numero di clienti attivi
   */
  private async saveActiveClientCountTrend(advisorId: number, clients: schema.Client[], date: Date): Promise<void> {
    try {
      const activeClientCount = clients.filter(client => 
        client.active && 
        !client.isArchived
      ).length;
      
      await storage.saveTrendData(
        advisorId, 
        'active_client_count', 
        date, 
        activeClientCount, 
        activeClientCount.toString(),
        { type: 'snapshot', count: activeClientCount }
      );
    } catch (error) {
      console.error(`Error saving active client count trend for advisor ${advisorId}:`, error);
    }
  }
  
  /**
   * Salva i trend dei tassi di conversione
   */
  private async saveConversionRateTrends(advisorId: number, clients: schema.Client[], date: Date): Promise<void> {
    try {
      // Calcola quanti lead sono diventati prospect negli ultimi 30 giorni
      const oneMonthAgo = new Date(date);
      oneMonthAgo.setMonth(date.getMonth() - 1);
      
      const recentProspects = clients.filter(client => 
        client.isOnboarded && 
        client.onboardedAt && 
        new Date(client.onboardedAt) >= oneMonthAgo
      ).length;
      
      const totalLeads = clients.filter(client => 
        !client.isArchived
      ).length;
      
      // Lead a Prospect
      const leadToProspectRate = totalLeads > 0 ? (recentProspects / totalLeads) * 100 : 0;
      
      // Prospect ad Attivo
      const recentActive = clients.filter(client => 
        client.active && 
        client.activatedAt && 
        new Date(client.activatedAt) >= oneMonthAgo
      ).length;
      
      const totalProspects = clients.filter(client => 
        client.isOnboarded && 
        !client.isArchived
      ).length;
      
      const prospectToActiveRate = totalProspects > 0 ? (recentActive / totalProspects) * 100 : 0;
      
      // Salva i tassi di conversione
      await storage.saveTrendData(
        advisorId, 
        'conversion_rate_lead_to_prospect', 
        date, 
        Math.round(leadToProspectRate), 
        leadToProspectRate.toFixed(2),
        { 
          type: 'conversion', 
          period: '30d',
          newProspects: recentProspects,
          totalLeads: totalLeads
        }
      );
      
      await storage.saveTrendData(
        advisorId, 
        'conversion_rate_prospect_to_client', 
        date, 
        Math.round(prospectToActiveRate), 
        prospectToActiveRate.toFixed(2),
        { 
          type: 'conversion', 
          period: '30d',
          newActive: recentActive,
          totalProspects: totalProspects
        }
      );
    } catch (error) {
      console.error(`Error saving conversion rate trends for advisor ${advisorId}:`, error);
    }
  }
  
  /**
   * Salva i trend dei tempi medi come lead e prospect
   */
  private async saveAverageTimeTrends(advisorId: number, clients: schema.Client[], date: Date): Promise<void> {
    try {
      // Tempo medio come lead
      const onboardedClients = clients.filter(client => 
        client.isOnboarded && 
        client.onboardedAt && 
        client.createdAt
      );
      
      let totalDaysAsLead = 0;
      for (const client of onboardedClients) {
        const createdAt = new Date(client.createdAt!);
        const onboardedAt = new Date(client.onboardedAt!);
        const daysAsLead = Math.floor((onboardedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        totalDaysAsLead += daysAsLead;
      }
      
      const avgDaysAsLead = onboardedClients.length > 0 ? totalDaysAsLead / onboardedClients.length : 0;
      
      // Tempo medio come prospect
      const activeClients = clients.filter(client => 
        client.active && 
        client.activatedAt && 
        client.onboardedAt
      );
      
      let totalDaysAsProspect = 0;
      for (const client of activeClients) {
        const onboardedAt = new Date(client.onboardedAt!);
        const activatedAt = new Date(client.activatedAt!);
        const daysAsProspect = Math.floor((activatedAt.getTime() - onboardedAt.getTime()) / (1000 * 60 * 60 * 24));
        totalDaysAsProspect += daysAsProspect;
      }
      
      const avgDaysAsProspect = activeClients.length > 0 ? totalDaysAsProspect / activeClients.length : 0;
      
      // Salva i tempi medi
      await storage.saveTrendData(
        advisorId, 
        'average_time_as_lead', 
        date, 
        Math.round(avgDaysAsLead), 
        avgDaysAsLead.toFixed(1),
        { 
          type: 'average_time', 
          totalDays: totalDaysAsLead,
          clientCount: onboardedClients.length
        }
      );
      
      await storage.saveTrendData(
        advisorId, 
        'average_time_as_prospect', 
        date, 
        Math.round(avgDaysAsProspect), 
        avgDaysAsProspect.toFixed(1),
        { 
          type: 'average_time', 
          totalDays: totalDaysAsProspect,
          clientCount: activeClients.length
        }
      );
    } catch (error) {
      console.error(`Error saving average time trends for advisor ${advisorId}:`, error);
    }
  }
  
  /**
   * Salva i trend di comunicazione
   */
  private async saveCommunicationTrends(advisorId: number, clients: schema.Client[], logs: schema.ClientLog[], date: Date): Promise<void> {
    try {
      const activeClients = clients.filter(client => client.active && !client.isArchived).length;
      if (activeClients === 0) return; // Evita divisione per zero
      
      // Calcola il numero di email, chiamate e meeting negli ultimi 30 giorni
      const oneMonthAgo = new Date(date);
      oneMonthAgo.setMonth(date.getMonth() - 1);
      
      const recentLogs = logs.filter(log => 
        new Date(log.logDate) >= oneMonthAgo
      );
      
      const emailCount = recentLogs.filter(log => log.type === 'email').length;
      const callCount = recentLogs.filter(log => log.type === 'call').length;
      const meetingCount = recentLogs.filter(log => log.type === 'meeting').length;
      
      // Calcola la media per cliente attivo
      const emailPerClient = emailCount / activeClients;
      const callPerClient = callCount / activeClients;
      const meetingPerClient = meetingCount / activeClients;
      
      // Salva i trend di comunicazione
      await storage.saveTrendData(
        advisorId, 
        'email_per_client', 
        date, 
        Math.round(emailPerClient * 100), // Moltiplichiamo per 100 per preservare 2 decimali
        emailPerClient.toFixed(2),
        { 
          type: 'communication', 
          period: '30d',
          totalCount: emailCount,
          activeClients
        }
      );
      
      await storage.saveTrendData(
        advisorId, 
        'call_per_client', 
        date, 
        Math.round(callPerClient * 100),
        callPerClient.toFixed(2),
        { 
          type: 'communication', 
          period: '30d',
          totalCount: callCount,
          activeClients
        }
      );
      
      await storage.saveTrendData(
        advisorId, 
        'meeting_per_client', 
        date, 
        Math.round(meetingPerClient * 100),
        meetingPerClient.toFixed(2),
        { 
          type: 'communication', 
          period: '30d',
          totalCount: meetingCount,
          activeClients
        }
      );
    } catch (error) {
      console.error(`Error saving communication trends for advisor ${advisorId}:`, error);
    }
  }
  
  /**
   * Restituisce la data di un anno fa
   */
  private getOneYearAgo(date: Date): Date {
    const oneYearAgo = new Date(date);
    oneYearAgo.setFullYear(date.getFullYear() - 1);
    return oneYearAgo;
  }

  /**
   * Ottiene i dati di trend aggregati per diversi timeframe
   * @param advisorId - ID del consulente
   * @param types - Array di tipi di trend da recuperare
   * @param timeframe - Timeframe di aggregazione (daily, weekly, monthly, quarterly, semiannual, yearly)
   * @param limit - Numero massimo di punti dati da recuperare
   * @returns Dati di trend aggregati per il timeframe specificato
   */
  async getTrendsByTimeframe(
    advisorId: number,
    types: string[] | string | null = null,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly' = 'monthly',
    limit: number = 12
  ): Promise<any> {
    try {
      // Ottieni la data di iscrizione dell'utente
      const advisor = await db.select().from(schema.users).where(eq(schema.users.id, advisorId)).limit(1);
      
      if (!advisor || advisor.length === 0) {
        throw new Error(`Advisor with ID ${advisorId} not found`);
      }
      
      const userCreatedAt = advisor[0].createdAt;
      
      // Recupera i dati di trend aggregati per timeframe
      const trendData = await storage.getTrendDataByTimeframe(
        advisorId,
        types,
        timeframe,
        limit,
        userCreatedAt
      );
      
      // Organizziamo i dati in un formato più facile da utilizzare
      const result: Record<string, any> = {};
      
      // Inizializza i risultati con una struttura vuota
      if (trendData.length > 0) {
        // Estrai tutti i tipi di trend presenti nei dati
        const uniqueTypes = Array.from(new Set(trendData.map(item => item.type)));
        
        // Estrai tutti i timeframe presenti nei dati (in ordine decrescente)
        const timeframeKeys = Array.from(new Set(trendData.map(item => item.timeframe_key))).sort().reverse();
        
        // Inizializza la struttura del risultato
        uniqueTypes.forEach(type => {
          result[type] = {
            timeframes: timeframeKeys,
            values: [],
            valuesFloat: [],
            metadata: []
          };
          
          // Riempi con valori null per tutti i timeframe
          timeframeKeys.forEach(() => {
            result[type].values.push(null);
            result[type].valuesFloat.push(null);
            result[type].metadata.push(null);
          });
        });
        
        // Popola la struttura con i dati effettivi
        trendData.forEach(item => {
          const typeData = result[item.type];
          if (typeData) {
            const index = typeData.timeframes.indexOf(item.timeframe_key);
            if (index !== -1) {
              typeData.values[index] = item.avg_value;
              typeData.valuesFloat[index] = item.avg_value_float;
              typeData.metadata[index] = {
                dataPoints: item.data_points,
                latestDate: item.latest_date
              };
            }
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error getting trends by timeframe for advisor ${advisorId}:`, error);
      return {};
    }
  }
  
  /**
   * Ottiene un riepilogo completo di tutti i tipi di trend per diversi timeframe
   * @param advisorId - ID del consulente
   * @returns Oggetto con tutti i tipi di trend per diversi timeframe
   */
  async getAllTrendsSummary(advisorId: number): Promise<any> {
    try {
      const trendTypes = [
        'lead_count',
        'prospect_count',
        'active_client_count',
        'conversion_rate_lead_to_prospect',
        'conversion_rate_prospect_to_client'
      ];
      
      // Ottieni i dati per diversi timeframe
      const [dailyData, weeklyData, monthlyData, quarterlyData, semiannualData, yearlyData] = await Promise.all([
        this.getTrendsByTimeframe(advisorId, trendTypes, 'daily', 30),
        this.getTrendsByTimeframe(advisorId, trendTypes, 'weekly', 12),
        this.getTrendsByTimeframe(advisorId, trendTypes, 'monthly', 12),
        this.getTrendsByTimeframe(advisorId, trendTypes, 'quarterly', 8),
        this.getTrendsByTimeframe(advisorId, trendTypes, 'semiannual', 4),
        this.getTrendsByTimeframe(advisorId, trendTypes, 'yearly', 5)
      ]);
      
      return {
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData,
        quarterly: quarterlyData,
        semiannual: semiannualData,
        yearly: yearlyData
      };
    } catch (error) {
      console.error(`Error getting trends summary for advisor ${advisorId}:`, error);
      return {};
    }
  }

  /**
   * Ottiene i dati di trend per un consulente
   * @param advisorId - ID del consulente
   * @returns I dati di trend del consulente formattati per il frontend
   */
  async getTrendDataForAdvisor(advisorId: number): Promise<any[]> {
    try {
      console.log(`[TrendService] Recupero dati trend per advisor ${advisorId}`);
      
      // Importa direttamente dalla radice per evitare problemi di path
      const schema = await import('@shared/schema');
      
      // Ottieni tutti i dati di trend per questo consulente
      const trends = await db.select()
        .from(schema.trendData)
        .where(eq(schema.trendData.advisorId, advisorId))
        .orderBy(schema.trendData.type);
      
      console.log(`[TrendService] Trovati ${trends.length} record trend per advisor ${advisorId}`);
      
      // Se non ci sono dati, forzare la generazione di dati di base
      if (trends.length === 0) {
        console.log(`[TrendService] Nessun dato trend trovato, generazione automatica per advisor ${advisorId}`);
        await this.generateAndSaveTrendsForAdvisor(advisorId);
        
        // Ritenta il recupero dopo la generazione
        const newTrends = await db.select()
          .from(schema.trendData)
          .where(eq(schema.trendData.advisorId, advisorId))
          .orderBy(schema.trendData.type);
        
        console.log(`[TrendService] Generati ${newTrends.length} nuovi record trend per advisor ${advisorId}`);
        
        // Formatta i dati per il frontend
        return newTrends.map(data => {
          const metadata = data.metadata || {};
          return {
            type: data.type,
            value: data.value,
            valueFloat: data.valueFloat,
            metadata: {
              ...metadata,
              timeframe: metadata && typeof metadata === 'object' && 'timeframe' in metadata ? metadata.timeframe : '1y'
            }
          };
        });
      }
      
      // Formatta i dati per il frontend
      return trends.map(data => {
        const metadata = data.metadata || {};
        return {
          type: data.type,
          value: data.value,
          valueFloat: data.valueFloat,
          metadata: {
            ...metadata,
            timeframe: metadata && typeof metadata === 'object' && 'timeframe' in metadata ? metadata.timeframe : '1y'
          }
        };
      });
    } catch (error) {
      console.error(`[TrendService] Errore durante il recupero dei dati trend per advisor ${advisorId}:`, error);
      return [];
    }
  }

  // Calcola gli asset medi per tutti i clienti attivi nel periodo specificato
  private async calculateAssetsPerActiveClient(clients: schema.Client[], startDate?: Date, endDate?: Date): Promise<number> {
    // Filtriamo i clienti attivi
    // Se è specificato uno startDate, consideriamo solo i clienti attivati prima della data di inizio periodo
    const activeClients = clients.filter(client => {
      // Il cliente deve essere attivo e non archiviato
      const isActive = client.active === true && !client.isArchived;
      
      // Deve avere una data di attivazione
      if (!isActive || !client.activatedAt) return false;
      
      // La data di attivazione deve essere precedente alla data di inizio periodo
      const activatedAt = new Date(client.activatedAt);
      
      // Se abbiamo solo startDate, verifichiamo che il cliente fosse già attivo all'inizio del periodo
      if (startDate) {
        return activatedAt < startDate;
      }
      
      // Se non ci sono date, consideriamo tutti i clienti attivi
      return true;
    });
    
    // Se non ci sono clienti attivi, restituisci 0
    if (activeClients.length === 0) {
      console.log('Nessun cliente attivo trovato per calcolare gli asset medi.');
      return 0;
    }

    // Calcola la somma degli asset totali
    const totalAssets = activeClients.reduce((sum, client) => {
      const assets = client.totalAssets ? parseFloat(client.totalAssets.toString()) : 0;
      return sum + assets;
    }, 0);

    // Calcola la media degli asset
    const averageAssets = totalAssets / activeClients.length;
    
    console.log(`Asset medi per cliente attivo: ${averageAssets} (calcolati su ${activeClients.length} clienti attivi)`);
    
    return averageAssets;
  }
}

// Crea un'istanza del servizio
export const trendService = new TrendService(); 

// Esegui la generazione dei trend se il file viene eseguito direttamente
// Verifica se il file è eseguito direttamente in ambiente ESM
import { fileURLToPath } from 'url';

const isMainModule = () => {
  try {
    return process.argv[1] === fileURLToPath(import.meta.url);
  } catch (error) {
    return false;
  }
};

if (isMainModule()) {
  trendService.generateTrendsForAllAdvisors()
    .then(() => {
      console.log('Trend generation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Trend generation failed:', error);
      process.exit(1);
    });
} 