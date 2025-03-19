import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Italian translations
const resourcesIt = {
  translation: {
    admin: {
      admin_panel: "Pannello Amministratore",
      welcome_admin: "Benvenuto nel pannello di amministrazione di Gervis. Da qui puoi gestire gli utenti e le impostazioni di sistema.",
      users: "Utenti",
      system_settings: "Impostazioni Sistema",
      coming_soon: "Prossimamente",
      system_settings_coming_soon: "Le impostazioni di sistema saranno disponibili in un prossimo aggiornamento.",
      users_management: "Gestione Utenti",
      users_management_desc: "Approva o respingi nuovi utenti e gestisci gli account esistenti",
      pending_approvals: "Approvazioni in Attesa",
      approved_users: "Utenti Approvati",
      rejected_users: "Utenti Respinti",
      pending_approvals_caption: "Nuove registrazioni in attesa di approvazione",
      approved_users_caption: "Utenti con accesso attivo al sistema",
      rejected_users_caption: "Utenti la cui registrazione è stata respinta",
      name: "Nome",
      email: "Email",
      registered_on: "Registrato il",
      status: "Stato",
      actions: "Azioni",
      approve: "Approva",
      reject: "Rifiuta",
      delete: "Elimina",
      no_pending_users: "Non ci sono utenti in attesa di approvazione",
      no_approved_users: "Non ci sono utenti approvati",
      no_rejected_users: "Non ci sono utenti respinti",
      confirm_approve: "Conferma Approvazione",
      confirm_reject: "Conferma Rifiuto",
      confirm_delete: "Conferma Eliminazione",
      approve_user_title: "Approvare questo utente?",
      approve_user_content: "Approvando {{name}} gli permetterai di accedere alla piattaforma. Vuoi procedere?",
      reject_user_title: "Respingere questo utente?",
      reject_user_content: "Respingendo {{name}} impedisci l'accesso alla piattaforma. L'utente sarà notificato. Vuoi procedere?",
      delete_user_title: "Eliminare questo utente?",
      delete_user_content: "Eliminando {{name}} rimuoverai permanentemente il suo account dal sistema. Questa azione non può essere annullata. Vuoi procedere?",
      user_approved: "Utente Approvato",
      user_approved_desc: "L'utente è stato approvato con successo e può ora accedere alla piattaforma.",
      user_rejected: "Utente Respinto",
      user_rejected_desc: "L'utente è stato respinto e non potrà accedere alla piattaforma.",
      user_deleted: "Utente Eliminato",
      user_deleted_desc: "L'utente è stato eliminato permanentemente dal sistema.",
      status_pending: "In Attesa",
      status_approved: "Approvato",
      status_rejected: "Respinto",
    },
    nav: {
      features: "Funzionalità",
      benefits: "Vantaggi",
      about: "Chi Siamo",
      contact: "Contatti",
      launch: "Accedi"
    },
    hero: {
      title_1: "L'Assistente di Riferimento per",
      title_2: "Consulenti Finanziari",
      description: "Gervis fornisce ai consulenti finanziari strumenti basati sull'IA per offrire ai clienti un'esperienza di consulenza finanziaria indimenticabile. Automatizza la documentazione, ottimizza la gestione dei clienti e sfrutta il pieno potenziale dell'IA applicata con Gervis.",
      get_started: "Inizia Ora",
      learn_more: "Scopri di Più",
      title: "Piattaforma Gervis per Consulenti Finanziari",
      feature1: {
        title: "Analisi del Portafoglio",
        description: "Analizza i portafogli dei clienti con algoritmi sofisticati per identificare opportunità e rischi."
      },
      feature2: {
        title: "Insights basati su IA",
        description: "Sfrutta l'intelligenza artificiale per generare raccomandazioni finanziarie personalizzate."
      },
      feature3: {
        title: "Sicuro e Conforme",
        description: "Sviluppato con attenzione alla sicurezza e alla conformità normativa, incluse le normative finanziarie italiane."
      }
    },
    features: {
      title: "Cosa offriamo",
      subtitle: "Strumenti completi per migliorare il tuo servizio di consulenza e offrire valore aggiunto ai tuoi clienti.",
      learn_more: "Scopri di Più",
      onboarding: {
        title: "Onboarding Cliente Digitalizzato",
        description: "Semplifica e accelera il processo di onboarding dei clienti con moduli digitali e raccolta dati automatizzata."
      },
      client_management: {
        title: "Gestione Clienti Centralizzata",
        description: "Organizza e gestisci facilmente i profili dei clienti, i documenti e le comunicazioni in un'unica piattaforma."
      },
      wealth_assessment: {
        title: "Valutazione Patrimoniale",
        description: "Analisi dettagliata del patrimonio dei clienti con visualizzazioni intuitive e reportistica completa."
      },
      ai_allocation: {
        title: "Allocazione con IA",
        description: "Suggerimenti di allocazione degli asset basati su algoritmi avanzati di intelligenza artificiale."
      }
    },
    benefits: {
      title: "Perché Scegliere Gervis?",
      subtitle: "Vantaggi concreti per la tua attività di consulenza finanziaria",
      items: {
        save_time: {
          title: "Risparmia Tempo",
          description: "Riduci il tempo dedicato alle attività amministrative e concentrati sulla consulenza di valore per i tuoi clienti."
        },
        reduce_errors: {
          title: "Riduci gli Errori",
          description: "Minimizza gli errori manuali con processi digitalizzati e automatizzati per la documentazione dei clienti."
        },
        grow_aum: {
          title: "Aumenta gli Asset in Gestione",
          description: "Attrai e fidelizza più clienti grazie a un'esperienza professionale e tecnologicamente avanzata."
        },
        improve_satisfaction: {
          title: "Migliora la Soddisfazione",
          description: "Offri un servizio più reattivo e personalizzato per aumentare la soddisfazione e la fidelizzazione dei clienti."
        },
        compliance: {
          title: "Conformità Normativa",
          description: "Mantieni facilmente la conformità con le normative finanziarie italiane ed europee con documentazione sempre aggiornata."
        },
        insights: {
          title: "Insights Approfonditi",
          description: "Ottieni analisi dettagliate sui portafogli dei clienti per fornire consigli più informati e strategici."
        }
      }
    },
    auth: {
      login: "Accedi",
      register: "Registrati",
      username: "Nome Utente",
      password: "Password",
      confirm_password: "Conferma Password",
      confirm_password_placeholder: "Conferma la tua password",
      submit: "Invia",
      no_account: "Non hai un account?",
      have_account: "Hai già un account?",
      login_error: "Accesso fallito! Controlla le tue credenziali.",
      register_error: "Registrazione fallita! Riprova.",
      welcome: "Benvenuto su Gervis, la tua piattaforma di consulenza finanziaria",
      welcome_back: "Bentornato",
      register_title: "Crea Account",
      description: "La piattaforma intelligente che aiuta i consulenti finanziari a fornire una gestione patrimoniale personalizzata e una guida finanziaria intuitiva.",
      login_description: "Accedi per accedere alla tua dashboard consulente.",
      register_description: "Registrati per iniziare a gestire i tuoi clienti in modo efficiente.",
      creating_account: "Creazione account in corso...",
      back_to_home: "Torna alla Home",
      independent_advisor: "Sono un consulente finanziario indipendente (senza società)",
      company_validation_error: "Il nome della società è obbligatorio a meno che tu sia un consulente indipendente",
      validation: {
        first_name_required: "Il nome è obbligatorio",
        last_name_required: "Il cognome è obbligatorio",
        email_invalid: "Inserisci un indirizzo email valido",
        password_length: "La password deve contenere almeno 6 caratteri",
        passwords_dont_match: "Le password non coincidono"
      }
    },
    dashboard: {
      clients: "Clienti",
      add_client: "Aggiungi Cliente",
      name: "Nome",
      email: "Email",
      status: "Stato",
      actions: "Azioni",
      onboarded: "Registrato",
      not_onboarded: "Non Registrato",
      view: "Visualizza",
      edit: "Modifica",
      delete: "Elimina",
      archived: "Archiviato",
      active: "Attivo",
      onboarding_link: "Link Registrazione",
      send_link: "Invia Link",
      confirm_delete: "Sei sicuro di voler eliminare questo cliente?",
      cancel: "Annulla",
      logout: "Esci",
      return_to_home: "Torna alla Home",
      dashboard: "Dashboard",
      settings: "Impostazioni",
      manage_portfolio: "Gestisci il tuo portafoglio clienti",
      upgrade_to_pro: "Passa a PRO",
      client_overview: "Panoramica Cliente",
      view_manage_clients: "Visualizza e gestisci tutti i tuoi clienti",
      search_clients: "Cerca clienti...",
      showing_archived: "Visualizzazione Archiviati",
      show_archived: "Mostra Archiviati",
      filter: "Filtra",
      loading_clients: "Caricamento clienti...",
      error_loading: "Errore nel caricamento dei clienti. Riprova.",
      no_clients_found: "Nessun cliente trovato",
      add_first_client: "Aggiungi il Tuo Primo Cliente",
      phone: "Telefono",
      created: "Creato",
      view_details: "Visualizza Dettagli",
      restore_client: "Ripristina Cliente",
      archive: "Archivia",
      delete_permanently: "Elimina Permanentemente"
    },
    onboarding: {
      title: "Questionario Profilo Finanziario",
      welcome: "Benvenuto",
      instructions: "Si prega di compilare le seguenti informazioni per aiutarci a comprendere il tuo profilo finanziario e i tuoi obiettivi.",
      personal_info: "Informazioni Personali",
      first_name: "Nome",
      last_name: "Cognome",
      email: "Indirizzo Email",
      phone: "Numero di Telefono",
      dob: "Data di Nascita",
      financial_profile: "Profilo Finanziario",
      income: "Reddito Annuale (€)",
      expenses: "Spese Annuali (€)",
      savings: "Risparmi Mensili (€)",
      dependent_count: "Numero di Persone a Carico",
      risk_profile: "Profilo di Rischio",
      investment_goals: "Obiettivi di Investimento",
      investment_horizon: "Orizzonte Temporale",
      experience_level: "Esperienza di Investimento",
      assets: "Patrimonio",
      asset_category: "Categoria Asset",
      asset_name: "Nome Asset",
      asset_value: "Valore Asset (€)",
      add_asset: "Aggiungi Asset",
      remove: "Rimuovi",
      submit: "Invia Profilo",
      error: "Errore nell'invio del profilo",
      success: "Profilo inviato con successo!",
      success_message: "Grazie per aver completato il tuo profilo finanziario. Il tuo consulente finanziario esaminerà le tue informazioni e ti contatterà presto."
    },
    risk_profiles: {
      conservative: "Conservativo",
      moderate: "Moderato",
      balanced: "Bilanciato",
      growth: "Crescita",
      aggressive: "Aggressivo"
    },
    experience_levels: {
      none: "Nessuna Esperienza",
      beginner: "Principiante",
      intermediate: "Intermedio",
      advanced: "Avanzato",
      expert: "Esperto"
    },
    investment_goals: {
      retirement: "Pianificazione Pensionistica",
      wealth_growth: "Crescita del Patrimonio",
      income_generation: "Generazione di Reddito",
      capital_preservation: "Preservazione del Capitale",
      estate_planning: "Pianificazione Patrimoniale"
    },
    investment_horizons: {
      short_term: "Breve Termine (1-3 anni)",
      medium_term: "Medio Termine (3-7 anni)",
      long_term: "Lungo Termine (7+ anni)"
    },
    asset_categories: {
      real_estate: "Immobili",
      equity: "Azioni e Titoli",
      bonds: "Obbligazioni e Reddito Fisso",
      cash: "Liquidità",
      private_equity: "Private Equity",
      venture_capital: "Venture Capital",
      cryptocurrencies: "Criptovalute",
      other: "Altri Asset"
    },
    language: {
      en: "Inglese",
      it: "Italiano"
    },
    contact: {
      title: "Contattaci",
      subtitle: "Hai domande? Ci piacerebbe sentirti.",
      error: "C'è stato un errore nell'invio del tuo messaggio. Riprova.",
      form: {
        firstName: "Nome",
        lastName: "Cognome",
        email: "Email",
        company: "Società",
        message: "Messaggio",
        privacy: "Acconsento al trattamento dei miei dati per ricevere una risposta alla mia richiesta.",
        submit: "Invia Messaggio",
        submitting: "Invio in corso...",
        success: "Messaggio Inviato con Successo!",
        success_message: "Grazie per averci contattato. Ti risponderemo al più presto.",
        placeholders: {
          firstName: "Inserisci il tuo nome",
          lastName: "Inserisci il tuo cognome",
          email: "Inserisci la tua email",
          company: "Inserisci il nome della tua società",
          message: "Come possiamo aiutarti?"
        }
      },
      validation: {
        firstName: "Il nome è obbligatorio",
        lastName: "Il cognome è obbligatorio",
        email: "Inserisci un indirizzo email valido",
        message: "Inserisci il tuo messaggio",
        privacy: "Devi accettare i termini sulla privacy"
      }
    },
    client: {
      loading_details: "Caricamento dettagli cliente...",
      error_loading: "Errore nel caricamento dei dettagli cliente.",
      back_to_dashboard: "Torna alla Dashboard",
      back: "Indietro",
      edit_client: "Modifica Cliente",
      onboarding_required: "Onboarding Cliente Richiesto",
      onboarding_required_desc: "Questo cliente deve completare il processo di onboarding per accedere a tutte le funzionalità.",
      link_copied: "Link copiato",
      link_copied_desc: "Link di onboarding copiato negli appunti.",
      copy_link: "Copia Link",
      generate_new_link: "Genera Nuovo Link",
      share_link_desc: "Condividi questo link con il tuo cliente per completare il processo di onboarding.",
      sending: "Invio in corso...",
      generate_email: "Genera Email di Onboarding",
      personal_information: "Informazioni Personali",
      name: "Nome",
      email: "Email",
      phone: "Telefono",
      address: "Indirizzo",
      tax_code: "Codice Fiscale",
      employment: "Occupazione",
      dependents: "Persone a Carico",
      created: "Creato",
      annual_income: "Reddito Annuale",
      monthly_expenses: "Spese Mensili",
      net_worth: "Patrimonio Netto",
      investment_profile: "Profilo di Investimento",
      risk_profile: "Profilo di Rischio",
      investment_experience: "Esperienza di Investimento",
      investment_horizon: "Orizzonte di Investimento",
      investment_goals: "Obiettivi di Investimento",
      not_assessed: "Non Valutato",
      not_specified: "Non Specificato",
      asset_allocation: "Allocazione degli Asset",
      portfolio_snapshot: "Panoramica del portafoglio attuale del cliente",
      portfolio_overview: "Panoramica del Portafoglio",
      recommendations: "Raccomandazioni",
      loading_assets: "Caricamento asset...",
      no_assets: "Nessun asset trovato per questo cliente.",
      asset_details: "Dettagli Asset",
      total: "Totale",
      asset_split: "Suddivisione Asset",
      recommendations_advice: "Le raccomandazioni e i consigli finanziari appariranno qui.",
      add_recommendation: "Aggiungi Raccomandazione",
      upgrade_pro: "Passa a PRO",
      upgrade_pro_desc: "Sblocca funzionalità premium tra cui raccomandazioni finanziarie avanzate",
      pro_account_access: "Con un account PRO, avrai accesso a",
      pro_feature_1: "Analisi e ottimizzazione avanzata del portafoglio",
      pro_feature_2: "Raccomandazioni di investimento personalizzate",
      pro_feature_3: "Strategie di valutazione e mitigazione del rischio",
      pro_feature_4: "Suggerimenti per l'ottimizzazione fiscale",
      pro_feature_5: "Strumenti di pianificazione finanziaria basati su IA",
      upgrade_button: "Passa a PRO",
      customize_email: "Personalizza Email di Onboarding",
      customize_email_desc: "Personalizza l'email che verrà inviata a {{clientName}}.",
      email_language: "Lingua Email",
      email_content: "Contenuto Email",
      email_placeholder: "Inserisci qui il tuo messaggio personalizzato...",
      email_personalization_tip: "Personalizza il messaggio includendo dettagli specifici. Il link di onboarding verrà automaticamente incluso nell'email.",
      send_email: "Invia Email"
    },
    client_edit: {
      title: "Modifica Informazioni Cliente",
      subtitle: "Aggiorna profilo completo del cliente",
      personal_info: "Informazioni Personali",
      personal_info_desc: "Dettagli di contatto e identificazione di base",
      investment_profile: "Profilo di Investimento",
      investment_profile_desc: "Informazioni sulle preferenze e l'esperienza di investimento",
      assets: "Asset",
      assets_desc: "Informazioni sugli asset attuali",
      first_name: "Nome",
      last_name: "Cognome",
      email_address: "Indirizzo Email",
      phone_number: "Numero di Telefono",
      address: "Indirizzo",
      tax_code: "Codice Fiscale / Numero di Identificazione",
      employment_status: "Stato Occupazionale",
      dependents: "Numero di Persone a Carico",
      annual_income: "Reddito Annuale (€)",
      monthly_expenses: "Spese Mensili (€)",
      net_worth: "Patrimonio Netto (€)",
      risk_profile: "Profilo di Rischio",
      investment_experience: "Esperienza di Investimento",
      investment_horizon: "Orizzonte di Investimento",
      investment_time_horizon: "Orizzonte Temporale di Investimento",
      investment_goals: "Obiettivi di Investimento (Seleziona tutti quelli applicabili)",
      select_risk_profile: "Seleziona profilo di rischio",
      select_experience_level: "Seleziona livello di esperienza",
      select_investment_horizon: "Seleziona orizzonte di investimento",
      select_asset_type: "Seleziona tipo di asset",
      asset: "Asset",
      asset_number: "Asset",
      asset_type: "Tipo di Asset",
      asset_value: "Valore (€)",
      asset_description: "Descrizione",
      category: "Categoria",
      value: "Valore (€)",
      description: "Descrizione (opzionale)",
      remove_asset: "Rimuovi asset",
      add_asset: "Aggiungi Asset",
      save_changes: "Salva Modifiche",
      cancel: "Annulla",
      client_updated: "Cliente Aggiornato",
      update_success: "Le informazioni del cliente e gli asset sono stati aggiornati con successo.",
      error: "Errore",
      update_failure: "Impossibile aggiornare le informazioni del cliente. Riprova."
    },
    common: {
      cancel: "Annulla",
      saving: "Salvataggio in corso...",
      save_changes: "Salva Modifiche",
      app_name: "Gervis",
      pro_version: "Gervis PRO",
      coming_soon: "PROSSIMAMENTE",
      error: {
        unauthorized: "Accesso non autorizzato",
        admin_access_required: "Questa pagina richiede privilegi di amministratore",
        loading_data: "Errore durante il caricamento dei dati. Riprova."
      }
    },
    about: {
      title: "Chi Siamo",
      description1: "Gervis è un prodotto sviluppato e gestito da GT AI Solutions. La missione di GT AI Solutions è integrare soluzioni di intelligenza artificiale in tutti i business per liberare tempo prezioso e permettere alle aziende di concentrarsi sul loro core business.",
      description2: "Crediamo fermamente che l'intelligenza artificiale sia la chiave per trasformare i processi aziendali, eliminando le attività ripetitive e a basso valore aggiunto, consentendo alle persone di dedicarsi a ciò che conta davvero: relazioni, creatività e innovazione.",
      description3: "Gervis rappresenta l'applicazione di questa filosofia nel settore della consulenza finanziaria, offrendo ai consulenti strumenti avanzati per automatizzare la gestione documentale, ottimizzare i processi di onboarding e fornire un'esperienza cliente superiore."
    },
    languages: {
      english: "Inglese",
      italian: "Italiano"
    },
    pdf: {
      title: "Modulo di Onboarding Cliente",
      subject: "Profilo Finanziario Cliente",
      clientSummaryReport: "Modulo di Onboarding Cliente",
      personalInformation: "Informazioni Personali",
      investmentProfile: "Profilo di Investimento",
      assetAllocation: "Allocazione Asset Attuale",
      coverLetter: {
        heading: "SERVIZI DI CONSULENZA FINANZIARIA",
        date: "Data",
        toClient: "A",
        fromAdvisor: "Da",
        subject: "Oggetto",
        title: "Benvenuto – Inizio della Nostra Collaborazione",
        greeting: "Gentile {{firstName}} {{lastName}},",
        introduction: "È un vero piacere darle il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirle un servizio di consulenza altamente personalizzato, progettato per aiutarla a gestire i suoi asset in modo strategico ed efficiente, con un approccio attento ai costi e in piena conformità con le normative vigenti.",
        collaboration: "Attraverso analisi approfondite e strumenti avanzati, lavoreremo insieme per:",
        servicePoint1: "Ottimizzare la composizione del suo portafoglio in base ai suoi obiettivi e al suo profilo di rischio.",
        servicePoint2: "Identificare soluzioni su misura per una gestione patrimoniale più efficace e sostenibile nel tempo.",
        servicePoint3: "Garantire una consulenza trasparente in linea con le migliori pratiche del settore.",
        servicePoint4: "Fornire aggiornamenti e adeguamenti regolari in base ai cambiamenti del mercato e all'evoluzione delle sue esigenze.",
        fields: {
          greeting: "Saluto",
          introduction: "Introduzione",
          collaboration: "Collaborazione",
          servicePoints: "Punti di Servizio",
          process: "Processo",
          contactInfo: "Informazioni di Contatto",
          closing: "Chiusura",
          fullContent: "Contenuto Lettera"
        },
        points: [
          "Ottimizzare la composizione del suo portafoglio in base ai suoi obiettivi e al suo profilo di rischio.",
          "Identificare soluzioni su misura per una gestione patrimoniale più efficace e sostenibile nel tempo.",
          "Garantire una consulenza trasparente in linea con le migliori pratiche del settore."
        ],
        process: "Come discusso, per completare il processo di onboarding, la invito a verificare e restituire i documenti allegati firmati. Questo passaggio è necessario per formalizzare la nostra collaborazione e procedere con le attività pianificate.",
        contactInfo: "Rimango a disposizione per qualsiasi chiarimento o necessità. Grazie per la sua fiducia, sono fiducioso che questo sarà l'inizio di un percorso prezioso.",
        closing: "Cordiali saluti,"
      },
      name: "Nome Completo",
      email: "Email",
      phone: "Telefono",
      address: "Indirizzo",
      employmentStatus: "Stato Occupazionale",
      taxCode: "Codice Fiscale",
      riskProfile: "Profilo di Rischio",
      investmentGoal: "Obiettivo di Investimento",
      investmentHorizon: "Orizzonte di Investimento",
      experienceLevel: "Livello di Esperienza",
      notProvided: "Non fornito",
      category: "Categoria",
      description: "Descrizione",
      value: "Valore",
      totalAssetsValue: "Valore Totale Asset",
      noAssetsFound: "Nessun asset trovato per questo cliente.",
      clientSignature: "Firma",
      signatureHere: "Firma",
      clientDeclaration: "Dichiarazione Cliente",
      clientDeclarationText: "Dichiaro che le informazioni fornite sono vere, complete e accurate. Questo documento rappresenta la mia attuale situazione finanziaria e le mie informazioni personali come riportate al mio consulente finanziario.",
      date: "Data",
      page: "Pagina",
      of: "di",
      selectLanguage: "Seleziona Lingua",
      generatePdf: "Genera Report PDF",
      generate: "Genera PDF",
      customizeLetterContent: "Personalizza Contenuto Lettera",
      sendByEmail: "Invia via Email",
      emailDialogDescription: "Invia questo report via email al cliente",
      emailSubject: "Oggetto",
      emailMessage: "Messaggio",
      emailBodyInfoMessage: "Il contenuto della lettera verrà utilizzato come corpo dell'email",
      emailDefaultSubject: "Benvenuto nel nostro servizio di consulenza",
      send: "Invia",
      preview: "Anteprima"
    }
  }
};

// English translations
const resourcesEn = {
  translation: {
    admin: {
      admin_panel: "Admin Panel",
      welcome_admin: "Welcome to the Gervis administration panel. From here you can manage users and system settings.",
      users: "Users",
      system_settings: "System Settings",
      coming_soon: "Coming Soon",
      system_settings_coming_soon: "System settings will be available in a future update.",
      users_management: "User Management",
      users_management_desc: "Approve or reject new users and manage existing accounts",
      pending_approvals: "Pending Approvals",
      approved_users: "Approved Users",
      rejected_users: "Rejected Users",
      pending_approvals_caption: "New registrations awaiting approval",
      approved_users_caption: "Users with active system access",
      rejected_users_caption: "Users whose registration was rejected",
      name: "Name",
      email: "Email",
      registered_on: "Registered on",
      status: "Status",
      actions: "Actions",
      approve: "Approve",
      reject: "Reject",
      delete: "Delete",
      no_pending_users: "There are no users waiting for approval",
      no_approved_users: "There are no approved users",
      no_rejected_users: "There are no rejected users",
      confirm_approve: "Confirm Approval",
      confirm_reject: "Confirm Rejection",
      confirm_delete: "Confirm Deletion",
      approve_user_title: "Approve this user?",
      approve_user_content: "By approving {{name}} you will allow them to access the platform. Do you want to proceed?",
      reject_user_title: "Reject this user?",
      reject_user_content: "By rejecting {{name}} you prevent access to the platform. The user will be notified. Do you want to proceed?",
      delete_user_title: "Delete this user?",
      delete_user_content: "By deleting {{name}} you will permanently remove their account from the system. This action cannot be undone. Do you want to proceed?",
      user_approved: "User Approved",
      user_approved_desc: "The user has been successfully approved and can now access the platform.",
      user_rejected: "User Rejected",
      user_rejected_desc: "The user has been rejected and will not be able to access the platform.",
      user_deleted: "User Deleted",
      user_deleted_desc: "The user has been permanently removed from the system.",
      status_pending: "Pending",
      status_approved: "Approved",
      status_rejected: "Rejected",
    },
    nav: {
      features: "Features",
      benefits: "Benefits",
      about: "About Us",
      contact: "Contact",
      launch: "Launch App"
    },
    hero: {
      title_1: "The Ultimate Assistant for",
      title_2: "Financial Consultants",
      description: "Gervis empowers financial consultants with AI-driven tools so you can deliver to your clients an exceptional financial advice experience. Automate documentation, optimize client management, and exploit the full potential of applied AI with Gervis.",
      get_started: "Get Started",
      learn_more: "Learn More",
      title: "Gervis Financial Advisor Platform",
      feature1: {
        title: "Portfolio Analysis",
        description: "Analyze client portfolios with sophisticated algorithms to identify opportunities and risks."
      },
      feature2: {
        title: "AI-Powered Insights",
        description: "Leverage artificial intelligence to generate personalized financial recommendations."
      },
      feature3: {
        title: "Secure & Compliant",
        description: "Built with security and regulatory compliance in mind, including Italian financial regulations."
      }
    },
    features: {
      title: "What We Offer",
      subtitle: "Comprehensive tools to enhance your consulting service and provide added value to your clients.",
      learn_more: "Learn More",
      onboarding: {
        title: "Digitized Client Onboarding",
        description: "Simplify and accelerate client onboarding with digital forms and automated data collection."
      },
      client_management: {
        title: "Centralized Client Management",
        description: "Easily organize and manage client profiles, documents, and communications in a single platform."
      },
      wealth_assessment: {
        title: "Wealth Assessment",
        description: "Detailed analysis of client assets with intuitive visualizations and comprehensive reporting."
      },
      ai_allocation: {
        title: "AI-Powered Allocation",
        description: "Asset allocation suggestions based on advanced artificial intelligence algorithms."
      }
    },
    benefits: {
      title: "Why Choose Gervis?",
      subtitle: "Tangible benefits for your financial advisory business",
      items: {
        save_time: {
          title: "Save Time",
          description: "Reduce time spent on administrative tasks and focus on valuable consulting for your clients."
        },
        reduce_errors: {
          title: "Reduce Errors",
          description: "Minimize manual errors with digitized and automated processes for client documentation."
        },
        grow_aum: {
          title: "Grow Assets Under Management",
          description: "Attract and retain more clients with a professional and technologically advanced experience."
        },
        improve_satisfaction: {
          title: "Improve Satisfaction",
          description: "Provide a more responsive and personalized service to increase client satisfaction and loyalty."
        },
        compliance: {
          title: "Regulatory Compliance",
          description: "Easily maintain compliance with Italian and European financial regulations with up-to-date documentation."
        },
        insights: {
          title: "In-Depth Insights",
          description: "Get detailed analysis of client portfolios to provide more informed and strategic advice."
        }
      }
    },
    auth: {
      login: "Login",
      register: "Register",
      username: "Username",
      password: "Password",
      confirm_password: "Confirm Password",
      confirm_password_placeholder: "Confirm your password",
      submit: "Submit",
      no_account: "Don't have an account?",
      have_account: "Already have an account?",
      login_error: "Login failed! Please check your credentials.",
      register_error: "Registration failed! Please try again.",
      welcome: "Welcome to Gervis, your financial advisor platform",
      welcome_back: "Welcome Back",
      register_title: "Create Account",
      description: "The intelligent platform that helps financial advisors provide personalized wealth management and intuitive financial guidance.",
      login_description: "Log in to access your advisor dashboard.",
      register_description: "Register to start managing your clients efficiently.",
      creating_account: "Creating account...",
      back_to_home: "Back to Home",
      independent_advisor: "I am an independent financial advisor (without a company)",
      company_validation_error: "Company is required unless you are an independent advisor",
      validation: {
        first_name_required: "First name is required",
        last_name_required: "Last name is required",
        email_invalid: "Please enter a valid email address",
        password_length: "Password must be at least 6 characters",
        passwords_dont_match: "Passwords don't match"
      }
    },
    onboarding: {
      title: "Financial Profile Questionnaire",
      welcome: "Welcome",
      instructions: "Please fill in the following information to help us understand your financial profile and goals.",
      personal_info: "Personal Information",
      first_name: "First Name",
      last_name: "Last Name",
      email: "Email Address",
      phone: "Phone Number",
      dob: "Date of Birth",
      financial_profile: "Financial Profile",
      income: "Annual Income (€)",
      expenses: "Annual Expenses (€)",
      savings: "Monthly Savings (€)",
      dependent_count: "Number of Dependents",
      risk_profile: "Risk Profile",
      investment_goals: "Investment Goals",
      investment_horizon: "Investment Horizon",
      experience_level: "Investment Experience",
      assets: "Assets",
      asset_category: "Asset Category",
      asset_name: "Asset Name",
      asset_value: "Asset Value (€)",
      add_asset: "Add Asset",
      remove: "Remove",
      submit: "Submit Profile",
      error: "Error submitting profile",
      success: "Profile submitted successfully!",
      success_message: "Thank you for completing your financial profile. Your financial advisor will review your information and contact you soon."
    },
    risk_profiles: {
      conservative: "Conservative",
      moderate: "Moderate",
      balanced: "Balanced",
      growth: "Growth",
      aggressive: "Aggressive"
    },
    experience_levels: {
      none: "No Experience",
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
      expert: "Expert"
    },
    investment_goals: {
      retirement: "Retirement Planning",
      wealth_growth: "Wealth Growth",
      income_generation: "Income Generation",
      capital_preservation: "Capital Preservation",
      estate_planning: "Estate Planning"
    },
    investment_horizons: {
      short_term: "Short Term (1-3 years)",
      medium_term: "Medium Term (3-7 years)",
      long_term: "Long Term (7+ years)"
    },
    asset_categories: {
      real_estate: "Real Estate",
      equity: "Stocks & Equity",
      bonds: "Bonds & Fixed Income",
      cash: "Cash & Equivalents",
      private_equity: "Private Equity",
      venture_capital: "Venture Capital",
      cryptocurrencies: "Cryptocurrencies",
      other: "Other Assets"
    },
    language: {
      en: "English",
      it: "Italian"
    },
    common: {
      cancel: "Cancel",
      saving: "Saving...",
      save_changes: "Save Changes",
      app_name: "Gervis",
      pro_version: "Gervis PRO",
      coming_soon: "COMING SOON",
      error: {
        unauthorized: "Unauthorized access",
        admin_access_required: "This page requires administrator privileges",
        loading_data: "Error loading data. Please try again."
      }
    },
    about: {
      title: "About Us",
      description1: "Gervis is a product developed and managed by GT AI Solutions. GT AI Solutions' mission is to integrate artificial intelligence solutions into all businesses to free up valuable time and allow companies to focus on their core business.",
      description2: "We firmly believe that artificial intelligence is the key to transforming business processes, eliminating repetitive and low-value activities, enabling people to focus on what truly matters: relationships, creativity, and innovation.",
      description3: "Gervis represents the application of this philosophy in the financial consulting sector, offering advisors advanced tools to automate document management, streamline onboarding processes, and deliver a superior client experience."
    },
    contact: {
      title: "Contact Us",
      subtitle: "Have questions? We'd love to hear from you.",
      error: "There was an error sending your message. Please try again.",
      form: {
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email",
        company: "Company",
        message: "Message",
        privacy: "I agree to the processing of my data for the purpose of receiving a response to my inquiry.",
        submit: "Send Message",
        submitting: "Sending...",
        success: "Message Sent Successfully!",
        success_message: "Thank you for contacting us. We will get back to you shortly.",
        placeholders: {
          firstName: "Enter your first name",
          lastName: "Enter your last name",
          email: "Enter your email address",
          company: "Inserisci il nome della tua società",
          message: "How can we help you?"
        }
      },
      validation: {
        firstName: "First name is required",
        lastName: "Last name is required",
        email: "Please enter a valid email address",
        message: "Please enter your message",
        privacy: "You must agree to the privacy terms"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: resourcesEn,
      it: resourcesIt
    },
    lng: "it", // default language
    interpolation: {
      escapeValue: false
    },
    fallbackLng: {
      default: ['it']
    }
  });

export default i18n;