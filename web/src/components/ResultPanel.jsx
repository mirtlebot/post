import { icons } from '../icons/Icons.jsx';
import { IconButton } from './IconButton.jsx';

export function ResultPanel({ onCopy, result }) {
  if (!result) return null;

  return (
    <section className="panel-box animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <a className="truncate text-lg font-semibold text-info hover:underline" href={result.surl} rel="noreferrer" target="_blank">
          {result.surl}
        </a>
        <div className="flex gap-2">
          <IconButton icon={icons.copy} onClick={() => onCopy(result.surl)} title="Copy" />
          <IconButton icon={icons.open} onClick={() => window.open(result.surl, '_blank', 'noreferrer')} title="Open" />
        </div>
      </div>
    </section>
  );
}
