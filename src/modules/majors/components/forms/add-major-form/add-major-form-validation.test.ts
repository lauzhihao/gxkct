import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8")
}

test("major level keeps missing and unknown detail values explicit for validation", async () => {
  const [hookSource, containerSource, typesSource] = await Promise.all([
    readSource("../../../hooks/use-major-form-state.ts"),
    readSource("./AddMajorFormContainer.tsx"),
    readSource("../../../types/components.ts"),
  ])

  assert.doesNotMatch(hookSource, /initialData\?\.majorLevel\s*\|\|\s*["']2["']/)
  assert.match(
    hookSource,
    /if \(typeof initialData\?\.majorLevel !== "string"\) \{\s*return ""\s*\}/
  )
  assert.match(
    containerSource,
    /case "majorLevel":\s*if \(value\.trim\(\) === ""\) \{\s*return "请选择专业层次"/
  )
  assert.match(containerSource, /专业层次数据无效，请重新选择/)
  assert.match(
    containerSource,
    /if \(typeof detailData\.majorLevel === "string"\) \{\s*setMajorLevel\(detailData\.majorLevel\)\s*\} else \{\s*setMajorLevel\(""\)/
  )
  assert.match(typesSource, /basicInfoErrors: MajorBasicInfoErrors/)
  assert.match(typesSource, /onFieldValidationChange: \(field: MajorBasicInfoField, value: string\) => void/)
})

test("major basic info validation preserves deterministic first-error focus order", async () => {
  const containerSource = await readSource("./AddMajorFormContainer.tsx")

  assert.match(
    containerSource,
    /const MAJOR_BASIC_INFO_FIELD_ORDER = \[\s*"majorCode",\s*"majorName",\s*"majorLevel",\s*"educationalFeatures",\s*\]/
  )
  assert.match(
    containerSource,
    /for \(const field of MAJOR_BASIC_INFO_FIELD_ORDER\) \{\s*if \(errors\[field\] !== undefined\) \{\s*return field/
  )
  assert.match(
    containerSource,
    /setBasicInfoFocusField\(firstInvalidBasicInfoField\)[\s\S]*setBasicInfoValidationAttempt/
  )
})

test("major level radio group uses roving focus and complete keyboard navigation", async () => {
  const sectionSource = await readSource("./sections/MajorBasicInfoSection.tsx")

  assert.match(sectionSource, /role="radiogroup"/)
  assert.match(sectionSource, /role="radio"/)
  assert.doesNotMatch(sectionSource, /department\.major\.create/)
  assert.doesNotMatch(sectionSource, /if \(!canManageMajor\) return/)
  assert.match(
    sectionSource,
    /tabIndex=\{tabbableMajorLevelIndex === index \? 0 : -1\}/
  )
  assert.match(
    sectionSource,
    /case "majorLevel":\s*majorLevelOptionRefs\.current\[0\]\?\.focus\(\)/
  )
  assert.match(sectionSource, /case "ArrowDown":[\s\S]*case "ArrowRight":/)
  assert.match(sectionSource, /case "ArrowUp":[\s\S]*case "ArrowLeft":/)
  assert.match(sectionSource, /case "Home":[\s\S]*case "End":/)
  assert.match(
    sectionSource,
    /event\.preventDefault\(\)[\s\S]*handleSetMajorLevel\(nextOption\.value\)[\s\S]*majorLevelOptionRefs\.current\[nextIndex\]\?\.focus\(\)/
  )
})

test("graduation requirements use the form entry permission while preserving semester readonly", async () => {
  const sectionSource = await readSource("./sections/GraduationRequirementsSection.tsx")

  assert.doesNotMatch(sectionSource, /major\.course\.create/)
  assert.doesNotMatch(sectionSource, /canManageGraduationRequirement/)
  assert.match(sectionSource, /const isSemesterReadonly = useSemesterReadonly\(\)/)
  assert.match(sectionSource, /disabled=\{isUploadDisabled \|\| isSemesterReadonly\}/)
  assert.match(sectionSource, /rows=\{4\}\s*disabled=\{isSemesterReadonly\}/)
  assert.match(
    sectionSource,
    /!isSemesterReadonly && graduationRequirements\.length > 1/
  )
  assert.match(
    sectionSource,
    /!isSemesterReadonly && requirement\.indicators\.length > 1/
  )
})
