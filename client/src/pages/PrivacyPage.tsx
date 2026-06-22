/**
 * PrivacyPage.tsx — 개인정보처리방침
 * 키노톤(주) 사내 포탈 기준 개인정보처리방침 (공개 페이지)
 */
import PortalLayout from "@/components/PortalLayout";

export default function PrivacyPage() {
  return (
    <PortalLayout>
      <div className="container py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--kino-charcoal)" }}>
          개인정보처리방침
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--kino-muted)" }}>
          시행일: 2026년 7월 1일 &nbsp;|&nbsp; 키노톤(주)
        </p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--kino-charcoal)" }}>

          <section>
            <h2 className="text-base font-bold mb-2">제1조 (개인정보의 처리 목적)</h2>
            <p>
              키노톤(주)(이하 "회사")는 사내 포탈 시스템 운영을 위해 다음의 목적으로 개인정보를 처리합니다.
              처리한 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경될 시에는
              별도 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1" style={{ color: "var(--kino-mid)" }}>
              <li>임직원 인증 및 로그인 관리</li>
              <li>출퇴근 및 근태 기록 관리</li>
              <li>연차 신청 및 승인 처리</li>
              <li>사내 공지사항·인사발령·경조사 안내</li>
              <li>사내 게시판 운영</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제2조 (처리하는 개인정보의 항목)</h2>
            <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
            <ul className="mt-2 ml-4 list-disc space-y-1" style={{ color: "var(--kino-mid)" }}>
              <li><strong>필수항목:</strong> 성명, 부서, 직위, 사번, 입사일, 이메일 주소</li>
              <li><strong>자동 수집:</strong> 출퇴근 기록(일시, 위치 유형), 로그인 이력</li>
              <li><strong>선택항목:</strong> 프로필 사진</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제3조 (개인정보의 처리 및 보유 기간)</h2>
            <p>
              회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에
              동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1" style={{ color: "var(--kino-mid)" }}>
              <li>임직원 정보: 재직 기간 + 퇴직 후 3년</li>
              <li>출퇴근 기록: 3년 (근로기준법 제42조)</li>
              <li>연차 신청 기록: 3년 (근로기준법 제42조)</li>
              <li>게시판 게시물: 삭제 요청 시 즉시 삭제</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제4조 (개인정보의 제3자 제공)</h2>
            <p>
              회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만
              처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에
              해당하는 경우에만 개인정보를 제3자에게 제공합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제5조 (개인정보처리의 위탁)</h2>
            <p>
              회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1" style={{ color: "var(--kino-mid)" }}>
              <li><strong>수탁자:</strong> Manus AI (포탈 시스템 호스팅 및 운영)</li>
              <li><strong>위탁 업무:</strong> 서버 인프라 운영, 데이터베이스 관리</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제6조 (정보주체의 권리·의무 및 행사방법)</h2>
            <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
            <ul className="mt-2 ml-4 list-disc space-y-1" style={{ color: "var(--kino-mid)" }}>
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
            </ul>
            <p className="mt-2">
              권리 행사는 경영기획팀 담당자에게 서면, 전화, 이메일로 하실 수 있으며 회사는 이에 대해
              지체 없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제7조 (개인정보의 안전성 확보 조치)</h2>
            <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="mt-2 ml-4 list-disc space-y-1" style={{ color: "var(--kino-mid)" }}>
              <li>HTTPS(TLS) 암호화 통신 적용</li>
              <li>접근 권한 관리 (임직원 인증 로그인 필수)</li>
              <li>관리자 계정 별도 비밀번호 보호</li>
              <li>정기적인 접속 기록 보관</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제8조 (개인정보 보호책임자)</h2>
            <p>
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 개인정보 관련 불만처리
              및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="mt-2 p-3 rounded-lg" style={{ background: "var(--kino-pale)" }}>
              <p><strong>개인정보 보호책임자</strong></p>
              <p style={{ color: "var(--kino-mid)" }}>소속: 경영기획팀</p>
              <p style={{ color: "var(--kino-mid)" }}>연락처: 사내 포탈 게시판을 통해 문의</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제9조 (개인정보처리방침의 변경)</h2>
            <p>
              이 개인정보처리방침은 2026년 7월 1일부터 적용되며, 법령 및 방침에 따른 변경 내용의
              추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여
              고지할 것입니다.
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t text-xs text-center" style={{ borderColor: "var(--kino-pale)", color: "var(--kino-muted)" }}>
          © 2026 키노톤(주) · 개인정보처리방침 시행일: 2026.07.01
        </div>
      </div>
    </PortalLayout>
  );
}
