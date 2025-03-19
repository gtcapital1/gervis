import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserManagement } from "@/components/admin/UserManagement";
import { Layout } from "@/components/advisor/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [_, setLocation] = useLocation();

  // Check if the user is authorized to access the admin panel
  const isAdmin = user?.email === "gianmarco.trapasso@gmail.com" || user?.role === "admin";

  // Redirect unauthorized users
  useEffect(() => {
    if (user && !isAdmin) {
      toast({
        title: t("error.unauthorized"),
        description: t("error.admin_access_required"),
        variant: "destructive",
      });
      setLocation("/app");
    }
  }, [user, isAdmin, setLocation, toast, t]);

  // If no user or not admin, don't render
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("admin.admin_panel")}</h1>
          <p className="text-gray-600">{t("admin.welcome_admin")}</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users">{t("admin.users")}</TabsTrigger>
            <TabsTrigger value="settings">{t("admin.system_settings")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="p-8 bg-gray-100 rounded-lg text-center">
              <h3 className="text-lg font-medium">{t("admin.coming_soon")}</h3>
              <p className="text-gray-600">{t("admin.system_settings_coming_soon")}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}