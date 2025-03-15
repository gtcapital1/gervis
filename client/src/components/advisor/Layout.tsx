import { ReactNode } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { user, logoutMutation } = useAuth();
  
  // Handle logout
  function handleLogout() {
    logoutMutation.mutate();
  }

  const navigation = [
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
      name: "Settings",
      href: "#",
      icon: Settings,
      current: location === "/settings",
      disabled: true,
    },
  ];

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
                  {item.name}
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
        <div 
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-md cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </div>
        <Link href="/">
          <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-md cursor-pointer">
            <ArrowLeft className="mr-3 h-5 w-5" />
            Return to Home
          </div>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-black text-white">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-black">
              <Link href="/">
                <div className="text-xl font-bold tracking-tight text-white flex items-center cursor-pointer">
                  <span className="text-3xl mr-1 text-accent font-serif">Φ</span>
                  Watson
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
              <span className="text-3xl mr-1 text-accent font-serif">Φ</span>
              Watson
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