import { ArrowRight, LineChart, LayoutDashboard, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  learnMoreColor: string;
}

function FeatureCard({ icon, title, description, learnMoreColor }: FeatureCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-black rounded-2xl shadow-lg p-8 card-hover border border-gray-800 transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
      <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-gray-400 mb-6">
        {description}
      </p>
      <a href="#" className={`inline-flex items-center ${learnMoreColor} font-medium hover:opacity-80 transition-colors`}>
        {t('features.learn_more')}
        <ArrowRight className="h-5 w-5 ml-1" />
      </a>
    </div>
  );
}

export default function Features() {
  const { t } = useTranslation();
  
  const features = [
    {
      icon: <LineChart className="h-7 w-7 text-secondary" />,
      title: t('features.wealth_assessment.title'),
      description: t('features.wealth_assessment.description'),
      learnMoreColor: "text-secondary",
    },
    {
      icon: <LayoutDashboard className="h-7 w-7 text-accent" />,
      title: t('features.ai_allocation.title'),
      description: t('features.ai_allocation.description'),
      learnMoreColor: "text-accent",
    },
    {
      icon: <MessageCircle className="h-7 w-7 text-accent" />,
      title: t('features.intelligent_assistant.title'),
      description: t('features.intelligent_assistant.description'),
      learnMoreColor: "text-accent",
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              learnMoreColor={feature.learnMoreColor}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
