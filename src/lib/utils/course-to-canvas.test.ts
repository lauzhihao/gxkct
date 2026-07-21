import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { runInNewContext } from "node:vm"
import test from "node:test"
import ts from "typescript"

type Period = "theory" | "practice"
type ResolveCoursePeriodValue = (
  course: Record<string, unknown>,
  chapters: unknown[],
  period: Period,
) => number

async function loadResolveCoursePeriodValue(): Promise<ResolveCoursePeriodValue> {
  const source = await readFile(new URL("./course-to-canvas.ts", import.meta.url), "utf8")
  const helperStart = source.indexOf("function readFiniteNumber")
  const helperEnd = source.indexOf("// Panel 网格布局列数配置")

  assert.ok(helperStart >= 0, "course period helper start was not found")
  assert.ok(helperEnd > helperStart, "course period helper end was not found")

  const helperSource = `${source.slice(helperStart, helperEnd)}\nexport { resolveCoursePeriodValue }\n`
  const compiled = ts.transpileModule(helperSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const moduleExports: Record<string, unknown> = {}

  runInNewContext(compiled, { exports: moduleExports })
  const resolver = moduleExports.resolveCoursePeriodValue
  assert.equal(typeof resolver, "function")
  return resolver as ResolveCoursePeriodValue
}

test("uses a valid direct course period", async () => {
  const resolveCoursePeriodValue = await loadResolveCoursePeriodValue()

  assert.equal(resolveCoursePeriodValue({ theoryPeriod: "32" }, [], "theory"), 32)
})

test("sums valid chapter periods when the direct period is zero", async () => {
  const resolveCoursePeriodValue = await loadResolveCoursePeriodValue()
  const chapters = [
    { theoryPeriod: 12 },
    { theoryHours: "8" },
  ]

  assert.equal(resolveCoursePeriodValue({ theoryPeriod: 0 }, chapters, "theory"), 20)
})

test("preserves an explicit zero period", async () => {
  const resolveCoursePeriodValue = await loadResolveCoursePeriodValue()

  assert.equal(resolveCoursePeriodValue({ practicePeriod: 0 }, [], "practice"), 0)
  assert.equal(resolveCoursePeriodValue({}, [{ practicePeriod: 0 }], "practice"), 0)
})

test("rejects missing and invalid course period data", async () => {
  const resolveCoursePeriodValue = await loadResolveCoursePeriodValue()

  assert.throws(
    () => resolveCoursePeriodValue({}, [], "theory"),
    /课程理论学时缺失/,
  )
  assert.throws(
    () => resolveCoursePeriodValue({ theoryPeriod: "invalid" }, [], "theory"),
    /课程理论学时无效/,
  )
})

test("rejects missing and invalid chapter period data", async () => {
  const resolveCoursePeriodValue = await loadResolveCoursePeriodValue()

  assert.throws(
    () => resolveCoursePeriodValue({ theoryPeriod: 0 }, [{}], "theory"),
    /课程章节理论学时缺失/,
  )
  assert.throws(
    () => resolveCoursePeriodValue({ theoryPeriod: 0 }, [{ theoryPeriod: "invalid" }], "theory"),
    /课程章节理论学时无效/,
  )
})
