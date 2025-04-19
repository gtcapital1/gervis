import { ThemeProvider as ActualThemeProvider } from "@/hooks/use-theme";

function ThemeProvider(props: React.ComponentProps<typeof ActualThemeProvider>) {
  return <ActualThemeProvider {...props} />;
}

export { ThemeProvider }; 