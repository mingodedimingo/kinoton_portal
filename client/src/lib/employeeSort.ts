export type OrgChartSortableEmployee = {
  id: number;
  name: string;
  position: string;
  joinDate: string | Date | null;
};

/**
 * 조직도 노출 직급 순서.
 * 팀에서는 팀장이 가장 먼저 나오고, 이후 수석·책임·선임·주임·사원 순으로 노출한다.
 * 임원/담당 조직에서도 같은 비교 함수를 안전하게 사용할 수 있도록 상위 직급을 포함한다.
 */
const POSITION_PRIORITY = [
  "대표이사",
  "부사장",
  "상무",
  "담당",
  "팀장",
  "수석",
  "책임",
  "선임",
  "주임",
  "사원",
] as const;

const POSITION_PRIORITY_INDEX = new Map<string, number>(
  POSITION_PRIORITY.map((position, index) => [position, index]),
);

function joinDateTime(value: string | Date | null): number {
  if (!value) return Number.POSITIVE_INFINITY;

  const timestamp = value instanceof Date
    ? value.getTime()
    : new Date(`${value}T00:00:00`).getTime();

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

/**
 * 조직도 팀원 정렬 기준
 * 1. 직급 우선순위
 * 2. 동일 직급은 입사일이 빠른 직원 우선
 * 3. 동일 입사일/미등록 값은 이름, ID 순으로 고정해 렌더링 순서를 안정화
 */
export function compareOrgChartEmployees(
  left: OrgChartSortableEmployee,
  right: OrgChartSortableEmployee,
): number {
  const leftPosition = POSITION_PRIORITY_INDEX.get(left.position) ?? POSITION_PRIORITY.length;
  const rightPosition = POSITION_PRIORITY_INDEX.get(right.position) ?? POSITION_PRIORITY.length;

  if (leftPosition !== rightPosition) return leftPosition - rightPosition;

  const dateDifference = joinDateTime(left.joinDate) - joinDateTime(right.joinDate);
  if (dateDifference !== 0) return dateDifference;

  const nameDifference = left.name.localeCompare(right.name, "ko-KR");
  if (nameDifference !== 0) return nameDifference;

  return left.id - right.id;
}
