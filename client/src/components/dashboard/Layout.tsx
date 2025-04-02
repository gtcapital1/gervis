// This file defines the layout component for the advisor section of the application.
// It includes the structure and styling for the advisor's dashboard and other related pages.

import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  ShieldAlert,
  BarChart3,
  Zap,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ApprovalPendingOverlay } from "@/components/ApprovalPendingOverlay";

// Utility function to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { user, logoutMutation } = useAuth();
  const { t, i18n } = useTranslation();
  
  // Keep track of current language - update when i18n.language changes
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language || "it");
  
  // Update currentLanguage when i18n.language changes
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);
  
  // Check if the user is an admin
  const isAdmin = user?.email === "gianmarco.trapasso@gmail.com" || user?.role === "admin";
  
  // Handle language change
  const toggleLanguage = () => {
    const newLang = currentLanguage === "en" ? "it" : "en";
    i18n.changeLanguage(newLang);
    // Save language preference to localStorage for persistence
    localStorage.setItem('preferredLanguage', newLang);
    
  };
  
  // Handle logout
  function handleLogout() {
    logoutMutation.mutate();
  }

  // Define base navigation items
  const baseNavigation = [
    {
      name: "Dashboard",
      href: "/app",
      icon: LayoutDashboard,
      current: location === "/app",
    },
    {
      name: "Clients",
      href: "/clients",
      icon: Users,
      current: location === "/clients" || location.startsWith("/clients/"),
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: Calendar,
      current: location === "/calendar",
      disabled: false,
    },
    {
      name: "Trends",
      href: "/trends",
      icon: TrendingUp,
      current: location === "/trends",
      disabled: false,
    },
    {
      name: "Market",
      href: "/market",
      icon: BarChart3,
      current: location === "/market",
      disabled: false,
    },
    {
      name: "Spark",
      href: "/spark",
      icon: Zap,
      current: location === "/spark",
      disabled: false,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      current: location === "/settings",
      disabled: false,
    },
  ];
  
  // Add admin panel link if user is admin
  const navigation = isAdmin 
    ? [
        ...baseNavigation,
        {
          name: "Admin",
          href: "/admin",
          icon: ShieldAlert,
          current: location === "/admin",
          disabled: false,
        }
      ] 
    : baseNavigation;

  const NavLinks = () => (
    <>
      <div className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="block">
              <Link href={item.disabled ? "#" : item.href}>
                <div
                  className={`
                    flex items-center px-4 py-2 text-sm font-medium rounded-md 
                    ${
                      item.current
                        ? "bg-accent text-white dark:bg-accent dark:text-white"
                        : "text-gray-300 hover:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                    }
                    ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  onClick={(e) => {
                    if (item.disabled) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {t(`dashboard.${item.name.toLowerCase()}`)}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mt-auto p-4 border-t border-muted">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={undefined} alt={user?.name ?? "User"} />
              <AvatarFallback>{getInitials(user?.name ?? "User")}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <LanguageSwitcher inSidebar={true} />
            
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  // Check if the user is pending approval
  const isPendingApproval = user && user.approvalStatus === "pending";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-100 flex">
      {/* Approval Pending Overlay */}
      {isPendingApproval && <ApprovalPendingOverlay email={user.email} />}
      
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gray-900 dark:bg-black text-white dark:text-white border-r border-gray-800 dark:border-gray-800">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900 dark:bg-black">
            <Link href="/">
              <div className="text-xl font-bold tracking-tight text-white dark:text-white flex items-center cursor-pointer">
                Gervis
              </div>
            </Link>
          </div>
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="flex-1 px-2 space-y-1">
              <NavLinks />
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile header & sheet */}
      <div className="flex flex-col w-0 flex-1">
        <div className="md:hidden bg-gray-900 dark:bg-black text-white dark:text-white flex items-center justify-between h-16 px-4 border-b border-gray-800 dark:border-gray-800">
          <Link href="/">
            <div className="text-xl font-bold tracking-tight flex items-center cursor-pointer">
              Gervis
            </div>
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white dark:text-white">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isMobile ? "bottom" : "right"}
              className="w-[300px] bg-gray-900 dark:bg-black text-white dark:text-white p-0"
            >
              <div className="pt-5 pb-4 flex-1 h-full flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between px-4 mb-5">
                  <div className="text-xl font-bold">Menu</div>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white dark:text-white"
                      >
                        <X className="h-6 w-6" />
                        <span className="sr-only">Close menu</span>
                      </Button>
                    </SheetTrigger>
                  </Sheet>
                </div>
                <div className="flex-1 px-2">
                  <NavLinks />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}