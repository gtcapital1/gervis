import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Italian translations
const resourcesIt = {
  translation: {
    nav: {
      features: "Funzionalità",
      benefits: "Vantaggi",
      about: "Chi Siamo",
      contact: "Contatti",
      launch: "Accedi"
    },
    hero: {
      title_1: "L'Assistente Definitivo per",
      title_2: "Consulenti Finanziari",
      description: "Watson potenzia i consulenti finanziari con strumenti basati sull'IA per offrire ai tuoi clienti un'esperienza di consulenza finanziaria eccezionale. Automatizza la documentazione, ottimizza la gestione dei clienti e sfrutta il pieno potenziale dell'IA applicata con Watson.",
      get_started: "Inizia Ora",
      learn_more: "Scopri di Più",
      title: "Piattaforma Watson per Consulenti Finanziari",
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
      welcome: "Benvenuto su Watson, la tua piattaforma di consulenza finanziaria",
      welcome_back: "Bentornato",
      register_title: "Crea Account",
      description: "La piattaforma intelligente che aiuta i consulenti finanziari a fornire una gestione patrimoniale personalizzata e una guida finanziaria intuitiva.",
      login_description: "Accedi per accedere alla tua dashboard consulente.",
      register_description: "Registrati per iniziare a gestire i tuoi clienti in modo efficiente.",
      creating_account: "Creazione account in corso...",
      back_to_home: "Torna alla Home",
      independent_advisor: "Sono un consulente finanziario indipendente"
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
      welcome: "Benvenuto nel tuo percorso finanziario",
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
      other: "Altri Asset"
    },
    language: {
      en: "Inglese",
      it: "Italiano"
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
      app_name: "Watson",
      pro_version: "Watson Pro",
      coming_soon: "PROSSIMAMENTE"
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
      description: "Watson empowers financial consultants with AI-driven tools so you can deliver to your clients an exceptional financial advice experience. Automate documentation, optimize client management, and exploit the full potential of applied AI with Watson.",
      get_started: "Get Started",
      learn_more: "Learn More",
      title: "Watson Financial Advisor Platform",
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
      welcome: "Welcome to Watson, your financial advisor platform",
      welcome_back: "Welcome Back",
      register_title: "Create Account",
      description: "The intelligent platform that helps financial advisors provide personalized wealth management and intuitive financial guidance.",
      login_description: "Log in to access your advisor dashboard.",
      register_description: "Register to start managing your clients efficiently.",
      creating_account: "Creating account...",
      back_to_home: "Back to Home",
      independent_advisor: "I am an independent financial advisor"
    },
    onboarding: {
      title: "Financial Profile Questionnaire",
      welcome: "Welcome to your financial journey",
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
      app_name: "Watson",
      pro_version: "Watson Pro",
      coming_soon: "COMING SOON"
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