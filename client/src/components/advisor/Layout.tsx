import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ArrowLeft,
  Globe,
  ShieldAlert,
  BarChart3,
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
import { ApprovalPendingOverlay } from "@/components/ApprovalPendingOverlay";

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
    console.log("Lingua cambiata a:", newLang);
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
      href: "/app",
      icon: Users,
      current: location.startsWith("/clients"),
    },
    {
      name: "Market",
      href: "/market",
      icon: BarChart3,
      current: location === "/market",
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
                        ? "bg-accent text-white"
                        : "text-gray-300 hover:bg-gray-800"
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
      <div className="pt-6 mt-6 border-t border-gray-800">
        <div className="px-4 py-2 mb-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-300" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user?.name || "Advisor"}</p>
              <p className="text-xs text-gray-400">{user?.email || user?.username}</p>
            </div>
          </div>
        </div>
        {/* Language toggle button */}
        <div 
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-md cursor-pointer mb-2"
          onClick={toggleLanguage}
        >
          <Globe className="mr-3 h-5 w-5 text-green-500" />
          {t(`language.${currentLanguage === "en" ? "it" : "en"}`)}
        </div>
        <div 
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-md cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          {t('dashboard.logout')}
        </div>
        <Link href="/">
          <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-md cursor-pointer">
            <ArrowLeft className="mr-3 h-5 w-5" />
            {t('dashboard.return_to_home')}
          </div>
        </Link>
      </div>
    </>
  );

  // Check if the user is pending approval
  const isPendingApproval = user && user.approvalStatus === "pending";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Approval Pending Overlay */}
      {isPendingApproval && <ApprovalPendingOverlay email={user.email} />}
      
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-black text-white">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-black">
              <Link href="/">
                <div className="text-xl font-bold tracking-tight text-white flex items-center cursor-pointer">
                  {t('common.app_name')}
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
      </div>

      {/* Mobile header & sheet */}
      <div className="flex flex-col w-0 flex-1">
        <div className="md:hidden bg-black text-white flex items-center justify-between h-16 px-4">
          <Link href="/">
            <div className="text-xl font-bold tracking-tight flex items-center cursor-pointer">
              {t('common.app_name')}
            </div>
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isMobile ? "bottom" : "right"}
              className="w-[300px] bg-black text-white p-0"
            >
              <div className="pt-5 pb-4 flex-1 h-full flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between px-4 mb-5">
                  <div className="text-xl font-bold">Menu</div>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white"
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

        {/* Main content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}