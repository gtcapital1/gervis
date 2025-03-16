import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();

  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">{t('contact.title')}</h2>
          <p className="text-lg text-gray-600">
            {t('contact.subtitle')}
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
          <div className="py-8">
            <div className="flex justify-center mb-6">
              <Mail className="h-12 w-12 text-secondary" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">info@watsonfinance.com</h3>
            <p className="text-gray-600 mb-6">
              Via Verdi 123, 20121 Milano, Italia
            </p>
            <p className="text-gray-600">
              Tel: +39 02 1234567
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
