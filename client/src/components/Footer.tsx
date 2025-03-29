import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-black text-white py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-xl font-bold tracking-tight mb-2">
              Gervis
            </span>
          </div>
        </div>
        
        <div className="mt-6">
          <p className="text-gray-400 text-sm text-center">
            &copy; {new Date().getFullYear()} Gervis. {t('footer.all_rights_reserved', 'Tutti i diritti riservati.')}
          </p>
        </div>
      </div>
    </footer>
  );
}
