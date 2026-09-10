import { Bot, ChevronRight, ClipboardList, Share2, Sparkles } from 'lucide-react';
import { useEffect, useState, type RefObject } from 'react';
import { useT } from '../i18n/LocaleProvider';
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

export function ProgramCreateHub({ onAiCoach, onQuickGenerate, panel, onPanelChange, shareInputRef }: Props) {
  const fa = useT();
  const AI_OPTIONS: Option[] = [
    {
      id: 'ai-coach',
      icon: Bot,
      title: fa.createHub.buildWithAi,
      tagline: fa.createHub.aiTagline,
      action: fa.createHub.startChat,
      badge: fa.createHub.recommended,
    },
    {
      id: 'quick',
      icon: Sparkles,
      title: fa.generate.title,
      tagline: fa.createHub.quickTagline,
      action: fa.createHub.generate,
    },
  ];
  const IMPORT_OPTIONS: Option[] = [
    {
      id: 'share',
      icon: Share2,
      title: fa.createHub.shareTitle,
      tagline: fa.createHub.shareTagline,
      action: fa.createHub.enterCode,
    },
    {
      id: 'coach',
      icon: ClipboardList,
      title: fa.createHub.coachTitle,
      tagline: fa.createHub.coachTagline,
      action: fa.createHub.pastePlan,
    },
  ];
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
    <section className="program-create-hub card" aria-label={fa.createHub.aria}>
      <header className="program-create-hub__head">
        <div className="program-create-hub__step-pill">{fa.createHubExtra.step1}</div>
        <h2>{fa.createHubExtra.howTitle}</h2>
        <p className="program-create-hub__sub">{fa.createHubExtra.howSub}</p>
      </header>

      <div className="program-create-hub__groups">
        <OptionGroup
          label={fa.createHub.buildWithAi}
          hint={fa.createHub.buildHint}
          options={AI_OPTIONS}
          panel={panel}
          stepStart={++step}
          onSelect={handleSelect}
        />

        <div className="program-create-hub__divider" role="separator">
          <span>{fa.createHubExtra.orImport}</span>
        </div>

        <OptionGroup
          label={fa.createHub.importExisting}
          hint={fa.createHub.importHint}
          options={IMPORT_OPTIONS}
          panel={panel}
          stepStart={step + AI_OPTIONS.length}
          onSelect={handleSelect}
        />
      </div>

      {panel === 'share' ? (
        <div className={`program-create-hub__panel ${highlightShare ? 'is-highlight' : ''}`} id="share-code-import">
          <div className="program-create-hub__panel-label">
            <span className="program-create-hub__panel-step">{fa.createHubExtra.step2}</span>
            <strong>{fa.createHubExtra.enterShare}</strong>
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
        <p className="program-create-hub__footer-hint">{fa.createHubExtra.footerHint}</p>
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
