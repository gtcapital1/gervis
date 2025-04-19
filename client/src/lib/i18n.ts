import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "../i18n/locales/en.json";
import itTranslations from "../i18n/locales/it.json";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslations
    },
    it: {
      translation: itTranslations
    }
  },
  lng: "it", // Italian as default language
  fallbackLng: "it",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;