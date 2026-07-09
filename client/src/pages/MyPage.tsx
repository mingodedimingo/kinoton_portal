/**
 * MyPage.tsx — 마이페이지
 * - 로그인한 사용자의 직원 정보 자동 매핑 (직원 선택 제거)
 * - 프로필 이미지 업로드 기능
 * - 연차 현황 (총/사용/잔여)
 * - 최근 출퇴근 이력
 * - 연차 신청 이력
 */
import { useState, useRef } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  User, Mail, Building2, Briefcase, Calendar,
  LogIn, LogOut, Clock, CheckCircle, XCircle,
  ChevronRight, FileText, Camera, Loader2,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";

const STATUS_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  "대기":  { bg: "#FEF9C3", color: "#92400E",  icon: <Clock size={11} /> },
  "승인":  { bg: "#F0FDF4", color: "#16A34A",  icon: <CheckCircle size={11} /> },
  "반려":  { bg: "#FEF2F2", color: "#DC2626",  icon: <XCircle size={11} /> },
};

export default function MyPage() {
  const currentYear = new Date().getFullYear();
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // 로그인한 사용자의 직원 정보 자동 조회
  const { data: employee, isLoading: empLoading } = trpc.employees.me.useQuery();
  const employeeId = employee?.id ?? null;

  // 프로필 이미지 업데이트
  const updateProfileMutation = trpc.employees.updateMyProfile.useMutation({
    onSuccess: () => {
      utils.employees.me.invalidate();
      toast.success("프로필 이미지가 업데이트되었습니다.");
    },
    onError: (err) => {
      toast.error(err.message || "프로필 이미지 업데이트에 실패했습니다.");
    },
  });

  // 연차 잔액
  const { data: leaveBalance } = trpc.employees.leaveBalance.useQuery(
    { employeeId: employeeId!, year: currentYear },
    { enabled: !!employeeId }
  );

  // 내 연차 신청 이력
  const { data: leaveRequests } = trpc.leave.myRequests.useQuery(
    { employeeId: employeeId!, year: currentYear },
    { enabled: !!employeeId }
  );

  // 최근 출퇴근 이력 (7일)
  const { data: attendanceLogs } = trpc.attendance.myHistory.useQuery(
    { employeeName: employee?.name ?? "", days: 7 },
    { enabled: !!employee }
  );

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 형식 검사
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF, WEBP 등)");
      return;
    }

    // 파일 크기 검사 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setUploadingImage(true);
    try {
      // 1단계: 이미지 파일 업로드 (multipart/form-data)
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      // 응답이 JSON인지 확인 (서버 에러 시 HTML이 반환될 수 있음)
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // 세션 만료 또는 서버 오류
        if (res.status === 401 || res.status === 403) {
          toast.error("로그인 세션이 만료되었습니다. 페이지를 새로고침 후 다시 시도해주세요.");
        } else {
          toast.error(`서버 오류가 발생했습니다. (${res.status}) 잠시 후 다시 시도해주세요.`);
        }
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");

      // 2단계: 프로필 이미지 URL 저장 (tRPC)
      await updateProfileMutation.mutateAsync({ profileImage: data.url });
    } catch (err: any) {
      // JSON 파싱 오류 등 예외 처리
      if (err?.message?.includes("Unexpected token") || err?.message?.includes("not valid JSON")) {
        toast.error("서버 응답 오류입니다. 로그인 세션을 확인하거나 페이지를 새로고침해주세요.");
      } else {
        toast.error(err.message || "이미지 업로드에 실패했습니다.");
      }
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (empLoading) {
    return (
      <PortalLayout>
        <div className="container py-6 flex items-center justify-center min-h-64">
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="container py-6">
        <h1 className="text-lg font-bold mb-5" style={{ color: "var(--kino-charcoal)" }}>마이페이지</h1>

        {employee ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 좌측: 프로필 카드 */}
            <div className="portal-card p-5 flex flex-col items-center text-center">
              {/* 프로필 이미지 + 업로드 버튼 */}
              <div className="relative mb-1">
                {employee.profileImage ? (
                  <img
                    src={employee.profileImage}
                    alt={employee.name}
                    className="w-20 h-20 rounded-full object-cover"
                    style={{ border: "2px solid var(--kino-pale)" }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "var(--kino-pale)", border: "2px solid var(--kino-pale)" }}
                  >
                    <User size={36} style={{ color: "var(--kino-mid)" }} />
                  </div>
                )}
                {/* 카메라 버튼 */}
                <button
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style={{ background: "var(--kino-charcoal)", border: "2px solid white" }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  title="프로필 사진 변경"
                >
                  {uploadingImage ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <Camera size={12} color="white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
              </div>

              {/* 업로드 규격 안내 문구 */}
              <p className="text-xs mt-1 mb-3" style={{ color: "var(--kino-light)", lineHeight: "1.5" }}>
                JPG · PNG · GIF · WEBP<br />
                최대 5MB · 권장 200×200px 이상
              </p>

              <p className="text-base font-bold" style={{ color: "var(--kino-charcoal)" }}>{employee.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{employee.department} · {employee.position}</p>

              <div className="w-full mt-4 flex flex-col gap-2">
                {employee.email && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kino-mid)" }}>
                    <Mail size={12} />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kino-mid)" }}>
                  <Building2 size={12} />
                  <span>{employee.department}</span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kino-mid)" }}>
                  <Briefcase size={12} />
                  <span>{employee.position}</span>
                </div>
                {employee.joinDate && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kino-mid)" }}>
                    <Calendar size={12} />
                    <span>입사일: {employee.joinDate}</span>
                  </div>
                )}
                {employee.ext && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kino-mid)" }}>
                    <span style={{ fontSize: "0.7rem" }}>☎</span>
                    <span>내선: {employee.ext}</span>
                  </div>
                )}
              </div>

              <Link href="/leave" className="mt-4 w-full">
                <button
                  className="w-full py-2 rounded text-xs font-semibold text-white transition-all active:scale-95"
                  style={{ background: "var(--kino-charcoal)" }}
                >
                  연차 신청하기
                </button>
              </Link>

              <Link href="/settings" className="mt-2 w-full">
                <button
                  className="w-full py-2 rounded text-xs font-semibold transition-all active:scale-95"
                  style={{ background: "var(--kino-bg)", color: "var(--kino-mid)", border: "1px solid var(--kino-pale)" }}
                >
                  개인 설정
                </button>
              </Link>
            </div>

            {/* 우측: 연차 현황 + 이력 */}
            <div className="md:col-span-2 flex flex-col gap-4">
              {/* 연차 현황 */}
              <div className="portal-card p-4">
                <div className="section-header mb-3">
                  <span className="section-title flex items-center gap-1.5">
                    <Calendar size={14} style={{ color: "var(--kino-mid)" }} />
                    {currentYear}년 연차 현황
                  </span>
                  <Link href="/leave" className="section-more flex items-center gap-0.5">
                    신청 이력 <ChevronRight size={12} />
                  </Link>
                </div>
                {leaveBalance ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: "총 연차", value: `${leaveBalance.totalDays}일`, color: "var(--kino-charcoal)" },
                        { label: "사용", value: `${leaveBalance.usedDays}일`, color: "var(--kino-mid)" },
                        { label: "잔여", value: `${leaveBalance.remainingDays}일`, color: leaveBalance.remainingDays <= 3 ? "var(--kino-red)" : "#16A34A" },
                      ].map(s => (
                        <div key={s.label} className="text-center py-3 rounded-lg" style={{ background: "var(--kino-bg)" }}>
                          <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", background: "var(--kino-pale)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${leaveBalance.totalDays > 0 ? Math.min(100, (leaveBalance.usedDays / leaveBalance.totalDays) * 100) : 0}%`,
                          background: "var(--kino-charcoal)",
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1.5 text-right" style={{ color: "var(--kino-muted)" }}>
                      사용률 {leaveBalance.totalDays > 0 ? ((leaveBalance.usedDays / leaveBalance.totalDays) * 100).toFixed(0) : 0}%
                    </p>
                  </>
                ) : (
                  <p className="text-xs py-4 text-center" style={{ color: "var(--kino-muted)" }}>연차 정보가 없습니다. 어드민에서 연차를 부여해주세요.</p>
                )}
              </div>

              {/* 최근 연차 신청 이력 */}
              <div className="portal-card p-4">
                <div className="section-header mb-3">
                  <span className="section-title flex items-center gap-1.5">
                    <FileText size={14} style={{ color: "var(--kino-mid)" }} />
                    최근 연차 신청
                  </span>
                </div>
                {leaveRequests && leaveRequests.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {leaveRequests.slice(0, 5).map(req => {
                      const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG["대기"];
                      return (
                        <div key={req.id} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: "var(--kino-bg)" }}>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.icon}{req.status}
                          </span>
                          <span className="text-xs font-medium flex-1" style={{ color: "var(--kino-charcoal)" }}>{req.leaveType}</span>
                          <span className="text-xs" style={{ color: "var(--kino-muted)" }}>
                            {req.startDate === req.endDate ? req.startDate : `${req.startDate}~${req.endDate}`}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>{req.days}일</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs py-4 text-center" style={{ color: "var(--kino-muted)" }}>신청 이력이 없습니다.</p>
                )}
              </div>

              {/* 최근 출퇴근 이력 */}
              <div className="portal-card p-4">
                <div className="section-header mb-3">
                  <span className="section-title flex items-center gap-1.5">
                    <Clock size={14} style={{ color: "var(--kino-mid)" }} />
                    최근 7일 출퇴근
                  </span>
                </div>
                {attendanceLogs && attendanceLogs.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {attendanceLogs.slice(0, 7).map((log, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: "var(--kino-bg)" }}>
                        <span className="text-xs font-semibold w-24" style={{ color: "var(--kino-charcoal)" }}>{log.date}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}>{log.workType}</span>
                        <div className="flex items-center gap-2 flex-1">
                          {log.checkIn && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#16A34A" }}>
                              <LogIn size={11} /> {log.checkIn}
                            </span>
                          )}
                          {log.checkOut && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--kino-mid)" }}>
                              <LogOut size={11} /> {log.checkOut}
                            </span>
                          )}
                        </div>
                        {log.workHours && (
                          <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>{log.workHours}h</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs py-4 text-center" style={{ color: "var(--kino-muted)" }}>출퇴근 기록이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="portal-card p-12 text-center">
            <User size={48} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
            <p className="text-sm mb-2" style={{ color: "var(--kino-muted)" }}>
              직원 정보와 연결되지 않은 계정입니다.
            </p>
            <p className="text-xs" style={{ color: "var(--kino-light)" }}>
              어드민에서 직원 정보를 등록하고 이메일을 설정해주세요.
            </p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
