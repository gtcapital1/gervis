import { 
  CheckCircle, Award, TrendingUp, Users, 
  FileText, Zap
} from "lucide-react";

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
  const benefits = [
    {
      icon: <CheckCircle className="h-8 w-8" />,
      title: "Save 10+ Hours Weekly",
      description: "Automate routine tasks and documentation, freeing up more time to focus on client relationships.",
      iconColor: "text-secondary",
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Reduce Errors by 95%",
      description: "AI-powered checks and balances ensure your recommendations and documentation are error-free.",
      iconColor: "text-accent",
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Grow AUM by 30%",
      description: "Serve more clients effectively and increase assets under management with optimized workflows.",
      iconColor: "text-success",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Improve Client Satisfaction",
      description: "Deliver more personalized service and faster responses to client inquiries and needs.",
      iconColor: "text-warning",
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Compliance Made Simple",
      description: "Automatically generate compliant documentation and reduce regulatory risks.",
      iconColor: "text-secondary",
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Instant Insights",
      description: "Access real-time market data and AI-powered analytics to make informed decisions quickly.",
      iconColor: "text-accent",
    },
  ];

  return (
    <section id="benefits" className="py-20 bg-black text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Transform Your Financial Practice
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Join consultants who are saving time, reducing errors, and growing their business with Watson.
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
