import { Users, LayoutDashboard, LineChart, BarChart, TrendingUp, UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  learnMoreColor: string;
  isComingSoon?: boolean;
  plusFeature?: boolean;
}

function FeatureCard({ icon, title, description, learnMoreColor, isComingSoon, plusFeature }: FeatureCardProps) {
  const { t } = useTranslation();
  return (
    <div className={`${isComingSoon ? 'bg-gray-800' : 'bg-black'} rounded-2xl shadow-lg p-8 card-hover border ${isComingSoon ? 'border-blue-800' : 'border-gray-800'} transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl relative`}>
      {isComingSoon && (
        <div className={`absolute top-4 right-4 ${plusFeature ? 'bg-sky-500' : 'bg-blue-600'} text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center`}>
          {plusFeature ? 'Gervis+' : t('common.pro_version')}
        </div>
      )}
      <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white flex flex-wrap items-center">
        {title}
        {isComingSoon && (
          <span className="ml-2 text-white bg-blue-700 text-xs font-bold px-3 py-1 rounded-md mt-1">
            {t('common.coming_soon')}
          </span>
        )}
      </h3>
      <p className="text-gray-400">
        {description}
      </p>
    </div>
  );
}

export default function Features() {
  const { t } = useTranslation();
  
  const features = [
    {
      icon: <Users className="h-7 w-7 text-secondary" />,
      title: t('features.onboarding.title'),
      description: t('features.onboarding.description'),
      learnMoreColor: "text-secondary",
      isComingSoon: false
    },
    {
      icon: <LayoutDashboard className="h-7 w-7 text-accent" />,
      title: t('features.client_management.title'),
      description: t('features.client_management.description'),
      learnMoreColor: "text-accent",
      isComingSoon: false
    },
    {
      icon: <TrendingUp className="h-7 w-7 text-green-400" />,
      title: t('features.daily_market_update.title'),
      description: t('features.daily_market_update.description'),
      learnMoreColor: "text-green-400",
      isComingSoon: true,
      plusFeature: true
    },
    {
      icon: <UserCog className="h-7 w-7 text-purple-400" />,
      title: t('features.junior_sales_assistant.title'),
      description: t('features.junior_sales_assistant.description'),
      learnMoreColor: "text-purple-400",
      isComingSoon: true,
      plusFeature: true
    },
    {
      icon: <LineChart className="h-7 w-7 text-secondary" />,
      title: t('features.wealth_assessment.title'),
      description: t('features.wealth_assessment.description'),
      learnMoreColor: "text-secondary",
      isComingSoon: true
    },
    {
      icon: <BarChart className="h-7 w-7 text-accent" />,
      title: t('features.ai_allocation.title'),
      description: t('features.ai_allocation.description'),
      learnMoreColor: "text-accent",
      isComingSoon: true
    },
  ];

  return (
    <section id="features" className="py-20 bg-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            {t('features.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              learnMoreColor={feature.learnMoreColor}
              isComingSoon={feature.isComingSoon}
              plusFeature={feature.plusFeature}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
