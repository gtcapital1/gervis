import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n"; // Import i18n configuration
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient"; 
import { Toaster } from "@/components/ui/toaster";

// Get user's preferred language from localStorage or browser settings
const getInitialLanguage = () => {
  const savedLanguage = localStorage.getItem('preferredLanguage');
  if (savedLanguage && ['en', 'it'].includes(savedLanguage)) {
    return savedLanguage;
  }
  // If no saved preference, try to use browser language
  const browserLang = navigator.language.split('-')[0];
  return ['en', 'it'].includes(browserLang) ? browserLang : 'en';
};

// Set initial language
import i18n from 'i18next';
i18n.changeLanguage(getInitialLanguage());

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>
);
