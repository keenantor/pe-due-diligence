'use client';

import { Clock, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EffortEstimate as EffortEstimateType } from '@/lib/scanner/types';

interface EffortEstimateProps {
  estimate: EffortEstimateType | undefined;
}

const levelConfig = {
  Low: {
    icon: CheckCircle,
    color: 'text-[#6B7280]',
    bgColor: 'bg-[#6B7280]/10',
    borderColor: 'border-[#6B7280]/30',
    description: 'Validation-focused diligence should be sufficient',
    hours: '4-8 hours',
  },
  Medium: {
    icon: AlertCircle,
    color: 'text-[#8B5CF6]',
    bgColor: 'bg-[#8B5CF6]/10',
    borderColor: 'border-[#8B5CF6]/30',
    description: 'Standard diligence process with targeted research',
    hours: '16-32 hours',
  },
  High: {
    icon: AlertTriangle,
    color: 'text-[#A78BFA]',
    bgColor: 'bg-[#A78BFA]/10',
    borderColor: 'border-[#A78BFA]/30',
    description: 'Extended diligence timeline expected',
    hours: '40+ hours',
  },
};

export function EffortEstimate({ estimate }: EffortEstimateProps) {
  // Handle undefined or missing estimate
  if (!estimate || !estimate.level) {
    return (
      <Card className="bg-[#0F0F14] border-[#27272A]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-[#F5F5F7] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#71717A]" />
            Estimated Diligence Effort
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#71717A]">Unable to estimate effort level.</p>
        </CardContent>
      </Card>
    );
  }

  const config = levelConfig[estimate.level] || levelConfig.Medium;
  const Icon = config.icon;

  return (
    <Card className="bg-[#0F0F14] border-[#27272A]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-[#F5F5F7] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#71717A]" />
          Estimated Diligence Effort
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${config.bgColor}`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge
                variant="outline"
                className={`${config.color} ${config.borderColor}`}
              >
                {estimate.level} Effort
              </Badge>
              <span className="text-sm text-[#52525B]">~{config.hours}</span>
            </div>
            <p className="text-sm text-[#71717A] mb-3">{config.description}</p>

            {estimate.reasons && estimate.reasons.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#27272A]">
                <p className="text-xs text-[#52525B] mb-2 uppercase tracking-wider">Key Factors</p>
                <ul className="space-y-1.5">
                  {estimate.reasons.map((reason, index) => (
                    <li
                      key={index}
                      className="text-sm text-[#A1A1AA] flex items-start gap-2"
                    >
                      <span className="text-[#8B5CF6] mt-1">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
