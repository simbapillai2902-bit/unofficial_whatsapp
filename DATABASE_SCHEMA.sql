-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: bulk_message_2
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `campaign_analytics`
--

DROP TABLE IF EXISTS `campaign_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign_analytics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaign_id` int NOT NULL,
  `user_id` int NOT NULL,
  `total_contacts` int DEFAULT '0',
  `sent_count` int DEFAULT '0',
  `delivered_count` int DEFAULT '0',
  `read_count` int DEFAULT '0',
  `failed_count` int DEFAULT '0',
  `bounce_count` int DEFAULT '0',
  `retry_count` int DEFAULT '0',
  `send_success_rate` decimal(5,2) DEFAULT NULL,
  `delivery_rate` decimal(5,2) DEFAULT NULL,
  `read_rate` decimal(5,2) DEFAULT NULL,
  `avg_delivery_time_seconds` int DEFAULT NULL,
  `peak_send_hour` int DEFAULT NULL,
  `total_messages_sent` bigint DEFAULT '0',
  `calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_calculated` (`calculated_at`),
  CONSTRAINT `campaign_analytics_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaign_analytics_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaign_queue`
--

DROP TABLE IF EXISTS `campaign_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign_queue` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `campaign_id` int NOT NULL,
  `user_id` int NOT NULL,
  `contact_id` int DEFAULT NULL,
  `phone_number` varchar(20) NOT NULL,
  `variables` json DEFAULT NULL,
  `queue_status` enum('pending','in_progress','sent','delivered','read','failed','retry','bounced') DEFAULT 'pending',
  `message_id` varchar(255) DEFAULT NULL,
  `whatsapp_session_id` int DEFAULT NULL,
  `retry_count` int DEFAULT '0',
  `max_retries` int DEFAULT '3',
  `error_message` text,
  `error_code` varchar(50) DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `failed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contact_id` (`contact_id`),
  KEY `whatsapp_session_id` (`whatsapp_session_id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`queue_status`),
  KEY `idx_phone` (`phone_number`),
  KEY `idx_created` (`created_at`),
  KEY `idx_retry` (`retry_count`),
  KEY `idx_queue_campaign_status` (`campaign_id`,`queue_status`),
  CONSTRAINT `campaign_queue_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaign_queue_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaign_queue_ibfk_3` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `campaign_queue_ibfk_4` FOREIGN KEY (`whatsapp_session_id`) REFERENCES `whatsapp_configs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_campaign_queue_timestamp` BEFORE UPDATE ON `campaign_queue` FOR EACH ROW BEGIN
    SET NEW.updated_at = NOW();
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Temporary view structure for view `campaign_summary`
--

DROP TABLE IF EXISTS `campaign_summary`;
/*!50001 DROP VIEW IF EXISTS `campaign_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `campaign_summary` AS SELECT 
 1 AS `id`,
 1 AS `campaign_name`,
 1 AS `user_id`,
 1 AS `campaign_status`,
 1 AS `total_contacts`,
 1 AS `sent_count`,
 1 AS `delivered_count`,
 1 AS `failed_count`,
 1 AS `delivery_rate`,
 1 AS `read_rate`,
 1 AS `started_at`,
 1 AS `completed_at`,
 1 AS `duration_seconds`,
 1 AS `actual_delivery_rate`,
 1 AS `actual_read_rate`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `campaign_name` varchar(255) NOT NULL,
  `campaign_description` text,
  `template_id` int DEFAULT NULL,
  `contact_group_id` int DEFAULT NULL,
  `scheduled_for` datetime DEFAULT NULL,
  `campaign_status` enum('draft','scheduled','in_progress','completed','paused','failed') DEFAULT 'draft',
  `total_contacts` int DEFAULT '0',
  `sent_count` int DEFAULT '0',
  `delivered_count` int DEFAULT '0',
  `read_count` int DEFAULT '0',
  `failed_count` int DEFAULT '0',
  `bounce_count` int DEFAULT '0',
  `delivery_rate` decimal(5,2) DEFAULT NULL,
  `read_rate` decimal(5,2) DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `contact_group_id` (`contact_group_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`campaign_status`),
  KEY `idx_created` (`created_at`),
  KEY `idx_scheduled` (`scheduled_for`),
  KEY `idx_campaign_status_user` (`user_id`,`campaign_status`),
  CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaigns_ibfk_2` FOREIGN KEY (`template_id`) REFERENCES `message_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `campaigns_ibfk_3` FOREIGN KEY (`contact_group_id`) REFERENCES `contact_groups` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contact_group_mapping`
--

DROP TABLE IF EXISTS `contact_group_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_group_mapping` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `contact_id` int NOT NULL,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_contact_mapping` (`group_id`,`contact_id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_contact_id` (`contact_id`),
  CONSTRAINT `contact_group_mapping_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `contact_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contact_group_mapping_ibfk_2` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_group_contact_count` AFTER INSERT ON `contact_group_mapping` FOR EACH ROW BEGIN
    UPDATE contact_groups
    SET contact_count = (
        SELECT COUNT(*) FROM contact_group_mapping WHERE group_id = NEW.group_id
    )
    WHERE id = NEW.group_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `contact_groups`
--

DROP TABLE IF EXISTS `contact_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `group_name` varchar(100) NOT NULL,
  `description` text,
  `contact_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_per_user` (`user_id`,`group_name`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `contact_groups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `country_code` varchar(5) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `custom_fields` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_contact_per_user` (`user_id`,`phone_number`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_phone` (`phone_number`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `contacts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `message_delivery_status`
--

DROP TABLE IF EXISTS `message_delivery_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_delivery_status` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `message_log_id` bigint NOT NULL,
  `status_change` enum('sent','delivered','read','failed','bounced','error','expired') DEFAULT NULL,
  `status_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status_metadata` json DEFAULT NULL,
  `webhook_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_message_log_id` (`message_log_id`),
  KEY `idx_status` (`status_change`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `message_delivery_status_ibfk_1` FOREIGN KEY (`message_log_id`) REFERENCES `message_logs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `message_logs`
--

DROP TABLE IF EXISTS `message_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `campaign_id` int NOT NULL,
  `queue_id` bigint DEFAULT NULL,
  `template_id` int DEFAULT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `recipient_phone` varchar(20) NOT NULL,
  `recipient_name` varchar(100) DEFAULT NULL,
  `message_content` longtext,
  `message_type` varchar(50) DEFAULT NULL,
  `delivery_status` enum('pending','sent','delivered','read','failed','bounced','expired') DEFAULT 'pending',
  `send_time` timestamp NULL DEFAULT NULL,
  `delivery_time` timestamp NULL DEFAULT NULL,
  `read_time` timestamp NULL DEFAULT NULL,
  `failure_reason` text,
  `failure_code` varchar(50) DEFAULT NULL,
  `whatsapp_message_id` varchar(255) DEFAULT NULL,
  `session_used` varchar(100) DEFAULT NULL,
  `response_received` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `message_id` (`message_id`),
  KEY `queue_id` (`queue_id`),
  KEY `template_id` (`template_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_status` (`delivery_status`),
  KEY `idx_phone` (`recipient_phone`),
  KEY `idx_created` (`created_at`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_send_time` (`send_time`),
  KEY `idx_logs_campaign_status` (`campaign_id`,`delivery_status`),
  KEY `idx_logs_timestamp_range` (`created_at`,`delivery_status`),
  CONSTRAINT `message_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_logs_ibfk_2` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_logs_ibfk_3` FOREIGN KEY (`queue_id`) REFERENCES `campaign_queue` (`id`) ON DELETE SET NULL,
  CONSTRAINT `message_logs_ibfk_4` FOREIGN KEY (`template_id`) REFERENCES `message_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_template_usage` AFTER INSERT ON `message_logs` FOR EACH ROW BEGIN
    UPDATE message_templates
    SET usage_count = usage_count + 1
    WHERE id = NEW.template_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `message_templates`
--

DROP TABLE IF EXISTS `message_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `template_name` varchar(255) NOT NULL,
  `template_type` enum('simpleMenu','boxMenu','linkMenu','actionMenu','infoCard','productCard','buttonMessage','orderUpdate','custom','plainText') DEFAULT 'plainText',
  `template_content` longtext NOT NULL,
  `template_data` json DEFAULT NULL,
  `is_unicode` tinyint(1) DEFAULT '0',
  `variables` json DEFAULT NULL,
  `preview_text` text,
  `is_active` tinyint(1) DEFAULT '1',
  `usage_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type` (`template_type`),
  KEY `idx_active` (`is_active`),
  KEY `idx_created` (`created_at`),
  KEY `idx_usage` (`usage_count`),
  CONSTRAINT `message_templates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `session_activity_logs`
--

DROP TABLE IF EXISTS `session_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_activity_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `activity_type` enum('login','logout','qr_generated','authenticated','message_sent','message_failed','session_error','reconnect') DEFAULT NULL,
  `activity_details` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `status` enum('success','failed','pending') DEFAULT 'success',
  `error_details` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_activity_type` (`activity_type`),
  CONSTRAINT `session_activity_logs_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `whatsapp_configs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `session_activity_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `session_stats`
--

DROP TABLE IF EXISTS `session_stats`;
/*!50001 DROP VIEW IF EXISTS `session_stats`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `session_stats` AS SELECT 
 1 AS `id`,
 1 AS `session_name`,
 1 AS `user_id`,
 1 AS `connection_status`,
 1 AS `message_count`,
 1 AS `total_messages_sent`,
 1 AS `delivered_count`,
 1 AS `failed_count`,
 1 AS `delivery_rate`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `system_config`
--

DROP TABLE IF EXISTS `system_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL,
  `config_value` text,
  `description` text,
  `data_type` enum('string','integer','boolean','json') DEFAULT 'string',
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_key` (`config_key`),
  CONSTRAINT `system_config_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `user_campaign_stats`
--

DROP TABLE IF EXISTS `user_campaign_stats`;
/*!50001 DROP VIEW IF EXISTS `user_campaign_stats`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `user_campaign_stats` AS SELECT 
 1 AS `id`,
 1 AS `username`,
 1 AS `total_campaigns`,
 1 AS `total_contacts_messaged`,
 1 AS `total_messages_sent`,
 1 AS `total_messages_delivered`,
 1 AS `avg_delivery_rate`,
 1 AS `last_campaign_date`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `subscription_tier` enum('free','basic','pro','enterprise') DEFAULT 'free',
  `is_active` tinyint(1) DEFAULT '1',
  `verified_at` timestamp NULL DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_active` (`is_active`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `whatsapp_configs`
--

DROP TABLE IF EXISTS `whatsapp_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `session_name` varchar(100) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `wa_token` text,
  `ph_no_id` varchar(255) DEFAULT NULL,
  `wa_biz_accnt_id` varchar(255) DEFAULT NULL,
  `connection_status` enum('connected','disconnected','authenticating','error') DEFAULT 'disconnected',
  `last_connection_attempt` timestamp NULL DEFAULT NULL,
  `session_created_at` timestamp NULL DEFAULT NULL,
  `last_activity_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_primary` tinyint(1) DEFAULT '0',
  `message_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_per_user` (`user_id`,`session_name`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`connection_status`),
  KEY `idx_active` (`is_active`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `whatsapp_configs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `campaign_summary`
--

/*!50001 DROP VIEW IF EXISTS `campaign_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `campaign_summary` AS select `c`.`id` AS `id`,`c`.`campaign_name` AS `campaign_name`,`c`.`user_id` AS `user_id`,`c`.`campaign_status` AS `campaign_status`,`c`.`total_contacts` AS `total_contacts`,`c`.`sent_count` AS `sent_count`,`c`.`delivered_count` AS `delivered_count`,`c`.`failed_count` AS `failed_count`,`c`.`delivery_rate` AS `delivery_rate`,`c`.`read_rate` AS `read_rate`,`c`.`started_at` AS `started_at`,`c`.`completed_at` AS `completed_at`,timestampdiff(SECOND,`c`.`started_at`,`c`.`completed_at`) AS `duration_seconds`,round(((`c`.`delivered_count` / `c`.`total_contacts`) * 100),2) AS `actual_delivery_rate`,round(((`c`.`read_count` / `c`.`total_contacts`) * 100),2) AS `actual_read_rate` from `campaigns` `c` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `session_stats`
--

/*!50001 DROP VIEW IF EXISTS `session_stats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `session_stats` AS select `s`.`id` AS `id`,`s`.`session_name` AS `session_name`,`s`.`user_id` AS `user_id`,`s`.`connection_status` AS `connection_status`,`s`.`message_count` AS `message_count`,count(`ml`.`id`) AS `total_messages_sent`,count((case when (`ml`.`delivery_status` = 'delivered') then 1 end)) AS `delivered_count`,count((case when (`ml`.`delivery_status` = 'failed') then 1 end)) AS `failed_count`,round(((count((case when (`ml`.`delivery_status` = 'delivered') then 1 end)) / count(`ml`.`id`)) * 100),2) AS `delivery_rate` from (`whatsapp_configs` `s` left join `message_logs` `ml` on((`s`.`id` = `ml`.`id`))) group by `s`.`id`,`s`.`session_name`,`s`.`user_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `user_campaign_stats`
--

/*!50001 DROP VIEW IF EXISTS `user_campaign_stats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `user_campaign_stats` AS select `u`.`id` AS `id`,`u`.`username` AS `username`,count(`c`.`id`) AS `total_campaigns`,sum(`c`.`total_contacts`) AS `total_contacts_messaged`,sum(`c`.`sent_count`) AS `total_messages_sent`,sum(`c`.`delivered_count`) AS `total_messages_delivered`,round(avg(`c`.`delivery_rate`),2) AS `avg_delivery_rate`,max(`c`.`created_at`) AS `last_campaign_date` from (`users` `u` left join `campaigns` `c` on((`u`.`id` = `c`.`user_id`))) group by `u`.`id`,`u`.`username` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-19 12:04:24
