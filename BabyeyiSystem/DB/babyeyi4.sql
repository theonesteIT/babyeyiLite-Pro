-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 25, 2026 at 01:23 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `babyeyi`
--

-- --------------------------------------------------------

--
-- Table structure for table `admissions`
--

CREATE TABLE `admissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `academic_year` varchar(20) DEFAULT NULL COMMENT 'e.g. 2025-2026',
  `open_date` date DEFAULT NULL,
  `close_date` date DEFAULT NULL,
  `contact_phone` varchar(30) DEFAULT NULL,
  `process_steps` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Ordered array of step strings' CHECK (json_valid(`process_steps`)),
  `requirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of requirement strings' CHECK (json_valid(`requirements`)),
  `documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of document strings' CHECK (json_valid(`documents`)),
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admission_applications`
--

CREATE TABLE `admission_applications` (
  `id` int(10) UNSIGNED NOT NULL,
  `form_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `reference_no` varchar(30) NOT NULL,
  `applicant_name` varchar(255) NOT NULL,
  `applicant_email` varchar(255) DEFAULT NULL,
  `applicant_phone` varchar(50) DEFAULT NULL,
  `status` enum('pending','reviewed','accepted','rejected','waitlisted') NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admission_applications`
--

INSERT INTO `admission_applications` (`id`, `form_id`, `school_id`, `reference_no`, `applicant_name`, `applicant_email`, `applicant_phone`, `status`, `notes`, `submitted_at`, `reviewed_at`, `updated_at`) VALUES
(1, 1, 3, 'APP-2026-976734', 'Ishimwe Theoneste', 'ishimwetheo488@gmail.com', '+250788876345', 'accepted', NULL, '2026-03-11 05:32:02', '2026-03-11 06:05:46', '2026-03-11 06:05:46'),
(2, 1, 3, 'APP-2026-605058', 'Kamana Claude', 'claude@gmail.com', '+250788876300', 'accepted', NULL, '2026-03-11 08:06:45', '2026-03-11 08:07:14', '2026-03-11 08:07:14'),
(3, 1, 3, 'APP-2026-589429', 'Kamana Eric', 'eric@gmail.com', '+250788878887', 'pending', NULL, '2026-03-11 10:06:06', NULL, '2026-03-11 10:06:06'),
(4, 1, 3, 'APP-2026-034661', 'Uwase Angel', 'uwase@gmail.com', '0788876345', 'accepted', NULL, '2026-03-11 10:11:00', '2026-03-11 10:37:48', '2026-03-11 10:37:48'),
(5, 1, 3, 'APP-2026-732497', 'Mugabo Steven', 'steven@gmail.com', '0788876340', 'waitlisted', NULL, '2026-03-11 10:54:32', '2026-03-11 10:56:17', '2026-03-11 10:56:17'),
(6, 1, 3, 'APP-2026-884272', 'Mutesi Scovia', 'scovia@gmail.com', '0788876348', 'pending', NULL, '2026-03-11 12:45:28', NULL, '2026-03-11 12:45:28'),
(7, 1, 3, 'APP-2026-479015', 'Ishimwe Theoneste', 'ishimwetheo488@gmail.com', '0798699601', 'pending', NULL, '2026-03-14 14:56:31', NULL, '2026-03-14 14:56:31');

-- --------------------------------------------------------

--
-- Table structure for table `admission_app_answers`
--

CREATE TABLE `admission_app_answers` (
  `id` int(10) UNSIGNED NOT NULL,
  `application_id` int(10) UNSIGNED NOT NULL,
  `question_id` int(10) UNSIGNED NOT NULL,
  `answer_text` text DEFAULT NULL,
  `answer_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answer_json`)),
  `files_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`files_json`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admission_app_answers`
--

INSERT INTO `admission_app_answers` (`id`, `application_id`, `question_id`, `answer_text`, `answer_json`, `files_json`, `created_at`) VALUES
(11, 6, 13, 'S3', NULL, NULL, '2026-03-11 12:45:29'),
(12, 6, 14, NULL, NULL, '[{\"url\":\"/uploads/admission-files/galley-2-1773233128939-259859.jpg\",\"name\":\"galley-2.jpg\",\"size\":11818},{\"url\":\"/uploads/admission-files/galley-3-1773233128944-485267.jpg\",\"name\":\"galley-3.jpg\",\"size\":14006},{\"url\":\"/uploads/admission-files/galley-4-1773233128945-489442.jpg\",\"name\":\"galley-4.jpg\",\"size\":7844}]', '2026-03-11 12:45:29'),
(13, 7, 13, 'S3', NULL, NULL, '2026-03-14 14:56:31'),
(14, 7, 14, NULL, NULL, '[{\"url\":\"/uploads/admission-files/Babyeyi-BY-2025-00017-Term-1-1-1773500190941-825554.pdf\",\"name\":\"Babyeyi-BY-2025-00017-Term 1 (1).pdf\",\"size\":633140},{\"url\":\"/uploads/admission-files/Babyeyi-BY-2025-00026-Term-1-5-1773500191011-519650.pdf\",\"name\":\"Babyeyi-BY-2025-00026-Term 1 (5).pdf\",\"size\":740233},{\"url\":\"/uploads/admission-files/Babyeyi-BY-2025-00026-Term-1-3-1773500191137-448128.pdf\",\"name\":\"Babyeyi-BY-2025-00026-Term 1 (3).pdf\",\"size\":743527}]', '2026-03-14 14:56:32');

-- --------------------------------------------------------

--
-- Table structure for table `admission_forms`
--

CREATE TABLE `admission_forms` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `mini_website_id` int(10) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'Online Admission Application',
  `description` text DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `application_start` date DEFAULT NULL,
  `application_deadline` date DEFAULT NULL,
  `max_applicants` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('draft','open','closed','paused') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admission_forms`
--

INSERT INTO `admission_forms` (`id`, `school_id`, `mini_website_id`, `title`, `description`, `academic_year`, `application_start`, `application_deadline`, `max_applicants`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 3, NULL, 'Online Admission Application', NULL, NULL, NULL, NULL, NULL, 'draft', '2026-03-22 20:46:39', '2026-03-22 20:48:11', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `admission_form_questions`
--

CREATE TABLE `admission_form_questions` (
  `id` int(10) UNSIGNED NOT NULL,
  `form_id` int(10) UNSIGNED NOT NULL,
  `sort_order` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `label` varchar(500) NOT NULL,
  `question_type` enum('text','textarea','yesno','select','multiselect','file','multifile') NOT NULL DEFAULT 'text',
  `placeholder` varchar(255) DEFAULT NULL,
  `options_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options_json`)),
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `allow_multiple` tinyint(1) NOT NULL DEFAULT 0,
  `max_files` tinyint(3) UNSIGNED DEFAULT 5,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(300) NOT NULL,
  `body` text DEFAULT NULL,
  `publish_at` datetime DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `app_sessions`
--

CREATE TABLE `app_sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `app_sessions`
--

INSERT INTO `app_sessions` (`session_id`, `expires`, `data`) VALUES
('16ON_X9Pj7glVQRn-U1STu0siE8oXzsP', 1774466772, '{\"cookie\":{\"originalMaxAge\":28800000,\"expires\":\"2026-03-25T19:01:56.316Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":32,\"roleCode\":\"SCHOOL_ADMIN\",\"loginTime\":1774436495631,\"school_id\":6,\"user\":{\"id\":32,\"user_uid\":\"SM-392769001\",\"email\":\"sanaacademy@gmail.com\",\"first_name\":\"NIIYONKURU\",\"last_name\":\"Marcell\",\"full_name\":\"NIIYONKURU Marcell\",\"photo\":null,\"role\":{\"code\":\"SCHOOL_ADMIN\",\"name\":\"School Admin\"},\"district\":\"Gasabo\",\"province\":\"Kigali City\",\"sector\":\"Remera\",\"school\":{\"id\":6,\"name\":\"SANA ACADEMY\",\"code\":\"006\",\"email\":\"sanaacdemy@gmail.com\",\"phone\":\"0798123456\",\"district\":\"Gasabo\",\"province\":\"Kigali City\"},\"school_id\":6,\"force_password_change\":false}}'),
('62tVN_NkCQ8sUcKbGlF0ELI4-EAph3OL', 1774466927, '{\"cookie\":{\"originalMaxAge\":28800000,\"expires\":\"2026-03-25T19:07:10.939Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":28,\"roleCode\":\"SCHOOL_ADMIN\",\"loginTime\":1774436830921,\"school_id\":3,\"user\":{\"id\":28,\"user_uid\":\"SM-947204499\",\"email\":\"ishimwetheonest937@gmail.com\",\"first_name\":\"UWAMAHORO\",\"last_name\":\"Claudine\",\"full_name\":\"UWAMAHORO Claudine\",\"photo\":null,\"role\":{\"code\":\"SCHOOL_ADMIN\",\"name\":\"School Admin\"},\"district\":\"Gasabo\",\"province\":\"Kigali City\",\"sector\":\"Remera\",\"school\":{\"id\":3,\"name\":\"ECOLE NOTRE DAME DES ANGES\",\"code\":\"003\",\"email\":\"notredame@gmail.com\",\"phone\":\"0796785674\",\"district\":\"Gasabo\",\"province\":\"Kigali City\"},\"school_id\":3,\"force_password_change\":false}}');

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

CREATE TABLE `audit_log` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL COMMENT 'CREATE | UPDATE | DELETE | PUBLISH',
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int(10) UNSIGNED DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_audit_log`
--

CREATE TABLE `babyeyi_audit_log` (
  `id` int(10) UNSIGNED NOT NULL,
  `babyeyi_id` int(10) UNSIGNED NOT NULL,
  `doc_id` varchar(30) NOT NULL,
  `action` varchar(100) NOT NULL COMMENT 'created|updated|submitted|approved|rejected|deleted|regenerated',
  `changed_by` int(11) DEFAULT NULL,
  `actor_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'User who performed the action',
  `actor_name` varchar(255) DEFAULT NULL,
  `actor_role` varchar(100) DEFAULT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `changes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Field-level diff: {field: [old, new]}' CHECK (json_valid(`changes`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Immutable audit trail for babyeyi record changes';

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_class_requirements`
--

CREATE TABLE `babyeyi_class_requirements` (
  `id` int(11) NOT NULL,
  `babyeyi_id` int(11) NOT NULL,
  `information` text NOT NULL,
  `item` varchar(300) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `babyeyi_class_requirements`
--

INSERT INTO `babyeyi_class_requirements` (`id`, `babyeyi_id`, `information`, `item`, `details`, `sort_order`) VALUES
(1, 1, 'Students Must Come on Time', 'Students Must Come on Time', NULL, 1),
(2, 1, 'Students Must prepare well examination', 'Students Must prepare well examination', NULL, 2),
(3, 2, 'Students Must come on Time', 'Students Must come on Time', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_doc_ids`
--

CREATE TABLE `babyeyi_doc_ids` (
  `id` int(11) NOT NULL,
  `doc_id` varchar(30) NOT NULL,
  `babyeyi_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `babyeyi_doc_ids`
--

INSERT INTO `babyeyi_doc_ids` (`id`, `doc_id`, `babyeyi_id`, `created_at`) VALUES
(1, 'BY-2025-00001', 1, '2026-03-22 20:03:26'),
(3, 'BY-2025-00002', 2, '2026-03-22 21:54:59');

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_increase_requests`
--

CREATE TABLE `babyeyi_increase_requests` (
  `id` int(11) NOT NULL,
  `babyeyi_id` int(11) NOT NULL,
  `school_id` int(11) DEFAULT NULL,
  `school_name` varchar(255) DEFAULT NULL,
  `sector` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `level` varchar(100) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `term` varchar(50) DEFAULT NULL,
  `class` varchar(20) DEFAULT NULL,
  `reason` varchar(200) NOT NULL,
  `request_reasons_json` text DEFAULT NULL,
  `other_reason` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `current_limit` decimal(12,2) NOT NULL,
  `requested_amount` decimal(12,2) NOT NULL,
  `excess_amount` decimal(12,2) NOT NULL,
  `parent_rep_doc_path` varchar(500) DEFAULT NULL,
  `parent_rep_doc_name` varchar(200) DEFAULT NULL,
  `budget_doc_path` varchar(500) DEFAULT NULL,
  `budget_doc_name` varchar(200) DEFAULT NULL,
  `nesa_status` enum('pending','approved','rejected','revision','recommended','nesa_rejected') DEFAULT 'pending',
  `nesa_notes` text DEFAULT NULL,
  `submitted_at` datetime DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `approval_letter_path` varchar(500) DEFAULT NULL,
  `approval_letter_name` varchar(255) DEFAULT NULL,
  `deo_signature_path` varchar(500) DEFAULT NULL,
  `deo_signature_name` varchar(255) DEFAULT NULL,
  `deo_stamp_path` varchar(500) DEFAULT NULL,
  `deo_stamp_name` varchar(255) DEFAULT NULL,
  `rejection_letter_path` varchar(500) DEFAULT NULL,
  `rejection_letter_name` varchar(255) DEFAULT NULL,
  `rejection_signature_path` varchar(500) DEFAULT NULL,
  `rejection_signature_name` varchar(255) DEFAULT NULL,
  `rejection_stamp_path` varchar(500) DEFAULT NULL,
  `rejection_stamp_name` varchar(255) DEFAULT NULL,
  `deo_notes` text DEFAULT NULL,
  `deo_reviewed_at` datetime DEFAULT NULL,
  `deo_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_leaders`
--

CREATE TABLE `babyeyi_leaders` (
  `id` int(10) UNSIGNED NOT NULL,
  `babyeyi_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `leader_name` varchar(200) NOT NULL,
  `leader_role` varchar(200) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(200) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `babyeyi_leaders`
--

INSERT INTO `babyeyi_leaders` (`id`, `babyeyi_id`, `school_id`, `leader_name`, `leader_role`, `phone`, `email`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 'UWAMAHORO Claudine', 'Head Teacher / Director', '789896785', 'director@gmail.com', 0, 1, '2026-03-22 18:03:26', '2026-03-22 18:03:26'),
(2, 1, 3, 'Muneza Peter', 'Director of Studies', '788957646', 'dos@gmail.com', 1, 1, '2026-03-22 18:03:26', '2026-03-22 18:03:26'),
(3, 1, 3, 'Uwineza Aline', 'School Bursar / Economist', '789675890', 'accountant@gmail.com', 2, 1, '2026-03-22 18:03:26', '2026-03-22 18:03:26'),
(4, 2, 3, 'UWAMAHORO Claudine', 'Head Teacher / Director', '789576465', 'director@gmail.com', 0, 1, '2026-03-22 19:55:02', '2026-03-22 19:55:02'),
(5, 2, 3, 'Kamana Peter', 'Director of Studies', '78656543', 'dos@gmail.com', 1, 1, '2026-03-22 19:55:02', '2026-03-22 19:55:02'),
(6, 2, 3, 'Mahoro Alice', 'Accountant', '785674564', 'accountant@gmail.com', 2, 1, '2026-03-22 19:55:02', '2026-03-22 19:55:02');

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_loan_repayments`
--

CREATE TABLE `babyeyi_loan_repayments` (
  `id` int(10) UNSIGNED NOT NULL,
  `intent_id` int(10) UNSIGNED NOT NULL,
  `amount_rwf` decimal(12,2) NOT NULL,
  `paid_by_phone` varchar(30) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `receipt_no` varchar(80) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `reviewed_by` varchar(120) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `babyeyi_loan_repayments`
--

INSERT INTO `babyeyi_loan_repayments` (`id`, `intent_id`, `amount_rwf`, `paid_by_phone`, `note`, `created_at`, `receipt_no`, `status`, `reviewed_by`, `reviewed_at`) VALUES
(1, 10, 20000.00, '0790786709', NULL, '2026-03-24 12:30:14', NULL, 'pending', NULL, NULL),
(2, 10, 10000.00, '0790786709', NULL, '2026-03-24 12:31:39', NULL, 'pending', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_payments`
--

CREATE TABLE `babyeyi_payments` (
  `id` int(11) NOT NULL,
  `babyeyi_id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sort_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `babyeyi_payments`
--

INSERT INTO `babyeyi_payments` (`id`, `babyeyi_id`, `name`, `amount`, `sort_order`) VALUES
(1, 1, 'Tuition Fee', 50000.00, 0),
(2, 1, 'Transport Fee', 30000.00, 1),
(3, 2, 'Tuition Fee', 60000.00, 0),
(4, 2, 'Transport Fee', 40000.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_payment_intents`
--

CREATE TABLE `babyeyi_payment_intents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `babyeyi_id` int(10) UNSIGNED NOT NULL,
  `payload_json` longtext NOT NULL,
  `total_rwf` decimal(14,2) NOT NULL DEFAULT 0.00,
  `status` varchar(40) DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `payer_name` varchar(180) DEFAULT NULL,
  `payer_phone` varchar(40) DEFAULT NULL,
  `payer_email` varchar(180) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `babyeyi_payment_intents`
--

INSERT INTO `babyeyi_payment_intents` (`id`, `school_id`, `babyeyi_id`, `payload_json`, `total_rwf`, `status`, `created_at`, `payer_name`, `payer_phone`, `payer_email`) VALUES
(1, 3, 1, '{\"selected_fee_ids\":[2],\"selected_requirement_ids\":[1,2,3,4,5],\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"umwalimu\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null}}', 47897.00, 'draft', '2026-03-22 20:50:33', NULL, NULL, NULL),
(2, 3, 2, '{\"selected_fee_ids\":[3,4],\"selected_requirement_ids\":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null}}', 170166.00, 'draft', '2026-03-22 20:52:15', NULL, NULL, NULL),
(3, 3, 2, '{\"selected_fee_ids\":[3,4],\"selected_requirement_ids\":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":{\"totalDue\":174420.15,\"interest\":4254.15,\"installments\":3,\"each\":58140.05}},\"payer\":{\"name\":\"Mugabo Irene & Maneza Aline\",\"phone\":\"0796898894\",\"email\":null}}', 174420.15, 'submitted', '2026-03-23 14:43:34', 'Mugabo Irene & Maneza Aline', '0796898894', NULL),
(4, 3, 2, '{\"selected_fee_ids\":[3,4],\"selected_requirement_ids\":[6,7,13,14,15,16,17,18,19,20],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":6,\"incomeId\":\"mid\",\"loanFreq\":\"daily\",\"loanSummary\":{\"totalDue\":136797.15,\"interest\":6514.15,\"installments\":180,\"each\":759.98}},\"payer\":{\"name\":\"Mugabo Irene & Maneza Aline\",\"phone\":\"0796898894\",\"email\":null}}', 136797.15, 'paid', '2026-03-23 14:59:31', 'Mugabo Irene & Maneza Aline', '0796898894', NULL),
(5, 3, 1, '{\"selected_fee_ids\":[2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":71,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0789090909\",\"email\":null}}', 47897.00, 'submitted', '2026-03-23 16:44:22', 'KARACYE Evode & MARITA Aneth', '0789090909', NULL),
(6, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":72,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":6,\"incomeId\":\"mid\",\"loanFreq\":\"weekly\",\"loanSummary\":{\"totalDue\":102791.85,\"interest\":4894.85,\"installments\":24,\"each\":4282.99}},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0789090909\",\"email\":null}}', 102791.85, 'paid', '2026-03-23 16:49:32', 'KARACYE Evode & MARITA Aneth', '0789090909', NULL),
(7, 3, 2, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22],\"selected_student\":null,\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":6,\"incomeId\":\"mid\",\"loanFreq\":\"daily\",\"loanSummary\":{\"totalDue\":55300.35,\"interest\":2633.35,\"installments\":180,\"each\":307.22}},\"payer\":null}', 55300.35, 'submitted', '2026-03-23 18:52:50', NULL, NULL, NULL),
(8, 3, 1, '{\"selected_fee_ids\":[2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":72,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0789090909\",\"email\":null}}', 47897.00, 'submitted', '2026-03-23 19:44:24', 'KARACYE Evode & MARITA Aneth', '0789090909', NULL),
(9, 3, 1, '{\"selected_fee_ids\":[2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":72,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0789090909\",\"email\":null}}', 54897.00, 'submitted', '2026-03-23 19:51:13', 'KARACYE Evode & MARITA Aneth', '0789090909', NULL),
(10, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":71,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"umwalimu\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"daily\",\"loanSummary\":{\"totalDue\":100344.43,\"interest\":2447.43,\"installments\":90,\"each\":1114.94},\"loan_request\":{\"bankCode\":\"umwalimu\",\"bankName\":\"Umwalimu SACCO\",\"applicantName\":\"Maneza\",\"accountNumber\":\"1007878436543\",\"nationalId\":\"199866534231234\"}},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0790786709\",\"email\":null}}', 100344.43, 'submitted', '2026-03-24 09:59:21', 'KARACYE Evode & MARITA Aneth', '0790786709', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_signatures`
--

CREATE TABLE `babyeyi_signatures` (
  `id` int(11) NOT NULL,
  `babyeyi_id` int(11) NOT NULL,
  `director_sig_path` varchar(500) DEFAULT NULL,
  `director_sig_name` varchar(200) DEFAULT NULL,
  `accountant_sig_path` varchar(500) DEFAULT NULL,
  `accountant_sig_name` varchar(200) DEFAULT NULL,
  `stamp_path` varchar(500) DEFAULT NULL,
  `stamp_name` varchar(200) DEFAULT NULL,
  `school_logo_path` varchar(255) DEFAULT NULL,
  `school_logo_name` varchar(255) DEFAULT NULL,
  `gov_logo_path` varchar(255) DEFAULT NULL,
  `gov_logo_name` varchar(255) DEFAULT NULL,
  `other_logo_path` varchar(255) DEFAULT NULL,
  `other_logo_name` varchar(255) DEFAULT NULL,
  `qr_code_path` varchar(500) DEFAULT NULL,
  `qr_code_name` varchar(255) DEFAULT NULL,
  `qr_view_url` varchar(1000) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `babyeyi_signatures`
--

INSERT INTO `babyeyi_signatures` (`id`, `babyeyi_id`, `director_sig_path`, `director_sig_name`, `accountant_sig_path`, `accountant_sig_name`, `stamp_path`, `stamp_name`, `school_logo_path`, `school_logo_name`, `gov_logo_path`, `gov_logo_name`, `other_logo_path`, `other_logo_name`, `qr_code_path`, `qr_code_name`, `qr_view_url`) VALUES
(1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/governement-logo-1774202606095.png', 'governement-logo.png', '/uploads/babyeyi/qrcodes/qr-BY-2025-00001-1774202606368.png', 'qr-BY-2025-00001-1774202606368.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00001'),
(2, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/governement-logo-1774209297681.png', 'governement-logo.png', '/uploads/babyeyi/qrcodes/qr-BY-2025-00002-1774209304009.png', 'qr-BY-2025-00002-1774209304009.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00002');

-- --------------------------------------------------------

--
-- Table structure for table `babyeyi_student_requirements`
--

CREATE TABLE `babyeyi_student_requirements` (
  `id` int(11) NOT NULL,
  `babyeyi_id` int(11) NOT NULL,
  `item` varchar(300) NOT NULL,
  `description` text DEFAULT NULL,
  `quantity` varchar(50) DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `babyeyi_student_requirements`
--

INSERT INTO `babyeyi_student_requirements` (`id`, `babyeyi_id`, `item`, `description`, `quantity`, `cost`, `sort_order`) VALUES
(1, 1, 'Ream of paper', 'A4 Azhar paper', '2 per term', NULL, 0),
(2, 1, 'Bottle for drinking water', 'one piece', '1', NULL, 1),
(3, 1, 'Communication book', '48 pages', '2', NULL, 2),
(4, 1, 'Mathematical set', 'one piece', '1', NULL, 3),
(5, 1, 'School ID card', 'one card', '1', NULL, 4),
(6, 2, 'Ream of paper', 'A4 Azhar', '3 all Year', NULL, 0),
(7, 2, 'Bottle for drinking water', 'one piece', '1', NULL, 1),
(8, 2, 'Files', 'one file', '1', NULL, 2),
(9, 2, 'School ID card', 'one card', '1', NULL, 3),
(10, 2, 'Colour pencils', 'two dozens', '2', NULL, 4),
(11, 2, 'Pens', 'Blue and Black', '10', NULL, 5),
(12, 2, 'Sharpener, pencils and rubber', 'two for each', '2', NULL, 6),
(13, 2, 'Calligraphy book', '48 pages', '5', NULL, 7),
(14, 2, 'Communication book', '96 pages', '2', NULL, 8),
(15, 2, 'Mathematical set', 'one piece', '1', NULL, 9),
(16, 2, 'Ruler', 'one piece', '1', NULL, 10),
(17, 2, 'Paper glue', 'one', '1', NULL, 11),
(18, 2, 'Lined notebook', '128 pages', '5', NULL, 12),
(19, 2, 'Squared notebook', '48 pages', '6', NULL, 13),
(20, 2, 'Drawing book', '96 pages', '1', NULL, 14),
(21, 2, 'Registry', 'four registries', '4', NULL, 15),
(22, 2, 'School bag', 'one bag', '1', NULL, 16),
(23, 2, 'Uniform and sportswear', 'one per each pair', '1', NULL, 17),
(24, 2, 'Shoes and socks', 'one pair and four white socks', '1', NULL, 18);

-- --------------------------------------------------------

--
-- Table structure for table `deo_reviewers`
--

CREATE TABLE `deo_reviewers` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL COMMENT 'e.g. District Education Officer',
  `district` varchar(100) NOT NULL,
  `sector` varchar(100) DEFAULT NULL COMMENT 'NULL = full district access',
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `signature_url` varchar(500) DEFAULT NULL,
  `stamp_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='DEO reviewer profiles with geographic jurisdiction';

-- --------------------------------------------------------

--
-- Table structure for table `discipline_cases`
--

CREATE TABLE `discipline_cases` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `academic_year` varchar(64) NOT NULL,
  `term` varchar(32) NOT NULL,
  `class_name` varchar(120) DEFAULT NULL,
  `lesson_subject` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `marks_deducted` decimal(8,2) NOT NULL,
  `marks_remaining_after` decimal(8,2) NOT NULL,
  `recorded_by_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `discipline_cases`
--

INSERT INTO `discipline_cases` (`id`, `school_id`, `student_id`, `academic_year`, `term`, `class_name`, `lesson_subject`, `description`, `marks_deducted`, `marks_remaining_after`, `recorded_by_user_id`, `created_at`) VALUES
(1, 3, 71, '2025-2026', 'Term 1', 'P1', 'Stealing', NULL, 5.01, 34.99, 30, '2026-03-25 08:00:57'),
(2, 3, 72, '2025-2026', 'Term 1', 'P1', 'Mathematics -discruption', NULL, 10.00, 30.00, 30, '2026-03-25 08:04:42'),
(3, 3, 37, '2025-2026', 'Term 1', 'P2', 'Disruption for Class', NULL, 5.00, 35.00, 30, '2026-03-25 13:11:13'),
(4, 6, 36, '2025-2026', 'Term 1', 'P2', 'Biology-disruption', NULL, 10.00, 30.00, 30, '2026-03-25 13:11:37');

-- --------------------------------------------------------

--
-- Table structure for table `dos_student_academic_records`
--

CREATE TABLE `dos_student_academic_records` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `academic_year` varchar(32) NOT NULL,
  `term` varchar(32) NOT NULL,
  `class_name` varchar(120) DEFAULT NULL,
  `status_code` varchar(32) NOT NULL,
  `status_label` varchar(64) DEFAULT NULL,
  `marks_obtained` decimal(8,2) NOT NULL DEFAULT 0.00,
  `marks_remaining` decimal(8,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `recorded_by_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dos_student_academic_records`
--

INSERT INTO `dos_student_academic_records` (`id`, `school_id`, `student_id`, `academic_year`, `term`, `class_name`, `status_code`, `status_label`, `marks_obtained`, `marks_remaining`, `notes`, `recorded_by_user_id`, `created_at`, `updated_at`) VALUES
(1, 3, 71, '2025-2026', 'Term 1', 'P1', 'promoted', NULL, 80.00, 20.00, NULL, 31, '2026-03-25 12:15:43', '2026-03-25 12:15:43'),
(2, 3, 72, '2025-2026', 'Term 1', 'P1', 'promoted', NULL, 70.00, 30.00, NULL, 31, '2026-03-25 12:20:52', '2026-03-25 12:20:52'),
(3, 3, 37, '2025-2026', 'Term 1', 'P2', 'repeated', NULL, 40.00, 60.00, NULL, 31, '2026-03-25 12:21:01', '2026-03-25 12:21:01'),
(4, 3, 78, '2025-2026', 'Term 1', 'P3', 'dropped', NULL, 0.00, 100.00, NULL, 31, '2026-03-25 12:21:22', '2026-03-25 12:21:22'),
(5, 6, 36, '2025-2026', 'Term 1', 'P2', 'promoted', NULL, 80.00, 20.00, NULL, 31, '2026-03-25 13:09:37', '2026-03-25 13:25:37');

-- --------------------------------------------------------

--
-- Table structure for table `fee_items`
--

CREATE TABLE `fee_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `fee_level_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `fee_type` varchar(100) NOT NULL COMMENT 'Tuition Fee, Transport Fee, .',
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_period` enum('Per Term','Per Month','Per Year','One-Time') NOT NULL DEFAULT 'Per Term',
  `sort_order` tinyint(3) UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fee_levels`
--

CREATE TABLE `fee_levels` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `level_key` enum('nursery','primary','olevel','alevel','tvet') NOT NULL,
  `currency` char(3) DEFAULT 'RWF',
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fee_limits`
--

CREATE TABLE `fee_limits` (
  `id` int(10) UNSIGNED NOT NULL,
  `category` enum('Public','Private','Boarding','TVET') NOT NULL,
  `level` enum('Nursery','Primary','Secondary','University') NOT NULL,
  `term` enum('Term 1','Term 2','Term 3','Full Year') NOT NULL DEFAULT 'Term 1',
  `academic_year` varchar(20) NOT NULL DEFAULT '2024-2025',
  `max_amount` decimal(12,2) NOT NULL,
  `regulation_ref` varchar(100) DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `document_path` varchar(500) DEFAULT NULL,
  `document_name` varchar(255) DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `updated_by` int(10) UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fee_limits`
--

INSERT INTO `fee_limits` (`id`, `category`, `level`, `term`, `academic_year`, `max_amount`, `regulation_ref`, `effective_date`, `notes`, `document_path`, `document_name`, `created_by`, `updated_by`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Public', 'Primary', 'Term 1', '2025-2026', 975.00, 'MoE/2023/001', '2025-01-06', 'This is Limit for Primary', NULL, NULL, 3, NULL, 1, '2026-03-06 15:35:50', '2026-03-06 15:35:50'),
(2, 'Public', 'Secondary', 'Term 1', '2025-2026', 19500.00, 'MoE/2023/003', '2025-01-06', 'This is Limit For Public secondary school', NULL, NULL, 3, NULL, 1, '2026-03-06 15:37:04', '2026-03-06 15:37:04'),
(3, 'Boarding', 'Secondary', 'Term 1', '2025-2026', 92000.00, 'MoE/2023', '2025-01-06', 'This is limit for boarding secondary school', NULL, NULL, 3, NULL, 1, '2026-03-06 21:44:58', '2026-03-06 21:44:58'),
(4, 'Public', 'Nursery', 'Term 1', '2025-2026', 975.00, 'MoE/02/0013', '2025-01-12', 'This is Limit for Nursary School for all public schools', '/uploads/fee-limits/Babyeyi-BY-2025-00023-Term-1-1773340312736.pdf', 'Babyeyi-BY-2025-00023-Term 1.pdf', 3, NULL, 1, '2026-03-12 20:31:52', '2026-03-12 20:31:52');

-- --------------------------------------------------------

--
-- Table structure for table `gallery_albums`
--

CREATE TABLE `gallery_albums` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `category` enum('Event','Academic','Sports','Cultural','Graduation','Field Trip','Other') DEFAULT 'Event',
  `event_date` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `sort_order` smallint(5) UNSIGNED DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `gallery_albums`
--

INSERT INTO `gallery_albums` (`id`, `school_id`, `title`, `category`, `event_date`, `description`, `sort_order`, `created_at`) VALUES
(1, 3, 'Sport Day', 'Sports', NULL, NULL, 0, '2026-03-22 22:48:19'),
(2, 3, 'Sport Day', 'Sports', NULL, NULL, 0, '2026-03-22 22:53:01');

-- --------------------------------------------------------

--
-- Table structure for table `gallery_images`
--

CREATE TABLE `gallery_images` (
  `id` int(10) UNSIGNED NOT NULL,
  `album_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `caption` varchar(300) DEFAULT NULL,
  `sort_order` smallint(5) UNSIGNED DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nesa_fee_limits`
--

CREATE TABLE `nesa_fee_limits` (
  `id` int(10) UNSIGNED NOT NULL,
  `academic_year` year(4) NOT NULL,
  `education_level` varchar(50) NOT NULL COMMENT 'nursery|primary|o_level|a_level|tvet',
  `school_category` varchar(50) NOT NULL COMMENT 'Day|Boarding|Day & Boarding',
  `max_total_fees` decimal(12,2) NOT NULL COMMENT 'Absolute maximum total per term',
  `max_tuition` decimal(12,2) DEFAULT NULL,
  `max_boarding` decimal(12,2) DEFAULT NULL,
  `max_lunch` decimal(12,2) DEFAULT NULL,
  `other_limits` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional named ceilings: [{name, max_amount}]' CHECK (json_valid(`other_limits`)),
  `effective_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `document_url` varchar(500) DEFAULT NULL COMMENT 'Official NESA circular PDF',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(10) UNSIGNED DEFAULT NULL COMMENT 'User ID who created this limit',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='NESA-published fee ceilings by level, category, and year';

-- --------------------------------------------------------

--
-- Table structure for table `parent_portal_accounts`
--

CREATE TABLE `parent_portal_accounts` (
  `id` int(10) UNSIGNED NOT NULL,
  `phone` varchar(30) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `father_full_name` varchar(150) DEFAULT NULL,
  `mother_full_name` varchar(150) DEFAULT NULL,
  `father_email` varchar(150) DEFAULT NULL,
  `mother_email` varchar(150) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_via_phone_only` tinyint(1) NOT NULL DEFAULT 0,
  `completed_registration_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `parent_portal_accounts`
--

INSERT INTO `parent_portal_accounts` (`id`, `phone`, `password_hash`, `father_full_name`, `mother_full_name`, `father_email`, `mother_email`, `created_at`, `updated_at`, `created_via_phone_only`, `completed_registration_at`) VALUES
(1, '0798699601', '$2b$10$LUw9D47TJX3oy5LMlj4b1e6Tmvfw1GuoidZJFXu/jNcQwkhVSVpii', 'Ishimwe Theoneste', NULL, 'ishimwetheo488@gmail.com', NULL, '2026-03-21 12:07:34', '2026-03-21 12:07:34', 0, NULL),
(2, '0793903844', '$2b$10$gpKEUpVcYm5fICT0SM4.qu2OtrujcqlqfLBxgxov2OZVyGmqHtdhy', 'SHEMA KATENDE', NULL, NULL, NULL, '2026-03-21 14:08:38', '2026-03-21 14:08:38', 0, NULL),
(3, '0788876345', '$2b$10$cEsfq3UvEUrd0.4Och4mw.AL6iMIM7tqL5Cwfn8y7dI92LwiAdJdy', 'Maneza Peter', NULL, NULL, NULL, '2026-03-23 14:57:31', '2026-03-23 14:57:31', 0, NULL),
(4, '0789678567', '$2b$10$TrBEv.4iJhtX4rXoH1Z7eurQExA1W5v8nhAL0GFSHx5iHaiVrs/qK', 'Muneza Peter', 'Muhoracyeye Veneranda', NULL, NULL, '2026-03-23 16:28:58', '2026-03-23 16:28:58', 1, '2026-03-23 16:28:58');

-- --------------------------------------------------------

--
-- Table structure for table `requirement_prices`
--

CREATE TABLE `requirement_prices` (
  `id` int(10) UNSIGNED NOT NULL,
  `requirement_id` int(10) UNSIGNED DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `class_id` varchar(20) NOT NULL COMMENT 'e.g. P1, S1',
  `babyeyi_id` int(10) UNSIGNED DEFAULT NULL,
  `term` varchar(50) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `babyeyi_requirement_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'id from babyeyi_student_requirements'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `requirement_prices`
--

INSERT INTO `requirement_prices` (`id`, `requirement_id`, `school_id`, `class_id`, `babyeyi_id`, `term`, `academic_year`, `price`, `created_at`, `updated_at`, `babyeyi_requirement_id`) VALUES
(1, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 5000.00, '2026-03-22 19:55:00', '2026-03-22 19:55:00', 6),
(2, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 3000.00, '2026-03-22 19:55:01', '2026-03-22 19:55:01', 7),
(3, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 2500.00, '2026-03-22 19:55:01', '2026-03-22 19:55:01', 8),
(4, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 2400.00, '2026-03-22 19:55:01', '2026-03-22 19:55:01', 9),
(5, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 1000.00, '2026-03-22 19:55:01', '2026-03-22 19:55:01', 10),
(6, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 199.00, '2026-03-22 19:55:01', '2026-03-22 19:55:01', 11),
(7, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 499.00, '2026-03-22 19:55:01', '2026-03-22 19:55:01', 12),
(8, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 399.00, '2026-03-22 19:55:01', '2026-03-22 19:55:01', 13),
(9, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 499.00, '2026-03-22 19:55:01', '2026-03-22 19:55:01', 14),
(10, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 1499.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 15),
(11, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 299.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 16),
(12, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 1999.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 17),
(13, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 400.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 18),
(14, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 499.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 19),
(15, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 499.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 20),
(16, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 1999.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 21),
(17, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 4500.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 22),
(18, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 14999.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 23),
(19, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 2500.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 24);

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(10) UNSIGNED NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `role_code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_system_role` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `role_name`, `role_code`, `description`, `permissions`, `is_active`, `is_system_role`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', 'SUPER_ADMIN', 'Full system access', '[\"*\"]', 1, 1, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(2, 'School Admin', 'SCHOOL_ADMIN', 'School-wide management', '[\"users.manage\",\"students.manage\",\"teachers.manage\",\"settings.manage\"]', 1, 1, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(3, 'Head of Discipline', 'HOD', 'Discipline and attendance management', '[\"attendance.manage\",\"discipline.manage\",\"reports.view\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(4, 'Teacher', 'TEACHER', 'Class and student management', '[\"attendance.mark\",\"grades.manage\",\"students.view\"]', 1, 1, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(5, 'Gate Officer', 'GATE_OFFICER', 'Entry/Exit monitoring', '[\"gate.monitor\",\"attendance.gate\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(6, 'Librarian', 'LIBRARIAN', 'Library resource management', '[\"library.manage\",\"books.manage\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(7, 'Store Manager', 'STORE_MANAGER', 'Inventory and supplies', '[\"inventory.manage\",\"supplies.order\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(8, 'Accountant', 'ACCOUNTANT', 'Financial management', '[\"finance.manage\",\"fees.manage\",\"reports.finance\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(9, 'Student', 'STUDENT', 'Student portal access', '[\"profile.view\",\"grades.view\",\"attendance.view\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(10, 'Parent', 'PARENT', 'Parent portal access', '[\"children.view\",\"grades.view\",\"fees.view\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(11, 'Head of Study', 'DOS', 'Academic management and curriculum supervision', '[\"academic.manage\",\"teachers.manage\",\"students.academic.view\",\"timetable.manage\",\"reports.academic\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(12, 'NESA Admin', 'NESA_ADMIN', 'National NESA Babyeyi portal access', '[\"babyeyi.nesa\",\"babyeyi.view\",\"fee_limits.manage\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(13, 'District Education Officer', 'DEO', 'District Babyeyi portal access', '[\"babyeyi.deo\",\"babyeyi.view\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04');

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

CREATE TABLE `schools` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_name` varchar(255) NOT NULL,
  `school_code` varchar(50) NOT NULL,
  `education_levels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Array: nursery|primary|o_level|a_level|tvet' CHECK (json_valid(`education_levels`)),
  `school_category` enum('Day','Boarding','Day & Boarding','Other','PRIMARY','NINE_TWELVE_YBE_GS') NOT NULL,
  `school_status` varchar(100) DEFAULT NULL,
  `ownership_type` enum('Government','Government-Aided','Private') NOT NULL,
  `year_established` year(4) NOT NULL,
  `province` varchar(100) NOT NULL,
  `district` varchar(100) NOT NULL,
  `sector` varchar(100) NOT NULL,
  `cell` varchar(100) NOT NULL,
  `village` varchar(100) NOT NULL,
  `full_address` text NOT NULL,
  `map_url` varchar(500) DEFAULT NULL,
  `phone` varchar(30) NOT NULL,
  `email` varchar(255) NOT NULL,
  `postal_address` varchar(255) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `head_teacher_name` varchar(255) NOT NULL,
  `head_teacher_phone` varchar(30) NOT NULL,
  `head_teacher_email` varchar(255) NOT NULL,
  `deputy_head_name` varchar(255) DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `head_signature_url` varchar(500) DEFAULT NULL,
  `school_stamp_url` varchar(500) DEFAULT NULL,
  `manager_user_id` int(10) UNSIGNED DEFAULT NULL,
  `admin_id` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('active','inactive','suspended','deleted','pending') NOT NULL DEFAULT 'pending',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `district_code` varchar(2) DEFAULT NULL,
  `a_level_combinations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`a_level_combinations`)),
  `is_skeleton` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Schools registered in the babyeyi system';

--
-- Dumping data for table `schools`
--

INSERT INTO `schools` (`id`, `school_name`, `school_code`, `education_levels`, `school_category`, `school_status`, `ownership_type`, `year_established`, `province`, `district`, `sector`, `cell`, `village`, `full_address`, `map_url`, `phone`, `email`, `postal_address`, `website`, `head_teacher_name`, `head_teacher_phone`, `head_teacher_email`, `deputy_head_name`, `logo_url`, `head_signature_url`, `school_stamp_url`, `manager_user_id`, `admin_id`, `status`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `district_code`, `a_level_combinations`, `is_skeleton`) VALUES
(1, 'G.S KIMIRONKO II TSS', '001', '[\"nursery\",\"primary\",\"o_level\",\"a_level\",\"tvet\"]', 'Day', NULL, 'Government', '1985', 'Kigali City', 'Gasabo', 'Kimironko', 'Kimironko', 'Kimironko', 'Kimironko, Gasabo, Kigali City', NULL, '0788876345', 'gskimironko@gmail.com', 'P.O.BOX 2013', NULL, 'Kamana Eric', '0788876345', 'head@gmail.com', NULL, '/uploads/school-logos/school-logo2-1774185677949-907804191.jpg', '/uploads/school-signatures/signature-1774185677951-407363694.png', '/uploads/school-stamps/stamp1-1774185677951-797177589.png', 26, NULL, 'active', 1, '2026-03-22 15:21:17', '2026-03-22 15:21:41', NULL, '04', NULL, 0),
(2, 'GS REMERA', '002', '[\"primary\",\"o_level\"]', 'Day', NULL, 'Government', '2026', 'Kigali City', 'Gasabo', 'Remera', 'Remera', 'Remera', 'Remera, Gasabo, Kigali City', NULL, '000000000', 'pending+002@school.babyeyi.local', '', NULL, 'Pending registration', '000000000', 'pending+002@school.babyeyi.local', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 1, '2026-03-22 15:44:39', '2026-03-22 15:44:39', NULL, '04', NULL, 1),
(3, 'ECOLE NOTRE DAME DES ANGES', '003', '[\"nursery\",\"primary\"]', 'Day', NULL, 'Private', '2026', 'Kigali City', 'Gasabo', 'Remera', 'Remera', 'Remera', 'Remera, Gasabo, Kigali City', NULL, '0796785674', 'notredame@gmail.com', NULL, NULL, 'UWAMAHORO Claudine', '07887656745', 'ishimwetheonest937@gmail.com', NULL, '/uploads/school-logos/ECOLE-NOTRE-DAME-DES-ANGES-1774200946224-984041302.png', '/uploads/school-signatures/signature-1774200946273-221115521.png', '/uploads/school-stamps/stamp2-1774200946274-618896051.jpg', 28, NULL, 'active', 1, '2026-03-22 15:45:22', '2026-03-22 19:36:46', NULL, '04', NULL, 0),
(4, 'KIGALI MUSTARD SEED SCHOOL', '004', '[\"nursery\",\"primary\"]', 'Day', NULL, 'Private', '2026', 'Kigali City', 'Gasabo', 'Remera', 'Remera', 'Remera', 'Remera, Gasabo, Kigali City', NULL, '000000000', 'pending+004@school.babyeyi.local', '', NULL, 'Pending registration', '000000000', 'pending+004@school.babyeyi.local', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 1, '2026-03-22 15:45:49', '2026-03-22 15:45:49', NULL, '04', NULL, 1),
(5, 'GOOD SHEPHERED NURSERY AND PRIMARY SCHOOL', '005', '[\"nursery\",\"primary\"]', 'Day', NULL, 'Private', '2026', 'Kigali City', 'Gasabo', 'Remera', 'Remera', 'Remera', 'Remera, Gasabo, Kigali City', NULL, '000000000', 'pending+005@school.babyeyi.local', '', NULL, 'Pending registration', '000000000', 'pending+005@school.babyeyi.local', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 1, '2026-03-22 15:46:06', '2026-03-22 15:46:06', NULL, '04', NULL, 1),
(6, 'SANA ACADEMY', '006', '[\"primary\",\"nursery\"]', 'Day', NULL, 'Private', '2026', 'Kigali City', 'Gasabo', 'Remera', 'Remera', 'Remera', 'Remera, Gasabo, Kigali City', NULL, '0798123456', 'sanaacdemy@gmail.com', NULL, NULL, 'NIIYONKURU Marcell', '0789456354', 'head@gmail.com', NULL, '/uploads/school-logos/sana-academy-1774436389339-122491190.png', '/uploads/school-signatures/signature3-1774436389399-807144783.png', '/uploads/school-stamps/stamp3-1774436389400-635442668.png', 32, NULL, 'active', 1, '2026-03-22 15:46:18', '2026-03-25 13:00:57', NULL, '04', NULL, 0),
(7, 'MERE DU VERBE', '007', '[\"nursery\",\"primary\"]', 'Day', NULL, 'Private', '2026', 'Kigali City', 'Gasabo', 'Remera', 'Remera', 'Remera', 'Remera, Gasabo, Kigali City', NULL, '000000000', 'pending+007@school.babyeyi.local', '', NULL, 'Pending registration', '000000000', 'pending+007@school.babyeyi.local', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 1, '2026-03-22 15:46:38', '2026-03-22 15:46:38', NULL, '04', NULL, 1),
(8, 'APAPER', '008', '[\"nursery\",\"primary\"]', 'Day', NULL, 'Private', '2026', 'Kigali City', 'Gasabo', 'Remera', 'Remera', 'Remera', 'Remera, Gasabo, Kigali City', NULL, '0796898894', 'apaper@gmail.com', NULL, NULL, 'MUGABO Claude', '0789678565', 'ishimwetheoneste937@gmail.com', NULL, NULL, '/uploads/school-signatures/signature3-1774192835906-710658783.png', '/uploads/school-stamps/stamp1-1774192835908-231950259.png', 27, NULL, 'active', 1, '2026-03-22 15:46:54', '2026-03-22 17:24:30', NULL, '04', NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `school_babyeyi`
--

CREATE TABLE `school_babyeyi` (
  `id` int(10) UNSIGNED NOT NULL,
  `doc_id` varchar(30) NOT NULL COMMENT 'e.g. BY-2026-00124 - auto-generated',
  `school_id` int(10) UNSIGNED NOT NULL,
  `school_name` varchar(255) NOT NULL,
  `school_code` varchar(50) NOT NULL,
  `school_sector` varchar(100) NOT NULL,
  `school_district` varchar(100) NOT NULL,
  `school_province` varchar(100) NOT NULL,
  `class_name` varchar(100) NOT NULL COMMENT 'e.g. S3, P6, Form 4',
  `classes_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`classes_json`)),
  `term` enum('Term 1','Term 2','Term 3') NOT NULL,
  `academic_year` year(4) NOT NULL,
  `education_level` varchar(50) NOT NULL COMMENT 'nursery|primary|o_level|a_level|tvet',
  `school_category` varchar(50) NOT NULL,
  `ownership_type` varchar(50) NOT NULL,
  `payments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '[{name, amount, description, is_compulsory}]' CHECK (json_valid(`payments`)),
  `parent_message` text DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `bank_name` varchar(255) NOT NULL,
  `bank_account_no` varchar(100) NOT NULL,
  `bank_branch` varchar(255) DEFAULT NULL,
  `head_teacher_name` varchar(255) DEFAULT NULL,
  `integrity_hash` varchar(64) DEFAULT NULL COMMENT 'Full 32-char HMAC-SHA256 prefix stored in DB',
  `qr_payload` varchar(255) DEFAULT NULL COMMENT 'doc_id|16-char-hash embedded in QR code',
  `qr_code_url` varchar(500) DEFAULT NULL COMMENT 'Path to auto-generated QR PNG',
  `pdf_url` varchar(500) DEFAULT NULL COMMENT 'Path to auto-generated PDF',
  `school_logo_url` varchar(500) DEFAULT NULL,
  `supporting_doc_url` varchar(500) DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
  `submitted_at` datetime DEFAULT NULL,
  `deo_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `deo_name` varchar(255) DEFAULT NULL,
  `deo_title` varchar(255) DEFAULT NULL,
  `deo_notes` text DEFAULT NULL,
  `deo_reviewed_at` datetime DEFAULT NULL,
  `approval_document_url` varchar(500) DEFAULT NULL,
  `rejection_document_url` varchar(500) DEFAULT NULL,
  `deo_signature_url` varchar(500) DEFAULT NULL,
  `deo_stamp_url` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `exceeds_limit` tinyint(1) NOT NULL DEFAULT 0,
  `total_fee` decimal(12,2) DEFAULT 0.00,
  `nesa_limit` decimal(12,2) DEFAULT NULL,
  `qr_code_path` varchar(500) DEFAULT NULL,
  `qr_view_url` varchar(1000) DEFAULT NULL,
  `pdf_path` varchar(500) DEFAULT NULL,
  `pdf_name` varchar(255) DEFAULT NULL,
  `banks_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`banks_json`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='School fee declaration records with HMAC-SHA256 QR integrity';

--
-- Dumping data for table `school_babyeyi`
--

INSERT INTO `school_babyeyi` (`id`, `doc_id`, `school_id`, `school_name`, `school_code`, `school_sector`, `school_district`, `school_province`, `class_name`, `classes_json`, `term`, `academic_year`, `education_level`, `school_category`, `ownership_type`, `payments`, `parent_message`, `total_amount`, `bank_name`, `bank_account_no`, `bank_branch`, `head_teacher_name`, `integrity_hash`, `qr_payload`, `qr_code_url`, `pdf_url`, `school_logo_url`, `supporting_doc_url`, `status`, `submitted_at`, `deo_status`, `deo_name`, `deo_title`, `deo_notes`, `deo_reviewed_at`, `approval_document_url`, `rejection_document_url`, `deo_signature_url`, `deo_stamp_url`, `created_at`, `updated_at`, `deleted_at`, `is_active`, `exceeds_limit`, `total_fee`, `nesa_limit`, `qr_code_path`, `qr_view_url`, `pdf_path`, `pdf_name`, `banks_json`) VALUES
(1, 'BY-2025-00001', 3, 'ECOLE NOTRE DAME DES ANGES', '003', 'Remera', 'Gasabo', 'Kigali City', 'P1', '[\"P1\"]', 'Term 1', '2025', 'Primary', 'Private', '', '[{\"name\":\"Tuition Fee\",\"amount\":\"50000\"},{\"name\":\"Transport Fee\",\"amount\":\"30000\"}]', 'Dear Parents and Guardians,\r\n\r\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\r\n\r\nThank you for your continued support.', 80000.00, 'Umwalimu SACCO', '000783673267256', NULL, NULL, 'fe3b5955ca8ff719', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-22 20:03:26', '2026-03-22 20:18:16', NULL, 1, 0, 80000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00001-1774202606368.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00001', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00001-1774202606465.pdf', 'babyeyi-BY-2025-00001-1774202606465.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"000783673267256\",\"accountName\":\"ECOLE NOTRE DAME DES ANGES\",\"isPrimary\":true},{\"bankName\":\"Bank of Kigali (BK)\",\"accountNumber\":\"100067677636767\",\"accountName\":\"ecole-notre-dame-des-angels-bk\",\"isPrimary\":false}]'),
(2, 'BY-2025-00002', 3, 'ECOLE NOTRE DAME DES ANGES', '003', 'Remera', 'Gasabo', 'Kigali City', 'P2', '[\"P2\"]', 'Term 1', '2025', 'Primary', 'Private', '', '[{\"name\":\"Tuition Fee\",\"amount\":\"60000\"},{\"name\":\"Transport Fee\",\"amount\":\"40000\"}]', 'Dear Parents and Guardians,\r\n\r\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\r\n\r\nThank you for your continued support.', 100000.00, 'Umwalimu SACCO', '000663476436476', NULL, NULL, 'cf619be2ec6a6ad1', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-22 21:54:58', '2026-03-22 22:40:00', NULL, 1, 0, 100000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00002-1774209304009.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00002', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00002-1774209305169.pdf', 'babyeyi-BY-2025-00002-1774209305169.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"000663476436476\",\"accountName\":\"ECOLE NOTRE DAME DES ANGES\",\"isPrimary\":true},{\"bankName\":\"Bank of Kigali (BK)\",\"accountNumber\":\"1008877345673\",\"accountName\":\"ecole-notre-dame-angels-bk\",\"isPrimary\":false}]');

-- --------------------------------------------------------

--
-- Table structure for table `school_discipline_settings`
--

CREATE TABLE `school_discipline_settings` (
  `school_id` int(10) UNSIGNED NOT NULL,
  `total_marks` decimal(8,2) NOT NULL DEFAULT 100.00,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by_user_id` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `school_discipline_settings`
--

INSERT INTO `school_discipline_settings` (`school_id`, `total_marks`, `updated_at`, `updated_by_user_id`) VALUES
(3, 40.00, '2026-03-25 08:00:18', 30);

-- --------------------------------------------------------

--
-- Table structure for table `school_dos_settings`
--

CREATE TABLE `school_dos_settings` (
  `school_id` int(10) UNSIGNED NOT NULL,
  `total_marks` decimal(8,2) NOT NULL DEFAULT 100.00,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by_user_id` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_fee_collections`
--

CREATE TABLE `school_fee_collections` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `babyeyi_id` int(10) UNSIGNED DEFAULT NULL,
  `academic_year_label` varchar(64) NOT NULL,
  `term` varchar(32) NOT NULL,
  `class_name` varchar(120) DEFAULT NULL,
  `total_due` decimal(14,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(14,2) NOT NULL DEFAULT 0.00,
  `balance_remaining` decimal(14,2) NOT NULL DEFAULT 0.00,
  `recorded_by_user_id` int(10) UNSIGNED NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `school_fee_collections`
--

INSERT INTO `school_fee_collections` (`id`, `school_id`, `student_id`, `babyeyi_id`, `academic_year_label`, `term`, `class_name`, `total_due`, `amount_paid`, `balance_remaining`, `recorded_by_user_id`, `notes`, `created_at`) VALUES
(1, 6, 36, 2, '2025-2026', 'Term 1', 'P2', 100000.00, 50000.00, 50000.00, 29, NULL, '2026-03-25 07:12:11'),
(2, 3, 37, 2, '2025-2026', 'Term 1', 'P2', 100000.00, 100000.00, 0.00, 29, NULL, '2026-03-25 07:13:40'),
(3, 3, 37, 2, '2025-2026', 'Term 1', 'P2', 100000.00, 100000.00, 0.00, 29, NULL, '2026-03-25 13:12:28');

-- --------------------------------------------------------

--
-- Table structure for table `school_leaders`
--

CREATE TABLE `school_leaders` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `role_type` enum('head','deputy','other') NOT NULL DEFAULT 'other',
  `full_name` varchar(200) NOT NULL,
  `role_title` varchar(150) DEFAULT NULL COMMENT 'e.g. Director of Studies',
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(200) DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `signature_url` varchar(500) DEFAULT NULL COMMENT 'Head teacher only',
  `stamp_url` varchar(500) DEFAULT NULL COMMENT 'Head teacher only',
  `sort_order` tinyint(3) UNSIGNED DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `school_leaders`
--

INSERT INTO `school_leaders` (`id`, `school_id`, `role_type`, `full_name`, `role_title`, `phone`, `email`, `photo_url`, `signature_url`, `stamp_url`, `sort_order`, `created_at`, `updated_at`) VALUES
(5, 4, 'other', 'Ishimwe Theoneste', 'Director Of Studies', '+250788876345', 'muneza@gmaill.com', '/uploads/mini-websites/student1-1773136290418-822253.jpg', NULL, NULL, 0, '2026-03-10 11:51:30', '2026-03-10 11:51:30'),
(6, 4, 'other', 'Mahoro Esther', 'Director Of Displine', '+250788876311', 'mahoro@gmail.com', '/uploads/mini-websites/student-image-1773136290419-899184.jpg', NULL, NULL, 1, '2026-03-10 11:51:30', '2026-03-10 11:51:30'),
(56, 6, 'other', 'Kamana Claude', 'Director of Studies', '+250798699601', 'ishimwetheo488@gmail.com', '/uploads/mini-websites/student1-1773327210786-330831.jpg', NULL, NULL, 0, '2026-03-14 17:29:08', '2026-03-14 17:29:08'),
(57, 6, 'other', 'Uwamariya Claudette', 'Directot of Displine', '+250798699000', 'uwa@gmail.com', '/uploads/mini-websites/student-image-1773327210786-956049.jpg', NULL, NULL, 1, '2026-03-14 17:29:08', '2026-03-14 17:29:08'),
(58, 6, 'other', 'Izibyose Ineza Queen', 'Secretary', '+25079564735344', 'ineza@gmail.com', '/uploads/mini-websites/student2-1773327210786-848379.jpg', NULL, NULL, 2, '2026-03-14 17:29:08', '2026-03-14 17:29:08'),
(63, 11, 'other', 'Kamana Peter', 'Director of Study', '0789876546', 'secretary@gmail.com', '/uploads/mini-websites/student-image-1773818096049-487578.jpg', NULL, NULL, 0, '2026-03-18 09:40:20', '2026-03-18 09:40:20'),
(64, 11, 'other', 'Mugenzi Claude', 'Director of Discipline', '0789878765', 'dod@gmail.com', '/uploads/mini-websites/student1-1773818096049-710077.jpg', NULL, NULL, 1, '2026-03-18 09:40:20', '2026-03-18 09:40:20'),
(65, 11, 'other', 'Uwase Angel', 'Secretary', '0789876567', 'angel@gmail.com', '/uploads/mini-websites/student2-1773818096051-505590.jpg', NULL, NULL, 2, '2026-03-18 09:40:20', '2026-03-18 09:40:20'),
(66, 11, 'head', 'Muneza claude', 'Head Teacher', '07887856746', 'head@gmail.com', '/uploads/mini-websites/photo-1773819620789-610221.jpg', NULL, NULL, 0, '2026-03-18 09:40:20', '2026-03-18 09:40:20'),
(70, 15, 'head', 'Maniragabo Claude', 'Head Teacher', '0789678567', 'headteacher@gmail.com', '/uploads/mini-websites/student-1773864456526-512582.jpg', NULL, NULL, 0, '2026-03-18 22:07:36', '2026-03-18 22:07:36'),
(71, 15, 'other', 'Uwase Angel', 'Director of Study', '0789678576', 'dos@gmail.com', '/uploads/mini-websites/student-image-1773864456528-27449.jpg', NULL, NULL, 0, '2026-03-18 23:33:08', '2026-03-18 23:33:08'),
(72, 15, 'other', 'Kareba Angel', 'Director of Discipline', '0789675674', 'kareba@gmail.com', '/uploads/mini-websites/student2-1773864456534-137767.jpg', NULL, NULL, 1, '2026-03-18 23:33:08', '2026-03-18 23:33:08'),
(73, 15, 'other', 'Maneza Claude', 'Secretary', '0798678576', 'claude@gmail.com', '/uploads/mini-websites/student1-1773864456535-151598.jpg', NULL, NULL, 2, '2026-03-18 23:33:08', '2026-03-18 23:33:08'),
(74, 15, 'head', 'Maniragabo Claude', 'Head Teacher', '0789678567', 'headteacher@gmail.com', '/uploads/mini-websites/student-1773864456526-512582.jpg', NULL, NULL, 0, '2026-03-18 23:33:08', '2026-03-18 23:33:08'),
(75, 4114, 'other', 'Mahoro Esther', 'Director of Study', '0789678567', 'esther@gmail.com', '/uploads/mini-websites/student-1773998781529-49782.jpg', NULL, NULL, 0, '2026-03-20 11:26:22', '2026-03-20 11:26:22'),
(76, 4114, 'other', 'UWASE Aline', 'Director of Discipline', '0789678567', 'uwase@gmail.com', '/uploads/mini-websites/student-image-1773998781529-248603.jpg', NULL, NULL, 1, '2026-03-20 11:26:22', '2026-03-20 11:26:22'),
(77, 4114, 'other', 'Keni Alive', 'Secretary', '0789456354', 'alive@gmail.com', '/uploads/mini-websites/student2-1773998781531-291410.jpg', NULL, NULL, 2, '2026-03-20 11:26:22', '2026-03-20 11:26:22'),
(78, 4114, 'head', 'Kamana Peter', 'Head Teacher', '0789678756', 'peter@gmail.com', '/uploads/mini-websites/student1-1773998781527-577442.jpg', NULL, NULL, 0, '2026-03-20 11:26:22', '2026-03-20 11:26:22'),
(82, 3, 'head', 'UWAMARIYA Claudine', 'Head Teacher', '07896785674', 'head@gmail.com', '/uploads/mini-websites/student-image-1774212499231-247167.jpg', NULL, NULL, 0, '2026-03-22 22:48:19', '2026-03-22 22:48:19'),
(83, 3, 'other', 'Kamana Eric', 'Director of Study', '0789678567', 'kamana!gmail.com', '/uploads/mini-websites/student2-1774212781440-133189.jpg', NULL, NULL, 0, '2026-03-22 22:53:01', '2026-03-22 22:53:01'),
(84, 3, 'other', 'SUGIRA Venuste', 'Director of Discipline', '0798576456', 'dodo@gmail.com', '/uploads/mini-websites/student1-1774212781440-583963.jpg', NULL, NULL, 1, '2026-03-22 22:53:01', '2026-03-22 22:53:01'),
(85, 3, 'other', 'KARORI Moses', 'Secretary', '0796785764', 'mosese@gmail.com', '/uploads/mini-websites/student-1774212781440-133050.jpg', NULL, NULL, 2, '2026-03-22 22:53:01', '2026-03-22 22:53:01'),
(86, 3, 'head', 'UWAMARIYA Claudine', 'Head Teacher', '07896785674', 'head@gmail.com', '/uploads/mini-websites/student-image-1774212781434-505542.jpg', NULL, NULL, 0, '2026-03-22 22:53:01', '2026-03-22 22:53:01');

-- --------------------------------------------------------

--
-- Table structure for table `school_mini_websites`
--

CREATE TABLE `school_mini_websites` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL COMMENT 'FK  schools.id  (1-to-1)',
  `slug` varchar(160) NOT NULL COMMENT 'URL-safe handle, e.g. gs-kayonza',
  `status` enum('draft','published','suspended') NOT NULL DEFAULT 'draft',
  `published_at` datetime DEFAULT NULL,
  `cover_url` varchar(500) DEFAULT NULL COMMENT 'Hero banner image',
  `about_image_url` varchar(500) DEFAULT NULL COMMENT 'About section image',
  `mission_image_url` varchar(500) DEFAULT NULL COMMENT 'Mission section image',
  `background` text DEFAULT NULL,
  `mission` text DEFAULT NULL,
  `vision` text DEFAULT NULL,
  `core_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '["Integrity","Excellence",.]' CHECK (json_valid(`core_values`)),
  `facebook` varchar(400) DEFAULT NULL,
  `twitter` varchar(400) DEFAULT NULL,
  `instagram` varchar(400) DEFAULT NULL,
  `template` varchar(60) NOT NULL DEFAULT 'modern' COMMENT 'modern|classic|minimal|vibrant|nature|bold|elegant|fresh|warm|dark',
  `color_theme` varchar(60) NOT NULL DEFAULT 'blue' COMMENT 'blue|green|red|purple|orange|teal|indigo|rose|amber|cyan|lime|pink|custom',
  `custom_colors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '{primary,secondary,accent} - used when color_theme=custom' CHECK (json_valid(`custom_colors`)),
  `sections` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '["hero","about","mission","gallery","admissions","fees","contact"]' CHECK (json_valid(`sections`)),
  `a_level_combinations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '[{code,full},.]' CHECK (json_valid(`a_level_combinations`)),
  `tvet_trades` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '["Electricity","Plumbing",.]' CHECK (json_valid(`tvet_trades`)),
  `admission` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '{openDate,closeDate,year,contactPhone,steps[],requirements[],documents[],notes}' CHECK (json_valid(`admission`)),
  `admission_form_id` int(10) UNSIGNED DEFAULT NULL,
  `fees` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '{nursery:{currency,notes,items:[{type,amount,period}]},primary:{.},.}' CHECK (json_valid(`fees`)),
  `albums` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '[{id,title,date,category,description,images:[{id,url,caption}]}]' CHECK (json_valid(`albums`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `international_primary_programs` text DEFAULT NULL,
  `international_other_programs` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mini-website content for each school (1-to-1 with schools)';

--
-- Dumping data for table `school_mini_websites`
--

INSERT INTO `school_mini_websites` (`id`, `school_id`, `slug`, `status`, `published_at`, `cover_url`, `about_image_url`, `mission_image_url`, `background`, `mission`, `vision`, `core_values`, `facebook`, `twitter`, `instagram`, `template`, `color_theme`, `custom_colors`, `sections`, `a_level_combinations`, `tvet_trades`, `admission`, `admission_form_id`, `fees`, `albums`, `created_at`, `updated_at`, `international_primary_programs`, `international_other_programs`) VALUES
(1, 3, 'ecole-notre-dame-des-anges', 'published', '2026-03-22 22:48:19', '/uploads/mini-websites/1-1774212781441-503631.jpg', '/uploads/mini-websites/6-1774212781441-896580.jpg', '/uploads/mini-websites/2-1774212781442-689972.jpg', 'ECOLE NOTRE DAMME ANGELS is a learning institution committed to providing quality education and shaping responsible, knowledgeable, and disciplined citizens. The school was established with the aim of offering students a strong academic foundation while promoting moral values, creativity, and critical thinking.\r\n\r\nLocated in a conducive learning environment, the school provides modern educational facilities that support both academic and co-curricular development. The institution welcomes students from diverse backgrounds and encourages inclusiveness, respect, and cooperation among learners.', 'Our mission is to provide quality education that nurtures academic excellence, critical thinking, creativity, and moral values. We are committed to creating a supportive and inclusive learning environment where every student is encouraged to develop their full potential and become responsible, confident, and productive members of society.\r\n\r\nThrough dedicated teaching, innovative learning methods, and active community involvement, the school strives to equip learners with the knowledge, skills, and character necessary for lifelong learning and future success', 'Our vision is to become a leading center of excellence in education, recognized for nurturing knowledgeable, skilled, and responsible learners who are prepared to meet the challenges of the modern world.\r\n\r\nWe aspire to develop students who are innovative, confident, and committed to lifelong learning, while upholding strong moral values and contributing positively to their communities and society.', '[\"Integrity\",\"Hardworking\",\"Slef-confidence\",\"Excellence\"]', NULL, NULL, NULL, 'authority', 'blue', NULL, '[\"hero\",\"stats\",\"about\",\"mission\",\"programs\",\"fees\",\"admissions\",\"gallery\",\"announcements\",\"leadership\",\"testimonials\",\"contact\",\"cta\"]', '[]', '[]', '{\"openDate\":null,\"closeDate\":null,\"year\":null,\"contactPhone\":null,\"steps\":[],\"requirements\":[],\"documents\":[],\"notes\":null}', NULL, '{\"nursery\":{\"currency\":\"RWF\",\"notes\":null,\"items\":[{\"type\":\"Tuition Fee\",\"amount\":50000,\"period\":\"Per Term\",\"sort\":0},{\"type\":\"Transport Fee\",\"amount\":40000,\"period\":\"Per Term\",\"sort\":1}]},\"primary\":{\"currency\":\"RWF\",\"notes\":null,\"items\":[{\"type\":\"Tuition Fee\",\"amount\":60000,\"period\":\"Per Term\",\"sort\":0},{\"type\":\"Transport Fee\",\"amount\":40000,\"period\":\"Per Term\",\"sort\":1}]}}', '[{\"id\":1774212471374,\"title\":\"Sport Day\",\"date\":null,\"category\":\"Sports\",\"description\":null,\"images\":[]}]', '2026-03-22 22:48:19', '2026-03-22 22:53:01', '[]', '[]');

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `staff_id` varchar(50) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`id`, `user_id`, `school_id`, `staff_id`, `username`, `created_at`) VALUES
(1, 29, 3, NULL, 'notredameaccountant', '2026-03-25 07:10:08'),
(2, 30, 3, NULL, 'notredamehod', '2026-03-25 07:59:29'),
(3, 31, 3, NULL, 'notredanedos', '2026-03-25 12:14:23');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int(10) UNSIGNED NOT NULL,
  `student_uid` varchar(50) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `birth_year` int(11) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `sector` varchar(100) DEFAULT NULL,
  `cell` varchar(100) DEFAULT NULL,
  `village` varchar(100) DEFAULT NULL,
  `father_full_name` varchar(150) DEFAULT NULL,
  `father_phone` varchar(30) DEFAULT NULL,
  `father_email` varchar(150) DEFAULT NULL,
  `mother_full_name` varchar(150) DEFAULT NULL,
  `mother_phone` varchar(30) DEFAULT NULL,
  `mother_email` varchar(150) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `import_missing_fields` text DEFAULT NULL,
  `source_row_json` longtext DEFAULT NULL,
  `class_name` varchar(120) DEFAULT NULL,
  `academic_year` varchar(32) DEFAULT NULL,
  `student_code` varchar(15) DEFAULT NULL,
  `sdm_code` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `student_uid`, `school_id`, `first_name`, `last_name`, `gender`, `birth_year`, `nationality`, `province`, `district`, `sector`, `cell`, `village`, `father_full_name`, `father_phone`, `father_email`, `mother_full_name`, `mother_phone`, `mother_email`, `created_at`, `updated_at`, `import_missing_fields`, `source_row_json`, `class_name`, `academic_year`, `student_code`, `sdm_code`) VALUES
(1, '040080001', 8, 'Manirakiza', 'Jean Pierre', 'Male', 2008, 'Rwandan', 'Kigali City', 'Gasabo', 'Remera', 'Nyabisindu', 'Amarembo II', 'Muneza Peter', '0789867856', NULL, 'Muhoracyeye Veneranda', '0789678567', NULL, '2026-03-22 19:13:27', '2026-03-22 19:14:09', NULL, NULL, 'S1', '2025-2026', '040080001', '12004'),
(2, '040080002', 8, 'KAMANA', 'Eric', 'Male', 2006, 'Rwandan', 'Kigali City', 'Gasabo', 'Remera', 'Nyabisindu', 'Kinunga', 'Maniriho Peter', '0796787656', NULL, 'Mahoro Jeanne', '0789665746', NULL, '2026-03-22 19:15:45', '2026-03-22 20:05:18', NULL, NULL, 'S1', '2025-2026', '040080002', '12008'),
(3, '040080003', 8, 'IRADUKUNDA', 'Ange Pascaline', 'Female', 2007, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Ruhengeli', 'Burera', 'uwiragiye Clement', '0788823273', NULL, 'iyakaremye M. Faina', '0788478648', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526266468,\"IRADUKUNDA\",\"Ange Pascaline\",\"Female\",2007,\"uwiragiye Clement\",788823273,\"\",\"iyakaremye M. Faina\",788478648,\"\",\"Rwandan\",\"North\",\"Musanze\",\"Muhoza\",\"Ruhengeli\",\"Burera\"]', 'S2', '2025-2026', '040080003', NULL),
(4, '040080004', 8, 'MUGWANEZA', 'Iyabes', NULL, 2004, 'Rwandan', 'South', 'NYANZA', 'KIGOMA', 'MURINJA', 'AKINTARE', 'BIZIMANA Jeadedie', '0722740517', NULL, 'NYICUMI Goltha', '0788275628', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269460,\"MUGWANEZA\",\"Iyabes\",\"DUHIRWE KAGABO MUNANA\",2004,\"BIZIMANA Jeadedie\",722740517,\"\",\"NYICUMI Goltha\",788275628,\"\",\"Rwandan\",\"South\",\"NYANZA\",\"KIGOMA\",\"MURINJA\",\"AKINTARE\"]', 'S2', '2025-2026', '040080004', NULL),
(5, '040080005', 8, 'SHIMWA', 'Grace Graine', 'Female', 2007, 'Rwandan', 'Kigali', 'GASABO', 'JALI', NULL, NULL, 'CYPRIEN', '0783551793', NULL, 'PERPETURE', '0785131123', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Cell\",\"Village\"]', '[202526266476,\"SHIMWA\",\"Grace Graine\",\"FEMALE\",2007,\"CYPRIEN\",783551793,\"\",\"PERPETURE\",785131123,\"\",\"Rwandan\",\"KIGALI\",\"GASABO\",\"JALI\",\"\",\"\"]', 'S2', '2025-2026', '040080005', NULL),
(6, '040080006', 8, 'TUMUKUNDE', 'Linker', 'Female', 2008, 'Rwandan', 'Kigali', 'NYARUGENGE', 'KIGALI', 'RURIBA', NULL, 'ngamije', '0788457962', NULL, 'Gloria', '0788351921', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Village\"]', '[202526266480,\"TUMUKUNDE\",\"Linker\",\"Female\",2008,\"ngamije\",788457962,\"\",\"Gloria\",788351921,\"\",\"Rwandan\",\"KIGALI\",\"NYARUGENGE\",\"KIGALI\",\"RURIBA\",\"\"]', 'S2', '2025-2026', '040080006', NULL),
(7, '040080007', 8, 'UMUHOZA', 'Micheline', 'Female', 2005, 'Rwandan', 'North', 'Burera', 'kivuye', 'Bukwashuri', 'Buhita', 'Maniraguha micheli', '0789917958', NULL, 'Mukasafari marie luise', '0783162958', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526266488,\"UMUHOZA\",\"Micheline\",\"female\",2005,\"Maniraguha micheli\",789917958,\"\",\"Mukasafari marie luise\",783162958,\"\",\"Rwandan\",\"north\",\"Burera\",\"kivuye\",\"Bukwashuri\",\"Buhita\"]', 'S2', '2025-2026', '040080007', NULL),
(8, '040080008', 8, 'UWERA TUYISHIMIRE', 'Daniella', 'Female', 2006, 'Rwandan', 'North', 'Gakenke', 'Ruli', 'Gikingo', 'Rumasa', 'Nsanzimana Epa Phorodite', '0785700907', NULL, 'Uwera Mukareta Beatrice', '0785074193', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526266484,\"UWERA TUYISHIMIRE\",\"Daniella\",\"female\",2006,\"Nsanzimana Epa Phorodite\",785700907,\"\",\"Uwera Mukareta Beatrice\",785074193,\"\",\"Rwandan\",\"North\",\"Gakenke\",\"Ruli\",\"Gikingo\",\"Rumasa\"]', 'S2', '2025-2026', '040080008', NULL),
(9, '040080009', 8, 'UWIMANA', 'Marie Claire', 'Female', 2006, 'Rwandan', 'Kigali', 'kicukiro', 'NYARUGUNGA', 'kamashashi', 'uruhongore', NULL, NULL, NULL, 'UMWALI ROSE', '0798600056', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526266492,\"UWIMANA\",\"Marie Claire\",\"female\",2006,\"\",\"\",\"\",\"UMWALI ROSE\",798600056,\"\",\"Rwandan\",\"kigali\",\"kicukiro\",\"NYARUGUNGA\",\"kamashashi\",\"uruhongore\"]', 'S2', '2025-2026', '040080009', NULL),
(10, '040080010', 8, 'Cadette', 'Sandrine', 'Female', 2005, 'Rwandan', 'East', 'Bugesera', 'Mayange', 'Kabeza', 'Kibirizi', 'Twagirimana Theoneste', '0788633129', NULL, 'Tugirumurinda Therese', '0783088593', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269272,\"Cadette\",\"Sandrine\",\"Female\",2005,\"Twagirimana Theoneste\",788633129,\"\",\"Tugirumurinda Therese\",783088593,\"\",\"Rwandan\",\"Eastern\",\"Bugesera\",\"Mayange\",\"Kabeza\",\"Kibirizi\"]', 'S2', '2025-2026', '040080010', NULL),
(11, '040080011', 8, 'HIRWA UMUNYANA', 'Benita', 'Female', 2007, 'Rwandan', 'Kigali', 'Kicukiro', 'Kanombe', 'Rubirizi', 'Beninka', 'Twahirwa Theogene', '0782466295', 'tteo104@gmail.com', 'Niyonambaza Aline', '0788559621', 'niyonambaaline@', '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269276,\"HIRWA UMUNYANA\",\"Benita\",\"Female\",2007,\"Twahirwa Theogene\",782466295,\"tteo104@gmail.com\",\"Niyonambaza Aline\",788559621,\"niyonambaaline@\",\"Rwandan\",\"Kigali city\",\"Kicukiro\",\"Kanombe\",\"Rubirizi\",\"Beninka\"]', 'S2', '2025-2026', '040080011', NULL),
(12, '040080012', 8, 'MUSHIMIYIMANA', 'Jimmy', 'Male', 2008, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Kivumu', 'Ubukerarugendo', 'Mporwiki narcise', '0785719204', NULL, 'Uzamukunda Cartas', '0790027126', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269280,\"MUSHIMIYIMANA\",\"Jimmy\",\"Male\",2008,\"Mporwiki narcise\",785719204,\"\",\"Uzamukunda Cartas\",790027126,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Kivumu\",\"Ubukerarugendo\"]', 'S2', '2025-2026', '040080012', NULL),
(13, '040080013', 8, 'NIYOGISUBIZO', 'Gaston', 'Male', 2005, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Rwambogo', 'gakoro', 'HAKIZIMANA Anastase', '0783552273', NULL, 'NIYONSABA Emmaculee\'', '0782539558', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269284,\"NIYOGISUBIZO\",\"Gaston\",\"male\",2005,\"HAKIZIMANA Anastase\",783552273,\"\",\"NIYONSABA Emmaculee\'\",782539558,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Musanze\",\"Rwambogo\",\"gakoro\"]', 'S2', '2025-2026', '040080013', NULL),
(14, '040080014', 8, 'MURANGIRA', 'Adiru', 'Male', 2007, 'Rwandan', 'Kigali City', 'Kicukiro', 'Kicukiro', 'Kicukiro', 'Rwinanka', 'Murangira Fazil', '0788784098', NULL, 'Mukase Chadia', '0788784098', NULL, '2026-03-22 20:25:59', '2026-03-22 20:26:54', '[]', '[202526269356,\"MURANGIRA\",\"Adiru\",\"Male\",2007,\"Murangira Fazil\",788784098,\"\",\"Mukase Chadia\",788784098,\"\",\"Rwandan\",\"Kigali city\",\"kicukiro\",\"kicukiro\",\"kicukiro\",\"Rwinanka\"]', 'S2', '2025-2026', '040080014', NULL),
(15, '040080015', 8, 'SHEMA', 'Charles', 'Male', 2007, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Amataba', 'bugoyi', 'Gasana damascene', '0788558382', NULL, 'Mukashyaka ngabo', '0788265818', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269360,\"SHEMA\",\"Charles\",\"Male\",2007,\"Gasana damascene\",788558382,\"\",\"Mukashyaka ngabo\",788265818,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Amataba\",\"bugoyi\"]', 'S2', '2025-2026', '040080015', NULL),
(16, '040080016', 8, 'ISANGE', 'Placide', 'Male', 2008, 'Rwandan', 'North', 'Burera', 'cyanika', 'nkiliza', 'cyidaho', 'NDABANANIYE Janvier', '0788424789', NULL, 'NDIMUBANDI Emmeraude', '0788606955', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269288,\"ISANGE\",\"Placide\",\"Male\",2008,\"NDABANANIYE Janvier\",788424789,\"\",\"NDIMUBANDI Emmeraude\",788606955,\"\",\"Rwandan\",\"Northern\",\"Burera\",\"cyanika\",\"nkiliza\",\"cyidaho\"]', 'S2', '2025-2026', '040080016', NULL),
(17, '040080017', 8, 'Mugisha', 'Kenny Frank', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387011', NULL, NULL, '0736137668', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269292,\"Mugisha\",\"Kenny Frank\",\"Male\",\"\",\"\",789387011,\"\",\"\",736137668,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'S2', '2025-2026', '040080017', NULL),
(18, '040080018', 8, 'DUSENGIMANA', 'Olivier', 'Male', 2005, 'Rwandan', 'North', 'Burera', 'kinoni', 'nkenke', 'kigina', 'Turinumukiza john', '0789387012', 'olivierdusengimana31@gmail.com', 'nyirantungane candide', '0736276680', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269304,\"DUSENGIMANA\",\"Olivier\",\"Male\",2005,\"Turinumukiza john\",789387012,\"olivierdusengimana31@gmail.com\",\"nyirantungane candide\",736276680,\"\",\"Rwandan\",\"Northern\",\"Burera\",\"kinoni\",\"nkenke\",\"kigina\"]', 'S2', '2025-2026', '040080018', NULL),
(19, '040080019', 8, 'MUGISHA', 'Obed', 'Male', 2005, 'Rwandan', NULL, NULL, NULL, NULL, NULL, 'Gatera Pascal', NULL, NULL, 'Mukamurigo illumine', '0788411306', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269308,\"MUGISHA\",\"Obed\",\"Male\",2005,\"Gatera Pascal\",\"\",\"\",\"Mukamurigo illumine\",788411306,\"\",\"Rwandan\",\"\",\"\",\"\",\"\",\"\"]', 'S2', '2025-2026', '040080019', NULL),
(20, '040080020', 8, 'URAYENEZA', 'Nabil Saidi', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387012', NULL, NULL, NULL, NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269312,\"URAYENEZA\",\"Nabil Saidi\",\"Male\",\"\",\"\",789387012,\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'S2', '2025-2026', '040080020', NULL),
(21, '040080021', 8, 'IYAKARE KALINDA', 'Liza', 'Female', 2006, 'Rwandan', 'Kigali', 'Gasabo', 'Kibagabaga', 'Kibagabaga', NULL, 'KALINDA Heritier', '0788617976', NULL, 'MUKASHYAKA Marie Claire', '0788759262', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Village\"]', '[202526269316,\"IYAKARE KALINDA\",\"Liza\",\"Female\",2006,\"KALINDA Heritier\",788617976,\"\",\"MUKASHYAKA Marie Claire\",788759262,\"\",\"Rwandan\",\"kigali city\",\"Gasabo\",\"Kibagabaga\",\"Kibagabaga\",\"\"]', 'S2', '2025-2026', '040080021', NULL),
(22, '040080022', 8, 'JABO MAKOMA', 'Rock', 'Male', 2008, 'Rwandan', 'Kigali', 'kicukiro', 'Nyarugunga', NULL, NULL, 'NOHELI Sam', '0788635907', 'sambensolo@gmail.com', 'TUYIZERE Petronille', '0736107668', 'tuyipety@gmail.com', '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Cell\",\"Village\"]', '[202526269320,\"JABO MAKOMA\",\"Rock\",\"Male\",2008,\"NOHELI Sam\",788635907,\"sambensolo@gmail.com\",\"TUYIZERE Petronille\",736107668,\"tuyipety@gmail.com\",\"Rwandan\",\"kigali city\",\"kicukiro\",\"Nyarugunga\",\"\",\"\"]', 'S2', '2025-2026', '040080022', NULL),
(23, '040080023', 8, 'KWIZERA NTWARI', 'Jyvan', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387011', NULL, NULL, '0736107668', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269324,\"KWIZERA NTWARI\",\"Jyvan\",\"Male\",\"\",\"\",789387011,\"\",\"\",736107668,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'S2', '2025-2026', '040080023', NULL),
(24, '040080024', 8, 'MANZI', 'Benjamin', 'Male', 2008, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Ruhengeri', 'Muhe', 'MUNYANEZA Methode', '0785582700', NULL, 'MUTAMURIZA Liberatha', '0788415830', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269328,\"MANZI\",\"Benjamin\",\"Male\",2008,\"MUNYANEZA Methode\",785582700,\"\",\"MUTAMURIZA Liberatha\",788415830,\"\",\"Rwandan\",\"Nothern\",\"Musanze\",\"Muhoza\",\"Ruhengeri\",\"Muhe\"]', 'S2', '2025-2026', '040080024', NULL),
(25, '040080025', 8, 'MAOMBI', 'Patrick', 'Male', 2005, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Kivumu', 'Urumuri', 'Mbanziriza Aphrodis', '0788668288', NULL, 'Murekatete Meghan', '0783708041', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269332,\"MAOMBI\",\"Patrick\",\"Male\",2005,\"Mbanziriza Aphrodis\",788668288,\"\",\"Murekatete Meghan\",783708041,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Kivumu\",\"Urumuri\"]', 'S2', '2025-2026', '040080025', NULL),
(26, '040080026', 8, 'NIWEMUGENI', 'ISABELLE', 'Female', 2002, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Nengo', 'Urubyiruko', 'BAJENEZA JEAN PAUL', '0788451571', NULL, 'MUKABAGARA VEREN', '0783801088', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[20252666796,\"NIWEMUGENI\",\"ISABELLE\",\"F\",37338,\"BAJENEZA JEAN PAUL\",788451571,\"\",\"MUKABAGARA VEREN\",783801088,\"\",\"\",\"West\",\"Rubavu\",\"Gisenyi\",\"Nengo\",\"Urubyiruko\"]', 'S2', '2025-2026', '040080026', NULL),
(27, '040080027', 8, 'NIWEMUGENI', 'Isabelle', 'Female', 2004, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Ntengo', 'Urubyiruko', 'Bajeneza jean paul', '0788451571', NULL, 'Mukantagara verena', '0783801088', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269336,\"NIWEMUGENI\",\"Isabelle\",\"Female\",2004,\"Bajeneza jean paul\",788451571,\"\",\"Mukantagara verena\",783801088,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Ntengo\",\"Urubyiruko\"]', 'S2', '2025-2026', '040080027', NULL),
(28, '040080028', 8, 'NTWARI', 'Davis', 'Male', 2006, 'Rwandan', 'Kigali', 'Gasabo', 'Rusororo', NULL, NULL, 'NDATSIKIRA GILBERT', '0788550156', NULL, 'UWIMANA NATACHA', '0788623723', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Cell\",\"Village\"]', '[202526269340,\"NTWARI\",\"Davis\",\"Male\",2006,\"NDATSIKIRA GILBERT\",788550156,\"\",\"UWIMANA NATACHA\",788623723,\"\",\"Rwandan\",\"Kigali\",\"Gasabo\",\"Rusororo\",\"\",\"\"]', 'S2', '2025-2026', '040080028', NULL),
(29, '040080029', 8, 'NGIRABAKUNZI', 'Thierry', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387011', NULL, NULL, '0736177668', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269388,\"NGIRABAKUNZI\",\"Thierry\",\"Male\",\"\",\"\",789387011,\"\",\"\",736177668,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'S2', '2025-2026', '040080029', NULL),
(30, '040080030', 8, 'NIZEYIMANA', 'Bertin', 'Male', 2006, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Cyabagarura', 'Gaturo', 'MUGIRANEZA Abrahum', '0788536153', NULL, 'MUTEGARUGORI Bernadette', '0789361318', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269392,\"NIZEYIMANA\",\"Bertin\",\"Male\",2006,\"MUGIRANEZA Abrahum\",788536153,\"\",\"MUTEGARUGORI Bernadette\",789361318,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Musanze\",\"Cyabagarura\",\"Gaturo\"]', 'S2', '2025-2026', '040080030', NULL),
(31, '040080031', 8, 'NIZEYIMENA', 'BERTIN', 'Male', 2005, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Cyabagarura', 'Bukane', 'MUGIRANEZA ABRAHAM', '0788536153', NULL, 'MUTEGARUGORI BERNADETTE', '0789361318', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[20252665816,\"NIZEYIMENA\",\"BERTIN\",\"M\",38358,\"MUGIRANEZA ABRAHAM\",788536153,\"\",\"MUTEGARUGORI BERNADETTE\",789361318,\"\",\"\",\"North\",\"Musanze\",\"Musanze\",\"Cyabagarura\",\"Bukane\"]', 'S2', '2025-2026', '040080031', NULL),
(32, '040080032', 8, 'UMURERWA', 'Agape', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387012', NULL, NULL, NULL, NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269396,\"UMURERWA\",\"Agape\",\"Female\",\"\",\"\",789387012,\"\",\"\",7362376680,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'S2', '2025-2026', '040080032', NULL),
(33, '040080033', 8, 'IMANISHIMWE', 'Xavio', 'Male', 2006, 'Rwandan', 'North', 'Musanze', 'Nyarubande', 'rwebeya', 'Nyarubande', 'BITONDERUBUSA Jean', '0788223827', NULL, 'MUKESHIMANA Beatha', '0785116318', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269368,\"IMANISHIMWE\",\"Xavio\",\"Male\",2006,\"BITONDERUBUSA Jean\",788223827,\"\",\"MUKESHIMANA Beatha\",785116318,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Nyarubande\",\"rwebeya\",\"Nyarubande\"]', 'S2', '2025-2026', '040080033', NULL),
(34, '040080034', 8, 'KANYANA', 'Kenia', 'Female', 2007, 'Rwandan', 'Kigali', 'kicukiro', 'Masaka', 'Kabuga', 'Kabeza', 'BIZIMANA Alphonse', '0789387011', 'bazimyaa@gmail.com', 'NYIRABEZA Perprtue', '0788258853', 'nyirabezaperpetua@gmail.com', '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269372,\"KANYANA\",\"Kenia\",\"Female\",2007,\"BIZIMANA Alphonse\",789387011,\"bazimyaa@gmail.com\",\"NYIRABEZA Perprtue\",788258853,\"nyirabezaperpetua@gmail.com\",\"Rwandan\",\"kigali city\",\"kicukiro\",\"Masaka\",\"Kabuga\",\"Kabeza\"]', 'S2', '2025-2026', '040080034', NULL),
(35, '040080035', 8, 'KANZIRA', 'Abigael', 'Female', 2005, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Mpenge', 'Gikwege', 'Matabaro Mporana Jonas', '0788539578', NULL, 'Nantebuka Anne', '0780321240', NULL, '2026-03-22 20:25:59', '2026-03-22 20:25:59', '[]', '[202526269376,\"KANZIRA\",\"Abigael\",\"Female\",2005,\"Matabaro Mporana Jonas\",788539578,\"\",\"Nantebuka Anne\",780321240,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Muhoza\",\"Mpenge\",\"Gikwege\"]', 'S2', '2025-2026', '040080035', NULL),
(36, '040030001', 6, 'Feza', 'Esther', 'Female', 2007, 'Rwandan', 'Kigali City', 'Gasabo', 'Remera', 'Nyabisindu', 'Nyabisindu', 'Mugabo Irene', '0796898894', NULL, 'Maneza Aline', '0798567456', NULL, '2026-03-23 16:31:18', '2026-03-25 13:25:37', NULL, NULL, 'P2', '2025-2026', '040030001', '2025003454'),
(37, '040030002', 3, 'Teta', 'Christella', 'Female', 2016, 'Rwandan', 'Kigali City', 'Gasabo', 'Rusororo', 'Nyagahinga', 'Nyarucundura', 'Mugabo Irene', '0796898894', NULL, 'Maneza Aline', '0799889989', NULL, '2026-03-23 16:44:57', '2026-03-23 16:44:57', NULL, NULL, 'P2', '2025-2026', '040030002', NULL),
(71, '040030003', 3, 'Mahoro', 'Alice', 'Female', 2020, 'Rwandan', 'Northern Province', 'Gakenke', 'Nemba', 'Buranga', 'Butare', 'KARACYE Evode', '0790786709', NULL, 'MARITA Aneth', '0789090909', NULL, '2026-03-23 18:31:55', '2026-03-23 18:31:55', NULL, NULL, 'P1', '2025-2026', '040030003', NULL),
(72, '040030004', 3, 'Manzi Ineza', 'Karebu', 'Male', 2019, 'Rwandan', 'Northern Province', 'Gakenke', 'Muyongwe', 'Bumba', 'Gitwe', 'KARACYE Evode', '0789090909', NULL, 'MARITA Aneth', '0798090909', NULL, '2026-03-23 18:47:02', '2026-03-23 18:47:02', NULL, NULL, 'P1', '2025-2026', '040030004', NULL),
(73, '040030005', 3, 'IRADUKUNDA', 'Ange Pascaline', 'Female', 2007, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Ruhengeli', 'Burera', 'uwiragiye Clement', '0788823273', NULL, 'iyakaremye M. Faina', '0788478648', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526266468,\"IRADUKUNDA\",\"Ange Pascaline\",\"Female\",2007,\"uwiragiye Clement\",788823273,\"\",\"iyakaremye M. Faina\",788478648,\"\",\"Rwandan\",\"North\",\"Musanze\",\"Muhoza\",\"Ruhengeli\",\"Burera\"]', 'P3', '2025-2026', '040030005', NULL),
(74, '040030006', 3, 'MUGWANEZA', 'Iyabes', NULL, 2004, 'Rwandan', 'South', 'NYANZA', 'KIGOMA', 'MURINJA', 'AKINTARE', 'BIZIMANA Jeadedie', '0722740517', NULL, 'NYICUMI Goltha', '0788275628', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269460,\"MUGWANEZA\",\"Iyabes\",\"DUHIRWE KAGABO MUNANA\",2004,\"BIZIMANA Jeadedie\",722740517,\"\",\"NYICUMI Goltha\",788275628,\"\",\"Rwandan\",\"South\",\"NYANZA\",\"KIGOMA\",\"MURINJA\",\"AKINTARE\"]', 'P3', '2025-2026', '040030006', NULL),
(75, '040030007', 3, 'SHIMWA', 'Grace Graine', 'Female', 2007, 'Rwandan', 'Kigali', 'GASABO', 'JALI', NULL, NULL, 'CYPRIEN', '0783551793', NULL, 'PERPETURE', '0785131123', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Cell\",\"Village\"]', '[202526266476,\"SHIMWA\",\"Grace Graine\",\"FEMALE\",2007,\"CYPRIEN\",783551793,\"\",\"PERPETURE\",785131123,\"\",\"Rwandan\",\"KIGALI\",\"GASABO\",\"JALI\",\"\",\"\"]', 'P3', '2025-2026', '040030007', NULL),
(76, '040030008', 3, 'TUMUKUNDE', 'Linker', 'Female', 2008, 'Rwandan', 'Kigali', 'NYARUGENGE', 'KIGALI', 'RURIBA', NULL, 'ngamije', '0788457962', NULL, 'Gloria', '0788351921', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Village\"]', '[202526266480,\"TUMUKUNDE\",\"Linker\",\"Female\",2008,\"ngamije\",788457962,\"\",\"Gloria\",788351921,\"\",\"Rwandan\",\"KIGALI\",\"NYARUGENGE\",\"KIGALI\",\"RURIBA\",\"\"]', 'P3', '2025-2026', '040030008', NULL),
(77, '040030009', 3, 'UMUHOZA', 'Micheline', 'Female', 2005, 'Rwandan', 'North', 'Burera', 'kivuye', 'Bukwashuri', 'Buhita', 'Maniraguha micheli', '0789917958', NULL, 'Mukasafari marie luise', '0783162958', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526266488,\"UMUHOZA\",\"Micheline\",\"female\",2005,\"Maniraguha micheli\",789917958,\"\",\"Mukasafari marie luise\",783162958,\"\",\"Rwandan\",\"north\",\"Burera\",\"kivuye\",\"Bukwashuri\",\"Buhita\"]', 'P3', '2025-2026', '040030009', NULL),
(78, '040030010', 3, 'UWERA TUYISHIMIRE', 'Daniella', 'Female', 2006, 'Rwandan', 'North', 'Gakenke', 'Ruli', 'Gikingo', 'Rumasa', 'Nsanzimana Epa Phorodite', '0785700907', NULL, 'Uwera Mukareta Beatrice', '0785074193', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526266484,\"UWERA TUYISHIMIRE\",\"Daniella\",\"female\",2006,\"Nsanzimana Epa Phorodite\",785700907,\"\",\"Uwera Mukareta Beatrice\",785074193,\"\",\"Rwandan\",\"North\",\"Gakenke\",\"Ruli\",\"Gikingo\",\"Rumasa\"]', 'P3', '2025-2026', '040030010', NULL),
(79, '040030011', 3, 'UWIMANA', 'Marie Claire', 'Female', 2006, 'Rwandan', 'Kigali', 'kicukiro', 'NYARUGUNGA', 'kamashashi', 'uruhongore', NULL, NULL, NULL, 'UMWALI ROSE', '0798600056', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526266492,\"UWIMANA\",\"Marie Claire\",\"female\",2006,\"\",\"\",\"\",\"UMWALI ROSE\",798600056,\"\",\"Rwandan\",\"kigali\",\"kicukiro\",\"NYARUGUNGA\",\"kamashashi\",\"uruhongore\"]', 'P3', '2025-2026', '040030011', NULL),
(80, '040030012', 3, 'Cadette', 'Sandrine', 'Female', 2005, 'Rwandan', 'East', 'Bugesera', 'Mayange', 'Kabeza', 'Kibirizi', 'Twagirimana Theoneste', '0788633129', NULL, 'Tugirumurinda Therese', '0783088593', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269272,\"Cadette\",\"Sandrine\",\"Female\",2005,\"Twagirimana Theoneste\",788633129,\"\",\"Tugirumurinda Therese\",783088593,\"\",\"Rwandan\",\"Eastern\",\"Bugesera\",\"Mayange\",\"Kabeza\",\"Kibirizi\"]', 'P3', '2025-2026', '040030012', NULL),
(81, '040030013', 3, 'HIRWA UMUNYANA', 'Benita', 'Female', 2007, 'Rwandan', 'Kigali', 'Kicukiro', 'Kanombe', 'Rubirizi', 'Beninka', 'Twahirwa Theogene', '0782466295', 'tteo104@gmail.com', 'Niyonambaza Aline', '0788559621', 'niyonambaaline@', '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269276,\"HIRWA UMUNYANA\",\"Benita\",\"Female\",2007,\"Twahirwa Theogene\",782466295,\"tteo104@gmail.com\",\"Niyonambaza Aline\",788559621,\"niyonambaaline@\",\"Rwandan\",\"Kigali city\",\"Kicukiro\",\"Kanombe\",\"Rubirizi\",\"Beninka\"]', 'P3', '2025-2026', '040030013', NULL),
(82, '040030014', 3, 'MUSHIMIYIMANA', 'Jimmy', 'Male', 2008, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Kivumu', 'Ubukerarugendo', 'Mporwiki narcise', '0785719204', NULL, 'Uzamukunda Cartas', '0790027126', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269280,\"MUSHIMIYIMANA\",\"Jimmy\",\"Male\",2008,\"Mporwiki narcise\",785719204,\"\",\"Uzamukunda Cartas\",790027126,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Kivumu\",\"Ubukerarugendo\"]', 'P3', '2025-2026', '040030014', NULL),
(83, '040030015', 3, 'NIYOGISUBIZO', 'Gaston', 'Male', 2005, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Rwambogo', 'gakoro', 'HAKIZIMANA Anastase', '0783552273', NULL, 'NIYONSABA Emmaculee\'', '0782539558', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269284,\"NIYOGISUBIZO\",\"Gaston\",\"male\",2005,\"HAKIZIMANA Anastase\",783552273,\"\",\"NIYONSABA Emmaculee\'\",782539558,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Musanze\",\"Rwambogo\",\"gakoro\"]', 'P3', '2025-2026', '040030015', NULL),
(84, '040030016', 3, 'MURANGIRA', 'Adiru', 'Male', 2007, 'Rwandan', 'Kigali', 'kicukiro', 'kicukiro', 'kicukiro', 'Rwinanka', 'Murangira Fazil', '0788784098', NULL, 'Mukase Chadia', '0788784098', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269356,\"MURANGIRA\",\"Adiru\",\"Male\",2007,\"Murangira Fazil\",788784098,\"\",\"Mukase Chadia\",788784098,\"\",\"Rwandan\",\"Kigali city\",\"kicukiro\",\"kicukiro\",\"kicukiro\",\"Rwinanka\"]', 'P3', '2025-2026', '040030016', NULL),
(85, '040030017', 3, 'SHEMA', 'Charles', 'Male', 2007, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Amataba', 'bugoyi', 'Gasana damascene', '0788558382', NULL, 'Mukashyaka ngabo', '0788265818', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269360,\"SHEMA\",\"Charles\",\"Male\",2007,\"Gasana damascene\",788558382,\"\",\"Mukashyaka ngabo\",788265818,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Amataba\",\"bugoyi\"]', 'P3', '2025-2026', '040030017', NULL),
(86, '040030018', 3, 'ISANGE', 'Placide', 'Male', 2008, 'Rwandan', 'North', 'Burera', 'cyanika', 'nkiliza', 'cyidaho', 'NDABANANIYE Janvier', '0788424789', NULL, 'NDIMUBANDI Emmeraude', '0788606955', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269288,\"ISANGE\",\"Placide\",\"Male\",2008,\"NDABANANIYE Janvier\",788424789,\"\",\"NDIMUBANDI Emmeraude\",788606955,\"\",\"Rwandan\",\"Northern\",\"Burera\",\"cyanika\",\"nkiliza\",\"cyidaho\"]', 'P3', '2025-2026', '040030018', NULL),
(87, '040030019', 3, 'Mugisha', 'Kenny Frank', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387011', NULL, NULL, '0736137668', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269292,\"Mugisha\",\"Kenny Frank\",\"Male\",\"\",\"\",789387011,\"\",\"\",736137668,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P3', '2025-2026', '040030019', NULL),
(88, '040030020', 3, 'DUSENGIMANA', 'Olivier', 'Male', 2005, 'Rwandan', 'North', 'Burera', 'kinoni', 'nkenke', 'kigina', 'Turinumukiza john', '0789387012', 'olivierdusengimana31@gmail.com', 'nyirantungane candide', '0736276680', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269304,\"DUSENGIMANA\",\"Olivier\",\"Male\",2005,\"Turinumukiza john\",789387012,\"olivierdusengimana31@gmail.com\",\"nyirantungane candide\",736276680,\"\",\"Rwandan\",\"Northern\",\"Burera\",\"kinoni\",\"nkenke\",\"kigina\"]', 'P3', '2025-2026', '040030020', NULL),
(89, '040030021', 3, 'MUGISHA', 'Obed', 'Male', 2005, 'Rwandan', NULL, NULL, NULL, NULL, NULL, 'Gatera Pascal', NULL, NULL, 'Mukamurigo illumine', '0788411306', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269308,\"MUGISHA\",\"Obed\",\"Male\",2005,\"Gatera Pascal\",\"\",\"\",\"Mukamurigo illumine\",788411306,\"\",\"Rwandan\",\"\",\"\",\"\",\"\",\"\"]', 'P3', '2025-2026', '040030021', NULL),
(90, '040030022', 3, 'URAYENEZA', 'Nabil Saidi', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387012', NULL, NULL, NULL, NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269312,\"URAYENEZA\",\"Nabil Saidi\",\"Male\",\"\",\"\",789387012,\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P3', '2025-2026', '040030022', NULL),
(91, '040030023', 3, 'IYAKARE KALINDA', 'Liza', 'Female', 2006, 'Rwandan', 'Kigali', 'Gasabo', 'Kibagabaga', 'Kibagabaga', NULL, 'KALINDA Heritier', '0788617976', NULL, 'MUKASHYAKA Marie Claire', '0788759262', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Village\"]', '[202526269316,\"IYAKARE KALINDA\",\"Liza\",\"Female\",2006,\"KALINDA Heritier\",788617976,\"\",\"MUKASHYAKA Marie Claire\",788759262,\"\",\"Rwandan\",\"kigali city\",\"Gasabo\",\"Kibagabaga\",\"Kibagabaga\",\"\"]', 'P3', '2025-2026', '040030023', NULL),
(92, '040030024', 3, 'JABO MAKOMA', 'Rock', 'Male', 2008, 'Rwandan', 'Kigali', 'kicukiro', 'Nyarugunga', NULL, NULL, 'NOHELI Sam', '0788635907', 'sambensolo@gmail.com', 'TUYIZERE Petronille', '0736107668', 'tuyipety@gmail.com', '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Cell\",\"Village\"]', '[202526269320,\"JABO MAKOMA\",\"Rock\",\"Male\",2008,\"NOHELI Sam\",788635907,\"sambensolo@gmail.com\",\"TUYIZERE Petronille\",736107668,\"tuyipety@gmail.com\",\"Rwandan\",\"kigali city\",\"kicukiro\",\"Nyarugunga\",\"\",\"\"]', 'P3', '2025-2026', '040030024', NULL),
(93, '040030025', 3, 'KWIZERA NTWARI', 'Jyvan', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387011', NULL, NULL, '0736107668', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269324,\"KWIZERA NTWARI\",\"Jyvan\",\"Male\",\"\",\"\",789387011,\"\",\"\",736107668,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P3', '2025-2026', '040030025', NULL),
(94, '040030026', 3, 'MANZI', 'Benjamin', 'Male', 2008, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Ruhengeri', 'Muhe', 'MUNYANEZA Methode', '0785582700', NULL, 'MUTAMURIZA Liberatha', '0788415830', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269328,\"MANZI\",\"Benjamin\",\"Male\",2008,\"MUNYANEZA Methode\",785582700,\"\",\"MUTAMURIZA Liberatha\",788415830,\"\",\"Rwandan\",\"Nothern\",\"Musanze\",\"Muhoza\",\"Ruhengeri\",\"Muhe\"]', 'P3', '2025-2026', '040030026', NULL),
(95, '040030027', 3, 'MAOMBI', 'Patrick', 'Male', 2005, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Kivumu', 'Urumuri', 'Mbanziriza Aphrodis', '0788668288', NULL, 'Murekatete Meghan', '0783708041', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269332,\"MAOMBI\",\"Patrick\",\"Male\",2005,\"Mbanziriza Aphrodis\",788668288,\"\",\"Murekatete Meghan\",783708041,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Kivumu\",\"Urumuri\"]', 'P3', '2025-2026', '040030027', NULL),
(96, '040030028', 3, 'NIWEMUGENI', 'ISABELLE', 'Female', 2002, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Nengo', 'Urubyiruko', 'BAJENEZA JEAN PAUL', '0788451571', NULL, 'MUKABAGARA VEREN', '0783801088', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[20252666796,\"NIWEMUGENI\",\"ISABELLE\",\"F\",37338,\"BAJENEZA JEAN PAUL\",788451571,\"\",\"MUKABAGARA VEREN\",783801088,\"\",\"\",\"West\",\"Rubavu\",\"Gisenyi\",\"Nengo\",\"Urubyiruko\"]', 'P3', '2025-2026', '040030028', NULL),
(97, '040030029', 3, 'NIWEMUGENI', 'Isabelle', 'Female', 2004, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Ntengo', 'Urubyiruko', 'Bajeneza jean paul', '0788451571', NULL, 'Mukantagara verena', '0783801088', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269336,\"NIWEMUGENI\",\"Isabelle\",\"Female\",2004,\"Bajeneza jean paul\",788451571,\"\",\"Mukantagara verena\",783801088,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Ntengo\",\"Urubyiruko\"]', 'P3', '2025-2026', '040030029', NULL),
(98, '040030030', 3, 'NTWARI', 'Davis', 'Male', 2006, 'Rwandan', 'Kigali', 'Gasabo', 'Rusororo', NULL, NULL, 'NDATSIKIRA GILBERT', '0788550156', NULL, 'UWIMANA NATACHA', '0788623723', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Cell\",\"Village\"]', '[202526269340,\"NTWARI\",\"Davis\",\"Male\",2006,\"NDATSIKIRA GILBERT\",788550156,\"\",\"UWIMANA NATACHA\",788623723,\"\",\"Rwandan\",\"Kigali\",\"Gasabo\",\"Rusororo\",\"\",\"\"]', 'P3', '2025-2026', '040030030', NULL),
(99, '040030031', 3, 'NGIRABAKUNZI', 'Thierry', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387011', NULL, NULL, '0736177668', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269388,\"NGIRABAKUNZI\",\"Thierry\",\"Male\",\"\",\"\",789387011,\"\",\"\",736177668,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P3', '2025-2026', '040030031', NULL),
(100, '040030032', 3, 'NIZEYIMANA', 'Bertin', 'Male', 2006, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Cyabagarura', 'Gaturo', 'MUGIRANEZA Abrahum', '0788536153', NULL, 'MUTEGARUGORI Bernadette', '0789361318', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269392,\"NIZEYIMANA\",\"Bertin\",\"Male\",2006,\"MUGIRANEZA Abrahum\",788536153,\"\",\"MUTEGARUGORI Bernadette\",789361318,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Musanze\",\"Cyabagarura\",\"Gaturo\"]', 'P3', '2025-2026', '040030032', NULL),
(101, '040030033', 3, 'NIZEYIMENA', 'BERTIN', 'Male', 2005, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Cyabagarura', 'Bukane', 'MUGIRANEZA ABRAHAM', '0788536153', NULL, 'MUTEGARUGORI BERNADETTE', '0789361318', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[20252665816,\"NIZEYIMENA\",\"BERTIN\",\"M\",38358,\"MUGIRANEZA ABRAHAM\",788536153,\"\",\"MUTEGARUGORI BERNADETTE\",789361318,\"\",\"\",\"North\",\"Musanze\",\"Musanze\",\"Cyabagarura\",\"Bukane\"]', 'P3', '2025-2026', '040030033', NULL),
(102, '040030034', 3, 'UMURERWA', 'Agape', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387012', NULL, NULL, NULL, NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269396,\"UMURERWA\",\"Agape\",\"Female\",\"\",\"\",789387012,\"\",\"\",7362376680,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P3', '2025-2026', '040030034', NULL),
(103, '040030035', 3, 'IMANISHIMWE', 'Xavio', 'Male', 2006, 'Rwandan', 'North', 'Musanze', 'Nyarubande', 'rwebeya', 'Nyarubande', 'BITONDERUBUSA Jean', '0788223827', NULL, 'MUKESHIMANA Beatha', '0785116318', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269368,\"IMANISHIMWE\",\"Xavio\",\"Male\",2006,\"BITONDERUBUSA Jean\",788223827,\"\",\"MUKESHIMANA Beatha\",785116318,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Nyarubande\",\"rwebeya\",\"Nyarubande\"]', 'P3', '2025-2026', '040030035', NULL),
(104, '040030036', 3, 'KANYANA', 'Kenia', 'Female', 2007, 'Rwandan', 'Kigali', 'kicukiro', 'Masaka', 'Kabuga', 'Kabeza', 'BIZIMANA Alphonse', '0789387011', 'bazimyaa@gmail.com', 'NYIRABEZA Perprtue', '0788258853', 'nyirabezaperpetua@gmail.com', '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269372,\"KANYANA\",\"Kenia\",\"Female\",2007,\"BIZIMANA Alphonse\",789387011,\"bazimyaa@gmail.com\",\"NYIRABEZA Perprtue\",788258853,\"nyirabezaperpetua@gmail.com\",\"Rwandan\",\"kigali city\",\"kicukiro\",\"Masaka\",\"Kabuga\",\"Kabeza\"]', 'P3', '2025-2026', '040030036', NULL),
(105, '040030037', 3, 'KANZIRA', 'Abigael', 'Female', 2005, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Mpenge', 'Gikwege', 'Matabaro Mporana Jonas', '0788539578', NULL, 'Nantebuka Anne', '0780321240', NULL, '2026-03-25 07:34:51', '2026-03-25 07:34:51', '[]', '[202526269376,\"KANZIRA\",\"Abigael\",\"Female\",2005,\"Matabaro Mporana Jonas\",788539578,\"\",\"Nantebuka Anne\",780321240,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Muhoza\",\"Mpenge\",\"Gikwege\"]', 'P3', '2025-2026', '040030037', NULL),
(106, '040030038', 3, 'IRADUKUNDA', 'Ange Pascaline', 'Female', 2007, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Ruhengeli', 'Burera', 'uwiragiye Clement', '0788823273', NULL, 'iyakaremye M. Faina', '0788478648', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526266468,\"IRADUKUNDA\",\"Ange Pascaline\",\"Female\",2007,\"uwiragiye Clement\",788823273,\"\",\"iyakaremye M. Faina\",788478648,\"\",\"Rwandan\",\"North\",\"Musanze\",\"Muhoza\",\"Ruhengeli\",\"Burera\"]', 'P6', '2025-2026', '040030038', NULL),
(107, '040030039', 3, 'MUGWANEZA', 'Iyabes', 'Female', 2004, 'Rwandan', 'South', 'NYANZA', 'KIGOMA', 'MURINJA', 'AKINTARE', 'BIZIMANA Jeadedie', '0722740517', NULL, 'NYICUMI Goltha', '0788275628', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269460,\"MUGWANEZA\",\"Iyabes\",\"Female\",2004,\"BIZIMANA Jeadedie\",722740517,\"\",\"NYICUMI Goltha\",788275628,\"\",\"Rwandan\",\"South\",\"NYANZA\",\"KIGOMA\",\"MURINJA\",\"AKINTARE\"]', 'P6', '2025-2026', '040030039', NULL),
(108, '040030040', 3, 'SHIMWA', 'Grace Graine', 'Female', 2007, 'Rwandan', 'Kigali', 'GASABO', 'JALI', NULL, NULL, 'CYPRIEN', '0783551793', NULL, 'PERPETURE', '0785131123', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Cell\",\"Village\"]', '[202526266476,\"SHIMWA\",\"Grace Graine\",\"FEMALE\",2007,\"CYPRIEN\",783551793,\"\",\"PERPETURE\",785131123,\"\",\"Rwandan\",\"KIGALI\",\"GASABO\",\"JALI\",\"\",\"\"]', 'P6', '2025-2026', '040030040', NULL),
(109, '040030041', 3, 'TUMUKUNDE', 'Linker', 'Female', 2008, 'Rwandan', 'Kigali', 'NYARUGENGE', 'KIGALI', 'RURIBA', NULL, 'ngamije', '0788457962', NULL, 'Gloria', '0788351921', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Village\"]', '[202526266480,\"TUMUKUNDE\",\"Linker\",\"Female\",2008,\"ngamije\",788457962,\"\",\"Gloria\",788351921,\"\",\"Rwandan\",\"KIGALI\",\"NYARUGENGE\",\"KIGALI\",\"RURIBA\",\"\"]', 'P6', '2025-2026', '040030041', NULL),
(110, '040030042', 3, 'UMUHOZA', 'Micheline', 'Female', 2005, 'Rwandan', 'North', 'Burera', 'kivuye', 'Bukwashuri', 'Buhita', 'Maniraguha micheli', '0789917958', NULL, 'Mukasafari marie luise', '0783162958', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526266488,\"UMUHOZA\",\"Micheline\",\"female\",2005,\"Maniraguha micheli\",789917958,\"\",\"Mukasafari marie luise\",783162958,\"\",\"Rwandan\",\"north\",\"Burera\",\"kivuye\",\"Bukwashuri\",\"Buhita\"]', 'P6', '2025-2026', '040030042', NULL),
(111, '040030043', 3, 'UWERA TUYISHIMIRE', 'Daniella', 'Female', 2006, 'Rwandan', 'North', 'Gakenke', 'Ruli', 'Gikingo', 'Rumasa', 'Nsanzimana Epa Phorodite', '0785700907', NULL, 'Uwera Mukareta Beatrice', '0785074193', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526266484,\"UWERA TUYISHIMIRE\",\"Daniella\",\"female\",2006,\"Nsanzimana Epa Phorodite\",785700907,\"\",\"Uwera Mukareta Beatrice\",785074193,\"\",\"Rwandan\",\"North\",\"Gakenke\",\"Ruli\",\"Gikingo\",\"Rumasa\"]', 'P6', '2025-2026', '040030043', NULL),
(112, '040030044', 3, 'UWIMANA', 'Marie Claire', 'Female', 2006, 'Rwandan', 'Kigali', 'kicukiro', 'NYARUGUNGA', 'kamashashi', 'uruhongore', NULL, NULL, NULL, 'UMWALI ROSE', '0798600056', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526266492,\"UWIMANA\",\"Marie Claire\",\"female\",2006,\"\",\"\",\"\",\"UMWALI ROSE\",798600056,\"\",\"Rwandan\",\"kigali\",\"kicukiro\",\"NYARUGUNGA\",\"kamashashi\",\"uruhongore\"]', 'P6', '2025-2026', '040030044', NULL),
(113, '040030045', 3, 'Cadette', 'Sandrine', 'Female', 2005, 'Rwandan', 'East', 'Bugesera', 'Mayange', 'Kabeza', 'Kibirizi', 'Twagirimana Theoneste', '0788633129', NULL, 'Tugirumurinda Therese', '0783088593', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269272,\"Cadette\",\"Sandrine\",\"Female\",2005,\"Twagirimana Theoneste\",788633129,\"\",\"Tugirumurinda Therese\",783088593,\"\",\"Rwandan\",\"Eastern\",\"Bugesera\",\"Mayange\",\"Kabeza\",\"Kibirizi\"]', 'P6', '2025-2026', '040030045', NULL),
(114, '040030046', 3, 'HIRWA UMUNYANA', 'Benita', 'Female', 2007, 'Rwandan', 'Kigali', 'Kicukiro', 'Kanombe', 'Rubirizi', 'Beninka', 'Twahirwa Theogene', '0782466295', 'tteo104@gmail.com', 'Niyonambaza Aline', '0788559621', 'niyonambaaline@', '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269276,\"HIRWA UMUNYANA\",\"Benita\",\"Female\",2007,\"Twahirwa Theogene\",782466295,\"tteo104@gmail.com\",\"Niyonambaza Aline\",788559621,\"niyonambaaline@\",\"Rwandan\",\"Kigali city\",\"Kicukiro\",\"Kanombe\",\"Rubirizi\",\"Beninka\"]', 'P6', '2025-2026', '040030046', NULL),
(115, '040030047', 3, 'MUSHIMIYIMANA', 'Jimmy', 'Male', 2008, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Kivumu', 'Ubukerarugendo', 'Mporwiki narcise', '0785719204', NULL, 'Uzamukunda Cartas', '0790027126', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269280,\"MUSHIMIYIMANA\",\"Jimmy\",\"Male\",2008,\"Mporwiki narcise\",785719204,\"\",\"Uzamukunda Cartas\",790027126,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Kivumu\",\"Ubukerarugendo\"]', 'P6', '2025-2026', '040030047', NULL),
(116, '040030048', 3, 'NIYOGISUBIZO', 'Gaston', 'Male', 2005, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Rwambogo', 'gakoro', 'HAKIZIMANA Anastase', '0783552273', NULL, 'NIYONSABA Emmaculee\'', '0782539558', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269284,\"NIYOGISUBIZO\",\"Gaston\",\"male\",2005,\"HAKIZIMANA Anastase\",783552273,\"\",\"NIYONSABA Emmaculee\'\",782539558,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Musanze\",\"Rwambogo\",\"gakoro\"]', 'P6', '2025-2026', '040030048', NULL),
(117, '040030049', 3, 'MURANGIRA', 'Adiru', 'Male', 2007, 'Rwandan', 'Kigali', 'kicukiro', 'kicukiro', 'kicukiro', 'Rwinanka', 'Murangira Fazil', '0788784098', NULL, 'Mukase Chadia', '0788784098', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269356,\"MURANGIRA\",\"Adiru\",\"Male\",2007,\"Murangira Fazil\",788784098,\"\",\"Mukase Chadia\",788784098,\"\",\"Rwandan\",\"Kigali city\",\"kicukiro\",\"kicukiro\",\"kicukiro\",\"Rwinanka\"]', 'P6', '2025-2026', '040030049', NULL),
(118, '040030050', 3, 'SHEMA', 'Charles', 'Male', 2007, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Amataba', 'bugoyi', 'Gasana damascene', '0788558382', NULL, 'Mukashyaka ngabo', '0788265818', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269360,\"SHEMA\",\"Charles\",\"Male\",2007,\"Gasana damascene\",788558382,\"\",\"Mukashyaka ngabo\",788265818,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Amataba\",\"bugoyi\"]', 'P6', '2025-2026', '040030050', NULL),
(119, '040030051', 3, 'ISANGE', 'Placide', 'Male', 2008, 'Rwandan', 'North', 'Burera', 'cyanika', 'nkiliza', 'cyidaho', 'NDABANANIYE Janvier', '0788424789', NULL, 'NDIMUBANDI Emmeraude', '0788606955', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269288,\"ISANGE\",\"Placide\",\"Male\",2008,\"NDABANANIYE Janvier\",788424789,\"\",\"NDIMUBANDI Emmeraude\",788606955,\"\",\"Rwandan\",\"Northern\",\"Burera\",\"cyanika\",\"nkiliza\",\"cyidaho\"]', 'P6', '2025-2026', '040030051', NULL),
(120, '040030052', 3, 'Mugisha', 'Kenny Frank', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387011', NULL, NULL, '0736137668', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269292,\"Mugisha\",\"Kenny Frank\",\"Male\",\"\",\"\",789387011,\"\",\"\",736137668,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P6', '2025-2026', '040030052', NULL),
(121, '040030053', 3, 'DUSENGIMANA', 'Olivier', 'Male', 2005, 'Rwandan', 'North', 'Burera', 'kinoni', 'nkenke', 'kigina', 'Turinumukiza john', '0789387012', 'olivierdusengimana31@gmail.com', 'nyirantungane candide', '0736276680', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269304,\"DUSENGIMANA\",\"Olivier\",\"Male\",2005,\"Turinumukiza john\",789387012,\"olivierdusengimana31@gmail.com\",\"nyirantungane candide\",736276680,\"\",\"Rwandan\",\"Northern\",\"Burera\",\"kinoni\",\"nkenke\",\"kigina\"]', 'P6', '2025-2026', '040030053', NULL),
(122, '040030054', 3, 'MUGISHA', 'Obed', 'Male', 2005, 'Rwandan', NULL, NULL, NULL, NULL, NULL, 'Gatera Pascal', NULL, NULL, 'Mukamurigo illumine', '0788411306', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269308,\"MUGISHA\",\"Obed\",\"Male\",2005,\"Gatera Pascal\",\"\",\"\",\"Mukamurigo illumine\",788411306,\"\",\"Rwandan\",\"\",\"\",\"\",\"\",\"\"]', 'P6', '2025-2026', '040030054', NULL),
(123, '040030055', 3, 'URAYENEZA', 'Nabil Saidi', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387012', NULL, NULL, NULL, NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269312,\"URAYENEZA\",\"Nabil Saidi\",\"Male\",\"\",\"\",789387012,\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P6', '2025-2026', '040030055', NULL),
(124, '040030056', 3, 'IYAKARE KALINDA', 'Liza', 'Female', 2006, 'Rwandan', 'Kigali', 'Gasabo', 'Kibagabaga', 'Kibagabaga', NULL, 'KALINDA Heritier', '0788617976', NULL, 'MUKASHYAKA Marie Claire', '0788759262', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Village\"]', '[202526269316,\"IYAKARE KALINDA\",\"Liza\",\"Female\",2006,\"KALINDA Heritier\",788617976,\"\",\"MUKASHYAKA Marie Claire\",788759262,\"\",\"Rwandan\",\"kigali city\",\"Gasabo\",\"Kibagabaga\",\"Kibagabaga\",\"\"]', 'P6', '2025-2026', '040030056', NULL),
(125, '040030057', 3, 'JABO MAKOMA', 'Rock', 'Male', 2008, 'Rwandan', 'Kigali', 'kicukiro', 'Nyarugunga', NULL, NULL, 'NOHELI Sam', '0788635907', 'sambensolo@gmail.com', 'TUYIZERE Petronille', '0736107668', 'tuyipety@gmail.com', '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Cell\",\"Village\"]', '[202526269320,\"JABO MAKOMA\",\"Rock\",\"Male\",2008,\"NOHELI Sam\",788635907,\"sambensolo@gmail.com\",\"TUYIZERE Petronille\",736107668,\"tuyipety@gmail.com\",\"Rwandan\",\"kigali city\",\"kicukiro\",\"Nyarugunga\",\"\",\"\"]', 'P6', '2025-2026', '040030057', NULL),
(126, '040030058', 3, 'KWIZERA NTWARI', 'Jyvan', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387011', NULL, NULL, '0736107668', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269324,\"KWIZERA NTWARI\",\"Jyvan\",\"Male\",\"\",\"\",789387011,\"\",\"\",736107668,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P6', '2025-2026', '040030058', NULL),
(127, '040030059', 3, 'MANZI', 'Benjamin', 'Male', 2008, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Ruhengeri', 'Muhe', 'MUNYANEZA Methode', '0785582700', NULL, 'MUTAMURIZA Liberatha', '0788415830', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269328,\"MANZI\",\"Benjamin\",\"Male\",2008,\"MUNYANEZA Methode\",785582700,\"\",\"MUTAMURIZA Liberatha\",788415830,\"\",\"Rwandan\",\"Nothern\",\"Musanze\",\"Muhoza\",\"Ruhengeri\",\"Muhe\"]', 'P6', '2025-2026', '040030059', NULL),
(128, '040030060', 3, 'MAOMBI', 'Patrick', 'Male', 2005, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Kivumu', 'Urumuri', 'Mbanziriza Aphrodis', '0788668288', NULL, 'Murekatete Meghan', '0783708041', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269332,\"MAOMBI\",\"Patrick\",\"Male\",2005,\"Mbanziriza Aphrodis\",788668288,\"\",\"Murekatete Meghan\",783708041,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Kivumu\",\"Urumuri\"]', 'P6', '2025-2026', '040030060', NULL),
(129, '040030061', 3, 'NIWEMUGENI', 'ISABELLE', 'Female', 2002, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Nengo', 'Urubyiruko', 'BAJENEZA JEAN PAUL', '0788451571', NULL, 'MUKABAGARA VEREN', '0783801088', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[20252666796,\"NIWEMUGENI\",\"ISABELLE\",\"F\",37338,\"BAJENEZA JEAN PAUL\",788451571,\"\",\"MUKABAGARA VEREN\",783801088,\"\",\"\",\"West\",\"Rubavu\",\"Gisenyi\",\"Nengo\",\"Urubyiruko\"]', 'P6', '2025-2026', '040030061', NULL),
(130, '040030062', 3, 'NIWEMUGENI', 'Isabelle', 'Female', 2004, 'Rwandan', 'West', 'Rubavu', 'Gisenyi', 'Ntengo', 'Urubyiruko', 'Bajeneza jean paul', '0788451571', NULL, 'Mukantagara verena', '0783801088', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269336,\"NIWEMUGENI\",\"Isabelle\",\"Female\",2004,\"Bajeneza jean paul\",788451571,\"\",\"Mukantagara verena\",783801088,\"\",\"Rwandan\",\"Western\",\"Rubavu\",\"Gisenyi\",\"Ntengo\",\"Urubyiruko\"]', 'P6', '2025-2026', '040030062', NULL),
(131, '040030063', 3, 'NTWARI', 'Davis', 'Male', 2006, 'Rwandan', 'Kigali', 'Gasabo', 'Rusororo', NULL, NULL, 'NDATSIKIRA GILBERT', '0788550156', NULL, 'UWIMANA NATACHA', '0788623723', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Cell\",\"Village\"]', '[202526269340,\"NTWARI\",\"Davis\",\"Male\",2006,\"NDATSIKIRA GILBERT\",788550156,\"\",\"UWIMANA NATACHA\",788623723,\"\",\"Rwandan\",\"Kigali\",\"Gasabo\",\"Rusororo\",\"\",\"\"]', 'P6', '2025-2026', '040030063', NULL),
(132, '040030064', 3, 'NGIRABAKUNZI', 'Thierry', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387011', NULL, NULL, '0736177668', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269388,\"NGIRABAKUNZI\",\"Thierry\",\"Male\",\"\",\"\",789387011,\"\",\"\",736177668,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P6', '2025-2026', '040030064', NULL),
(133, '040030065', 3, 'NIZEYIMANA', 'Bertin', 'Male', 2006, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Cyabagarura', 'Gaturo', 'MUGIRANEZA Abrahum', '0788536153', NULL, 'MUTEGARUGORI Bernadette', '0789361318', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269392,\"NIZEYIMANA\",\"Bertin\",\"Male\",2006,\"MUGIRANEZA Abrahum\",788536153,\"\",\"MUTEGARUGORI Bernadette\",789361318,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Musanze\",\"Cyabagarura\",\"Gaturo\"]', 'P6', '2025-2026', '040030065', NULL),
(134, '040030066', 3, 'NIZEYIMENA', 'BERTIN', 'Male', 2005, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Cyabagarura', 'Bukane', 'MUGIRANEZA ABRAHAM', '0788536153', NULL, 'MUTEGARUGORI BERNADETTE', '0789361318', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[20252665816,\"NIZEYIMENA\",\"BERTIN\",\"M\",38358,\"MUGIRANEZA ABRAHAM\",788536153,\"\",\"MUTEGARUGORI BERNADETTE\",789361318,\"\",\"\",\"North\",\"Musanze\",\"Musanze\",\"Cyabagarura\",\"Bukane\"]', 'P6', '2025-2026', '040030066', NULL),
(135, '040030067', 3, 'UMURERWA', 'Agape', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789387012', NULL, NULL, NULL, NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[202526269396,\"UMURERWA\",\"Agape\",\"Female\",\"\",\"\",789387012,\"\",\"\",7362376680,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P6', '2025-2026', '040030067', NULL);
INSERT INTO `students` (`id`, `student_uid`, `school_id`, `first_name`, `last_name`, `gender`, `birth_year`, `nationality`, `province`, `district`, `sector`, `cell`, `village`, `father_full_name`, `father_phone`, `father_email`, `mother_full_name`, `mother_phone`, `mother_email`, `created_at`, `updated_at`, `import_missing_fields`, `source_row_json`, `class_name`, `academic_year`, `student_code`, `sdm_code`) VALUES
(136, '040030068', 3, 'IMANISHIMWE', 'Xavio', 'Male', 2006, 'Rwandan', 'North', 'Musanze', 'Nyarubande', 'rwebeya', 'Nyarubande', 'BITONDERUBUSA Jean', '0788223827', NULL, 'MUKESHIMANA Beatha', '0785116318', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269368,\"IMANISHIMWE\",\"Xavio\",\"Male\",2006,\"BITONDERUBUSA Jean\",788223827,\"\",\"MUKESHIMANA Beatha\",785116318,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Nyarubande\",\"rwebeya\",\"Nyarubande\"]', 'P6', '2025-2026', '040030068', NULL),
(137, '040030069', 3, 'KANYANA', 'Kenia', 'Female', 2007, 'Rwandan', 'Kigali', 'kicukiro', 'Masaka', 'Kabuga', 'Kabeza', 'BIZIMANA Alphonse', '0789387011', 'bazimyaa@gmail.com', 'NYIRABEZA Perprtue', '0788258853', 'nyirabezaperpetua@gmail.com', '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269372,\"KANYANA\",\"Kenia\",\"Female\",2007,\"BIZIMANA Alphonse\",789387011,\"bazimyaa@gmail.com\",\"NYIRABEZA Perprtue\",788258853,\"nyirabezaperpetua@gmail.com\",\"Rwandan\",\"kigali city\",\"kicukiro\",\"Masaka\",\"Kabuga\",\"Kabeza\"]', 'P6', '2025-2026', '040030069', NULL),
(138, '040030070', 3, 'KANZIRA', 'Abigael', 'Female', 2005, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Mpenge', 'Gikwege', 'Matabaro Mporana Jonas', '0788539578', NULL, 'Nantebuka Anne', '0780321240', NULL, '2026-03-25 12:23:35', '2026-03-25 12:23:35', '[]', '[202526269376,\"KANZIRA\",\"Abigael\",\"Female\",2005,\"Matabaro Mporana Jonas\",788539578,\"\",\"Nantebuka Anne\",780321240,\"\",\"Rwandan\",\"Northern\",\"Musanze\",\"Muhoza\",\"Mpenge\",\"Gikwege\"]', 'P6', '2025-2026', '040030070', NULL),
(139, '040060001', 6, 'CYIZA', 'Robert', 'Male', 2013, 'Rwandan', 'Eastern Province', 'Kayonza', 'Rukara', 'Rwimishinya', 'Karagari I', 'KARISA Claude', '0793245365', NULL, 'MUGENI Anisa', '0785463765', NULL, '2026-03-25 13:04:27', '2026-03-25 13:04:27', NULL, NULL, 'P6', '2025-2026', '040060001', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `student_requirements`
--

CREATE TABLE `student_requirements` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(300) NOT NULL,
  `default_price` decimal(12,2) DEFAULT NULL,
  `image_url` varchar(512) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `description` text DEFAULT NULL,
  `quantity` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_requirements`
--

INSERT INTO `student_requirements` (`id`, `name`, `default_price`, `image_url`, `created_at`, `updated_at`, `description`, `quantity`) VALUES
(1, 'Ream of paper', 5000.00, '/uploads/requirement-images/req-1774207198890-621875730.jpg', '2026-03-22 17:46:42', '2026-03-22 19:21:41', NULL, NULL),
(2, 'Files', 2500.00, '/uploads/requirement-images/req-1774207211581-349381163.jpg', '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(3, 'Bottle for drinking water', 3000.00, '/uploads/requirement-images/req-1774207219854-572755019.jpg', '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(4, 'School ID card', 2400.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(5, 'Communication book', 499.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(6, 'Colour pencils', 1000.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(7, 'Mathematical set', 1499.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(8, 'Pens', 199.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(9, 'Ruler', 299.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(10, 'Sharpener, pencils and rubber', 499.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(11, 'Paper glue', 1999.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(12, 'Calligraphy book', 399.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(13, 'Lined notebook', 400.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(14, 'Squared notebook', 499.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(15, 'Drawing book', 499.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(16, 'Registry', 1999.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(17, 'School bag', 4500.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(18, 'Uniform and sportswear', 14999.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL),
(19, 'Shoes and socks', 2500.00, NULL, '2026-03-22 17:46:42', '2026-03-22 19:21:42', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `student_transfer_logs`
--

CREATE TABLE `student_transfer_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `request_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `action` varchar(32) NOT NULL,
  `note` text DEFAULT NULL,
  `created_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_transfer_logs`
--

INSERT INTO `student_transfer_logs` (`id`, `request_id`, `school_id`, `action`, `note`, `created_by_user_id`, `created_at`) VALUES
(1, 1, 3, 'approved', NULL, 28, '2026-03-25 13:25:37');

-- --------------------------------------------------------

--
-- Table structure for table `student_transfer_notifications`
--

CREATE TABLE `student_transfer_notifications` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `request_id` int(10) UNSIGNED NOT NULL,
  `notification_type` varchar(32) NOT NULL,
  `message` varchar(255) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_transfer_notifications`
--

INSERT INTO `student_transfer_notifications` (`id`, `school_id`, `request_id`, `notification_type`, `message`, `is_read`, `created_at`) VALUES
(1, 3, 1, 'approved', 'Transfer request approved. Student will be moved in your school.', 0, '2026-03-25 13:25:37'),
(2, 6, 1, 'approved', 'Your transfer request was approved.', 0, '2026-03-25 13:25:37');

-- --------------------------------------------------------

--
-- Table structure for table `student_transfer_requests`
--

CREATE TABLE `student_transfer_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id_from` int(10) UNSIGNED NOT NULL,
  `school_id_to` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `student_uid` varchar(50) NOT NULL,
  `student_code` varchar(15) DEFAULT NULL,
  `requested_by_user_id` int(10) UNSIGNED NOT NULL,
  `reason` text DEFAULT NULL,
  `notes_from_to_school` text DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `responded_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `notes_from_from_school` text DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_transfer_requests`
--

INSERT INTO `student_transfer_requests` (`id`, `school_id_from`, `school_id_to`, `student_id`, `student_uid`, `student_code`, `requested_by_user_id`, `reason`, `notes_from_to_school`, `status`, `responded_by_user_id`, `notes_from_from_school`, `approved_at`, `rejected_at`, `created_at`, `updated_at`) VALUES
(1, 3, 6, 36, '040030001', '040030001', 32, 'Family Reasons', NULL, 'approved', 28, NULL, '2026-03-25 13:25:36', NULL, '2026-03-25 13:17:32', '2026-03-25 13:25:37');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_uid` varchar(50) NOT NULL,
  `email` varchar(191) NOT NULL,
  `username` varchar(200) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `photo` varchar(500) DEFAULT NULL,
  `signature_url` varchar(500) DEFAULT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `sector` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  `locked_until` datetime DEFAULT NULL,
  `failed_login_attempts` int(11) NOT NULL DEFAULT 0,
  `force_password_change` tinyint(1) NOT NULL DEFAULT 0,
  `last_login` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `password_reset_token` varchar(100) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `district_assigned` varchar(100) DEFAULT NULL,
  `stamp_url` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `user_uid`, `email`, `username`, `phone`, `password_hash`, `first_name`, `last_name`, `photo`, `signature_url`, `role_id`, `school_id`, `district`, `province`, `sector`, `is_active`, `is_verified`, `is_locked`, `locked_until`, `failed_login_attempts`, `force_password_change`, `last_login`, `last_login_ip`, `password_reset_token`, `password_reset_expires`, `deleted_at`, `created_at`, `updated_at`, `district_assigned`, `stamp_url`) VALUES
(1, 'SA-706896305', 'ishimwetheo488@gmail.com', NULL, '+250798699601', '$2b$10$HBOIRb/fyVghQrzqSpIeIeFrcXRLfM3WI/zVKJgvD2b2ni6S0wyG2', 'Ishimwe', 'Theoneste', NULL, NULL, 1, NULL, NULL, NULL, NULL, 1, 1, 0, NULL, 0, 0, '2026-03-25 13:00:42', '::1', NULL, NULL, NULL, '2026-03-06 06:18:26', '2026-03-25 13:00:42', NULL, NULL),
(2, 'SM-164976921', 'gskayonza@gmail.com', 'gskayonza', NULL, '$2b$12$1RPngIx34Vr8zXIAuP3gVumktHuL7vJmVWJ0DqL3m5FB7.nfiGNHa', 'Kamana', 'Jean Claude', NULL, '/uploads/school_assets/school_3_asset_1772811527464.png', 2, 3, 'Kayonza', 'Eastern Province', 'Mukarange', 1, 1, 0, NULL, 0, 1, '2026-03-14 16:47:56', '::1', NULL, NULL, NULL, '2026-03-06 09:46:04', '2026-03-22 19:36:46', NULL, NULL),
(3, 'NESA-421573848', 'adminnesa@gmail.com', NULL, '+250788876340', '$2b$10$bVJAx4SMUpxDHLjFrl/NSeMUqaxLFwvgXg2ODg9lhPyIzwVhxc3lO', 'Fred Mahoro', 'Fred Mahoro', '/uploads/profile-photos/profile-3-1773580185465.jpg', NULL, 12, NULL, NULL, NULL, NULL, 1, 1, 0, NULL, 0, 0, '2026-03-18 07:43:39', '::1', NULL, NULL, NULL, '2026-03-06 10:40:21', '2026-03-18 07:43:39', NULL, NULL),
(4, 'DEO-577887982', 'deo@gasabo.com', NULL, '+250788876333', '$2b$10$FQa3sL6E/iPTK1EuhBb2xesX58Yv5xMuScrq020sjfcKcWAVnJtvi', 'Mutesi ', 'Scovia', '/uploads/profile-photos/profile-4-1773646206277.jpg', NULL, 13, NULL, 'Gasabo', 'Kigali City', NULL, 1, 1, 0, NULL, 0, 0, '2026-03-18 07:40:31', '::1', NULL, NULL, NULL, '2026-03-06 10:42:57', '2026-03-18 07:40:31', NULL, NULL),
(5, 'DEO-354506449', 'deo@kayonza.com', NULL, '+250798699655', '$2b$10$cd3dpZ8acEFSLez3TudFcO5hBZ1CUNLhZsohx91/2sEfJEWmEDXNe', 'Mahoro ', 'Alice', '/uploads/profile-photos/profile-5-1773587514499.jpg', NULL, 13, NULL, 'Kayonza', 'Eastern Province', NULL, 1, 1, 0, NULL, 1, 0, '2026-03-15 17:13:09', '::1', NULL, NULL, NULL, '2026-03-06 16:45:54', '2026-03-17 15:18:04', NULL, NULL),
(6, 'SM-106343277', 'uwijado92@gmail.com', 'gsgahini', NULL, '$2b$12$AHKKBe4.zDeUx8stNE5PU.NLzG6Yw0sSaBaRp1.7dla9qZfzIJ.FK', 'Kagabo', 'Jean Claude', '/uploads/profile-photos/profile-6-1773580047829.jpg', '/uploads/school_assets/school_4_asset_1772826434877.png', 2, 4, 'Kayonza', 'Eastern Province', 'Gahini', 0, 1, 0, NULL, 0, 1, '2026-03-15 08:43:22', '::1', NULL, NULL, NULL, '2026-03-06 20:51:46', '2026-03-22 15:11:32', NULL, NULL),
(7, 'SM-582302765', 'gskimisagara@gmail.com', 'gskimisagara', NULL, '$2b$12$MSNppOiAFwHQ4bCJ9b31mOAhHXDtWZ1kPy8/iOs46zijs23uce3B6', 'Umubyeyi', 'Esther', NULL, NULL, 2, 5, 'Nyarugenge', 'Kigali City', 'Kimisagara', 0, 1, 0, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, '2026-03-06 20:59:42', '2026-03-22 15:11:32', NULL, NULL),
(8, 'SM-659760560', 'gskabusunzu@gmail.com', 'gskabusunzu', NULL, '$2b$10$bM8.4LaDpDNGtADT4ABJheqlNl.wsBvZv2jknGx1dqFVR7d/CNlw2', 'Mutesi', 'Claudine', '/uploads/profile-photos/profile-8-1773555824664.jpg', '/uploads/school_assets/school_6_asset_1773313845660.png', 2, 6, 'Nyarugenge', 'Kigali City', 'Kimisagara', 1, 1, 0, NULL, 0, 1, '2026-03-15 08:19:02', '::1', NULL, NULL, NULL, '2026-03-12 13:07:39', '2026-03-25 13:00:57', NULL, NULL),
(9, 'DEO-104615816', 'deo@nyarugenge.com', NULL, '+250788756453', '$2b$10$aoI9jnc21s8Hw0Fa1gn7s.reXfIS0om4Sk3QkrVc4u2YCvrBKU7iC', 'Mahoro ', 'Alice', NULL, NULL, 13, NULL, 'Nyarugenge', 'Kigali City', NULL, 1, 1, 0, NULL, 0, 0, '2026-03-12 15:12:01', '::1', NULL, NULL, NULL, '2026-03-12 15:11:44', '2026-03-12 15:12:01', NULL, NULL),
(10, 'SM-558395967', 'gskimironko@gmail.com', 'gskimironko', NULL, '$2b$12$NAdNmiYQ8Ks1AUS9Siu/s.ECAxnZMU47IiLrI2MSZwT1j7HkUe4Q6', 'MAHORO', 'Christine', '/uploads/profile-photos/profile-10-1773759340842.jpg', '/uploads/school_assets/school_7_asset_1773644943479.png', 2, 7, 'Gasabo', 'Kigali City', 'Kimironko', 0, 1, 0, NULL, 0, 1, '2026-03-17 16:40:49', '::1', NULL, NULL, NULL, '2026-03-16 09:02:38', '2026-03-22 15:11:32', NULL, NULL),
(11, 'SM-276701960', 'manager@gmail.com', 'manager', NULL, '$2b$12$IZ4l..XkE249T45lUricpeZ3zfj9MHN10l1yLdVhwx7fLXd5zuzVe', 'Habimana', '-', NULL, '/uploads/school_assets/school_8_asset_1773773296141.png', 2, 8, 'Gasabo', 'Kigali City', 'Kacyiru', 1, 1, 0, NULL, 0, 1, '2026-03-17 20:31:51', '::1', NULL, NULL, NULL, '2026-03-17 20:31:16', '2026-03-22 17:24:30', NULL, NULL),
(12, 'SM-618177009', 'kacyiru@gmail.com', 'kacyiru', NULL, '$2b$12$vhSF6CwiebGhGsXc39vvIeq5qLsIs6EyR.XcKGCte8ZmdVO7C.H/u', 'Ishimwe', 'Theoneste', NULL, NULL, 2, 9, 'Gasabo', 'Kigali City', 'Kacyiru', 0, 1, 0, NULL, 0, 1, '2026-03-17 22:52:11', '::1', NULL, NULL, NULL, '2026-03-17 22:50:18', '2026-03-22 15:11:32', NULL, NULL),
(13, 'SM-793489834', 'kanombe@gmail.com', 'kanombe', NULL, '$2b$12$SV7Ym7ijnQA7DvlHDqOGrONl0i6RBc1NCVr0z45V5nfKSbo7IB0Vm', 'Kamazi', 'Janvier', NULL, NULL, 2, 10, 'Kicukiro', 'Kigali City', 'Kanombe', 0, 1, 0, NULL, 0, 1, '2026-03-17 23:10:07', '::1', NULL, NULL, NULL, '2026-03-17 23:09:53', '2026-03-22 15:11:32', NULL, NULL),
(14, 'SM-722345717', 'kinyinya@gmail.com', 'kinyinya', NULL, '$2b$12$P3PL60b3U6/m6H03pZ0/TeOsOFJJEvLe01XQuWJs7eoAV/YL3IOX.', 'Jeal', 'Paul Habineza', NULL, '/uploads/school_assets/school_11_asset_1773812289515.png', 2, 11, 'Gasabo', 'Kigali City', 'Kinyinya', 0, 1, 0, NULL, 0, 1, '2026-03-18 07:35:10', '::1', NULL, NULL, NULL, '2026-03-17 23:25:22', '2026-03-22 15:11:32', NULL, NULL),
(15, 'SM-985686591', 'gatsibo@gmail.com', 'gatsibo', NULL, '$2b$12$WGxwLwRw2odcipfFs/bvMeIOPO2OnqXE043NA5pxMQl1/iQOFlBAO', 'Karinganire', 'Paul', NULL, '/uploads/school_assets/school_12_asset_1773785168265.png', 2, 12, 'Gatsibo', 'Eastern Province', 'Gatsibo', 0, 1, 0, NULL, 0, 1, '2026-03-18 07:34:14', '::1', NULL, NULL, NULL, '2026-03-17 23:29:45', '2026-03-22 15:11:32', NULL, NULL),
(16, 'SM-874023176', 'mumena@gmail.com', 'mumena', NULL, '$2b$10$VpM3KaQY4yI1fZua2T1WmOkAfe6so69sRN6ujw/2CHMwLvk3ywc32', 'Karine', 'Esther', NULL, NULL, 2, 13, 'Nyarugenge', 'Kigali City', 'Nyamirambo', 0, 1, 0, NULL, 0, 0, '2026-03-18 12:18:12', '::1', NULL, NULL, NULL, '2026-03-18 12:14:34', '2026-03-22 15:11:32', NULL, NULL),
(17, 'SM-447121122', 'rwamagana@gmail.com', 'rwamagana', NULL, '$2b$10$ijBX3JWOkiGXd.2xa0TnLuewmeFn7zFgHrPXXVvpydKoYAVr29PzW', 'Karacye', 'Piere', NULL, NULL, 2, 14, 'Rwamagana', 'Eastern Province', 'Gishari', 0, 1, 0, NULL, 0, 0, '2026-03-18 14:26:24', '::1', NULL, NULL, NULL, '2026-03-18 14:20:47', '2026-03-22 15:11:32', NULL, NULL),
(18, 'SM-967744307', 'kirehe@gmail.com', 'kirehe', NULL, '$2b$10$nzjCn52xDVud7kDMoWW5X.o8APHvNF5c939YHwQxxo82ooUhurdoe', 'MWIZA', 'Ineza Centi', NULL, '/uploads/school_assets/school_15_asset_1773866997637.png', 2, 15, 'Kirehe', 'Eastern Province', 'Kirehe', 0, 1, 0, NULL, 0, 0, '2026-03-18 23:32:13', '::1', NULL, NULL, NULL, '2026-03-18 14:29:27', '2026-03-22 15:11:32', NULL, NULL),
(19, 'SM-486050152', 'kagarama@gmail.com', 'kagarama', NULL, '$2b$12$HbisIwokY7H3g1Xhml6HyedwdJL5yK79HtyRr5II0fwX9/rDHysfa', 'Mariza', 'Ineza Alice', NULL, NULL, 2, 16, 'Kicukiro', 'Kigali City', 'Kagarama', 0, 1, 0, NULL, 0, 1, '2026-03-18 14:55:00', '::1', NULL, NULL, NULL, '2026-03-18 14:54:46', '2026-03-22 15:11:32', NULL, NULL),
(20, 'SM-687179592', 'kabarondo@gmail.com', 'kabarondo', NULL, '$2b$10$x1/KAn1MWngywfBss/WxnOyylIEAd2aWSye1hS.ezGaRceByhsDz2', 'Ishimwe', 'Theoneste', NULL, NULL, 2, 17, 'Kayonza', 'Eastern Province', 'Kabarondo', 0, 1, 0, NULL, 0, 0, '2026-03-18 23:18:42', '::1', NULL, NULL, NULL, '2026-03-18 16:21:27', '2026-03-22 15:11:32', NULL, NULL),
(21, 'SM-518686089', 'cyivugiza@gmail.com', 'cyivugiza', NULL, '$2b$12$wF9LMEUVRJcm.EVTb5eO5.x5.Qyi0yA8MxBJdj23E3Peq1iFfdtKe', 'Kamana', 'Piere', NULL, NULL, 2, 46, 'Nyarugenge', 'Kigali City', 'Nyamirambo', 0, 1, 0, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, '2026-03-18 21:35:18', '2026-03-22 15:11:32', NULL, NULL),
(22, 'SM-146635408', 'ntora@gmail.com', 'ntora', NULL, '$2b$12$EH5.Mpao7Ka4Eb7I1yezvuwXHjPjjzS2rBV.QS8Z.qafyZBG/JMke', 'Ishimwe', 'Theoneste', NULL, NULL, 2, 74, 'Gasabo', 'Kigali City', 'Gisozi', 0, 1, 0, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, '2026-03-18 23:09:06', '2026-03-22 15:11:32', NULL, NULL),
(23, 'SM-898863035', 'gisozi1@gmail.com', 'gisozi1', NULL, '$2b$10$EplGgl1KagSatljLUTlcueizxHgiE8TPYov6oy8KkqrUTcPhRm1yS', 'Event', 'Organizer', NULL, NULL, 2, 73, 'Gasabo', 'Kigali City', 'Gisozi', 0, 1, 0, NULL, 0, 0, '2026-03-18 23:40:03', '::1', NULL, NULL, NULL, '2026-03-18 23:21:38', '2026-03-22 15:11:32', NULL, NULL),
(24, 'SM-644786559', 'wisdommusanze@gmail.com', 'wisdommusange', NULL, '$2b$10$h8PnjeTFhC5/xeW4eIa.n.hbIceOZusO5syRPW6.3lFjds3EQrvzO', 'Mutabazi', 'Joel', NULL, NULL, 2, 4114, 'Musanze', 'Northern Province', 'Musanze', 0, 1, 0, NULL, 0, 0, '2026-03-21 08:36:22', '::1', NULL, NULL, NULL, '2026-03-18 23:50:44', '2026-03-22 15:11:32', NULL, NULL),
(25, 'SM-688648524', 'gskamonyi@gmail.com', 'kamonyi', NULL, '$2b$12$WegkJ4W7zExzVKx9rg/i5uxuH/LdCFeSbw6VOECE4iS0LI8FPdWw.', 'Kamana', '-', NULL, NULL, 2, 4115, 'Gasabo', 'Kigali City', 'Rusororo', 0, 1, 0, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, '2026-03-22 15:04:48', '2026-03-22 15:11:32', NULL, NULL),
(26, 'SM-679004105', 'gskimironkoii@gmail.com', 'kimironko', NULL, '$2b$12$9iIq0vPG9WLyAHJAw1rhBuZz/7g/hQeWYzRIa0.ORBdQqkVKymG/O', 'Kamana', 'Eric', NULL, NULL, 2, 1, 'Gasabo', 'Kigali City', 'Kimironko', 1, 1, 0, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, '2026-03-22 15:21:19', '2026-03-22 15:21:41', NULL, NULL),
(27, 'SM-836577009', 'ishimwetheoneste937@gmail.com', 'ishimwetheoneste937_sm8', NULL, '$2b$10$N9PSG.kWtIUoFgxoAzzjG.ciAjWoYRNSQsRIp0zE1AYeNs7BZr7RG', 'MUGABO', 'Claude', NULL, NULL, 2, 8, 'Gasabo', 'Kigali City', 'Remera', 1, 1, 0, NULL, 0, 0, '2026-03-22 19:11:22', '::1', NULL, NULL, NULL, '2026-03-22 17:20:36', '2026-03-22 19:11:22', NULL, NULL),
(28, 'SM-947204499', 'ishimwetheonest937@gmail.com', 'ishimwetheonest937_sm3', NULL, '$2b$10$Y1XneVm/DqTlCKKQSOPAKeQysb57phsflZMVQZcDmFifTOH8aFuVi', 'UWAMAHORO', 'Claudine', NULL, NULL, 2, 3, 'Gasabo', 'Kigali City', 'Remera', 1, 1, 0, NULL, 0, 0, '2026-03-25 13:07:10', '::1', NULL, NULL, NULL, '2026-03-22 19:35:47', '2026-03-25 13:07:10', NULL, NULL),
(29, 'ST-408882151', 'notredameaccountant@gmail.com', 'notredameaccountant', '0788876345', '$2b$12$UV.ZWNYSysi2RG23KsVFsuV46j/Fq/KeEM5l1C/MgpWwKEVuySxhu', 'Mahoro', 'Alice', NULL, NULL, 8, 3, NULL, NULL, NULL, 1, 1, 0, NULL, 0, 0, '2026-03-25 13:12:12', '::1', NULL, NULL, NULL, '2026-03-25 07:10:08', '2026-03-25 13:12:12', NULL, NULL),
(30, 'ST-369377367', 'notredamehod@gmail.com', 'notredamehod', '0788876340', '$2b$12$J0rEoN9NlBh8fQG/Yf2fJunT1p0ancrlSFbt0ILa49dCIoSFTV3V6', 'Kamana', 'Janvier', NULL, NULL, 3, 3, NULL, NULL, NULL, 1, 1, 0, NULL, 0, 0, '2026-03-25 13:10:24', '::1', NULL, NULL, NULL, '2026-03-25 07:59:29', '2026-03-25 13:10:24', NULL, NULL),
(31, 'ST-663298971', 'notredanedos@gmail.com', 'notredanedos', '0798675654', '$2b$12$6Cp4w53HliJnveiOKjpK.eqr7fv1vOScJdNXvNA0E3hLoruvWFhsa', 'JEAN', 'UWIRINGIYIMANA', NULL, NULL, 11, 3, NULL, NULL, NULL, 1, 1, 0, NULL, 0, 0, '2026-03-25 13:08:57', '::1', NULL, NULL, NULL, '2026-03-25 12:14:23', '2026-03-25 13:08:57', NULL, NULL),
(32, 'SM-392769001', 'sanaacademy@gmail.com', 'sanaacademy_sm6', NULL, '$2b$10$H7jEnujD2UvZoQ6x7AbU2uxJ0FO8pBVM7TOqv1ZwTYFAxa.ClXXL6', 'NIIYONKURU', 'Marcell', NULL, NULL, 2, 6, 'Gasabo', 'Kigali City', 'Remera', 1, 1, 0, NULL, 0, 0, '2026-03-25 13:01:35', '::1', NULL, NULL, NULL, '2026-03-25 12:59:52', '2026-03-25 13:01:56', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admissions`
--
ALTER TABLE `admissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `school_id` (`school_id`);

--
-- Indexes for table `admission_applications`
--
ALTER TABLE `admission_applications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_no` (`reference_no`),
  ADD KEY `idx_form` (`form_id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `admission_app_answers`
--
ALTER TABLE `admission_app_answers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_app` (`application_id`),
  ADD KEY `idx_q` (`question_id`);

--
-- Indexes for table `admission_forms`
--
ALTER TABLE `admission_forms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_website` (`mini_website_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `admission_form_questions`
--
ALTER TABLE `admission_form_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_form` (`form_id`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_active` (`is_active`,`publish_at`);

--
-- Indexes for table `app_sessions`
--
ALTER TABLE `app_sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_ts` (`created_at`);

--
-- Indexes for table `babyeyi_audit_log`
--
ALTER TABLE `babyeyi_audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_babyeyi` (`babyeyi_id`),
  ADD KEY `idx_doc_id` (`doc_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_actor` (`actor_id`),
  ADD KEY `idx_ts` (`created_at`);

--
-- Indexes for table `babyeyi_class_requirements`
--
ALTER TABLE `babyeyi_class_requirements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_babyeyi_id` (`babyeyi_id`);

--
-- Indexes for table `babyeyi_doc_ids`
--
ALTER TABLE `babyeyi_doc_ids`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_doc_id` (`doc_id`),
  ADD KEY `idx_babyeyi_id` (`babyeyi_id`);

--
-- Indexes for table `babyeyi_increase_requests`
--
ALTER TABLE `babyeyi_increase_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_babyeyi_id` (`babyeyi_id`),
  ADD KEY `idx_school_id` (`school_id`),
  ADD KEY `idx_sector` (`sector`),
  ADD KEY `idx_district` (`district`),
  ADD KEY `idx_nesa_status` (`nesa_status`),
  ADD KEY `idx_deo_id` (`deo_id`);

--
-- Indexes for table `babyeyi_leaders`
--
ALTER TABLE `babyeyi_leaders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bl_babyeyi` (`babyeyi_id`),
  ADD KEY `idx_bl_school` (`school_id`);

--
-- Indexes for table `babyeyi_loan_repayments`
--
ALTER TABLE `babyeyi_loan_repayments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_blr_receipt` (`receipt_no`),
  ADD KEY `idx_blr_intent` (`intent_id`),
  ADD KEY `idx_blr_phone` (`paid_by_phone`),
  ADD KEY `idx_blr_status` (`status`);

--
-- Indexes for table `babyeyi_payments`
--
ALTER TABLE `babyeyi_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_babyeyi_id` (`babyeyi_id`);

--
-- Indexes for table `babyeyi_payment_intents`
--
ALTER TABLE `babyeyi_payment_intents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_babyeyi` (`babyeyi_id`),
  ADD KEY `idx_payer_phone` (`payer_phone`);

--
-- Indexes for table `babyeyi_signatures`
--
ALTER TABLE `babyeyi_signatures`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_babyeyi_signature` (`babyeyi_id`),
  ADD KEY `idx_babyeyi_id` (`babyeyi_id`);

--
-- Indexes for table `babyeyi_student_requirements`
--
ALTER TABLE `babyeyi_student_requirements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_babyeyi_id` (`babyeyi_id`);

--
-- Indexes for table `deo_reviewers`
--
ALTER TABLE `deo_reviewers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user` (`user_id`),
  ADD KEY `idx_district` (`district`),
  ADD KEY `idx_sector` (`sector`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `discipline_cases`
--
ALTER TABLE `discipline_cases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school_student_year_term` (`school_id`,`student_id`,`academic_year`,`term`),
  ADD KEY `idx_school_created` (`school_id`,`created_at`);

--
-- Indexes for table `dos_student_academic_records`
--
ALTER TABLE `dos_student_academic_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_student_term` (`school_id`,`student_id`,`academic_year`,`term`),
  ADD KEY `idx_school_year_term` (`school_id`,`academic_year`,`term`),
  ADD KEY `idx_school_class` (`school_id`,`class_name`);

--
-- Indexes for table `fee_items`
--
ALTER TABLE `fee_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_level` (`fee_level_id`),
  ADD KEY `idx_school` (`school_id`);

--
-- Indexes for table `fee_levels`
--
ALTER TABLE `fee_levels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_school_level` (`school_id`,`level_key`),
  ADD KEY `idx_school` (`school_id`);

--
-- Indexes for table `fee_limits`
--
ALTER TABLE `fee_limits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_level` (`level`),
  ADD KEY `idx_academic_year` (`academic_year`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `gallery_albums`
--
ALTER TABLE `gallery_albums`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school` (`school_id`);

--
-- Indexes for table `gallery_images`
--
ALTER TABLE `gallery_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_album` (`album_id`),
  ADD KEY `idx_school` (`school_id`);

--
-- Indexes for table `nesa_fee_limits`
--
ALTER TABLE `nesa_fee_limits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_limit` (`academic_year`,`education_level`,`school_category`),
  ADD KEY `idx_year` (`academic_year`),
  ADD KEY `idx_level` (`education_level`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `parent_portal_accounts`
--
ALTER TABLE `parent_portal_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_parent_portal_phone` (`phone`),
  ADD KEY `idx_parent_portal_phone` (`phone`);

--
-- Indexes for table `requirement_prices`
--
ALTER TABLE `requirement_prices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_scope` (`requirement_id`,`school_id`,`class_id`,`term`,`academic_year`),
  ADD UNIQUE KEY `uq_babyeyi_req` (`babyeyi_id`,`babyeyi_requirement_id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_babyeyi` (`babyeyi_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_code` (`role_code`),
  ADD KEY `idx_role_code` (`role_code`);

--
-- Indexes for table `schools`
--
ALTER TABLE `schools`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_school_code` (`school_code`),
  ADD UNIQUE KEY `uq_school_email` (`email`),
  ADD KEY `idx_district` (`district`),
  ADD KEY `idx_province` (`province`),
  ADD KEY `idx_sector` (`sector`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_deleted` (`deleted_at`),
  ADD KEY `idx_admin_id` (`admin_id`);

--
-- Indexes for table `school_babyeyi`
--
ALTER TABLE `school_babyeyi`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_doc_id` (`doc_id`),
  ADD UNIQUE KEY `doc_id` (`doc_id`),
  ADD KEY `idx_school_id` (`school_id`),
  ADD KEY `idx_sector` (`school_sector`),
  ADD KEY `idx_district` (`school_district`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_deo_status` (`deo_status`),
  ADD KEY `idx_academic_year` (`academic_year`),
  ADD KEY `idx_term` (`term`),
  ADD KEY `idx_submitted_at` (`submitted_at`),
  ADD KEY `idx_deleted` (`deleted_at`),
  ADD KEY `idx_school_term` (`school_id`,`term`,`academic_year`);

--
-- Indexes for table `school_discipline_settings`
--
ALTER TABLE `school_discipline_settings`
  ADD PRIMARY KEY (`school_id`);

--
-- Indexes for table `school_dos_settings`
--
ALTER TABLE `school_dos_settings`
  ADD PRIMARY KEY (`school_id`);

--
-- Indexes for table `school_fee_collections`
--
ALTER TABLE `school_fee_collections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sfc_school` (`school_id`),
  ADD KEY `idx_sfc_student` (`student_id`),
  ADD KEY `idx_sfc_created` (`created_at`);

--
-- Indexes for table `school_leaders`
--
ALTER TABLE `school_leaders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_role` (`role_type`);

--
-- Indexes for table `school_mini_websites`
--
ALTER TABLE `school_mini_websites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `school_id` (`school_id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_smw_status` (`status`),
  ADD KEY `idx_smw_slug` (`slug`),
  ADD KEY `idx_smw_school` (`school_id`),
  ADD KEY `idx_adm_form` (`admission_form_id`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `staff_id` (`staff_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_student_uid_school` (`student_uid`,`school_id`),
  ADD KEY `idx_students_school_id` (`school_id`),
  ADD KEY `idx_students_student_uid` (`student_uid`);

--
-- Indexes for table `student_requirements`
--
ALTER TABLE `student_requirements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_name` (`name`(255));

--
-- Indexes for table `student_transfer_logs`
--
ALTER TABLE `student_transfer_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_logs_request` (`request_id`);

--
-- Indexes for table `student_transfer_notifications`
--
ALTER TABLE `student_transfer_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notif_school` (`school_id`,`created_at`),
  ADD KEY `idx_notif_request` (`request_id`);

--
-- Indexes for table `student_transfer_requests`
--
ALTER TABLE `student_transfer_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_request_student` (`student_id`),
  ADD KEY `idx_request_from` (`school_id_from`,`status`),
  ADD KEY `idx_request_to` (`school_id_to`,`status`),
  ADD KEY `idx_request_created` (`created_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_uid` (`user_uid`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_user_uid` (`user_uid`),
  ADD KEY `idx_role_id` (`role_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admissions`
--
ALTER TABLE `admissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admission_applications`
--
ALTER TABLE `admission_applications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `admission_app_answers`
--
ALTER TABLE `admission_app_answers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `admission_forms`
--
ALTER TABLE `admission_forms`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `admission_form_questions`
--
ALTER TABLE `admission_form_questions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `babyeyi_audit_log`
--
ALTER TABLE `babyeyi_audit_log`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `babyeyi_class_requirements`
--
ALTER TABLE `babyeyi_class_requirements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `babyeyi_doc_ids`
--
ALTER TABLE `babyeyi_doc_ids`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `babyeyi_increase_requests`
--
ALTER TABLE `babyeyi_increase_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `babyeyi_leaders`
--
ALTER TABLE `babyeyi_leaders`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `babyeyi_loan_repayments`
--
ALTER TABLE `babyeyi_loan_repayments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `babyeyi_payments`
--
ALTER TABLE `babyeyi_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `babyeyi_payment_intents`
--
ALTER TABLE `babyeyi_payment_intents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `babyeyi_signatures`
--
ALTER TABLE `babyeyi_signatures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `babyeyi_student_requirements`
--
ALTER TABLE `babyeyi_student_requirements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `deo_reviewers`
--
ALTER TABLE `deo_reviewers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `discipline_cases`
--
ALTER TABLE `discipline_cases`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `dos_student_academic_records`
--
ALTER TABLE `dos_student_academic_records`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `fee_items`
--
ALTER TABLE `fee_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fee_levels`
--
ALTER TABLE `fee_levels`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fee_limits`
--
ALTER TABLE `fee_limits`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `gallery_albums`
--
ALTER TABLE `gallery_albums`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `gallery_images`
--
ALTER TABLE `gallery_images`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `nesa_fee_limits`
--
ALTER TABLE `nesa_fee_limits`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `parent_portal_accounts`
--
ALTER TABLE `parent_portal_accounts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `requirement_prices`
--
ALTER TABLE `requirement_prices`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `schools`
--
ALTER TABLE `schools`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `school_babyeyi`
--
ALTER TABLE `school_babyeyi`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `school_fee_collections`
--
ALTER TABLE `school_fee_collections`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `school_leaders`
--
ALTER TABLE `school_leaders`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

--
-- AUTO_INCREMENT for table `school_mini_websites`
--
ALTER TABLE `school_mini_websites`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=140;

--
-- AUTO_INCREMENT for table `student_requirements`
--
ALTER TABLE `student_requirements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `student_transfer_logs`
--
ALTER TABLE `student_transfer_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `student_transfer_notifications`
--
ALTER TABLE `student_transfer_notifications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `student_transfer_requests`
--
ALTER TABLE `student_transfer_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admissions`
--
ALTER TABLE `admissions`
  ADD CONSTRAINT `admissions_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `admission_applications`
--
ALTER TABLE `admission_applications`
  ADD CONSTRAINT `admission_applications_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `admission_forms` (`id`);

--
-- Constraints for table `admission_app_answers`
--
ALTER TABLE `admission_app_answers`
  ADD CONSTRAINT `admission_app_answers_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `admission_applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `admission_app_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `admission_form_questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `admission_form_questions`
--
ALTER TABLE `admission_form_questions`
  ADD CONSTRAINT `admission_form_questions_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `admission_forms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `babyeyi_class_requirements`
--
ALTER TABLE `babyeyi_class_requirements`
  ADD CONSTRAINT `fk_class_req_babyeyi` FOREIGN KEY (`babyeyi_id`) REFERENCES `babyeyi_doc_ids` (`babyeyi_id`) ON DELETE CASCADE;

--
-- Constraints for table `deo_reviewers`
--
ALTER TABLE `deo_reviewers`
  ADD CONSTRAINT `fk_deo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `fee_items`
--
ALTER TABLE `fee_items`
  ADD CONSTRAINT `fee_items_ibfk_1` FOREIGN KEY (`fee_level_id`) REFERENCES `fee_levels` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fee_items_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fee_levels`
--
ALTER TABLE `fee_levels`
  ADD CONSTRAINT `fee_levels_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `gallery_albums`
--
ALTER TABLE `gallery_albums`
  ADD CONSTRAINT `gallery_albums_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `gallery_images`
--
ALTER TABLE `gallery_images`
  ADD CONSTRAINT `gallery_images_ibfk_1` FOREIGN KEY (`album_id`) REFERENCES `gallery_albums` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `gallery_images_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `requirement_prices`
--
ALTER TABLE `requirement_prices`
  ADD CONSTRAINT `requirement_prices_ibfk_1` FOREIGN KEY (`requirement_id`) REFERENCES `student_requirements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `school_babyeyi`
--
ALTER TABLE `school_babyeyi`
  ADD CONSTRAINT `fk_babyeyi_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `school_leaders`
--
ALTER TABLE `school_leaders`
  ADD CONSTRAINT `school_leaders_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `school_mini_websites`
--
ALTER TABLE `school_mini_websites`
  ADD CONSTRAINT `fk_smw_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
