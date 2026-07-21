# Plan: Course Resource Picker

## Goal
Create a read-only resource picker dialog similar to Windows Explorer that uses existing course resources infrastructure and allows single or multiple selection. Returns selected resource IDs and their full breadcrumb path.

## Key requirements
1. Works as a modal dialog under `src/modules/courses/components/dialogs/`.
2. Reuses `useCourseResources` for data fetching (directories, objects, breadcrumbs, search).
3. Accepts props:
   - `nodeId` (courseId)
   - `open`, `onOpenChange`
   - `selectionMode` (`"single" | "multiple"`)
   - `onConfirm(selectedItems: Array<{ id: string; name: string; path: string }>)`
   - optional `defaultSelectedIds`
4. UI parity with existing course resources view: same breadcrumb, search bar (but read-only: no upload), `ResourceObjectList` grid layout, but selection only for files.
5. Provide local search within current level; input reuse existing search state from hook.
6. Once confirm is clicked, pass selected list to `onConfirm` and close dialog (caller handles state).
7. Hover states follow existing style guidelines (buttons -> hover text white).

## Approach
1. Build new component `course-resource-picker-dialog.tsx` under dialogs folder.
2. Component structure
   - Use `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter` layout.
   - Top area: `ResourceBreadcrumb` (clickable), optional inline search input (using `useCourseResources` searchTerm).
   - Body: if `needInitialization` or `!nodeId` show existing states; otherwise only list and search.
   - For selection: maintain internal `selectedIds` (Set). If `selectionMode === "single"`, selecting a new file clears previous selection; `ResourceObjectList` currently toggles `selectedIds`, but since we reuse within container, ensure `onToggleSelect` handles single mode.
3. Since existing `ResourceObjectList` displays directories same as root-level layout, we can reuse with props controlling what happens when tile clicked: directories call `enterFolder`, files toggle selection. We'll provide new optional `isSelectionEnabled` or handle per component via `onToggleSelect` and existing `selectedIds`.
4. For full path: combine `breadcrumbs` names + selected file name into string (e.g., `课程资源 / 资料 / 文件名`). On confirm, map selected object summary to { id, name, path }.
5. Because we don't need write operations, hide toolbar: no upload/delete buttons.

## Implementation steps
1. Create the dialog component with necessary props and state.
2. Use `useCourseResources` inside; pass `nodeId` to hook.
3. Manage selection set depending on mode.
4. Render search input (wired to `setSearchTerm`). Possibly provide `ResourceSearchBar` variant without upload buttons (maybe pass `uploadProps={undefined}` etc.).
5. Buttons: Cancel (hover -> white), Confirm (disabled if selection empty), show selected count text.
6. Export component via `src/modules/courses/components/index.ts` if needed.

