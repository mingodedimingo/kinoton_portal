import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatEmployeeEmail } from "../client/src/lib/employeeEmail";
import { compareOrgChartEmployees } from "../client/src/lib/employeeSort";

/**
 * 조직도 수기 데이터 계약 테스트 (재발 방지 가드)
 *
 * ORG_TREE는 직원 DB와 별도로 TSX에 하드코딩되어 있어 이름·부서명을 수기로
 * 옮기는 과정에서 오탈자가 생길 수 있다. 특히 노드 label은 DB department와
 * 정확히 일치해야 해당 부서 직원 카드와 상세 팝업이 연결된다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const orgChartSrc = readFileSync(join(here, "../client/src/pages/OrgChartPage.tsx"), "utf8");

describe("조직도 핵심 데이터 계약 (재발 방지)", () => {
  it("투자전략실 임원은 부사장 고영환으로 표기한다", () => {
    expect(orgChartSrc).toMatch(
      /id:\s*"invest",\s*label:\s*"투자전략실",\s*subLabel:\s*"부사장 고영환"/,
    );
    expect(orgChartSrc).not.toContain("고현환");
  });

  it("정도영 담당 노드 label은 DB 부서명 전략영업담당과 일치한다", () => {
    expect(orgChartSrc).toMatch(
      /id:\s*"strategy-dept",\s*label:\s*"전략영업담당",\s*subLabel:\s*"담당 정도영"/,
    );
    expect(orgChartSrc).not.toContain("권역망영업담당");
  });

  it("상세 팝업과 전화번호부는 공통 이메일 정규화 함수를 사용한다", () => {
    expect(orgChartSrc.match(/formatEmployeeEmail\(/g)).toHaveLength(2);
    expect(orgChartSrc).not.toMatch(/\$\{(?:emp|m)\.email\}@kinoton\.co\.kr/);
  });

  it("모든 부서의 직원 배열에 공통 조직도 정렬 함수를 적용한다", () => {
    expect(orgChartSrc).toContain("members.sort(compareOrgChartEmployees)");
  });
});

describe("조직도 직원 정렬", () => {
  it("입사일과 관계없이 팀장을 책임보다 먼저 노출한다", () => {
    const globalBusinessTeam = [
      { id: 30015, name: "강민구", position: "책임", joinDate: "2023-08-01" },
      { id: 30014, name: "최우성", position: "팀장", joinDate: "2025-03-05" },
    ].sort(compareOrgChartEmployees);

    expect(globalBusinessTeam.map((employee) => employee.name)).toEqual(["최우성", "강민구"]);
  });

  it("동일 직급은 입사일이 빠른 직원을 먼저 노출한다", () => {
    const managementPlanningTeam = [
      { id: 30018, name: "장민석", position: "책임", joinDate: "2026-05-11" },
      { id: 30017, name: "김진형", position: "책임", joinDate: "2026-04-14" },
    ].sort(compareOrgChartEmployees);

    expect(managementPlanningTeam.map((employee) => employee.name)).toEqual(["김진형", "장민석"]);
  });
});

describe("직원 이메일 정규화", () => {
  it("이미 전체 주소인 이메일에는 도메인을 다시 붙이지 않는다", () => {
    expect(formatEmployeeEmail("doyoung.jung@kinoton.co.kr")).toBe(
      "doyoung.jung@kinoton.co.kr",
    );
  });

  it("아이디만 저장된 레거시 값에는 회사 도메인을 한 번 붙인다", () => {
    expect(formatEmployeeEmail("doyoung.jung")).toBe("doyoung.jung@kinoton.co.kr");
  });

  it("빈 값과 미등록 표시는 이메일로 렌더링하지 않는다", () => {
    expect(formatEmployeeEmail(null)).toBeNull();
    expect(formatEmployeeEmail("  ")).toBeNull();
    expect(formatEmployeeEmail("-")).toBeNull();
  });
});
