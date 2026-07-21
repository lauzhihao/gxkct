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

 Date: 01/12/2025 14:20:26
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for college_info
-- ----------------------------
DROP TABLE IF EXISTS `college_info`;
CREATE TABLE `college_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unique_code` varchar(64) DEFAULT NULL,
  `name` varchar(200) NOT NULL DEFAULT '',
  `college_type` tinyint NOT NULL DEFAULT '0',
  `creator` bigint NOT NULL DEFAULT '0',
  `image` text,
  `valid_source` tinyint NOT NULL DEFAULT '1',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=108 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for course_unit_list
-- ----------------------------
DROP TABLE IF EXISTS `course_unit_list`;
CREATE TABLE `course_unit_list` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `unique_code` varchar(50) NOT NULL DEFAULT '',
  `major_id` bigint NOT NULL,
  `course_class_id` int DEFAULT '1',
  `course_type_id` int DEFAULT '1',
  `name` varchar(100) NOT NULL,
  `position` text,
  `introduction` text,
  `criterion` text,
  `theory_period` double DEFAULT '0',
  `practice_period` double DEFAULT '0',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_MAJOR_ID` (`major_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=13715 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for department_list
-- ----------------------------
DROP TABLE IF EXISTS `department_list`;
CREATE TABLE `department_list` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `unique_code` varchar(64) DEFAULT NULL,
  `college_id` int NOT NULL DEFAULT '1',
  `name` varchar(200) NOT NULL DEFAULT '',
  `type` tinyint NOT NULL DEFAULT '0',
  `creator` bigint NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_college_id` (`college_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=327 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for major_list
-- ----------------------------
DROP TABLE IF EXISTS `major_list`;
CREATE TABLE `major_list` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `unique_code` varchar(50) NOT NULL DEFAULT '',
  `department_id` bigint NOT NULL DEFAULT '1',
  `name` varchar(200) NOT NULL,
  `major_level` varchar(8) NOT NULL DEFAULT '0',
  `major_class` varchar(256) NOT NULL DEFAULT '',
  `feature` text NOT NULL,
  `keyword` text,
  `career_level` varchar(32) DEFAULT NULL,
  `demand_type` varchar(32) DEFAULT NULL,
  `demand_area` varchar(255) DEFAULT NULL,
  `position` text,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_DEPT_ID` (`department_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
