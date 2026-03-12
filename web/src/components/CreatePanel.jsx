import { useRef, useState } from 'react';
import { icons } from '../icons/Icons.jsx';
import { useComposer } from '../hooks/useComposer.js';

export function CreatePanel(props) {
  const composer = useComposer(props);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const CloseIcon = icons.close;
  const FileBadgeIcon = icons.fileBadge;
  const PathIcon = icons.hash;
  const TtlIcon = icons.clock;
  const convertMeta = {
    none: { icon: icons.sparkles, label: 'none' },
    md2html: { icon: icons.sparkles, label: 'md2html' },
    qrcode: { icon: icons.hash, label: 'qrcode' },
    html: { icon: icons.fileBadge, label: 'html' },
    url: { icon: icons.link, label: 'url' },
    text: { icon: icons.hash, label: 'text' },
  };
  const CurrentConvertIcon = convertMeta[composer.form.convert]?.icon || icons.sparkles;

  function openPicker() {
    fileInputRef.current?.click();
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    composer.setFile(event.dataTransfer.files?.[0] || null);
  }

  return (
    <section className="panel-box composer-panel">
      <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-base-content/55">Composer</div>
      <form className="grid gap-3 animate-fade-up" onSubmit={composer.submit}>
        <div
          className={`composer-shell ${dragging ? 'composer-shell-dragging' : ''}`}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          {composer.fileMeta ? (
            <div className="file-card group">
              <button className="btn btn-ghost btn-xs file-card-close" onClick={composer.reset} type="button">
                <CloseIcon className="size-4" strokeWidth={2.2} />
              </button>
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-base-100 p-3 text-info shadow-sm">
                  <FileBadgeIcon className="size-5" strokeWidth={2.1} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold">{composer.fileMeta.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-base-content/60">
                    <span>{composer.fileMeta.type}</span>
                    <span>{composer.fileMeta.size}</span>
                    <span>File</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="composer-editor">
              <textarea
                className="textarea textarea-ghost composer-textarea"
                onChange={composer.set('url')}
                onKeyDown={composer.onShortcut}
                placeholder="Input text here or drag and drop file"
                value={composer.form.url}
              />
              <div className="tooltip tooltip-left composer-upload-wrap" data-tip="Upload file">
                <button className="btn btn-ghost btn-sm composer-upload" onClick={openPicker} type="button">
                  <icons.file className="size-4 opacity-60" strokeWidth={2.1} />
                </button>
              </div>
            </div>
          )}
          <input className="hidden" onChange={(e) => composer.setFile(e.target.files?.[0] || null)} ref={fileInputRef} type="file" />
        </div>
        <div className="toolbar-grid">
          <div className="field-shell field-shell-fixed input input-bordered">
            <PathIcon className="size-4 opacity-60" strokeWidth={2} />
            <input className="grow" onChange={composer.set('path')} placeholder="custom/path" value={composer.form.path} />
          </div>
          <div className="field-shell field-shell-fixed input input-bordered">
            <TtlIcon className="size-4 opacity-60" strokeWidth={2} />
            <input className="grow" onChange={composer.set('ttl')} placeholder="1440" value={composer.form.ttl} />
            <span className="opacity-55">mins</span>
          </div>
          {composer.file ? (
            <div className="field-shell field-shell-fixed input input-bordered">
              <FileBadgeIcon className="size-4 opacity-60" strokeWidth={2} />
              <input disabled value="file" />
            </div>
          ) : (
            <div className="select-shell">
              <CurrentConvertIcon className="select-shell-icon size-4 opacity-60" strokeWidth={2} />
              <select className="select select-bordered select-shell-input" onChange={composer.set('convert')} value={composer.form.convert}>
                <option value="none">none</option>
                <option value="md2html">md2html</option>
                <option value="qrcode">qrcode</option>
                <option value="html">html</option>
                <option value="url">url</option>
                <option value="text">text</option>
              </select>
            </div>
          )}
          <button className={`btn field-shell field-action field-action-button h-12 min-h-12 self-end rounded-[1.2rem] px-4 ${composer.canSubmit ? 'field-action-active' : 'field-action-inactive'}`} disabled={!composer.canSubmit} type="submit">
            <icons.send className="size-4" strokeWidth={2.2} />
            <span>Post</span>
          </button>
        </div>
      </form>
    </section>
  );
}
