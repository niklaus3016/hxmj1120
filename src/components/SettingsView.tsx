import React, { useRef, useState } from 'react';
import {
  ChevronRight,
  Download,
  FileText,
  Lock,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  APP_VERSION,
  AppConfig,
  PRIVACY_STATEMENT,
  ThemeMode,
} from '../types/dream';
import { PrivacyPolicyContent } from './LegalContent';
import { LocalSnapshot } from '../db/storage';
import { createEncryptedBackup, decryptBackupContent } from '../utils/backupCrypto';
import { clearAnalyticsCache } from '../utils/dreamAnalytics';
import { ConfirmModal } from './ConfirmModal';

interface SettingsViewProps {
  config: AppConfig;
  snapshot: LocalSnapshot;
  onUpdateConfig: (next: AppConfig) => Promise<void>;
  onRestoreSnapshot: (next: LocalSnapshot) => Promise<void>;
  onWipeAllDreams: () => Promise<void>;
  onToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  snapshot,
  onUpdateConfig,
  onRestoreSnapshot,
  onWipeAllDreams,
  onToast,
}) => {
  const [exportPwd, setExportPwd] = useState('');
  const [exportReadyBlob, setExportReadyBlob] = useState<Blob | null>(null);
  const [exportFileName, setExportFileName] = useState('');

  const [pendingImportText, setPendingImportText] = useState<string | null>(null);
  const [importPwd, setImportPwd] = useState('');
  const [decodedImport, setDecodedImport] = useState<LocalSnapshot | null>(null);

  const [wipeStep1, setWipeStep1] = useState(false);
  const [wipeStep2, setWipeStep2] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleGenerateBackup = async () => {
    if (!exportPwd.trim()) {
      onToast('请先输入一个用于加密备份包的密码');
      return;
    }
    try {
      // The password stays in memory only and is never written to local config.
      const cipherJson = await createEncryptedBackup(
        { ...snapshot, config: { ...config, backupPassword: '' } },
        exportPwd
      );
      const blob = new Blob([cipherJson], { type: 'application/json' });
      const dateStr = new Date().toISOString().slice(0, 10);
      setExportReadyBlob(blob);
      setExportFileName(`回序梦境备份_${dateStr}.hxmx`);
      onToast('加密备份包已生成，点击下方分享备份包即可导出');
    } catch (err) {
      onToast((err as Error).message || '生成备份包失败');
    }
  };

  const handleShareBackup = async () => {
    if (!exportReadyBlob) return;
    const file = new File([exportReadyBlob], exportFileName, { type: 'application/json' });
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({ title: '回序梦境加密备份', files: [file] });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(exportReadyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast('已通过系统文件面板保存加密备份包');
  };

  const handlePickImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setPendingImportText(text);
      setImportPwd('');
    } catch {
      onToast('无法读取所选备份文件');
    } finally {
      e.target.value = '';
    }
  };

  const handleVerifyImport = async () => {
    if (!pendingImportText) return;
    if (!importPwd.trim()) {
      onToast('请输入备份密码');
      return;
    }
    try {
      const data = await decryptBackupContent(pendingImportText, importPwd);
      setPendingImportText(null);
      setDecodedImport(data);
    } catch (err) {
      onToast((err as Error).message || '解密失败');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Appearance Settings */}
      <section className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6]">
          外观设置
        </h2>

        {/* Theme */}
        <div className="space-y-2">
          <div className="text-xs text-slate-500 dark:text-[#9896b3]">主题模式</div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'dark', label: '暗夜梦境' },
                { id: 'light', label: '柔和浅灰' },
                { id: 'system', label: '跟随系统' },
              ] as { id: ThemeMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateConfig({ ...config, theme: opt.id })}
                className={`min-h-[42px] rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                  config.theme === opt.id
                    ? 'bg-[#645f8c] text-white'
                    : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Policy Entry Button */}
      <button
        type="button"
        onClick={() => setPrivacyModalOpen(true)}
        className="w-full min-h-[56px] rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 hover:border-[#7e77a3]/50 dark:hover:border-[#8f88bd]/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-[#7e77a3] shrink-0" />
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-[#eceaf6]">
              隐私政策
            </div>
            <div className="text-[11px] text-slate-500 dark:text-[#8f8daa]">
              查看本地存储、零敏感权限与数据自主权说明
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-[#8482a0] shrink-0" />
      </button>

      {/* Data & Backup Management */}
      <section className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6]">
          本地数据与加密备份
        </h2>

        {/* Export */}
        <div className="rounded-2xl bg-slate-100/75 dark:bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-[#e1dff0]">
            <Lock className="w-4 h-4 text-[#7e77a3]" />
            <span>导出 AES 加密备份包（含全部文字、标签与图片）</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="password"
              value={exportPwd}
              onChange={(e) => setExportPwd(e.target.value)}
              placeholder="设置或输入备份密码"
              className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-[#eceaf6]"
            />
            <button
              type="button"
              onClick={handleGenerateBackup}
              className="min-h-[44px] px-4 rounded-xl bg-[#645f8c] hover:bg-[#57527c] text-white text-xs font-medium whitespace-nowrap"
            >
              生成加密备份
            </button>
          </div>

          {exportReadyBlob && (
            <button
              type="button"
              onClick={handleShareBackup}
              className="w-full min-h-[44px] rounded-xl bg-[#4f647d] hover:bg-[#43566d] text-white text-xs font-medium inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>分享 / 保存备份包（{exportFileName}）</span>
            </button>
          )}
        </div>

        {/* Import & Cache */}
        <div className="space-y-2.5">
          <input
            ref={importInputRef}
            type="file"
            accept=".hxmx,.json"
            onChange={handlePickImportFile}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="min-h-[44px] px-3 rounded-xl bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-800 dark:text-[#e1dff0] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>导入备份包</span>
            </button>

            <button
              type="button"
              onClick={() => {
                clearAnalyticsCache();
                onToast('已清空词云与图表的临时计算缓存');
              }}
              className="min-h-[44px] px-3 rounded-xl bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-800 dark:text-[#e1dff0] whitespace-nowrap"
            >
              清空统计缓存
            </button>
          </div>

          <button
            type="button"
            onClick={() => setWipeStep1(true)}
            className="w-full min-h-[44px] px-4 rounded-xl bg-[#8f5768]/12 hover:bg-[#8f5768]/20 text-xs font-medium text-[#9e5d70] inline-flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>一键清空全部梦境数据</span>
          </button>
        </div>
      </section>

      {/* Fixed Privacy & About */}
      <section className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#eceaf6]">
          <ShieldCheck className="w-4 h-4 text-[#7e77a3]" />
          <span>隐私与权限说明</span>
        </div>
        <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-[#b4b1cc]">
          {PRIVACY_STATEMENT.map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
        <div className="pt-3 border-t border-slate-200/70 dark:border-white/8 flex items-center justify-between text-xs text-slate-400 dark:text-[#7e7c9c]">
          <span>回序梦境</span>
          <span className="font-mono-tabular">{APP_VERSION}</span>
        </div>
      </section>

      {/* Full Privacy Policy Modal (Always Centered) */}
      {privacyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="回序梦境隐私政策"
          onClick={() => setPrivacyModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[82dvh] rounded-3xl bg-[#f5f6fa] dark:bg-[#191a28] border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-white/10">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-[#eceaf6]">
                  回序梦境 隐私政策
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#8f8daa] mt-0.5 font-mono-tabular">
                  {APP_VERSION}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                aria-label="关闭隐私政策"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-500 dark:text-[#a8a6be] hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <PrivacyPolicyContent />
            </div>

            <div className="p-4 border-t border-slate-200/70 dark:border-white/10">
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                className="w-full min-h-[46px] rounded-2xl bg-[#645f8c] hover:bg-[#57527c] text-white text-sm font-medium transition-colors"
              >
                我已了解
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Password Dialog */}
      {pendingImportText && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#f5f6fa] dark:bg-[#191a28] border border-slate-200/80 dark:border-white/10 p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#eceaf6]">
              输入备份密码
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9896b3]">
              请输入导出该备份包时设置的解密密码。
            </p>
            <input
              type="password"
              value={importPwd}
              onChange={(e) => setImportPwd(e.target.value)}
              placeholder="备份解密密码"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-[#eceaf6]"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingImportText(null)}
                className="min-h-[42px] px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-[#b4b1cc] bg-slate-200/70 dark:bg-white/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleVerifyImport}
                className="min-h-[42px] px-4 rounded-xl text-xs font-medium bg-[#645f8c] text-white"
              >
                解密校验
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Overwrite Confirmation */}
      <ConfirmModal
        open={Boolean(decodedImport)}
        title="确认恢复备份数据"
        description={`已验证备份包（包含 ${decodedImport?.dreams.length || 0} 条记录）。恢复将会覆盖当前本机全部梦境与标签，是否继续？`}
        confirmLabel="确认覆盖恢复"
        destructive
        onCancel={() => setDecodedImport(null)}
        onConfirm={async () => {
          if (!decodedImport) return;
          const payload = decodedImport;
          setDecodedImport(null);
          await onRestoreSnapshot(payload);
          onToast('已完整恢复本地梦境数据');
        }}
      />

      {/* Double Wipe Confirmation */}
      <ConfirmModal
        open={wipeStep1}
        title="清空全部梦境数据？"
        description="此操作将删除本机所有梦境正文、草稿、配图与涂鸦附件，请确认是否继续。"
        confirmLabel="继续"
        destructive
        onCancel={() => setWipeStep1(false)}
        onConfirm={() => {
          setWipeStep1(false);
          setWipeStep2(true);
        }}
      />

      <ConfirmModal
        open={wipeStep2}
        title="最终确认：不可恢复"
        description="清空后所有梦境记录将无法找回（建议先导出加密备份）。确定要彻底清空吗？"
        confirmLabel="彻底清空"
        destructive
        onCancel={() => setWipeStep2(false)}
        onConfirm={async () => {
          setWipeStep2(false);
          await onWipeAllDreams();
          onToast('已清空全部梦境记录');
        }}
      />
    </div>
  );
};
