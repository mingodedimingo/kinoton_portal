import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  Coffee,
  Loader2,
  Monitor,
  Plus,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  formatReservationRange,
  fromDateKey,
  getReservationDays,
  getReservationRange,
  getTimelinePosition,
  getTimelineSelection,
  isSameDay,
  isSameMonth,
  moveReservationAnchor,
  RESERVATION_CLOSE_HOUR,
  RESERVATION_OPEN_HOUR,
  type ReservationView,
  toDateKey,
} from "@/lib/reservationCalendar";
import { toast } from "sonner";

type Resource = {
  id: number;
  resourceType: "회의실" | "차량" | "장비" | "공간";
  name: string;
  location: string | null;
  capacity: number;
  description: string | null;
};

type Reservation = {
  id: number;
  resourceType: string;
  resourceName: string;
  reserveDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  employeeName: string;
  department: string | null;
  attendees: number;
  status: string;
};

const VIEW_OPTIONS: Array<{ value: ReservationView; label: string }> = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

const RESOURCE_TYPES = ["전체", "회의실", "차량", "장비", "공간"] as const;
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

const RESOURCE_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  회의실: { bg: "#F3F4F6", border: "#4B5563", text: "#1F2937" },
  차량: { bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8" },
  장비: { bg: "#FFF7ED", border: "#F59E0B", text: "#B45309" },
  공간: { bg: "#F0FDF4", border: "#22C55E", text: "#15803D" },
};

function ResourceIcon({ type, size = 17 }: { type: string; size?: number }) {
  const style = { color: "var(--kino-mid)" };
  if (type === "회의실") return <Building2 size={size} style={style} />;
  if (type === "차량") return <Car size={size} style={style} />;
  if (type === "장비") return <Monitor size={size} style={style} />;
  return <Coffee size={size} style={style} />;
}

function statusStyle(status: string) {
  if (status === "승인") return { background: "#F0FDF4", color: "#15803D" };
  if (status === "반려") return { background: "#FEF2F2", color: "#DC2626" };
  if (status === "취소")
    return { background: "var(--kino-pale)", color: "var(--kino-muted)" };
  return { background: "#FFFBEB", color: "#B45309" };
}

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <Loader2
        size={22}
        className="animate-spin"
        style={{ color: "var(--kino-muted)" }}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center gap-2 px-4 text-center">
      <CalendarDays size={22} style={{ color: "var(--kino-light)" }} />
      <p className="text-xs" style={{ color: "var(--kino-muted)" }}>
        {message}
      </p>
    </div>
  );
}

export default function ReservePage() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<ReservationView>("day");
  const [anchorDate, setAnchorDate] = useState(today);
  const [activeType, setActiveType] =
    useState<(typeof RESOURCE_TYPES)[number]>("전체");
  const [resourceId, setResourceId] = useState("all");
  const [selectedMobileDay, setSelectedMobileDay] = useState(toDateKey(today));
  const [selectedMonthDay, setSelectedMonthDay] = useState(toDateKey(today));
  const [showModal, setShowModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const [form, setForm] = useState({
    reserveDate: toDateKey(today),
    startTime: "09:00",
    endTime: "10:00",
    purpose: "",
    attendees: 1,
    note: "",
  });

  const utils = trpc.useUtils();
  const range = useMemo(
    () => getReservationRange(view, anchorDate),
    [view, anchorDate]
  );
  const days = useMemo(
    () => getReservationDays(view, anchorDate),
    [view, anchorDate]
  );

  const { data: resourceData, isLoading: resourcesLoading } =
    trpc.reservationResources.list.useQuery({ onlyActive: true });
  const resources = (resourceData ?? []) as Resource[];

  const { data: reservationData, isLoading: reservationsLoading } =
    trpc.reservations.byDateRange.useQuery(range, { enabled: Boolean(user) });
  const activeReservations = ((reservationData ?? []) as Reservation[]).filter(
    reservation =>
      reservation.status !== "반려" && reservation.status !== "취소"
  );

  const openId = (user as { openId?: string } | null)?.openId ?? "";
  const empId = openId.startsWith("emp_")
    ? Number(openId.replace("emp_", ""))
    : null;
  const { data: myReservationData } = trpc.reservations.myList.useQuery(
    { employeeId: empId as number },
    { enabled: empId !== null }
  );
  const myReservations = (myReservationData ?? []) as Reservation[];

  const visibleResources = useMemo(() => {
    return resources.filter(resource => {
      const matchesType =
        activeType === "전체" || resource.resourceType === activeType;
      const matchesResource =
        resourceId === "all" || resource.id === Number(resourceId);
      return matchesType && matchesResource;
    });
  }, [activeType, resourceId, resources]);

  const visibleReservations = useMemo(() => {
    const names = new Set(visibleResources.map(resource => resource.name));
    return activeReservations.filter(reservation =>
      names.has(reservation.resourceName)
    );
  }, [activeReservations, visibleResources]);

  const requestMutation = trpc.reservations.request.useMutation({
    onSuccess: () => {
      toast.success("예약 신청이 완료되었습니다.");
      setShowModal(false);
      utils.reservations.myList.invalidate();
      utils.reservations.byDateRange.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const cancelMutation = trpc.reservations.cancel.useMutation({
    onSuccess: () => {
      toast.success("예약이 취소되었습니다.");
      utils.reservations.myList.invalidate();
      utils.reservations.byDateRange.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const openReservationModal = (
    resource: Resource | null,
    reserveDate = toDateKey(anchorDate),
    startTime = "09:00",
    endTime = "10:00"
  ) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (reserveDate < toDateKey(new Date())) {
      toast.error("지난 날짜에는 예약을 신청할 수 없습니다.");
      return;
    }
    setSelectedResource(resource);
    setForm({
      reserveDate,
      startTime,
      endTime,
      purpose: "",
      attendees: 1,
      note: "",
    });
    setShowModal(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedResource || !user) {
      toast.error("예약할 자원을 선택해주세요.");
      return;
    }
    if (!form.purpose.trim()) {
      toast.error("사용 목적을 입력해주세요.");
      return;
    }
    if (form.startTime >= form.endTime) {
      toast.error("종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }

    requestMutation.mutate({
      resourceType: selectedResource.resourceType,
      resourceName: selectedResource.name,
      reserveDate: form.reserveDate,
      startTime: form.startTime,
      endTime: form.endTime,
      purpose: form.purpose,
      employeeId: empId ?? undefined,
      employeeName: (user as { name?: string }).name ?? "알 수 없음",
      department: (user as { department?: string }).department,
      attendees: form.attendees,
      note: form.note || undefined,
    });
  };

  const changeView = (nextView: ReservationView) => {
    setView(nextView);
    setSelectedMobileDay(toDateKey(anchorDate));
    setSelectedMonthDay(toDateKey(anchorDate));
  };

  const navigate = (amount: number) => {
    const next = moveReservationAnchor(view, anchorDate, amount);
    const nextRange = getReservationRange(view, next);
    setAnchorDate(next);
    setSelectedMobileDay(nextRange.startDate);
    setSelectedMonthDay(toDateKey(next));
  };

  const goToday = () => {
    const now = new Date();
    const nextRange = getReservationRange(view, now);
    setAnchorDate(now);
    setSelectedMobileDay(
      view === "week" ? nextRange.startDate : toDateKey(now)
    );
    setSelectedMonthDay(toDateKey(now));
  };

  const isLoading = resourcesLoading || reservationsLoading;
  const approvedCount = visibleReservations.filter(
    reservation => reservation.status === "승인"
  ).length;
  const pendingCount = visibleReservations.filter(
    reservation => reservation.status === "대기"
  ).length;

  return (
    <PortalLayout>
      <div className="container py-4 sm:py-6">
        <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1
                className="text-xl font-bold"
                style={{ color: "var(--kino-charcoal)" }}
              >
                예약 현황
              </h1>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: "var(--kino-pale)",
                  color: "var(--kino-mid)",
                }}
              >
                실시간
              </span>
            </div>
            <p
              className="text-xs sm:text-sm"
              style={{ color: "var(--kino-muted)" }}
            >
              자원별 빈 시간을 확인하고 원하는 시간대를 바로 예약하세요.
            </p>
          </div>
          <button
            onClick={() => openReservationModal(null, toDateKey(new Date()))}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
            style={{ background: "var(--kino-charcoal)" }}
          >
            <Plus size={15} /> 예약 신청
          </button>
        </header>

        <section className="portal-card overflow-hidden">
          <div
            className="border-b p-3 sm:p-4"
            style={{ borderColor: "var(--kino-pale)" }}
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div
                className="inline-flex w-full rounded-md p-1 sm:w-auto"
                style={{ background: "var(--kino-bg)" }}
              >
                {VIEW_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => changeView(option.value)}
                    className="flex-1 rounded px-5 py-1.5 text-xs font-semibold transition-colors sm:flex-none"
                    style={{
                      background:
                        view === option.value
                          ? "var(--kino-charcoal)"
                          : "transparent",
                      color:
                        view === option.value ? "white" : "var(--kino-muted)",
                      boxShadow:
                        view === option.value
                          ? "0 1px 4px rgba(0,0,0,0.14)"
                          : "none",
                    }}
                    aria-pressed={view === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  onClick={() => navigate(-1)}
                  className="rounded-md border p-2 transition-colors hover:bg-gray-50"
                  aria-label="이전 기간"
                  style={{ borderColor: "var(--kino-pale)" }}
                >
                  <ChevronLeft size={16} />
                </button>
                <div
                  className="min-w-44 text-center text-sm font-bold sm:min-w-60"
                  style={{ color: "var(--kino-charcoal)" }}
                >
                  {formatReservationRange(view, anchorDate)}
                </div>
                <button
                  onClick={() => navigate(1)}
                  className="rounded-md border p-2 transition-colors hover:bg-gray-50"
                  aria-label="다음 기간"
                  style={{ borderColor: "var(--kino-pale)" }}
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={goToday}
                  className="hidden items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold transition-colors hover:bg-gray-50 sm:flex"
                  style={{
                    borderColor: "var(--kino-pale)",
                    color: "var(--kino-mid)",
                  }}
                >
                  <RotateCcw size={13} /> 오늘
                </button>
              </div>
            </div>

            <div
              className="mt-3 flex flex-col gap-2 border-t pt-3 md:flex-row md:items-center md:justify-between"
              style={{ borderColor: "var(--kino-pale)" }}
            >
              <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0">
                {RESOURCE_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setActiveType(type);
                      setResourceId("all");
                    }}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{
                      background:
                        activeType === type
                          ? "var(--kino-charcoal)"
                          : "var(--kino-bg)",
                      color:
                        activeType === type ? "white" : "var(--kino-muted)",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={resourceId}
                  onChange={event => setResourceId(event.target.value)}
                  className="h-8 min-w-40 flex-1 rounded-md border bg-white px-2 text-xs outline-none md:flex-none"
                  style={{
                    borderColor: "var(--kino-pale)",
                    color: "var(--kino-charcoal)",
                  }}
                  aria-label="자원 선택"
                >
                  <option value="all">모든 자원</option>
                  {resources
                    .filter(
                      resource =>
                        activeType === "전체" ||
                        resource.resourceType === activeType
                    )
                    .map(resource => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name}
                      </option>
                    ))}
                </select>
                <div
                  className="hidden items-center gap-3 text-xs lg:flex"
                  style={{ color: "var(--kino-muted)" }}
                >
                  <span className="flex items-center gap-1">
                    <CheckCircle2
                      size={13}
                      style={{ color: "var(--kino-green)" }}
                    />{" "}
                    승인 {approvedCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <CircleDashed
                      size={13}
                      style={{ color: "var(--kino-amber)" }}
                    />{" "}
                    대기 {pendingCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : visibleResources.length === 0 ? (
            <EmptyState message="조건에 맞는 예약 자원이 없습니다." />
          ) : (
            <>
              {view === "day" && (
                <DailyView
                  date={toDateKey(anchorDate)}
                  resources={visibleResources}
                  reservations={visibleReservations}
                  onEmptySlotClick={openReservationModal}
                />
              )}
              {view === "week" && (
                <WeeklyView
                  days={days}
                  resources={visibleResources}
                  reservations={visibleReservations}
                  selectedMobileDay={selectedMobileDay}
                  onSelectMobileDay={setSelectedMobileDay}
                  onEmptyCellClick={(resource, date) =>
                    openReservationModal(resource, date)
                  }
                />
              )}
              {view === "month" && (
                <MonthlyView
                  anchorDate={anchorDate}
                  days={days}
                  reservations={visibleReservations}
                  resources={visibleResources}
                  selectedDay={selectedMonthDay}
                  onSelectDay={setSelectedMonthDay}
                  onReserve={openReservationModal}
                />
              )}
            </>
          )}
        </section>

        <MyReservations
          reservations={myReservations}
          onCancel={id => cancelMutation.mutate({ id })}
          isCancelling={cancelMutation.isPending}
        />
      </div>

      {showModal && (
        <ReservationModal
          resources={resources}
          selectedResource={selectedResource}
          setSelectedResource={setSelectedResource}
          form={form}
          setForm={setForm}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isSubmitting={requestMutation.isPending}
        />
      )}
    </PortalLayout>
  );
}

function DailyView({
  date,
  resources,
  reservations,
  onEmptySlotClick,
}: {
  date: string;
  resources: Resource[];
  reservations: Reservation[];
  onEmptySlotClick: (
    resource: Resource,
    date: string,
    startTime: string,
    endTime: string
  ) => void;
}) {
  const hours = Array.from(
    { length: RESERVATION_CLOSE_HOUR - RESERVATION_OPEN_HOUR + 1 },
    (_, index) => RESERVATION_OPEN_HOUR + index
  );
  const columnBackground =
    "repeating-linear-gradient(to right, transparent 0, transparent calc(5% - 1px), #F1F1F1 calc(5% - 1px), #F1F1F1 5%)";

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[980px]">
        <div
          className="flex h-11 border-b text-[11px] font-semibold"
          style={{
            borderColor: "var(--kino-pale)",
            background: "#FCFCFC",
            color: "var(--kino-muted)",
          }}
        >
          <div
            className="sticky left-0 z-20 flex w-52 shrink-0 items-center border-r bg-white px-4"
            style={{ borderColor: "var(--kino-pale)" }}
          >
            예약 자원
          </div>
          <div className="relative flex-1">
            {hours.map((hour, index) => (
              <span
                key={hour}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${(index / (hours.length - 1)) * 100}%` }}
              >
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
          </div>
        </div>

        {resources.map(resource => {
          const resourceReservations = reservations.filter(
            reservation =>
              reservation.reserveDate === date &&
              reservation.resourceName === resource.name
          );
          return (
            <div
              key={resource.id}
              className="flex min-h-18 border-b last:border-b-0"
              style={{ borderColor: "var(--kino-pale)" }}
            >
              <div
                className="sticky left-0 z-10 flex w-52 shrink-0 items-center gap-3 border-r bg-white px-4 py-3"
                style={{ borderColor: "var(--kino-pale)" }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                  style={{ background: "var(--kino-bg)" }}
                >
                  <ResourceIcon type={resource.resourceType} />
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate text-xs font-bold"
                    style={{ color: "var(--kino-charcoal)" }}
                  >
                    {resource.name}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[10px]"
                    style={{ color: "var(--kino-muted)" }}
                  >
                    {resource.location || resource.resourceType} ·{" "}
                    {resource.capacity}명
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="relative min-h-18 flex-1 text-left transition-colors hover:bg-gray-50/60 focus-visible:z-10 focus-visible:outline-2"
                style={{ backgroundImage: columnBackground }}
                onClick={event => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const selection = getTimelineSelection(
                    event.clientX - rect.left,
                    rect.width
                  );
                  onEmptySlotClick(
                    resource,
                    date,
                    selection.startTime,
                    selection.endTime
                  );
                }}
                aria-label={`${resource.name} 빈 시간 선택`}
              >
                {resourceReservations.map(reservation => {
                  const left = getTimelinePosition(reservation.startTime);
                  const right = getTimelinePosition(reservation.endTime);
                  const colors =
                    RESOURCE_COLORS[resource.resourceType] ??
                    RESOURCE_COLORS.회의실;
                  return (
                    <span
                      key={reservation.id}
                      className="pointer-events-none absolute top-2 bottom-2 overflow-hidden rounded-md border-l-[3px] px-2 py-1 shadow-sm"
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(right - left, 2.5)}%`,
                        background: colors.bg,
                        borderColor: colors.border,
                        color: colors.text,
                      }}
                      title={`${reservation.startTime}~${reservation.endTime} ${reservation.employeeName} · ${reservation.purpose}`}
                    >
                      <span className="block truncate text-[10px] font-bold">
                        {reservation.startTime}–{reservation.endTime}
                      </span>
                      <span className="block truncate text-[10px] opacity-80">
                        {reservation.purpose}
                      </span>
                    </span>
                  );
                })}
              </button>
            </div>
          );
        })}
      </div>
      <div
        className="flex items-center justify-between border-t px-4 py-2 text-[10px] sm:text-xs"
        style={{
          borderColor: "var(--kino-pale)",
          background: "#FCFCFC",
          color: "var(--kino-muted)",
        }}
      >
        <span>빈 영역을 클릭하면 30분 단위로 예약 시간이 자동 입력됩니다.</span>
        <span className="hidden sm:inline">
          운영 시간 {RESERVATION_OPEN_HOUR}:00–{RESERVATION_CLOSE_HOUR}:00
        </span>
      </div>
    </div>
  );
}

function WeeklyView({
  days,
  resources,
  reservations,
  selectedMobileDay,
  onSelectMobileDay,
  onEmptyCellClick,
}: {
  days: Date[];
  resources: Resource[];
  reservations: Reservation[];
  selectedMobileDay: string;
  onSelectMobileDay: (date: string) => void;
  onEmptyCellClick: (resource: Resource, date: string) => void;
}) {
  const todayKey = toDateKey(new Date());
  const selectedDate = fromDateKey(selectedMobileDay);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[1120px]">
          <div
            className="grid border-b"
            style={{
              gridTemplateColumns: "208px repeat(7, minmax(130px, 1fr))",
              borderColor: "var(--kino-pale)",
              background: "#FCFCFC",
            }}
          >
            <div
              className="sticky left-0 z-20 flex min-h-14 items-center border-r bg-white px-4 text-xs font-semibold"
              style={{
                borderColor: "var(--kino-pale)",
                color: "var(--kino-muted)",
              }}
            >
              예약 자원
            </div>
            {days.map(day => {
              const key = toDateKey(day);
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className="flex min-h-14 flex-col items-center justify-center border-r last:border-r-0"
                  style={{ borderColor: "var(--kino-pale)" }}
                >
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--kino-muted)" }}
                  >
                    {format(day, "EEE", { locale: ko })}
                  </span>
                  <span
                    className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: isToday
                        ? "var(--kino-charcoal)"
                        : "transparent",
                      color: isToday ? "white" : "var(--kino-charcoal)",
                    }}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}
          </div>

          {resources.map(resource => (
            <div
              key={resource.id}
              className="grid border-b last:border-b-0"
              style={{
                gridTemplateColumns: "208px repeat(7, minmax(130px, 1fr))",
                borderColor: "var(--kino-pale)",
              }}
            >
              <div
                className="sticky left-0 z-10 flex min-h-28 items-start gap-3 border-r bg-white px-4 py-3"
                style={{ borderColor: "var(--kino-pale)" }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                  style={{ background: "var(--kino-bg)" }}
                >
                  <ResourceIcon type={resource.resourceType} />
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate text-xs font-bold"
                    style={{ color: "var(--kino-charcoal)" }}
                  >
                    {resource.name}
                  </p>
                  <p
                    className="mt-0.5 text-[10px]"
                    style={{ color: "var(--kino-muted)" }}
                  >
                    {resource.capacity}명
                  </p>
                </div>
              </div>
              {days.map(day => {
                const date = toDateKey(day);
                const items = reservations.filter(
                  reservation =>
                    reservation.resourceName === resource.name &&
                    reservation.reserveDate === date
                );
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onEmptyCellClick(resource, date)}
                    className="min-h-28 border-r p-1.5 text-left transition-colors last:border-r-0 hover:bg-gray-50"
                    style={{ borderColor: "var(--kino-pale)" }}
                    aria-label={`${format(day, "M월 d일")} ${resource.name} 예약 추가`}
                  >
                    <div className="space-y-1">
                      {items.slice(0, 3).map(reservation => {
                        const colors =
                          RESOURCE_COLORS[resource.resourceType] ??
                          RESOURCE_COLORS.회의실;
                        return (
                          <div
                            key={reservation.id}
                            className="rounded border-l-2 px-1.5 py-1"
                            style={{
                              background: colors.bg,
                              borderColor: colors.border,
                              color: colors.text,
                            }}
                            title={`${reservation.employeeName} · ${reservation.purpose}`}
                            onClick={event => event.stopPropagation()}
                          >
                            <p className="truncate text-[9px] font-bold">
                              {reservation.startTime} {reservation.employeeName}
                            </p>
                            <p className="truncate text-[9px] opacity-75">
                              {reservation.purpose}
                            </p>
                          </div>
                        );
                      })}
                      {items.length === 0 && (
                        <span
                          className="block py-8 text-center text-[10px] opacity-0 transition-opacity hover:opacity-100"
                          style={{ color: "var(--kino-muted)" }}
                        >
                          + 예약
                        </span>
                      )}
                      {items.length > 3 && (
                        <p
                          className="px-1 text-[9px] font-semibold"
                          style={{ color: "var(--kino-muted)" }}
                        >
                          +{items.length - 3}건 더보기
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="md:hidden">
        <div
          className="flex gap-1 overflow-x-auto border-b p-2"
          style={{ borderColor: "var(--kino-pale)" }}
        >
          {days.map(day => {
            const key = toDateKey(day);
            const selected = key === selectedMobileDay;
            return (
              <button
                key={key}
                onClick={() => onSelectMobileDay(key)}
                className="min-w-14 flex-1 rounded-md px-2 py-2 text-center"
                style={{
                  background: selected
                    ? "var(--kino-charcoal)"
                    : "var(--kino-bg)",
                  color: selected ? "white" : "var(--kino-mid)",
                }}
              >
                <span className="block text-[10px]">
                  {format(day, "EEE", { locale: ko })}
                </span>
                <span className="mt-0.5 block text-sm font-bold">
                  {format(day, "d")}
                </span>
              </button>
            );
          })}
        </div>
        <div className="divide-y" style={{ borderColor: "var(--kino-pale)" }}>
          {resources.map(resource => {
            const items = reservations.filter(
              reservation =>
                reservation.resourceName === resource.name &&
                reservation.reserveDate === selectedMobileDay
            );
            return (
              <div key={resource.id} className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-md"
                      style={{ background: "var(--kino-bg)" }}
                    >
                      <ResourceIcon type={resource.resourceType} />
                    </div>
                    <div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: "var(--kino-charcoal)" }}
                      >
                        {resource.name}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--kino-muted)" }}
                      >
                        {resource.location || resource.resourceType}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onEmptyCellClick(resource, selectedMobileDay)
                    }
                    className="rounded-md border px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      borderColor: "var(--kino-pale)",
                      color: "var(--kino-mid)",
                    }}
                  >
                    + 예약
                  </button>
                </div>
                {items.length === 0 ? (
                  <p
                    className="rounded-md py-3 text-center text-[11px]"
                    style={{
                      background: "var(--kino-bg)",
                      color: "var(--kino-muted)",
                    }}
                  >
                    예약 없음
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {items.map(reservation => {
                      const colors =
                        RESOURCE_COLORS[resource.resourceType] ??
                        RESOURCE_COLORS.회의실;
                      return (
                        <div
                          key={reservation.id}
                          className="rounded-md border-l-[3px] px-3 py-2"
                          style={{
                            background: colors.bg,
                            borderColor: colors.border,
                            color: colors.text,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold">
                              {reservation.startTime}–{reservation.endTime}
                            </p>
                            <span className="text-[10px]">
                              {reservation.employeeName}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] opacity-80">
                            {reservation.purpose}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="sr-only">
          선택일: {format(selectedDate, "yyyy년 M월 d일")}
        </p>
      </div>
    </>
  );
}

function MonthlyView({
  anchorDate,
  days,
  reservations,
  resources,
  selectedDay,
  onSelectDay,
  onReserve,
}: {
  anchorDate: Date;
  days: Date[];
  reservations: Reservation[];
  resources: Resource[];
  selectedDay: string;
  onSelectDay: (date: string) => void;
  onReserve: (resource: Resource | null, date: string) => void;
}) {
  const today = new Date();
  const selectedReservations = reservations.filter(
    reservation => reservation.reserveDate === selectedDay
  );

  return (
    <div>
      <div
        className="grid grid-cols-7 border-b text-center text-[10px] font-semibold sm:text-xs"
        style={{
          borderColor: "var(--kino-pale)",
          background: "#FCFCFC",
          color: "var(--kino-muted)",
        }}
      >
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className="py-2.5"
            style={{
              color:
                index === 5
                  ? "#3B82F6"
                  : index === 6
                    ? "var(--kino-red)"
                    : undefined,
            }}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const date = toDateKey(day);
          const items = reservations.filter(
            reservation => reservation.reserveDate === date
          );
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, anchorDate);
          const selected = date === selectedDay;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDay(date)}
              className="relative min-h-20 border-b border-r p-1 text-left transition-colors hover:bg-gray-50 sm:min-h-32 sm:p-2"
              style={{
                borderColor: "var(--kino-pale)",
                background: selected
                  ? "#FAFAFA"
                  : inMonth
                    ? "white"
                    : "#FCFCFC",
                boxShadow: selected
                  ? "inset 0 0 0 2px var(--kino-charcoal)"
                  : "none",
              }}
              aria-label={`${format(day, "M월 d일")} 예약 ${items.length}건`}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold sm:h-7 sm:w-7 sm:text-xs"
                style={{
                  background: isToday ? "var(--kino-charcoal)" : "transparent",
                  color: isToday
                    ? "white"
                    : !inMonth
                      ? "var(--kino-light)"
                      : index % 7 === 5
                        ? "#3B82F6"
                        : index % 7 === 6
                          ? "var(--kino-red)"
                          : "var(--kino-charcoal)",
                }}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map(reservation => {
                  const colors =
                    RESOURCE_COLORS[reservation.resourceType] ??
                    RESOURCE_COLORS.회의실;
                  return (
                    <div
                      key={reservation.id}
                      className="truncate rounded px-1 py-0.5 text-[8px] font-semibold sm:px-1.5 sm:text-[10px]"
                      style={{ background: colors.bg, color: colors.text }}
                      title={`${reservation.startTime} ${reservation.resourceName} · ${reservation.purpose}`}
                    >
                      <span className="sm:hidden">{reservation.startTime}</span>
                      <span className="hidden sm:inline">
                        {reservation.startTime} {reservation.resourceName}
                      </span>
                    </div>
                  );
                })}
                {items.length > 3 && (
                  <p
                    className="px-1 text-[8px] font-bold sm:text-[10px]"
                    style={{ color: "var(--kino-muted)" }}
                  >
                    +{items.length - 3}건
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="border-t p-3 sm:p-4"
        style={{ borderColor: "var(--kino-pale)", background: "#FCFCFC" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p
              className="text-xs font-bold"
              style={{ color: "var(--kino-charcoal)" }}
            >
              {format(fromDateKey(selectedDay), "M월 d일 (EEE)", {
                locale: ko,
              })}
            </p>
            <p
              className="mt-0.5 text-[10px]"
              style={{ color: "var(--kino-muted)" }}
            >
              예약 {selectedReservations.length}건
            </p>
          </div>
          <button
            onClick={() => onReserve(null, selectedDay)}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: "var(--kino-charcoal)" }}
          >
            <Plus size={13} /> 이 날짜 예약
          </button>
        </div>
        {selectedReservations.length === 0 ? (
          <p
            className="rounded-md py-4 text-center text-xs"
            style={{ background: "white", color: "var(--kino-muted)" }}
          >
            등록된 예약이 없습니다.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {selectedReservations.map(reservation => {
              const colors =
                RESOURCE_COLORS[reservation.resourceType] ??
                RESOURCE_COLORS.회의실;
              return (
                <div
                  key={reservation.id}
                  className="rounded-md border-l-[3px] bg-white px-3 py-2 shadow-sm"
                  style={{ borderColor: colors.border }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="truncate text-xs font-bold"
                      style={{ color: "var(--kino-charcoal)" }}
                    >
                      {reservation.resourceName}
                    </p>
                    <span
                      className="shrink-0 text-[10px] font-semibold"
                      style={{ color: colors.text }}
                    >
                      {reservation.startTime}–{reservation.endTime}
                    </span>
                  </div>
                  <p
                    className="mt-1 truncate text-[11px]"
                    style={{ color: "var(--kino-muted)" }}
                  >
                    {reservation.employeeName} · {reservation.purpose}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {resources.length === 0 && (
          <span className="sr-only">예약 가능한 자원이 없습니다.</span>
        )}
      </div>
    </div>
  );
}

function MyReservations({
  reservations,
  onCancel,
  isCancelling,
}: {
  reservations: Reservation[];
  onCancel: (id: number) => void;
  isCancelling: boolean;
}) {
  const recent = reservations.slice().reverse().slice(0, 5);
  return (
    <section className="portal-card mt-4 overflow-hidden">
      <div className="section-header">
        <span className="section-title flex items-center gap-1.5">
          <Clock3 size={14} style={{ color: "var(--kino-mid)" }} /> 내 예약
        </span>
        <span className="text-[11px]" style={{ color: "var(--kino-muted)" }}>
          최근 {recent.length}건
        </span>
      </div>
      {recent.length === 0 ? (
        <EmptyState message="예약 내역이 없습니다." />
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--kino-pale)" }}>
          {recent.map(reservation => (
            <div
              key={reservation.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: "var(--kino-charcoal)" }}
                  >
                    {reservation.resourceName}
                  </p>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={statusStyle(reservation.status)}
                  >
                    {reservation.status}
                  </span>
                </div>
                <p
                  className="mt-0.5 truncate text-xs"
                  style={{ color: "var(--kino-muted)" }}
                >
                  {reservation.reserveDate} · {reservation.startTime}–
                  {reservation.endTime} · {reservation.purpose}
                </p>
              </div>
              {(reservation.status === "대기" ||
                reservation.status === "승인") && (
                <button
                  onClick={() => onCancel(reservation.id)}
                  disabled={isCancelling}
                  className="self-end rounded-md border px-2.5 py-1 text-[11px] sm:self-auto"
                  style={{
                    borderColor: "var(--kino-pale)",
                    color: "var(--kino-muted)",
                  }}
                >
                  취소
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReservationModal({
  resources,
  selectedResource,
  setSelectedResource,
  form,
  setForm,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  resources: Resource[];
  selectedResource: Resource | null;
  setSelectedResource: (resource: Resource | null) => void;
  form: {
    reserveDate: string;
    startTime: string;
    endTime: string;
    purpose: string;
    attendees: number;
    note: string;
  };
  setForm: (form: {
    reserveDate: string;
    startTime: string;
    endTime: string;
    purpose: string;
    attendees: number;
    note: string;
  }) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  isSubmitting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-modal-title"
        className="w-full rounded-t-xl bg-white p-5 shadow-2xl sm:mx-4 sm:max-w-md sm:rounded-lg"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2
              id="reservation-modal-title"
              className="text-base font-bold"
              style={{ color: "var(--kino-charcoal)" }}
            >
              예약 신청
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--kino-muted)" }}>
              {selectedResource
                ? selectedResource.name
                : "자원과 시간을 선택해주세요."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-gray-100"
            aria-label="예약 창 닫기"
          >
            <X size={17} style={{ color: "var(--kino-muted)" }} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span
              className="mb-1 block text-xs font-semibold"
              style={{ color: "var(--kino-mid)" }}
            >
              자원 선택 *
            </span>
            <select
              className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--kino-pale)",
                color: "var(--kino-charcoal)",
              }}
              value={selectedResource?.id ?? ""}
              onChange={event =>
                setSelectedResource(
                  resources.find(
                    resource => resource.id === Number(event.target.value)
                  ) ?? null
                )
              }
              required
            >
              <option value="" disabled>
                자원을 선택하세요
              </option>
              {resources.map(resource => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} ({resource.resourceType})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span
              className="mb-1 block text-xs font-semibold"
              style={{ color: "var(--kino-mid)" }}
            >
              예약 날짜 *
            </span>
            <input
              type="date"
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--kino-pale)",
                color: "var(--kino-charcoal)",
              }}
              value={form.reserveDate}
              min={toDateKey(new Date())}
              onChange={event =>
                setForm({ ...form, reserveDate: event.target.value })
              }
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span
                className="mb-1 block text-xs font-semibold"
                style={{ color: "var(--kino-mid)" }}
              >
                시작 시간 *
              </span>
              <input
                type="time"
                min="08:00"
                max="18:00"
                step={1800}
                className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: "var(--kino-pale)",
                  color: "var(--kino-charcoal)",
                }}
                value={form.startTime}
                onChange={event =>
                  setForm({ ...form, startTime: event.target.value })
                }
                required
              />
            </label>
            <label>
              <span
                className="mb-1 block text-xs font-semibold"
                style={{ color: "var(--kino-mid)" }}
              >
                종료 시간 *
              </span>
              <input
                type="time"
                min="08:00"
                max="18:00"
                step={1800}
                className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: "var(--kino-pale)",
                  color: "var(--kino-charcoal)",
                }}
                value={form.endTime}
                onChange={event =>
                  setForm({ ...form, endTime: event.target.value })
                }
                required
              />
            </label>
          </div>

          <label className="block">
            <span
              className="mb-1 block text-xs font-semibold"
              style={{ color: "var(--kino-mid)" }}
            >
              사용 목적 *
            </span>
            <input
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--kino-pale)",
                color: "var(--kino-charcoal)",
              }}
              placeholder="예: 프로젝트 킥오프 회의"
              value={form.purpose}
              onChange={event =>
                setForm({ ...form, purpose: event.target.value })
              }
              required
            />
          </label>

          <label className="block">
            <span
              className="mb-1 flex items-center gap-1 text-xs font-semibold"
              style={{ color: "var(--kino-mid)" }}
            >
              <Users size={12} /> 참석 인원
            </span>
            <input
              type="number"
              min={1}
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--kino-pale)",
                color: "var(--kino-charcoal)",
              }}
              value={form.attendees}
              onChange={event =>
                setForm({ ...form, attendees: Number(event.target.value) })
              }
            />
          </label>

          <label className="block">
            <span
              className="mb-1 block text-xs font-semibold"
              style={{ color: "var(--kino-mid)" }}
            >
              비고 (선택)
            </span>
            <textarea
              rows={2}
              className="w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--kino-pale)",
                color: "var(--kino-charcoal)",
              }}
              placeholder="추가 요청사항"
              value={form.note}
              onChange={event => setForm({ ...form, note: event.target.value })}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border px-4 text-sm"
              style={{
                borderColor: "var(--kino-pale)",
                color: "var(--kino-mid)",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--kino-charcoal)" }}
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}{" "}
              신청하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
