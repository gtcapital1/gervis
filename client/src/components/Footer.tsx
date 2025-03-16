import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-black text-white py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <a href="#" className="text-2xl font-bold tracking-tight flex items-center">
            <span className="text-3xl mr-1 text-accent font-serif">Φ</span>
            {t('common.app_name')}
          </a>
        </div>
        
        <div className="mt-6">
          <p className="text-gray-400 text-sm text-center">
            &copy; {new Date().getFullYear()} Watson Finance. {t('footer.all_rights_reserved', 'Tutti i diritti riservati.')}
          </p>
        </div>
      </div>
    </footer>
  );
}
