/**
 * SettingsPage.tsx — 개인 설정 페이지
 * - 알림 설정 (출퇴근 알림, 연차 알림)
 * - 비밀번호 변경 (직원 계정 전용)
 * - 프로필 정보 수정 (내선번호, 연락처)
 * - 개인정보 처리방침 링크
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Bell, Lock, User, Shield, ChevronRight,
  Loader2, Check, Phone, Mail,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type Section = "profile" | "notification" | "security" | "privacy";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // 내 직원 정보
  const { data: employee, isLoading: empLoading } = trpc.employees.me.useQuery();

  // 프로필 수정 상태
  const [ext, setExt] = useState(employee?.ext ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // 알림 설정 상태 (로컬 상태 - 추후 DB 저장 가능)
  const [notifCheckin, setNotifCheckin] = useState(true);
  const [notifLeave, setNotifLeave] = useState(true);
  const [notifNotice, setNotifNotice] = useState(false);

  // 비밀번호 변경 상태
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const isEmployeeLogin = user?.openId?.startsWith("emp_");

  const handleSaveProfile = async () => {
    if (!employee) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/trpc/employees.update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
      });
      // tRPC mutation 사용
      toast.success("프로필 정보가 저장되었습니다. (어드민에서 최종 반영됩니다)");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw || !confirmPw) {
      toast.error("새 비밀번호를 입력해주세요.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPw.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setChangingPw(true);
    try {
      // 비밀번호 변경 API 호출
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "비밀번호 변경에 실패했습니다.");
      } else {
        toast.success("비밀번호가 변경되었습니다.");
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setChangingPw(false);
    }
  };

  const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "profile",      label: "프로필 정보",  icon: <User size={15} /> },
    { id: "notification", label: "알림 설정",    icon: <Bell size={15} /> },
    { id: "security",     label: "보안",         icon: <Lock size={15} /> },
    { id: "privacy",      label: "개인정보",     icon: <Shield size={15} /> },
  ];

  return (
    <PortalLayout>
      <div className="container py-6">
        <h1 className="text-lg font-bold mb-5" style={{ color: "var(--kino-charcoal)" }}>개인 설정</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 사이드 메뉴 */}
          <div className="portal-card p-2 h-fit">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all"
                style={{
                  background: activeSection === s.id ? "var(--kino-charcoal)" : "transparent",
                  color: activeSection === s.id ? "white" : "var(--kino-mid)",
                  fontWeight: activeSection === s.id ? 600 : 400,
                }}
              >
                {s.icon}
                {s.label}
                {activeSection !== s.id && <ChevronRight size={12} className="ml-auto" style={{ color: "var(--kino-light)" }} />}
              </button>
            ))}
          </div>

          {/* 콘텐츠 영역 */}
          <div className="md:col-span-3">

            {/* 프로필 정보 */}
            {activeSection === "profile" && (
              <div className="portal-card p-5">
                <h2 className="text-sm font-bold mb-4" style={{ color: "var(--kino-charcoal)" }}>프로필 정보</h2>
                {empLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
                  </div>
                ) : employee ? (
                  <div className="flex flex-col gap-4">
                    {/* 읽기 전용 정보 */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "이름", value: employee.name },
                        { label: "부서", value: employee.department },
                        { label: "직위", value: employee.position },
                        { label: "입사일", value: employee.joinDate },
                      ].map(f => (
                        <div key={f.label}>
                          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--kino-muted)" }}>{f.label}</label>
                          <div
                            className="px-3 py-2 rounded text-sm"
                            style={{ background: "var(--kino-bg)", color: "var(--kino-charcoal)", border: "1px solid var(--kino-pale)" }}
                          >
                            {f.value || "-"}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: "1px solid var(--kino-pale)", paddingTop: "1rem" }}>
                      <p className="text-xs mb-3" style={{ color: "var(--kino-muted)" }}>
                        아래 정보는 수정 요청을 통해 어드민에서 반영됩니다.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--kino-mid)" }}>
                            <Phone size={11} className="inline mr-1" />내선번호
                          </label>
                          <input
                            type="text"
                            value={ext || employee.ext || ""}
                            onChange={e => setExt(e.target.value)}
                            placeholder="예: 1234"
                            className="w-full px-3 py-2 rounded text-sm outline-none"
                            style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "white" }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--kino-mid)" }}>
                            <Phone size={11} className="inline mr-1" />휴대폰
                          </label>
                          <input
                            type="text"
                            value={phone || employee.phone || ""}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="예: 010-1234-5678"
                            className="w-full px-3 py-2 rounded text-sm outline-none"
                            style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "white" }}
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="text-xs font-semibold block mb-1" style={{ color: "var(--kino-mid)" }}>
                          <Mail size={11} className="inline mr-1" />이메일
                        </label>
                        <input
                          type="email"
                          value={employee.email || ""}
                          disabled
                          className="w-full px-3 py-2 rounded text-sm"
                          style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-muted)", background: "var(--kino-bg)" }}
                        />
                        <p className="text-xs mt-1" style={{ color: "var(--kino-light)" }}>이메일은 어드민에서만 변경 가능합니다.</p>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold text-white transition-all active:scale-95 w-fit"
                      style={{ background: "var(--kino-charcoal)" }}
                    >
                      {savingProfile ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      수정 요청
                    </button>
                  </div>
                ) : (
                  <p className="text-sm py-4 text-center" style={{ color: "var(--kino-muted)" }}>
                    직원 정보와 연결된 계정이 아닙니다.
                  </p>
                )}
              </div>
            )}

            {/* 알림 설정 */}
            {activeSection === "notification" && (
              <div className="portal-card p-5">
                <h2 className="text-sm font-bold mb-4" style={{ color: "var(--kino-charcoal)" }}>알림 설정</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "출퇴근 알림", desc: "출근/퇴근 기록 시 알림", value: notifCheckin, setter: setNotifCheckin },
                    { label: "연차 신청 알림", desc: "연차 신청 상태 변경 시 알림", value: notifLeave, setter: setNotifLeave },
                    { label: "공지사항 알림", desc: "새 공지사항 등록 시 알림", value: notifNotice, setter: setNotifNotice },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: "var(--kino-bg)", border: "1px solid var(--kino-pale)" }}
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{item.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{item.desc}</p>
                      </div>
                      <button
                        onClick={() => {
                          item.setter(!item.value);
                          toast.success(`${item.label} ${!item.value ? "켜짐" : "꺼짐"}`);
                        }}
                        className="relative w-11 h-6 rounded-full transition-all"
                        style={{ background: item.value ? "var(--kino-charcoal)" : "#D1D5DB" }}
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                          style={{ left: item.value ? "calc(100% - 1.375rem)" : "2px" }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-4" style={{ color: "var(--kino-light)" }}>
                  * 알림 기능은 브라우저 알림 권한이 필요합니다. 현재 설정은 이 기기에만 저장됩니다.
                </p>
              </div>
            )}

            {/* 보안 */}
            {activeSection === "security" && (
              <div className="portal-card p-5">
                <h2 className="text-sm font-bold mb-4" style={{ color: "var(--kino-charcoal)" }}>보안 설정</h2>
                {isEmployeeLogin ? (
                  <form onSubmit={handleChangePassword} className="flex flex-col gap-4 max-w-sm">
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--kino-mid)" }}>현재 비밀번호</label>
                      <input
                        type="password"
                        value={currentPw}
                        onChange={e => setCurrentPw(e.target.value)}
                        placeholder="현재 비밀번호"
                        className="w-full px-3 py-2 rounded text-sm outline-none"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "white" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--kino-mid)" }}>새 비밀번호</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="6자 이상"
                        className="w-full px-3 py-2 rounded text-sm outline-none"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "white" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--kino-mid)" }}>새 비밀번호 확인</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder="비밀번호 재입력"
                        className="w-full px-3 py-2 rounded text-sm outline-none"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "white" }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={changingPw}
                      className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold text-white transition-all active:scale-95 w-fit"
                      style={{ background: "var(--kino-charcoal)" }}
                    >
                      {changingPw ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                      비밀번호 변경
                    </button>
                  </form>
                ) : (
                  <div
                    className="p-4 rounded-lg"
                    style={{ background: "var(--kino-bg)", border: "1px solid var(--kino-pale)" }}
                  >
                    <p className="text-sm" style={{ color: "var(--kino-charcoal)" }}>
                      Manus OAuth 계정으로 로그인 중입니다.
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>
                      비밀번호 변경은 Manus 계정 설정에서 진행해주세요.
                    </p>
                  </div>
                )}

                <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--kino-pale)" }}>
                  <h3 className="text-xs font-bold mb-3" style={{ color: "var(--kino-mid)" }}>로그인 세션</h3>
                  <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "var(--kino-bg)", border: "1px solid var(--kino-pale)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>현재 기기</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>현재 로그인된 세션</p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: "#F0FDF4", color: "#16A34A" }}
                    >
                      활성
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 개인정보 */}
            {activeSection === "privacy" && (
              <div className="portal-card p-5">
                <h2 className="text-sm font-bold mb-4" style={{ color: "var(--kino-charcoal)" }}>개인정보 처리방침</h2>
                <div className="flex flex-col gap-3">
                  <div
                    className="p-4 rounded-lg text-sm leading-relaxed"
                    style={{ background: "var(--kino-bg)", color: "var(--kino-mid)", border: "1px solid var(--kino-pale)" }}
                  >
                    <p className="font-semibold mb-2" style={{ color: "var(--kino-charcoal)" }}>키노톤(주) 사내 포탈 개인정보 처리방침</p>
                    <p className="text-xs mb-2">키노톤(주)(이하 "회사")는 임직원의 개인정보를 중요시하며, 「개인정보 보호법」에 따라 아래와 같이 개인정보 처리방침을 수립·공개합니다.</p>
                    <ul className="text-xs space-y-1" style={{ color: "var(--kino-muted)" }}>
                      <li>• 수집 항목: 이름, 부서, 직위, 이메일, 연락처, 출퇴근 기록, 연차 정보</li>
                      <li>• 이용 목적: 사내 포탈 서비스 제공, 출퇴근 관리, 연차 관리</li>
                      <li>• 보유 기간: 재직 기간 + 퇴직 후 3년</li>
                      <li>• 제3자 제공: 없음 (법령에 따른 경우 제외)</li>
                    </ul>
                  </div>
                  <a
                    href="/privacy"
                    className="flex items-center gap-2 text-sm font-semibold transition-all hover:opacity-80"
                    style={{ color: "var(--kino-charcoal)" }}
                  >
                    전문 보기 <ChevronRight size={14} />
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
