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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();

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
            <Link key={item.name} href={item.disabled ? "#" : item.href}>
              <a
                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-md 
                  ${
                    item.current
                      ? "bg-accent text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }
                  ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                  }
                }}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </a>
            </Link>
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
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-gray-400">admin@watson.com</p>
            </div>
          </div>
        </div>
        <Link href="/">
          <a className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-md">
            <LogOut className="mr-3 h-5 w-5" />
            Return to Home
          </a>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-black">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
              <Link href="/">
                <a className="text-xl font-bold tracking-tight text-white flex items-center">
                  <svg
                    className="w-7 h-7 mr-2 text-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11a7 7 0 00-7 7m7-7v4"
                    ></path>
                    <circle
                      cx="12"
                      cy="11"
                      r="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                  Watson
                </a>
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
            <a className="text-xl font-bold tracking-tight flex items-center">
              <svg
                className="w-7 h-7 mr-2 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11a7 7 0 00-7 7m7-7v4"
                ></path>
                <circle
                  cx="12"
                  cy="11"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
              Watson
            </a>
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