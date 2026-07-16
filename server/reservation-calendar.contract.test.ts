import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getReservationDays,
  getReservationRange,
  getTimelinePosition,
  getTimelineSelection,
  moveReservationAnchor,
  toDateKey,
} from "../client/src/lib/reservationCalendar";

describe("예약 현황판 날짜 범위 계약", () => {
  const anchor = new Date(2026, 6, 16, 12, 0, 0);

  it("일간 뷰는 선택한 하루만 조회한다", () => {
    expect(getReservationRange("day", anchor)).toEqual({
      startDate: "2026-07-16",
      endDate: "2026-07-16",
    });
  });

  it("주간 뷰는 월요일부터 일요일까지 조회한다", () => {
    expect(getReservationRange("week", anchor)).toEqual({
      startDate: "2026-07-13",
      endDate: "2026-07-19",
    });
    expect(getReservationDays("week", anchor)).toHaveLength(7);
  });

  it("월간 뷰는 달력에 노출되는 전체 주 범위를 조회한다", () => {
    expect(getReservationRange("month", anchor)).toEqual({
      startDate: "2026-06-29",
      endDate: "2026-08-02",
    });
    expect(getReservationDays("month", anchor)).toHaveLength(35);
  });

  it("뷰별 이전·다음 이동 단위를 지킨다", () => {
    expect(toDateKey(moveReservationAnchor("day", anchor, 1))).toBe(
      "2026-07-17"
    );
    expect(toDateKey(moveReservationAnchor("week", anchor, -1))).toBe(
      "2026-07-09"
    );
    expect(toDateKey(moveReservationAnchor("month", anchor, 1))).toBe(
      "2026-08-16"
    );
  });
});

describe("예약 현황판 UI 계약", () => {
  const pageSource = readFileSync(
    new URL("../client/src/pages/ReservePage.tsx", import.meta.url),
    "utf8"
  );

  it("일간·주간·월간 뷰를 모두 제공한다", () => {
    expect(pageSource).toContain('{ value: "day", label: "일간" }');
    expect(pageSource).toContain('{ value: "week", label: "주간" }');
    expect(pageSource).toContain('{ value: "month", label: "월간" }');
  });

  it("기간 조회 API를 사용하고 취소·반려 예약은 가용 시간을 막지 않는다", () => {
    expect(pageSource).toContain("trpc.reservations.byDateRange.useQuery");
    expect(pageSource).toContain(
      'reservation.status !== "반려" && reservation.status !== "취소"'
    );
  });
});

describe("예약 현황판 시간축 계약", () => {
  it("08시는 0%, 18시는 100% 위치다", () => {
    expect(getTimelinePosition("08:00")).toBe(0);
    expect(getTimelinePosition("13:00")).toBe(50);
    expect(getTimelinePosition("18:00")).toBe(100);
  });

  it("클릭 위치를 30분 단위로 내림하고 기본 1시간을 선택한다", () => {
    expect(getTimelineSelection(275, 1000)).toEqual({
      startTime: "10:30",
      endTime: "11:30",
    });
  });

  it("운영 종료 직전 클릭은 17:30~18:00으로 제한한다", () => {
    expect(getTimelineSelection(1000, 1000)).toEqual({
      startTime: "17:30",
      endTime: "18:00",
    });
  });
});
