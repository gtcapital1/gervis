import React from "react";

interface StepProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  completed?: boolean;
  active?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface StepsProps {
  currentStep: number;
  className?: string;
  children: React.ReactNode;
}

export function Step({
  title,
  description,
  icon,
  completed,
  active,
  className,
  children
}: StepProps) {
  return (
    <div className={`step ${className || ""}`}>
      {children}
    </div>
  );
}

export function Steps({ currentStep, className, children }: StepsProps) {
  const steps = React.Children.toArray(children);
  
  return (
    <div className={`flex justify-between mb-4 ${className || ""}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        
        if (!React.isValidElement(step)) {
          return null;
        }
        
        return (
          <div 
            key={index} 
            className={`flex flex-col items-center justify-center ${index < steps.length - 1 ? "w-full" : ""}`}
          >
            <div className="flex items-center justify-center relative w-full">
              <div 
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium z-10
                  ${isCompleted 
                    ? "bg-green-500 text-white" 
                    : isActive 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-200 text-gray-600"}
                `}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div 
                  className={`
                    absolute top-4 h-1 left-8 right-0 -translate-y-1/2
                    ${isCompleted ? "bg-green-500" : "bg-gray-200"}
                  `}
                />
              )}
            </div>
            
            <div className="text-center mt-2 w-full">
              <p 
                className={`
                  text-sm font-medium
                  ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"}
                `}
              >
                {React.isValidElement(step) && step.props.title}
              </p>
              {React.isValidElement(step) && step.props.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {step.props.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 