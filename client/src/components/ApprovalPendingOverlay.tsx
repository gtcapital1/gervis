import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Clock, AlertCircle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function ApprovalPendingOverlay({ email }: { email: string }) {
  const { t } = useTranslation();
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-full bg-amber-100 p-3 mb-4">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t('approval.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{t('approval.description')}</p>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 w-full mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">{t('approval.status')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('approval.status_message')}</p>
              </div>
            </div>
          </div>

          <div className="mb-6 w-full">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                <ClipboardCheck className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{t('approval.email_confirmation')}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('approval.email_sent_to')} <span className="font-medium">{email}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t('approval.next_steps')}
          </p>
          
          <div className="flex flex-col gap-3 w-full">
            <Link href="/">
              <Button variant="default" className="w-full">
                {t('approval.return_home')}
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}