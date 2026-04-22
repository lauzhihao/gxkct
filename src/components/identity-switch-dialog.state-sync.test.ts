import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./identity-switch-dialog.tsx", import.meta.url), "utf8")
}

test("identity switch persists current school and semester context before reload", async () => {
  const source = await readSource()

  assert.doesNotMatch(source, /syncFromAuthContext/)
  assert.match(source, /onSchoolChange\?: \(schoolId: string\) => void/)
  assert.match(source, /if \(onSchoolChange\) \{\s*onSchoolChange\(String\(collegeId\)\)/)
  assert.match(source, /const semesterResponse = await api\.semesters\.getSemesters\(collegeId\)/)
  assert.match(source, /setStoredSemesterContext\(\{\s*currentSemesterId,\s*selectedSemesterId: currentSemesterId,\s*semesterList,\s*\}\)/)
  assert.match(source, /window\.location\.href = "\/"/)
})
