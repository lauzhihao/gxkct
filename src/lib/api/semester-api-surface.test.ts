import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8")
}

test("SemesterApi exposes required semester management methods", async () => {
  const source = await readSource("./semester-api.ts")

  assert.match(source, /async getSemesters\(collegeId: number\)/)
  assert.match(source, /async createSemester\(/)
  assert.match(source, /async getRunningCopyTasks\(collegeId: number\)/)
  assert.match(source, /async getSemesterCopyTask\(semesterId: number\)/)
  assert.match(source, /async switchCurrentSemester\(collegeId: number, semesterId: number\)/)
  assert.match(source, /async pollCopyTaskUntilFinished\(/)
})

test("SemesterApi polling stops only at terminal statuses", async () => {
  const source = await readSource("./semester-api.ts")

  assert.match(source, /const TERMINAL_TASK_STATUSES = new Set<SemesterCopyTaskStatus>\(\["COMPLETED", "FAILED"\]\)/)
  assert.match(source, /if \(TERMINAL_TASK_STATUSES\.has\(response\.data\.status\)\) \{[\s\S]*return response[\s\S]*\}/)
})

test("api index re-exports semester task domain types", async () => {
  const source = await readSource("./index.ts")

  assert.match(source, /export type \{[^}]*CreateSemesterPayload[^}]*SemesterCopyTask[^}]*SemesterCopyTaskStatus[^}]*\} from "@\/types"/)
})

test("TreeApi createDepartment uses v5 semester-aware endpoint", async () => {
  const source = await readSource("./tree-api.ts")

  assert.match(source, /async createDepartment\(collegeId: string, name: string, semesterId\?: number \| null\)/)
  assert.match(source, /queryParams\.set\("semesterId", String\(semesterId\)\)/)
  assert.match(source, /`\/api\/v5\/tree\/department\?\$\{queryParams\.toString\(\)\}`/)
})
