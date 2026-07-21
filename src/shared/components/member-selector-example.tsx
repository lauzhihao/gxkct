"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { MemberSelector } from "./member-selector"
import type { NodeType } from "@/types"

interface MemberSelectorExampleProps {
  nodeType: NodeType
  mode?: "single" | "multiple"
  departmentId?: string
  majorId?: string
}

// 使用示例组件
export function MemberSelectorExample({
  nodeType,
  mode = "single",
  departmentId,
  majorId
}: MemberSelectorExampleProps) {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<any[]>([])

  const handleMemberSelect = (selected: any) => {
    if (Array.isArray(selected)) {
      setSelectedMembers(selected)
      console.log("选中的成员列表:", selected)
    } else {
      setSelectedMembers([selected])
      console.log("选中的成员:", selected)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setSelectorOpen(true)}>打开成员选择器</Button>

      <MemberSelector
        mode={mode}
        nodeType={nodeType}
        departmentId={departmentId}
        majorId={majorId}
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onConfirm={handleMemberSelect}
        title={mode === "single" ? "选择成员" : "选择成员"}
        description={mode === "single" ? "请选择一个成员" : "请选择一个或多个成员"}
      />

      {selectedMembers.length > 0 && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">已选择的成员：</h3>
          <ul className="space-y-1">
            {selectedMembers.map((member) => (
              <li key={member.id} className="text-sm">
                {member.name} ({member.account}) - {member.auth}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

