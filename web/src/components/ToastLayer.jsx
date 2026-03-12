export function ToastLayer({ toast, onClose }) {
  if (!toast) return null;
  const tone = toast.kind === 'error' ? 'alert-error' : 'alert-success';

  return (
    <div className="toast toast-end toast-top z-50">
      <div className={`alert ${tone} shadow-lg`}>
        <span>{toast.message}</span>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
