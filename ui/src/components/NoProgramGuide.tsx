import { Bot, Download, Sparkles, UserRound } from 'lucide-react';
import { useRouter, type ProgramsAction } from '../hooks/useRouter';

type Option = {
  action: ProgramsAction;
  icon: typeof Bot;
  title: string;
  description: string;
};

const OPTIONS: Option[] = [
  {
    action: 'gpt',
    icon: Bot,
    title: 'AI Coach',
    description: 'Chat with your AI coach, describe your goals, and get a fully personalized plan.',
  },
  {
    action: 'quick',
    icon: Sparkles,
    title: 'Quick generate',
    description: 'Build a professional AI program in one step using your profile and a few choices.',
  },
  {
    action: 'import',
    icon: Download,
    title: 'Import a share code',
    description: 'Paste a program code from your coach or friends and add it to your library.',
  },
];

export function NoProgramGuide({ open }: { open: boolean }) {
  const { navigate } = useRouter();

  if (!open) return null;

  function go(action: ProgramsAction) {
    navigate('programs', { programsAction: action });
  }

  return (
    <div className="modal-overlay no-program-guide" role="dialog" aria-label="Get a training program">
      <div className="no-program-guide__card">
        <div className="no-program-guide__head">
          <h2>No active program yet</h2>
          <p>Pick how you want to get started — we&apos;ll take you straight there.</p>
        </div>

        <ul className="no-program-guide__list">
          {OPTIONS.map(({ action, icon: Icon, title, description }) => (
            <li key={action}>
              <button type="button" className="no-program-guide__option" onClick={() => go(action)}>
                <span className="no-program-guide__option-icon">
                  <Icon size={20} />
                </span>
                <span className="no-program-guide__option-text">
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className="btn btn--primary btn--block btn--lg no-program-guide__profile" onClick={() => navigate('profile')}>
          <UserRound size={18} />
          Complete your profile for better AI programs
        </button>
        <p className="no-program-guide__hint">
          Add your goal, fitness level, equipment, and injuries in Profile so the AI coach can build a more accurate plan.
        </p>
      </div>
    </div>
  );
}
