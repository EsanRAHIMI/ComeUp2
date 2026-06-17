import { Bot, ChevronRight, ClipboardList, Share2, Sparkles } from 'lucide-react';
import { useEffect, useState, type RefObject } from 'react';
import { CoachPlanImporter } from './CoachPlanImporter';
import { ShareCodeImport } from './ShareCodeImport';

export type ProgramCreatePanel = 'share' | 'coach' | null;

type Props = {
  onAiCoach: () => void;
  onQuickGenerate: () => void;
  panel: ProgramCreatePanel;
  onPanelChange: (panel: ProgramCreatePanel) => void;
  shareInputRef?: RefObject<HTMLInputElement | null>;
};

type OptionId = 'ai-coach' | 'quick' | 'share' | 'coach';

type Option = {
  id: OptionId;
  icon: typeof Bot;
  title: string;
  tagline: string;
  action: string;
  badge?: string;
};

const AI_OPTIONS: Option[] = [
  {
    id: 'ai-coach',
    icon: Bot,
    title: 'AI Coach',
    tagline: 'Chat about your goals and get a fully personalized plan.',
    action: 'Start chat',
    badge: 'Recommended',
  },
  {
    id: 'quick',
    icon: Sparkles,
    title: 'Quick generate',
    tagline: 'One-step AI program built from your profile.',
    action: 'Generate',
  },
];

const IMPORT_OPTIONS: Option[] = [
  {
    id: 'share',
    icon: Share2,
    title: 'Share code',
    tagline: 'Enter a code from your coach or a friend.',
    action: 'Enter code',
  },
  {
    id: 'coach',
    icon: ClipboardList,
    title: 'Coach plan text',
    tagline: 'Paste a written plan and schedule it on your calendar.',
    action: 'Paste plan',
  },
];

export function ProgramCreateHub({ onAiCoach, onQuickGenerate, panel, onPanelChange, shareInputRef }: Props) {
  const [highlightShare, setHighlightShare] = useState(false);

  useEffect(() => {
    if (panel !== 'share') return;
    setHighlightShare(true);
    const t = window.setTimeout(() => {
      document.getElementById('share-code-import')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      shareInputRef?.current?.focus();
      setHighlightShare(false);
    }, 120);
    return () => window.clearTimeout(t);
  }, [panel, shareInputRef]);

  function handleSelect(id: OptionId) {
    if (id === 'ai-coach') {
      onPanelChange(null);
      onAiCoach();
      return;
    }
    if (id === 'quick') {
      onPanelChange(null);
      onQuickGenerate();
      return;
    }
    if (id === 'share') {
      onPanelChange(panel === 'share' ? null : 'share');
      return;
    }
    onPanelChange(panel === 'coach' ? null : 'coach');
  }

  let step = 0;

  return (
    <section className="program-create-hub card" aria-label="Create a program">
      <header className="program-create-hub__head">
        <div className="program-create-hub__step-pill">Step 1 · Choose one</div>
        <h2>How do you want to get your program?</h2>
        <p className="program-create-hub__sub">Tap one option below. You can switch anytime before saving.</p>
      </header>

      <div className="program-create-hub__groups">
        <OptionGroup
          label="Build with AI"
          hint="Personalized to your profile"
          options={AI_OPTIONS}
          panel={panel}
          stepStart={++step}
          onSelect={handleSelect}
        />

        <div className="program-create-hub__divider" role="separator">
          <span>or import</span>
        </div>

        <OptionGroup
          label="Import existing"
          hint="From a coach or friend"
          options={IMPORT_OPTIONS}
          panel={panel}
          stepStart={step + AI_OPTIONS.length}
          onSelect={handleSelect}
        />
      </div>

      {panel === 'share' ? (
        <div className={`program-create-hub__panel ${highlightShare ? 'is-highlight' : ''}`} id="share-code-import">
          <div className="program-create-hub__panel-label">
            <span className="program-create-hub__panel-step">Step 2</span>
            <strong>Enter your share code</strong>
          </div>
          <ShareCodeImport inputRef={shareInputRef} />
        </div>
      ) : null}

      {panel === 'coach' ? (
        <div className="program-create-hub__panel">
          <CoachPlanImporter embedded open onClose={() => onPanelChange(null)} />
        </div>
      ) : null}

      {!panel ? (
        <p className="program-create-hub__footer-hint">Select an import option above to continue here, or start with AI Coach.</p>
      ) : null}
    </section>
  );
}

function OptionGroup({
  label,
  hint,
  options,
  panel,
  stepStart,
  onSelect,
}: {
  label: string;
  hint: string;
  options: Option[];
  panel: ProgramCreatePanel;
  stepStart: number;
  onSelect: (id: OptionId) => void;
}) {
  return (
    <div className="program-create-group">
      <div className="program-create-group__head">
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <ul className="program-create-list">
        {options.map((option, index) => {
          const step = stepStart + index;
          const isExpanded =
            (option.id === 'share' && panel === 'share') || (option.id === 'coach' && panel === 'coach');
          const Icon = option.icon;
          return (
            <li key={option.id}>
              <button
                type="button"
                className={`program-create-option ${isExpanded ? 'is-selected' : ''}`}
                onClick={() => onSelect(option.id)}
                aria-expanded={option.id === 'share' || option.id === 'coach' ? isExpanded : undefined}
              >
                <span className="program-create-option__step">{step}</span>
                <span className="program-create-option__icon">
                  <Icon size={18} />
                </span>
                <span className="program-create-option__body">
                  <span className="program-create-option__title-row">
                    <strong>{option.title}</strong>
                    {option.badge ? <span className="program-create-option__badge">{option.badge}</span> : null}
                  </span>
                  <small>{option.tagline}</small>
                </span>
                <span className="program-create-option__action">
                  {option.action}
                  <ChevronRight size={16} className={isExpanded ? 'rot-90' : ''} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
