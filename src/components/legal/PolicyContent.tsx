// 共用：隱私政策／服務條款內容元件（給 /privacy /terms 頁面與 ConsentModal 用）

export function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

// 客服聯絡資訊 - 統一在這裡維護
export const CONTACT_EMAIL = "services@joyyoung.com.tw";

export function ContactBlock() {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-3 text-sm">
      <p className="font-semibold text-slate-900 dark:text-slate-100">📮 客服聯絡</p>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 active:bg-blue-100 dark:active:bg-blue-900 rounded-xl border border-blue-200 dark:border-blue-800"
      >
        <span className="text-xl">📧</span>
        <div className="flex-1">
          <div className="font-semibold text-blue-900 dark:text-blue-100">寄信給客服</div>
          <div className="text-xs text-blue-700 dark:text-blue-300 break-all">
            {CONTACT_EMAIL}
          </div>
        </div>
      </a>
      <p className="text-xs text-slate-500 leading-relaxed">
        個資相關權利行使（查詢、更正、刪除、停止處理）請透過上述信箱聯繫,
        我們會在 15 個工作日內回應。
      </p>
    </div>
  );
}

export function BetaNote() {
  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-300/60 dark:ring-amber-800 rounded-2xl text-amber-900 dark:text-amber-100">
      <p className="font-semibold mb-1">⚠️ 試辦版法律文件草案</p>
      <p className="text-xs leading-relaxed">
        本服務目前仍在試辦與導入準備階段。以下內容已切換為中揚資訊股份有限公司版本,
        但正式上線前仍須由法律專業人士審閱。試辦期間請勿把本服務作為緊急醫療、
        排班、薪資、扣款或勞資爭議判定依據。
      </p>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <BetaNote />

      <PolicySection title="1. 服務提供者與蒐集者">
        <p>
          「看護助手 CareTaiwan」（以下稱「本服務」）是一款為外籍家庭看護工與家屬設計的
          <strong>日常記錄與家屬溝通工具</strong> Progressive Web App (PWA)。
        </p>
        <p>
          本服務目前由<strong>中揚資訊股份有限公司</strong>維護與規劃營運。
          中揚資訊股份有限公司為本服務試辦與正式導入規劃中的資料控制者；
          實際受託維運、主機、LINE 與儲存服務為資料處理者或第三方服務。
        </p>
        <p className="text-xs text-slate-500">
          ⚠️ 本服務<strong>不提供任何醫療建議</strong>,
          不取代醫師、護理師、藥師、其他醫療專業人員之專業判斷。
        </p>
      </PolicySection>

      <PolicySection title="2. 我們蒐集什麼資料">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-2">
          2.1 你主動輸入的資料（存於你手機本地）
        </h3>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>長者個資:姓名、性別、生日、血型</li>
          <li className="text-amber-700 dark:text-amber-400">
            <strong>特種個資</strong>:病史、用藥、過敏(個資法第 6 條)
          </li>
          <li>緊急聯絡人:姓名、關係、電話</li>
          <li>主治醫師、就診醫院</li>
          <li>每日記錄:體溫、睡眠、用藥、跌倒、進食等</li>
          <li>看護備註自由文字、選擇性附加之照片</li>
        </ul>

        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-3">
          2.2 LINE 登入後額外蒐集
        </h3>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>LINE userId(一串無意義的 33 字元代號)</li>
          <li>LINE 顯示名稱、頭像(用於介面顯示)</li>
          <li>
            <strong>不蒐集</strong>:LINE 真實姓名、電話、Email、好友名單、聊天記錄
          </li>
        </ul>

        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-3">
          2.3 自動蒐集
        </h3>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>瀏覽器類型、作業系統(Vercel 標準存取日誌,30 天內刪除)</li>
          <li>IP 位址(末段已匿名化,僅用於資安事件溯源)</li>
          <li>
            <strong>不蒐集</strong>:精確 GPS 位置、廣告 ID、跨站追蹤資料
          </li>
          <li>
            <strong>不使用</strong>:Google Analytics、Facebook Pixel、追蹤型 cookie
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="3. 特種個資處理聲明">
        <p>
          依個人資料保護法第 6 條,病歷、醫療、健康檢查等資料屬於「特種個資」,原則禁止蒐集。
          本服務依下列法定例外蒐集處理:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>當事人(或法定代理人)已書面同意</li>
          <li>協助公務機關執行法定職務或非公務機關履行法定義務必要範圍內</li>
        </ul>
        <p>
          註冊使用本服務時,你必須以勾選方式明確同意處理長者之特種個資。
          若長者為失智或法定無行為能力人,須由其法定代理人同意。
        </p>
      </PolicySection>

      <PolicySection title="4. 蒐集目的">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>提供日常照護記錄功能</li>
          <li>將記錄傳送至家屬指定之 LINE 帳號或家族群組</li>
          <li>協助家屬與看護間溝通</li>
          <li>系統功能改善與安全維護</li>
          <li>合法稽核與資安事件回溯</li>
        </ul>
      </PolicySection>

      <PolicySection title="5. 資料儲存位置">
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>
            <strong>本地(你的手機)</strong>:所有醫護卡與記錄資料優先儲存於你手機的瀏覽器 localStorage。
            即使不登入,基本功能仍可離線使用。
          </li>
          <li>
            <strong>雲端備份(可選)</strong>:LINE 登入後資料以加密 HTTPS 傳輸至本服務後端,
            以你的 LINE userId 為 key 儲存。正式環境規劃採 VM 自管 Postgres；測試或過渡環境若使用
            Supabase-compatible 服務,會在部署文件與正式政策中揭露。
          </li>
          <li>
            <strong>照片儲存</strong>:看護附加之照片儲存於後端私有儲存空間,
            僅在推播或授權查看時產生短期簽名連結,過期後即無法存取。
          </li>
          <li>
            <strong>家屬端推播</strong>:你按下「送出給家屬」之記錄會透過 LINE Messaging API 推播至家屬 LINE。
            訊息進入 LINE Corporation 伺服器後依其隱私政策處理。
          </li>
          <li>
            <strong>家族群組推播(可選)</strong>:若家屬選擇綁定 LINE 群組推播,
            記錄將揭露給該群組所有現有與未來成員。詳見第 7 條。
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="6. 國際傳輸聲明(個資法第 21 條)">
        <p>
          正式環境預設以台灣境內 VM、資料庫、檔案儲存與備份為優先規劃。
          若實際部署使用境外服務,上線前會在本政策揭露資料所在區域、資料處理者與風險。
          目前可能涉及的第三方服務邊界如下:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>LINE Corporation / LY Corporation(LINE Login、Messaging API)— 依 LINE 服務政策處理</li>
          <li>VM、資料庫、備份與檔案儲存供應商— 正式環境選定後揭露</li>
          <li>測試或舊原型環境可能使用 Vercel、Supabase 或相容服務；正式服務不以原作者原型環境為準</li>
        </ul>
        <p>
          上述業者依據其各自之隱私政策與相關國家法令處理資料。
          台灣個資主管機關得依法限制特定資料之國際傳輸。
        </p>
      </PolicySection>

      <PolicySection title="7. 第三方揭露 — 家族群組推播">
        <p className="text-amber-700 dark:text-amber-400 font-semibold">
          ⚠️ 重要:若家屬使用「家族群組推播」功能,涉及第三方揭露:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>記錄(含文字、照片)將推播至綁定之 LINE 群組</li>
          <li>群組內<strong>所有現有與未來加入之成員</strong>均可看到該記錄</li>
          <li>群組成員可能對訊息截圖、轉發,本服務無法控制</li>
          <li>家屬綁定時必須明確同意此項揭露</li>
          <li>家屬可隨時透過 PWA 解除群組推播</li>
          <li>家屬可選擇是否在群組推播中包含照片</li>
        </ul>
        <p>
          綁定群組推播前,本服務會顯示明確之隱私警示,並要求二次確認。
        </p>
      </PolicySection>

      <PolicySection title="8. 第三方資料處理者">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>LINE Corporation / LY Corporation(LINE Login OAuth、LINE Messaging API)</li>
          <li>正式 VM、資料庫、檔案儲存、備份與監控供應商(正式環境選定後揭露)</li>
          <li>測試或舊原型環境使用之 Vercel、Supabase 或相容服務(僅限測試、過渡或歷史參考時適用)</li>
        </ul>
        <p className="text-xs text-slate-500 mt-2">
          上述業者皆有自己的隱私政策,建議使用前查閱。
        </p>
      </PolicySection>

      <PolicySection title="9. 你的權利(個資法第 3 條 + 第 11 條)">
        <ol className="list-decimal list-inside space-y-2 ml-2">
          <li>
            <strong>查詢或請求閱覽</strong>:備份頁可下載 JSON 完整備份,或透過客服信箱請求
          </li>
          <li>
            <strong>請求製給複製本</strong>:同上(JSON 即為合法複製本)
          </li>
          <li>
            <strong>請求補充或更正</strong>:所有資料可在 APP 內直接編輯
          </li>
          <li>
            <strong>請求停止蒐集、處理或利用</strong>:登出 LINE 即停止雲端與推播功能;
            APP 仍可離線使用
          </li>
          <li>
            <strong>請求刪除</strong>:備份頁有「刪除全部資料」按鈕,
            同步清除本地與雲端資料,並登出 LINE
          </li>
        </ol>
        <p className="text-xs">
          以上權利行使請透過下方客服管道聯繫,本服務將於 15 個工作日內回應。
        </p>
      </PolicySection>

      <PolicySection title="10. 資料保存期限">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>本地資料:於使用者刪除 APP 或執行「刪除全部資料」時消失</li>
          <li>雲端備份:於使用者執行「刪除全部資料」或提出刪除請求時清除 live database / storage</li>
          <li>照護行程與看護請假紀錄:跟照護紀錄一致,刪除請求要涵蓋 live database、備份與 audit metadata</li>
          <li>未活動帳號:超過 12 個月未登入之雲端資料將自動刪除(預告 30 天前 email 通知)</li>
          <li>照片檔案:存放於私有儲存桶,推播時臨時產生簽名連結</li>
          <li>LINE 推播訊息:依 LINE Corporation 政策(不在本服務控制範圍)</li>
          <li>App / proxy 存取日誌:正式環境保存天數依 runbook 與法務政策設定,預設不保留未遮蔽 PII</li>
          <li>稽核日誌(操作記錄、不含內容):90 天,個資法或刑事訴訟要求保留時延長</li>
          <li>歷史備份:原則上不直接拆包修改,而是記錄刪除請求並在保留期到期時覆蓋；若法律或合約要求不同做法,依正式法務文件處理</li>
        </ul>
      </PolicySection>

      <PolicySection title="11. 資料安全">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>全站 HTTPS 加密傳輸</li>
          <li>照片儲存於私有 VM local storage,僅以短期簽名連結推送</li>
          <li>CSRF 同源檢查、API 速率限制、稽核日誌</li>
          <li>LINE OAuth 第三方身分驗證,不儲存任何密碼</li>
          <li>來源 IP 末段匿名化處理</li>
        </ul>
        <p className="text-xs">
          本服務依個資法第 27 條採取適當之安全維護措施。
        </p>
      </PolicySection>

      <PolicySection title="12. 資安事件處理">
        <p>
          若發生個人資料外洩或重大資安事件,本服務將:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>於發現後 72 小時內以 email 或 APP 內通知受影響之使用者</li>
          <li>依個資法第 12 條向主管機關通報</li>
          <li>說明事件範圍、原因、影響、已採取之補救措施</li>
        </ul>
      </PolicySection>

      <PolicySection title="13. 失智長者與法定代理人">
        <p>
          本服務蒐集之長者個資,部分對象可能為失智症患者或法定無行為能力人。
          註冊使用本服務之家屬應:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>確認自己為該長者之法定代理人,或已取得其同意</li>
          <li>以長者最佳利益為原則使用本服務</li>
          <li>若長者表達不願意被記錄,應立即停止</li>
        </ul>
      </PolicySection>

      <PolicySection title="14. 兒童資料">
        <p>
          本服務面向成年使用者(看護工、家屬)使用。
          不主動蒐集 18 歲以下個資。
          若發現有未成年使用,將立即停止其帳號並刪除資料。
        </p>
      </PolicySection>

      <PolicySection title="15. 政策變更">
        <p>
          本政策可能因法規變動、功能更新或業務調整而修訂。
          重大變更會在 APP 內顯眼通知,並透過客服信箱向已登入使用者發送通知。
        </p>
        <p className="text-xs text-slate-500">
          當前版本: <strong>2026-07-06 v0.4 (中揚資訊試辦版草案)</strong>
          <br />
          v0.4 變更:切換服務提供者與聯絡窗口為中揚資訊股份有限公司,補資料控制者、資料落地、VM 自管 Postgres、備份刪除與 reminder 邊界說明。
        </p>
      </PolicySection>

      <PolicySection title="16. 客服聯絡">
        <ContactBlock />
      </PolicySection>
    </article>
  );
}

export function TermsContent() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <BetaNote />

      <PolicySection title="1. 服務性質">
        <p>
          「看護助手 CareTaiwan」(以下稱「本服務」)是
          <strong>長照記錄與家屬溝通輔助工具</strong>,
          不是醫療器材、不是醫療機構、不是看護媒合平台、不是長照機構。
        </p>
        <p>
          本服務<strong>不提供任何醫療、診斷或治療建議</strong>,
          僅協助看護工記錄日常照護內容並選擇性傳送至家屬 LINE 或家族群組。
          所有照護判斷請依專業醫護人員指示。
        </p>
      </PolicySection>

      <PolicySection title="2. 試辦版聲明">
        <p>
          本服務目前處於<strong>試辦與導入準備</strong>階段,
          僅供受邀測試或指定試辦對象使用。請勿用於正式照護環境之關鍵決策依據。
          測試期間可能有功能變動、服務中斷、資料重置等情形。
        </p>
        <p>
          正式版上線前,本條款仍需由法律專業人士重新審閱與更新。
        </p>
      </PolicySection>

      <PolicySection title="3. 緊急狀況">
        <p className="font-semibold text-red-600 dark:text-red-400">
          ⚠️ 生命危急請立刻撥打 119、110。
          本服務不取代任何緊急醫療管道。
          本服務的推播功能不保證家屬會即時看到,
          請勿將緊急訊息依賴本服務傳達。
        </p>
      </PolicySection>

      <PolicySection title="4. 使用者責任">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>輸入正確之長者資料、用藥資訊、緊急聯絡人</li>
          <li>使用「送出給家屬」或「家族群組推播」前,已取得相關當事人同意</li>
          <li>家族群組推播前評估群組成員結構,確保不會洩露個資給不應知悉之第三方</li>
          <li>遵守台灣外籍家庭看護工相關法令(就業服務法、勞動基準法、移工政策等)</li>
          <li>不得用本服務做違法、騷擾、誹謗、歧視等用途</li>
          <li>不得截圖或外傳他人的醫療資料</li>
          <li>未經授權不得試圖入侵、逆向工程、複製本服務</li>
        </ul>
      </PolicySection>

      <PolicySection title="5. 免責聲明">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            本服務<strong>僅為記錄工具</strong>,不對使用者輸入之內容進行任何專業判斷
          </li>
          <li>
            因使用本服務造成之任何照護結果、健康影響、醫療誤判,
            <strong>服務提供者不承擔法律責任</strong>。
            照護判斷之最終責任在於專業醫護人員與家屬本人
          </li>
          <li>第三方服務(LINE / Supabase / Vercel)異常時,本服務功能可能受影響</li>
          <li>正式環境改採 VM 自管 Postgres 後,仍可能因主機、資料庫、備份、網路或 LINE 服務異常而受影響</li>
          <li>離線時可記錄但無法即時推播,使用者應自行確認家屬已收到關鍵訊息</li>
          <li>因群組成員洩漏、截圖、外傳所造成之損害,服務提供者不承擔責任</li>
        </ul>
      </PolicySection>

      <PolicySection title="6. 智慧財產權">
        <p>
          APP 程式碼依 MIT 授權保留原作者著作權與授權聲明；中揚資訊接手後新增或修改之 UI 設計、介面文案與部署文件,依 repository 授權與各檔案聲明處理。
          本服務目前僅含日常記錄與家屬溝通功能,不引用第三方衛教內容。
        </p>
        <p>
          使用者輸入之資料(醫護卡、記錄、照片)所有權屬於使用者本人,
          本服務僅依據隱私政策處理之。
        </p>
      </PolicySection>

      <PolicySection title="7. 服務變動、暫停與終止">
        <p>
          服務提供者保留隨時暫停、修改、終止本服務之權利。
          重大變動會盡可能事先以 APP 內通知方式告知使用者。
        </p>
        <p>
          終止前,使用者仍可透過「備份頁 → 下載備份檔」保存自己的資料。
        </p>
        <p>
          使用者違反本條款時,服務提供者得逕行停用該帳號並刪除相關資料,
          不另行通知。
        </p>
      </PolicySection>

      <PolicySection title="8. 損害賠償上限">
        <p>
          在法律允許之最大範圍內,服務提供者對任何使用者所負之賠償責任,
          以該使用者於前 12 個月內支付予本服務之費用為上限。
          若為免費使用,賠償上限為新台幣 1,000 元。
        </p>
        <p className="text-xs text-slate-500">
          (本條款於正式版上線後,將依律師審核重新調整。)
        </p>
      </PolicySection>

      <PolicySection title="9. 準據法與管轄法院">
        <p>
          本條款依<strong>中華民國(台灣)法律</strong>解釋。
          因本服務所生之爭議,雙方同意以<strong>台北地方法院為第一審管轄法院</strong>。
        </p>
      </PolicySection>

      <PolicySection title="10. 條款分割性">
        <p>
          本條款若部分條文被認定無效,不影響其他條文之效力。
        </p>
      </PolicySection>

      <PolicySection title="11. 版本與聯絡">
        <p>
          當前版本: <strong>2026-07-06 v0.4 (中揚資訊試辦版草案)</strong>
        </p>
        <p className="text-xs text-slate-500">
          v0.4 變更:切換服務提供者與聯絡窗口為中揚資訊股份有限公司,補資料控制者、資料落地、備份刪除與正式法務審閱待辦。
        </p>
        <div className="mt-3">
          <ContactBlock />
        </div>
      </PolicySection>
    </article>
  );
}
