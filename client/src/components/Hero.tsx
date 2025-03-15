import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Hero() {
  const [, setLocation] = useLocation();

  return (
    <section id="hero" className="pt-32 pb-20 bg-black text-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              The Ultimate Tool for
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent"> Financial Consultants</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-xl">
              Robin empowers financial consultants with AI-driven tools to optimize client portfolios, 
              automate documentation, and deliver exceptional financial advice.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => setLocation("/app")}
                className="bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-white px-8 py-6"
                size="lg"
              >
                Get Started
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const featuresSection = document.getElementById('features');
                  if (featuresSection) {
                    window.scrollTo({
                      top: featuresSection.offsetTop - 80,
                      behavior: 'smooth'
                    });
                  }
                }}
                className="border-gray-700 text-white hover:bg-gray-800 px-8 py-6"
                size="lg"
              >
                Learn More
              </Button>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-secondary/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl"></div>
            <div className="relative z-10 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-black to-gray-900 px-4 py-2 border-b border-gray-800 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="ml-4 text-xs text-gray-400">Dashboard</div>
              </div>
              <div className="h-80 bg-black">
                {/* Dashboard preview */}
                <div className="grid grid-cols-2 gap-4 p-4 h-full">
                  <div className="col-span-2 bg-gray-800 rounded-lg h-24 flex items-center justify-center">
                    <div className="w-3/4 h-4 bg-gray-700 rounded"></div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="w-full h-3 bg-gray-700 rounded mb-2"></div>
                    <div className="w-3/4 h-3 bg-gray-700 rounded mb-2"></div>
                    <div className="w-1/2 h-3 bg-gray-700 rounded"></div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="w-full h-3 bg-gray-700 rounded mb-2"></div>
                    <div className="w-3/4 h-3 bg-gray-700 rounded mb-2"></div>
                    <div className="w-1/2 h-3 bg-gray-700 rounded"></div>
                  </div>
                  <div className="col-span-2 bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between mb-2">
                      <div className="w-1/3 h-3 bg-gray-700 rounded"></div>
                      <div className="w-1/4 h-3 bg-gray-700 rounded"></div>
                    </div>
                    <div className="w-full h-24 bg-gray-700 rounded-lg"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
