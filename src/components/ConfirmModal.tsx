import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-sm rounded-3xl bg-[#f7f8fb] dark:bg-[#1b1c2a] border border-slate-200/80 dark:border-white/10 p-6 shadow-2xl">
        <h3
          id="confirm-modal-title"
          className="text-base font-semibold text-slate-900 dark:text-[#eceaf6] mb-2"
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-[#a8a6be] mb-6">
          {description}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-[#c7c5da] bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] px-5 py-2 rounded-xl text-sm font-medium text-white transition-colors whitespace-nowrap ${
              destructive
                ? 'bg-[#8f5768] hover:bg-[#7d4959]'
                : 'bg-[#645f8c] hover:bg-[#57527c]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
