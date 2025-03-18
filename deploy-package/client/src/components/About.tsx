import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation();
  
  return (
    <section id="about" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-accent/20 rounded-3xl transform rotate-3"></div>
            <div className="relative rounded-3xl shadow-xl w-full h-full overflow-hidden">
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-3xl">
                <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center p-8">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-gray-600 font-medium">GT AI Solutions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-black">{t('about.title')}</h2>
            <p className="text-gray-600 text-lg mb-6">
              {t('about.description1')}
            </p>
            <p className="text-gray-600 text-lg mb-6">
              {t('about.description2')}
            </p>
            <p className="text-gray-600 text-lg mb-6">
              {t('about.description3')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
