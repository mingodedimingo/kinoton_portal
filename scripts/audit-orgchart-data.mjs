import { readFileSync } from "node:fs";

const apiHtmlPath = process.argv[2];
const orgChartPath = process.argv[3] ?? "client/src/pages/OrgChartPage.tsx";

if (!apiHtmlPath) {
  console.error("Usage: node scripts/audit-orgchart-data.mjs <employees-api-html> [OrgChartPage.tsx]");
  process.exit(2);
}

const html = readFileSync(apiHtmlPath, "utf8");
const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/);
if (!preMatch) throw new Error("employees API JSON <pre> block not found");
const payload = JSON.parse(preMatch[1]);
const employees = payload.result.data.json.map(({ id, name, department, position, email, ext, isActive }) => ({
  id,
  name,
  department,
  position,
  email,
  ext,
  isActive,
}));

const source = readFileSync(orgChartPath, "utf8");
const nodeLines = source.split("\n").filter((line) => /\bid:\s*"/.test(line) && /\blabel:\s*"/.test(line));
const nodes = nodeLines.map((line) => {
  const id = line.match(/\bid:\s*"([^"]+)"/)?.[1];
  const label = line.match(/\blabel:\s*"([^"]+)"/)?.[1];
  const subLabel = line.match(/\bsubLabel:\s*"([^"]+)"/)?.[1] ?? null;
  return { id, label, subLabel };
});

const distance = (a, b) => {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return rows[a.length][b.length];
};

const names = [...new Set(employees.map((employee) => employee.name))];
const departments = [...new Set(employees.map((employee) => employee.department))].sort((a, b) => a.localeCompare(b, "ko"));
const labels = [...new Set(nodes.map((node) => node.label))];
const ownerRefs = nodes.flatMap((node) => {
  if (!node.subLabel || node.subLabel === "겸) 대표이사") return [];
  const parts = node.subLabel.trim().split(/\s+/);
  const name = parts.at(-1);
  const position = parts.length > 1 ? parts.slice(0, -1).join(" ") : null;
  return [{ nodeId: node.id, label: node.label, subLabel: node.subLabel, name, position }];
});

const unresolvedOwners = ownerRefs
  .filter((owner) => !names.includes(owner.name))
  .map((owner) => ({
    ...owner,
    nearestEmployee: names
      .map((name) => ({ name, distance: distance(owner.name, name) }))
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, "ko"))[0],
  }));

const ownerPositionMismatches = ownerRefs.flatMap((owner) => {
  const employee = employees.find((candidate) => candidate.name === owner.name);
  if (!employee || !owner.position || owner.position.includes("겸)")) return [];
  return employee.position === owner.position ? [] : [{ ...owner, dbPosition: employee.position, dbDepartment: employee.department }];
});

const departmentsMissingFromTree = departments.filter((department) => !labels.includes(department));
const treeLabelsWithoutDepartment = labels.filter((label) => !departments.includes(label));
const nearDepartmentMatches = treeLabelsWithoutDepartment
  .map((label) => ({
    label,
    nearestDepartment: departments
      .map((department) => ({ department, distance: distance(label, department) }))
      .sort((a, b) => a.distance - b.distance || a.department.localeCompare(b.department, "ko"))[0],
  }))
  .filter((item) => item.nearestDepartment.distance <= 4);

const duplicateNames = Object.entries(
  employees.reduce((counts, employee) => ({ ...counts, [employee.name]: (counts[employee.name] ?? 0) + 1 }), {}),
).filter(([, count]) => count > 1);

const report = {
  counts: {
    activeEmployees: employees.length,
    uniqueNames: names.length,
    uniqueDepartments: departments.length,
    orgNodes: nodes.length,
    ownerReferences: ownerRefs.length,
  },
  unresolvedOwners,
  ownerPositionMismatches,
  departmentsMissingFromTree,
  treeLabelsWithoutDepartment,
  nearDepartmentMatches,
  duplicateNames,
  departmentEmployeeCounts: Object.fromEntries(
    departments.map((department) => [department, employees.filter((employee) => employee.department === department).length]),
  ),
};

console.log(JSON.stringify(report, null, 2));

if (unresolvedOwners.length || departmentsMissingFromTree.length || duplicateNames.length) {
  process.exitCode = 1;
}
