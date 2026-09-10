import { Bot, Download, Sparkles, UserRound } from 'lucide-react';
import { useRouter, type ProgramsAction } from '../hooks/useRouter';
import { useT } from '../i18n/LocaleProvider';

export function NoProgramGuide({ open }: { open: boolean }) {
  const fa = useT();
  const { navigate } = useRouter();

  const options: Array<{
    action: ProgramsAction;
    icon: typeof Bot;
    title: string;
    description: string;
  }> = [
    {
      action: 'gpt',
      icon: Bot,
      title: fa.noProgram.aiTitle,
      description: fa.noProgram.aiBody,
    },
    {
      action: 'quick',
      icon: Sparkles,
      title: fa.noProgram.quickTitle,
      description: fa.noProgram.quickBody,
    },
    {
      action: 'import',
      icon: Download,
      title: fa.noProgram.shareTitle,
      description: fa.noProgram.shareBody,
    },
  ];

  if (!open) return null;

  function go(action: ProgramsAction) {
    navigate('programs', { programsAction: action });
  }

  return (
    <div className="modal-overlay no-program-guide" role="dialog" aria-label={fa.noProgram.aria}>
      <div className="no-program-guide__card">
        <div className="no-program-guide__head">
          <h2>{fa.noProgram.title}</h2>
          <p>{fa.noProgram.body}</p>
        </div>

        <ul className="no-program-guide__list">
          {options.map(({ action, icon: Icon, title, description }) => (
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
          {fa.noProgram.completeProfile}
        </button>
        <p className="no-program-guide__hint">{fa.noProgram.completeBody}</p>
      </div>
    </div>
  );
}
