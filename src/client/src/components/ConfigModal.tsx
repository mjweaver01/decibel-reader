import { useEffect } from 'react';
import { Configuration } from './Configuration';
import type { AppConfig } from '@shared/types';
import type { MediaDeviceInfo } from '../hooks/useAudioCapture';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (config: Partial<AppConfig>) => Promise<void>;
  devices: MediaDeviceInfo[];
}

export function ConfigModal({
  isOpen,
  onClose,
  config,
  onSave,
  devices,
}: ConfigModalProps) {
  const handleSave = async (updates: Partial<AppConfig>) => {
    await onSave(updates);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel - bottom sheet on mobile, centered on desktop */}
      <div
        className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-zinc-900 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:mx-4 transition-transform duration-200 ease-out"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-700/50 bg-zinc-900 px-4 py-3 sm:px-6">
          <h2 id="config-modal-title" className="text-lg font-semibold text-zinc-100">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 touch-manipulation"
            aria-label="Close settings"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          <Configuration config={config} onSave={handleSave} devices={devices} embedded />
        </div>
      </div>
    </div>
  );
}
