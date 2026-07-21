-- ------------------------------------------------------------
-- 组织树视图: vw_organization_tree
-- 说明: 在不修改现有表结构的前提下，统一输出学院→系部→专业→课程四级节点
-- ------------------------------------------------------------
DROP VIEW IF EXISTS `vw_organization_tree`;
CREATE VIEW `vw_organization_tree` AS
SELECT
    CONCAT('univ_', c.id)      AS node_id,
    'root'                     AS parent_id,
    'university'               AS node_type,
    c.name                     AS node_name,
    1                          AS node_level
FROM college_info c
WHERE c.deleted = 0
  AND c.id = 86

UNION ALL

SELECT
    CONCAT('dept_', d.id)              AS node_id,
    CONCAT('univ_', d.college_id)      AS parent_id,
    'department'                       AS node_type,
    d.name                             AS node_name,
    2                                  AS node_level
FROM department_list d
WHERE d.deleted = 0
  AND d.college_id = 86

UNION ALL

SELECT
    CONCAT('major_', m.id)             AS node_id,
    CONCAT('dept_', m.department_id)   AS parent_id,
    'major'                            AS node_type,
    m.name                             AS node_name,
    3                                  AS node_level
FROM major_list m
WHERE m.deleted = 0
  AND EXISTS (
        SELECT 1
        FROM department_list d
        WHERE d.id = m.department_id
          AND d.deleted = 0
          AND d.college_id = 86
    )

UNION ALL

SELECT
    CONCAT('course_', cu.id)           AS node_id,
    CONCAT('major_', cu.major_id)      AS parent_id,
    'course'                           AS node_type,
    cu.name                            AS node_name,
    4                                  AS node_level
FROM course_unit_list cu
WHERE cu.deleted = 0
  AND EXISTS (
        SELECT 1
        FROM major_list m
        WHERE m.id = cu.major_id
          AND m.deleted = 0
          AND EXISTS (
                SELECT 1
                FROM department_list d
                WHERE d.id = m.department_id
                  AND d.deleted = 0
                  AND d.college_id = 86
            )
    );

-- 建议查询示例:
-- SELECT * FROM vw_organization_tree ORDER BY node_level, node_name;
-- 提示: node_id / parent_id 采用字符串主键, 可在视图落地为物化表或使用CTE时添加索引以优化查找。
