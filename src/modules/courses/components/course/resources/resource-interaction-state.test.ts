import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function loadInteractionState() {
  return import(new URL("./resource-interaction-state.ts", import.meta.url).href)
}

async function loadNameValidation() {
  return import(new URL("./resource-name-validation.ts", import.meta.url).href)
}

test("normal mode selects at most one file and supports deselection", async () => {
  const { toggleResourceSelection } = await loadInteractionState()

  const firstSelection = toggleResourceSelection("normal", new Set<string>(), "file-1")
  assert.deepEqual([...firstSelection], ["file-1"])

  const replacement = toggleResourceSelection("normal", firstSelection, "file-2")
  assert.deepEqual([...replacement], ["file-2"])

  const deselection = toggleResourceSelection("normal", replacement, "file-2")
  assert.deepEqual([...deselection], [])
})

test("batch mode toggles multiple files and mode changes clear selection", async () => {
  const {
    changeResourceInteractionMode,
    toggleResourceSelection,
  } = await loadInteractionState()

  const firstSelection = toggleResourceSelection("batch", new Set<string>(), "file-1")
  const multipleSelection = toggleResourceSelection("batch", firstSelection, "file-2")
  assert.deepEqual([...multipleSelection], ["file-1", "file-2"])

  const nextState = changeResourceInteractionMode("normal")
  assert.equal(nextState.mode, "normal")
  assert.equal(nextState.selectedIds.size, 0)
})

test("batch transfer eligibility requires editable batch state with persisted selections", async () => {
  const { canStartResourceBatchTransfer } = await loadInteractionState()
  const eligibleState = {
    mode: "batch" as const,
    courseEditable: true,
    selectedCount: 2,
    nodeId: "course-1",
    sourceFolderId: "folder-source",
    needInitialization: false,
    isLoading: false,
    isBatchDownloading: false,
    isDeleting: false,
    isBatchTransferring: false,
  }

  assert.equal(canStartResourceBatchTransfer(eligibleState), true)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, selectedCount: 1 }), true)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, mode: "normal" }), false)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, courseEditable: false }), false)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, selectedCount: 0 }), false)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, nodeId: null }), false)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, sourceFolderId: null }), false)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, needInitialization: true }), false)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, isLoading: true }), false)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, isBatchDownloading: true }), false)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, isDeleting: true }), false)
  assert.equal(canStartResourceBatchTransfer({ ...eligibleState, isBatchTransferring: true }), false)
  assert.throws(
    () => canStartResourceBatchTransfer({ ...eligibleState, selectedCount: 1.5 }),
    /批量选择数量无效/,
  )
})

test("resource clipboard freezes action context and selection while preparing", async () => {
  const { createPreparingResourceClipboard } = await loadInteractionState()
  const selectedIds = new Set(["object-1", "object-2"])
  const snapshot = createPreparingResourceClipboard(
    1,
    "copy",
    "node-1",
    "course",
    "folder-source",
    selectedIds,
  )
  selectedIds.clear()

  assert.deepEqual(snapshot, {
    requestId: 1,
    action: "copy",
    sourceNodeId: "node-1",
    sourceOwnerType: "course",
    sourceFolderId: "folder-source",
    items: [
      { objectId: "object-1", fingerprint: null, verificationError: null },
      { objectId: "object-2", fingerprint: null, verificationError: null },
    ],
    phase: "preparing",
  })
  assert.throws(
    () => createPreparingResourceClipboard(2, "move", "node-1", "course", "folder-source", new Set()),
    /未选择要处理的资源/,
  )
  assert.throws(
    () => createPreparingResourceClipboard(2, "move", "node-1", "course", " ", new Set(["object-1"])),
    /源目录 ID缺失或无效/,
  )
})

test("resource fingerprints use strict version etag checksum priority and exact comparison", async () => {
  const { readResourceFingerprint, resourceFingerprintMatches } = await loadInteractionState()

  assert.deepEqual(
    readResourceFingerprint({ version: "v1", etag: "etag-1", checksum: "sum-1" }),
    { kind: "version", value: "v1" },
  )
  assert.deepEqual(
    readResourceFingerprint({ version: null, etag: "etag-1", checksum: "sum-1" }),
    { kind: "etag", value: "etag-1" },
  )
  assert.deepEqual(
    readResourceFingerprint({ version: null, etag: undefined, checksum: "sum-1" }),
    { kind: "checksum", value: "sum-1" },
  )
  assert.equal(
    resourceFingerprintMatches(
      { kind: "version", value: "v1" },
      { version: "v1", etag: "changed-etag" },
    ),
    true,
  )
  assert.equal(
    resourceFingerprintMatches({ kind: "version", value: "v1" }, { version: "v2" }),
    false,
  )
  assert.equal(
    resourceFingerprintMatches({ kind: "etag", value: "etag-1" }, { etag: "etag-2" }),
    false,
  )
  assert.throws(() => readResourceFingerprint({}), /缺少可验证 fingerprint/)
  assert.throws(() => readResourceFingerprint({ version: " " }), /version 无效/)
})

test("completed clipboard distinguishes verifiable and ignored items", async () => {
  const {
    completeResourceClipboard,
    createPreparingResourceClipboard,
  } = await loadInteractionState()
  const preparing = createPreparingResourceClipboard(
    3,
    "move",
    "node-1",
    "major",
    "folder-source",
    new Set(["object-1", "object-2"]),
  )
  const ready = completeResourceClipboard(preparing, [
    {
      objectId: "object-1",
      fingerprint: { kind: "version", value: "v1" },
      verificationError: null,
    },
    {
      objectId: "object-2",
      fingerprint: null,
      verificationError: "资源已删除",
    },
  ])

  assert.equal(ready.phase, "ready")
  assert.equal(ready.items[0]?.fingerprint?.value, "v1")
  assert.equal(ready.items[1]?.verificationError, "资源已删除")
  assert.throws(
    () => completeResourceClipboard(preparing, [
      { objectId: "object-1", fingerprint: null, verificationError: null },
      { objectId: "object-2", fingerprint: null, verificationError: "资源已删除" },
    ]),
    /验证状态无效/,
  )
})

test("paste eligibility enforces ready same context non-root different target and pending flags", async () => {
  const {
    canPasteResourceClipboard,
    completeResourceClipboard,
    createPreparingResourceClipboard,
    normalizeResourceClipboardOwnerType,
  } = await loadInteractionState()
  const preparing = createPreparingResourceClipboard(
    4,
    "copy",
    "node-1",
    "course",
    "folder-source",
    new Set(["object-1"]),
  )
  const ready = completeResourceClipboard(preparing, [{
    objectId: "object-1",
    fingerprint: { kind: "checksum", value: "sum-1" },
    verificationError: null,
  }])
  const eligibility = {
    clipboard: ready,
    nodeId: "node-1",
    ownerType: "course" as const,
    targetFolderId: "folder-target",
    courseEditable: true,
    isLoading: false,
    isSubmitting: false,
  }

  assert.equal(normalizeResourceClipboardOwnerType(undefined), "course")
  assert.equal(canPasteResourceClipboard(eligibility), true)
  assert.equal(canPasteResourceClipboard({ ...eligibility, clipboard: preparing }), false)
  assert.equal(canPasteResourceClipboard({ ...eligibility, clipboard: null }), false)
  assert.equal(canPasteResourceClipboard({ ...eligibility, nodeId: "node-2" }), false)
  assert.equal(canPasteResourceClipboard({ ...eligibility, ownerType: "major" }), false)
  assert.equal(canPasteResourceClipboard({ ...eligibility, targetFolderId: null }), false)
  assert.equal(canPasteResourceClipboard({ ...eligibility, targetFolderId: "folder-source" }), false)
  assert.equal(canPasteResourceClipboard({ ...eligibility, courseEditable: false }), false)
  assert.equal(canPasteResourceClipboard({ ...eligibility, isLoading: true }), false)
  assert.equal(canPasteResourceClipboard({ ...eligibility, isSubmitting: true }), false)
})

test("batch action outcome parses full and partial success", async () => {
  const { parseResourceBatchActionOutcome } = await loadInteractionState()

  assert.deepEqual(
    parseResourceBatchActionOutcome(
      { succeeded: ["object-1", "object-2"], failed: [] },
      ["object-1", "object-2"],
    ),
    { succeededIds: ["object-1", "object-2"], failedIds: [] },
  )
  assert.deepEqual(
    parseResourceBatchActionOutcome(
      {
        succeeded: ["object-1"],
        failed: [{ objectId: "object-2", errorCode: "MOVE_FAILED", message: "移动失败" }],
      },
      ["object-1", "object-2"],
    ),
    { succeededIds: ["object-1"], failedIds: ["object-2"] },
  )
})

test("batch action outcome rejects malformed incomplete and unexpected responses", async () => {
  const { parseResourceBatchActionOutcome } = await loadInteractionState()
  const failedItem = { objectId: "object-2", errorCode: "COPY_FAILED", message: "复制失败" }

  assert.throws(() => parseResourceBatchActionOutcome(null, ["object-1"]), /响应格式无效/)
  assert.throws(
    () => parseResourceBatchActionOutcome({ failed: [] }, ["object-1"]),
    /succeeded 缺失或无效/,
  )
  assert.throws(
    () => parseResourceBatchActionOutcome({ succeeded: [] }, ["object-1"]),
    /failed 缺失或无效/,
  )
  assert.throws(
    () => parseResourceBatchActionOutcome({ succeeded: ["object-1"], failed: [] }, []),
    /请求对象为空/,
  )
  assert.throws(
    () => parseResourceBatchActionOutcome({ succeeded: ["object-1"], failed: [] }, ["object-1", "object-1"]),
    /请求资源对象 ID 重复/,
  )
  assert.throws(
    () => parseResourceBatchActionOutcome({ succeeded: [], failed: [] }, ["object-1"]),
    /未覆盖全部请求对象/,
  )
  assert.throws(
    () => parseResourceBatchActionOutcome({ succeeded: ["object-3"], failed: [] }, ["object-1"]),
    /未请求的成功对象/,
  )
  assert.throws(
    () => parseResourceBatchActionOutcome({ succeeded: ["object-1", "object-1"], failed: [] }, ["object-1"]),
    /重复对象/,
  )
  assert.throws(
    () => parseResourceBatchActionOutcome({ succeeded: ["object-1"], failed: [failedItem] }, ["object-1"]),
    /未请求的失败对象/,
  )
  assert.throws(
    () => parseResourceBatchActionOutcome({ succeeded: [], failed: [{ objectId: "object-1", errorCode: "", message: "复制失败" }] }, ["object-1"]),
    /批量操作错误码缺失或无效/,
  )
})

test("complete file names accept extensions spaces hyphens underscores and multiple dots", async () => {
  const { validateCompleteFileName } = await loadNameValidation()

  const validNames = [
    "先实现后批判.docx",
    "archive.release.v2.pdf",
    "course notes-final_v1.docx",
  ]
  for (const name of validNames) {
    assert.equal(validateCompleteFileName(name), null)
  }
})

test("complete file names reject forbidden characters controls trailing dots and invalid lengths", async () => {
  const { validateCompleteFileName } = await loadNameValidation()

  for (const name of ["invalid/name.docx", "invalid?.docx", "line\nbreak.docx", "tail."]) {
    assert.notEqual(validateCompleteFileName(name), null)
  }
  assert.notEqual(validateCompleteFileName("   "), null)
  assert.notEqual(validateCompleteFileName(`${"a".repeat(61)}.docx`), null)
})

test("batch object list omits individual actions while normal mode exposes accessible icons", async () => {
  const objectListSource = await readFile(
    new URL("./ResourceObjectList.tsx", import.meta.url),
    "utf8",
  )
  const actionsSource = await readFile(
    new URL("./ResourceTileActions.tsx", import.meta.url),
    "utf8",
  )
  const containerSource = await readFile(
    new URL("./CourseResourcesContainer.tsx", import.meta.url),
    "utf8",
  )
  const searchBarSource = await readFile(
    new URL("./ResourceSearchBar.tsx", import.meta.url),
    "utf8",
  )
  const typesSource = await readFile(
    new URL("./types.ts", import.meta.url),
    "utf8",
  )
  const pickerSource = await readFile(
    new URL("../../dialogs/course-resource-picker-dialog.tsx", import.meta.url),
    "utf8",
  )
  const destinationPickerUrl = new URL(
    "./ResourceDestinationPickerDialog.tsx",
    import.meta.url,
  )
  const dataHookSource = await readFile(
    new URL("../../../hooks/use-course-resources.ts", import.meta.url),
    "utf8",
  )
  const preferenceHookSource = await readFile(
    new URL("../../../hooks/use-resource-view-preference.ts", import.meta.url),
    "utf8",
  )

  const normalModeGuards = objectListSource.match(/interactionMode === "normal"/g)
  const directActionRenderers = objectListSource.match(/<ResourceTileActions/g)
  assert.equal(normalModeGuards?.length, 2)
  assert.equal(directActionRenderers?.length, 2)
  assert.doesNotMatch(objectListSource, /ResourceTileMenu|DropdownMenu/)
  assert.doesNotMatch(objectListSource, /title=\{entry\.object\.name\}/)
  assert.match(objectListSource, /title=\{name\}/)
  assert.match(actionsSource, /aria-label=\{`预览\$\{name\}`\}/)
  assert.match(actionsSource, /aria-label=\{`重命名\$\{name\}`\}/)
  assert.match(actionsSource, /aria-label=\{`删除\$\{name\}`\}/)
  assert.doesNotMatch(actionsSource, /\btitle=/)
  assert.match(actionsSource, /event\.stopPropagation\(\)/)
  assert.match(actionsSource, /group-focus-within\/tile:opacity-100/)
  assert.match(actionsSource, /@media\(hover:none\).*opacity-100/)
  assert.match(typesSource, /onViewModeChange: \(mode: "grid" \| "list"\) => void/)
  assert.match(typesSource, /viewMode: "grid" \| "list"/)
  assert.doesNotMatch(searchBarSource, /viewMode = "grid"|onViewModeChange\?\./)
  assert.match(searchBarSource, /role="group"\s*aria-label="资源视图"/)
  assert.match(searchBarSource, /aria-label="网格视图"\s*aria-pressed=\{viewMode === "grid"\}/)
  assert.match(searchBarSource, /aria-label="列表视图"\s*aria-pressed=\{viewMode === "list"\}/)
  assert.match(searchBarSource, /<TooltipContent side="bottom">网格视图<\/TooltipContent>/)
  assert.match(searchBarSource, /<TooltipContent side="bottom">列表视图<\/TooltipContent>/)
  assert.doesNotMatch(searchBarSource, /\btitle=/)
  assert.match(searchBarSource, /className="relative w-full sm:w-64"/)

  assert.match(objectListSource, /entries,\s*viewMode,\s*selectedIds/)
  assert.match(objectListSource, /const isListView = viewMode === "list"/)
  assert.match(objectListSource, /grid-cols-1[^"]*sm:grid-cols-2[^"]*xl:grid-cols-3/)
  assert.match(objectListSource, /const listClass = "[^"]*divide-y[^"]*"/)
  assert.match(objectListSource, /const listClass = "[^"]*overflow-x-auto[^"]*"/)
  assert.match(
    objectListSource,
    /const listRowClass = "grid min-w-\[46rem\] grid-cols-\[minmax\(15rem,1fr\)_8rem_6rem_10rem_7rem\] items-center"/,
  )
  assert.match(
    objectListSource,
    /const listPrimaryColumnsClass = "col-span-4 grid min-h-14 grid-cols-\[minmax\(15rem,1fr\)_8rem_6rem_10rem\] items-center"/,
  )
  assert.equal(Array.from(objectListSource.matchAll(/\blistRowClass\b/g)).length, 4)
  assert.equal(Array.from(objectListSource.matchAll(/\blistPrimaryColumnsClass\b/g)).length, 3)
  assert.equal(Array.from(objectListSource.matchAll(/\blistOperationCellClass\b/g)).length, 4)
  assert.doesNotMatch(objectListSource, /lg:hidden|lg:block|\bw-24\b|\bw-40\b/)
  assert.match(objectListSource, /\[&>div\]:top-1\/2 \[&>div\]:-translate-y-1\/2/)
  assert.match(objectListSource, /entry\.folder\.filesCount/)
  assert.match(objectListSource, /entry\.folder\.latestUploadedAt/)
  assert.match(objectListSource, /formatResourceSize\(entry\.object\.size\)/)
  assert.match(objectListSource, /formatOptionalResourceDate\(entry\.object\.uploadedAt\)/)
  assert.doesNotMatch(objectListSource, /无数据/)
  assert.match(
    objectListSource,
    /function formatOptionalResourceDate\(value: string \| null \| undefined\): string \| null/,
  )
  assert.match(
    objectListSource,
    /if \(value === undefined\) \{\s*return null\s*\}[\s\S]*if \(value === null\) \{\s*return null\s*\}[\s\S]*return formatResourceDate\(value\)/,
  )
  assert.match(
    objectListSource,
    /if \(Number\.isNaN\(date\.getTime\(\)\)\) \{\s*throw new Error\("资源更新时间无效"\)\s*\}/,
  )
  assert.equal(
    Array.from(
      objectListSource.matchAll(
        /<span className=\{listMetadataCellClass\}>\{updatedAtLabel\}<\/span>/g,
      ),
    ).length,
    2,
  )
  assert.match(objectListSource, /entry\.object\.mimeType/)
  assert.match(objectListSource, /entry\.upload\.size/)
  assert.match(objectListSource, /getUploadStatusLabel\(status, progressValue\)/)
  assert.match(objectListSource, /title=\{name\}/)
  assert.match(objectListSource, /import \{ Badge \} from "@\/shared\/components\/ui\/badge"/)
  assert.match(
    objectListSource,
    /if \(value === undefined\) \{\s*return null\s*\}[\s\S]*if \(!Number\.isInteger\(value\)\) \{\s*throw new Error\("文件夹文件数量无效"\)/,
  )
  assert.match(
    objectListSource,
    /if \(value < 0\) \{\s*throw new Error\("文件夹文件数量不能为负数"\)[\s\S]*if \(value === 0\) \{\s*return null\s*\}[\s\S]*return value/,
  )
  assert.match(
    objectListSource,
    /<Badge[\s\S]*variant="secondary"[\s\S]*tabular-nums[\s\S]*>\s*\{value\}\s*<\/Badge>/,
  )
  assert.doesNotMatch(objectListSource, /个文件/)
  assert.match(
    objectListSource,
    /renderFolderFilesCountBadge\([\s\S]*"absolute right-2 top-2"/,
  )
  assert.match(
    objectListSource,
    /<button[\s\S]*listPrimaryColumnsClass[\s\S]*<\/button>\s*<div className=\{listOperationCellClass\}>/,
  )
  assert.match(
    objectListSource,
    /className=\{cn\(listOperationCellClass, "flex items-center justify-end px-2"\)\}[\s\S]*\{cancelButton\}/,
  )

  const batchToolbarStart = containerSource.indexOf(
    'interactionMode === "batch" && hasSelectableObjects',
  )
  const objectListStart = containerSource.indexOf("<ResourceObjectList", batchToolbarStart)
  const batchToolbarSource = containerSource.slice(batchToolbarStart, objectListStart)
  assert.ok(batchToolbarStart >= 0)
  assert.ok(objectListStart > batchToolbarStart)
  assert.doesNotMatch(batchToolbarSource, /批量下载/)
  assert.ok(batchToolbarSource.indexOf("下载") < batchToolbarSource.indexOf("复制"))
  assert.match(batchToolbarSource, /onClick=\{handleCopySelected\}/)
  assert.match(batchToolbarSource, /onClick=\{handleCutSelected\}/)
  assert.equal(
    Array.from(batchToolbarSource.matchAll(/disabled=\{!canStartBatchTransfer\}/g)).length,
    2,
  )
  assert.match(batchToolbarSource, /<Download[^>]*>[\s\S]*下载/)
  assert.doesNotMatch(batchToolbarSource, /批量下载/)

  const clipboardCreationStart = containerSource.indexOf(
    "const clipboard = createPreparingResourceClipboard(",
  )
  const clipboardStateStart = containerSource.indexOf(
    "setResourceClipboard(clipboard)",
    clipboardCreationStart,
  )
  const normalModeStart = containerSource.indexOf(
    'changeResourceInteractionMode("normal")',
    clipboardStateStart,
  )
  const clearSelectionStart = containerSource.indexOf(
    "setSelectedIds(nextState.selectedIds)",
    normalModeStart,
  )
  const deferredPreparationStart = containerSource.indexOf(
    "void Promise.resolve().then(() => prepareResourceClipboard(clipboard))",
    clearSelectionStart,
  )
  assert.ok(clipboardCreationStart >= 0)
  assert.ok(clipboardStateStart > clipboardCreationStart)
  assert.ok(normalModeStart > clipboardStateStart)
  assert.ok(clearSelectionStart > normalModeStart)
  assert.ok(deferredPreparationStart > clearSelectionStart)

  assert.match(
    containerSource,
    /action: clipboard\.action,[\s\S]*sourceFolderId: clipboard\.sourceFolderId,[\s\S]*targetFolderId: currentParentId,[\s\S]*objectIds: verifiedObjectIds/,
  )
  assert.match(
    containerSource,
    /getObjectDetail\([\s\S]*resourceFingerprintMatches\(item\.fingerprint, response\.data\)[\s\S]*verifiedObjectIds\.push\(verificationResult\)/,
  )
  assert.match(containerSource, /if \(succeededCount > 0\) \{\s*refreshCurrentLevel\(\)/)
  assert.match(containerSource, /setResourceClipboard\(\(currentClipboard\) => \{[\s\S]*currentClipboard\.requestId !== clipboard\.requestId[\s\S]*return null/)
  assert.match(containerSource, /粘贴完成：成功 \$\{succeededCount\} 个，失败 0 个，忽略 \$\{ignoredCount\} 个/)
  assert.match(
    containerSource,
    /粘贴部分完成：成功 \$\{succeededCount\} 个，失败 \$\{failedCount\} 个，忽略 \$\{ignoredCount\} 个/,
  )
  assert.match(containerSource, /clipboard\.items\.filter\(\(item\) => item\.fingerprint === null\)/)
  assert.match(containerSource, /sourceNodeId[\s\S]*sourceOwnerType[\s\S]*sourceFolderId/)
  assert.match(containerSource, /\[nodeId, normalizedOwnerType\]/)
  assert.doesNotMatch(containerSource, /ResourceDestinationPickerDialog|batchTransferSnapshot/)
  assert.doesNotMatch(containerSource, /localStorage|sessionStorage|navigator\.clipboard/)
  await assert.rejects(readFile(destinationPickerUrl, "utf8"), /ENOENT/)

  const batchButtonIndex = searchBarSource.indexOf(
    '{interactionMode === "batch" ? "退出批量操作" : "批量操作"}',
  )
  const pasteButtonIndex = searchBarSource.indexOf("{isPasting ? \"粘贴中\" : \"粘贴\"}")
  assert.ok(batchButtonIndex >= 0)
  assert.ok(pasteButtonIndex > batchButtonIndex)
  assert.match(searchBarSource, /\{showPaste && \([\s\S]*disabled=\{disablePaste\}/)
  assert.match(typesSource, /showPaste: boolean[\s\S]*disablePaste: boolean[\s\S]*isPasting: boolean/)
  assert.ok(
    containerSource.indexOf("<ResourceSearchBar") <
      containerSource.indexOf("<RefreshCw"),
  )
  assert.match(
    containerSource,
    /import \{ useResourceViewPreference \} from "@\/modules\/courses\/hooks\/use-resource-view-preference"/,
  )
  assert.match(
    containerSource,
    /const \{ viewMode, setViewMode \} = useResourceViewPreference\(\)/,
  )
  assert.match(containerSource, /viewMode=\{viewMode\}[\s\S]*onViewModeChange=\{setViewMode\}/)
  assert.match(containerSource, /<ResourceObjectList[\s\S]*viewMode=\{viewMode\}/)
  assert.doesNotMatch(dataHookSource, /\bviewMode\b|\bsetViewMode\b/)
  assert.match(
    preferenceHookSource,
    /useState<ResourceViewMode>\("list"\)/,
  )
  assert.match(
    preferenceHookSource,
    /const storedViewMode = readResourceViewPreference\(window\.localStorage\)\s*setViewModeState\(storedViewMode\)/,
  )
  const preferenceEffectStart = preferenceHookSource.indexOf("useEffect(() => {")
  const preferenceSetterStart = preferenceHookSource.indexOf("const setViewMode = useCallback")
  assert.ok(preferenceEffectStart >= 0)
  assert.ok(preferenceSetterStart > preferenceEffectStart)
  const preferenceEffectSource = preferenceHookSource.slice(
    preferenceEffectStart,
    preferenceSetterStart,
  )
  assert.match(preferenceEffectSource, /readResourceViewPreference/)
  assert.doesNotMatch(preferenceEffectSource, /writeResourceViewPreference|setItem/)
  const preferenceSetterSource = preferenceHookSource.slice(preferenceSetterStart)
  assert.ok(
    preferenceSetterSource.indexOf("setViewModeState(nextViewMode)") <
      preferenceSetterSource.indexOf("writeResourceViewPreference(window.localStorage, nextViewMode)"),
  )
  assert.match(
    preferenceHookSource,
    /showError\("读取资源视图偏好失败，已使用列表视图"\)/,
  )
  assert.match(
    preferenceHookSource,
    /showError\("视图已切换，但偏好保存失败"\)/,
  )
  assert.doesNotMatch(searchBarSource, /批量下载|onBatchDownload|selectedCount/)
  assert.match(pickerSource, /viewMode="grid"[\s\S]*interactionMode="batch"/)
  assert.doesNotMatch(
    pickerSource,
    /useResourceViewPreference|resource-view-preference|localStorage/,
  )
})
