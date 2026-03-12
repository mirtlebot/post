export function IconButton({ icon, title, className = '', ...props }) {
  const Icon = icon;
  return (
    <div className="tooltip tooltip-bottom" data-tip={title}>
      <button className={`btn btn-circle btn-md icon-button ${className}`.trim()} type="button" {...props}>
        <Icon className="size-5" strokeWidth={2.1} />
      </button>
    </div>
  );
}
