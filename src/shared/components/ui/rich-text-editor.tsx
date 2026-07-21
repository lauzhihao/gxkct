"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { mergeAttributes, Node } from "@tiptap/core"
import type { EditorView } from "@tiptap/pm/view"
import { EditorContent, useEditor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  Merge,
  Minus,
  Plus,
  Quote,
  Redo2,
  Save,
  Search,
  Split,
  SquarePen,
  Table2,
  Trash2,
  Undo2,
  X,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { useToast } from "@/shared/hooks/use-toast"
import { cn } from "@/shared/utils/utils"
import { getRichTextPreview, hasRichTextTable, isRichTextEmpty } from "@/shared/utils/rich-text"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onPasteImageUpload?: (file: File) => Promise<string>
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

interface TableActionState {
  canAddRow: boolean
  canDeleteRow: boolean
  canAddColumn: boolean
  canDeleteColumn: boolean
  canMergeCells: boolean
  canSplitCell: boolean
  canDeleteTable: boolean
}

const RichTextImage = Node.create({
  name: "image",
  group: "block",
  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)]
  },
})

const editorExtensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    horizontalRule: false,
  }),
  RichTextImage,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
]

function getPastedImageFile(event: ClipboardEvent): File | null {
  const clipboardItems = event.clipboardData?.items

  if (!clipboardItems) {
    return null
  }

  for (const item of Array.from(clipboardItems)) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) {
      continue
    }

    const file = item.getAsFile()
    if (file) {
      return file
    }
  }

  return null
}

function getTableActionState(editor: NonNullable<ReturnType<typeof useEditor>>): TableActionState {
  return {
    canAddRow: editor.can().addRowAfter(),
    canDeleteRow: editor.can().deleteRow(),
    canAddColumn: editor.can().addColumnAfter(),
    canDeleteColumn: editor.can().deleteColumn(),
    canMergeCells: editor.can().mergeCells(),
    canSplitCell: editor.can().splitCell(),
    canDeleteTable: editor.can().deleteTable(),
  }
}

function isSameTableActionState(current: TableActionState, next: TableActionState): boolean {
  return current.canAddRow === next.canAddRow
    && current.canDeleteRow === next.canDeleteRow
    && current.canAddColumn === next.canAddColumn
    && current.canDeleteColumn === next.canDeleteColumn
    && current.canMergeCells === next.canMergeCells
    && current.canSplitCell === next.canSplitCell
    && current.canDeleteTable === next.canDeleteTable
}

export function RichTextEditor({ value, onChange, onPasteImageUpload, placeholder, className, disabled = false }: RichTextEditorProps) {
  const { toast } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogDraft, setDialogDraft] = useState(value)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)
  const [inlineTableActionState, setInlineTableActionState] = useState<TableActionState>({
    canAddRow: false,
    canDeleteRow: false,
    canAddColumn: false,
    canDeleteColumn: false,
    canMergeCells: false,
    canSplitCell: false,
    canDeleteTable: false,
  })
  const [dialogTableActionState, setDialogTableActionState] = useState<TableActionState>({
    canAddRow: false,
    canDeleteRow: false,
    canAddColumn: false,
    canDeleteColumn: false,
    canMergeCells: false,
    canSplitCell: false,
    canDeleteTable: false,
  })
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const createEditorProps = (contentClassName: string) => ({
    attributes: {
      class: contentClassName,
    },
    handlePaste: (view: EditorView, event: ClipboardEvent) => {
      if (disabled || !onPasteImageUpload) {
        return false
      }

      const imageFile = getPastedImageFile(event)
      if (!imageFile) {
        return false
      }

      event.preventDefault()

      void (async () => {
        try {
          setIsUploadingImage(true)
          const imageUrl = await onPasteImageUpload(imageFile)
          const imageNodeType = view.state.schema.nodes.image

          if (!imageNodeType) {
            throw new Error("富文本编辑器未启用图片节点")
          }

          const imageNode = imageNodeType.create({
            src: imageUrl,
            alt: imageFile.name,
            title: imageFile.name,
          })

          view.dispatch(view.state.tr.replaceSelectionWith(imageNode).scrollIntoView())
          view.focus()
        } catch (error) {
          toast({
            variant: "destructive",
            title: "图片上传失败",
            description: error instanceof Error ? error.message : "无法处理粘贴的图片",
            duration: 3000,
          })
        } finally {
          setIsUploadingImage(false)
        }
      })()

      return true
    },
  })

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: editorExtensions,
    content: value,
    editorProps: createEditorProps("w-full rounded-b-md px-3 py-3 text-sm text-foreground focus:outline-none"),
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
    editorProps: createEditorProps("w-full rounded-b-md px-4 py-4 text-sm text-foreground focus:outline-none"),
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
    if (!editor) {
      return
    }

    const syncTableActionState = () => {
      const nextState = getTableActionState(editor)
      setInlineTableActionState((currentState) => {
        if (isSameTableActionState(currentState, nextState)) {
          return currentState
        }

        return nextState
      })
    }

    syncTableActionState()
    editor.on("selectionUpdate", syncTableActionState)
    editor.on("transaction", syncTableActionState)
    editor.on("focus", syncTableActionState)
    editor.on("blur", syncTableActionState)

    return () => {
      editor.off("selectionUpdate", syncTableActionState)
      editor.off("transaction", syncTableActionState)
      editor.off("focus", syncTableActionState)
      editor.off("blur", syncTableActionState)
    }
  }, [editor])

  useEffect(() => {
    if (!dialogEditor) {
      return
    }

    const syncDialogTableActionState = () => {
      const nextState = getTableActionState(dialogEditor)
      setDialogTableActionState((currentState) => {
        if (isSameTableActionState(currentState, nextState)) {
          return currentState
        }

        return nextState
      })
    }

    syncDialogTableActionState()
    dialogEditor.on("selectionUpdate", syncDialogTableActionState)
    dialogEditor.on("transaction", syncDialogTableActionState)
    dialogEditor.on("focus", syncDialogTableActionState)
    dialogEditor.on("blur", syncDialogTableActionState)

    return () => {
      dialogEditor.off("selectionUpdate", syncDialogTableActionState)
      dialogEditor.off("transaction", syncDialogTableActionState)
      dialogEditor.off("focus", syncDialogTableActionState)
      dialogEditor.off("blur", syncDialogTableActionState)
    }
  }, [dialogEditor])

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
          key: "addRowAfter",
          label: "新行",
          icon: Plus,
          onClick: () => dialogEditor.chain().focus().addRowAfter().run(),
          disabled: () => !dialogTableActionState.canAddRow,
        },
        {
          key: "deleteRow",
          label: "本行",
          icon: Minus,
          onClick: () => dialogEditor.chain().focus().deleteRow().run(),
          disabled: () => !dialogTableActionState.canDeleteRow,
        },
        {
          key: "addColumnAfter",
          label: "新列",
          icon: Plus,
          onClick: () => dialogEditor.chain().focus().addColumnAfter().run(),
          disabled: () => !dialogTableActionState.canAddColumn,
        },
        {
          key: "deleteColumn",
          label: "本列",
          icon: Minus,
          onClick: () => dialogEditor.chain().focus().deleteColumn().run(),
          disabled: () => !dialogTableActionState.canDeleteColumn,
        },
        {
          key: "mergeCells",
          label: "合并",
          icon: Merge,
          onClick: () => dialogEditor.chain().focus().mergeCells().run(),
          disabled: () => !dialogTableActionState.canMergeCells,
        },
        {
          key: "splitCell",
          label: "拆分",
          icon: Split,
          onClick: () => dialogEditor.chain().focus().splitCell().run(),
          disabled: () => !dialogTableActionState.canSplitCell,
        },
        {
          key: "deleteTable",
          label: "删表",
          icon: Trash2,
          onClick: () => dialogEditor.chain().focus().deleteTable().run(),
          disabled: () => !dialogTableActionState.canDeleteTable,
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
    "[&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted-foreground [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror]:outline-none [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_img]:block [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:max-h-[40vh] [&_.ProseMirror_img]:max-w-[85%] [&_.ProseMirror_img]:object-contain [&_.ProseMirror_img]:rounded-md [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-border [&_.ProseMirror_img]:shadow-sm [&_.ProseMirror_img]:my-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:table-fixed [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:px-2 [&_.ProseMirror_td]:py-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:bg-secondary/40 [&_.ProseMirror_th]:px-2 [&_.ProseMirror_th]:py-2 [&_.ProseMirror_th]:text-left [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6"

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

  const renderTableBubbleMenu = (currentEditor: NonNullable<typeof editor>, tableActionState: TableActionState) => (
    <BubbleMenu
      editor={currentEditor}
      shouldShow={({ editor: bubbleEditor }) => bubbleEditor.isEditable && bubbleEditor.isActive("table")}
      options={{ placement: "top", offset: 10 }}
      className="z-50"
    >
      <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-md border-border bg-background px-2.5"
          onMouseDown={(event) => {
            event.preventDefault()
            clearCollapseTimer()
          }}
          onClick={() => currentEditor.chain().focus().addRowAfter().run()}
          disabled={!tableActionState.canAddRow}
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs">新行</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-md border-border bg-background px-2.5 text-destructive hover:text-destructive"
          onMouseDown={(event) => {
            event.preventDefault()
            clearCollapseTimer()
          }}
          onClick={() => currentEditor.chain().focus().deleteRow().run()}
          disabled={!tableActionState.canDeleteRow}
        >
          <Minus className="h-4 w-4" />
          <span className="text-xs">本行</span>
        </Button>
        <div className="mx-1 h-5 w-px bg-border/60" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-md border-border bg-background px-2.5"
          onMouseDown={(event) => {
            event.preventDefault()
            clearCollapseTimer()
          }}
          onClick={() => currentEditor.chain().focus().addColumnAfter().run()}
          disabled={!tableActionState.canAddColumn}
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs">新列</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-md border-border bg-background px-2.5 text-destructive hover:text-destructive"
          onMouseDown={(event) => {
            event.preventDefault()
            clearCollapseTimer()
          }}
          onClick={() => currentEditor.chain().focus().deleteColumn().run()}
          disabled={!tableActionState.canDeleteColumn}
        >
          <Minus className="h-4 w-4" />
          <span className="text-xs">本列</span>
        </Button>
        <div className="mx-1 h-5 w-px bg-border/60" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-md border-border bg-background px-2.5"
          onMouseDown={(event) => {
            event.preventDefault()
            clearCollapseTimer()
          }}
          onClick={() => currentEditor.chain().focus().mergeCells().run()}
          disabled={!tableActionState.canMergeCells}
        >
          <Merge className="h-4 w-4" />
          <span className="text-xs">合并</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-md border-border bg-background px-2.5"
          onMouseDown={(event) => {
            event.preventDefault()
            clearCollapseTimer()
          }}
          onClick={() => currentEditor.chain().focus().splitCell().run()}
          disabled={!tableActionState.canSplitCell}
        >
          <Split className="h-4 w-4" />
          <span className="text-xs">拆分</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-md border-border bg-background px-2.5 text-destructive hover:text-destructive"
          onMouseDown={(event) => {
            event.preventDefault()
            clearCollapseTimer()
          }}
          onClick={() => currentEditor.chain().focus().deleteTable().run()}
          disabled={!tableActionState.canDeleteTable}
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">删表</span>
        </Button>
        </div>
      </div>
    </BubbleMenu>
  )

  const renderImageBubbleMenu = (currentEditor: NonNullable<typeof editor>) => (
    <BubbleMenu
      editor={currentEditor}
      shouldShow={({ editor: bubbleEditor }) => bubbleEditor.isEditable && bubbleEditor.isActive("image")}
      options={{ placement: "top", offset: 10 }}
      className="z-50"
    >
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 shadow-lg">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-md border-border bg-background px-2.5"
          onMouseDown={(event) => {
            event.preventDefault()
            clearCollapseTimer()
          }}
          onClick={() => {
            const imageAttributes = currentEditor.getAttributes("image")
            if (typeof imageAttributes.src !== "string" || imageAttributes.src.trim().length === 0) {
              toast({
                variant: "destructive",
                title: "预览失败",
                description: "当前图片缺少可预览地址",
                duration: 3000,
              })
              return
            }

            setPreviewImage({
              src: imageAttributes.src,
              alt: typeof imageAttributes.alt === "string" && imageAttributes.alt.trim().length > 0
                ? imageAttributes.alt
                : typeof imageAttributes.title === "string"
                  ? imageAttributes.title
                  : "",
            })
          }}
        >
          <Search className="h-4 w-4" />
          <span className="text-xs">预览</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-md border-border bg-background px-2.5 text-destructive hover:text-destructive"
          onMouseDown={(event) => {
            event.preventDefault()
            clearCollapseTimer()
          }}
          onClick={() => currentEditor.chain().focus().deleteSelection().run()}
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">删除</span>
        </Button>
      </div>
    </BubbleMenu>
  )

  const renderEditorContent = (currentEditor: NonNullable<typeof editor>, minHeightClassName: string) => (
    <div className="relative">
      {isUploadingImage ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md bg-background/95 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border">
          正在上传图片...
        </div>
      ) : null}
      <EditorContent
        editor={currentEditor}
        className={cn(
          editorContentClassName,
          "[&_.ProseMirror_.selectedCell]:bg-[var(--naive-primary-light)]/20 [&_.ProseMirror_.selectedCell]:shadow-[inset_0_0_0_1.5px_var(--naive-primary)] [&_.ProseMirror_table]:border [&_.ProseMirror_table]:border-border [&_.ProseMirror_table]:rounded-none [&_.ProseMirror_table]:overflow-visible",
          minHeightClassName,
        )}
      />
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
        {renderTableBubbleMenu(editor, inlineTableActionState)}
        {renderImageBubbleMenu(editor)}
        <div className={cn(isDialogOpen ? "opacity-60" : "", "transition-opacity")}>{renderEditorContent(editor, "[&_.ProseMirror]:min-h-[160px]")}</div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="!max-w-5xl w-[min(96vw,1200px)] max-h-[90vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>扩展编辑</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[calc(90vh-73px)] flex-col overflow-hidden">
            {renderToolbar(dialogToolbarGroups)}
            {renderImageBubbleMenu(dialogEditor)}
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

      <Dialog open={previewImage !== null} onOpenChange={(open) => {
        if (!open) {
          setPreviewImage(null)
        }
      }}>
        <DialogContent className="w-[min(96vw,1200px)] max-w-[calc(100vw-2rem)] border-none bg-background/95 p-3 shadow-2xl sm:max-w-[min(96vw,1200px)] sm:p-4">
          <DialogHeader className="sr-only">
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {previewImage ? (
            <div className="flex max-h-[85vh] flex-col gap-3 overflow-hidden">
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-muted/30 p-2 sm:p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImage.src}
                  alt={previewImage.alt}
                  className="h-auto max-h-[78vh] w-auto max-w-full object-contain"
                />
              </div>
              {previewImage.alt.trim().length > 0 ? <p className="text-sm text-muted-foreground">{previewImage.alt}</p> : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
