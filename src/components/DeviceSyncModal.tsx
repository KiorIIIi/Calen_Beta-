import React, { useState } from 'react';
import { Task, IntegrationSettings } from '../types';
import { 
  X, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  Radio, 
  Share2, 
} from 'lucide-react';
import { exportWorkspaceJSON, importWorkspaceJSON, generateDeviceSyncUrl } from '../services/crossDeviceSync';

interface Props {
  tasks: Task[];
  settings: IntegrationSettings;
  isOpen: boolean;
  onClose: () => void;
  onImportWorkspace: (tasks: Task[], settings: IntegrationSettings) => void;
}

export const DeviceSyncModal: React.FC<Props> = ({
  tasks,
  settings,
  isOpen,
  onClose,
  onImportWorkspace,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const pairingCode = `CALEN-${(tasks.length * 137 + 1024).toString(16).toUpperCase()}`;
  const syncUrl = generateDeviceSyncUrl(tasks, settings);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const data = await importWorkspaceJSON(file);
      onImportWorkspace(data.tasks, data.settings);
      onClose();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Failed to import backup');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs transition-opacity">
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#d4d4d4] rounded-xl shadow-xl border border-[#e5e4e0] dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e7e3] dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f4f1f8] border border-[#ded5e9] flex items-center justify-center text-[#5b3c77]">
              <Smartphone className="w-5 h-5 opacity-80" />
            </div>
            <div>
              <h3 className="font-semibold text-[#37352f] dark:text-neutral-100 text-base">
                Cross-Device Sync
              </h3>
              <p className="text-xs text-[#787774] dark:text-neutral-400">
                Seamlessly keep your calendar and tasks synced on your phone, tablet, and laptop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9c9a95] hover:text-[#37352f] dark:hover:text-neutral-200 rounded-lg hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Active Devices Overview with soft pastel styling */}
          <div className="flex items-center justify-around p-4 rounded-xl bg-[#fbfbfa] dark:bg-neutral-900 border border-[#e5e4e0] dark:border-neutral-800 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <Laptop className="w-6 h-6 text-[#37352f] dark:text-neutral-200" />
              <span className="font-medium text-[#37352f] dark:text-neutral-200 text-xs">This Device</span>
              <span className="text-[10px] text-[#2d5c41] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7eb897]" />
                Active
              </span>
            </div>
            <div className="h-8 w-px bg-[#e5e4e0] dark:bg-neutral-700" />
            <div className="flex flex-col items-center gap-1.5">
              <Smartphone className="w-6 h-6 text-[#9c9a95]" />
              <span className="font-medium text-[#474542] dark:text-neutral-300 text-xs">Mobile Phone</span>
              <span className="text-[10px] text-[#9c9a95]">Ready to pair</span>
            </div>
            <div className="h-8 w-px bg-[#e5e4e0] dark:bg-neutral-700" />
            <div className="flex flex-col items-center gap-1.5">
              <Tablet className="w-6 h-6 text-[#9c9a95]" />
              <span className="font-medium text-[#474542] dark:text-neutral-300 text-xs">iPad / Tablet</span>
              <span className="text-[10px] text-[#9c9a95]">Ready to pair</span>
            </div>
          </div>

          {/* Option 1: Mobile Instant Link */}
          <div className="space-y-2">
            <h4 className="font-semibold text-[#37352f] dark:text-neutral-100 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-[#5b3c77]" />
              Open on Phone or Tablet
            </h4>
            <p className="text-[#787774]">
              Copy this instant sync link to open Calen on your phone with all your tasks, Moodle courses, and deadlines automatically loaded:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={syncUrl}
                className="flex-1 px-3 py-2 text-[11px] font-mono border border-[#e2e1dc] dark:border-neutral-700 rounded-lg bg-[#fbfbfa] dark:bg-neutral-900 text-[#605e5a] dark:text-neutral-400 truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-[#37352f] hover:bg-[#272623] text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Option 2: Device Pairing Code */}
          <div className="space-y-2">
            <h4 className="font-semibold text-[#37352f] dark:text-neutral-100 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#5b3c77]" />
              Quick Pairing Code
            </h4>
            <div className="flex items-center justify-between p-3 rounded-lg border border-[#e5e4e0] dark:border-neutral-800 bg-[#fbfbfa] dark:bg-neutral-900/30">
              <div>
                <div className="text-[10px] text-[#9c9a95] uppercase tracking-wider font-semibold">Your Device Code</div>
                <div className="text-base font-mono font-bold text-[#37352f] dark:text-neutral-100 tracking-wider">
                  {pairingCode}
                </div>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 border border-[#e2e1dc] dark:border-neutral-700 hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#2d5c41]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Option 3: Full Backup & Restore */}
          <div className="space-y-2 pt-2 border-t border-[#e8e7e3] dark:border-neutral-800">
            <h4 className="font-semibold text-[#37352f] dark:text-neutral-100 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-[#787774]" />
              Backup & Restore Workspace File
            </h4>
            <p className="text-[#787774]">
              Download your complete Calen workspace as a standalone file, or import from another computer.
            </p>
            {importError && (
              <div className="p-2 text-[#9c3434] bg-[#faebeb] border border-[#f4cccc] rounded text-xs">
                {importError}
              </div>
            )}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => exportWorkspaceJSON(tasks, settings)}
                className="flex-1 py-2 px-3 border border-[#e2e1dc] dark:border-neutral-700 rounded-lg hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#787774]" />
                <span>Export Calen Backup (.json)</span>
              </button>

              <label className="flex-1 py-2 px-3 border border-[#e2e1dc] dark:border-neutral-700 rounded-lg hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#787774]" />
                <span>Import Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#e8e7e3] dark:border-neutral-800 flex justify-end bg-[#fbfbfa] dark:bg-neutral-900/30">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-[#37352f] hover:bg-[#272623] text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
