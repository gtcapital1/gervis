import { 
  CheckCircle, Award, TrendingUp, Users, 
  FileText, Zap
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconColor: string;
}

function BenefitCard({ icon, title, description, iconColor }: BenefitCardProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className={`mb-4 ${iconColor}`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
      <p className="text-gray-400">
        {description}
      </p>
    </div>
  );
}

export default function Benefits() {
  const { t } = useTranslation();
  
  const benefits = [
    {
      icon: <CheckCircle className="h-8 w-8" />,
      title: t('benefits.items.save_time.title'),
      description: t('benefits.items.save_time.description'),
      iconColor: "text-secondary",
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: t('benefits.items.reduce_errors.title'),
      description: t('benefits.items.reduce_errors.description'),
      iconColor: "text-accent",
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: t('benefits.items.grow_aum.title'),
      description: t('benefits.items.grow_aum.description'),
      iconColor: "text-success",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: t('benefits.items.improve_satisfaction.title'),
      description: t('benefits.items.improve_satisfaction.description'),
      iconColor: "text-warning",
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: t('benefits.items.compliance.title'),
      description: t('benefits.items.compliance.description'),
      iconColor: "text-secondary",
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: t('benefits.items.insights.title'),
      description: t('benefits.items.insights.description'),
      iconColor: "text-accent",
    },
  ];

  return (
    <section id="benefits" className="py-20 bg-black text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            {t('benefits.title')}
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            {t('benefits.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <BenefitCard
              key={index}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
              iconColor={benefit.iconColor}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
