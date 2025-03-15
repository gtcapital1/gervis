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
  const features = [
    {
      icon: <LineChart className="h-7 w-7 text-secondary" />,
      title: "Wealth Assessment",
      description: "Comprehensive analysis of client portfolios with detailed risk assessments and opportunity identification.",
      learnMoreColor: "text-secondary",
    },
    {
      icon: <LayoutDashboard className="h-7 w-7 text-accent" />,
      title: "AI-Powered Allocation",
      description: "Advanced algorithms that analyze market trends and optimize client portfolios for maximum returns.",
      learnMoreColor: "text-accent",
    },
    {
      icon: <MessageCircle className="h-7 w-7 text-accent" />,
      title: "Intelligent Assistant",
      description: "Automatically track client conversations and generate compliance-ready documentation with AI.",
      learnMoreColor: "text-accent",
    },
  ];

  return (
    <section id="features" className="py-20 bg-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Powerful Features for Financial Excellence
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Watson provides cutting-edge tools that transform how financial consultants work.
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
