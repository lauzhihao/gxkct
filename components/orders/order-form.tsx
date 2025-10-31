"use client"

import type React from "react"
import { useState } from "react"
import { showError, showWarning } from "@/lib/toast-utils"

const OrderForm: React.FC = () => {
  const [formData, setFormData] = useState({
    customerName: "",
    productName: "",
    quantity: 0,
    unitPrice: 0,
    deliveryDate: "",
  })

  const [onSave, setOnSave] = useState((data: any) => {})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerName.trim()) {
      showError("请输入客户名称", "验证错误")
      return
    }

    if (!formData.productName.trim()) {
      showError("请输入产品名称", "验证错误")
      return
    }

    if (formData.quantity <= 0) {
      showError("数量必须大于0", "验证错误")
      return
    }

    if (formData.unitPrice <= 0) {
      showError("单价必须大于0", "验证错误")
      return
    }

    if (!formData.deliveryDate) {
      showWarning("建议设置交货日期", "提示")
    }

    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields here */}
      <input
        type="text"
        placeholder="客户名称"
        value={formData.customerName}
        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
      />
      <input
        type="text"
        placeholder="产品名称"
        value={formData.productName}
        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
      />
      <input
        type="number"
        placeholder="数量"
        value={formData.quantity}
        onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) })}
      />
      <input
        type="number"
        placeholder="单价"
        value={formData.unitPrice}
        onChange={(e) => setFormData({ ...formData, unitPrice: Number.parseFloat(e.target.value) })}
      />
      <input
        type="date"
        placeholder="交货日期"
        value={formData.deliveryDate}
        onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
      />
      <button type="submit">提交订单</button>
    </form>
  )
}

export default OrderForm
