import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
});
