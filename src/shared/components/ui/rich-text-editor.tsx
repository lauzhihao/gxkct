"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import {
  Bold,
  Columns3,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  Merge,
  Quote,
  Redo2,
  Rows3,
  Save,
  Split,
  SquarePen,
  Table2,
  Trash2,
  Undo2,
  X,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { cn } from "@/shared/utils/utils"
import { getRichTextPreview, hasRichTextTable, isRichTextEmpty } from "@/shared/utils/rich-text"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

interface ToolbarButton {
  key: string
  label: string
  icon: typeof Bold
  onClick: () => void
  isActive?: () => boolean
  disabled?: () => boolean
  compact?: boolean
}

interface ToolbarGroup {
  key: string
  buttons: ToolbarButton[]
}

const editorExtensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    horizontalRule: false,
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
]

export function RichTextEditor({ value, onChange, placeholder, className, disabled = false }: RichTextEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogDraft, setDialogDraft] = useState(value)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: editorExtensions,
    content: value,
    editorProps: {
      attributes: {
        class: "w-full rounded-b-md px-3 py-3 text-sm text-foreground focus:outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML()
      onChange(isRichTextEmpty(html) ? "" : html)
    },
  })
  const dialogEditor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: editorExtensions,
    content: dialogDraft,
    editorProps: {
      attributes: {
        class: "w-full rounded-b-md px-4 py-4 text-sm text-foreground focus:outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML()
      setDialogDraft(isRichTextEmpty(html) ? "" : html)
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    const currentHtml = editor.getHTML()
    if (currentHtml === value) {
      return
    }

    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    if (isDialogOpen) {
      return
    }

    setDialogDraft(value)
  }, [isDialogOpen, value])

  useEffect(() => {
    if (!dialogEditor) {
      return
    }

    const currentHtml = dialogEditor.getHTML()
    if (currentHtml === dialogDraft) {
      return
    }

    dialogEditor.commands.setContent(dialogDraft, { emitUpdate: false })
  }, [dialogDraft, dialogEditor])

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!dialogEditor) {
      return
    }

    dialogEditor.setEditable(!disabled)
  }, [dialogEditor, disabled])

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!editor || (!isExpanded && !isDialogOpen) || disabled) {
      return
    }

    const timer = setTimeout(() => {
      editor.commands.focus("end")
    }, 0)

    return () => clearTimeout(timer)
  }, [disabled, editor, isDialogOpen, isExpanded])

  useEffect(() => {
    if (!dialogEditor || !isDialogOpen || disabled) {
      return
    }

    const timer = setTimeout(() => {
      dialogEditor.commands.focus("end")
    }, 0)

    return () => clearTimeout(timer)
  }, [dialogEditor, disabled, isDialogOpen])

  if (!editor || !dialogEditor) {
    return null
  }

  const previewText = value ? getRichTextPreview(value) : ""
  const hasTable = value ? hasRichTextTable(value) : false

  const clearCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
  }

  const expandEditor = () => {
    if (disabled) {
      return
    }

    clearCollapseTimer()
    setIsExpanded(true)
  }

  const scheduleCollapse = () => {
    if (isDialogOpen) {
      return
    }

    clearCollapseTimer()
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false)
    }, 180)
  }

  const handleDialogOpenChange = (open: boolean) => {
    clearCollapseTimer()

    if (open) {
      setDialogDraft(value)
      setIsDialogOpen(true)
      setIsExpanded(true)
      return
    }

    setIsDialogOpen(false)
    setDialogDraft(value)
  }

  const handleDialogCancel = () => {
    clearCollapseTimer()
    setDialogDraft(value)
    setIsDialogOpen(false)
    setTimeout(() => {
      if (!disabled) {
        editor.commands.focus("end")
      }
    }, 0)
  }

  const handleDialogSave = () => {
    clearCollapseTimer()
    onChange(dialogDraft)
    editor.commands.setContent(dialogDraft, { emitUpdate: false })
    setIsDialogOpen(false)
    setIsExpanded(true)
    setTimeout(() => {
      if (!disabled) {
        editor.commands.focus("end")
      }
    }, 0)
  }

  const inlineToolbarGroups: ToolbarGroup[] = [
    {
      key: "text",
      buttons: [
        {
          key: "bold",
          label: "加粗",
          icon: Bold,
          onClick: () => editor.chain().focus().toggleBold().run(),
          isActive: () => editor.isActive("bold"),
          compact: true,
        },
        {
          key: "italic",
          label: "斜体",
          icon: Italic,
          onClick: () => editor.chain().focus().toggleItalic().run(),
          isActive: () => editor.isActive("italic"),
          compact: true,
        },
        {
          key: "bulletList",
          label: "无序列表",
          icon: List,
          onClick: () => editor.chain().focus().toggleBulletList().run(),
          isActive: () => editor.isActive("bulletList"),
          compact: true,
        },
        {
          key: "orderedList",
          label: "有序列表",
          icon: ListOrdered,
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
          isActive: () => editor.isActive("orderedList"),
          compact: true,
        },
        {
          key: "blockquote",
          label: "引用",
          icon: Quote,
          onClick: () => editor.chain().focus().toggleBlockquote().run(),
          isActive: () => editor.isActive("blockquote"),
          compact: true,
        },
      ],
    },
    {
      key: "expand",
      buttons: [
        {
          key: "expandEditor",
          label: "扩展编辑",
          icon: Maximize2,
          onClick: () => handleDialogOpenChange(true),
          compact: true,
        },
      ],
    },
  ]

  const dialogToolbarGroups: ToolbarGroup[] = [
    inlineToolbarGroups[0],
    {
      key: "table-base",
      buttons: [
        {
          key: "table",
          label: "插入表格",
          icon: Table2,
          onClick: () => dialogEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        },
        {
          key: "deleteTable",
          label: "删除表格",
          icon: Trash2,
          onClick: () => dialogEditor.chain().focus().deleteTable().run(),
          disabled: () => !dialogEditor.can().deleteTable(),
        },
      ],
    },
    {
      key: "table-rows",
      buttons: [
        {
          key: "addRowBefore",
          label: "上方插入行",
          icon: Rows3,
          onClick: () => dialogEditor.chain().focus().addRowBefore().run(),
          disabled: () => !dialogEditor.can().addRowBefore(),
        },
        {
          key: "addRowAfter",
          label: "下方插入行",
          icon: Rows3,
          onClick: () => dialogEditor.chain().focus().addRowAfter().run(),
          disabled: () => !dialogEditor.can().addRowAfter(),
        },
        {
          key: "deleteRow",
          label: "删除当前行",
          icon: Trash2,
          onClick: () => dialogEditor.chain().focus().deleteRow().run(),
          disabled: () => !dialogEditor.can().deleteRow(),
        },
      ],
    },
    {
      key: "table-columns",
      buttons: [
        {
          key: "addColumnBefore",
          label: "左侧插入列",
          icon: Columns3,
          onClick: () => dialogEditor.chain().focus().addColumnBefore().run(),
          disabled: () => !dialogEditor.can().addColumnBefore(),
        },
        {
          key: "addColumnAfter",
          label: "右侧插入列",
          icon: Columns3,
          onClick: () => dialogEditor.chain().focus().addColumnAfter().run(),
          disabled: () => !dialogEditor.can().addColumnAfter(),
        },
        {
          key: "deleteColumn",
          label: "删除当前列",
          icon: Trash2,
          onClick: () => dialogEditor.chain().focus().deleteColumn().run(),
          disabled: () => !dialogEditor.can().deleteColumn(),
        },
      ],
    },
    {
      key: "table-cells",
      buttons: [
        {
          key: "mergeCells",
          label: "合并单元格",
          icon: Merge,
          onClick: () => dialogEditor.chain().focus().mergeCells().run(),
          disabled: () => !dialogEditor.can().mergeCells(),
        },
        {
          key: "splitCell",
          label: "拆分单元格",
          icon: Split,
          onClick: () => dialogEditor.chain().focus().splitCell().run(),
          disabled: () => !dialogEditor.can().splitCell(),
        },
      ],
    },
    {
      key: "history",
      buttons: [
        {
          key: "undo",
          label: "撤销",
          icon: Undo2,
          onClick: () => dialogEditor.chain().focus().undo().run(),
          disabled: () => !dialogEditor.can().undo(),
          compact: true,
        },
        {
          key: "redo",
          label: "重做",
          icon: Redo2,
          onClick: () => dialogEditor.chain().focus().redo().run(),
          disabled: () => !dialogEditor.can().redo(),
          compact: true,
        },
      ],
    },
  ]

  const editorContentClassName =
    "[&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted-foreground [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror]:outline-none [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:table-fixed [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:px-2 [&_.ProseMirror_td]:py-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:bg-secondary/40 [&_.ProseMirror_th]:px-2 [&_.ProseMirror_th]:py-2 [&_.ProseMirror_th]:text-left [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6"

  const renderToolbar = (toolbarGroups: ToolbarGroup[], showInlineHint: boolean = false) => (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/35 px-3 py-2">
      {toolbarGroups.map((group, groupIndex) => (
        <Fragment key={group.key}>
          {groupIndex > 0 ? <div className="mx-1 h-5 w-px bg-border/70" /> : null}
          {group.buttons.map(({ key, label, icon: Icon, onClick, isActive, disabled: isDisabled, compact }) => (
            <Button
              key={key}
              type="button"
              variant={isActive?.() ? "default" : "outline"}
              size="sm"
              className={cn("h-8 gap-1.5", compact ? "px-2" : "px-2.5")}
              onMouseDown={clearCollapseTimer}
              onClick={onClick}
              disabled={disabled || isDisabled?.()}
              title={label}
            >
              <Icon className="h-4 w-4" />
              {!compact ? <span className="text-xs">{label}</span> : null}
            </Button>
          ))}
          {showInlineHint && group.key === "expand" ? (
            <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap">如需更丰富的功能请点击扩展编辑。</span>
          ) : null}
        </Fragment>
      ))}
    </div>
  )

  const renderEditorContent = (currentEditor: NonNullable<typeof editor>, minHeightClassName: string) => (
    <div className="relative">
      <EditorContent editor={currentEditor} className={cn(editorContentClassName, minHeightClassName)} />
      {placeholder && !(currentEditor.getText() || currentEditor.getHTML().replace(/<[^>]+>/g, "").trim()) ? (
        <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground" aria-hidden="true">
          {placeholder}
        </div>
      ) : null}
    </div>
  )

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={expandEditor}
        disabled={disabled}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-border bg-background/70 px-3 py-2 text-left shadow-sm transition-colors hover:border-[var(--naive-primary)] hover:bg-background focus:border-[var(--naive-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--naive-primary-light)] disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        <div className="min-w-0 flex-1">
          {previewText ? (
            <div className="truncate text-sm text-foreground">
              {previewText}
              {hasTable ? <span className="ml-2 text-xs text-muted-foreground">[含表格]</span> : null}
            </div>
          ) : (
            <div className="truncate text-sm text-muted-foreground">{placeholder || "点击输入内容"}</div>
          )}
        </div>
        <SquarePen className="h-4 w-4 flex-shrink-0 text-foreground/70" />
      </button>
    )
  }

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-md border border-border bg-background shadow-sm ring-1 ring-border/60 transition-colors focus-within:border-[var(--naive-primary)] focus-within:ring-[var(--naive-primary-light)]/60",
          className,
        )}
        onFocusCapture={clearCollapseTimer}
        onBlurCapture={scheduleCollapse}
      >
        {renderToolbar(inlineToolbarGroups, true)}
        <div className={cn(isDialogOpen ? "opacity-60" : "", "transition-opacity")}>{renderEditorContent(editor, "[&_.ProseMirror]:min-h-[160px]")}</div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="!max-w-5xl w-[min(96vw,1200px)] max-h-[90vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>扩展编辑</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[calc(90vh-73px)] flex-col overflow-hidden">
            {renderToolbar(dialogToolbarGroups)}
            <div className="flex-1 overflow-auto">{renderEditorContent(dialogEditor, "[&_.ProseMirror]:min-h-[420px]")}</div>
          </div>
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={handleDialogCancel} className="gap-2">
              <X className="h-4 w-4" />
              取消
            </Button>
            <Button type="button" onClick={handleDialogSave} className="gap-2">
              <Save className="h-4 w-4" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
