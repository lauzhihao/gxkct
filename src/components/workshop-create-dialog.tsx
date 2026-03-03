"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { WorkshopManagementForm } from "@/components/workshop-management-form"

interface WorkshopCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWorkshopCreated?: () => Promise<boolean> | void
}

export function WorkshopCreateDialog({ open, onOpenChange, onWorkshopCreated }: WorkshopCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建工作坊</DialogTitle>
          <DialogDescription>请按顺序完成 Banner、班组和用户导入后提交创建。</DialogDescription>
        </DialogHeader>

        <WorkshopManagementForm
          active={open}
          onWorkshopCreated={async () => {
            if (onWorkshopCreated) {
              await onWorkshopCreated()
            }
            onOpenChange(false)
            return true
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
