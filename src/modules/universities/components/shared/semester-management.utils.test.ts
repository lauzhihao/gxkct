import assert from "node:assert/strict"
import test from "node:test"
import type { SemesterBrief } from "../../../../types/semester"

async function loadSemesterUtils() {
  return import(new URL("./semester-management.utils.ts", import.meta.url).href)
}

function createSemester(overrides: Partial<SemesterBrief>): SemesterBrief {
  return {
    id: 1,
    collegeId: 86,
    schoolYear: "2024",
    termType: "SPRING",
    name: "2024年春季学期",
    status: "ACTIVE",
    isCurrent: false,
    ...overrides,
  }
}

test("only user 40 can view semester management entry", async () => {
  const {
    SEMESTER_MANAGEMENT_ALLOWED_USER_ID,
    canViewSemesterManagement,
  } = await loadSemesterUtils()

  assert.equal(SEMESTER_MANAGEMENT_ALLOWED_USER_ID, 40)
  assert.equal(canViewSemesterManagement(40), true)
  assert.equal(canViewSemesterManagement(39), false)
  assert.equal(canViewSemesterManagement(null), false)
})

test("shows set-current action for non-current READY semester", async () => {
  const { canSetSemesterAsCurrent } = await loadSemesterUtils()

  assert.equal(canSetSemesterAsCurrent(createSemester({
    isCurrent: false,
    status: "READY",
  })), true)
})

test("hides set-current action for current or non-READY semester", async () => {
  const { canSetSemesterAsCurrent } = await loadSemesterUtils()

  assert.equal(canSetSemesterAsCurrent(createSemester({
    isCurrent: true,
    status: "READY",
  })), false)

  assert.equal(canSetSemesterAsCurrent(createSemester({
    isCurrent: false,
    status: "INITING",
  })), false)
})

test("builds next AUTUMN semester draft from SPRING semester", async () => {
  const { buildNextSemesterDraft } = await loadSemesterUtils()

  const draft = buildNextSemesterDraft(createSemester({
    id: 11,
    schoolYear: "2024",
    termType: "SPRING",
    name: "2024年春季学期",
  }))

  assert.deepEqual(draft, {
    schoolYear: "2024",
    targetTermType: "AUTUMN",
    name: "2024年秋季学期",
  })
})

test("builds next SPRING semester draft from AUTUMN semester", async () => {
  const { buildNextSemesterDraft } = await loadSemesterUtils()

  const draft = buildNextSemesterDraft(createSemester({
    id: 12,
    schoolYear: "2024",
    termType: "AUTUMN",
    name: "2024年秋季学期",
  }))

  assert.deepEqual(draft, {
    schoolYear: "2025",
    targetTermType: "SPRING",
    name: "2025年春季学期",
  })
})

test("throws when term cannot be recognized", async () => {
  const { buildNextSemesterDraft } = await loadSemesterUtils()

  assert.throws(
    () => buildNextSemesterDraft(createSemester({
      schoolYear: "2024",
      termType: 99,
      name: "未知学期",
    })),
    /无法识别学期类型/,
  )
})

test("keeps academic year range when creating SPRING from AUTUMN semester", async () => {
  const { buildNextSemesterDraft } = await loadSemesterUtils()

  const draft = buildNextSemesterDraft(createSemester({
    id: 21,
    schoolYear: "2024-2025",
    termType: "AUTUMN",
    name: "2024-2025学年第一学期",
  }))

  assert.deepEqual(draft, {
    schoolYear: "2024-2025",
    targetTermType: "SPRING",
    name: "2024-2025学年第二学期",
  })
})

test("advances academic year range when creating AUTUMN from SPRING semester", async () => {
  const { buildNextSemesterDraft } = await loadSemesterUtils()

  const draft = buildNextSemesterDraft(createSemester({
    id: 22,
    schoolYear: "2024-2025",
    termType: "SPRING",
    name: "2024-2025学年第二学期",
  }))

  assert.deepEqual(draft, {
    schoolYear: "2025-2026",
    targetTermType: "AUTUMN",
    name: "2025-2026学年第一学期",
  })
})

test("throws when schoolYear format is invalid", async () => {
  const { buildNextSemesterDraft } = await loadSemesterUtils()

  assert.throws(
    () => buildNextSemesterDraft(createSemester({
      schoolYear: "2024/25",
      termType: "SPRING",
      name: "格式错误学年",
    })),
    /无法识别学年/,
  )
})
