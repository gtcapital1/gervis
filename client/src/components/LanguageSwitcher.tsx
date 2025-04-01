import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

export function LanguageSwitcher({ inSidebar = false }: { inSidebar?: boolean }) {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  useEffect(() => {
    // Update state when language changes
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Save language preference to localStorage
    localStorage.setItem('preferredLanguage', lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={inSidebar ? "ghost" : "outline"} 
          size="sm" 
          className={`flex items-center gap-2 ${inSidebar ? "text-gray-300 hover:text-white hover:bg-gray-800" : ""}`}
        >
          <Languages className={`h-4 w-4 ${inSidebar ? "text-green-500" : ""}`} />
          <span className="hidden sm:inline-block">{t(`language.${currentLanguage}`)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')} className={currentLanguage === 'en' ? 'bg-accent/20' : ''}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('it')} className={currentLanguage === 'it' ? 'bg-accent/20' : ''}>
          Italiano
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}