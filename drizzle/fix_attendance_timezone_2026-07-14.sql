-- ============================================================
-- 근태 타임존 오류 데이터 보정 스크립트
-- 작성일: 2026-07-14
-- 증상: UTC 기준 날짜 경계(15:00 KST = 00:00 UTC 다음날)로 인해
--       KST 기준 어제 21:09 퇴근 기록이 오늘 날짜로 잘못 묶임
-- 원인: getAttendanceLogs의 date 필터가 setHours(0,0,0,0) 로컬시간 사용
--       → 서버가 UTC 환경이므로 KST 00:00~23:59가 아닌 UTC 00:00~23:59로 조회됨
-- 수정: T00:00:00+09:00 ~ T23:59:59+09:00 KST 범위로 변경 완료
-- ============================================================

-- [1] 현재 잘못 기록된 데이터 확인 (실행 전 반드시 SELECT로 확인)
-- KST 기준 날짜별 출퇴근 기록 조회
SELECT
  employeeName,
  type,
  recordedAt AS stored_utc,
  CONVERT_TZ(recordedAt, '+00:00', '+09:00') AS kst_time,
  DATE(CONVERT_TZ(recordedAt, '+00:00', '+09:00')) AS kst_date
FROM attendance_logs
WHERE recordedAt >= '2026-07-13 00:00:00'
  AND recordedAt <= '2026-07-15 00:00:00'
ORDER BY employeeName, recordedAt;

-- [2] 오류 데이터 식별 기준
-- - KST 날짜가 2026-07-13인데 어드민 화면에서 2026-07-14로 표시된 기록
-- - 주로 KST 21:00~23:59 사이의 퇴근(checkout) 기록이 해당됨
--   (UTC 기준으로는 12:00~14:59이므로 UTC 날짜는 정상이나,
--    date 필터가 UTC 00:00~23:59로 잘못 적용되어 다음날 KST 00:00~08:59 기록까지 포함됨)

-- [3] 보정 방법 (수동 확인 후 실행)
-- 아래는 예시입니다. 실제 데이터를 SELECT로 확인 후 해당 ID를 특정하여 수정하세요.
-- attendance_logs 테이블에는 recordedAt(UTC timestamp)이 저장되므로
-- 실제 저장된 UTC 값 자체는 정확합니다. 조회 로직 버그이므로 데이터 수정 불필요.

-- [4] 결론: DB 데이터 자체는 올바른 UTC 값으로 저장되어 있음
-- 문제는 조회 시 날짜 필터 범위가 UTC 기준으로 잘못 계산되었던 것
-- 코드 수정(getAttendanceLogs date 필터 KST 변환)으로 해결됨
-- 별도 데이터 수정 불필요

-- [5] 검증 쿼리 - 수정 후 올바르게 조회되는지 확인
-- KST 2026-07-13 기록 (UTC 2026-07-12 15:00 ~ 2026-07-13 14:59)
SELECT
  employeeName,
  type,
  recordedAt AS stored_utc,
  CONVERT_TZ(recordedAt, '+00:00', '+09:00') AS kst_time
FROM attendance_logs
WHERE recordedAt >= '2026-07-12 15:00:00'  -- KST 2026-07-13 00:00:00
  AND recordedAt <= '2026-07-13 14:59:59'  -- KST 2026-07-13 23:59:59
ORDER BY employeeName, recordedAt;

-- KST 2026-07-14 기록 (UTC 2026-07-13 15:00 ~ 2026-07-14 14:59)
SELECT
  employeeName,
  type,
  recordedAt AS stored_utc,
  CONVERT_TZ(recordedAt, '+00:00', '+09:00') AS kst_time
FROM attendance_logs
WHERE recordedAt >= '2026-07-13 15:00:00'  -- KST 2026-07-14 00:00:00
  AND recordedAt <= '2026-07-14 14:59:59'  -- KST 2026-07-14 23:59:59
ORDER BY employeeName, recordedAt;
