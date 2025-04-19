import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n"; // Import i18n configuration

// Imposta l'italiano come lingua fissa per l'app, ignorando le preferenze del browser
import i18n from 'i18next';
i18n.changeLanguage('it');

createRoot(document.getElementById("root")!).render(<App />);
