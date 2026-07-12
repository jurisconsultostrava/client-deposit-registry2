
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Landmark, FileText, Plus, Users, TrendingUp, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AuthGuard from "./components/auth/AuthGuard";

const navigationItems = [
  {
    title: "Nástěnka",
    url: createPageUrl("Dashboard"),
    icon: TrendingUp,
  },
  {
    title: "Nový vklad",
    url: createPageUrl("NewDeposit"),
    icon: Plus,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("deposit_system_authenticated");
    localStorage.removeItem("deposit_system_login_time");
    window.location.href = createPageUrl("Access");
  };

  const handleQuickAction = (action) => {
    const dashboardUrl = createPageUrl("Dashboard");
    
    // Vytvoř URL s parametry pro filtrování
    let targetUrl = dashboardUrl;
    
    if (action === 'active') {
      targetUrl = `${dashboardUrl}?filter=active`;
    } else if (action === 'clients') {
      targetUrl = `${dashboardUrl}?view=clients`;
    }
    
    navigate(targetUrl);
  };

  // Pokud jsme na access stránce, zobraz jen access bez layoutu
  if (location.pathname === createPageUrl("Access")) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <SidebarProvider>
        <style>
          {`
            :root {
              --primary-gold: #D4AF37;
              --primary-blue: #1E3A8A;
              --secondary-blue: #3B82F6;
              --accent-gold: #F59E0B;
              --neutral-100: #F8FAFC;
              --neutral-200: #E2E8F0;
              --neutral-800: #1E293B;
              --neutral-900: #0F172A;
            }
            
            .gradient-bg {
              background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
            }
            
            .gold-accent {
              color: var(--primary-gold);
            }
            
            .text-financial {
              color: var(--neutral-800);
            }
          `}
        </style>
        <div className="min-h-screen flex w-full bg-neutral-50">
          <Sidebar className="border-r border-neutral-200 bg-white shadow-xl">
            <SidebarHeader className="border-b border-neutral-200 p-6 gradient-bg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Landmark className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg">Registr klientských vkladů</h2>
                  <p className="text-xs text-blue-100">Systém pro správu financí</p>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="p-4">
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2 py-3">
                  Navigace
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-2 ${
                            location.pathname === item.url 
                              ? 'bg-blue-50 text-blue-700 shadow-sm border-l-4 border-blue-600' 
                              : 'text-neutral-700'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup className="mt-8">
                <SidebarGroupLabel className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2 py-3">
                  Rychlé akce
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-3 py-2 space-y-3">
                    <button
                      onClick={() => handleQuickAction('active')}
                      className="w-full flex items-center gap-3 text-sm p-3 bg-neutral-50 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-neutral-500" />
                      <span className="text-neutral-700">Aktivní vklady</span>
                    </button>
                    <button
                      onClick={() => handleQuickAction('clients')}
                      className="w-full flex items-center gap-3 text-sm p-3 bg-neutral-50 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-neutral-500" />
                      <span className="text-neutral-700">Záznamy klientů</span>
                    </button>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-neutral-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">A</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-800 text-sm truncate">Administrátor</p>
                    <p className="text-xs text-neutral-500 truncate">Správa vkladů</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-neutral-500 hover:text-red-600 hover:bg-red-50"
                  title="Odhlásit se"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col bg-neutral-50">
            <header className="bg-white border-b border-neutral-200 px-6 py-4 md:hidden shadow-sm">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-neutral-100 p-2 rounded-lg transition-colors duration-200" />
                <h1 className="text-xl font-bold text-neutral-800">Registr klientských vkladů</h1>
              </div>
            </header>

            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
