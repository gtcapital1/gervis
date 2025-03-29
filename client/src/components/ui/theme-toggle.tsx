import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="rounded-md text-gray-300 hover:text-white dark:text-gray-300 dark:hover:text-white"
    >
      {theme === "light" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">
        {theme === "light" 
          ? t('settings.toggle_dark_mode', 'Toggle dark mode') 
          : t('settings.toggle_light_mode', 'Toggle light mode')}
      </span>
    </Button>
  );
} 