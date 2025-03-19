import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation();
  
  return (
    <section id="about" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-10 text-black text-center">{t('about.title')}</h2>
          <div className="max-w-3xl mx-auto">
            <p className="text-gray-600 text-lg mb-6 text-center">
              {t('about.description1')}
            </p>
            <p className="text-gray-600 text-lg mb-6 text-center">
              {t('about.description2')}
            </p>
            <p className="text-gray-600 text-lg mb-6 text-center">
              {t('about.description3')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
