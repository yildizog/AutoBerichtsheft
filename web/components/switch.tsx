'use client';

export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="ios-switch"
      data-on={on ? 'true' : 'false'}
    >
      <span className="ios-switch-knob" />
    </button>
  );
}
