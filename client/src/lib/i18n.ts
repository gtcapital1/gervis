import i18n from "i18next";
import { initReactI18next } from "react-i18next";

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
      title_1: "The Ultimate Tool for",
      title_2: "Financial Consultants",
      description: "Watson empowers financial consultants with AI-driven tools to optimize client portfolios, automate documentation, and deliver exceptional financial advice.",
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
      description: "The intelligent platform that helps financial advisors provide personalized wealth management and intuitive financial guidance.",
      login_description: "Log in to access your advisor dashboard.",
      creating_account: "Creating account..."
    },
    dashboard: {
      clients: "Clients",
      add_client: "Add Client",
      name: "Name",
      email: "Email",
      status: "Status",
      actions: "Actions",
      onboarded: "Onboarded",
      not_onboarded: "Not Onboarded",
      view: "View",
      edit: "Edit",
      delete: "Delete",
      archived: "Archived",
      active: "Active",
      onboarding_link: "Onboarding Link",
      send_link: "Send Link",
      confirm_delete: "Are you sure you want to delete this client?",
      cancel: "Cancel"
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
    features: {
      title: "Powerful Features for Financial Excellence",
      subtitle: "Watson provides cutting-edge tools that transform how financial consultants work.",
      wealth_assessment: {
        title: "Wealth Assessment",
        description: "Comprehensive analysis of client portfolios with detailed risk assessments and opportunity identification."
      },
      ai_allocation: {
        title: "AI-Powered Allocation",
        description: "Advanced algorithms that analyze market trends and optimize client portfolios for maximum returns."
      },
      intelligent_assistant: {
        title: "Intelligent Assistant",
        description: "Automatically track client conversations and generate compliance-ready documentation with AI."
      },
      learn_more: "Learn more"
    }
  }
};

// Italian translations
const resourcesIt = {
  translation: {
    nav: {
      features: "Funzionalità",
      benefits: "Vantaggi",
      about: "Chi Siamo",
      contact: "Contatti",
      launch: "Avvia App"
    },
    hero: {
      title_1: "Lo Strumento Definitivo per",
      title_2: "Consulenti Finanziari",
      description: "Watson supporta i consulenti finanziari con strumenti basati sull'intelligenza artificiale per ottimizzare i portafogli dei clienti, automatizzare la documentazione e fornire consulenza finanziaria eccezionale.",
      get_started: "Inizia",
      learn_more: "Scopri di Più",
      title: "Piattaforma di Consulenza Finanziaria Watson",
      feature1: {
        title: "Analisi del Portafoglio",
        description: "Analizza i portafogli dei clienti con algoritmi sofisticati per identificare opportunità e rischi."
      },
      feature2: {
        title: "Approfondimenti Basati su IA",
        description: "Utilizza l'intelligenza artificiale per generare raccomandazioni finanziarie personalizzate."
      },
      feature3: {
        title: "Sicuro e Conforme",
        description: "Costruito con la sicurezza e la conformità normativa in mente, incluse le normative finanziarie italiane."
      }
    },
    auth: {
      login: "Accedi",
      register: "Registrati",
      username: "Nome utente",
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
      description: "La piattaforma intelligente che aiuta i consulenti finanziari a fornire una gestione patrimoniale personalizzata e una guida finanziaria intuitiva.",
      login_description: "Accedi per entrare nella dashboard del consulente.",
      creating_account: "Creazione account in corso..."
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
      onboarding_link: "Link di Registrazione",
      send_link: "Invia Link",
      confirm_delete: "Sei sicuro di voler eliminare questo cliente?",
      cancel: "Annulla"
    },
    onboarding: {
      title: "Questionario del Profilo Finanziario",
      welcome: "Benvenuto nel tuo percorso finanziario",
      instructions: "Compila le seguenti informazioni per aiutarci a comprendere il tuo profilo finanziario e i tuoi obiettivi.",
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
      dependent_count: "Numero di Dipendenti",
      risk_profile: "Profilo di Rischio",
      investment_goals: "Obiettivi di Investimento",
      investment_horizon: "Orizzonte di Investimento",
      experience_level: "Esperienza di Investimento",
      assets: "Asset",
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
      wealth_growth: "Crescita Patrimoniale",
      income_generation: "Generazione di Reddito",
      capital_preservation: "Conservazione del Capitale",
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
      cash: "Contanti e Equivalenti",
      other: "Altri Asset"
    },
    language: {
      en: "Inglese",
      it: "Italiano"
    },
    features: {
      title: "Potenti Funzionalità per l'Eccellenza Finanziaria",
      subtitle: "Watson fornisce strumenti all'avanguardia che trasformano il modo di lavorare dei consulenti finanziari.",
      wealth_assessment: {
        title: "Valutazione Patrimoniale",
        description: "Analisi completa dei portafogli dei clienti con valutazioni dettagliate del rischio e identificazione delle opportunità."
      },
      ai_allocation: {
        title: "Allocazione basata su IA",
        description: "Algoritmi avanzati che analizzano le tendenze di mercato e ottimizzano i portafogli dei clienti per massimizzare i rendimenti."
      },
      intelligent_assistant: {
        title: "Assistente Intelligente",
        description: "Traccia automaticamente le conversazioni con i clienti e genera documentazione conforme alle normative con l'aiuto dell'IA."
      },
      learn_more: "Scopri di più"
    }
  }
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: resourcesEn,
      it: resourcesIt
    },
    lng: "en", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;