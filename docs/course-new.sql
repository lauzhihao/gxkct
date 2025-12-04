/*
 Navicat Premium Data Transfer

 Source Server         : root@localhost
 Source Server Type    : MySQL
 Source Server Version : 90400
 Source Host           : 127.0.0.1:3306
 Source Schema         : course

 Target Server Type    : MySQL
 Target Server Version : 90400
 File Encoding         : 65001

 Date: 04/12/2025 12:55:46
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for course_resource_download_task
-- ----------------------------
DROP TABLE IF EXISTS `course_resource_download_task`;
CREATE TABLE `course_resource_download_task` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `task_id` varchar(64) NOT NULL COMMENT '任务ID（外部使用）',
  `course_id` bigint NOT NULL COMMENT '所属课程ID',
  `object_ids` json NOT NULL COMMENT '包含的对象ID列表',
  `status` varchar(32) DEFAULT 'pending' COMMENT '任务状态（pending/processing/completed/failed）',
  `download_url` varchar(1024) DEFAULT NULL COMMENT '下载链接',
  `file_size` bigint DEFAULT NULL COMMENT '压缩包大小（字节）',
  `error_message` varchar(512) DEFAULT NULL COMMENT '错误信息',
  `expire_at` datetime DEFAULT NULL COMMENT '下载链接过期时间',
  `request_user_id` bigint NOT NULL COMMENT '请求用户ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_id` (`task_id`),
  KEY `idx_course_id` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='课程资源批量下载任务表';

-- ----------------------------
-- Table structure for course_resource_folder_template
-- ----------------------------
DROP TABLE IF EXISTS `course_resource_folder_template`;
CREATE TABLE `course_resource_folder_template` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `folder_code` varchar(64) NOT NULL COMMENT '目录编码（英文标识）',
  `folder_name` varchar(128) NOT NULL COMMENT '目录名称（中文）',
  `description` varchar(512) DEFAULT NULL COMMENT '目录描述',
  `sort_order` int DEFAULT '0' COMMENT '排序序号',
  `enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用（1是0否）',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_folder_code` (`folder_code`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='课程资源目录模板表';

-- ----------------------------
-- Table structure for course_resource_object
-- ----------------------------
DROP TABLE IF EXISTS `course_resource_object`;
CREATE TABLE `course_resource_object` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `course_id` bigint NOT NULL COMMENT '所属课程ID',
  `parent_id` bigint DEFAULT '0' COMMENT '父对象ID（0表示根目录下）',
  `object_type` tinyint(1) NOT NULL DEFAULT '1' COMMENT '对象类型：0-目录 1-文件',
  `object_key` varchar(512) NOT NULL COMMENT '对象Key（完整路径，如 courseware/chapter1/file.pdf）',
  `display_name` varchar(255) NOT NULL COMMENT '展示名称',
  `description` varchar(512) DEFAULT NULL COMMENT '描述信息（目录描述或文件备注）',
  `sort_order` int DEFAULT '0' COMMENT '排序序号（目录排序用）',
  `file_size` bigint DEFAULT '0' COMMENT '文件大小（字节），目录为0',
  `mime_type` varchar(128) DEFAULT NULL COMMENT 'MIME类型',
  `file_extension` varchar(32) DEFAULT NULL COMMENT '文件扩展名',
  `etag` varchar(128) DEFAULT NULL COMMENT 'OSS ETag或文件哈希',
  `checksum` varchar(128) DEFAULT NULL COMMENT '校验值（MD5/SHA1）',
  `storage_class` varchar(32) DEFAULT 'STANDARD' COMMENT 'OSS存储类型',
  `version` varchar(64) DEFAULT NULL COMMENT '版本号',
  `metadata` json DEFAULT NULL COMMENT '自定义元数据（章节、标签等）',
  `download_url` varchar(1024) DEFAULT NULL COMMENT '下载链接（预签名URL）',
  `children_count` int DEFAULT '0' COMMENT '直接子对象数量',
  `latest_uploaded_at` datetime DEFAULT NULL COMMENT '目录下最近上传时间',
  `uploader_id` bigint NOT NULL COMMENT '上传/创建者ID',
  `uploader_name` varchar(128) DEFAULT NULL COMMENT '上传/创建者名称',
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '上传/创建时间',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_course_object_key` (`course_id`,`object_key`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_object_type` (`object_type`),
  KEY `idx_object_key` (`object_key`(255))
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='课程资源对象表（目录与文件统一存储）';

-- ----------------------------
-- Table structure for teaching_supervisory_task
-- ----------------------------
DROP TABLE IF EXISTS `teaching_supervisory_task`;
CREATE TABLE `teaching_supervisory_task` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '任务主键',
  `university_id` varchar(50) NOT NULL COMMENT '所属学校ID',
  `title` varchar(100) NOT NULL COMMENT '任务标题',
  `description` varchar(2000) DEFAULT NULL COMMENT '任务描述',
  `start_date` date NOT NULL COMMENT '开始日期',
  `end_date` date NOT NULL COMMENT '结束日期',
  `status` varchar(20) NOT NULL DEFAULT 'not_started' COMMENT '任务状态: not_started, in_progress, completed',
  `creator` varchar(50) NOT NULL COMMENT '创建人',
  `archived` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否归档: 0-未归档, 1-已归档',
  `scoring_type` varchar(20) NOT NULL DEFAULT 'percentage' COMMENT '评分类型: percentage(百分制),\n     five_level(五级制)',
  `publish_scope` json DEFAULT NULL COMMENT '发布范围配置（JSON格式，包含nodeId/nodeType/nodeName）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_university_id` (`university_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='教学督导任务表';

-- ----------------------------
-- Table structure for teaching_supervisory_task_evaluation_detail
-- ----------------------------
DROP TABLE IF EXISTS `teaching_supervisory_task_evaluation_detail`;
CREATE TABLE `teaching_supervisory_task_evaluation_detail` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `relation_id` bigint NOT NULL COMMENT '关联的发布关系ID',
  `task_id` bigint NOT NULL COMMENT '任务ID（冗余字段）',
  `course_id` bigint NOT NULL COMMENT '课程ID（冗余字段）',
  `criterion_id` bigint NOT NULL COMMENT '评价标准ID',
  `criterion_sequence` int DEFAULT NULL COMMENT '标准序号（冗余字段，方便排序）',
  `evaluation_type` varchar(20) NOT NULL COMMENT '评价类型: self, dept, school',
  `selected_level` varchar(10) DEFAULT NULL COMMENT '选择的等级: A, B, C, D',
  `score` decimal(10,2) DEFAULT NULL COMMENT '该标准的得分',
  `weight_score` decimal(10,2) DEFAULT NULL COMMENT '加权后的得分（如果有权重）',
  `evidence_files` text COMMENT '佐证材料文件列表（JSON格式）',
  `evidence_description` varchar(1000) DEFAULT NULL COMMENT '佐证材料说明',
  `evidence_uploaded_at` datetime DEFAULT NULL COMMENT '佐证上传时间',
  `remark` varchar(1000) DEFAULT NULL COMMENT '评价备注',
  `evaluator` varchar(50) DEFAULT NULL COMMENT '评价人姓名',
  `evaluator_id` varchar(50) DEFAULT NULL COMMENT '评价人ID',
  `evaluated_at` datetime DEFAULT NULL COMMENT '评价时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_relation_criterion_type` (`relation_id`,`criterion_id`,`evaluation_type`),
  KEY `idx_relation_id` (`relation_id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_criterion_id` (`criterion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='评价明细表';

-- ----------------------------
-- Table structure for teaching_supervisory_task_publish_relation
-- ----------------------------
DROP TABLE IF EXISTS `teaching_supervisory_task_publish_relation`;
CREATE TABLE `teaching_supervisory_task_publish_relation` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `task_id` bigint NOT NULL COMMENT '任务ID',
  `course_id` bigint NOT NULL COMMENT '课程ID（任务执行主体）',
  `course_name` varchar(100) DEFAULT NULL COMMENT '课程名称（冗余字段）',
  `major_id` bigint DEFAULT NULL COMMENT '专业ID（冗余字段，用于专业层级查询）',
  `major_name` varchar(100) DEFAULT NULL COMMENT '专业名称（冗余字段）',
  `dept_id` bigint DEFAULT NULL COMMENT '系部ID（冗余字段，用于系部层级查询）',
  `dept_name` varchar(100) DEFAULT NULL COMMENT '系部名称（冗余字段）',
  `college_id` bigint DEFAULT NULL COMMENT '学院ID（冗余字段，用于学院层级查询）',
  `college_name` varchar(100) DEFAULT NULL COMMENT '学院名称（冗余字段）',
  `self_evaluation_status` varchar(20) DEFAULT 'not_started' COMMENT '自评状态: not_started, in_progress, completed',
  `dept_evaluation_status` varchar(20) DEFAULT 'not_started' COMMENT '部门评价状态: not_started, in_progress, completed',
  `school_evaluation_status` varchar(20) DEFAULT 'not_started' COMMENT '学校评价状态: not_started, in_progress, completed',
  `overall_status` varchar(20) DEFAULT 'not_started' COMMENT '整体状态: not_started, in_progress, completed',
  `self_total_score` decimal(10,2) DEFAULT NULL COMMENT '自评总分',
  `dept_total_score` decimal(10,2) DEFAULT NULL COMMENT '部门评价总分',
  `school_total_score` decimal(10,2) DEFAULT NULL COMMENT '学校评价总分',
  `final_score` decimal(10,2) DEFAULT NULL COMMENT '最终综合得分',
  `self_submitted_at` datetime DEFAULT NULL COMMENT '自评提交时间',
  `dept_submitted_at` datetime DEFAULT NULL COMMENT '部门评价提交时间',
  `school_submitted_at` datetime DEFAULT NULL COMMENT '学校评价提交时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_course` (`task_id`,`course_id`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_major_id` (`major_id`),
  KEY `idx_dept_id` (`dept_id`),
  KEY `idx_college_id` (`college_id`)
) ENGINE=InnoDB AUTO_INCREMENT=327 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='任务发布关系表';

SET FOREIGN_KEY_CHECKS = 1;
