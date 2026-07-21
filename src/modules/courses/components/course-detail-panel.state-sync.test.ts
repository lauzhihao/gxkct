import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./course-detail-panel.tsx", import.meta.url), "utf8")
}

test("only the latest matching course detail request can update state", async () => {
  const source = await readSource()

  assert.match(source, /const courseDetailRequestSequenceRef = useRef\(0\)/)
  assert.match(source, /currentCourseDetailRequestKeyRef\.current !== requestKey/)
  assert.match(source, /courseDetailRequestSequenceRef\.current === requestSequence/)
  assert.match(source, /currentCourseDetailRequestKeyRef\.current === requestKey/)
  assert.match(source, /responseCourseId !== requestedCourseId/)

  const latestResponseGuardIndex = source.indexOf("if (!isLatestRequest())")
  const responseStateWriteIndex = source.indexOf("setCourseDetailData(response.data)")
  assert.ok(latestResponseGuardIndex >= 0)
  assert.ok(responseStateWriteIndex > latestResponseGuardIndex)
})

test("normalizes numeric and course-prefixed node ids before requesting detail", async () => {
  const source = await readSource()

  assert.match(source, /\/\^\(\?:course_\)\?\(\\d\+\)\$\//)
  assert.match(source, /const requestedCourseId = parseCourseNodeId\(courseId, "Current course id"\)/)
  assert.match(
    source,
    /courseApiService\.getCourseDetail\(String\(requestedCourseId\), selectedSemesterId\)/,
  )
  assert.match(
    source,
    /const currentCourseId = parseCourseNodeId\(\s+currentCourseNodeIdRef\.current/,
  )
})

test("course save checks current permission node and accepted detail identity", async () => {
  const source = await readSource()

  assert.match(source, /if \(!courseEditableRef\.current \|\| semesterReadonlyRef\.current\)/)
  assert.match(source, /currentCourseId !== courseId/)
  assert.match(source, /acceptedCourseDetailIdentity\.data !== courseDetailData/)
  assert.match(
    source,
    /acceptedCourseDetailIdentity\.requestKey !== currentCourseDetailRequestKeyRef\.current/,
  )

  const contextChecks = source.match(/assertCurrentCourseEditContext\(\)/g)
  assert.equal(contextChecks?.length, 1)

  const firstContextCheckIndex = source.indexOf("assertCurrentCourseEditContext()")
  const saveRequestIndex = source.indexOf("api.courseDetail.saveCourseUnit(saveRequest)")
  assert.ok(firstContextCheckIndex >= 0)
  assert.ok(saveRequestIndex > firstContextCheckIndex)

  const staleContextSkipIndex = source.indexOf("if (!isCurrentCourseSaveContext())", saveRequestIndex)
  const localNodeUpdateIndex = source.indexOf("onUpdateNode(courseNode.nodeId", saveRequestIndex)
  assert.ok(staleContextSkipIndex > saveRequestIndex)
  assert.ok(localNodeUpdateIndex > staleContextSkipIndex)
  assert.match(
    source,
    /Course save succeeded after context changed; skipping local synchronization/,
  )
})

test("course goals use numeric ids and ignore stale requests", async () => {
  const source = await readSource()

  assert.match(source, /const courseGoalsRequestSequenceRef = useRef\(0\)/)
  assert.match(source, /const isLatestGoalsRequest = \(\) => \(/)
  assert.match(source, /courseGoalsRequestSequenceRef\.current === requestSequence/)
  assert.match(
    source,
    /courseGoalsApi\.getCourseMatrixHeaderGoals\(String\(requestedCourseId\)\)/,
  )

  const goalsLatestGuardIndex = source.indexOf("if (!isLatestGoalsRequest())")
  const goalsStateWriteIndex = source.indexOf("setCourseGoals(response.data)")
  assert.ok(goalsLatestGuardIndex >= 0)
  assert.ok(goalsStateWriteIndex > goalsLatestGuardIndex)
})

test("losing editability exits course edit mode", async () => {
  const source = await readSource()

  assert.match(
    source,
    /useEffect\(\(\) => \{\s+if \(!courseEditable\) \{\s+setIsEditingCourse\(false\)\s+\}\s+\}, \[courseEditable\]\)/,
  )
})

test("course edit failures provide back and retry actions", async () => {
  const source = await readSource()

  assert.match(source, /const renderCourseEditError = \(title: string, description: string\)/)
  assert.match(source, /返回课程详情/)
  assert.match(source, /onClick=\{\(\) => void loadCourseDetail\(\)\}/)

  const errorStateCalls = source.match(/return renderCourseEditError\(/g)
  assert.equal(errorStateCalls?.length, 2)
})

test("course header keeps its actions in responsive document flow", async () => {
  const source = await readSource()

  assert.match(
    source,
    /flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between/,
  )
  assert.match(source, /min-w-0 flex-1/)
  assert.match(source, /flex shrink-0 flex-col items-start gap-2 lg:items-end/)
  assert.doesNotMatch(source, /flex flex-col gap-2 absolute top-6 right-6/)
})
