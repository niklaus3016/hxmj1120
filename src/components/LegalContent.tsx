import type { ReactNode } from 'react';
import { APP_VERSION } from '../types/dream';

const EFFECTIVE_DATE = '2026年11月20日';

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6] pb-1.5 mb-2 border-b border-slate-200/70 dark:border-white/10">
        {title}
      </h3>
      <div className="space-y-2 text-[13px] leading-relaxed text-slate-600 dark:text-[#b4b1cc]">
        {children}
      </div>
    </section>
  );
}

function LegalFooter() {
  return (
    <div className="mt-8 pt-5 border-t border-slate-200/70 dark:border-white/10 text-center text-[11px] leading-relaxed text-slate-400 dark:text-[#7e7c9c] space-y-1">
      <p>感谢你使用回序梦境。</p>
      <p>版本 {APP_VERSION}</p>
      <p>© 2026 光年跃迁（温州）科技有限公司 版权所有</p>
    </div>
  );
}

export function PrivacyPolicyContent() {
  return (
    <div>
      <p className="text-center text-[11px] text-slate-500 dark:text-[#8f8daa] mb-4">
        <span className="font-medium">生效日期</span>：{EFFECTIVE_DATE}
      </p>

      <div className="rounded-2xl border-l-4 border-[#645f8c] dark:border-[#a8a1d6] bg-[#645f8c]/[0.07] dark:bg-[#a8a1d6]/[0.08] p-4 mb-5">
        <p className="text-[13px] leading-relaxed text-slate-700 dark:text-[#cfccdf]">
          欢迎使用「回序梦境」（以下简称“本应用”）。本应用由
          <strong className="font-semibold text-slate-900 dark:text-[#eceaf6]">
            光年跃迁（温州）科技有限公司
          </strong>
          （以下简称“我们”）开发并运营。我们深知个人信息对你的重要性，将严格遵守《中华人民共和国个人信息保护法》等相关法律法规，保护你的个人信息安全。
        </p>
      </div>

      <p className="text-[13px] leading-relaxed text-slate-600 dark:text-[#b4b1cc] mb-2">
        本隐私政策旨在说明我们如何收集、使用、存储和保护你在使用本应用过程中产生的信息，以及你对这些信息所享有的权利。请你在使用本应用前仔细阅读并充分理解本政策的全部内容。如对本政策有任何疑问、意见或建议，可通过本政策末尾提供的联系方式与我们联系。
      </p>

      <LegalSection title="一、我们收集的信息">
        <p>在您使用本应用的过程中，我们仅处理以下信息，以提供、维护和改进服务：</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">梦境记录数据</strong>
            ：你在应用内主动录入的梦境标题、正文、复盘、标签、情绪、入梦时段、引导清单答案，以及你主动选择的配图与涂鸦。这些数据是本应用的核心功能内容，仅保存在你的设备本机。
          </li>
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">应用设置数据</strong>
            ：主题偏好、协议同意状态等少量本地配置信息。
          </li>
        </ol>
        <p>
          我们不会收集你的设备标识符、通讯录、位置信息、麦克风或相机内容，也不会接入任何第三方统计、广告或画像服务。
        </p>
      </LegalSection>

      <LegalSection title="二、我们如何使用收集的信息">
        <p>我们仅在以下合法、正当、必要的范围内使用相关信息：</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">提供核心功能</strong>
            ：为你保存与检索梦境、生成标签复盘与统计图谱、绘制涂鸦、生成海报，以及创建和恢复加密备份。
          </li>
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">改进使用体验</strong>
            ：情绪分布、词云与相似梦境比对等运算均在你的设备本地完成，不会用于广告投放、用户画像或自动化决策。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="三、我们如何共享、转让和公开披露信息">
        <p>
          我们郑重承诺，不会向任何第三方共享、转让或公开披露你的梦境数据。开发者无法访问保存在你设备本机私有空间内的记录。
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">法定情形</strong>
            ：根据法律法规的规定、行政或司法机关的强制性要求，我们可能会依法配合。
          </li>
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">获得明确同意</strong>
            ：在获得你的明确同意后，我们才会向第三方共享你的个人信息。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="四、我们如何存储和保护信息">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">存储位置和期限</strong>
            ：你的梦境数据保存在本机应用私有存储空间内，开发者及第三方均无法读取。相关数据会一直保留，直至你在应用内删除、清空全部数据或卸载应用。
          </li>
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">安全措施</strong>
            ：加密备份采用 AES-256-GCM 加密和 PBKDF2 密钥派生；梦境界面不包含账号体系，也不具备绕过系统权限读取其他应用数据的能力。
          </li>
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">备份密码</strong>
            ：备份密码仅在你的设备内存中用于加密与解密，我们不会保存。密码遗失将无法恢复备份内容，请妥善保管。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="五、你的权利">
        <p>根据相关法律法规，你对你的个人信息享有以下权利：</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">访问权</strong>
            ：你可以随时在时间线中查看与管理你的梦境记录及标签。
          </li>
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">更正权</strong>
            ：如发现记录存在错误，你可以在应用内随时修改和更正。
          </li>
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">删除权</strong>
            ：你可以随时删除单条梦境、移除标签，或使用设置页的「一键清空全部梦境数据」彻底删除本机数据。
          </li>
          <li>
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">数据导出</strong>
            ：你可以随时在设置页生成加密备份包，并由你自行保存或分享。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="六、未成年人保护">
        <p>
          我们非常重视对未成年人个人信息的保护。如你是未满 14 周岁的未成年人，在使用本应用前，应在监护人的指导下仔细阅读本政策，并征得监护人的同意。如我们发现在未事先获得监护人可验证同意的情况下处理了未成年人的个人信息，将立即删除相关数据。
        </p>
      </LegalSection>

      <LegalSection title="七、本政策的更新">
        <p>
          我们可能会根据法律法规的更新、业务的调整或技术的发展，适时对本隐私政策进行修订。修订后的政策将在应用内显著位置公示，并在生效前通过合理方式通知你。如你继续使用本应用，即表示你同意接受修订后的政策。
        </p>
      </LegalSection>

      <LegalSection title="八、联系我们">
        <p>如你对本隐私政策有任何疑问、意见或建议，或需要行使相关权利，请通过以下方式与我们联系：</p>
        <div className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-4">
          <p className="text-[13px] text-slate-700 dark:text-[#cfccdf]">
            <strong className="font-semibold text-slate-800 dark:text-[#e6e4ef]">电子邮箱</strong>
            ：Jp112022@163.com
          </p>
        </div>
      </LegalSection>

      <LegalFooter />
    </div>
  );
}

export function UserAgreementContent() {
  return (
    <div>
      <p className="text-center text-[11px] text-slate-500 dark:text-[#8f8daa] mb-5">
        <span className="font-medium">更新日期</span>：{EFFECTIVE_DATE}
      </p>

      <LegalSection title="1. 协议的接受">
        <p>欢迎使用「回序梦境」应用（以下简称「本应用」）。</p>
        <p>
          本协议是你与光年跃迁（温州）科技有限公司（以下简称「我们」）之间关于使用本应用的法律协议。
        </p>
        <p>通过下载、安装或使用本应用，即表示你同意接受本协议的全部条款和条件。</p>
      </LegalSection>

      <LegalSection title="2. 服务内容">
        <p>本应用提供以下服务：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>记录、编辑与检索梦境</li>
          <li>添加标签、情绪与入梦时段，并进行复盘</li>
          <li>查看情绪分布、标签排行与意象词云等本地统计</li>
          <li>使用涂鸦白板、梦境模板与时间漫游</li>
          <li>生成梦境海报、导出与导入加密备份</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 用户义务">
        <p>作为本应用的用户，你同意：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>遵守本协议的所有条款以及相关法律法规</li>
          <li>不使用本应用进行任何非法活动或侵害他人权益的行为</li>
          <li>不干扰本应用的正常运行，不尝试破解或篡改应用</li>
          <li>妥善保护你的设备与加密备份密码，防止未授权访问</li>
          <li>对你自主录入的内容及其使用后果负责</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. 知识产权">
        <p>
          本应用的所有内容，包括但不限于文字、图像、音频、视频、界面设计与软件代码，均受知识产权法律保护。
        </p>
        <p>未经我们的书面许可，你不得复制、修改、分发或商业使用本应用的任何内容。</p>
      </LegalSection>

      <LegalSection title="5. 免责声明">
        <p>本应用按「原样」提供，我们不做任何形式的明示或默示保证。</p>
        <p>我们不保证：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>本应用将完全符合你的要求</li>
          <li>本应用将无中断、及时、安全或无错误地运行</li>
          <li>本应用的使用结果将是准确或可靠的</li>
        </ul>
        <p>
          梦境记录、引导清单与相似梦境比对仅用于个人记录与思绪整理，不构成解梦结论、医疗建议或心理诊断依据。请定期导出加密备份；因设备损坏、系统清理、误删或密码遗失导致的数据丢失，由你自行承担。
        </p>
      </LegalSection>

      <LegalSection title="6. 终止">
        <p>我们有权在任何时候，出于合理原因，终止或暂停你对本应用的访问。</p>
        <p>你也可以随时停止使用本应用，并自行删除本机数据。</p>
      </LegalSection>

      <LegalSection title="7. 适用法律">
        <p>本协议受中华人民共和国法律管辖。</p>
        <p>
          任何与本协议相关的争议，应通过友好协商解决；协商不成的，应提交至温州市有管辖权的人民法院诉讼解决。
        </p>
      </LegalSection>

      <LegalFooter />
    </div>
  );
}
