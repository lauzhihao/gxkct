"use client";

import { memo, useCallback, useState, useEffect } from "react";
import { type NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";
import { BaseFlowNode } from "./base-flow-node";
import { getStoredAuthUser } from "@/lib/api";

/**
 * 开课说明数据类型
 */
export interface CourseReportData {
  id: string;
  name: string;
  // 占位字段，后续扩展
  status?: "draft" | "submitted" | "approved";
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 扩展的开课说明数据类型，包含注入的回调
 */
interface CourseReportNodeData extends CourseReportData {
  highlighted?: boolean;
  isDeleting?: boolean;
  isRefreshing?: boolean;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onRefresh?: (nodeId: string) => void;
}

/**
 * 开课说明节点
 * 作为画布的最终节点，无右侧连接点，画布内唯一
 */
// 使用 any 类型绕过 @xyflow/react 的严格 Node 泛型约束
// 组件内部通过类型断言确保 data 属性类型安全
export const CourseReportNode = memo(function CourseReportNode(
  props: NodeProps<any>
) {
  const { id, data, selected } = props as {
    id: string;
    data: CourseReportNodeData;
    selected?: boolean;
  };
  const [userName, setUserName] = useState<string>("用户");

  // 获取当前用户名
  useEffect(() => {
    const authUser = getStoredAuthUser();
    if (authUser && authUser.userName) {
      setUserName(authUser.userName);
    }
  }, []);

  // 处理编辑按钮点击
  const handleEdit = useCallback(() => {
    data.onEdit?.(id);
  }, [data, id]);

  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    data.onDelete?.(id);
  }, [data, id]);

  // 处理重做按钮点击
  const handleRefresh = useCallback(() => {
    data.onRefresh?.(id);
  }, [data, id]);

  return (
    <BaseFlowNode
      id={id}
      selected={selected}
      highlighted={data.highlighted}
      isDeleting={data.isDeleting}
      isRefreshing={data.isRefreshing}
      icon={<FileText className="h-4 w-4" />}
      title={data.name || "开课说明"}
      headerColorClass="bg-rose-100"
      borderColorClass="border-rose-200"
      textColorClass="text-rose-700"
      handleColorClass="!bg-rose-500"
      width={480}
      showLeftHandle={true}
      showRightHandle={false}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
    >
      <div className="space-y-2 text-sm">
        {/* 用户标签 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 text-xs rounded border bg-primary/10 text-primary border-primary/20">
            {userName}
          </span>
          {data.createdAt && (
            <span className="text-gray-400 text-xs">
              创建于 {data.createdAt}
            </span>
          )}
        </div>

        {/* 查看开课说明链接 */}
        <p className="text-gray-500 text-lg text-center">
          <button
            type="button"
            onClick={handleEdit}
            className="text-primary hover:text-primary/80 hover:underline cursor-pointer text-lg"
          >
            点击查看
          </button>
          完整开课说明
        </p>
      </div>
    </BaseFlowNode>
  );
});

export default CourseReportNode;
