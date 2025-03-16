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
      register_title: "Create Account",
      description: "The intelligent platform that helps financial advisors provide personalized wealth management and intuitive financial guidance.",
      login_description: "Log in to access your advisor dashboard.",
      register_description: "Register to start managing your clients efficiently.",
      creating_account: "Creating account...",
      back_to_home: "Back to Home",
      independent_advisor: "I am an independent financial advisor"
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
      cancel: "Cancel",
      logout: "Logout",
      return_to_home: "Return to Home",
      dashboard: "Dashboard",
      settings: "Settings",
      manage_portfolio: "Manage your client portfolio",
      upgrade_to_pro: "Upgrade to PRO",
      client_overview: "Client Overview",
      view_manage_clients: "View and manage all your clients",
      search_clients: "Search clients...",
      showing_archived: "Showing Archived",
      show_archived: "Show Archived",
      filter: "Filter",
      loading_clients: "Loading clients...",
      error_loading: "Error loading clients. Please try again.",
      no_clients_found: "No clients found",
      add_first_client: "Add Your First Client",
      phone: "Phone",
      created: "Created",
      view_details: "View Details",
      restore_client: "Restore Client",
      archive: "Archive",
      delete_permanently: "Delete Permanently",
      archive_client: "Archive Client",
      archive_confirmation: "Are you sure you want to archive this client? Archived clients will be moved to the archive section and won't appear in the main client list.",
      action_reversible: "This action can be reversed later",
      restore_info: "You can restore archived clients from the archived clients view.",
      archiving: "Archiving...",
      delete_client: "Delete Client Permanently",
      delete_confirmation: "Are you sure you want to permanently delete this client? This action cannot be undone.",
      action_permanent: "This action is permanent",
      delete_data_warning: "All client data including profile, assets, and recommendations will be permanently deleted from our system.",
      deleting: "Deleting..."
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
    client: {
      loading_details: "Loading client details...",
      error_loading: "Error loading client details.",
      back_to_dashboard: "Back to Dashboard",
      back: "Back",
      edit_client: "Edit Client",
      onboarding_required: "Client Onboarding Required",
      onboarding_required_desc: "This client needs to complete the onboarding process to access all features.",
      link_copied: "Link copied",
      link_copied_desc: "Onboarding link copied to clipboard.",
      copy_link: "Copy Link",
      generate_new_link: "Generate New Link",
      share_link_desc: "Share this link with your client to complete the onboarding process.",
      sending: "Sending...",
      generate_email: "Generate Onboarding Email",
      personal_information: "Personal Information",
      name: "Name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      tax_code: "Tax Code",
      employment: "Employment",
      dependents: "Dependents",
      created: "Created",
      annual_income: "Annual Income",
      monthly_expenses: "Monthly Expenses",
      net_worth: "Net Worth",
      investment_profile: "Investment Profile",
      risk_profile: "Risk Profile",
      investment_experience: "Investment Experience",
      investment_horizon: "Investment Horizon",
      investment_goals: "Investment Goals",
      not_assessed: "Not Assessed",
      not_specified: "Not Specified",
      asset_allocation: "Asset Allocation",
      portfolio_snapshot: "Snapshot of client's current portfolio",
      portfolio_overview: "Portfolio Overview",
      recommendations: "Recommendations",
      loading_assets: "Loading assets...",
      no_assets: "No assets found for this client.",
      asset_details: "Asset Details",
      total: "Total",
      asset_split: "Asset Split",
      recommendations_advice: "Recommendations and financial advice will appear here.",
      add_recommendation: "Add Recommendation",
      upgrade_pro: "Upgrade to PRO",
      upgrade_pro_desc: "Unlock premium features including advanced financial recommendations",
      pro_account_access: "With a PRO account, you gain access to",
      pro_feature_1: "Advanced portfolio analysis and optimization",
      pro_feature_2: "Personalized investment recommendations",
      pro_feature_3: "Risk assessment and mitigation strategies",
      pro_feature_4: "Tax optimization suggestions",
      pro_feature_5: "AI-powered financial planning tools",
      upgrade_button: "Upgrade to PRO",
      customize_email: "Customize Onboarding Email",
      customize_email_desc: "Customize the email that will be sent to {{clientName}}.",
      email_language: "Email Language",
      email_content: "Email Content",
      email_placeholder: "Enter your personalized message here...",
      email_personalization_tip: "Customize the message to include personalized details. The onboarding link will be automatically included in the email.",
      send_email: "Send Email"
    },
    client_edit: {
      title: "Edit Client Information",
      subtitle: "Update client's complete profile",
      personal_info: "Personal Information",
      personal_info_desc: "Basic contact and identification details",
      investment_profile: "Investment Profile",
      investment_profile_desc: "Information about investment preferences and experience",
      assets: "Assets",
      assets_desc: "Information about current assets",
      first_name: "First Name",
      last_name: "Last Name",
      email_address: "Email Address",
      phone_number: "Phone Number",
      address: "Address",
      tax_code: "Tax Code / Identification Number",
      employment_status: "Employment Status",
      dependents: "Number of Dependents",
      annual_income: "Annual Income (€)",
      monthly_expenses: "Monthly Expenses (€)",
      net_worth: "Net Worth (€)",
      risk_profile: "Risk Profile",
      investment_experience: "Investment Experience",
      investment_time_horizon: "Investment Time Horizon",
      investment_goals: "Investment Goals (Select all that apply)",
      select_risk_profile: "Select risk profile",
      select_experience: "Select experience level",
      select_horizon: "Select investment horizon",
      asset_number: "Asset",
      category: "Category",
      value: "Value (€)",
      description: "Description (optional)",
      remove_asset: "Remove asset",
      add_asset: "Add Asset",
      save_changes: "Save Changes",
      cancel: "Cancel",
      client_updated: "Client Updated",
      update_success: "Client information and assets have been updated successfully.",
      error: "Error",
      update_failure: "Failed to update client information. Please try again."
    },
    common: {
      cancel: "Cancel"
    },
    languages: {
      english: "English",
      italian: "Italian (Italiano)"
    },
    pdf: {
      title: "Client Onboarding Form",
      subject: "Client Financial Profile",
      clientSummaryReport: "Client Onboarding Form",
      personalInformation: "Personal Information",
      investmentProfile: "Investment Profile",
      assetAllocation: "Current Asset Allocation",
      coverLetter: {
        heading: "FINANCIAL ADVISORY SERVICES",
        date: "Date",
        toClient: "To",
        fromAdvisor: "From",
        subject: "Subject",
        title: "Welcome – Starting Our Collaboration",
        greeting: "Dear Client,",
        introduction: "It's a genuine pleasure to welcome you and begin this collaboration. My goal is to offer you a highly personalized advisory service, designed to help you manage your assets strategically and efficiently, with a cost-conscious approach and in full compliance with current regulations.",
        collaboration: "Through in-depth analysis and advanced tools, we will work together to:",
        servicePoint1: "Optimize the composition of your portfolio based on your objectives and risk profile.",
        servicePoint2: "Identify tailored solutions for more effective and sustainable asset management over time.",
        servicePoint3: "Ensure transparent consulting in line with industry best practices.",
        servicePoint4: "Provide regular updates and adjustments based on market changes and your evolving needs.",
        fields: {
          greeting: "Greeting",
          introduction: "Introduction",
          collaboration: "Collaboration",
          servicePoints: "Service Points",
          process: "Process",
          contactInfo: "Contact Information",
          closing: "Closing",
          fullContent: "Letter Content"
        },
        points: [
          "Optimize the composition of your portfolio based on your objectives and risk profile.",
          "Identify tailored solutions for more effective and sustainable asset management over time.",
          "Ensure transparent consulting in line with industry best practices."
        ],
        process: "As discussed, to complete the onboarding process, I invite you to verify and return the attached documents signed. This step is necessary to formalize our collaboration and proceed with the planned activities.",
        contactInfo: "I remain available for any clarification or need. Thank you for your trust, and I am confident this will be the beginning of a valuable journey.",
        closing: "Regards,"
      },
      name: "Full Name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      employmentStatus: "Employment Status",
      taxCode: "Tax Code",
      riskProfile: "Risk Profile",
      investmentGoal: "Investment Goal",
      investmentHorizon: "Investment Horizon",
      experienceLevel: "Experience Level",
      notProvided: "Not provided",
      category: "Category",
      description: "Description",
      value: "Value",
      totalAssetsValue: "Total Assets Value",
      noAssetsFound: "No assets found for this client.",
      clientSignature: "Signature",
      signatureHere: "Signature",
      clientDeclaration: "Client Declaration",
      clientDeclarationText: "I hereby declare that the information provided is true, complete and accurate. This document represents my current financial situation and personal information as reported to my financial advisor.",
      date: "Date",
      page: "Page",
      of: "of",
      selectLanguage: "Select Language",
      generatePdf: "Generate PDF Report",
      generate: "Generate PDF",
      customizeLetterContent: "Customize Letter Content",
      sendByEmail: "Send by Email",
      emailDialogDescription: "Send this report by email to the client",
      emailSubject: "Subject",
      emailMessage: "Message",
      emailDefaultSubject: "Welcome to our consultancy service",
      send: "Send",
      noEmailProvided: "Client email is not provided"
    },
    benefits: {
      title: "Transform Your Financial Practice",
      subtitle: "Join consultants who are saving time, reducing errors, and growing their business with Watson.",
      items: {
        save_time: {
          title: "Save Valuable Time",
          description: "Automate routine tasks and documentation, freeing up more time to focus on client relationships."
        },
        reduce_errors: {
          title: "Reduce Errors Significantly",
          description: "AI-powered checks and balances ensure your recommendations and documentation are error-free."
        },
        grow_aum: {
          title: "Grow Your Business",
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
      title: "Product Features",
      subtitle: "Watson provides cutting-edge tools that transform how financial consultants work.",
      onboarding: {
        title: "Simplify and Automate Onboarding",
        description: "Streamline client onboarding with digital forms, automated data collection, and instant document generation."
      },
      client_management: {
        title: "Streamline Client Management",
        description: "Keep track of all your clients' information, assets, and recommendations in one organized dashboard."
      },
      wealth_assessment: {
        title: "AI-Powered Wealth Assessment (Coming Soon)",
        description: "Comprehensive analysis of client portfolios with detailed risk assessments and opportunity identification. Available with Watson Pro."
      },
      ai_allocation: {
        title: "AI-Powered Asset Allocation (Coming Soon)",
        description: "Advanced algorithms that analyze market trends and optimize client portfolios for maximum returns. Available with Watson Pro."
      },
      learn_more: "Learn more"
    },
    about: {
      title: "Who We Are",
      description1: "Watson is a flagship product of GT AI Solutions, a company dedicated to bringing innovative AI solutions to businesses across all sectors.",
      description2: "At GT AI Solutions, our mission is to empower organizations with cutting-edge AI technology that saves time, reduces resource consumption, increases productivity, and allows professionals to focus on high-value tasks while the AI handles the routine work.",
      description3: "Watson is designed to support financial advisors in optimizing their business processes, allowing them to focus on client relationships rather than document management and repetitive tasks."
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
      description: "Watson rivoluziona il lavoro dei consulenti finanziari grazie a strumenti avanzati di intelligenza artificiale per garantire al cliente un'esperienza di consulenza finanziaria indimenticabile. Automatizza la documentazione, ottimizza la gestione della clientela e sfrutta al massimo il potenziale dell'IA con Watson.",
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
      register_title: "Crea Account",
      description: "La piattaforma intelligente che aiuta i consulenti finanziari a fornire una gestione patrimoniale personalizzata e una guida finanziaria intuitiva.",
      login_description: "Accedi per entrare nella dashboard del consulente.",
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
      onboarding_link: "Link di Registrazione",
      send_link: "Invia Link",
      confirm_delete: "Sei sicuro di voler eliminare questo cliente?",
      cancel: "Annulla",
      logout: "Disconnetti",
      return_to_home: "Torna alla Home",
      dashboard: "Dashboard",
      settings: "Impostazioni",
      manage_portfolio: "Gestisci il tuo portafoglio clienti",
      upgrade_to_pro: "Aggiorna a PRO",
      client_overview: "Panoramica Clienti",
      view_manage_clients: "Visualizza e gestisci tutti i tuoi clienti",
      search_clients: "Cerca clienti...",
      showing_archived: "Mostrando Archiviati",
      show_archived: "Mostra Archiviati",
      filter: "Filtra",
      loading_clients: "Caricamento clienti...",
      error_loading: "Errore nel caricamento dei clienti. Riprova.",
      no_clients_found: "Nessun cliente trovato",
      add_first_client: "Aggiungi il tuo primo cliente",
      phone: "Telefono",
      created: "Creato",
      view_details: "Visualizza Dettagli",
      restore_client: "Ripristina Cliente",
      archive: "Archivia",
      delete_permanently: "Elimina Permanentemente",
      archive_client: "Archivia Cliente",
      archive_confirmation: "Sei sicuro di voler archiviare questo cliente? I clienti archiviati verranno spostati nella sezione archivio e non appariranno nella lista principale dei clienti.",
      action_reversible: "Questa azione può essere annullata in seguito",
      restore_info: "Puoi ripristinare i clienti archiviati dalla visualizzazione dei clienti archiviati.",
      archiving: "Archiviazione in corso...",
      delete_client: "Elimina Cliente Permanentemente",
      delete_confirmation: "Sei sicuro di voler eliminare permanentemente questo cliente? Questa azione non può essere annullata.",
      action_permanent: "Questa azione è permanente",
      delete_data_warning: "Tutti i dati del cliente, inclusi profilo, asset e raccomandazioni, verranno eliminati permanentemente dal nostro sistema.",
      deleting: "Eliminazione in corso..."
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
    client_edit: {
      title: "Modifica Informazioni Cliente",
      subtitle: "Aggiorna il profilo completo del cliente",
      personal_info: "Informazioni Personali",
      personal_info_desc: "Dettagli di contatto e identificazione di base",
      investment_profile: "Profilo di Investimento",
      investment_profile_desc: "Informazioni su preferenze ed esperienza di investimento",
      assets: "Asset",
      assets_desc: "Informazioni sugli asset attuali",
      first_name: "Nome",
      last_name: "Cognome",
      email_address: "Indirizzo Email",
      phone_number: "Numero di Telefono",
      address: "Indirizzo",
      tax_code: "Codice Fiscale / Numero Identificativo",
      employment_status: "Stato Occupazionale",
      dependents: "Numero di Persone a Carico",
      annual_income: "Reddito Annuale (€)",
      monthly_expenses: "Spese Mensili (€)",
      net_worth: "Patrimonio Netto (€)",
      risk_profile: "Profilo di Rischio",
      investment_experience: "Esperienza di Investimento",
      investment_time_horizon: "Orizzonte Temporale di Investimento",
      investment_goals: "Obiettivi di Investimento (Seleziona tutti quelli applicabili)",
      select_risk_profile: "Seleziona profilo di rischio",
      select_experience: "Seleziona livello di esperienza",
      select_horizon: "Seleziona orizzonte di investimento",
      asset_number: "Asset",
      category: "Categoria",
      value: "Valore (€)",
      description: "Descrizione (opzionale)",
      remove_asset: "Rimuovi asset",
      add_asset: "Aggiungi Asset",
      save_changes: "Salva Modifiche",
      cancel: "Annulla",
      client_updated: "Cliente Aggiornato",
      update_success: "Le informazioni e gli asset del cliente sono stati aggiornati con successo.",
      error: "Errore",
      update_failure: "Impossibile aggiornare le informazioni del cliente. Riprova."
    },
    client: {
      loading_details: "Caricamento dettagli cliente...",
      error_loading: "Errore nel caricamento dei dettagli del cliente.",
      back_to_dashboard: "Torna alla Dashboard",
      back: "Indietro",
      edit_client: "Modifica Cliente",
      onboarding_required: "Registrazione Cliente Richiesta",
      onboarding_required_desc: "Questo cliente deve completare il processo di registrazione per accedere a tutte le funzionalità.",
      link_copied: "Link copiato",
      link_copied_desc: "Link di registrazione copiato negli appunti.",
      copy_link: "Copia Link",
      generate_new_link: "Genera Nuovo Link",
      share_link_desc: "Condividi questo link con il tuo cliente per completare il processo di registrazione.",
      sending: "Invio in corso...",
      generate_email: "Genera Email di Registrazione",
      personal_information: "Informazioni Personali",
      name: "Nome",
      email: "Email",
      phone: "Telefono",
      address: "Indirizzo",
      tax_code: "Codice Fiscale",
      employment: "Occupazione",
      dependents: "Persone a carico",
      created: "Creato il",
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
      portfolio_overview: "Panoramica Portafoglio",
      recommendations: "Raccomandazioni",
      loading_assets: "Caricamento asset...",
      no_assets: "Nessun asset trovato per questo cliente.",
      asset_details: "Dettagli Asset",
      total: "Totale",
      asset_split: "Suddivisione Asset",
      recommendations_advice: "Le raccomandazioni e i consigli finanziari appariranno qui.",
      add_recommendation: "Aggiungi Raccomandazione",
      upgrade_pro: "Aggiorna a PRO",
      upgrade_pro_desc: "Sblocca funzionalità premium tra cui raccomandazioni finanziarie avanzate",
      pro_account_access: "Con un account PRO, ottieni accesso a",
      pro_feature_1: "Analisi e ottimizzazione avanzate del portafoglio",
      pro_feature_2: "Raccomandazioni di investimento personalizzate",
      pro_feature_3: "Strategie di valutazione e mitigazione del rischio",
      pro_feature_4: "Suggerimenti per l'ottimizzazione fiscale",
      pro_feature_5: "Strumenti di pianificazione finanziaria basati su IA",
      upgrade_button: "Aggiorna a PRO",
      customize_email: "Personalizza Email di Registrazione",
      customize_email_desc: "Personalizza l'email che verrà inviata a {{clientName}}.",
      email_language: "Lingua dell'Email",
      email_content: "Contenuto dell'Email",
      email_placeholder: "Inserisci qui il tuo messaggio personalizzato...",
      email_personalization_tip: "Personalizza il messaggio includendo dettagli personalizzati. Il link di registrazione verrà incluso automaticamente nell'email.",
      send_email: "Invia Email"
    },
    common: {
      cancel: "Annulla"
    },
    languages: {
      english: "Inglese",
      italian: "Italiano"
    },
    pdf: {
      title: "Modulo Onboarding",
      subject: "Profilo Finanziario del Cliente",
      clientSummaryReport: "Modulo Onboarding",
      personalInformation: "Informazioni Personali",
      investmentProfile: "Profilo di Investimento",
      assetAllocation: "Allocazione Attuale degli Asset",
      coverLetter: {
        heading: "SERVIZI DI CONSULENZA FINANZIARIA",
        date: "Data",
        toClient: "A",
        fromAdvisor: "Da",
        subject: "Oggetto",
        title: "Benvenuto – Avvio della Nostra Collaborazione",
        greeting: "Gentile Cliente,",
        introduction: "È un vero piacere darti il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirti un servizio di consulenza altamente personalizzato, pensato per aiutarti a gestire il tuo patrimonio in modo strategico ed efficiente, con un approccio attento ai costi e nel pieno rispetto delle normative vigenti.",
        collaboration: "Attraverso un'analisi approfondita e strumenti avanzati, lavoreremo insieme per:",
        servicePoint1: "Ottimizzare la composizione del tuo portafoglio in base ai tuoi obiettivi e al tuo profilo di rischio.",
        servicePoint2: "Individuare soluzioni su misura per una gestione patrimoniale più efficace e sostenibile nel tempo.",
        servicePoint3: "Assicurare una consulenza trasparente e in linea con le migliori pratiche di settore.",
        servicePoint4: "Fornire aggiornamenti regolari e adeguamenti in base ai cambiamenti del mercato e all'evoluzione delle tue esigenze.",
        fields: {
          greeting: "Saluto",
          introduction: "Introduzione",
          collaboration: "Collaborazione",
          servicePoints: "Punti di servizio",
          process: "Processo",
          contactInfo: "Informazioni di contatto",
          closing: "Chiusura",
          fullContent: "Contenuto della Lettera"
        },
        points: [
          "Ottimizzare la composizione del tuo portafoglio in base ai tuoi obiettivi e al tuo profilo di rischio.",
          "Individuare soluzioni su misura per una gestione patrimoniale più efficace e sostenibile nel tempo.",
          "Assicurare una consulenza trasparente e in linea con le migliori pratiche di settore."
        ],
        process: "Come discusso, per completare il processo di onboarding, ti invito a verificare e restituire firmati i documenti allegati. Questo passaggio è necessario per formalizzare la nostra collaborazione e procedere con le attività pianificate.",
        contactInfo: "Resto a disposizione per qualsiasi chiarimento o esigenza. Ti ringrazio per la fiducia e sono certo che sarà l'inizio di un percorso di valore.",
        closing: "Cordiali saluti,"
      },
      name: "Nome Completo",
      email: "Email",
      phone: "Telefono",
      address: "Indirizzo",
      employmentStatus: "Situazione Lavorativa",
      taxCode: "Codice Fiscale",
      riskProfile: "Profilo di Rischio",
      investmentGoal: "Obiettivo di Investimento",
      investmentHorizon: "Orizzonte di Investimento",
      experienceLevel: "Livello di Esperienza",
      notProvided: "Non fornito",
      category: "Categoria",
      description: "Descrizione",
      value: "Valore",
      totalAssetsValue: "Valore Totale degli Asset",
      noAssetsFound: "Nessun asset trovato per questo cliente.",
      clientSignature: "Firma",
      signatureHere: "Firma",
      clientDeclaration: "Dichiarazione del Cliente",
      clientDeclarationText: "Dichiaro che le informazioni fornite sono vere, complete e accurate. Questo documento rappresenta la mia attuale situazione finanziaria e le informazioni personali fornite al mio consulente finanziario.",
      date: "Data",
      page: "Pagina",
      of: "di",
      selectLanguage: "Seleziona Lingua",
      generatePdf: "Genera Modulo di Onboarding",
      generate: "Genera PDF",
      customizeLetterContent: "Personalizza Contenuto Lettera",
      sendByEmail: "Invia via Email",
      emailDialogDescription: "Invia questo report via email al cliente",
      emailSubject: "Oggetto",
      emailMessage: "Messaggio",
      emailDefaultSubject: "Benvenuto nel nostro servizio di consulenza",
      send: "Invia",
      noEmailProvided: "Email del cliente non fornita"
    },
    benefits: {
      title: "Potenzia la Tua Attività di Consulenza",
      subtitle: "Unisciti ai consulenti che risparmiano tempo, riducono gli errori e fanno crescere la loro attività con Watson.",
      items: {
        save_time: {
          title: "Risparmia Tempo Prezioso",
          description: "Automatizza le attività di routine e la documentazione, liberando più tempo per concentrarti sulle relazioni con i clienti."
        },
        reduce_errors: {
          title: "Riduci gli Errori Significativamente",
          description: "I sistemi di verifica automatica basati sull'IA garantiscono che le tue raccomandazioni e i documenti siano sempre impeccabili."
        },
        grow_aum: {
          title: "Espandi la Tua Attività",
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
      title: "Funzionalità del Prodotto",
      subtitle: "Watson fornisce strumenti all'avanguardia che trasformano il modo di lavorare dei consulenti finanziari.",
      onboarding: {
        title: "Semplifica e Automatizza l'Onboarding",
        description: "Snellisci l'onboarding dei clienti con moduli digitali, raccolta dati automatizzata e generazione istantanea di documenti."
      },
      client_management: {
        title: "Ottimizza la Gestione dei Clienti",
        description: "Tieni traccia di tutte le informazioni, gli asset e le raccomandazioni dei tuoi clienti in un'unica dashboard organizzata."
      },
      wealth_assessment: {
        title: "Valutazione Patrimoniale basata su IA (Prossimamente)",
        description: "Analisi completa dei portafogli dei clienti con valutazioni dettagliate del rischio e identificazione delle opportunità. Disponibile con Watson Pro."
      },
      ai_allocation: {
        title: "Allocazione degli Asset basata su IA (Prossimamente)",
        description: "Algoritmi avanzati che analizzano le tendenze di mercato e ottimizzano i portafogli dei clienti per massimizzare i rendimenti. Disponibile con Watson Pro."
      },
      learn_more: "Scopri di più"
    },
    about: {
      title: "Chi Siamo",
      description1: "Watson è un prodotto di punta di GT AI Solutions, un'azienda dedicata a portare soluzioni innovative di intelligenza artificiale alle imprese di tutti i settori.",
      description2: "In GT AI Solutions, la nostra missione è dotare le aziende di tecnologie AI all'avanguardia che fanno risparmiare tempo, ottimizzano l'uso delle risorse e incrementano la produttività. Lasciamo che l'IA si occupi delle attività ripetitive, così i professionisti possono dedicarsi a ciò che conta davvero.",
      description3: "Watson è progettato per supportare i consulenti finanziari nell'ottimizzazione dei loro processi aziendali, permettendo loro di concentrarsi sulla relazione con i clienti piuttosto che sulla gestione documentale e le attività ripetitive."
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
    lng: "it", // Default language is Italian
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;