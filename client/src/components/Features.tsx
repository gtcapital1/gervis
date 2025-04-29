import { Users, LayoutDashboard, LineChart, BarChart, TrendingUp, UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  learnMoreColor: string;
  plusFeature?: boolean;
  proFeature?: boolean;
}

function FeatureCard({ icon, title, description, learnMoreColor, plusFeature, proFeature }: FeatureCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg p-8 card-hover border border-gray-700 transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl relative overflow-hidden">
      {plusFeature && (
        <div className="absolute top-4 right-4 bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center">
          Gervis+
        </div>
      )}
      {proFeature && (
        <div className="absolute top-4 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center">
          Gervis PRO
        </div>
      )}
      <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white flex flex-wrap items-center">
        {title}
      </h3>
      <p className="text-gray-300">
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
      title: t('features.smart_crm.title'),
      description: t('features.smart_crm.description'),
      learnMoreColor: "text-secondary"
    },
    {
      icon: <UserCog className="h-7 w-7 text-sky-500" />,
      title: t('features.junior_assistant.title'),
      description: t('features.junior_assistant.description'),
      learnMoreColor: "text-sky-500",
      plusFeature: true
    },
    {
      icon: <LineChart className="h-7 w-7 text-green-400" />,
      title: t('features.portfolio_intelligence.title'),
      description: "L'intelligenza artificiale ti assiste nella costruzione di portafogli d'investimento personalizzati per i tuoi clienti, ottimizzando l'allocazione in base al profilo di rischio e agli obiettivi finanziari.",
      learnMoreColor: "text-green-400",
      proFeature: true
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
              plusFeature={feature.plusFeature}
              proFeature={feature.proFeature}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
