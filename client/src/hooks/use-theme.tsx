import { createContext, useContext, useEffect, useState } from "react";

// Modificato il tipo per supportare solo la modalità chiara
type Theme = "light";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeContextType = {
  theme: "light",
  setTheme: () => null,
};

const ThemeContext = createContext<ThemeContextType>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // ignora qualsiasi tentativo di cambiare tema e mantiene sempre light
  const setThemeFixed = (newTheme: Theme) => {
    // Forza sempre il tema chiaro
    setTheme("light");
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Rimuovi classe dark se presente
    root.classList.remove("dark");
    
    // Aggiungi sempre la classe light
    root.classList.add("light");
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: "light",
        setTheme: setThemeFixed,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}; 