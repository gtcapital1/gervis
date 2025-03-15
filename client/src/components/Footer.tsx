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
              <span className="text-3xl mr-1 text-accent font-serif">Φ</span>
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
            <h3 className="text-sm font-semibold uppercase tracking-wider">{t('footer.sections.product.title')}</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.product.features')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.product.pricing')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.product.use_cases')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.product.integrations')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">{t('footer.sections.company.title')}</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.company.about')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.company.careers')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.company.blog')}</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.company.contact')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">{t('footer.sections.resources.title')}</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.resources.help')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.resources.documentation')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.resources.api')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t('footer.sections.resources.privacy')}</a></li>
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
