import { useState } from 'react';
import { FileText, ShieldCheck, X } from 'lucide-react';
import { APP_VERSION } from '../types/dream';
import { PrivacyPolicyContent, UserAgreementContent } from './LegalContent';

type LegalDoc = 'agreement' | 'privacy' | null;

function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/hxmj512.png"
      alt=""
      aria-hidden="true"
      className={`${className || ''} rounded-full object-cover`}
    />
  );
}

export function ConsentGate({ onAgree }: { onAgree: () => void }) {
  const [doc, setDoc] = useState<LegalDoc>(null);
  const [declineConfirmOpen, setDeclineConfirmOpen] = useState(false);
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-slate-900 dark:text-[#e6e4ef]">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="flex justify-center">
            <BrandMark className="w-14 h-14 text-[#645f8c] dark:text-[#a8a1d6]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif-dream text-xl font-semibold tracking-wide">回序梦境</h1>
            <p className="text-sm leading-relaxed text-slate-500 dark:text-[#a8a6be]">
              你已拒绝《用户服务协议》与《隐私政策》，暂时无法使用本应用。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeclined(false)}
            className="w-full min-h-[46px] rounded-2xl bg-[#645f8c] hover:bg-[#57527c] text-white text-sm font-medium transition-colors"
          >
            重新阅读并同意
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      {/* Consent Modal */}
      <div
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
      >
        <div className="w-full max-w-sm sm:max-w-md max-h-[86dvh] rounded-3xl bg-[#f5f6fa] dark:bg-[#191a28] border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-6 pt-7 pb-5 overflow-y-auto">
            <div className="flex flex-col items-center text-center mb-5">
              <BrandMark className="w-11 h-11 text-[#645f8c] dark:text-[#a8a1d6] mb-3" />
              <h1
                id="consent-title"
                className="text-lg font-semibold text-slate-900 dark:text-[#eceaf6]"
              >
                用户协议与隐私政策
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-[#7e7c9c] mt-1 font-mono-tabular">
                版本 {APP_VERSION}
              </p>
            </div>

            <ul className="space-y-2 text-[13px] leading-relaxed text-slate-600 dark:text-[#b4b1cc] mb-5">
              <li>
                （1）《隐私政策》中关于梦境记录、标签、配图及本机存储信息收集与使用的说明。
              </li>
              <li>
                （2）《隐私政策》中关于数据共享、第三方服务以及你享有的权利的说明。
              </li>
            </ul>

            <div className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-4">
              <p className="text-[11px] text-slate-400 dark:text-[#8f8daa] mb-1.5">
                用户协议和隐私政策说明：
              </p>
              <p className="text-[13px] leading-relaxed text-slate-600 dark:text-[#b4b1cc]">
                阅读完整的
                <button
                  type="button"
                  onClick={() => setDoc('agreement')}
                  className="text-[#645f8c] dark:text-[#a8a1d6] font-medium hover:underline mx-0.5"
                >
                  《用户服务协议》
                </button>
                和
                <button
                  type="button"
                  onClick={() => setDoc('privacy')}
                  className="text-[#645f8c] dark:text-[#a8a1d6] font-medium hover:underline mx-0.5"
                >
                  《隐私政策》
                </button>
                了解详细内容。
              </p>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-slate-400 dark:text-[#7e7c9c]">
              点击「同意并继续」即表示你已阅读并同意上述协议与政策。
            </p>
          </div>

          <div className="grid grid-cols-2 border-t border-slate-200/70 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setDeclineConfirmOpen(true)}
              className="min-h-[52px] text-sm font-medium text-slate-600 dark:text-[#a8a6be] border-r border-slate-200/70 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
            >
              不同意
            </button>
            <button
              type="button"
              onClick={onAgree}
              className="min-h-[52px] text-sm font-medium text-white bg-[#645f8c] hover:bg-[#57527c] transition-colors"
            >
              同意并继续
            </button>
          </div>
        </div>
      </div>

      {/* Full Document Modal */}
      {doc && (
        <div
          className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={doc === 'privacy' ? '隐私政策' : '用户服务协议'}
          onClick={() => setDoc(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl h-[85dvh] rounded-3xl bg-[#f5f6fa] dark:bg-[#191a28] border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200/70 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#645f8c]/10 dark:bg-[#a8a1d6]/10 text-[#645f8c] dark:text-[#a8a1d6] flex items-center justify-center shrink-0">
                  {doc === 'privacy' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-[#eceaf6] truncate">
                    {doc === 'privacy' ? '隐私政策' : '用户服务协议'}
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-[#7e7c9c] font-mono-tabular">
                    版本 {APP_VERSION}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDoc(null)}
                aria-label="关闭"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-500 dark:text-[#a8a6be] hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
              {doc === 'privacy' ? <PrivacyPolicyContent /> : <UserAgreementContent />}
            </div>
          </div>
        </div>
      )}

      {/* Decline Confirm Modal */}
      {declineConfirmOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#f5f6fa] dark:bg-[#191a28] border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6">
              <h2
                id="decline-title"
                className="text-base font-semibold text-slate-900 dark:text-[#eceaf6] mb-2"
              >
                确认拒绝
              </h2>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-[#a8a6be]">
                你确定要拒绝《用户服务协议》与《隐私政策》吗？拒绝后将无法使用本应用。
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-slate-200/70 dark:border-white/10">
              <button
                type="button"
                onClick={() => setDeclineConfirmOpen(false)}
                className="min-h-[50px] text-sm font-medium text-slate-600 dark:text-[#a8a6be] border-r border-slate-200/70 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeclineConfirmOpen(false);
                  setDeclined(true);
                }}
                className="min-h-[50px] text-sm font-medium text-[#645f8c] dark:text-[#a8a1d6] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
