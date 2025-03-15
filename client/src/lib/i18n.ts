import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enResources = {
  translation: {
    // Navbar
    'navbar.home': 'Home',
    'navbar.about': 'About',
    'navbar.features': 'Features',
    'navbar.benefits': 'Benefits',
    'navbar.contact': 'Contact',
    'navbar.login': 'Login',
    'navbar.dashboard': 'Dashboard',
    'navbar.logout': 'Logout',

    // Hero section
    'hero.title': 'Intelligent Financial Advisory',
    'hero.subtitle': 'Advanced wealth management powered by AI',
    'hero.description': 'Watson helps financial advisors provide personalized investment strategies with advanced analytics and wealth management tools.',
    'hero.button': 'Get Started',

    // About section
    'about.title': 'Who We Are',
    'about.subtitle': 'A Product of GT AI Solutions',
    'about.description': 'Watson is a state-of-the-art financial advisory platform developed by GT AI Solutions. Our mission is to bring powerful AI-driven solutions to businesses of all sizes, helping them save time, resources, and make smarter decisions.',
    'about.mission': 'GT AI Solutions is committed to democratizing artificial intelligence, making it accessible and practical for financial advisory services. We transform raw data into actionable insights, allowing financial advisors to focus on what matters most - building client relationships and delivering value.',
    'about.vision': 'We envision a future where financial decisions are optimized through intelligent analysis, regulatory compliance is streamlined through automation, and every client receives a personalized financial strategy that truly aligns with their goals.',

    // Features section
    'features.title': 'Platform Features',
    'features.subtitle': 'Powerful Tools for Financial Advisors',
    'features.ai.title': 'AI-Powered Analysis',
    'features.ai.description': 'Leverage machine learning to analyze market trends and identify the best investment opportunities for your clients.',
    'features.portfolio.title': 'Portfolio Management',
    'features.portfolio.description': 'Easily manage and track client portfolios with comprehensive visualization tools and real-time performance metrics.',
    'features.onboarding.title': 'Automated Onboarding',
    'features.onboarding.description': 'Streamline client onboarding with digital forms, automated suitability assessment, and regulatory compliance checks.',
    'features.compliance.title': 'Regulatory Compliance',
    'features.compliance.description': 'Stay compliant with automated checks and documentation for financial regulations, including MiFID II and IDD.',

    // Benefits section
    'benefits.title': 'Key Benefits',
    'benefits.subtitle': 'Why Choose Watson',
    'benefits.time.title': 'Save Time',
    'benefits.time.description': 'Automate routine tasks and paperwork, allowing you to focus on building client relationships.',
    'benefits.insight.title': 'Data-Driven Insights',
    'benefits.insight.description': 'Make informed decisions backed by comprehensive analysis and predictive algorithms.',
    'benefits.client.title': 'Enhance Client Experience',
    'benefits.client.description': 'Provide personalized service with detailed reporting and easy communication tools.',
    'benefits.growth.title': 'Scale Your Practice',
    'benefits.growth.description': 'Manage more clients efficiently without compromising on service quality or compliance.',

    // Contact section
    'contact.title': 'Contact Us',
    'contact.subtitle': 'Get in Touch',
    'contact.description': 'Interested in learning more about Watson? Contact us for a demo or to discuss how we can help your financial advisory practice.',
    'contact.name.label': 'Full Name',
    'contact.name.placeholder': 'John Doe',
    'contact.email.label': 'Email',
    'contact.email.placeholder': 'john@example.com',
    'contact.message.label': 'Message',
    'contact.message.placeholder': 'Tell us about your needs...',
    'contact.button': 'Send Message',
    'contact.success': 'Your message has been sent! We will get back to you soon.',

    // Footer
    'footer.copyright': '© 2025 GT AI Solutions. All rights reserved.',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',

    // Auth
    'auth.login.title': 'Login',
    'auth.login.description': 'Sign in to your Watson account',
    'auth.register.title': 'Create Account',
    'auth.register.description': 'Register for a new Watson account',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.loginButton': 'Sign In',
    'auth.registerButton': 'Register',
    'auth.error': 'Authentication failed. Please check your credentials.',

    // Dashboard
    'dashboard.welcome': 'Welcome to your Dashboard',
    'dashboard.clients.title': 'Clients',
    'dashboard.clients.add': 'Add Client',
    'dashboard.clients.name': 'Name',
    'dashboard.clients.email': 'Email',
    'dashboard.clients.phone': 'Phone',
    'dashboard.clients.status': 'Status',
    'dashboard.clients.onboarded': 'Onboarded',
    'dashboard.clients.notOnboarded': 'Not Onboarded',
    'dashboard.clients.actions': 'Actions',
    'dashboard.clients.view': 'View',
    'dashboard.clients.edit': 'Edit',
    'dashboard.clients.archive': 'Archive',
    'dashboard.clients.delete': 'Delete',
    'dashboard.clients.confirmation': 'Are you sure?',
    'dashboard.clients.search': 'Search clients...',
    'dashboard.clients.empty': 'No clients found',

    // Client Detail
    'client.detail.title': 'Client Details',
    'client.detail.personal': 'Personal Information',
    'client.detail.investment': 'Investment Profile',
    'client.detail.assets': 'Assets',
    'client.detail.send': 'Send Onboarding Link',
    'client.detail.email': 'Email Sent Successfully',

    // Onboarding Form
    'onboarding.title': 'Client Onboarding',
    'onboarding.welcome': 'Welcome',
    'onboarding.description': 'Complete this form to finalize your onboarding with Watson Financial Advisors',
    'onboarding.personal.title': 'Personal Information',
    'onboarding.personal.description': 'Please provide your contact and additional personal details',
    'onboarding.address.label': 'Home Address',
    'onboarding.address.placeholder': '123 Main St, City, Country',
    'onboarding.phone.label': 'Phone Number',
    'onboarding.phone.placeholder': '+1 (555) 123-4567',
    'onboarding.tax.label': 'Tax Identification',
    'onboarding.tax.placeholder': 'Your tax identification number',
    'onboarding.tax.description': 'This is used for tax reporting purposes only.',
    'onboarding.employment.label': 'Employment Status',
    'onboarding.employment.placeholder': 'e.g., Employed, Self-Employed, Retired',
    'onboarding.income.label': 'Annual Income (€)',
    'onboarding.income.placeholder': '50000',
    'onboarding.expenses.label': 'Monthly Expenses (€)',
    'onboarding.expenses.placeholder': '2000',
    'onboarding.worth.label': 'Total Net Worth (€)',
    'onboarding.worth.placeholder': '250000',
    'onboarding.dependents.label': 'Number of Dependents',
    'onboarding.dependents.placeholder': '0',
    
    'onboarding.investment.title': 'Investment Profile',
    'onboarding.investment.description': 'Help us understand your investment preferences and experience',
    'onboarding.risk.label': 'Risk Tolerance',
    'onboarding.risk.placeholder': 'Select your risk tolerance',
    'onboarding.risk.description': 'This helps us determine the best investment strategy for you.',
    'onboarding.experience.label': 'Investment Experience',
    'onboarding.experience.placeholder': 'Select your experience level',
    'onboarding.experience.description': 'Your experience with different types of investments.',
    'onboarding.horizon.label': 'Investment Time Horizon',
    'onboarding.horizon.placeholder': 'Select your investment horizon',
    'onboarding.horizon.description': 'How long you plan to keep your investments.',
    'onboarding.goals.label': 'Investment Goals',
    'onboarding.goals.description': 'Select all that apply to your financial objectives.',
    
    'onboarding.assets.title': 'Your Assets',
    'onboarding.assets.description': 'List your current financial assets and their approximate values',
    'onboarding.asset.add': 'Add Asset',
    'onboarding.asset.remove': 'Remove',
    'onboarding.asset.type': 'Asset Type',
    'onboarding.asset.value': 'Approximate Value (€)',
    'onboarding.asset.description.label': 'Description (Optional)',
    'onboarding.asset.description.placeholder': 'e.g., Primary residence, Stocks in Company XYZ, etc.',
    
    'onboarding.submit.button': 'Submit Onboarding Information',
    'onboarding.submit.submitting': 'Submitting...',
    'onboarding.success.title': 'Thank You!',
    'onboarding.success.description': 'Your information has been successfully submitted.',
    'onboarding.success.button': 'Return to Home',
    
    // Enums
    'enum.risk.conservative': 'Conservative',
    'enum.risk.moderate': 'Moderate',
    'enum.risk.balanced': 'Balanced',
    'enum.risk.growth': 'Growth',
    'enum.risk.aggressive': 'Aggressive',
    
    'enum.experience.none': 'None',
    'enum.experience.beginner': 'Beginner',
    'enum.experience.intermediate': 'Intermediate',
    'enum.experience.advanced': 'Advanced',
    'enum.experience.expert': 'Expert',
    
    'enum.horizon.short_term': 'Short Term (0-3 years)',
    'enum.horizon.medium_term': 'Medium Term (3-7 years)',
    'enum.horizon.long_term': 'Long Term (7+ years)',
    
    'enum.goals.retirement': 'Retirement Planning',
    'enum.goals.wealth_growth': 'Wealth Growth',
    'enum.goals.income_generation': 'Income Generation',
    'enum.goals.capital_preservation': 'Capital Preservation',
    'enum.goals.estate_planning': 'Estate Planning',
    
    'enum.asset.real_estate': 'Real Estate',
    'enum.asset.equity': 'Equity',
    'enum.asset.bonds': 'Bonds',
    'enum.asset.cash': 'Cash',
    'enum.asset.other': 'Other',
    
    // Language
    'language.en': 'English',
    'language.it': 'Italian',
  }
};

// Italian translations
const itResources = {
  translation: {
    // Navbar
    'navbar.home': 'Home',
    'navbar.about': 'Chi Siamo',
    'navbar.features': 'Funzionalità',
    'navbar.benefits': 'Vantaggi',
    'navbar.contact': 'Contatti',
    'navbar.login': 'Accedi',
    'navbar.dashboard': 'Dashboard',
    'navbar.logout': 'Esci',

    // Hero section
    'hero.title': 'Consulenza Finanziaria Intelligente',
    'hero.subtitle': 'Gestione patrimoniale avanzata potenziata dall\'IA',
    'hero.description': 'Watson aiuta i consulenti finanziari a fornire strategie di investimento personalizzate con analisi avanzate e strumenti di gestione patrimoniale.',
    'hero.button': 'Inizia Ora',

    // About section
    'about.title': 'Chi Siamo',
    'about.subtitle': 'Un Prodotto di GT AI Solutions',
    'about.description': 'Watson è una piattaforma di consulenza finanziaria all\'avanguardia sviluppata da GT AI Solutions. La nostra missione è portare soluzioni potenti basate sull\'intelligenza artificiale alle aziende di tutte le dimensioni, aiutandole a risparmiare tempo, risorse e a prendere decisioni più intelligenti.',
    'about.mission': 'GT AI Solutions si impegna a democratizzare l\'intelligenza artificiale, rendendola accessibile e pratica per i servizi di consulenza finanziaria. Trasformiamo i dati grezzi in informazioni utili, permettendo ai consulenti finanziari di concentrarsi su ciò che conta di più: costruire relazioni con i clienti e offrire valore.',
    'about.vision': 'Immaginiamo un futuro in cui le decisioni finanziarie sono ottimizzate attraverso un\'analisi intelligente, la conformità normativa è semplificata attraverso l\'automazione e ogni cliente riceve una strategia finanziaria personalizzata che si allinea veramente ai propri obiettivi.',

    // Features section
    'features.title': 'Funzionalità della Piattaforma',
    'features.subtitle': 'Strumenti Potenti per Consulenti Finanziari',
    'features.ai.title': 'Analisi Guidata dall\'IA',
    'features.ai.description': 'Sfrutta il machine learning per analizzare le tendenze del mercato e identificare le migliori opportunità di investimento per i tuoi clienti.',
    'features.portfolio.title': 'Gestione del Portafoglio',
    'features.portfolio.description': 'Gestisci e monitora facilmente i portafogli dei clienti con strumenti di visualizzazione completi e metriche di performance in tempo reale.',
    'features.onboarding.title': 'Onboarding Automatizzato',
    'features.onboarding.description': 'Semplifica l\'onboarding dei clienti con moduli digitali, valutazione automatica dell\'adeguatezza e controlli di conformità normativa.',
    'features.compliance.title': 'Conformità Normativa',
    'features.compliance.description': 'Mantieni la conformità con controlli automatizzati e documentazione per le normative finanziarie, inclusi MiFID II e IDD.',

    // Benefits section
    'benefits.title': 'Vantaggi Principali',
    'benefits.subtitle': 'Perché Scegliere Watson',
    'benefits.time.title': 'Risparmia Tempo',
    'benefits.time.description': 'Automatizza le attività di routine e il lavoro amministrativo, permettendoti di concentrarti sulla costruzione delle relazioni con i clienti.',
    'benefits.insight.title': 'Insight Basati sui Dati',
    'benefits.insight.description': 'Prendi decisioni informate supportate da analisi complete e algoritmi predittivi.',
    'benefits.client.title': 'Migliora l\'Esperienza del Cliente',
    'benefits.client.description': 'Fornisci un servizio personalizzato con reportistica dettagliata e strumenti di comunicazione facili da usare.',
    'benefits.growth.title': 'Fai Crescere la Tua Attività',
    'benefits.growth.description': 'Gestisci più clienti in modo efficiente senza compromettere la qualità del servizio o la conformità.',

    // Contact section
    'contact.title': 'Contattaci',
    'contact.subtitle': 'Mettiti in Contatto',
    'contact.description': 'Interessato a saperne di più su Watson? Contattaci per una demo o per discutere di come possiamo aiutare la tua attività di consulenza finanziaria.',
    'contact.name.label': 'Nome Completo',
    'contact.name.placeholder': 'Mario Rossi',
    'contact.email.label': 'Email',
    'contact.email.placeholder': 'mario@esempio.com',
    'contact.message.label': 'Messaggio',
    'contact.message.placeholder': 'Raccontaci le tue esigenze...',
    'contact.button': 'Invia Messaggio',
    'contact.success': 'Il tuo messaggio è stato inviato! Ti risponderemo al più presto.',

    // Footer
    'footer.copyright': '© 2025 GT AI Solutions. Tutti i diritti riservati.',
    'footer.privacy': 'Informativa sulla Privacy',
    'footer.terms': 'Termini di Servizio',

    // Auth
    'auth.login.title': 'Accedi',
    'auth.login.description': 'Accedi al tuo account Watson',
    'auth.register.title': 'Crea Account',
    'auth.register.description': 'Registrati per un nuovo account Watson',
    'auth.username': 'Nome Utente',
    'auth.password': 'Password',
    'auth.loginButton': 'Accedi',
    'auth.registerButton': 'Registrati',
    'auth.error': 'Autenticazione fallita. Verifica le tue credenziali.',

    // Dashboard
    'dashboard.welcome': 'Benvenuto nella tua Dashboard',
    'dashboard.clients.title': 'Clienti',
    'dashboard.clients.add': 'Aggiungi Cliente',
    'dashboard.clients.name': 'Nome',
    'dashboard.clients.email': 'Email',
    'dashboard.clients.phone': 'Telefono',
    'dashboard.clients.status': 'Stato',
    'dashboard.clients.onboarded': 'Registrato',
    'dashboard.clients.notOnboarded': 'Non Registrato',
    'dashboard.clients.actions': 'Azioni',
    'dashboard.clients.view': 'Visualizza',
    'dashboard.clients.edit': 'Modifica',
    'dashboard.clients.archive': 'Archivia',
    'dashboard.clients.delete': 'Elimina',
    'dashboard.clients.confirmation': 'Sei sicuro?',
    'dashboard.clients.search': 'Cerca clienti...',
    'dashboard.clients.empty': 'Nessun cliente trovato',

    // Client Detail
    'client.detail.title': 'Dettagli Cliente',
    'client.detail.personal': 'Informazioni Personali',
    'client.detail.investment': 'Profilo di Investimento',
    'client.detail.assets': 'Asset',
    'client.detail.send': 'Invia Link di Onboarding',
    'client.detail.email': 'Email Inviata con Successo',

    // Onboarding Form
    'onboarding.title': 'Onboarding Cliente',
    'onboarding.welcome': 'Benvenuto',
    'onboarding.description': 'Completa questo modulo per finalizzare il tuo onboarding con Watson Financial Advisors',
    'onboarding.personal.title': 'Informazioni Personali',
    'onboarding.personal.description': 'Fornisci i tuoi contatti e i dettagli personali aggiuntivi',
    'onboarding.address.label': 'Indirizzo di Casa',
    'onboarding.address.placeholder': 'Via Roma 123, Città, Paese',
    'onboarding.phone.label': 'Numero di Telefono',
    'onboarding.phone.placeholder': '+39 333 123 4567',
    'onboarding.tax.label': 'Codice Fiscale',
    'onboarding.tax.placeholder': 'Il tuo codice fiscale',
    'onboarding.tax.description': 'Questo è utilizzato solo per fini fiscali.',
    'onboarding.employment.label': 'Stato Occupazionale',
    'onboarding.employment.placeholder': 'Es., Dipendente, Autonomo, Pensionato',
    'onboarding.income.label': 'Reddito Annuale (€)',
    'onboarding.income.placeholder': '50000',
    'onboarding.expenses.label': 'Spese Mensili (€)',
    'onboarding.expenses.placeholder': '2000',
    'onboarding.worth.label': 'Patrimonio Netto Totale (€)',
    'onboarding.worth.placeholder': '250000',
    'onboarding.dependents.label': 'Numero di Persone a Carico',
    'onboarding.dependents.placeholder': '0',
    
    'onboarding.investment.title': 'Profilo di Investimento',
    'onboarding.investment.description': 'Aiutaci a comprendere le tue preferenze e la tua esperienza di investimento',
    'onboarding.risk.label': 'Tolleranza al Rischio',
    'onboarding.risk.placeholder': 'Seleziona la tua tolleranza al rischio',
    'onboarding.risk.description': 'Questo ci aiuta a determinare la migliore strategia di investimento per te.',
    'onboarding.experience.label': 'Esperienza di Investimento',
    'onboarding.experience.placeholder': 'Seleziona il tuo livello di esperienza',
    'onboarding.experience.description': 'La tua esperienza con diverse tipologie di investimento.',
    'onboarding.horizon.label': 'Orizzonte Temporale di Investimento',
    'onboarding.horizon.placeholder': 'Seleziona il tuo orizzonte di investimento',
    'onboarding.horizon.description': 'Per quanto tempo prevedi di mantenere i tuoi investimenti.',
    'onboarding.goals.label': 'Obiettivi di Investimento',
    'onboarding.goals.description': 'Seleziona tutti quelli che si applicano ai tuoi obiettivi finanziari.',
    
    'onboarding.assets.title': 'I Tuoi Asset',
    'onboarding.assets.description': 'Elenca i tuoi attuali asset finanziari e i loro valori approssimativi',
    'onboarding.asset.add': 'Aggiungi Asset',
    'onboarding.asset.remove': 'Rimuovi',
    'onboarding.asset.type': 'Tipo di Asset',
    'onboarding.asset.value': 'Valore Approssimativo (€)',
    'onboarding.asset.description.label': 'Descrizione (Opzionale)',
    'onboarding.asset.description.placeholder': 'Es., Residenza principale, Azioni in Azienda XYZ, ecc.',
    
    'onboarding.submit.button': 'Invia Informazioni di Onboarding',
    'onboarding.submit.submitting': 'Invio in corso...',
    'onboarding.success.title': 'Grazie!',
    'onboarding.success.description': 'Le tue informazioni sono state inviate con successo.',
    'onboarding.success.button': 'Torna alla Home',
    
    // Enums
    'enum.risk.conservative': 'Conservativo',
    'enum.risk.moderate': 'Moderato',
    'enum.risk.balanced': 'Bilanciato',
    'enum.risk.growth': 'Crescita',
    'enum.risk.aggressive': 'Aggressivo',
    
    'enum.experience.none': 'Nessuna',
    'enum.experience.beginner': 'Principiante',
    'enum.experience.intermediate': 'Intermedio',
    'enum.experience.advanced': 'Avanzato',
    'enum.experience.expert': 'Esperto',
    
    'enum.horizon.short_term': 'Breve Termine (0-3 anni)',
    'enum.horizon.medium_term': 'Medio Termine (3-7 anni)',
    'enum.horizon.long_term': 'Lungo Termine (7+ anni)',
    
    'enum.goals.retirement': 'Pianificazione Pensionistica',
    'enum.goals.wealth_growth': 'Crescita del Patrimonio',
    'enum.goals.income_generation': 'Generazione di Reddito',
    'enum.goals.capital_preservation': 'Preservazione del Capitale',
    'enum.goals.estate_planning': 'Pianificazione Patrimoniale',
    
    'enum.asset.real_estate': 'Immobili',
    'enum.asset.equity': 'Azioni',
    'enum.asset.bonds': 'Obbligazioni',
    'enum.asset.cash': 'Liquidità',
    'enum.asset.other': 'Altro',
    
    // Language
    'language.en': 'Inglese',
    'language.it': 'Italiano',
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: enResources,
      it: itResources
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;