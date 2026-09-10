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
    title: 'مربی هوش مصنوعی',
    description: 'با مربی هوش مصنوعی چت کن، اهدافت را بگو و یک برنامه کاملاً شخصی بگیر.',
  },
  {
    action: 'quick',
    icon: Sparkles,
    title: 'ساخت سریع',
    description: 'با پروفایل و چند انتخاب، در یک مرحله برنامه حرفه‌ای بساز.',
  },
  {
    action: 'import',
    icon: Download,
    title: 'وارد کردن کد اشتراک',
    description: 'کد برنامه مربی یا دوستانت را بچسبان و به کتابخانه اضافه کن.',
  },
];

export function NoProgramGuide({ open }: { open: boolean }) {
  const { navigate } = useRouter();

  if (!open) return null;

  function go(action: ProgramsAction) {
    navigate('programs', { programsAction: action });
  }

  return (
    <div className="modal-overlay no-program-guide" role="dialog" aria-label="دریافت برنامه تمرینی">
      <div className="no-program-guide__card">
        <div className="no-program-guide__head">
          <h2>هنوز برنامه فعالی نداری</h2>
          <p>نحوه شروع را انتخاب کن — مستقیم همان‌جا می‌رویم.</p>
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
          پروفایل را کامل کن تا برنامه‌های هوش مصنوعی بهتر شوند
        </button>
        <p className="no-program-guide__hint">
          هدف، سطح آمادگی، تجهیزات و آسیب‌ها را در پروفایل اضافه کن تا مربی هوش مصنوعی برنامه دقیق‌تری بسازد.
        </p>
      </div>
    </div>
  );
}
