import { Twitter, Linkedin } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-black text-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <a href="#" className="text-2xl font-bold tracking-tight flex items-center">
              <svg className="w-7 h-7 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11a7 7 0 00-7 7m7-7v4"></path>
                <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
              Watson
            </a>
            <p className="mt-4 text-gray-400">
              {t('footer.description')}
            </p>
            <div className="mt-6 flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-6 w-6" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">{t('footer.product.title')}</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">{t('footer.product.features')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.product.pricing')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.product.useCases')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.product.integrations')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">{t('footer.company.title')}</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">{t('footer.company.about')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.company.careers')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.company.blog')}</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">{t('footer.company.contact')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">{t('footer.resources.title')}</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.help')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.documentation')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.api')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.resources.privacy')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-sm text-center">
            &copy; {new Date().getFullYear()} {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
