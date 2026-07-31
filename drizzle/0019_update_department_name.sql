-- 부서명 변경 및 인원 이관 (광고사업팀 -> 광고영업팀)
UPDATE employees
SET department = '광고영업팀'
WHERE department = '광고사업팀';
