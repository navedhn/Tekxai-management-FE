import React from 'react';
import { Check, X } from 'lucide-react';
import { getPasswordRequirements } from '@/utils/validationSchemas';
import { cn } from '@/utils/cn';

interface PasswordValidatorProps {
  password: string;
  className?: string;
}

const PasswordValidator: React.FC<PasswordValidatorProps> = ({ password, className }) => {
  const reqs = getPasswordRequirements(password);
  
  const rules = [
    { label: '8 to 16 characters', met: reqs.length },
    { label: 'At least 1 uppercase letter', met: reqs.uppercase },
    { label: 'At least 1 number', met: reqs.number },
    { label: 'At least 1 special character', met: reqs.special },
  ];

  // Calculate strength percentage
  const metCount = Object.values(reqs).filter(Boolean).length;
  const strengthPercent = (metCount / 5) * 100;
  
  let strengthLabel = 'Weak';
  let strengthColor = 'bg-red-500';
  
  if (metCount >= 5) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-green-500';
  } else if (metCount >= 3) {
    strengthLabel = 'Medium';
    strengthColor = 'bg-yellow-500';
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", strengthColor)}
            style={{ width: `${strengthPercent}%` }}
          />
        </div>
        <span className={cn("text-xs font-black uppercase tracking-widest", metCount >= 5 ? "text-green-600" : metCount >= 3 ? "text-yellow-600" : "text-red-600")}>
          {strengthLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={cn(
              "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors",
              rule.met ? "bg-green-100" : "bg-red-100"
            )}>
              {rule.met ? (
                <Check size={10} className="text-green-600 stroke-[3]" />
              ) : (
                <X size={10} className="text-red-600 stroke-[3]" />
              )}
            </div>
            <span className={cn(
              "text-xs font-bold transition-colors",
              rule.met ? "text-green-600" : "text-red-500"
            )}>
              {rule.label}
            </span>
          </div>
        ))}
        {/* Lowercase check isn't in the specific image checklist but is in global rules */}
        <div className="flex items-center gap-2">
            <div className={cn(
              "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors",
              reqs.lowercase ? "bg-green-100" : "bg-red-100"
            )}>
              {reqs.lowercase ? (
                <Check size={10} className="text-green-600 stroke-[3]" />
              ) : (
                <X size={10} className="text-red-600 stroke-[3]" />
              )}
            </div>
            <span className={cn(
              "text-xs font-bold transition-colors",
              reqs.lowercase ? "text-green-600" : "text-red-500"
            )}>
              At least 1 lowercase letter
            </span>
          </div>
      </div>
    </div>
  );
};

export default PasswordValidator;
