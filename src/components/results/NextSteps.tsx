'use client';

import { ClipboardList, ExternalLink, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Signal, CategoryScore } from '@/lib/scanner/types';

interface NextStepsProps {
  signals: Signal[];
  categories: CategoryScore[];
  companyName: string;
  domain: string;
}

interface ChecklistItem {
  id: string;
  task: string;
  reason: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  searchQuery?: string;
}

export function NextSteps({ signals, categories, companyName, domain }: NextStepsProps) {
  const checklist = generateChecklist(signals, categories, companyName, domain);

  if (checklist.length === 0) {
    return null;
  }

  const highPriority = checklist.filter((item) => item.priority === 'High');
  const mediumPriority = checklist.filter((item) => item.priority === 'Medium');
  const lowPriority = checklist.filter((item) => item.priority === 'Low');

  return (
    <Card className="bg-[#0F0F14] border-[#27272A]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-[#F5F5F7] flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#8B5CF6]" />
          Recommended Next Steps
        </CardTitle>
        <p className="text-xs text-[#52525B] mt-1">
          Based on coverage gaps, here's what to verify manually during diligence
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {highPriority.length > 0 && (
          <PrioritySection
            title="High Priority"
            items={highPriority}
            color="text-[#F87171]"
            bgColor="bg-[#F87171]/10"
          />
        )}

        {mediumPriority.length > 0 && (
          <PrioritySection
            title="Medium Priority"
            items={mediumPriority}
            color="text-[#A78BFA]"
            bgColor="bg-[#A78BFA]/10"
          />
        )}

        {lowPriority.length > 0 && (
          <PrioritySection
            title="Lower Priority"
            items={lowPriority}
            color="text-[#6B7280]"
            bgColor="bg-[#6B7280]/10"
          />
        )}

        <div className="pt-4 border-t border-[#27272A]">
          <p className="text-xs text-[#52525B]">
            This checklist is auto-generated based on signals not found in public data.
            Items marked as found during the scan are not included.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PrioritySection({
  title,
  items,
  color,
  bgColor,
}: {
  title: string;
  items: ChecklistItem[];
  color: string;
  bgColor: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${bgColor} ${color}`}>
          {title}
        </span>
        <span className="text-xs text-[#52525B]">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-[#141419] hover:bg-[#1A1A21] transition-colors"
          >
            <Circle className="w-4 h-4 text-[#52525B] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#F5F5F7]">{item.task}</p>
              <p className="text-xs text-[#52525B] mt-1">{item.reason}</p>
            </div>
            {item.searchQuery && (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(item.searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded hover:bg-[#27272A] text-[#52525B] hover:text-[#8B5CF6] transition-colors"
                title="Search Google"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function generateChecklist(
  signals: Signal[],
  categories: CategoryScore[],
  companyName: string,
  domain: string
): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];
  const missingSignals = signals.filter((s) => !s.found);

  // Leadership verification
  const foundersMissing = missingSignals.find((s) => s.id === 'founders_identifiable');
  const teamPageMissing = missingSignals.find((s) => s.id === 'team_page');
  const linkedInMissing = missingSignals.find((s) => s.id === 'linkedin_company');

  if (foundersMissing) {
    checklist.push({
      id: 'verify_founders',
      task: 'Identify and verify founding team',
      reason: 'No founders or CEO publicly identifiable - request org chart or team bios',
      priority: 'High',
      completed: false,
      searchQuery: `"${companyName}" founder CEO linkedin`,
    });
  }

  if (linkedInMissing) {
    checklist.push({
      id: 'find_linkedin',
      task: 'Locate LinkedIn company page',
      reason: 'No LinkedIn presence found - verify company has official social accounts',
      priority: 'Medium',
      completed: false,
      searchQuery: `"${companyName}" site:linkedin.com/company`,
    });
  }

  // Financial verification
  const leadershipCategory = categories.find((c) => c.category === 'leadership');
  if (leadershipCategory && leadershipCategory.score < 10) {
    checklist.push({
      id: 'request_cap_table',
      task: 'Request cap table and ownership structure',
      reason: 'Limited leadership visibility - need to verify equity ownership',
      priority: 'High',
      completed: false,
    });
  }

  // Market validation
  const thirdPartyMissing = missingSignals.find((s) => s.id === 'third_party_mentions');
  const newsCoverageMissing = missingSignals.find((s) => s.id === 'news_coverage');

  if (thirdPartyMissing && newsCoverageMissing) {
    checklist.push({
      id: 'verify_customers',
      task: 'Request customer references',
      reason: 'No third-party mentions or press coverage found - verify customer base exists',
      priority: 'High',
      completed: false,
    });
  }

  const caseStudiesMissing = missingSignals.find((s) => s.id === 'case_studies');
  if (caseStudiesMissing) {
    checklist.push({
      id: 'request_case_studies',
      task: 'Request customer case studies or testimonials',
      reason: 'No public case studies found - need proof of customer success',
      priority: 'Medium',
      completed: false,
    });
  }

  // Operational verification
  const activeJobsMissing = missingSignals.find((s) => s.id === 'active_jobs');
  const careersPageMissing = missingSignals.find((s) => s.id === 'careers_page');

  if (activeJobsMissing && careersPageMissing) {
    checklist.push({
      id: 'verify_headcount',
      task: 'Request current headcount and org structure',
      reason: 'No careers page or active job listings - verify team size and hiring plans',
      priority: 'Medium',
      completed: false,
    });
  }

  // Identity verification
  const contactMissing = missingSignals.find((s) => s.id === 'contact_info');
  const locationMissing = missingSignals.find((s) => s.id === 'physical_location');

  if (contactMissing || locationMissing) {
    checklist.push({
      id: 'verify_entity',
      task: 'Verify legal entity and registered address',
      reason: 'Limited contact/location info - confirm legal incorporation details',
      priority: 'Medium',
      completed: false,
      searchQuery: `"${companyName}" registered office incorporation`,
    });
  }

  // Domain concerns
  const domainAgeMissing = missingSignals.find((s) => s.id === 'domain_age');
  if (domainAgeMissing) {
    checklist.push({
      id: 'verify_history',
      task: 'Verify company founding date and history',
      reason: 'Domain age not confirmed - verify when company was actually founded',
      priority: 'Low',
      completed: false,
      searchQuery: `"${companyName}" founded established history`,
    });
  }

  // Technology verification
  const techStackMissing = missingSignals.find((s) => s.id === 'tech_stack');
  if (techStackMissing) {
    checklist.push({
      id: 'tech_due_diligence',
      task: 'Request technology stack documentation',
      reason: 'Unable to detect tech stack - need technical architecture review',
      priority: 'Low',
      completed: false,
    });
  }

  // Always include financial request for private companies
  checklist.push({
    id: 'request_financials',
    task: 'Request audited financial statements',
    reason: 'Standard diligence requirement - request 3 years of P&L, balance sheet, cash flow',
    priority: 'High',
    completed: false,
  });

  return checklist;
}
