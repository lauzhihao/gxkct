---
id: task-10
title: 项目矩阵-学时数
status: To Do
assignee: []
created_date: '2025-11-13'
labels:
  - Feature
  - P0
dependencies: []
priority: high
---

## Description

学时数拆分为理论学时和实践学时2个字段,与课程详情页面的章节列表进行双向关联:

- 在矩阵中修改了学时,会自动体现在课程详情页-章节列表中;
- 在章节列表中修改了章节总学时,会自动体现在项目矩阵表格中;
- 矩阵表格保存时会做学时统计并提示一致性错误,但是不影响自动保存。

