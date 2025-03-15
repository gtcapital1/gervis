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
    benefits: {
      title: "Transform Your Financial Practice",
      subtitle: "Join consultants who are saving time, reducing errors, and growing their business with Watson.",
      items: {
        save_time: {
          title: "Save 10+ Hours Weekly",
          description: "Automate routine tasks and documentation, freeing up more time to focus on client relationships."
        },
        reduce_errors: {
          title: "Reduce Errors by 95%",
          description: "AI-powered checks and balances ensure your recommendations and documentation are error-free."
        },
        grow_aum: {
          title: "Grow AUM by 30%",
          description: "Serve more clients effectively and increase assets under management with optimized workflows."
        },
        improve_satisfaction: {
          title: "Improve Client Satisfaction",
          description: "Deliver more personalized service and faster responses to client inquiries and needs."
        },
        compliance: {
          title: "Compliance Made Simple",
          description: "Automatically generate compliant documentation and reduce regulatory risks."
        },
        insights: {
          title: "Instant Insights",
          description: "Access real-time market data and AI-powered analytics to make informed decisions quickly."
        }
      }
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
    },
    about: {
      title: "Who We Are",
      description1: "Watson is a flagship product of GT AI Solutions, a company dedicated to bringing innovative AI solutions to businesses across all sectors.",
      description2: "At GT AI Solutions, our mission is to empower organizations with cutting-edge AI technology that saves time, reduces resource consumption, increases productivity, and allows professionals to focus on high-value tasks while the AI handles the routine work.",
      description3: "Since our founding in 2020, Watson has helped over 500 financial consultants save thousands of hours and grow their practices by an average of 30%, demonstrating GT AI Solutions' commitment to delivering tangible business value through artificial intelligence.",
      team: "Our Team",
      stats: {
        consultants: "Consultants",
        aum: "AUM Managed",
        satisfaction: "Satisfaction"
      }
    },
    contact: {
      title: "Get in Touch",
      subtitle: "Ready to transform your financial consulting practice? Contact us today.",
      form: {
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email Address",
        company: "Company",
        message: "Message",
        placeholders: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          company: "Your Company",
          message: "How can we help you?"
        },
        privacy: "I agree to the Privacy Policy and Terms of Service",
        submit: "Submit",
        submitting: "Submitting...",
        success: "Thank You!",
        success_message: "We've received your message and will get back to you shortly."
      },
      validation: {
        firstName: "First name is required",
        lastName: "Last name is required",
        email: "Please enter a valid email address",
        message: "Message is required",
        privacy: "You must agree to the terms and privacy policy"
      },
      error: "There was a problem submitting your form. Please try again."
    },
    footer: {
      description: "The Ultimate Assistant for Financial Consultants, powered by advanced AI.",
      social: {
        twitter: "Twitter",
        linkedin: "LinkedIn"
      },
      sections: {
        product: {
          title: "Product",
          features: "Features",
          pricing: "Pricing",
          use_cases: "Use Cases",
          integrations: "Integrations"
        },
        company: {
          title: "Company",
          about: "About Us",
          careers: "Careers",
          blog: "Blog",
          contact: "Contact"
        },
        resources: {
          title: "Resources",
          help: "Help Center",
          documentation: "Documentation",
          api: "API Reference",
          privacy: "Privacy Policy"
        }
      },
      copyright: "Watson Financial Technologies, Inc. All rights reserved."
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
      title_1: "L'assistente imprescindibile per",
      title_2: "Consulenti Finanziari",
      description: "Watson rivoluziona il lavoro dei consulenti finanziari grazie a strumenti avanzati di intelligenza artificiale per garantire al cliente un'esperienza di consulenza finanziaria indimenticabile. Automatizza la documentazione, ottimizza la gestione della clientela e sfrutta il potenziale dell'IA con Watson.",
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
      dependent_count: "Numero di Persone a Carico",
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
    benefits: {
      title: "Potenzia la Tua Attività di Consulenza",
      subtitle: "Unisciti ai consulenti che risparmiano tempo, riducono gli errori e fanno crescere la loro attività con Watson.",
      items: {
        save_time: {
          title: "Risparmia 10+ Ore Settimanali",
          description: "Automatizza le attività di routine e la documentazione, liberando più tempo per concentrarti sulle relazioni con i clienti."
        },
        reduce_errors: {
          title: "Riduci gli Errori del 95%",
          description: "I sistemi di verifica automatica basati sull'IA garantiscono che le tue raccomandazioni e i documenti siano sempre impeccabili."
        },
        grow_aum: {
          title: "Aumenta gli AUM del 30%",
          description: "Servi più clienti in modo efficace e aumenta il patrimonio gestito con flussi di lavoro ottimizzati."
        },
        improve_satisfaction: {
          title: "Migliora la Soddisfazione dei Clienti",
          description: "Offri un servizio più personalizzato e risposte più rapide alle richieste e alle esigenze dei clienti."
        },
        compliance: {
          title: "Conformità Semplificata",
          description: "Genera automaticamente documentazione conforme e riduci i rischi normativi."
        },
        insights: {
          title: "Approfondimenti Istantanei",
          description: "Accedi a dati di mercato in tempo reale e analisi basate sull'IA per prendere decisioni informate rapidamente."
        }
      }
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
    },
    about: {
      title: "Chi Siamo",
      description1: "Watson è un prodotto di punta di GT AI Solutions, un'azienda dedicata a portare soluzioni innovative di intelligenza artificiale alle imprese di tutti i settori.",
      description2: "In GT AI Solutions, la nostra missione è dotare le aziende di tecnologie AI all'avanguardia che fanno risparmiare tempo, ottimizzano l'uso delle risorse e incrementano la produttività. Lasciamo che l'IA si occupi delle attività ripetitive, così i professionisti possono dedicarsi a ciò che conta davvero.",
      description3: "Dal 2020, Watson ha aiutato oltre 500 consulenti finanziari a risparmiare migliaia di ore e a far crescere le loro attività in media del 30%, dimostrando l'impegno di GT AI Solutions nel fornire valore aziendale tangibile attraverso l'intelligenza artificiale.",
      team: "Il Nostro Team",
      stats: {
        consultants: "Consulenti",
        aum: "AUM Gestiti",
        satisfaction: "Soddisfazione"
      }
    },
    contact: {
      title: "Contattaci",
      subtitle: "Pronto a migliorare la tua attività di consulenza finanziaria? Contattaci oggi.",
      form: {
        firstName: "Nome",
        lastName: "Cognome",
        email: "Indirizzo Email",
        company: "Azienda",
        message: "Messaggio",
        placeholders: {
          firstName: "Mario",
          lastName: "Rossi",
          email: "mario.rossi@esempio.com",
          company: "La Tua Azienda",
          message: "Come possiamo aiutarti?"
        },
        privacy: "Accetto la Privacy Policy e i Termini di Servizio",
        submit: "Invia",
        submitting: "Invio in corso...",
        success: "Grazie!",
        success_message: "Abbiamo ricevuto il tuo messaggio e ti risponderemo al più presto."
      },
      validation: {
        firstName: "Il nome è obbligatorio",
        lastName: "Il cognome è obbligatorio",
        email: "Inserisci un indirizzo email valido",
        message: "Il messaggio è obbligatorio",
        privacy: "Devi accettare i termini e la privacy policy"
      },
      error: "Si è verificato un problema durante l'invio del modulo. Riprova."
    },
    footer: {
      description: "L'assistente imprescindibile per i Consulenti Finanziari, alimentato da intelligenza artificiale avanzata.",
      social: {
        twitter: "Twitter",
        linkedin: "LinkedIn"
      },
      sections: {
        product: {
          title: "Prodotto",
          features: "Funzionalità",
          pricing: "Prezzi",
          use_cases: "Casi d'Uso",
          integrations: "Integrazioni"
        },
        company: {
          title: "Azienda",
          about: "Chi Siamo",
          careers: "Lavora con Noi",
          blog: "Blog",
          contact: "Contatti"
        },
        resources: {
          title: "Risorse",
          help: "Centro Assistenza",
          documentation: "Documentazione",
          api: "Riferimento API",
          privacy: "Privacy Policy"
        }
      },
      copyright: "Watson Financial Technologies, Inc. Tutti i diritti riservati."
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