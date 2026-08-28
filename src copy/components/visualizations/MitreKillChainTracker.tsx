import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ShieldCheck,
  Target
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSound } from '@/contexts/SoundContext';
import type { AttackScenario } from '@/utils/simulationPresets';

const MITRE_KILL_CHAIN = [
  {
    stage: 'Reconnaissance',
    tacticId: 'TA0043',
    technique: 'T1595: Active Scanning',
    desc: 'Probing network boundaries, port scans, OS fingerprinting.',
    telemetry: 'High SYN rate, port entropy, RST spikes'
  },
  {
    stage: 'Initial Access',
    tacticId: 'TA0001',
    technique: 'T1190: Exploit Public App',
    desc: 'Infiltration via exposed service or unauthenticated gateway.',
    telemetry: 'Inbound session burst, payload size anomalies'
  },
  {
    stage: 'Execution & Discovery',
    tacticId: 'TA0007',
    technique: 'T1046: Network Service Discovery',
    desc: 'Enumerating internal host services, accounts and shares.',
    telemetry: 'Internal sweep, atypical DNS query rate'
  },
  {
    stage: 'Lateral Movement',
    tacticId: 'TA0008',
    technique: 'T1021: Remote Services (SMB/RDP)',
    desc: 'Pivoting across subnets using administrative tokens.',
    telemetry: 'Port 445/3389 cross-talk, Kerberos ticket bursts'
  },
  {
    stage: 'Exfiltration / Impact',
    tacticId: 'TA0010',
    technique: 'T1041: Exfiltration Over C2',
    desc: 'Data exfiltration or volumetric resource exhaustion.',
    telemetry: 'Asymmetric outbound byte ratio, beaconing cadence'
  }
];

interface MitreKillChainTrackerProps {
  scenario: AttackScenario;
  className?: string;
}

export function MitreKillChainTracker({ scenario, className }: MitreKillChainTrackerProps) {
  const { play } = useSound();
  const activeIndex = scenario.mitreStageIndex ?? 0;
  const [selectedStage, setSelectedStage] = useState<number>(activeIndex);

  useEffect(() => {
    setSelectedStage(scenario.mitreStageIndex ?? 0);
  }, [scenario.mitreStageIndex]);

  const isAttack = scenario.status === 'ATTACK_LIKELY';
  const currentStageInfo = MITRE_KILL_CHAIN[selectedStage] || MITRE_KILL_CHAIN[0]!;

  return (
    <div className={cn('glass-panel rounded-2xl p-5 border border-border-default/60 space-y-5 font-sans', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-electric-400" />
            <h3 className="text-body font-semibold text-text-primary">
              MITRE ATT&CK® Infiltration Progression
            </h3>
          </div>
          <p className="text-caption text-text-muted mt-0.5">
            Real-time causal mapping of anticipated attacker progression across the kill chain
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-caption text-text-muted">Current Forecast:</span>
          <span className={cn(
            'px-2.5 py-1 rounded-full text-caption font-semibold uppercase tracking-wider',
            isAttack ? 'bg-critical-500/20 text-critical-300 border border-critical-500/40 animate-pulse' : 'bg-secure-500/20 text-secure-300 border border-secure-500/40'
          )}>
            {scenario.mitreStage}
          </span>
        </div>
      </div>

      {/* Kill Chain Pipeline Nodes */}
      <div className="relative">
        {/* Connecting Progress Line */}
        <div className="absolute top-1/2 left-4 right-4 h-1 -translate-y-1/2 bg-surface-800 rounded-full z-0 hidden sm:block">
          <div
            className="h-full bg-gradient-to-r from-electric-500 via-amber-500 to-critical-500 rounded-full transition-all duration-700"
            style={{
              width: `${(Math.min(activeIndex, MITRE_KILL_CHAIN.length - 1) / (MITRE_KILL_CHAIN.length - 1)) * 100}%`
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 relative z-10">
          {MITRE_KILL_CHAIN.map((item, index) => {
            const isCompleted = index < activeIndex;
            const isCurrent = index === activeIndex;
            const isSelected = index === selectedStage;

            return (
              <button
                key={item.stage}
                type="button"
                onClick={() => {
                  play('click');
                  setSelectedStage(index);
                }}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between relative group',
                  isSelected
                    ? 'bg-surface-800 border-electric-500 shadow-md ring-1 ring-electric-500/50'
                    : isCurrent
                    ? 'bg-surface-850 border-critical-500/60'
                    : isCompleted
                    ? 'bg-surface-900/90 border-electric-500/30 text-text-secondary'
                    : 'bg-surface-900/50 border-border-subtle/50 text-text-muted opacity-70'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold',
                    isCurrent
                      ? 'bg-critical-500 text-white shadow-sm animate-pulse'
                      : isCompleted
                      ? 'bg-electric-500 text-white'
                      : 'bg-surface-800 text-text-muted'
                  )}>
                    {index + 1}
                  </span>

                  <span className="text-[10px] text-text-muted font-medium">
                    {item.tacticId}
                  </span>
                </div>

                <div>
                  <h4 className="text-caption font-semibold text-text-primary line-clamp-1">
                    {item.stage}
                  </h4>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">
                    {item.technique}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-border-subtle/40 flex items-center justify-between text-[10px]">
                  <span className={cn(
                    'font-medium',
                    isCurrent ? 'text-critical-400' : isCompleted ? 'text-electric-400' : 'text-text-muted'
                  )}>
                    {isCurrent ? 'IMMINENT' : isCompleted ? 'CONFIRMED' : 'PROJECTED'}
                  </span>
                  <ChevronRight className="w-3 h-3 text-text-muted group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Deep Dive & Automated Defender Rules */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedStage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 rounded-xl bg-surface-900/80 border border-border-subtle"
        >
          {/* Stage Details */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-electric-500/20 text-electric-300">
                STAGE {selectedStage + 1} OF 5
              </span>
              <h4 className="text-body font-bold text-text-primary">
                {currentStageInfo.stage} ({currentStageInfo.tacticId})
              </h4>
            </div>
            <p className="text-body-sm text-text-secondary">
              {currentStageInfo.desc}
            </p>
            <div className="pt-1 text-[11px] text-text-muted">
              <strong className="text-text-secondary">Signature Telemetry:</strong> {currentStageInfo.telemetry}
            </div>
          </div>

          {/* Proactive Defender Playbook */}
          <div className="lg:col-span-6 space-y-2 lg:border-l lg:border-border-subtle lg:pl-4">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-secure-400" />
                <span>Proactive Countermeasure Playbook</span>
              </span>
              <span className="text-[10px] text-electric-400 font-medium">
                Auto-Synthesized
              </span>
            </div>

            <div className="space-y-2">
              {scenario.defenderRecommendations.slice(0, 2).map((rec, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-surface-950/70 border border-border-subtle/80 text-caption space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{rec.action}</span>
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded',
                      rec.priority === 'CRITICAL' ? 'bg-critical-500/20 text-critical-300' : 'bg-amber-500/20 text-amber-300'
                    )}>
                      {rec.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-300 bg-surface-900/90 px-2 py-1 rounded border border-border-subtle">
                    {rec.rule}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
