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

 Date: 04/12/2025 13:13:04
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for evaluation_criterion
-- ----------------------------
DROP TABLE IF EXISTS `evaluation_criterion`;
CREATE TABLE `evaluation_criterion` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '标准ID',
  `task_id` bigint NOT NULL COMMENT '关联的任务ID',
  `sequence` int NOT NULL COMMENT '序号（1基）',
  `type` varchar(20) NOT NULL COMMENT '指标类型: business, system',
  `indicator` varchar(200) DEFAULT NULL COMMENT '业务指标名称（type=business时必填）',
  `system_indicator` varchar(100) DEFAULT NULL COMMENT '系统指标枚举（type=system时必填）',
  `full_score` decimal(10,2) NOT NULL DEFAULT '100.00' COMMENT '满分',
  `weight` decimal(5,4) DEFAULT NULL COMMENT '权重（0~1）',
  `evidence_requirement` varchar(500) DEFAULT NULL COMMENT '佐证材料说明',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3580 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='评价标准表';

-- ----------------------------
-- Table structure for evaluation_level
-- ----------------------------
DROP TABLE IF EXISTS `evaluation_level`;
CREATE TABLE `evaluation_level` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `criterion_id` bigint NOT NULL COMMENT '关联的评价标准ID',
  `level` varchar(10) NOT NULL COMMENT '等级: A, B, C, D',
  `description` varchar(500) NOT NULL COMMENT '等级描述',
  `coefficient` decimal(5,2) NOT NULL COMMENT '系数（0.1~1）',
  `condition_operator` varchar(20) DEFAULT NULL COMMENT '条件操作符: >, <, >=, <=, =, contains, not_contains',
  `condition_threshold` decimal(10,2) DEFAULT NULL COMMENT '条件阈值',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_criterion_id` (`criterion_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14313 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='评价等级表';

SET FOREIGN_KEY_CHECKS = 1;
