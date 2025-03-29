import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

export default function Navbar() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showShadow, setShowShadow] = useState(false);
  const [, setLocation] = useLocation();

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Close mobile menu when clicking a link
  const closeMobileMenu = () => {
    setIsOpen(false);
  };

  // Handle scroll to show shadow on navbar
  useEffect(() => {
    const handleScroll = () => {
      setShowShadow(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header id="navbar" className={`fixed w-full z-50 bg-black text-white py-4 transition-all duration-300 ${showShadow ? 'shadow-md navbar-fixed' : ''}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a href="#" className="text-2xl font-bold tracking-tight flex items-center">
              Gervis
            </a>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-10">
            <a href="#features" className="text-sm font-medium hover:text-accent transition-colors">{t('nav.features')}</a>
            <a href="#benefits" className="text-sm font-medium hover:text-accent transition-colors">{t('nav.benefits')}</a>
            <a href="#about" className="text-sm font-medium hover:text-accent transition-colors">{t('nav.about')}</a>
            <a href="#contact" className="text-sm font-medium hover:text-accent transition-colors">{t('nav.contact')}</a>
          </nav>
          
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            <Button 
              onClick={() => setLocation("/app")}
              className="bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-white"
            >
              {t('nav.launch')}
            </Button>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMenu}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className={`md:hidden pt-4 ${isOpen ? 'block' : 'hidden'}`}>
          <div className="flex flex-col space-y-3 px-2 pb-3">
            <a href="#features" onClick={closeMobileMenu} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-900">{t('nav.features')}</a>
            <a href="#benefits" onClick={closeMobileMenu} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-900">{t('nav.benefits')}</a>
            <a href="#about" onClick={closeMobileMenu} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-900">{t('nav.about')}</a>
            <a href="#contact" onClick={closeMobileMenu} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-900">{t('nav.contact')}</a>
            <div className="px-3 py-2">
              <LanguageSwitcher />
            </div>
            <Button 
              onClick={() => {
                closeMobileMenu();
                setLocation("/app");
              }}
              className="bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-white w-full"
            >
              {t('nav.launch')}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
