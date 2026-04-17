-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 16, 2026 at 12:25 AM
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
-- Table structure for table `academic_assessments`
--

CREATE TABLE `academic_assessments` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `class_name` varchar(120) NOT NULL,
  `subject_name` varchar(120) NOT NULL,
  `assessment_name` varchar(120) NOT NULL,
  `max_score` decimal(8,2) NOT NULL DEFAULT 100.00,
  `assessment_type` varchar(32) DEFAULT 'TEACHER_CUSTOM',
  `column_slug` varchar(40) DEFAULT NULL,
  `created_by_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `academic_attendance_logs`
--

CREATE TABLE `academic_attendance_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `timetable_id` int(10) UNSIGNED NOT NULL,
  `record_date` date NOT NULL,
  `session_status` varchar(32) DEFAULT 'Completed',
  `recorded_by_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `academic_attendance_records`
--

CREATE TABLE `academic_attendance_records` (
  `id` int(10) UNSIGNED NOT NULL,
  `log_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `academic_marks`
--

CREATE TABLE `academic_marks` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `assessment_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `score_obtained` decimal(8,2) NOT NULL,
  `recorded_by_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `academic_timetables`
--

CREATE TABLE `academic_timetables` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `class_name` varchar(120) NOT NULL,
  `subject_name` varchar(120) NOT NULL,
  `staff_id` int(10) UNSIGNED NOT NULL,
  `day_of_week` varchar(20) NOT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `room` varchar(64) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accountant_expenses`
--

CREATE TABLE `accountant_expenses` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `created_by_user_id` int(10) UNSIGNED NOT NULL,
  `category` varchar(120) DEFAULT NULL,
  `title` varchar(220) DEFAULT NULL,
  `vendor` varchar(220) DEFAULT NULL,
  `amount_rwf` decimal(14,2) NOT NULL DEFAULT 0.00,
  `due_date` date DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accountant_expense_payments`
--

CREATE TABLE `accountant_expense_payments` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `expense_id` int(10) UNSIGNED NOT NULL,
  `recorded_by_user_id` int(10) UNSIGNED NOT NULL,
  `amount_rwf` decimal(14,2) NOT NULL DEFAULT 0.00,
  `method` varchar(80) DEFAULT NULL,
  `reference` varchar(180) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `paid_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accountant_payroll_rates`
--

CREATE TABLE `accountant_payroll_rates` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `role_code` varchar(64) NOT NULL,
  `base_rwf` decimal(14,2) NOT NULL DEFAULT 0.00,
  `allowance_rwf` decimal(14,2) NOT NULL DEFAULT 0.00,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accountant_payroll_runs`
--

CREATE TABLE `accountant_payroll_runs` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `triggered_by_user_id` int(10) UNSIGNED NOT NULL,
  `run_period` varchar(32) NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'processed',
  `gross_total_rwf` decimal(14,2) NOT NULL DEFAULT 0.00,
  `staff_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accountant_payroll_run_lines`
--

CREATE TABLE `accountant_payroll_run_lines` (
  `id` int(10) UNSIGNED NOT NULL,
  `run_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `staff_name` varchar(180) NOT NULL,
  `dept` varchar(120) DEFAULT NULL,
  `role_code` varchar(64) DEFAULT NULL,
  `gross_rwf` decimal(14,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accountant_payroll_staff_overrides`
--

CREATE TABLE `accountant_payroll_staff_overrides` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `rate_role_code` varchar(64) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(1, 3, NULL, 'Online Admission Application', NULL, NULL, NULL, NULL, NULL, 'draft', '2026-03-22 20:46:39', '2026-03-22 20:48:11', NULL),
(2, 11, NULL, 'Online Admission Application', NULL, '2026-2027', '2026-04-11', '2026-08-25', NULL, 'open', '2026-04-11 20:14:41', '2026-04-11 20:24:44', NULL);

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
('6txkkXmsYlz6atALpf66cgqp6tPrY1gL', 1778600387, '{\"cookie\":{\"originalMaxAge\":2592000000,\"expires\":\"2026-05-12T14:59:44.858Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":28,\"roleCode\":\"SCHOOL_ADMIN\",\"loginTime\":1776005984731,\"school_id\":3,\"user\":{\"id\":28,\"user_uid\":\"SM-947204499\",\"email\":\"ishimwetheonest937@gmail.com\",\"first_name\":\"UWAMAHORO\",\"last_name\":\"Claudine\",\"full_name\":\"UWAMAHORO Claudine\",\"photo\":null,\"role\":{\"code\":\"SCHOOL_ADMIN\",\"name\":\"School Admin\"},\"district\":\"Gasabo\",\"province\":\"Kigali City\",\"sector\":\"Remera\",\"school\":{\"id\":3,\"name\":\"ECOLE NOTRE DAME DES ANGES\",\"code\":\"003\",\"email\":\"notredame@gmail.com\",\"phone\":\"0796785674\",\"district\":\"Gasabo\",\"province\":\"Kigali City\"},\"school_id\":3,\"force_password_change\":false,\"agent\":null}}'),
('gHWYv42QO16FWP342BNybUQ8MmJOcH0P', 1778061088, '{\"cookie\":{\"originalMaxAge\":2592000000,\"expires\":\"2026-05-06T08:34:57.564Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":28,\"roleCode\":\"SCHOOL_ADMIN\",\"loginTime\":1775464497556,\"school_id\":3,\"user\":{\"id\":28,\"user_uid\":\"SM-947204499\",\"email\":\"ishimwetheonest937@gmail.com\",\"first_name\":\"UWAMAHORO\",\"last_name\":\"Claudine\",\"full_name\":\"UWAMAHORO Claudine\",\"photo\":null,\"role\":{\"code\":\"SCHOOL_ADMIN\",\"name\":\"School Admin\"},\"district\":\"Gasabo\",\"province\":\"Kigali City\",\"sector\":\"Remera\",\"school\":{\"id\":3,\"name\":\"ECOLE NOTRE DAME DES ANGES\",\"code\":\"003\",\"email\":\"notredame@gmail.com\",\"phone\":\"0796785674\",\"district\":\"Gasabo\",\"province\":\"Kigali City\"},\"school_id\":3,\"force_password_change\":false,\"agent\":null}}'),
('Lcm5XFa0bap5A_JfjI7ByLSVauwP77tG', 1778061612, '{\"cookie\":{\"originalMaxAge\":2592000000,\"expires\":\"2026-05-03T08:36:40.252Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":1,\"roleCode\":\"SUPER_ADMIN\",\"loginTime\":1775205400243,\"school_id\":null,\"user\":{\"id\":1,\"user_uid\":\"SA-706896305\",\"email\":\"ishimwetheo488@gmail.com\",\"first_name\":\"Ishimwe\",\"last_name\":\"Theoneste\",\"full_name\":\"Ishimwe Theoneste\",\"photo\":null,\"role\":{\"code\":\"SUPER_ADMIN\",\"name\":\"Super Admin\"},\"district\":null,\"province\":null,\"sector\":null,\"school\":null,\"school_id\":null,\"force_password_change\":false,\"agent\":null}}'),
('LWLfFnUVVeF3W-shVZLFP8V13lA69hP5', 1778592415, '{\"cookie\":{\"originalMaxAge\":2592000000,\"expires\":\"2026-05-12T13:26:53.219Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":38,\"roleCode\":\"SCHOOL_ADMIN\",\"loginTime\":1776000413210,\"school_id\":11,\"user\":{\"id\":38,\"user_uid\":\"SM-735421705\",\"email\":\"wisdommusanze@babyeyi.rw\",\"first_name\":\"NDUWAYESU\",\"last_name\":\"Elie\",\"full_name\":\"NDUWAYESU Elie\",\"photo\":\"/uploads/profile-photos/profile-38-1775939180447.png\",\"role\":{\"code\":\"SCHOOL_ADMIN\",\"name\":\"School Admin\"},\"district\":\"Musanze\",\"province\":\"Northern Province\",\"sector\":\"Cyuve\",\"school\":{\"id\":11,\"name\":\"WISDOM MUSANZE\",\"code\":\"011\",\"email\":\"info@wisdomschoolrwanda.com\",\"phone\":\"+250-788-478469\",\"district\":\"Musanze\",\"province\":\"Northern Province\"},\"school_id\":11,\"force_password_change\":false,\"agent\":null}}'),
('MQRvw22aBmgOc_rww9utffgFHUo2sRp9', 1778869888, '{\"cookie\":{\"originalMaxAge\":2592000000,\"expires\":\"2026-05-15T07:29:51.671Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":45,\"roleCode\":\"TEACHER\",\"shuleAvanceOrgId\":null,\"loginTime\":1776238191655,\"school_id\":2,\"user\":{\"id\":45,\"user_uid\":\"ST-106894640\",\"email\":\"gsrukarateacher@gmail.com\",\"first_name\":\"Ishimwe\",\"last_name\":\"Theoneste\",\"full_name\":\"Ishimwe Theoneste\",\"photo\":null,\"role\":{\"code\":\"TEACHER\",\"name\":\"Teacher\",\"id\":4},\"permission_keys\":[\"lite.dashboard.view\",\"pro.attendance.view\",\"pro.dashboard.view\",\"pro.marks.view\",\"pro.timetable.view\",\"attendance.mark\",\"grades.manage\",\"students.view\"],\"district\":null,\"province\":null,\"sector\":null,\"school\":{\"id\":2,\"name\":\"GS RUKARA TSS\",\"code\":\"11001\",\"email\":\"gsrukaratss@gmail.com\",\"phone\":\"0796898895\",\"district\":\"Kayonza\",\"province\":\"Eastern Province\",\"school_record_status\":\"active\",\"school_access_status\":\"active\",\"subscription_plan\":\"pro\",\"pro_enabled\":true,\"pro_start_date\":\"2026-04-15T07:21:00.000Z\",\"pro_end_date\":null,\"pro_access_effective\":true,\"modules\":{}},\"school_id\":2,\"force_password_change\":false,\"agent\":null,\"shule_avance_org\":null}}'),
('OAb3582DNkFPhKfGz6WL74_31QPUDOcb', 1778501858, '{\"cookie\":{\"originalMaxAge\":2592000000,\"expires\":\"2026-05-11T12:17:37.995Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":1,\"roleCode\":\"SUPER_ADMIN\",\"loginTime\":1775909857426,\"school_id\":null,\"user\":{\"id\":1,\"user_uid\":\"SA-706896305\",\"email\":\"ishimwetheo488@gmail.com\",\"first_name\":\"Ishimwe\",\"last_name\":\"Theoneste\",\"full_name\":\"Ishimwe Theoneste\",\"photo\":null,\"role\":{\"code\":\"SUPER_ADMIN\",\"name\":\"Super Admin\"},\"district\":null,\"province\":null,\"sector\":null,\"school\":null,\"school_id\":null,\"force_password_change\":false,\"agent\":null}}'),
('T8x9s-nu66ehPYqfYD0Fdu57JB39Ad80', 1778877234, '{\"cookie\":{\"originalMaxAge\":2592000000,\"expires\":\"2026-05-15T18:34:45.731Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":46,\"roleCode\":\"ACCOUNTANT\",\"shuleAvanceOrgId\":null,\"loginTime\":1776278085715,\"school_id\":2,\"user\":{\"id\":46,\"user_uid\":\"ST-314531062\",\"email\":\"gsrukaraaccountant@gmail.com\",\"first_name\":\"MIZERO\",\"last_name\":\"Alice\",\"full_name\":\"MIZERO Alice\",\"photo\":null,\"role\":{\"code\":\"ACCOUNTANT\",\"name\":\"Accountant\",\"id\":8},\"permission_keys\":[\"lite.dashboard.view\",\"finance.manage\",\"fees.manage\",\"reports.finance\"],\"district\":null,\"province\":null,\"sector\":null,\"school\":{\"id\":2,\"name\":\"GS RUKARA TSS\",\"code\":\"11001\",\"email\":\"gsrukaratss@gmail.com\",\"phone\":\"0796898895\",\"district\":\"Kayonza\",\"province\":\"Eastern Province\",\"school_record_status\":\"active\",\"school_access_status\":\"active\",\"subscription_plan\":\"pro\",\"pro_enabled\":true,\"pro_start_date\":\"2026-04-15T07:21:00.000Z\",\"pro_end_date\":null,\"pro_access_effective\":true,\"modules\":{}},\"school_id\":2,\"force_password_change\":false,\"agent\":null,\"shule_avance_org\":null}}');

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
(3, 2, 'Students Must come on Time', 'Students Must come on Time', NULL, 1),
(4, 4, 'Students Must come on time', 'Students Must come on time', NULL, 1),
(5, 4, 'Students must have full uniform', 'Students must have full uniform', NULL, 2),
(6, 5, 'Students must follow school rules: respect others, be punctual, wear uniform, and maintain discipline at all times.', 'Students must follow school rules: respect others, be punctual, wear uniform, and maintain discipline at all times.', NULL, 1),
(7, 7, 'Students must come on time', 'Students must come on time', NULL, 1),
(8, 7, 'Students must prepare well examination for next term', 'Students must prepare well examination for next term', NULL, 2),
(9, 8, 'Students must come on time', 'Students must come on time', NULL, 1),
(10, 8, 'Students Must have full uniform', 'Students Must have full uniform', NULL, 2),
(11, 9, 'Tution and Fees are non-refundable.', 'Tution and Fees are non-refundable.', NULL, 1),
(12, 9, 'Fees must be paid in full in the first week of each term', 'Fees must be paid in full in the first week of each term', NULL, 2),
(13, 9, 'Instalment Plans may be offered under special circumstances', 'Instalment Plans may be offered under special circumstances', NULL, 3),
(14, 9, 'There will be a trip in the THIRD Term , but all details about where it will take place will be communicated two weeks after the start of the term.', 'There will be a trip in the THIRD Term , but all details about where it will take place will be communicated two weeks after the start of the term.', NULL, 4);

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
(3, 'BY-2025-00002', 2, '2026-03-22 21:54:59'),
(5, 'BY-2025-00003', 3, '2026-03-27 12:35:31'),
(7, 'BY-2025-00004', 4, '2026-04-04 18:19:01'),
(9, 'BY-2025-00005', 5, '2026-04-06 10:39:10'),
(11, 'BY-2025-00006', 6, '2026-04-06 11:42:32'),
(13, 'BY-2025-00007', 7, '2026-04-11 15:48:51'),
(15, 'BY-2025-00008', 8, '2026-04-13 00:11:33'),
(17, 'BY-2025-00009', 9, '2026-04-14 21:41:45'),
(19, 'BY-2025-00010', 10, '2026-04-15 09:08:05');

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
(6, 2, 3, 'Mahoro Alice', 'Accountant', '785674564', 'accountant@gmail.com', 2, 1, '2026-03-22 19:55:02', '2026-03-22 19:55:02'),
(7, 3, 3, 'Kamana Ineza Sam', 'Head Teacher / Director', '789867656', 'director@gmail.com', 0, 1, '2026-03-27 10:35:31', '2026-03-27 10:35:31'),
(8, 4, 2, 'Kamana Jean Pierre', 'Head Teacher / Director', '789767654', 'director@gmail.com', 0, 1, '2026-04-04 16:19:01', '2026-04-04 16:19:01'),
(9, 5, 3, 'KAMANA Jean Pierre', 'Head Teacher / Director', '789567654', 'director@gmail.com', 0, 1, '2026-04-06 08:39:10', '2026-04-06 08:39:10'),
(10, 5, 3, 'UWINEZA Marie Clare', 'School Bursar / Economist', '798756765', 'accountant@gmail.com', 1, 1, '2026-04-06 08:39:10', '2026-04-06 08:39:10'),
(11, 6, 3, 'KAMANA Jean Pierre', 'Head Teacher / Director', '78985645', 'director@gmail.com', 0, 1, '2026-04-06 09:42:32', '2026-04-06 09:42:32'),
(12, 7, 3, 'Kamana', 'Head Teacher / Director', '7896876567', 'director@gmail.com', 0, 1, '2026-04-11 13:48:54', '2026-04-11 13:48:54'),
(13, 7, 3, 'UWASE Angel', 'School Bursar / Economist', '7887654656', 'uwase@gmail.com', 1, 1, '2026-04-11 13:48:54', '2026-04-11 13:48:54'),
(14, 8, 11, 'NDUWAYESU Elie', 'Head Teacher / Director', '0798676545', 'director@gmail.com', 0, 1, '2026-04-12 22:11:33', '2026-04-12 22:11:33'),
(15, 9, 1, 'NDUWAYESU Elie', 'Head Teacher / Director', '788-478469', NULL, 0, 1, '2026-04-14 19:41:45', '2026-04-14 19:41:45'),
(16, 10, 2, 'UWIMANA Marei Claire', 'Head Teacher / Director', '7898765654', NULL, 0, 1, '2026-04-15 07:08:05', '2026-04-15 07:08:05');

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
(4, 2, 'Transport Fee', 40000.00, 1),
(5, 3, 'Tuition Fee', 120000.00, 0),
(6, 3, 'Transport Fee', 80000.00, 1),
(7, 4, 'Tuition Fee', 19500.00, 0),
(8, 5, 'Tuition Fee', 100000.00, 0),
(9, 5, 'Transport Fee', 50000.00, 1),
(10, 6, 'Tuition Fee', 100000.00, 0),
(11, 6, 'Transport Fee', 50000.00, 1),
(12, 7, 'Tuition Fee', 150000.00, 0),
(13, 7, 'Transport Fee', 50000.00, 1),
(14, 8, 'Tuition Fee', 150000.00, 0),
(15, 8, 'Transport Fee', 50000.00, 1),
(16, 9, 'Tuition Fees', 510000.00, 0),
(17, 10, 'Tuition Fee', 19500.00, 0);

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
  `payer_email` varchar(180) DEFAULT NULL,
  `provider` varchar(40) DEFAULT NULL,
  `provider_status` varchar(40) DEFAULT NULL,
  `provider_reference` varchar(120) DEFAULT NULL,
  `provider_tid` varchar(80) DEFAULT NULL,
  `provider_authkey` varchar(180) DEFAULT NULL,
  `provider_payload_json` longtext DEFAULT NULL,
  `last_provider_check_at` datetime DEFAULT NULL,
  `retry_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `last_retry_at` datetime DEFAULT NULL,
  `invoice_no` varchar(40) DEFAULT NULL,
  `invoice_status` varchar(20) NOT NULL DEFAULT 'NOT_PAID',
  `invoice_paid_at` datetime DEFAULT NULL,
  `invoice_sent_at` datetime DEFAULT NULL,
  `invoice_notified_not_paid_at` datetime DEFAULT NULL,
  `invoice_notified_paid_at` datetime DEFAULT NULL,
  `invoice_due_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `babyeyi_payment_intents`
--

INSERT INTO `babyeyi_payment_intents` (`id`, `school_id`, `babyeyi_id`, `payload_json`, `total_rwf`, `status`, `created_at`, `payer_name`, `payer_phone`, `payer_email`, `provider`, `provider_status`, `provider_reference`, `provider_tid`, `provider_authkey`, `provider_payload_json`, `last_provider_check_at`, `retry_count`, `last_retry_at`, `invoice_no`, `invoice_status`, `invoice_paid_at`, `invoice_sent_at`, `invoice_notified_not_paid_at`, `invoice_notified_paid_at`, `invoice_due_at`) VALUES
(1, 3, 1, '{\"selected_fee_ids\":[2],\"selected_requirement_ids\":[1,2,3,4,5],\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"umwalimu\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null}}', 47897.00, 'draft', '2026-03-22 20:50:33', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(2, 3, 2, '{\"selected_fee_ids\":[3,4],\"selected_requirement_ids\":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null}}', 170166.00, 'draft', '2026-03-22 20:52:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(3, 3, 2, '{\"selected_fee_ids\":[3,4],\"selected_requirement_ids\":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":{\"totalDue\":174420.15,\"interest\":4254.15,\"installments\":3,\"each\":58140.05}},\"payer\":{\"name\":\"Mugabo Irene & Maneza Aline\",\"phone\":\"0796898894\",\"email\":null}}', 174420.15, 'submitted', '2026-03-23 14:43:34', 'Mugabo Irene & Maneza Aline', '0796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(4, 3, 2, '{\"selected_fee_ids\":[3,4],\"selected_requirement_ids\":[6,7,13,14,15,16,17,18,19,20],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":6,\"incomeId\":\"mid\",\"loanFreq\":\"daily\",\"loanSummary\":{\"totalDue\":136797.15,\"interest\":6514.15,\"installments\":180,\"each\":759.98}},\"payer\":{\"name\":\"Mugabo Irene & Maneza Aline\",\"phone\":\"0796898894\",\"email\":null}}', 136797.15, 'paid', '2026-03-23 14:59:31', 'Mugabo Irene & Maneza Aline', '0796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(5, 3, 1, '{\"selected_fee_ids\":[2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":71,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0789090909\",\"email\":null}}', 47897.00, 'submitted', '2026-03-23 16:44:22', 'KARACYE Evode & MARITA Aneth', '0789090909', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(6, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":72,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":6,\"incomeId\":\"mid\",\"loanFreq\":\"weekly\",\"loanSummary\":{\"totalDue\":102791.85,\"interest\":4894.85,\"installments\":24,\"each\":4282.99}},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0789090909\",\"email\":null}}', 102791.85, 'paid', '2026-03-23 16:49:32', 'KARACYE Evode & MARITA Aneth', '0789090909', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(7, 3, 2, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22],\"selected_student\":null,\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":6,\"incomeId\":\"mid\",\"loanFreq\":\"daily\",\"loanSummary\":{\"totalDue\":55300.35,\"interest\":2633.35,\"installments\":180,\"each\":307.22}},\"payer\":null}', 55300.35, 'submitted', '2026-03-23 18:52:50', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(8, 3, 1, '{\"selected_fee_ids\":[2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":72,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0789090909\",\"email\":null}}', 47897.00, 'submitted', '2026-03-23 19:44:24', 'KARACYE Evode & MARITA Aneth', '0789090909', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(9, 3, 1, '{\"selected_fee_ids\":[2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":72,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0789090909\",\"email\":null}}', 54897.00, 'submitted', '2026-03-23 19:51:13', 'KARACYE Evode & MARITA Aneth', '0789090909', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(10, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_id\":71,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"umwalimu\",\"momo\":\"mtn\",\"payMode\":\"loan\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"daily\",\"loanSummary\":{\"totalDue\":100344.43,\"interest\":2447.43,\"installments\":90,\"each\":1114.94},\"loan_request\":{\"bankCode\":\"umwalimu\",\"bankName\":\"Umwalimu SACCO\",\"applicantName\":\"Maneza\",\"accountNumber\":\"1007878436543\",\"nationalId\":\"199866534231234\"}},\"payer\":{\"name\":\"KARACYE Evode & MARITA Aneth\",\"phone\":\"0790786709\",\"email\":null}}', 100344.43, 'submitted', '2026-03-24 09:59:21', 'KARACYE Evode & MARITA Aneth', '0790786709', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(11, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[29],\"selected_student\":{\"student_id\":37,\"student_name\":\"Teta Christella\",\"first_name\":\"Teta\",\"last_name\":\"Christella\",\"class_name\":\"P2\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Mugabo Irene & Maneza Aline\",\"phone\":\"0796898894\",\"email\":null}}', 897.00, 'submitted', '2026-03-27 10:36:27', 'Mugabo Irene & Maneza Aline', '0796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(12, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[29],\"selected_student\":{\"student_id\":37,\"student_name\":\"Teta Christella\",\"first_name\":\"Teta\",\"last_name\":\"Christella\",\"class_name\":\"P2\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Mugabo Irene & Maneza Aline\",\"phone\":\"0796898894\",\"email\":null}}', 897.00, 'failed', '2026-03-27 11:06:52', 'Mugabo Irene & Maneza Aline', '0796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(13, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[29],\"selected_student\":{\"student_id\":37,\"student_name\":\"Teta Christella\",\"first_name\":\"Teta\",\"last_name\":\"Christella\",\"class_name\":\"P2\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Mugabo Irene & Maneza Aline\",\"phone\":\"0796898894\",\"email\":null}}', 897.00, 'failed', '2026-03-27 11:07:46', 'Mugabo Irene & Maneza Aline', '0796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(14, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[29],\"selected_student\":{\"student_id\":37,\"student_name\":\"Teta Christella\",\"first_name\":\"Teta\",\"last_name\":\"Christella\",\"class_name\":\"P2\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Mugabo Irene & Maneza Aline\",\"phone\":\"0796898894\",\"email\":null}}', 897.00, 'failed', '2026-03-27 11:07:47', 'Mugabo Irene & Maneza Aline', '0796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(15, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[29],\"selected_student\":{\"student_id\":140,\"student_name\":\"Maneza Alice\",\"first_name\":\"Maneza\",\"last_name\":\"Alice\",\"class_name\":\"P4\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"BUGINGO Yvan\",\"phone\":\"0794615545\",\"email\":null}}', 897.00, 'failed', '2026-03-27 11:22:02', 'BUGINGO Yvan', '0794615545', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(16, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[29],\"selected_student\":{\"student_id\":140,\"student_name\":\"Maneza Alice\",\"first_name\":\"Maneza\",\"last_name\":\"Alice\",\"class_name\":\"P4\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"BUGINGO Yvan\",\"phone\":\"0796580991\",\"email\":null}}', 897.00, 'failed', '2026-03-27 11:30:33', 'BUGINGO Yvan', '0796580991', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', '2026-03-27 13:40:23', 1, '2026-03-27 13:40:23', NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(17, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[28],\"selected_student\":{\"student_id\":140,\"student_name\":\"Maneza Alice\",\"first_name\":\"Maneza\",\"last_name\":\"Alice\",\"class_name\":\"P4\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"BUGINGO Yvan\",\"phone\":\"0796580991\",\"email\":null}}', 1499.00, 'failed', '2026-03-27 11:50:44', 'BUGINGO Yvan', '0796580991', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', '2026-03-27 13:51:03', 1, '2026-03-27 13:51:03', NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(18, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[],\"selected_student\":{\"student_id\":141,\"student_name\":\"Test Student\"},\"payment_plan\":{\"payMode\":\"full\",\"method\":\"cash\"},\"payer\":{\"name\":\"Parent Name\",\"phone\":\"0780428835\",\"email\":\"parent@example.com\"}}', 1000.00, 'draft', '2026-03-28 13:11:58', 'Parent Name', '0780428835', 'parent@example.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(19, 3, 3, '{\"selected_fee_ids\":[5,6],\"selected_requirement_ids\":[25,26,27,28,29],\"selected_student\":{\"student_uid\":\"040030002\",\"student_code\":\"040030002\",\"student_name\":\"Teta Christella\",\"first_name\":\"Teta\",\"last_name\":\"Christella\",\"class_name\":\"P2\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Claude\",\"phone\":\"0796898894\",\"email\":null}}', 217891.00, 'failed', '2026-03-28 19:05:39', 'Claude', '0796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(20, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,4,5,3],\"selected_student\":{\"student_uid\":\"040030002\",\"student_code\":\"040030002\",\"student_name\":\"Teta Christella\",\"first_name\":\"Teta\",\"last_name\":\"Christella\",\"class_name\":\"P2\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kaneza\",\"phone\":\"0796756453\",\"email\":null}}', 97897.00, 'submitted', '2026-03-28 19:17:15', 'Kaneza', '0796756453', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(21, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Ishimwe\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'failed', '2026-03-29 19:20:34', 'Ishimwe', '0796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(22, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Ishimwe\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'failed', '2026-03-29 19:25:21', 'Ishimwe', '0796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(23, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Manzi\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 97897.00, 'failed', '2026-03-29 19:26:43', 'Manzi', '0796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(24, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Manzi\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 97897.00, 'failed', '2026-03-29 19:45:41', 'Manzi', '0796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(25, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Manzi\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 97897.00, 'failed', '2026-03-29 19:57:07', 'Manzi', '0796898894', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":{\"statusCode\":401,\"message\":\"Access denied due to invalid subscription key. Make sure to provide a valid key for an active subscription.\"}}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(26, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Manzi\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 97897.00, 'failed', '2026-03-29 20:05:39', 'Manzi', '0796898894', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":{\"statusCode\":401,\"message\":\"Access denied due to invalid subscription key. Make sure to provide a valid key for an active subscription.\"}}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(27, 3, 3, '{\"selected_fee_ids\":[5,6],\"selected_requirement_ids\":[25,26,27,28,29],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Manzi\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 217891.00, 'failed', '2026-03-29 20:07:34', 'Manzi', '0796898894', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":{\"statusCode\":401,\"message\":\"Access denied due to invalid subscription key. Make sure to provide a valid key for an active subscription.\"}}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(28, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Manzi\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 97897.00, 'failed', '2026-03-29 20:09:45', 'Manzi', '0796898894', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":{\"statusCode\":401,\"message\":\"Access denied due to invalid subscription key. Make sure to provide a valid key for an active subscription.\"}}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(29, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Manzi\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 97897.00, 'failed', '2026-03-29 20:18:52', 'Manzi', '0796898894', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":{\"statusCode\":401,\"message\":\"Access denied due to invalid subscription key. Make sure to provide a valid key for an active subscription.\"}}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(30, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"bank\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"mamzi\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 97897.00, 'submitted', '2026-03-29 20:25:57', 'mamzi', '0796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(31, 3, 1, '{\"selected_fee_ids\":[1,2],\"selected_requirement_ids\":[1,2,3,4,5],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Manzi\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 97897.00, 'failed', '2026-03-29 20:26:41', 'Manzi', '0796898894', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":{\"statusCode\":401,\"message\":\"Access denied due to invalid subscription key. Make sure to provide a valid key for an active subscription.\"}}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(32, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kelvin\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'failed', '2026-03-29 20:37:27', 'Kelvin', '0795922165', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":{\"statusCode\":401,\"message\":\"Access denied due to invalid subscription key. Make sure to provide a valid key for an active subscription.\"}}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(33, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"mmm\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'failed', '2026-03-29 20:45:14', 'mmm', '0795922165', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":{\"statusCode\":401,\"message\":\"Access denied due to invalid subscription key. Make sure to provide a valid key for an active subscription.\"}}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(34, 3, 1, '{\"selected_fee_ids\":[2],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kelvin\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 30998.00, 'failed', '2026-03-29 20:57:25', 'Kelvin', '0795922165', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":{\"error\":\"invalid_client\"}}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(35, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kelvin\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'submitted', '2026-03-29 21:00:44', 'Kelvin', '0795922165', NULL, 'mtn_momo', 'PENDING', 'ec5c9de7-1c65-4c2f-810d-90c437e250d2', NULL, NULL, '{\"check_status_error\":\"[RESOURCE_NOT_FOUND] Requested resource was not found.\"}', '2026-03-29 23:00:51', 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(36, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Felix\",\"phone\":\"0788501299\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'submitted', '2026-03-29 21:12:21', 'Felix', '0788501299', NULL, 'mtn_momo', 'PENDING', 'dc9c4922-2d54-4456-a4de-ebdc2221de35', NULL, NULL, '{\"status\":\"PENDING\"}', '2026-03-29 23:12:31', 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(37, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kelvin\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'submitted', '2026-03-29 21:14:45', 'Kelvin', '0795922165', NULL, 'mtn_momo', 'PENDING', 'fbf1c18e-cc84-4336-977b-b53c4ab23369', NULL, NULL, '{\"status\":\"PENDING\"}', '2026-03-29 23:14:52', 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(38, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[29],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kelvin\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 897.00, 'submitted', '2026-03-29 21:15:57', 'Kelvin', '0795922165', NULL, 'mtn_momo', 'PENDING', '5ead38ea-b328-4c43-9eff-bc8d4c4ee8ad', NULL, NULL, '{\"status\":\"PENDING\"}', '2026-03-29 23:16:04', 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(39, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kelvin\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'submitted', '2026-03-29 21:28:11', 'Kelvin', '0795922165', NULL, 'mtn_momo', 'PENDING', '2ac356ce-0e08-4770-a530-88871c0fd47b', NULL, NULL, '{\"status\":\"PENDING\",\"mtnNotFound\":true}', '2026-03-29 23:28:19', 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(40, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"H\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'submitted', '2026-03-29 21:31:31', 'H', '0795922165', NULL, 'mtn_momo', 'PENDING', 'd833c4cd-e7eb-44df-8899-1497fbbaa551', NULL, NULL, '{\"status\":\"PENDING\",\"mtnNotFound\":true}', '2026-03-29 23:31:40', 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(41, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kjh\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'submitted', '2026-03-29 21:34:49', 'Kjh', '0795922165', NULL, 'mtn_momo', 'PENDING', 'df96425e-424b-43d2-85d4-ae6e28804cf5', NULL, NULL, '{\"status\":\"PENDING\",\"mtnNotFound\":true}', '2026-03-29 23:35:00', 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(42, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"hjjk\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'submitted', '2026-03-29 21:35:56', 'hjjk', '0795922165', NULL, 'mtn_momo', 'PENDING', '7f2c6f36-5d5e-47f5-ae64-4c5fe9491971', NULL, NULL, '{\"status\":\"PENDING\",\"mtnNotFound\":true}', '2026-03-29 23:36:06', 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(43, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"dfhgj\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'failed', '2026-03-29 21:39:03', 'dfhgj', '0795922165', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":\"<html><head><title>Request Rejected</title></head><body>The requested URL was rejected. Please consult with your administrator.<br><br>Your support ID is: 10819531227723421152<br><br><a href=\'javascript:history.back();\'>[Go Back]</a></body></html>\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(44, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"gh\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'failed', '2026-03-29 21:40:11', 'gh', '0795922165', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":\"<html><head><title>Request Rejected</title></head><body>The requested URL was rejected. Please consult with your administrator.<br><br>Your support ID is: 10819531227733103505<br><br><a href=\'javascript:history.back();\'>[Go Back]</a></body></html>\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(45, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"jkhefh\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'failed', '2026-03-29 21:42:42', 'jkhefh', '0795922165', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":\"<html><head><title>Request Rejected</title></head><body>The requested URL was rejected. Please consult with your administrator.<br><br>Your support ID is: 10819531227739194162<br><br><a href=\'javascript:history.back();\'>[Go Back]</a></body></html>\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(46, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"jkjjjk\",\"phone\":\"0795922165\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'failed', '2026-03-29 21:46:33', 'jkjjjk', '0795922165', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":\"<html><head><title>Request Rejected</title></head><body>The requested URL was rejected. Please consult with your administrator.<br><br>Your support ID is: 10819531227656387140<br><br><a href=\'javascript:history.back();\'>[Go Back]</a></body></html>\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(47, 3, 1, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[3],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"hjghghf\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 998.00, 'failed', '2026-03-29 21:55:26', 'hjghghf', '0796898894', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":\"<html><head><title>Request Rejected</title></head><body>The requested URL was rejected. Please consult with your administrator.<br><br>Your support ID is: 10819531227656675684<br><br><a href=\'javascript:history.back();\'>[Go Back]</a></body></html>\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(48, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[29],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":\"bk\",\"momo\":\"mtn\",\"payMode\":\"full\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":null,\"loan_request\":null},\"payer\":{\"name\":\"hjhj\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":true}', 897.00, 'failed', '2026-03-29 22:00:56', 'hjhj', '0796898894', NULL, 'mtn_momo', 'FAILED', NULL, NULL, NULL, '{\"error\":\"<html><head><title>Request Rejected</title></head><body>The requested URL was rejected. Please consult with your administrator.<br><br>Your support ID is: 10819531227733709137<br><br><a href=\'javascript:history.back();\'>[Go Back]</a></body></html>\"}', NULL, 0, NULL, NULL, 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(49, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[29],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"ISHIMWE Theoneste\",\"phone\":\"0796898894\",\"email\":\"janvierthefirst1@gmail.com\"},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 897.00, 'failed', '2026-03-31 18:28:17', 'ISHIMWE Theoneste', '0796898894', 'janvierthefirst1@gmail.com', 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"getaddrinfo ENOTFOUND xentripay.com\"}', NULL, 0, NULL, 'INV-20260331-00000049', 'NOT_PAID', NULL, NULL, NULL, NULL, NULL),
(50, 3, 3, '{\"selected_fee_ids\":[5,6],\"selected_requirement_ids\":[25,26,27,28,29],\"selected_student\":{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kamana Jean Pierre\",\"phone\":\"0796797754\",\"email\":\"janvierthefirst1@gmail.com\"},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 217891.00, 'failed', '2026-03-31 19:13:41', 'Kamana Jean Pierre', '0796797754', 'janvierthefirst1@gmail.com', 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260331-00000050', 'NOT_PAID', NULL, '2026-03-31 21:13:45', '2026-03-31 21:13:45', NULL, NULL),
(51, 3, 3, '{\"selected_fee_ids\":[5,6],\"selected_requirement_ids\":[25,26,27,28,29],\"selected_student\":{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kamana\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 217891.00, 'failed', '2026-03-31 19:42:15', 'Kamana', '0796898894', 'janvierthefirst1@gmail.com', 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260331-00000051', 'NOT_PAID', NULL, '2026-03-31 21:42:20', '2026-03-31 21:42:20', NULL, '2026-04-14 21:42:15');
INSERT INTO `babyeyi_payment_intents` (`id`, `school_id`, `babyeyi_id`, `payload_json`, `total_rwf`, `status`, `created_at`, `payer_name`, `payer_phone`, `payer_email`, `provider`, `provider_status`, `provider_reference`, `provider_tid`, `provider_authkey`, `provider_payload_json`, `last_provider_check_at`, `retry_count`, `last_retry_at`, `invoice_no`, `invoice_status`, `invoice_paid_at`, `invoice_sent_at`, `invoice_notified_not_paid_at`, `invoice_notified_paid_at`, `invoice_due_at`) VALUES
(52, 3, 3, '{\"selected_fee_ids\":[5,6],\"selected_requirement_ids\":[25,26,27,28,29],\"selected_student\":{\"student_uid\":\"040030005\",\"student_code\":\"040030005\",\"sdm_code\":null,\"student_name\":\"IRADUKUNDA Ange Pascaline\",\"first_name\":\"IRADUKUNDA\",\"last_name\":\"Ange Pascaline\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_uid\":\"040030005\",\"student_code\":\"040030005\",\"sdm_code\":null,\"student_name\":\"IRADUKUNDA Ange Pascaline\",\"first_name\":\"IRADUKUNDA\",\"last_name\":\"Ange Pascaline\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},{\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},{\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},{\"student_uid\":\"040030007\",\"student_code\":\"040030007\",\"sdm_code\":null,\"student_name\":\"SHIMWA Grace Graine\",\"first_name\":\"SHIMWA\",\"last_name\":\"Grace Graine\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250798699601\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Ishimwe Theoneste\",\"phone\":\"0798699601\",\"email\":\"ishimwetheo488@gmail.com\"},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 871564.00, 'failed', '2026-04-01 11:13:04', 'Ishimwe Theoneste', '0798699601', 'ishimwetheo488@gmail.com', 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260401-00000052', 'NOT_PAID', NULL, '2026-04-01 13:13:07', '2026-04-01 13:13:07', NULL, '2026-04-15 13:13:04'),
(53, 3, 3, '{\"selected_fee_ids\":[],\"selected_requirement_ids\":[25,26,27],\"selected_student\":{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kamana\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 15495.00, 'failed', '2026-04-02 19:14:54', 'Kamana', '0796898894', 'janvierthefirst1@gmail.com', 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260402-00000053', 'NOT_PAID', NULL, '2026-04-02 21:14:58', '2026-04-02 21:14:58', NULL, '2026-04-16 21:14:54'),
(54, 3, 3, '{\"selected_fee_ids\":[5,6],\"selected_requirement_ids\":[25,26,27,28,29],\"selected_student\":{\"student_id\":73,\"student_uid\":\"040030005\",\"student_code\":\"040030005\",\"sdm_code\":null,\"student_name\":\"IRADUKUNDA Ange Pascaline\",\"first_name\":\"IRADUKUNDA\",\"last_name\":\"Ange Pascaline\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":73,\"student_uid\":\"040030005\",\"student_code\":\"040030005\",\"sdm_code\":null,\"student_name\":\"IRADUKUNDA Ange Pascaline\",\"first_name\":\"IRADUKUNDA\",\"last_name\":\"Ange Pascaline\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250798678765\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kamana\",\"phone\":\"0798678765\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 217891.00, 'failed', '2026-04-03 10:28:53', 'Kamana', '0798678765', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260403-00000054', 'NOT_PAID', NULL, NULL, NULL, NULL, '2026-04-17 12:28:53'),
(55, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":76,\"student_uid\":\"040030008\",\"student_code\":\"040030008\",\"sdm_code\":\"20250204\",\"student_name\":\"TUMUKUNDE Linker\",\"first_name\":\"TUMUKUNDE\",\"last_name\":\"Linker\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":76,\"student_uid\":\"040030008\",\"student_code\":\"040030008\",\"sdm_code\":\"20250204\",\"student_name\":\"TUMUKUNDE Linker\",\"first_name\":\"TUMUKUNDE\",\"last_name\":\"Linker\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"TETE\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'failed', '2026-04-12 13:28:22', 'TETE', '250796898894', 'ndayishimiyej431@gmail.com', 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260412-00000055', 'NOT_PAID', NULL, '2026-04-12 15:28:26', '2026-04-12 15:28:26', NULL, '2026-04-26 15:28:22'),
(56, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":73,\"student_uid\":\"040030005\",\"student_code\":\"040030005\",\"sdm_code\":null,\"student_name\":\"IRADUKUNDA Ange Pascaline\",\"first_name\":\"IRADUKUNDA\",\"last_name\":\"Ange Pascaline\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":73,\"student_uid\":\"040030005\",\"student_code\":\"040030005\",\"sdm_code\":null,\"student_name\":\"IRADUKUNDA Ange Pascaline\",\"first_name\":\"IRADUKUNDA\",\"last_name\":\"Ange Pascaline\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Khjdvfda\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'failed', '2026-04-12 16:47:49', 'Khjdvfda', '250796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260412-00000056', 'NOT_PAID', NULL, NULL, NULL, NULL, '2026-04-26 18:47:49'),
(57, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"loan\",\"bankCode\":\"bk\",\"loanMonths\":3,\"incomeId\":\"mid\",\"loanFreq\":\"monthly\",\"loanSummary\":{\"totalDue\":165002.45,\"interest\":4024.45,\"installments\":3,\"each\":55000.82},\"loan_provider_category\":\"BANK\",\"loan_purpose\":\"\",\"loan_disbursement_method\":\"bank_account\",\"loan_branch_note\":\"\",\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":null,\"loan_request\":{\"bankCode\":\"bk\",\"bankName\":\"Bank of Kigali (BK)\",\"applicantName\":\"\",\"accountNumber\":\"\",\"nationalId\":\"\"}},\"payer\":{\"name\":\"Kaneza Claude\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 165002.45, 'draft', '2026-04-13 19:15:37', 'Kaneza Claude', '0796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000057', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-27 21:16:20'),
(58, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"shule_avance\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":{\"organization_id\":1,\"organization_name\":\"ZIGAMA CSS\",\"applicant_category\":\"parent\",\"purpose\":\"ShuleAvance\",\"repayment_period_months\":6,\"disbursement_preference\":\"school_account\",\"employer_guarantee_note\":\"\",\"supporting_note\":\"\",\"routing_summary\":\"Routing: school fees / materials — disbursement to the school account.\",\"financing_request_status\":\"APPROVED\",\"approval_history\":[{\"at\":\"2026-04-13T19:22:52.306Z\",\"action\":\"request_info\",\"note\":null,\"by_org_user_id\":41},{\"at\":\"2026-04-13T19:22:54.648Z\",\"action\":\"request_info\",\"note\":null,\"by_org_user_id\":41},{\"at\":\"2026-04-13T19:22:55.371Z\",\"action\":\"request_info\",\"note\":null,\"by_org_user_id\":41},{\"at\":\"2026-04-13T19:23:04.231Z\",\"action\":\"approve\",\"note\":null,\"by_org_user_id\":41}]},\"bank_transfer\":null,\"visa_card\":null,\"momo\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kaneza Claude\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'submitted', '2026-04-13 19:20:20', 'Kaneza Claude', '0796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000058', 'APPROVED', NULL, NULL, NULL, NULL, '2026-04-27 21:22:19'),
(59, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kaneza Claude\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'failed', '2026-04-13 19:23:15', 'Kaneza Claude', '250796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260413-00000059', 'NOT_PAID', NULL, NULL, NULL, NULL, '2026-04-27 21:31:54'),
(60, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"shule_avance\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":{\"organization_id\":1,\"organization_name\":\"ZIGAMA CSS\",\"applicant_category\":\"parent\",\"purpose\":\"\",\"repayment_period_months\":4,\"disbursement_preference\":\"school_account\",\"employer_guarantee_note\":\"\",\"supporting_note\":\"\",\"routing_summary\":\"Routing: school fees / materials — disbursement to the school account.\",\"financing_request_status\":\"SUBMITTED\"},\"bank_transfer\":null,\"visa_card\":null,\"momo\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kaneza Claude\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-13 19:32:00', 'Kaneza Claude', '0796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000060', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-27 21:40:05'),
(61, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"jhhj\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-13 19:33:49', 'jhhj', '250796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000061', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-27 21:33:50'),
(62, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kaneza Claude\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-13 19:55:37', 'Kaneza Claude', '250796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000062', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-27 21:57:33'),
(63, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"shule_avance\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":{\"organization_id\":1,\"organization_name\":\"ZIGAMA CSS\",\"applicant_category\":\"PARENT\",\"applicant_notification_email\":null,\"purpose\":\"\",\"repayment_period_months\":6,\"disbursement_preference\":\"school_account\",\"supporting_note\":\"\",\"routing_summary\":\"Routing: school fees / materials — disbursement to the school account.\",\"financing_request_status\":\"DRAFT\"},\"bank_transfer\":null,\"visa_card\":null,\"momo\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kaneza Claude\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-13 19:57:43', 'Kaneza Claude', '0796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000063', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-27 22:02:34'),
(64, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"shule_avance\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":{\"organization_id\":1,\"organization_name\":\"ZIGAMA CSS\",\"applicant_category\":\"Soldiers\",\"applicant_notification_email\":\"ishimwetheonest937@gmail.com\",\"purpose\":\"I request this ShuleAvance  for my child\",\"repayment_period_months\":6,\"disbursement_preference\":\"school_account\",\"supporting_note\":\"\",\"routing_summary\":\"Applicant type “Soldiers” — disbursement follows the agreement between your school and the financing partner.\",\"financing_request_status\":\"APPROVED\",\"email_notifications\":{\"submitted_at\":\"2026-04-13T20:17:22.209Z\",\"approved_at\":\"2026-04-13T20:26:20.518Z\"},\"approval_history\":[{\"at\":\"2026-04-13T20:26:16.848Z\",\"action\":\"approve\",\"note\":null,\"by_org_user_id\":41},{\"at\":\"2026-04-13T21:24:17.731Z\",\"action\":\"approve\",\"note\":null,\"by_org_user_id\":41}]},\"bank_transfer\":null,\"visa_card\":null,\"momo\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kaneza Claude\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'submitted', '2026-04-13 20:02:38', 'Kaneza Claude', '0796898894', 'ishimwetheonest937@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000064', 'APPROVED', NULL, '2026-04-13 22:16:59', '2026-04-13 22:16:59', NULL, '2026-04-27 22:17:19'),
(65, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":74,\"student_uid\":\"040030006\",\"student_code\":\"040030006\",\"sdm_code\":null,\"student_name\":\"MUGWANEZA Iyabes\",\"first_name\":\"MUGWANEZA\",\"last_name\":\"Iyabes\",\"class_name\":\"P3\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"jhhj\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-13 20:37:33', 'jhhj', '250796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000065', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-27 22:37:34'),
(66, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":71,\"student_uid\":\"040030003\",\"student_code\":\"040030003\",\"sdm_code\":null,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":71,\"student_uid\":\"040030003\",\"student_code\":\"040030003\",\"sdm_code\":null,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"hhh\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-13 20:47:06', 'hhh', '250796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000066', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-27 22:47:07'),
(67, 3, 6, '{\"selected_fee_ids\":[11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":71,\"student_uid\":\"040030003\",\"student_code\":\"040030003\",\"sdm_code\":null,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":71,\"student_uid\":\"040030003\",\"student_code\":\"040030003\",\"sdm_code\":null,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kaneza\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 60978.00, 'failed', '2026-04-13 20:58:45', 'Kaneza', '250796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260413-00000067', 'NOT_PAID', NULL, NULL, NULL, NULL, '2026-04-27 22:59:34'),
(68, 3, 6, '{\"selected_fee_ids\":[11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":71,\"student_uid\":\"040030003\",\"student_code\":\"040030003\",\"sdm_code\":null,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":71,\"student_uid\":\"040030003\",\"student_code\":\"040030003\",\"sdm_code\":null,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"shule_avance\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":{\"organization_id\":1,\"organization_name\":\"ZIGAMA CSS\",\"applicant_category\":\"Soldiers\",\"applicant_notification_email\":null,\"purpose\":\"\",\"repayment_period_months\":6,\"disbursement_preference\":\"school_account\",\"supporting_note\":\"\",\"routing_summary\":\"Applicant type “Soldiers” — disbursement follows the agreement between your school and the financing partner.\",\"financing_request_status\":\"DRAFT\"},\"bank_transfer\":null,\"visa_card\":null,\"momo\":null,\"loan_request\":null},\"payer\":{\"name\":\"Kaneza\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 60978.00, 'draft', '2026-04-13 20:59:40', 'Kaneza', '0796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000068', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-27 23:00:24'),
(69, 3, 6, '{\"selected_fee_ids\":[11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":71,\"student_uid\":\"040030003\",\"student_code\":\"040030003\",\"sdm_code\":null,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":71,\"student_uid\":\"040030003\",\"student_code\":\"040030003\",\"sdm_code\":null,\"student_name\":\"Mahoro Alice\",\"first_name\":\"Mahoro\",\"last_name\":\"Alice\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kaneza\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 60978.00, 'draft', '2026-04-13 21:21:56', 'Kaneza', '250796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260413-00000069', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-27 23:21:58'),
(70, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"shule_avance\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":{\"organization_id\":1,\"organization_name\":\"ZIGAMA CSS\",\"applicant_category\":\"Soldiers\",\"applicant_notification_email\":\"ishimwetheonest937@gmail.com\",\"purpose\":\"\",\"repayment_period_months\":5,\"disbursement_preference\":\"school_account\",\"supporting_note\":\"\",\"routing_summary\":\"Applicant type “Soldiers” — disbursement follows the agreement between your school and the financing partner.\",\"financing_request_status\":\"DRAFT\"},\"bank_transfer\":null,\"visa_card\":null,\"momo\":null,\"loan_request\":null},\"payer\":{\"name\":\"Karemera\",\"phone\":\"0796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-14 06:15:26', 'Karemera', '0796898894', 'ishimwetheonest937@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260414-00000070', 'DRAFT', NULL, '2026-04-14 08:15:30', '2026-04-14 08:15:30', NULL, '2026-04-28 08:20:52'),
(71, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Karemera\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-14 06:45:57', 'Karemera', '250796898894', 'janvierthefirst1@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260414-00000071', 'DRAFT', NULL, '2026-04-14 08:46:22', '2026-04-14 08:46:22', NULL, '2026-04-28 08:46:01'),
(72, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Karemera\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-14 06:46:05', 'Karemera', '250796898894', 'janvierthefirst1@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260414-00000072', 'DRAFT', NULL, '2026-04-14 08:46:19', '2026-04-14 08:46:19', NULL, '2026-04-28 08:46:09'),
(73, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Karemera\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-14 09:31:46', 'Karemera', '250796898894', 'janvierthefirst1@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260414-00000073', 'DRAFT', NULL, '2026-04-14 11:33:56', '2026-04-14 11:33:56', NULL, '2026-04-28 11:31:48'),
(74, 3, 6, '{\"selected_fee_ids\":[10,11],\"selected_requirement_ids\":[37,38,39,40],\"selected_student\":{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"},\"selected_students\":[{\"student_id\":72,\"student_uid\":\"040030004\",\"student_code\":\"040030004\",\"sdm_code\":null,\"student_name\":\"Manzi Ineza Karebu\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"ECOLE NOTRE DAME DES ANGES\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Karemera\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 160978.00, 'draft', '2026-04-14 16:59:29', 'Karemera', '250796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260414-00000074', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-28 18:59:30'),
(75, 1, 9, '{\"selected_fee_ids\":[16],\"selected_requirement_ids\":[48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80],\"selected_student\":{\"student_id\":1,\"student_uid\":\"150010001\",\"student_code\":\"150010001\",\"sdm_code\":null,\"student_name\":\"AGANZE DARCY\",\"first_name\":\"AGANZE\",\"last_name\":\"DARCY\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"WISDOM SCHOOL MUSANZE\"},\"selected_students\":[{\"student_id\":1,\"student_uid\":\"150010001\",\"student_code\":\"150010001\",\"sdm_code\":null,\"student_name\":\"AGANZE DARCY\",\"first_name\":\"AGANZE\",\"last_name\":\"DARCY\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"WISDOM SCHOOL MUSANZE\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kamana\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 519500.00, 'draft', '2026-04-15 06:29:57', 'Kamana', '250796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260415-00000075', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-29 08:29:58'),
(76, 2, 10, '{\"selected_fee_ids\":[17],\"selected_requirement_ids\":[81,82],\"selected_student\":{\"student_id\":66,\"student_uid\":\"110010001\",\"student_code\":\"110010001\",\"sdm_code\":null,\"student_name\":\"MANZI Cledo\",\"first_name\":\"MANZI\",\"last_name\":\"Cledo\",\"class_name\":\"S4\",\"academic_year\":\"2025-2026\",\"school_name\":\"GS RUKARA TSS\"},\"selected_students\":[{\"student_id\":66,\"student_uid\":\"110010001\",\"student_code\":\"110010001\",\"sdm_code\":null,\"student_name\":\"MANZI Cledo\",\"first_name\":\"MANZI\",\"last_name\":\"Cledo\",\"class_name\":\"S4\",\"academic_year\":\"2025-2026\",\"school_name\":\"GS RUKARA TSS\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kamana\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 23993.00, 'draft', '2026-04-15 07:11:08', 'Kamana', '250796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260415-00000076', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-29 09:11:09'),
(77, 2, 10, '{\"selected_fee_ids\":[17],\"selected_requirement_ids\":[81,82],\"selected_student\":{\"student_id\":66,\"student_uid\":\"110010001\",\"student_code\":\"110010001\",\"sdm_code\":null,\"student_name\":\"MANZI Cledo\",\"first_name\":\"MANZI\",\"last_name\":\"Cledo\",\"class_name\":\"S4\",\"academic_year\":\"2025-2026\",\"school_name\":\"GS RUKARA TSS\"},\"selected_students\":[{\"student_id\":66,\"student_uid\":\"110010001\",\"student_code\":\"110010001\",\"sdm_code\":null,\"student_name\":\"MANZI Cledo\",\"first_name\":\"MANZI\",\"last_name\":\"Cledo\",\"class_name\":\"S4\",\"academic_year\":\"2025-2026\",\"school_name\":\"GS RUKARA TSS\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Mhoro\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 4493.00, 'draft', '2026-04-15 07:12:44', 'Mhoro', '250796898894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'INV-20260415-00000077', 'DRAFT', NULL, NULL, NULL, NULL, '2026-04-29 09:23:12'),
(78, 1, 9, '{\"selected_fee_ids\":[16],\"selected_requirement_ids\":[48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80],\"selected_student\":{\"student_id\":1,\"student_uid\":\"150010001\",\"student_code\":\"150010001\",\"sdm_code\":null,\"student_name\":\"AGANZE DARCY\",\"first_name\":\"AGANZE\",\"last_name\":\"DARCY\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"WISDOM SCHOOL MUSANZE\"},\"selected_students\":[{\"student_id\":1,\"student_uid\":\"150010001\",\"student_code\":\"150010001\",\"sdm_code\":null,\"student_name\":\"AGANZE DARCY\",\"first_name\":\"AGANZE\",\"last_name\":\"DARCY\",\"class_name\":\"P1\",\"academic_year\":\"2025-2026\",\"school_name\":\"WISDOM SCHOOL MUSANZE\"}],\"payment_plan\":{\"method\":\"momo\",\"bankCode\":null,\"loanMonths\":null,\"incomeId\":null,\"loanFreq\":null,\"loanSummary\":null,\"loan_provider_category\":null,\"loan_purpose\":null,\"loan_disbursement_method\":null,\"loan_branch_note\":null,\"shule_avance\":null,\"bank_transfer\":null,\"visa_card\":null,\"momo\":{\"provider\":\"mtn\",\"phone\":\"250796898894\",\"referenceId\":null,\"financialTxId\":null,\"status\":\"PENDING\"},\"loan_request\":null},\"payer\":{\"name\":\"Kamana\",\"phone\":\"250796898894\",\"email\":null},\"public_pay_no_login\":true,\"from_public_finder\":true,\"from_school_mini_site\":false}', 9500.00, 'failed', '2026-04-15 07:18:48', 'Kamana', '250796898894', NULL, 'xentripay', 'FAILED', NULL, NULL, NULL, '{\"error\":\"Request failed with status code 403\"}', NULL, 0, NULL, 'INV-20260415-00000078', 'NOT_PAID', NULL, NULL, NULL, NULL, '2026-04-29 09:28:49');

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
(2, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/governement-logo-1774209297681.png', 'governement-logo.png', '/uploads/babyeyi/qrcodes/qr-BY-2025-00002-1774209304009.png', 'qr-BY-2025-00002-1774209304009.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00002'),
(3, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/governement-logo-1774607731085.png', 'governement-logo.png', '/uploads/babyeyi/qrcodes/qr-BY-2025-00003-1774607731368.png', 'qr-BY-2025-00003-1774607731368.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00003'),
(4, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00004-1775319566711.png', 'qr-BY-2025-00004-1775319566711.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00004'),
(5, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00005-1775464762775.png', 'qr-BY-2025-00005-1775464762775.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00005'),
(6, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00006-1775468607027.png', 'qr-BY-2025-00006-1775468607027.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00006'),
(7, 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/governement-logo-1775915331610.png', 'governement-logo.png', '/uploads/babyeyi/qrcodes/qr-BY-2025-00007-1775915339963.png', 'qr-BY-2025-00007-1775915339963.png', 'http://localhost:5173,http://localhost:5174/babyeyi/verify/BY-2025-00007'),
(8, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00008-1776031894131.png', 'qr-BY-2025-00008-1776031894131.png', 'http://localhost:5173,http://localhost:5174/babyeyi/verify/BY-2025-00008'),
(9, 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00009-1776195705602.png', 'qr-BY-2025-00009-1776195705602.png', 'http://localhost:5173,http://localhost:5174/babyeyi/verify/BY-2025-00009'),
(10, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00010-1776236885257.png', 'qr-BY-2025-00010-1776236885257.png', 'http://localhost:5173,http://localhost:5174/babyeyi/verify/BY-2025-00010');

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
(24, 2, 'Shoes and socks', 'one pair and four white socks', '1', NULL, 18),
(25, 3, 'Ream of paper', 'A4 Azhar', '2', NULL, 0),
(26, 3, 'Bottle for drinking water', 'one aluminium bottle', '1', NULL, 1),
(27, 3, 'Communication book', '96 pages', '5', NULL, 2),
(28, 3, 'Mathematical set', 'one set', '1', NULL, 3),
(29, 3, 'Ruler', 'three ruler', '3', NULL, 4),
(30, 4, 'Ream of paper', 'A4 Azhar', '1 ', NULL, 0),
(31, 4, 'Bottle for drinking water', 'Aluminium bottle', '1', NULL, 1),
(32, 4, 'Communication book', '96 Pages', '5', NULL, 2),
(33, 5, 'Colour pencils', 'All Colors', '5', NULL, 0),
(34, 5, 'Pens', 'Black and Blue Pens', '10', NULL, 1),
(35, 5, 'Sharpener, pencils and rubber', 'two per each ', '2', NULL, 2),
(36, 5, 'Calligraphy book', '96 pages', '5', NULL, 3),
(37, 6, 'Colour pencils', 'Black Pencils', '4', NULL, 0),
(38, 6, 'Pens', 'Black and Blue Pens', '10', NULL, 1),
(39, 6, 'Sharpener, pencils and rubber', 'two per each', '2', NULL, 2),
(40, 6, 'Calligraphy book', '96 pages', '10', NULL, 3),
(41, 7, 'Paper glue', NULL, '2', NULL, 0),
(42, 7, 'Lined notebook', '96 pages', '6', NULL, 1),
(43, 7, 'Drawing book', '128 pages', '3', NULL, 2),
(44, 7, 'School bag', 'one bag', '1', NULL, 3),
(45, 7, 'Shoes and socks', NULL, '1', NULL, 4),
(46, 8, 'Ream of paper', 'A4 Azhar Paper', '2', NULL, 0),
(47, 8, 'Bottle for drinking water', 'one', '1', NULL, 1),
(48, 9, 'Lined Exercise Books', '96 Pages', '12', NULL, 0),
(49, 9, 'NESA Books for the Learner', 'Maths or English or SRS or Kinyarwanda or Sciences', '2', NULL, 1),
(50, 9, 'Pencils', NULL, '12', NULL, 2),
(51, 9, 'Sharpeners', NULL, '2', NULL, 3),
(52, 9, 'Rubbers', NULL, '3', NULL, 4),
(53, 9, 'Ream of Paper', 'A4 Paper', '1', NULL, 5),
(54, 9, 'School bag', NULL, '1', NULL, 6),
(55, 9, 'Good News Bible + Hymn Book', 'one for each (1+1)  and paid at school 29000 frw', NULL, NULL, 7),
(56, 9, 'Bathing Soap', '4 Bars', '4', NULL, 8),
(57, 9, 'Washing Soap', '3 Tiges', '3', NULL, 9),
(58, 9, 'OMO Soap', '1 kg', '1', NULL, 10),
(59, 9, 'Brushes (Ikiroso)', NULL, '1', NULL, 11),
(60, 9, 'AMAFARANGA YO KUDODESHA', 'NITEGEKO KURI BURI MUNYESHURI (2000 frw)', NULL, NULL, 12),
(61, 9, 'Pair of Shoes', NULL, '2', NULL, 13),
(62, 9, 'sleepers', NULL, '1', NULL, 14),
(63, 9, 'sport shoes', NULL, '1', NULL, 15),
(64, 9, 'Towel', NULL, '1', NULL, 16),
(65, 9, 'Bucket', NULL, '1', NULL, 17),
(66, 9, 'Toilet papers', NULL, '6', NULL, 18),
(67, 9, 'Tooth Brushes', NULL, '2', NULL, 19),
(68, 9, 'Teeth paste', NULL, '2', NULL, 20),
(69, 9, 'Bottle of drinking water', NULL, '1', NULL, 21),
(70, 9, 'Pads for Girls(Packets)', NULL, '6', NULL, 22),
(71, 9, 'Nail Cutter', NULL, '1', NULL, 23),
(72, 9, 'Comb ', NULL, '1', NULL, 24),
(73, 9, ' Handkerchief(Mouchoirs)', NULL, '2', NULL, 25),
(74, 9, 'Pairs of bed sheets', NULL, '2', NULL, 26),
(75, 9, 'Blanket', NULL, '1', NULL, 27),
(76, 9, 'Bed cover', NULL, '1', NULL, 28),
(77, 9, 'Pair of socks(any color for boys and white color for girls)', NULL, '3', NULL, 29),
(78, 9, 'Recharge torch(not compulsory)', NULL, '1', NULL, 30),
(79, 9, 'School Jumper(not compulsory)', '20,000', '1', NULL, 31),
(80, 9, 'Mattress or Hire one at school', '10,000 per term(not compulsory)', '1', NULL, 32),
(81, 10, 'Communication book', '96 pages', '6', NULL, 0),
(82, 10, 'Mathematical set', 'one piece', '1', NULL, 1);

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
-- Table structure for table `field_agent_profiles`
--

CREATE TABLE `field_agent_profiles` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `province` varchar(120) NOT NULL,
  `district` varchar(120) NOT NULL,
  `all_sectors` tinyint(1) NOT NULL DEFAULT 0,
  `sectors_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`sectors_json`)),
  `national_id` varchar(64) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `field_agent_profiles`
--

INSERT INTO `field_agent_profiles` (`id`, `user_id`, `province`, `district`, `all_sectors`, `sectors_json`, `national_id`, `gender`, `date_of_birth`, `created_at`, `updated_at`) VALUES
(1, 34, 'Eastern Province', 'Kayonza', 0, '[\"Gahini\",\"Kabarondo\",\"Murama\",\"Mwiri\",\"Nyamirama\",\"Ruramira\",\"Rwinkwavu\"]', '1998654342343212', 'Male', '1998-02-02', '2026-04-02 19:46:07', '2026-04-02 19:46:07'),
(2, 35, 'Kigali City', 'Gasabo', 0, '[\"Kimironko\",\"Gikomero\",\"Jabana\",\"Remera\",\"Ndera\"]', '12005008765435426', 'Male', '2005-05-31', '2026-04-02 19:57:07', '2026-04-12 12:35:20');

-- --------------------------------------------------------

--
-- Table structure for table `field_agent_support_requests`
--

CREATE TABLE `field_agent_support_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `agent_user_id` int(10) UNSIGNED NOT NULL,
  `requester_name` varchar(160) NOT NULL,
  `requester_contact` varchar(80) NOT NULL,
  `requester_description` text NOT NULL,
  `province` varchar(120) NOT NULL,
  `district` varchar(120) NOT NULL,
  `sector` varchar(120) NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'NEW',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `field_agent_support_requests`
--

INSERT INTO `field_agent_support_requests` (`id`, `agent_user_id`, `requester_name`, `requester_contact`, `requester_description`, `province`, `district`, `sector`, `status`, `created_at`, `updated_at`) VALUES
(1, 35, 'Event Organizer', 'eventorganizer@gmail.com', 'I want to help me i have issue on our GS Kimironko II', 'Kigali City', 'Gasabo', 'Kimironko', 'NEW', '2026-04-10 09:29:40', '2026-04-10 09:29:40');

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
-- Table structure for table `momo_transactions`
--

CREATE TABLE `momo_transactions` (
  `id` int(10) UNSIGNED NOT NULL,
  `reference_id` char(36) NOT NULL,
  `external_id` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'RWF',
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `momo_status` varchar(30) DEFAULT NULL,
  `financial_tx_id` varchar(100) DEFAULT NULL,
  `payer_message` varchar(255) DEFAULT NULL,
  `payee_note` varchar(255) DEFAULT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `babyeyi_id` int(10) UNSIGNED DEFAULT NULL,
  `intent_id` int(10) UNSIGNED DEFAULT NULL,
  `raw_callback` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_callback`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `mtn_error` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `momo_transactions`
--

INSERT INTO `momo_transactions` (`id`, `reference_id`, `external_id`, `phone`, `amount`, `currency`, `status`, `momo_status`, `financial_tx_id`, `payer_message`, `payee_note`, `school_id`, `babyeyi_id`, `intent_id`, `raw_callback`, `created_at`, `updated_at`, `mtn_error`) VALUES
(1, '659d3fe4-81af-4afe-9f03-a5a82411e648', 'babyeyi-1-1774823107234', '250796898894', 998.00, 'RWF', 'FAILED', NULL, NULL, 'School fees P1 · Term 1 · 2025', 'Babyeyi ECOLE NOTRE DAME DES ANGES', 3, 1, NULL, NULL, '2026-03-29 22:25:07', '2026-03-29 22:25:10', NULL),
(2, 'b1689554-f8b6-4b80-961d-b3df9fe63649', 'babyeyi-1-1774823145614', '250795922165', 998.00, 'RWF', 'FAILED', NULL, NULL, 'School fees P1 · Term 1 · 2025', 'Babyeyi ECOLE NOTRE DAME DES ANGES', 3, 1, NULL, NULL, '2026-03-29 22:25:45', '2026-03-29 22:25:46', NULL),
(3, 'ead992db-6911-4774-ba89-9987845d42d8', 'babyeyi-3-1774823779511', '250796898894', 3000.00, 'RWF', 'FAILED', NULL, NULL, 'School fees P2 · Term 1 · 2025-2026', 'Babyeyi ECOLE NOTRE DAME DES ANGES', 3, 3, NULL, NULL, '2026-03-29 22:36:19', '2026-03-29 22:36:20', NULL),
(4, '8d1269a4-3446-4f56-9d80-759f8948d8be', 'babyeyi-3-1774824552898', '250796898894', 3000.00, 'RWF', 'FAILED', NULL, NULL, 'School fees P2 · Term 1 · 2025-2026', 'Babyeyi ECOLE NOTRE DAME DES ANGES', 3, 3, NULL, NULL, '2026-03-29 22:49:13', '2026-03-29 22:49:14', NULL),
(5, 'accf99ab-dd92-49d5-9497-087886bb05ac', 'babyeyi-3-1774824562069', '250796898894', 3000.00, 'RWF', 'FAILED', NULL, NULL, 'School fees P2 · Term 1 · 2025-2026', 'Babyeyi ECOLE NOTRE DAME DES ANGES', 3, 3, NULL, NULL, '2026-03-29 22:49:22', '2026-03-29 22:49:23', NULL),
(6, '673f00bc-5e64-40e4-9d55-d61e7df31f96', 'babyeyi-3-1774824579866', '250796898894', 3000.00, 'RWF', 'PENDING', NULL, NULL, 'School fees P2 · Term 1 · 2025-2026', 'Babyeyi ECOLE NOTRE DAME DES ANGES', 3, 3, NULL, NULL, '2026-03-29 22:49:40', '2026-03-29 22:49:40', NULL),
(7, '2249c70d-4198-41eb-9896-22b9b7a01541', 'babyeyi-3-1774825229947', '250796898894', 3000.00, 'RWF', 'FAILED', NULL, NULL, 'School fees P2 · Term 1 · 2025-2026', 'Babyeyi ECOLE NOTRE DAME DES ANGES', 3, 3, NULL, NULL, '2026-03-29 23:00:30', '2026-03-29 23:00:32', 'HTTP 400: ');

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
  `completed_registration_at` datetime DEFAULT NULL,
  `recovery_email` varchar(150) DEFAULT NULL,
  `phone_reset_token_hash` char(64) DEFAULT NULL,
  `phone_reset_expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `parent_portal_accounts`
--

INSERT INTO `parent_portal_accounts` (`id`, `phone`, `password_hash`, `father_full_name`, `mother_full_name`, `father_email`, `mother_email`, `created_at`, `updated_at`, `created_via_phone_only`, `completed_registration_at`, `recovery_email`, `phone_reset_token_hash`, `phone_reset_expires_at`) VALUES
(1, '0785944522', '$2b$10$CrhlpezY4ssyqObU.V78XetjQsi/prwLaRInI7S7.NWHpN9/W9P/C', 'Ishimwe Theoneste', NULL, 'ishimwetheo488@gmail.com', NULL, '2026-03-21 12:07:34', '2026-03-29 08:01:46', 0, NULL, NULL, NULL, NULL),
(2, '0793903844', '$2b$10$gpKEUpVcYm5fICT0SM4.qu2OtrujcqlqfLBxgxov2OZVyGmqHtdhy', 'SHEMA KATENDE', NULL, NULL, NULL, '2026-03-21 14:08:38', '2026-03-21 14:08:38', 0, NULL, NULL, NULL, NULL),
(3, '0788876345', '$2b$10$cEsfq3UvEUrd0.4Och4mw.AL6iMIM7tqL5Cwfn8y7dI92LwiAdJdy', 'Maneza Peter', NULL, NULL, NULL, '2026-03-23 14:57:31', '2026-03-23 14:57:31', 0, NULL, NULL, NULL, NULL),
(4, '0789678567', '$2b$10$TrBEv.4iJhtX4rXoH1Z7eurQExA1W5v8nhAL0GFSHx5iHaiVrs/qK', 'Muneza Peter', 'Muhoracyeye Veneranda', NULL, NULL, '2026-03-23 16:28:58', '2026-03-23 16:28:58', 1, '2026-03-23 16:28:58', NULL, NULL, NULL),
(5, '0791393175', '$2b$10$sKUaedsjS1WZZG/ZuJkDJuR3m7TSlYTB7Uo3iIlz5dAzqM1Z57Mza', 'Test', 'Parent', NULL, NULL, '2026-03-28 14:29:54', '2026-03-28 14:29:54', 0, NULL, NULL, NULL, NULL),
(6, '0790428835', '$2b$10$wZLMjUPDgkFFL1iCOTDNm.ETYrjlZQfzTAfz.v6LYYll8tqe2cray', 'Test', 'Parent', NULL, NULL, '2026-03-29 14:24:27', '2026-03-29 14:24:27', 0, NULL, NULL, NULL, NULL),
(7, '0790328835', '$2b$10$x/g/iuFjt4Qi3hl/WIrCb.4znm04GBDOgZrYQWpTvel1SFeq08ee6', 'Test', 'Parent', NULL, NULL, '2026-03-29 14:24:49', '2026-03-29 14:24:49', 0, NULL, NULL, NULL, NULL),
(8, '0788275628', '$2b$10$bsOv4Qkm.4jLed8mGvKtKuQBMrUJcIK6uYWiSYsKyR3z4Uvbup90G', 'BIZIMANA Jeadedie', 'NYICUMI Goltha', NULL, NULL, '2026-04-02 22:29:30', '2026-04-02 22:29:30', 1, '2026-04-02 22:29:30', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `permission_key` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `permission_key`, `description`) VALUES
(1, 'lite.dashboard.view', 'View Lite dashboard'),
(2, 'pro.dashboard.view', 'View Pro dashboard sections'),
(3, 'pro.attendance.view', 'View Pro attendance'),
(4, 'pro.attendance.manage', 'Manage Pro attendance'),
(5, 'pro.marks.view', 'View marks'),
(6, 'pro.marks.manage', 'Manage marks'),
(7, 'pro.timetable.view', 'View timetable'),
(8, 'pro.timetable.manage', 'Manage timetable'),
(9, 'pro.teacher_ai.use', 'Use teacher AI tools'),
(10, 'pro.iot.view', 'View IoT / biometric'),
(11, 'pro.student_permissions.manage', 'Manage student permissions'),
(12, 'pro.school_console.access', 'Access full school console (Lite toolkit) in Pro manager');

-- --------------------------------------------------------

--
-- Table structure for table `portal_operation_audit_logs`
--

CREATE TABLE `portal_operation_audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `role_code` varchar(64) DEFAULT NULL,
  `endpoint` varchar(180) DEFAULT NULL,
  `entity_type` varchar(64) DEFAULT NULL,
  `entity_id` varchar(80) DEFAULT NULL,
  `action_name` varchar(80) DEFAULT NULL,
  `after_state_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`after_state_json`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `portal_requisitions`
--

CREATE TABLE `portal_requisitions` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `created_by_user_id` int(10) UNSIGNED NOT NULL,
  `dept` varchar(120) DEFAULT NULL,
  `requester` varchar(180) DEFAULT NULL,
  `items` text NOT NULL,
  `amount_rwf` decimal(14,2) NOT NULL DEFAULT 0.00,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `attachment_name` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `source_portal` varchar(32) NOT NULL DEFAULT 'teacher',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `portal_ticha_ai_history`
--

CREATE TABLE `portal_ticha_ai_history` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `prompt` text NOT NULL,
  `response` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pro_shule_avance_applications`
--

CREATE TABLE `pro_shule_avance_applications` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `amount_requested` decimal(14,2) NOT NULL,
  `purpose` text DEFAULT NULL,
  `repayment_term_months` int(11) NOT NULL DEFAULT 6,
  `status` enum('pending','reviewed','disbursed','completed','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pro_shule_avance_organizations`
--

CREATE TABLE `pro_shule_avance_organizations` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `org_name` varchar(200) NOT NULL,
  `org_type` varchar(32) NOT NULL DEFAULT 'INTERNAL_PARTNER',
  `login_username` varchar(120) NOT NULL,
  `contact_person` varchar(180) DEFAULT NULL,
  `contact_email` varchar(180) NOT NULL,
  `contact_phone` varchar(40) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `applicant_categories_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Allowed applicant types e.g. ["PARENT","TEACHER"]' CHECK (json_valid(`applicant_categories_json`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pro_shule_avance_organizations`
--

INSERT INTO `pro_shule_avance_organizations` (`id`, `user_id`, `org_name`, `org_type`, `login_username`, `contact_person`, `contact_email`, `contact_phone`, `address`, `logo_url`, `description`, `notes`, `is_active`, `created_at`, `updated_at`, `applicant_categories_json`) VALUES
(1, 41, 'ZIGAMA CSS', 'BANK', 'zigama', 'MUNEZA Jean Claude', 'zigama@gmail.com', '0798699601', 'Amajyepfo', NULL, 'This is Bank that support Soldiers for ShuleAvance', NULL, 1, '2026-04-13 21:19:24', '2026-04-13 22:09:07', '[\"Soldiers\"]');

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
(19, NULL, 3, 'P2', 2, 'Term 1', '2025-2026', 2500.00, '2026-03-22 19:55:02', '2026-03-22 19:55:02', 24),
(20, NULL, 3, 'P2', 3, 'Term 1', '2025-2026', 5000.00, '2026-03-27 10:35:31', '2026-03-27 10:35:31', 25),
(21, NULL, 3, 'P2', 3, 'Term 1', '2025-2026', 3000.00, '2026-03-27 10:35:31', '2026-03-27 10:35:31', 26),
(22, NULL, 3, 'P2', 3, 'Term 1', '2025-2026', 499.00, '2026-03-27 10:35:31', '2026-03-27 10:35:31', 27),
(23, NULL, 3, 'P2', 3, 'Term 1', '2025-2026', 1499.00, '2026-03-27 10:35:31', '2026-03-27 10:35:31', 28),
(24, NULL, 3, 'P2', 3, 'Term 1', '2025-2026', 299.00, '2026-03-27 10:35:31', '2026-03-27 10:35:31', 29),
(25, NULL, 2, 'S1', 4, 'Term 1', '2025-2026', 5000.00, '2026-04-04 16:19:01', '2026-04-04 16:19:01', 30),
(26, NULL, 2, 'S1', 4, 'Term 1', '2025-2026', 3000.00, '2026-04-04 16:19:01', '2026-04-04 16:19:01', 31),
(27, NULL, 2, 'S1', 4, 'Term 1', '2025-2026', 499.00, '2026-04-04 16:19:01', '2026-04-04 16:19:01', 32),
(28, NULL, 3, 'P5', 5, 'Term 1', '2025-2026', 1000.00, '2026-04-06 08:39:10', '2026-04-06 08:39:10', 33),
(29, NULL, 3, 'P5', 5, 'Term 1', '2025-2026', 199.00, '2026-04-06 08:39:10', '2026-04-06 08:39:10', 34),
(30, NULL, 3, 'P5', 5, 'Term 1', '2025-2026', 499.00, '2026-04-06 08:39:10', '2026-04-06 08:39:10', 35),
(31, NULL, 3, 'P5', 5, 'Term 1', '2025-2026', 399.00, '2026-04-06 08:39:10', '2026-04-06 08:39:10', 36),
(32, NULL, 3, 'P1', 6, 'Term 1', '2025-2026', 1000.00, '2026-04-06 09:42:32', '2026-04-06 09:42:32', 37),
(33, NULL, 3, 'P1', 6, 'Term 1', '2025-2026', 199.00, '2026-04-06 09:42:32', '2026-04-06 09:42:32', 38),
(34, NULL, 3, 'P1', 6, 'Term 1', '2025-2026', 499.00, '2026-04-06 09:42:32', '2026-04-06 09:42:32', 39),
(35, NULL, 3, 'P1', 6, 'Term 1', '2025-2026', 399.00, '2026-04-06 09:42:32', '2026-04-06 09:42:32', 40),
(36, NULL, 3, 'P5', 7, 'Term 3', '2025-2026', 1999.00, '2026-04-11 13:48:52', '2026-04-11 13:48:52', 41),
(37, NULL, 3, 'P5', 7, 'Term 3', '2025-2026', 400.00, '2026-04-11 13:48:52', '2026-04-11 13:48:52', 42),
(38, NULL, 3, 'P5', 7, 'Term 3', '2025-2026', 499.00, '2026-04-11 13:48:52', '2026-04-11 13:48:52', 43),
(39, NULL, 3, 'P5', 7, 'Term 3', '2025-2026', 4500.00, '2026-04-11 13:48:52', '2026-04-11 13:48:52', 44),
(40, NULL, 3, 'P5', 7, 'Term 3', '2025-2026', 2500.00, '2026-04-11 13:48:52', '2026-04-11 13:48:52', 45),
(41, NULL, 11, 'P1', 8, 'Term 1', '2025-2026', 5000.00, '2026-04-12 22:11:33', '2026-04-12 22:11:33', 46),
(42, NULL, 11, 'P1', 8, 'Term 1', '2025-2026', 3000.00, '2026-04-12 22:11:33', '2026-04-12 22:11:33', 47),
(43, NULL, 1, 'P1', 9, 'Term 1', '2025-2026', 5000.00, '2026-04-14 19:41:45', '2026-04-14 19:41:45', 53),
(44, NULL, 1, 'P1', 9, 'Term 1', '2025-2026', 4500.00, '2026-04-14 19:41:45', '2026-04-14 19:41:45', 54),
(45, NULL, 2, 'S4', 10, 'Term 1', '2025-2026', 499.00, '2026-04-15 07:08:05', '2026-04-15 07:08:05', 81),
(46, NULL, 2, 'S4', 10, 'Term 1', '2025-2026', 1499.00, '2026-04-15 07:08:05', '2026-04-15 07:08:05', 82);

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
(13, 'District Education Officer', 'DEO', 'District Babyeyi portal access', '[\"babyeyi.deo\",\"babyeyi.view\"]', 1, 0, '2026-03-06 06:07:04', '2026-03-06 06:07:04'),
(14, 'Full System Controller', 'FULL_SYSTEM_CONTROLLER', 'Platform-wide control — uses the System Controller dashboard (not the Super Admin UI)', '[\"*\"]', 1, 1, '2026-03-28 21:43:42', '2026-03-28 21:43:42'),
(15, 'Field Agent', 'AGENT', 'Regional field coverage for schools and fees', '[]', 1, 0, '2026-04-02 21:40:49', '2026-04-02 21:40:49'),
(16, 'ShuleAvance Partner', 'SHULE_AVANCE_PARTNER', 'Financing partner — reviews ShuleAvance requests routed to their organization', '[]', 1, 1, '2026-04-13 21:14:42', '2026-04-13 21:14:42');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `permission_key` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_id`, `permission_key`) VALUES
(48, 1, 'lite.dashboard.view'),
(50, 1, 'pro.attendance.manage'),
(52, 1, 'pro.attendance.view'),
(54, 1, 'pro.dashboard.view'),
(56, 1, 'pro.iot.view'),
(58, 1, 'pro.marks.manage'),
(60, 1, 'pro.marks.view'),
(62, 1, 'pro.student_permissions.manage'),
(64, 1, 'pro.teacher_ai.use'),
(66, 1, 'pro.timetable.manage'),
(68, 1, 'pro.timetable.view'),
(1, 2, 'lite.dashboard.view'),
(4, 2, 'pro.attendance.manage'),
(3, 2, 'pro.attendance.view'),
(2, 2, 'pro.dashboard.view'),
(6, 2, 'pro.marks.manage'),
(5, 2, 'pro.marks.view'),
(78, 2, 'pro.school_console.access'),
(8, 2, 'pro.timetable.manage'),
(7, 2, 'pro.timetable.view'),
(31, 3, 'lite.dashboard.view'),
(35, 3, 'pro.attendance.view'),
(33, 3, 'pro.dashboard.view'),
(37, 3, 'pro.marks.view'),
(39, 3, 'pro.timetable.view'),
(32, 4, 'lite.dashboard.view'),
(36, 4, 'pro.attendance.view'),
(34, 4, 'pro.dashboard.view'),
(38, 4, 'pro.marks.view'),
(40, 4, 'pro.timetable.view'),
(46, 8, 'lite.dashboard.view'),
(16, 11, 'lite.dashboard.view'),
(19, 11, 'pro.attendance.manage'),
(18, 11, 'pro.attendance.view'),
(17, 11, 'pro.dashboard.view'),
(21, 11, 'pro.marks.manage'),
(20, 11, 'pro.marks.view'),
(23, 11, 'pro.timetable.manage'),
(22, 11, 'pro.timetable.view'),
(47, 14, 'lite.dashboard.view'),
(49, 14, 'pro.attendance.manage'),
(51, 14, 'pro.attendance.view'),
(53, 14, 'pro.dashboard.view'),
(55, 14, 'pro.iot.view'),
(57, 14, 'pro.marks.manage'),
(59, 14, 'pro.marks.view'),
(61, 14, 'pro.student_permissions.manage'),
(63, 14, 'pro.teacher_ai.use'),
(65, 14, 'pro.timetable.manage'),
(67, 14, 'pro.timetable.view');

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
  `is_skeleton` tinyint(1) NOT NULL DEFAULT 0,
  `tvet_trades` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tvet_trades`)),
  `subscription_plan` enum('lite','pro') NOT NULL DEFAULT 'lite',
  `pro_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `pro_start_date` datetime DEFAULT NULL,
  `pro_end_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Schools registered in the babyeyi system';

--
-- Dumping data for table `schools`
--

INSERT INTO `schools` (`id`, `school_name`, `school_code`, `education_levels`, `school_category`, `school_status`, `ownership_type`, `year_established`, `province`, `district`, `sector`, `cell`, `village`, `full_address`, `map_url`, `phone`, `email`, `postal_address`, `website`, `head_teacher_name`, `head_teacher_phone`, `head_teacher_email`, `deputy_head_name`, `logo_url`, `head_signature_url`, `school_stamp_url`, `manager_user_id`, `admin_id`, `status`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `district_code`, `a_level_combinations`, `is_skeleton`, `tvet_trades`, `subscription_plan`, `pro_enabled`, `pro_start_date`, `pro_end_date`) VALUES
(1, 'WISDOM SCHOOL MUSANZE', '001', '[\"nursery\",\"primary\",\"o_level\",\"a_level\",\"tvet\"]', 'Day & Boarding', 'active', 'Private', '2026', 'Northern Province', 'Musanze', 'Cyuve', 'Cyuve', 'Cyuve', 'Cyuve, Musanze, Northern Province', NULL, '+250-788-478469', 'info@wisdomschoolrwanda.com', 'P.O. BOX 05, MUSANZE RWANDA', 'https://www.wisdomschoolrwanda.com/', 'NDUWAYESU Elie', '+250-788-478469', 'pending+001@school.babyeyi.local', NULL, '/uploads/school-logos/Wisdom-logo-1776188178398-285697800.jpg', '/uploads/school-signatures/signature-1776188178401-952935868.png', '/uploads/school-stamps/stamp2-1776188178402-420579889.jpg', 43, NULL, 'active', 1, '2026-04-14 19:32:26', '2026-04-15 09:22:08', NULL, '15', '[\"PCM\",\"PCB\",\"MCB\",\"MPC\",\"HEG\",\"MCE\",\"MEG\",\"ACCOUNTING\"]', 0, '[\"Software Development\"]', 'pro', 1, '2026-04-15 09:22:00', NULL),
(2, 'GS RUKARA TSS', '11001', '[\"tvet\"]', 'Day', 'active', 'Government-Aided', '2026', 'Eastern Province', 'Kayonza', 'Rukara', 'Rukara', 'Rukara', 'Rukara, Kayonza, Eastern Province', NULL, '0796898895', 'gsrukaratss@gmail.com', NULL, NULL, 'IZERE Peter', '0788676545', 'pending+11001@school.babyeyi.local', NULL, '/uploads/school-logos/modern-school-1776234061427-123178778.jpg', '/uploads/school-signatures/signature3-1776234061428-574978316.png', '/uploads/school-stamps/stamp2-1776234061428-238388025.jpg', 44, NULL, 'active', 1, '2026-04-15 08:18:40', '2026-04-15 09:22:00', NULL, '11', NULL, 0, '[\"Electrical Technology L3-5\",\"Building Construction L3-5\"]', 'pro', 1, '2026-04-15 09:21:00', NULL);

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
  `academic_year` varchar(9) NOT NULL,
  `education_level` varchar(50) NOT NULL COMMENT 'nursery|primary|o_level|a_level|tvet',
  `school_category` varchar(50) NOT NULL,
  `ownership_type` varchar(50) DEFAULT NULL,
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
  `banks_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`banks_json`)),
  `translations_json` longtext DEFAULT NULL,
  `content_i18n` longtext DEFAULT NULL,
  `translation_status` varchar(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='School fee declaration records with HMAC-SHA256 QR integrity';

--
-- Dumping data for table `school_babyeyi`
--

INSERT INTO `school_babyeyi` (`id`, `doc_id`, `school_id`, `school_name`, `school_code`, `school_sector`, `school_district`, `school_province`, `class_name`, `classes_json`, `term`, `academic_year`, `education_level`, `school_category`, `ownership_type`, `payments`, `parent_message`, `total_amount`, `bank_name`, `bank_account_no`, `bank_branch`, `head_teacher_name`, `integrity_hash`, `qr_payload`, `qr_code_url`, `pdf_url`, `school_logo_url`, `supporting_doc_url`, `status`, `submitted_at`, `deo_status`, `deo_name`, `deo_title`, `deo_notes`, `deo_reviewed_at`, `approval_document_url`, `rejection_document_url`, `deo_signature_url`, `deo_stamp_url`, `created_at`, `updated_at`, `deleted_at`, `is_active`, `exceeds_limit`, `total_fee`, `nesa_limit`, `qr_code_path`, `qr_view_url`, `pdf_path`, `pdf_name`, `banks_json`, `translations_json`, `content_i18n`, `translation_status`) VALUES
(1, 'BY-2025-00001', 3, 'ECOLE NOTRE DAME DES ANGES', '003', 'Remera', 'Gasabo', 'Kigali City', 'P1', '[\"P1\"]', 'Term 1', '2025', 'Primary', 'Private', '', '[{\"name\":\"Tuition Fee\",\"amount\":\"50000\"},{\"name\":\"Transport Fee\",\"amount\":\"30000\"}]', 'Dear Parents and Guardians,\r\n\r\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\r\n\r\nThank you for your continued support.', 80000.00, 'Umwalimu SACCO', '000783673267256', NULL, NULL, 'fe3b5955ca8ff719', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-22 20:03:26', '2026-04-06 11:39:41', NULL, 0, 0, 80000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00001-1774202606368.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00001', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00001-1774202606465.pdf', 'babyeyi-BY-2025-00001-1774202606465.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"000783673267256\",\"accountName\":\"ECOLE NOTRE DAME DES ANGES\",\"isPrimary\":true},{\"bankName\":\"Bank of Kigali (BK)\",\"accountNumber\":\"100067677636767\",\"accountName\":\"ecole-notre-dame-des-angels-bk\",\"isPrimary\":false}]', NULL, NULL, NULL),
(2, 'BY-2025-00002', 3, 'ECOLE NOTRE DAME DES ANGES', '003', 'Remera', 'Gasabo', 'Kigali City', 'P2', '[\"P2\"]', 'Term 1', '2025', 'Primary', 'Private', '', '[{\"name\":\"Tuition Fee\",\"amount\":\"60000\"},{\"name\":\"Transport Fee\",\"amount\":\"40000\"}]', 'Dear Parents and Guardians,\r\n\r\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\r\n\r\nThank you for your continued support.', 100000.00, 'Umwalimu SACCO', '000663476436476', NULL, NULL, 'cf619be2ec6a6ad1', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-22 21:54:58', '2026-03-27 12:33:16', NULL, 0, 0, 100000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00002-1774209304009.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00002', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00002-1774209305169.pdf', 'babyeyi-BY-2025-00002-1774209305169.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"000663476436476\",\"accountName\":\"ECOLE NOTRE DAME DES ANGES\",\"isPrimary\":true},{\"bankName\":\"Bank of Kigali (BK)\",\"accountNumber\":\"1008877345673\",\"accountName\":\"ecole-notre-dame-angels-bk\",\"isPrimary\":false}]', NULL, NULL, NULL),
(3, 'BY-2025-00003', 3, 'ECOLE NOTRE DAME DES ANGES', '003', 'Remera', 'Gasabo', 'Kigali City', 'P2', '[\"P2\",\"P3\",\"P4\"]', 'Term 1', '2025-2026', 'Primary', 'Private', NULL, '[{\"name\":\"Tuition Fee\",\"amount\":\"120000\"},{\"name\":\"Transport Fee\",\"amount\":\"80000\"}]', 'Dear Parents and Guardians,\r\n\r\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\r\n\r\nThank you for your continued support.', 200000.00, 'Umwalimu SACCO', '0008778767656767', NULL, NULL, 'efb9770b3d3fafa2', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-27 12:35:31', '2026-03-27 12:35:32', NULL, 1, 0, 200000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00003-1774607731368.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00003', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00003-1774607731621.pdf', 'babyeyi-BY-2025-00003-1774607731621.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"0008778767656767\",\"accountName\":\"ECOLE NOTRE DAME DES ANGES\",\"isPrimary\":true}]', NULL, NULL, NULL),
(4, 'BY-2025-00004', 2, 'GS REMERA', '002', 'Remera', 'Gasabo', 'Kigali City', 'S1', '[\"S1\"]', 'Term 1', '2025-2026', 'Secondary', 'Public', NULL, '[{\"name\":\"Tuition Fee\",\"amount\":\"19500\"}]', 'Dear Parents and Guardians,\r\n\r\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\r\n\r\nThank you for your continued support.', 19500.00, 'Umwalimu SACCO', '00437843784376', NULL, NULL, '631c4e001779b2d1', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-04 18:19:01', '2026-04-15 08:24:36', NULL, 0, 0, 19500.00, 19500.00, '/uploads/babyeyi/qrcodes/qr-BY-2025-00004-1775319566711.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00004', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00004-1775319567198.pdf', 'babyeyi-BY-2025-00004-1775319567198.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"00437843784376\",\"accountName\":\"GS REMERA\",\"isPrimary\":true},{\"bankName\":\"Bank of Kigali (BK)\",\"accountNumber\":\"100078788767\",\"accountName\":\"remera-bk\",\"isPrimary\":false}]', '{\"v\":1,\"source\":\"en\",\"generatedAt\":\"2026-04-04T16:19:02.024Z\",\"freeTier\":true,\"translationEngine\":\"mymemory\",\"en\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\"],\"reqItems\":[\"Ream of paper\",\"Bottle for drinking water\",\"Communication book\"],\"reqDescs\":[\"A4 Azhar\",\"Aluminium bottle\",\"96 Pages\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Students Must come on time\",\"Students must have full uniform\"],\"otherDetails\":[\"\",\"\"],\"leaderNames\":[\"Kamana Jean Pierre\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":1,\"reqs\":3,\"notes\":1,\"others\":2,\"leaders\":1}},\"rw\":{\"parentMessage\":\"Babyeyi namwe barinzi,\\r\\n\\r\\nTwishimiye kubamenyesha amafaranga y\'ishuri azishyurwa mu gihembwe gitaha. Shaka ibisobanuro birambuye hano hasi.\\r\\n\\r\\nNdabashimira ko mukomeje kudushyigikira.\",\"paymentNames\":[\"< Uburemere UTSINDAGIYE\"],\"reqItems\":[\"Bya\",\"Icupa ry\'amazi yo kunywa\",\"Igitabo\"],\"reqDescs\":[\"Paper size\",\"Agacupa ka aluminiyumu\",\"96 Amapaji\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Abanyeshuri basoje amasomo ku gihe\",\"Abanyeshuri bagomba kuba bambaye impuzankano yuzuye\"],\"otherDetails\":[\"\",\"\"],\"leaderNames\":[\"Kamana Jean Pierre\"],\"leaderRoles\":[\"Umwarimu / umuyobozi mukuru\"],\"counts\":{\"payments\":1,\"reqs\":3,\"notes\":1,\"others\":2,\"leaders\":1}},\"fr\":{\"parentMessage\":\"Chers parents et tuteurs,\\r\\n\\r\\nNous avons le plaisir de vous informer des frais de scolarité pour le trimestre à venir. Veuillez trouver le détail ci-dessous.\\r\\n\\r\\nMerci pour votre soutien continu.\",\"paymentNames\":[\"Droits de scolarité\"],\"reqItems\":[\"1 ramette de papier\",\"Bouteille d\'eau potable\",\"Cahier de communication\"],\"reqDescs\":[\"A4 Azhar\",\"Bouteille en aluminium.\",\"96 pages.\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Les étudiants doivent arriver à l\'heure\",\"Les étudiants doivent avoir un uniforme complet\"],\"otherDetails\":[\"\",\"\"],\"leaderNames\":[\"Kamana Jean Pierre\"],\"leaderRoles\":[\"Professeur principal / Directeur\"],\"counts\":{\"payments\":1,\"reqs\":3,\"notes\":1,\"others\":2,\"leaders\":1}}}', NULL, NULL),
(5, 'BY-2025-00005', 3, 'ECOLE NOTRE DAME DES ANGES', '003', 'Remera', 'Gasabo', 'Kigali City', 'P5', '[\"P5\"]', 'Term 1', '2025-2026', 'Primary', 'Private', NULL, '[{\"name\":\"Tuition Fee\",\"amount\":\"100000\"},{\"name\":\"Transport Fee\",\"amount\":\"50000\"}]', 'Dear Parents,\r\nThank you for your trust, support, and dedication during this term. Together, we have helped our students grow academically and morally.\r\n\r\nWe are grateful for your collaboration and look forward to achieving even greater success in the coming term.\r\n\r\nWishing you a joyful holiday.', 150000.00, 'Umwalimu SACCO', '10006756565234', NULL, NULL, '2c8caaabd6a48248', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-06 10:39:10', '2026-04-11 15:49:42', NULL, 0, 0, 150000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00005-1775464762775.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00005', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00005-1775464762915.pdf', 'babyeyi-BY-2025-00005-1775464762915.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"10006756565234\",\"accountName\":\"ECOLE NOTRE DAME DES ANGES\",\"isPrimary\":true},{\"bankName\":\"Bank of Kigali (BK)\",\"accountNumber\":\"1007876676555545\",\"accountName\":\"ecole-bk\",\"isPrimary\":false}]', '{\"v\":1,\"source\":\"en\",\"generatedAt\":\"2026-04-06T08:39:10.391Z\",\"freeTier\":true,\"translationEngine\":\"mymemory\",\"en\":{\"parentMessage\":\"Dear Parents,\\r\\nThank you for your trust, support, and dedication during this term. Together, we have helped our students grow academically and morally.\\r\\n\\r\\nWe are grateful for your collaboration and look forward to achieving even greater success in the coming term.\\r\\n\\r\\nWishing you a joyful holiday.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Colour pencils\",\"Pens\",\"Sharpener, pencils and rubber\",\"Calligraphy book\"],\"reqDescs\":[\"All Colors\",\"Black and Blue Pens\",\"two per each\",\"96 pages\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Students must follow school rules: respect others, be punctual, wear uniform, and maintain discipline at all times.\"],\"otherDetails\":[\"\"],\"leaderNames\":[\"KAMANA Jean Pierre\",\"UWINEZA Marie Clare\"],\"leaderRoles\":[\"Head Teacher / Director\",\"School Bursar / Economist\"],\"counts\":{\"payments\":2,\"reqs\":4,\"notes\":1,\"others\":1,\"leaders\":2}},\"rw\":{\"parentMessage\":\"Babyeyi dukunda,\\r\\nMbashimiye icyizere, ubwitange n\'ubwitange mwagize muri iki gikorwa. Dufatanyije, twafashije abana bacu gukura mu buryo bw\'umwuka no mu buryo bw\'umwuka.\\r\\n\\r\\nTurabashimiye ku bufatanye bwanyu kandi twizeye ko mu myaka iri imbere muzarushaho gutera imbere.\\r\\n\\r\\nMbifurije umunsi mwiza w\'ikiruhuko.\",\"paymentNames\":[\"< Uburemere UTSINDAGIYE\",\"Igiciro cy\'ubwikorezi\"],\"reqItems\":[\"Colour pencils\",\"Pens\",\"Sharpener, pencils and rubber\",\"Calligraphy book\"],\"reqDescs\":[\"All Colors\",\"Black and Blue Pens\",\"two per each\",\"96 pages\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Abanyeshuri bagomba kubahiriza amategeko y\'ishuri: kubaha abandi, kubahiriza igihe, kwambara umwambaro w\'ishuri no guhanahana igihe cyose.\"],\"otherDetails\":[\"\"],\"leaderNames\":[\"KAMANA Jean Pierre\",\"UWINEZA Marie Clare\"],\"leaderRoles\":[\"Umwarimu / umuyobozi mukuru\",\"Bye Bye Bursar / Economist\"],\"counts\":{\"payments\":2,\"reqs\":4,\"notes\":1,\"others\":1,\"leaders\":2}},\"fr\":{\"parentMessage\":\"Chers parents,\\r\\nMerci pour votre confiance, votre soutien et votre dévouement au cours de ce trimestre. Ensemble, nous avons aidé nos étudiants à grandir académiquement et moralement.\\r\\n\\r\\nNous sommes reconnaissants de votre collaboration et sommes impatients de connaître encore plus de succès au cours du prochain trimestre.\\r\\n\\r\\nJe vous souhaite de joyeuses vacances.\",\"paymentNames\":[\"Droits de scolarité\",\"Montant Transport\"],\"reqItems\":[\"Colour pencils\",\"Pens\",\"Sharpener, pencils and rubber\",\"Calligraphy book\"],\"reqDescs\":[\"All Colors\",\"Black and Blue Pens\",\"two per each\",\"96 pages\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Les élèves doivent suivre les règles de l\'école : respecter les autres, être ponctuels, porter l\'uniforme et maintenir la discipline en tout temps.\"],\"otherDetails\":[\"\"],\"leaderNames\":[\"KAMANA Jean Pierre\",\"UWINEZA Marie Clare\"],\"leaderRoles\":[\"Professeur principal / Directeur\",\"Éducateur/ économiste\"],\"counts\":{\"payments\":2,\"reqs\":4,\"notes\":1,\"others\":1,\"leaders\":2}}}', NULL, NULL),
(6, 'BY-2025-00006', 3, 'ECOLE NOTRE DAME DES ANGES', '003', 'Remera', 'Gasabo', 'Kigali City', 'P1', '[\"P1\"]', 'Term 1', '2025-2026', 'Primary', 'Private', NULL, '[{\"name\":\"Tuition Fee\",\"amount\":\"100000\"},{\"name\":\"Transport Fee\",\"amount\":\"50000\"}]', 'Dear Parents/Guardians,\r\nWe sincerely thank you for your continuous support, cooperation, and commitment throughout this term. Your involvement plays a vital role in the success, discipline, and academic growth of our students.\r\n\r\nWe truly appreciate your partnership with the school, and we look forward to continuing this journey together.\r\n\r\nMay you enjoy a peaceful and safe holiday.', 150000.00, 'Umwalimu SACCO', '00098887456725', NULL, NULL, '3ffda9731eb6af2e', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-06 11:42:32', '2026-04-06 11:43:27', NULL, 1, 0, 150000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00006-1775468607027.png', 'http://localhost:5174/babyeyi/verify/BY-2025-00006', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00006-1775468607102.pdf', 'babyeyi-BY-2025-00006-1775468607102.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"00098887456725\",\"accountName\":\"ECOLE NOTRE DAME DES ANGES\",\"isPrimary\":true},{\"bankName\":\"Bank of Kigali (BK)\",\"accountNumber\":\"100743648745673\",\"accountName\":\"ecolenotre-bk\",\"isPrimary\":false}]', '{\"v\":2,\"source\":\"en\",\"generatedAt\":\"2026-04-06T09:42:32.506Z\",\"freeTier\":false,\"translationEngine\":\"static-i18n\",\"en\":{\"parentMessage\":\"Dear Parents/Guardians,\\r\\nWe sincerely thank you for your continuous support, cooperation, and commitment throughout this term. Your involvement plays a vital role in the success, discipline, and academic growth of our students.\\r\\n\\r\\nWe truly appreciate your partnership with the school, and we look forward to continuing this journey together.\\r\\n\\r\\nMay you enjoy a peaceful and safe holiday.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Colour pencils\",\"Pens\",\"Sharpener, pencils and rubber\",\"Calligraphy book\"],\"reqDescs\":[\"Black Pencils\",\"Black and Blue Pens\",\"two per each\",\"96 pages\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"\"],\"otherDetails\":[\"\"],\"leaderNames\":[\"KAMANA Jean Pierre\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":2,\"reqs\":4,\"notes\":1,\"others\":1,\"leaders\":1}},\"rw\":{\"parentMessage\":\"Dear Parents/Guardians,\\r\\nWe sincerely thank you for your continuous support, cooperation, and commitment throughout this term. Your involvement plays a vital role in the success, discipline, and academic growth of our students.\\r\\n\\r\\nWe truly appreciate your partnership with the school, and we look forward to continuing this journey together.\\r\\n\\r\\nMay you enjoy a peaceful and safe holiday.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Colour pencils\",\"Pens\",\"Sharpener, pencils and rubber\",\"Calligraphy book\"],\"reqDescs\":[\"Black Pencils\",\"Black and Blue Pens\",\"two per each\",\"96 pages\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"\"],\"otherDetails\":[\"\"],\"leaderNames\":[\"KAMANA Jean Pierre\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":2,\"reqs\":4,\"notes\":1,\"others\":1,\"leaders\":1}},\"fr\":{\"parentMessage\":\"Dear Parents/Guardians,\\r\\nWe sincerely thank you for your continuous support, cooperation, and commitment throughout this term. Your involvement plays a vital role in the success, discipline, and academic growth of our students.\\r\\n\\r\\nWe truly appreciate your partnership with the school, and we look forward to continuing this journey together.\\r\\n\\r\\nMay you enjoy a peaceful and safe holiday.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Colour pencils\",\"Pens\",\"Sharpener, pencils and rubber\",\"Calligraphy book\"],\"reqDescs\":[\"Black Pencils\",\"Black and Blue Pens\",\"two per each\",\"96 pages\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"\"],\"otherDetails\":[\"\"],\"leaderNames\":[\"KAMANA Jean Pierre\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":2,\"reqs\":4,\"notes\":1,\"others\":1,\"leaders\":1}}}', '{\"v\":3,\"sourceLang\":\"en\",\"generatedAt\":\"2026-04-06T09:43:26.989Z\",\"status\":\"complete\",\"engine\":\"mymemory\",\"parentMessage\":{\"en\":\"Dear Parents/Guardians,\\r\\nWe sincerely thank you for your continuous support, cooperation, and commitment throughout this term. Your involvement plays a vital role in the success, discipline, and academic growth of our students.\\r\\n\\r\\nWe truly appreciate your partnership with the school, and we look forward to continuing this journey together.\\r\\n\\r\\nMay you enjoy a peaceful and safe holiday.\",\"rw\":\"Babyeyi/Barinzi dukunda,\\r\\nTubashimiye byimazeyo ubufatanye, ubufatanye n\'ubwitange mukomeje kutugaragariza muri iki gikorwa. Uruhare rwanyu rugira uruhare runini mu iterambere ry\'abanyeshuri bacu, mu myigire yabo, mu myigire yabo no mu myigire yabo.\\r\\n\\r\\nTwishimiye ubufatanye bwanyu n\'ishuri, kandi twishimiye gukomeza uru rugendo hamwe.\\r\\n\\r\\nMbifurije umunsi mwiza w\'ikiruhuko n\'amahoro.\",\"fr\":\"Chers parents/tuteurs,\\r\\nNous vous remercions sincèrement pour votre soutien, votre coopération et votre engagement continus tout au long de ce mandat. Votre implication joue un rôle essentiel dans la réussite, la discipline et la croissance académique de nos étudiants.\\r\\n\\r\\nNous apprécions vraiment votre partenariat avec l\'école et nous sommes impatients de poursuivre ce voyage ensemble.\\r\\n\\r\\nPuissiez-vous passer des vacances paisibles et sûres.\"},\"payments\":[{\"en\":\"Tuition Fee\",\"rw\":\"< Uburemere UTSINDAGIYE\",\"fr\":\"Droits de scolarité\"},{\"en\":\"Transport Fee\",\"rw\":\"Igiciro cy\'ubwikorezi\",\"fr\":\"Montant Transport\"}],\"requirements\":[{\"item\":{\"en\":\"Colour pencils\",\"rw\":\"Ibara\",\"fr\":\"Crayons de couleur\"},\"description\":{\"en\":\"Black Pencils\",\"rw\":\"Agashushondanga k\'umukara\",\"fr\":\"Crayons noirs\"}},{\"item\":{\"en\":\"Pens\",\"rw\":\"Ibikarito\",\"fr\":\"Stylos\"},\"description\":{\"en\":\"Black and Blue Pens\",\"rw\":\"Umukara na Ubururu\",\"fr\":\"Lividité\"}},{\"item\":{\"en\":\"Sharpener, pencils and rubber\",\"rw\":\"Igituba, Ibituba and Igituba\",\"fr\":\"Taille-crayons, crayons et caoutchouc\"},\"description\":{\"en\":\"two per each\",\"rw\":\"babiri kuri buri umwe\",\"fr\":\"deux par\"}},{\"item\":{\"en\":\"Calligraphy book\",\"rw\":\"Bye Bye Caligraphy Book\",\"fr\":\"Livre de calligraphie\"},\"description\":{\"en\":\"96 pages\",\"rw\":\"96 Amapaji\",\"fr\":\"96 pages.\"}}],\"classNotes\":[],\"otherInfos\":[],\"leaders\":[{\"role\":{\"en\":\"Head Teacher / Director\",\"rw\":\"Umwarimu / umuyobozi mukuru\",\"fr\":\"Professeur principal / Directeur\"}}]}', 'complete'),
(7, 'BY-2025-00007', 3, 'ECOLE NOTRE DAME DES ANGES', '003', 'Remera', 'Gasabo', 'Kigali City', 'P5', '[\"P5\"]', 'Term 3', '2025-2026', 'Primary', 'Private', NULL, '[{\"name\":\"Tuition Fee\",\"amount\":\"150000\"},{\"name\":\"Transport Fee\",\"amount\":\"50000\"}]', 'Dear Parents and Guardians,\r\n\r\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\r\n\r\nThank you for your continued support.', 200000.00, 'Umwalimu SACCO', '00004524534324324', NULL, NULL, 'd4d50b75433d9f7e', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-11 15:48:51', '2026-04-11 15:49:39', NULL, 1, 0, 200000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00007-1775915339963.png', 'http://localhost:5173,http://localhost:5174/babyeyi/verify/BY-2025-00007', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00007-1775915350726.pdf', 'babyeyi-BY-2025-00007-1775915350726.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"00004524534324324\",\"accountName\":\"ECOLE NOTRE DAME DES ANGES\",\"isPrimary\":true}]', '{\"v\":2,\"source\":\"en\",\"generatedAt\":\"2026-04-11T13:48:54.971Z\",\"freeTier\":false,\"translationEngine\":\"static-i18n\",\"en\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Paper glue\",\"Lined notebook\",\"Drawing book\",\"School bag\",\"Shoes and socks\"],\"reqDescs\":[\"\",\"96 pages\",\"128 pages\",\"one bag\",\"\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Students must come on time\",\"Students must prepare well examination for next term\"],\"otherDetails\":[\"\",\"\"],\"leaderNames\":[\"Kamana\",\"UWASE Angel\"],\"leaderRoles\":[\"Head Teacher / Director\",\"School Bursar / Economist\"],\"counts\":{\"payments\":2,\"reqs\":5,\"notes\":1,\"others\":2,\"leaders\":2}},\"rw\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Paper glue\",\"Lined notebook\",\"Drawing book\",\"School bag\",\"Shoes and socks\"],\"reqDescs\":[\"\",\"96 pages\",\"128 pages\",\"one bag\",\"\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Students must come on time\",\"Students must prepare well examination for next term\"],\"otherDetails\":[\"\",\"\"],\"leaderNames\":[\"Kamana\",\"UWASE Angel\"],\"leaderRoles\":[\"Head Teacher / Director\",\"School Bursar / Economist\"],\"counts\":{\"payments\":2,\"reqs\":5,\"notes\":1,\"others\":2,\"leaders\":2}},\"fr\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Paper glue\",\"Lined notebook\",\"Drawing book\",\"School bag\",\"Shoes and socks\"],\"reqDescs\":[\"\",\"96 pages\",\"128 pages\",\"one bag\",\"\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Students must come on time\",\"Students must prepare well examination for next term\"],\"otherDetails\":[\"\",\"\"],\"leaderNames\":[\"Kamana\",\"UWASE Angel\"],\"leaderRoles\":[\"Head Teacher / Director\",\"School Bursar / Economist\"],\"counts\":{\"payments\":2,\"reqs\":5,\"notes\":1,\"others\":2,\"leaders\":2}}}', '{\"v\":3,\"sourceLang\":\"en\",\"generatedAt\":\"2026-04-11T13:49:39.783Z\",\"status\":\"complete\",\"engine\":\"mymemory\",\"parentMessage\":{\"en\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"rw\":\"Babyeyi namwe barinzi,\\r\\n\\r\\nTwishimiye kubamenyesha amafaranga y\'ishuri azishyurwa mu gihembwe gitaha. Shaka ibisobanuro birambuye hano hasi.\\r\\n\\r\\nNdabashimira ko mukomeje kudushyigikira.\",\"fr\":\"Chers parents et tuteurs,\\r\\n\\r\\nNous avons le plaisir de vous informer des frais de scolarité pour le trimestre à venir. Veuillez trouver le détail ci-dessous.\\r\\n\\r\\nMerci pour votre soutien continu.\"},\"payments\":[{\"en\":\"Tuition Fee\",\"rw\":\"< Uburemere UTSINDAGIYE\",\"fr\":\"Droits de scolarité\"},{\"en\":\"Transport Fee\",\"rw\":\"Igiciro cy\'ubwikorezi\",\"fr\":\"Montant Transport\"}],\"requirements\":[{\"item\":{\"en\":\"Paper glue\",\"rw\":\"Umutuku w\'urupapuro\",\"fr\":\"Colle à papier\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Lined notebook\",\"rw\":\"Akarango\",\"fr\":\"Carnet doublé\"},\"description\":{\"en\":\"96 pages\",\"rw\":\"96 Amapaji\",\"fr\":\"96 pages.\"}},{\"item\":{\"en\":\"Drawing book\",\"rw\":\"Igitabo\",\"fr\":\"album à dessiner\"},\"description\":{\"en\":\"128 pages\",\"rw\":\"Amapaji\",\"fr\":\"128 pages.\"}},{\"item\":{\"en\":\"School bag\",\"rw\":\"Isakoshi y\'ishuri\",\"fr\":\"cartable/ sac d’école\"},\"description\":{\"en\":\"one bag\",\"rw\":\"agasakoshi kamwe\",\"fr\":\"un sac\"}},{\"item\":{\"en\":\"Shoes and socks\",\"rw\":\"Inkweto n\'amasogisi\",\"fr\":\"Chaussures et chaussettes\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}}],\"classNotes\":[],\"otherInfos\":[{\"item\":{\"en\":\"Students must come on time\",\"rw\":\"Abanyeshuri basoje amasomo ku gihe\",\"fr\":\"Les étudiants doivent arriver à l\'heure\"},\"details\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Students must prepare well examination for next term\",\"rw\":\"Abanyeshuri barasabwa kwitegura neza igihembwe gitaha\",\"fr\":\"Les étudiants doivent préparer l\'examen well pour le prochain trimestre\"},\"details\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}}],\"leaders\":[{\"role\":{\"en\":\"Head Teacher / Director\",\"rw\":\"Umwarimu / umuyobozi mukuru\",\"fr\":\"Professeur principal / Directeur\"}},{\"role\":{\"en\":\"School Bursar / Economist\",\"rw\":\"Bye Bye Bursar / Economist\",\"fr\":\"Éducateur/ économiste\"}}]}', 'complete'),
(8, 'BY-2025-00008', 11, 'WISDOM MUSANZE', '011', 'Cyuve', 'Musanze', 'Northern Province', 'P1', '[\"P1\"]', 'Term 1', '2025-2026', 'Primary', 'Private', NULL, '[{\"name\":\"Tuition Fee\",\"amount\":\"150000\"},{\"name\":\"Transport Fee\",\"amount\":\"50000\"}]', 'Dear Parents and Guardians,\r\n\r\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\r\n\r\nThank you for your continued support.', 200000.00, 'Umwalimu SACCO', '00063457616776', NULL, NULL, '78a6b8a0da8d492a', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-13 00:11:33', '2026-04-13 00:11:43', NULL, 1, 0, 200000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00008-1776031894131.png', 'http://localhost:5173,http://localhost:5174/babyeyi/verify/BY-2025-00008', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00008-1776031894309.pdf', 'babyeyi-BY-2025-00008-1776031894309.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"00063457616776\",\"accountName\":\"WISDOM MUSANZE\",\"isPrimary\":true}]', '{\"v\":2,\"source\":\"en\",\"generatedAt\":\"2026-04-12T22:11:34.007Z\",\"freeTier\":false,\"translationEngine\":\"static-i18n\",\"en\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Ream of paper\",\"Bottle for drinking water\"],\"reqDescs\":[\"A4 Azhar Paper\",\"one\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Students must come on time\",\"Students Must have full uniform\"],\"otherDetails\":[\"\",\"\"],\"leaderNames\":[\"NDUWAYESU Elie\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":2,\"reqs\":2,\"notes\":1,\"others\":2,\"leaders\":1}},\"rw\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Ream of paper\",\"Bottle for drinking water\"],\"reqDescs\":[\"A4 Azhar Paper\",\"one\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Students must come on time\",\"Students Must have full uniform\"],\"otherDetails\":[\"\",\"\"],\"leaderNames\":[\"NDUWAYESU Elie\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":2,\"reqs\":2,\"notes\":1,\"others\":2,\"leaders\":1}},\"fr\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\",\"Transport Fee\"],\"reqItems\":[\"Ream of paper\",\"Bottle for drinking water\"],\"reqDescs\":[\"A4 Azhar Paper\",\"one\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Students must come on time\",\"Students Must have full uniform\"],\"otherDetails\":[\"\",\"\"],\"leaderNames\":[\"NDUWAYESU Elie\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":2,\"reqs\":2,\"notes\":1,\"others\":2,\"leaders\":1}}}', '{\"v\":3,\"sourceLang\":\"en\",\"generatedAt\":\"2026-04-12T22:11:43.009Z\",\"status\":\"complete\",\"engine\":\"mymemory\",\"parentMessage\":{\"en\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"rw\":\"Babyeyi namwe barinzi,\\r\\n\\r\\nTwishimiye kubamenyesha amafaranga y\'ishuri azishyurwa mu gihembwe gitaha. Shaka ibisobanuro birambuye hano hasi.\\r\\n\\r\\nNdabashimira ko mukomeje kudushyigikira.\",\"fr\":\"Chers parents et tuteurs,\\r\\n\\r\\nNous avons le plaisir de vous informer des frais de scolarité pour le trimestre à venir. Veuillez trouver le détail ci-dessous.\\r\\n\\r\\nMerci pour votre soutien continu.\"},\"payments\":[{\"en\":\"Tuition Fee\",\"rw\":\"< Uburemere UTSINDAGIYE\",\"fr\":\"Droits de scolarité\"},{\"en\":\"Transport Fee\",\"rw\":\"Igiciro cy\'ubwikorezi\",\"fr\":\"Montant Transport\"}],\"requirements\":[{\"item\":{\"en\":\"Ream of paper\",\"rw\":\"Bya\",\"fr\":\"1 ramette de papier\"},\"description\":{\"en\":\"A4 Azhar Paper\",\"rw\":\"A4 Azari\",\"fr\":\"Papier azhar A4\"}},{\"item\":{\"en\":\"Bottle for drinking water\",\"rw\":\"Icupa ry\'amazi yo kunywa\",\"fr\":\"Bouteille d\'eau potable\"},\"description\":{\"en\":\"one\",\"rw\":\"Nta na kimwe\",\"fr\":\"un\"}}],\"classNotes\":[],\"otherInfos\":[{\"item\":{\"en\":\"Students must come on time\",\"rw\":\"Abanyeshuri basoje amasomo ku gihe\",\"fr\":\"Les étudiants doivent arriver à l\'heure\"},\"details\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Students Must have full uniform\",\"rw\":\"Abanyeshuri bagomba kuba bambaye impuzankano yuzuye\",\"fr\":\"Les étudiants doivent avoir un uniforme complet\"},\"details\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}}],\"leaders\":[{\"role\":{\"en\":\"Head Teacher / Director\",\"rw\":\"Umwarimu / umuyobozi mukuru\",\"fr\":\"Professeur principal / Directeur\"}}]}', 'complete');
INSERT INTO `school_babyeyi` (`id`, `doc_id`, `school_id`, `school_name`, `school_code`, `school_sector`, `school_district`, `school_province`, `class_name`, `classes_json`, `term`, `academic_year`, `education_level`, `school_category`, `ownership_type`, `payments`, `parent_message`, `total_amount`, `bank_name`, `bank_account_no`, `bank_branch`, `head_teacher_name`, `integrity_hash`, `qr_payload`, `qr_code_url`, `pdf_url`, `school_logo_url`, `supporting_doc_url`, `status`, `submitted_at`, `deo_status`, `deo_name`, `deo_title`, `deo_notes`, `deo_reviewed_at`, `approval_document_url`, `rejection_document_url`, `deo_signature_url`, `deo_stamp_url`, `created_at`, `updated_at`, `deleted_at`, `is_active`, `exceeds_limit`, `total_fee`, `nesa_limit`, `qr_code_path`, `qr_view_url`, `pdf_path`, `pdf_name`, `banks_json`, `translations_json`, `content_i18n`, `translation_status`) VALUES
(9, 'BY-2025-00009', 1, 'WISDOM SCHOOL MUSANZE', '001', 'Cyuve', 'Musanze', 'Northern Province', 'P1', '[\"P1\",\"P2\",\"P3\"]', 'Term 1', '2025-2026', 'Primary', 'Private', NULL, '[{\"name\":\"Tuition Fees\",\"amount\":\"510000\"}]', 'Dear Parents/Guardians,\r\n\r\nWe would like to take this opportunity to thank you for your continued support and cooperation throughout the previous term. Your involvement plays a vital role in the success and development of our learners.\r\n\r\nAs we prepare for the upcoming term, we encourage all parents to ensure that students return on time, well-prepared, and ready for learning. Kindly make sure that school fees, required materials, and other necessary requirements are completed before the reporting date.\r\n\r\nWe remain committed to providing quality education, maintaining discipline, and creating a safe and supportive learning environment for all students. We also encourage parents to maintain regular communication with the school regarding their children’s academic progress and well-being.\r\n\r\nWe look forward to another successful term working together for the benefit of our students.\r\n\r\nThank you for your continued trust and support.', 510000.00, 'Bank of Kigali (BK)', 'Pay Via URUBUTO ', NULL, NULL, '708b0a1bd4559fa7', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 21:41:45', '2026-04-14 21:44:50', NULL, 1, 0, 510000.00, NULL, '/uploads/babyeyi/qrcodes/qr-BY-2025-00009-1776195705602.png', 'http://localhost:5173,http://localhost:5174/babyeyi/verify/BY-2025-00009', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00009-1776195705888.pdf', 'babyeyi-BY-2025-00009-1776195705888.pdf', '[{\"bankName\":\"Bank of Kigali (BK)\",\"accountNumber\":\"Pay Via URUBUTO \",\"accountName\":\"*775# Then follow the instructions\",\"isPrimary\":true}]', '{\"v\":2,\"source\":\"en\",\"generatedAt\":\"2026-04-14T19:41:45.520Z\",\"freeTier\":false,\"translationEngine\":\"static-i18n\",\"en\":{\"parentMessage\":\"Dear Parents/Guardians,\\r\\n\\r\\nWe would like to take this opportunity to thank you for your continued support and cooperation throughout the previous term. Your involvement plays a vital role in the success and development of our learners.\\r\\n\\r\\nAs we prepare for the upcoming term, we encourage all parents to ensure that students return on time, well-prepared, and ready for learning. Kindly make sure that school fees, required materials, and other necessary requirements are completed before the reporting date.\\r\\n\\r\\nWe remain committed to providing quality education, maintaining discipline, and creating a safe and supportive learning environment for all students. We also encourage parents to maintain regular communication with the school regarding their children’s academic progress and well-being.\\r\\n\\r\\nWe look forward to another successful term working together for the benefit of our students.\\r\\n\\r\\nThank you for your continued trust and support.\",\"paymentNames\":[\"Tuition Fees\"],\"reqItems\":[\"Lined Exercise Books\",\"NESA Books for the Learner\",\"Pencils\",\"Sharpeners\",\"Rubbers\",\"Ream of Paper\",\"School bag\",\"Good News Bible + Hymn Book\",\"Bathing Soap\",\"Washing Soap\",\"OMO Soap\",\"Brushes (Ikiroso)\",\"AMAFARANGA YO KUDODESHA\",\"Pair of Shoes\",\"sleepers\",\"sport shoes\",\"Towel\",\"Bucket\",\"Toilet papers\",\"Tooth Brushes\",\"Teeth paste\",\"Bottle of drinking water\",\"Pads for Girls(Packets)\",\"Nail Cutter\",\"Comb\",\"Handkerchief(Mouchoirs)\",\"Pairs of bed sheets\",\"Blanket\",\"Bed cover\",\"Pair of socks(any color for boys and white color for girls)\",\"Recharge torch(not compulsory)\",\"School Jumper(not compulsory)\",\"Mattress or Hire one at school\"],\"reqDescs\":[\"96 Pages\",\"Maths or English or SRS or Kinyarwanda or Sciences\",\"\",\"\",\"\",\"A4 Paper\",\"\",\"one for each (1+1)  and paid at school 29000 frw\",\"4 Bars\",\"3 Tiges\",\"1 kg\",\"\",\"NITEGEKO KURI BURI MUNYESHURI (2000 frw)\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"20,000\",\"10,000 per term(not compulsory)\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Tution and Fees are non-refundable.\",\"Fees must be paid in full in the first week of each term\",\"Instalment Plans may be offered under special circumstances\",\"There will be a trip in the THIRD Term , but all details about where it will take place will be communicated two weeks after the start of the term.\"],\"otherDetails\":[\"\",\"\",\"\",\"\"],\"leaderNames\":[\"NDUWAYESU Elie\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":1,\"reqs\":33,\"notes\":1,\"others\":4,\"leaders\":1}},\"rw\":{\"parentMessage\":\"Dear Parents/Guardians,\\r\\n\\r\\nWe would like to take this opportunity to thank you for your continued support and cooperation throughout the previous term. Your involvement plays a vital role in the success and development of our learners.\\r\\n\\r\\nAs we prepare for the upcoming term, we encourage all parents to ensure that students return on time, well-prepared, and ready for learning. Kindly make sure that school fees, required materials, and other necessary requirements are completed before the reporting date.\\r\\n\\r\\nWe remain committed to providing quality education, maintaining discipline, and creating a safe and supportive learning environment for all students. We also encourage parents to maintain regular communication with the school regarding their children’s academic progress and well-being.\\r\\n\\r\\nWe look forward to another successful term working together for the benefit of our students.\\r\\n\\r\\nThank you for your continued trust and support.\",\"paymentNames\":[\"Tuition Fees\"],\"reqItems\":[\"Lined Exercise Books\",\"NESA Books for the Learner\",\"Pencils\",\"Sharpeners\",\"Rubbers\",\"Ream of Paper\",\"School bag\",\"Good News Bible + Hymn Book\",\"Bathing Soap\",\"Washing Soap\",\"OMO Soap\",\"Brushes (Ikiroso)\",\"AMAFARANGA YO KUDODESHA\",\"Pair of Shoes\",\"sleepers\",\"sport shoes\",\"Towel\",\"Bucket\",\"Toilet papers\",\"Tooth Brushes\",\"Teeth paste\",\"Bottle of drinking water\",\"Pads for Girls(Packets)\",\"Nail Cutter\",\"Comb\",\"Handkerchief(Mouchoirs)\",\"Pairs of bed sheets\",\"Blanket\",\"Bed cover\",\"Pair of socks(any color for boys and white color for girls)\",\"Recharge torch(not compulsory)\",\"School Jumper(not compulsory)\",\"Mattress or Hire one at school\"],\"reqDescs\":[\"96 Pages\",\"Maths or English or SRS or Kinyarwanda or Sciences\",\"\",\"\",\"\",\"A4 Paper\",\"\",\"one for each (1+1)  and paid at school 29000 frw\",\"4 Bars\",\"3 Tiges\",\"1 kg\",\"\",\"NITEGEKO KURI BURI MUNYESHURI (2000 frw)\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"20,000\",\"10,000 per term(not compulsory)\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Tution and Fees are non-refundable.\",\"Fees must be paid in full in the first week of each term\",\"Instalment Plans may be offered under special circumstances\",\"There will be a trip in the THIRD Term , but all details about where it will take place will be communicated two weeks after the start of the term.\"],\"otherDetails\":[\"\",\"\",\"\",\"\"],\"leaderNames\":[\"NDUWAYESU Elie\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":1,\"reqs\":33,\"notes\":1,\"others\":4,\"leaders\":1}},\"fr\":{\"parentMessage\":\"Dear Parents/Guardians,\\r\\n\\r\\nWe would like to take this opportunity to thank you for your continued support and cooperation throughout the previous term. Your involvement plays a vital role in the success and development of our learners.\\r\\n\\r\\nAs we prepare for the upcoming term, we encourage all parents to ensure that students return on time, well-prepared, and ready for learning. Kindly make sure that school fees, required materials, and other necessary requirements are completed before the reporting date.\\r\\n\\r\\nWe remain committed to providing quality education, maintaining discipline, and creating a safe and supportive learning environment for all students. We also encourage parents to maintain regular communication with the school regarding their children’s academic progress and well-being.\\r\\n\\r\\nWe look forward to another successful term working together for the benefit of our students.\\r\\n\\r\\nThank you for your continued trust and support.\",\"paymentNames\":[\"Tuition Fees\"],\"reqItems\":[\"Lined Exercise Books\",\"NESA Books for the Learner\",\"Pencils\",\"Sharpeners\",\"Rubbers\",\"Ream of Paper\",\"School bag\",\"Good News Bible + Hymn Book\",\"Bathing Soap\",\"Washing Soap\",\"OMO Soap\",\"Brushes (Ikiroso)\",\"AMAFARANGA YO KUDODESHA\",\"Pair of Shoes\",\"sleepers\",\"sport shoes\",\"Towel\",\"Bucket\",\"Toilet papers\",\"Tooth Brushes\",\"Teeth paste\",\"Bottle of drinking water\",\"Pads for Girls(Packets)\",\"Nail Cutter\",\"Comb\",\"Handkerchief(Mouchoirs)\",\"Pairs of bed sheets\",\"Blanket\",\"Bed cover\",\"Pair of socks(any color for boys and white color for girls)\",\"Recharge torch(not compulsory)\",\"School Jumper(not compulsory)\",\"Mattress or Hire one at school\"],\"reqDescs\":[\"96 Pages\",\"Maths or English or SRS or Kinyarwanda or Sciences\",\"\",\"\",\"\",\"A4 Paper\",\"\",\"one for each (1+1)  and paid at school 29000 frw\",\"4 Bars\",\"3 Tiges\",\"1 kg\",\"\",\"NITEGEKO KURI BURI MUNYESHURI (2000 frw)\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"20,000\",\"10,000 per term(not compulsory)\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"Tution and Fees are non-refundable.\",\"Fees must be paid in full in the first week of each term\",\"Instalment Plans may be offered under special circumstances\",\"There will be a trip in the THIRD Term , but all details about where it will take place will be communicated two weeks after the start of the term.\"],\"otherDetails\":[\"\",\"\",\"\",\"\"],\"leaderNames\":[\"NDUWAYESU Elie\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":1,\"reqs\":33,\"notes\":1,\"others\":4,\"leaders\":1}}}', '{\"v\":3,\"sourceLang\":\"en\",\"generatedAt\":\"2026-04-14T19:44:50.628Z\",\"status\":\"complete\",\"engine\":\"mymemory\",\"parentMessage\":{\"en\":\"Dear Parents/Guardians,\\r\\n\\r\\nWe would like to take this opportunity to thank you for your continued support and cooperation throughout the previous term. Your involvement plays a vital role in the success and development of our learners.\\r\\n\\r\\nAs we prepare for the upcoming term, we encourage all parents to ensure that students return on time, well-prepared, and ready for learning. Kindly make sure that school fees, required materials, and other necessary requirements are completed before the reporting date.\\r\\n\\r\\nWe remain committed to providing quality education, maintaining discipline, and creating a safe and supportive learning environment for all students. We also encourage parents to maintain regular communication with the school regarding their children’s academic progress and well-being.\\r\\n\\r\\nWe look forward to another successful term working together for the benefit of our students.\\r\\n\\r\\nThank you for your continued trust and support.\",\"rw\":\"Dear Parents/Guardians,\\r\\n\\r\\nWe would like to take this opportunity to thank you for your continued support and cooperation throughout the previous term. Your involvement plays a vital role in the success and development of our learners.\\r\\n\\r\\nAs we prepare for the upcoming term, we encourage all parents to ensure that students return on time, well-prepared, and ready for learning. Kindly make sure that school fees, required materials, and other necessary requirements are completed before the reporting date.\\r\\n\\r\\nWe remain committed to providing quality education, maintaining discipline, and creating a safe and supportive learning environment for all students. We also encourage parents to maintain regular communication with the school regarding their children’s academic progress and well-being.\\r\\n\\r\\nWe look forward to another successful term working together for the benefit of our students.\\r\\n\\r\\nThank you for your continued trust and support.\",\"fr\":\"Chers parents/tuteurs,\\r\\n\\r\\nNous aimerions profiter de cette occasion pour vous remercier pour votre soutien et votre coopération continus tout au long du mandat précédent. Votre implication joue un rôle essentiel dans la réussite et le développement de nos apprenants.\\r\\n\\r\\nAlors que nous nous préparons pour le prochain trimestre, nous encourageons tous les parents à s\'assurer que les élèves reviennent à l\'heure, bien préparés et prêts pour l\'apprentissage. Veuillez vous assurer que les frais de scolarité, le matériel requis et les autres\\n\\nles exigences nécessaires sont remplies avant la date de déclaration.\\r\\n\\r\\nNous restons déterminés à fournir une éducation de qualité, à maintenir la discipline et à créer un environnement d\'apprentissage sûr et favorable pour tous les élèves. Nous encourageons également les parents à maintenir une communication régulière avec l\'école concernant les progrès scolaires et le bien-être de leurs enfants.\\r\\n\\r\\nNous nous réjouissons à la perspective d\'un autre trimestre fructueux où nous travaillerons ensemble pour le bénéfice de nos étudiants.\\n\\nMerci de votre confiance et de votre soutien.\"},\"payments\":[{\"en\":\"Tuition Fees\",\"rw\":\"< Uburemere UTSINDAGIYE\",\"fr\":\"Frais de scolarité\"}],\"requirements\":[{\"item\":{\"en\":\"Lined Exercise Books\",\"rw\":\"Ibitabo by\'imyitozo ngorora mubiri\",\"fr\":\"Livres d\'exercices doublés\"},\"description\":{\"en\":\"96 Pages\",\"rw\":\"96 Amapaji\",\"fr\":\"96 pages.\"}},{\"item\":{\"en\":\"NESA Books for the Learner\",\"rw\":\"Nandikeshwara to baruhiatura\",\"fr\":\"NESA Livres pour l\'apprenant\"},\"description\":{\"en\":\"Maths or English or SRS or Kinyarwanda or Sciences\",\"rw\":\"Imibare, Icyongereza, SRS cyangwa Ikinyarwanda cyangwa Siyansi\",\"fr\":\"Mathématiques ou Anglais ou SRS ou Kinyarwanda ou Sciences\"}},{\"item\":{\"en\":\"Pencils\",\"rw\":\"< B B\",\"fr\":\"Crayon à papier\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Sharpeners\",\"rw\":\"< Uburemere UTSINDAGIYE\",\"fr\":\"Sharpeners\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Rubbers\",\"rw\":\"Gradient-editor-action\",\"fr\":\"Caoutchouc\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Ream of Paper\",\"rw\":\"Bya\",\"fr\":\"1 ramette de papier\"},\"description\":{\"en\":\"A4 Paper\",\"rw\":\"Paper size\",\"fr\":\"Papier A4\"}},{\"item\":{\"en\":\"School bag\",\"rw\":\"Isakoshi y\'ishuri\",\"fr\":\"cartable/ sac d’école\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Good News Bible + Hymn Book\",\"rw\":\"Bibiliya Yera + Igitabo cy\'Abaheburayo\",\"fr\":\"Bible des bonnes nouvelles + livre d\'hymnes\"},\"description\":{\"en\":\"one for each (1+1)  and paid at school 29000 frw\",\"rw\":\"umuntu umwe (1+1)  kandi agatanga amafaranga y\'ishuri ibihumbi 29RWf\",\"fr\":\"un pour chaque (1+1)  et payé à l\'école 29000 frw\"}},{\"item\":{\"en\":\"Bathing Soap\",\"rw\":\"Isabune yo koga\",\"fr\":\"Savon pour le bain\"},\"description\":{\"en\":\"4 Bars\",\"rw\":\"4.\",\"fr\":\"4 Barres\"}},{\"item\":{\"en\":\"Washing Soap\",\"rw\":\"Isabune yo koga\",\"fr\":\"Savon pour le lavage des main\"},\"description\":{\"en\":\"3 Tiges\",\"rw\":\"3.\",\"fr\":\"3 Tiges\"}},{\"item\":{\"en\":\"OMO Soap\",\"rw\":\"City in California, United States\",\"fr\":\"Savon OMO\"},\"description\":{\"en\":\"1 kg\",\"rw\":\"1.\",\"fr\":\"1 kg\"}},{\"item\":{\"en\":\"Brushes (Ikiroso)\",\"rw\":\"Brush (Ikiroso)\",\"fr\":\"Brosses (Ikiroso)\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"AMAFARANGA YO KUDODESHA\",\"rw\":\"AMAFARANGA YO KUDODESHA\",\"fr\":\"AMAFARANGA YO KUDODESHA\"},\"description\":{\"en\":\"NITEGEKO KURI BURI MUNYESHURI (2000 frw)\",\"rw\":\"NITEGEKO KURI BURI MUNYESHURI (2000 frw)\",\"fr\":\"NITEGEKO KURI BURI MUNYESHURI (2000 frw)\"}},{\"item\":{\"en\":\"Pair of Shoes\",\"rw\":\"Ibibanza bibiri by\'inkweto\",\"fr\":\"Paire de chaussures\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"sleepers\",\"rw\":\"unit-format\",\"fr\":\"gobies dormeurs\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"sport shoes\",\"rw\":\"inkweto za siporo\",\"fr\":\"Chaussures de sport\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Towel\",\"rw\":\"Igishusho\",\"fr\":\"Serviette\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Bucket\",\"rw\":\"Akadobo\",\"fr\":\"Godet\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Toilet papers\",\"rw\":\"< Uburemere UTSINDAGIY\",\"fr\":\"Papiers toilette\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Tooth Brushes\",\"rw\":\"Uburoso bw\'amenyo\",\"fr\":\"Brosses à dents\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Teeth paste\",\"rw\":\"Komeka\",\"fr\":\"Pâte dentaire\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Bottle of drinking water\",\"rw\":\"Icupa ry\'amazi yo kunywa\",\"fr\":\"Bouteille d\'eau potable\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Pads for Girls(Packets)\",\"rw\":\"Bye Bye Baby(Packets)\",\"fr\":\"Coussinets pour filles(paquets)\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Nail Cutter\",\"rw\":\"Imisumari\",\"fr\":\"Coupe-ongles\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Comb \",\"rw\":\"Gukomatanya\",\"fr\":\"Tartine\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\" Handkerchief(Mouchoirs)\",\"rw\":\"Agatambaro k\' intoki (Mouchoirs)\",\"fr\":\"Mouchoir(Mouchoirs)\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Pairs of bed sheets\",\"rw\":\"Ibitanda bibiri byububiko\",\"fr\":\"Paires de draps\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Blanket\",\"rw\":\"Ahatanditseho\",\"fr\":\"Couverture\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Bed cover\",\"rw\":\"Igitwikirizo cy\'igitanda\",\"fr\":\"Couverture de lit\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Pair of socks(any color for boys and white color for girls)\",\"rw\":\"Ibara ry\'icyatsi kibisi (Ibara ry\'icyatsi kibisi)\",\"fr\":\"Paire de chaussettes(n\'importe quelle couleur pour les garçons et couleur blanche pour les filles)\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Recharge torch(not compulsory)\",\"rw\":\"Toki wo kizamu uta (not necessary)\",\"fr\":\"Chalumeau de recharge (non obligatoire)\"},\"description\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"School Jumper(not compulsory)\",\"rw\":\"Amashuri y\'inshuke(si ngombwa)\",\"fr\":\"Cavalier scolaire (non obligatoire)\"},\"description\":{\"en\":\"20,000\",\"rw\":\"20,000\",\"fr\":\"20,000\"}},{\"item\":{\"en\":\"Mattress or Hire one at school\",\"rw\":\"Gukodesha cyangwa gukodesha ku ishuri\",\"fr\":\"Matelas ou embauchez-en un à l\'école\"},\"description\":{\"en\":\"10,000 per term(not compulsory)\",\"rw\":\"10.000Frw ku gihembwe (si ngombwa)\",\"fr\":\"10 000 par trimestre(non obligatoire)\"}}],\"classNotes\":[],\"otherInfos\":[{\"item\":{\"en\":\"Tution and Fees are non-refundable.\",\"rw\":\"Kwishyura no kwishyura ntibyemewe.\",\"fr\":\"Tution et les frais ne sont pas remboursables.\"},\"details\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Fees must be paid in full in the first week of each term\",\"rw\":\"Ibiciro bigomba kuba byuzuye mu cyumweru cya mbere cya buri kwezi\",\"fr\":\"Les frais doivent être payés en totalité au cours de la première semaine de chaque trimestre\"},\"details\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"Instalment Plans may be offered under special circumstances\",\"rw\":\"Ibicuruzwa byujuje ubuziranenge birashobora gushyirwa mububiko mu bihe byihariye\",\"fr\":\"Des plans à versements échelonnés peuvent être proposés dans des circonstances particulières\"},\"details\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}},{\"item\":{\"en\":\"There will be a trip in the THIRD Term , but all details about where it will take place will be communicated two weeks after the start of the term.\",\"rw\":\"Biteganyijwe ko manda ya gatatu izatangira, ariko amakuru yose ajyanye n\'aho manda izabera azatangazwa nyuma y\'ibyumweru bibiri manda itangiye.\",\"fr\":\"Il y aura un voyage au cours du TROISIÈME trimestre , mais tous les détails sur l\'endroit où il aura lieu seront communiqués deux semaines après le début du trimestre.\"},\"details\":{\"en\":\"\",\"rw\":\"\",\"fr\":\"\"}}],\"leaders\":[{\"role\":{\"en\":\"Head Teacher / Director\",\"rw\":\"Umwarimu / umuyobozi mukuru\",\"fr\":\"Professeur principal / Directeur\"}}]}', 'complete'),
(10, 'BY-2025-00010', 2, 'GS RUKARA TSS', '11001', 'Rukara', 'Kayonza', 'Eastern Province', 'S4', '[\"S4\",\"S5\",\"S6\"]', 'Term 1', '2025-2026', 'Secondary', 'Public', NULL, '[{\"name\":\"Tuition Fee\",\"amount\":\"19500\"}]', 'Dear Parents and Guardians,\r\n\r\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\r\n\r\nThank you for your continued support.', 19500.00, 'Umwalimu SACCO', '000047576532753', NULL, NULL, 'bc22e0f65b543566', NULL, NULL, NULL, NULL, NULL, 'approved', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-15 09:08:05', '2026-04-15 09:08:15', NULL, 1, 0, 19500.00, 19500.00, '/uploads/babyeyi/qrcodes/qr-BY-2025-00010-1776236885257.png', 'http://localhost:5173,http://localhost:5174/babyeyi/verify/BY-2025-00010', '/uploads/babyeyi/pdfs/babyeyi-BY-2025-00010-1776236885366.pdf', 'babyeyi-BY-2025-00010-1776236885366.pdf', '[{\"bankName\":\"Umwalimu SACCO\",\"accountNumber\":\"000047576532753\",\"accountName\":\"GS RUKARA TSS\",\"isPrimary\":true}]', '{\"v\":2,\"source\":\"en\",\"generatedAt\":\"2026-04-15T07:08:05.224Z\",\"freeTier\":false,\"translationEngine\":\"static-i18n\",\"en\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\"],\"reqItems\":[\"Communication book\",\"Mathematical set\"],\"reqDescs\":[\"96 pages\",\"one piece\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"\"],\"otherDetails\":[\"\"],\"leaderNames\":[\"UWIMANA Marei Claire\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":1,\"reqs\":2,\"notes\":1,\"others\":1,\"leaders\":1}},\"rw\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\"],\"reqItems\":[\"Communication book\",\"Mathematical set\"],\"reqDescs\":[\"96 pages\",\"one piece\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"\"],\"otherDetails\":[\"\"],\"leaderNames\":[\"UWIMANA Marei Claire\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":1,\"reqs\":2,\"notes\":1,\"others\":1,\"leaders\":1}},\"fr\":{\"parentMessage\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"paymentNames\":[\"Tuition Fee\"],\"reqItems\":[\"Communication book\",\"Mathematical set\"],\"reqDescs\":[\"96 pages\",\"one piece\"],\"noteItems\":[\"\"],\"noteDetails\":[\"\"],\"otherItems\":[\"\"],\"otherDetails\":[\"\"],\"leaderNames\":[\"UWIMANA Marei Claire\"],\"leaderRoles\":[\"Head Teacher / Director\"],\"counts\":{\"payments\":1,\"reqs\":2,\"notes\":1,\"others\":1,\"leaders\":1}}}', '{\"v\":3,\"sourceLang\":\"en\",\"generatedAt\":\"2026-04-15T07:08:15.564Z\",\"status\":\"complete\",\"engine\":\"mymemory\",\"parentMessage\":{\"en\":\"Dear Parents and Guardians,\\r\\n\\r\\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\\r\\n\\r\\nThank you for your continued support.\",\"rw\":\"Babyeyi namwe barinzi,\\r\\n\\r\\nTwishimiye kubamenyesha amafaranga y\'ishuri azishyurwa mu gihembwe gitaha. Shaka ibisobanuro birambuye hano hasi.\\r\\n\\r\\nNdabashimira ko mukomeje kudushyigikira.\",\"fr\":\"Chers parents et tuteurs,\\r\\n\\r\\nNous avons le plaisir de vous informer des frais de scolarité pour le trimestre à venir. Veuillez trouver le détail ci-dessous.\\r\\n\\r\\nMerci pour votre soutien continu.\"},\"payments\":[{\"en\":\"Tuition Fee\",\"rw\":\"< Uburemere UTSINDAGIYE\",\"fr\":\"Droits de scolarité\"}],\"requirements\":[{\"item\":{\"en\":\"Communication book\",\"rw\":\"Igitabo\",\"fr\":\"Cahier de communication\"},\"description\":{\"en\":\"96 pages\",\"rw\":\"96 Amapaji\",\"fr\":\"96 pages.\"}},{\"item\":{\"en\":\"Mathematical set\",\"rw\":\"Gushyiraho\",\"fr\":\"Ensemble mathématique\"},\"description\":{\"en\":\"one piece\",\"rw\":\"agace kamwe\",\"fr\":\"ONE PIECE\"}}],\"classNotes\":[],\"otherInfos\":[],\"leaders\":[{\"role\":{\"en\":\"Head Teacher / Director\",\"rw\":\"Umwarimu / umuyobozi mukuru\",\"fr\":\"Professeur principal / Directeur\"}}]}', 'complete');

-- --------------------------------------------------------

--
-- Table structure for table `school_classes`
--

CREATE TABLE `school_classes` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `group_name` varchar(100) NOT NULL,
  `stream_name` varchar(100) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `combination` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`combination`)),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- Table structure for table `school_gate_logs`
--

CREATE TABLE `school_gate_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `person_name` varchar(180) NOT NULL,
  `person_type` enum('STUDENT','STAFF','VISITOR') NOT NULL DEFAULT 'STUDENT',
  `person_ref` varchar(120) DEFAULT NULL,
  `action_type` enum('IN','OUT') NOT NULL,
  `logged_at` datetime NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `created_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_gradebook_columns`
--

CREATE TABLE `school_gradebook_columns` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `label` varchar(120) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `default_max_score` decimal(8,2) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(66, 11, 'head', 'NDUWAYESU Elie', 'Head Teacher', '0788987676', NULL, '/uploads/mini-websites/school-manager-1775940872588-899490.png', NULL, NULL, 0, '2026-03-18 09:40:20', '2026-04-11 22:54:33'),
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
-- Table structure for table `school_library_books`
--

CREATE TABLE `school_library_books` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(220) NOT NULL,
  `author` varchar(180) DEFAULT NULL,
  `isbn` varchar(80) DEFAULT NULL,
  `category` varchar(120) DEFAULT NULL,
  `quantity_total` int(11) NOT NULL DEFAULT 1,
  `quantity_available` int(11) NOT NULL DEFAULT 1,
  `shelf_location` varchar(120) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_library_checkouts`
--

CREATE TABLE `school_library_checkouts` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `book_id` int(10) UNSIGNED NOT NULL,
  `borrower_name` varchar(180) NOT NULL,
  `borrower_type` enum('STUDENT','STAFF','VISITOR') NOT NULL DEFAULT 'STUDENT',
  `borrower_ref` varchar(120) DEFAULT NULL,
  `issued_at` datetime NOT NULL DEFAULT current_timestamp(),
  `due_date` date DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `status` enum('ISSUED','RETURNED') NOT NULL DEFAULT 'ISSUED',
  `notes` text DEFAULT NULL,
  `created_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `international_other_programs` text DEFAULT NULL,
  `news_items` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mini-website content for each school (1-to-1 with schools)';

--
-- Dumping data for table `school_mini_websites`
--

INSERT INTO `school_mini_websites` (`id`, `school_id`, `slug`, `status`, `published_at`, `cover_url`, `about_image_url`, `mission_image_url`, `background`, `mission`, `vision`, `core_values`, `facebook`, `twitter`, `instagram`, `template`, `color_theme`, `custom_colors`, `sections`, `a_level_combinations`, `tvet_trades`, `admission`, `admission_form_id`, `fees`, `albums`, `created_at`, `updated_at`, `international_primary_programs`, `international_other_programs`, `news_items`) VALUES
(1, 3, 'ecole-notre-dame-des-anges', 'published', '2026-03-22 22:48:19', '/uploads/mini-websites/1-1774212781441-503631.jpg', '/uploads/mini-websites/6-1774212781441-896580.jpg', '/uploads/mini-websites/2-1774212781442-689972.jpg', 'ECOLE NOTRE DAMME ANGELS is a learning institution committed to providing quality education and shaping responsible, knowledgeable, and disciplined citizens. The school was established with the aim of offering students a strong academic foundation while promoting moral values, creativity, and critical thinking.\r\n\r\nLocated in a conducive learning environment, the school provides modern educational facilities that support both academic and co-curricular development. The institution welcomes students from diverse backgrounds and encourages inclusiveness, respect, and cooperation among learners.', 'Our mission is to provide quality education that nurtures academic excellence, critical thinking, creativity, and moral values. We are committed to creating a supportive and inclusive learning environment where every student is encouraged to develop their full potential and become responsible, confident, and productive members of society.\r\n\r\nThrough dedicated teaching, innovative learning methods, and active community involvement, the school strives to equip learners with the knowledge, skills, and character necessary for lifelong learning and future success', 'Our vision is to become a leading center of excellence in education, recognized for nurturing knowledgeable, skilled, and responsible learners who are prepared to meet the challenges of the modern world.\r\n\r\nWe aspire to develop students who are innovative, confident, and committed to lifelong learning, while upholding strong moral values and contributing positively to their communities and society.', '[\"Integrity\",\"Hardworking\",\"Slef-confidence\",\"Excellence\"]', NULL, NULL, NULL, 'authority', 'blue', NULL, '[\"hero\",\"stats\",\"about\",\"mission\",\"programs\",\"fees\",\"admissions\",\"gallery\",\"announcements\",\"leadership\",\"testimonials\",\"contact\",\"cta\"]', '[]', '[]', '{\"openDate\":null,\"closeDate\":null,\"year\":null,\"contactPhone\":null,\"steps\":[],\"requirements\":[],\"documents\":[],\"notes\":null}', NULL, '{\"nursery\":{\"currency\":\"RWF\",\"notes\":null,\"items\":[{\"type\":\"Tuition Fee\",\"amount\":50000,\"period\":\"Per Term\",\"sort\":0},{\"type\":\"Transport Fee\",\"amount\":40000,\"period\":\"Per Term\",\"sort\":1}]},\"primary\":{\"currency\":\"RWF\",\"notes\":null,\"items\":[{\"type\":\"Tuition Fee\",\"amount\":60000,\"period\":\"Per Term\",\"sort\":0},{\"type\":\"Transport Fee\",\"amount\":40000,\"period\":\"Per Term\",\"sort\":1}]}}', '[{\"id\":1774212471374,\"title\":\"Sport Day\",\"date\":null,\"category\":\"Sports\",\"description\":null,\"images\":[]}]', '2026-03-22 22:48:19', '2026-03-22 22:53:01', '[]', '[]', NULL),
(2, 11, 'wisdom-musanze', 'published', '2026-04-11 22:20:15', '/uploads/mini-websites/wisdom1-1775938799463-389295.jpg', '/uploads/mini-websites/wisdom2JPG-1775938799883-443297.jpg', '/uploads/mini-websites/wisdom2JPG-1775938801203-113755.jpg', 'Wisdom Schools Rwanda is a family-centered education community dedicated to nurturing learners who grow in knowledge, character, and faith. We believe education is a shared journey between the school, parents, and community, united in shaping responsible and compassionate citizens prepared for the challenges of the modern world.\r\n\r\nFounded in 2008 with just five students, Wisdom Schools Rwanda began as a humble seed of faith and vision to transform lives through Kingdom of God–centered education. Through God’s blessings and the continued trust of our community, that small beginning has grown into a chain of thriving schools across the nation, each committed to excellence in academics, character formation, and innovation. Today, as of 2025, Wisdom Schools stands as a testimony of God’s grace and dedication to quality education—a network producing top achievers and responsible citizens.', 'Wisdom Schools Rwanda provides a sustainable and holistic education aimed at producing balanced, God-fearing individuals who can thrive academically, socially, and spiritually. We prepare learners to be innovative, disciplined, and globally competent, while remaining rooted in values that honor God and community.', 'To become a leading, trusted, and innovative school within the East African Community (EAC) a beacon of academic and moral excellence inspiring learners to think critically, act responsibly, and lead courageously.\r\n\r\n', '[\"Heroism\",\"Commitment\",\"Accountability\"]', NULL, NULL, NULL, 'classic', 'navy', NULL, '[\"hero\",\"stats\",\"about\",\"mission\",\"programs\",\"fees\",\"admissions\",\"gallery\",\"announcements\",\"news\",\"leadership\",\"testimonials\",\"contact\",\"cta\"]', '[]', '[]', '{\"openDate\":null,\"closeDate\":null,\"year\":null,\"contactPhone\":null,\"steps\":[],\"requirements\":[],\"documents\":[],\"notes\":null}', NULL, '{\"nursery\":{\"label\":null,\"currency\":\"RWF\",\"notes\":null,\"items\":[{\"type\":\"Tuition Fee\",\"amount\":100000,\"period\":\"Per Term\",\"sort\":0},{\"type\":\"Transport Fee\",\"amount\":45000,\"period\":\"Per Term\",\"sort\":1},{\"type\":\"Lunch Fee\",\"amount\":45000,\"period\":\"Per Term\",\"sort\":2}]},\"primary\":{\"label\":null,\"currency\":\"RWF\",\"notes\":null,\"items\":[{\"type\":\"Tuition Fee\",\"amount\":510000,\"period\":\"Per Term\",\"sort\":0}]},\"olevel\":{\"label\":null,\"currency\":\"RWF\",\"notes\":null,\"items\":[{\"type\":\"Tuition Fee\",\"amount\":610000,\"period\":\"Per Term\",\"sort\":0}]},\"alevel\":{\"label\":null,\"currency\":\"RWF\",\"notes\":null,\"items\":[{\"type\":\"Tuition Fee\",\"amount\":620000,\"period\":\"Per Term\",\"sort\":0}]}}', '[]', '2026-04-11 22:20:10', '2026-04-11 22:20:15', '[]', '[]', '[]');

-- --------------------------------------------------------

--
-- Table structure for table `school_module_access`
--

CREATE TABLE `school_module_access` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `module_key` varchar(100) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_stock_items`
--

CREATE TABLE `school_stock_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `item_name` varchar(200) NOT NULL,
  `sku` varchar(80) DEFAULT NULL,
  `category` varchar(120) DEFAULT NULL,
  `unit` varchar(40) NOT NULL DEFAULT 'pcs',
  `reorder_level` decimal(10,2) NOT NULL DEFAULT 0.00,
  `opening_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `current_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_stock_movements`
--

CREATE TABLE `school_stock_movements` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `item_id` int(10) UNSIGNED NOT NULL,
  `movement_type` enum('IN','OUT','ADJUSTMENT') NOT NULL,
  `quantity_change` decimal(10,2) NOT NULL,
  `reason` varchar(220) DEFAULT NULL,
  `movement_date` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_subjects`
--

CREATE TABLE `school_subjects` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `category` varchar(64) DEFAULT NULL,
  `subject_code` varchar(32) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` int(10) UNSIGNED NOT NULL,
  `service_code` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'Voucher',
  `description` text DEFAULT NULL,
  `short_tagline` varchar(500) DEFAULT NULL,
  `icon_url` varchar(512) DEFAULT NULL,
  `academic_year` varchar(32) NOT NULL,
  `eligibility_levels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`eligibility_levels`)),
  `default_pricing_type` enum('global','by_level','by_school') NOT NULL DEFAULT 'global',
  `validity_start` date DEFAULT NULL,
  `validity_end` date DEFAULT NULL,
  `redemption_method` varchar(255) DEFAULT NULL,
  `delivery_method` varchar(255) DEFAULT NULL,
  `stock_quantity` int(11) DEFAULT NULL,
  `payment_rules` text DEFAULT NULL,
  `terms_conditions` text DEFAULT NULL,
  `status` enum('draft','active','inactive','archived') NOT NULL DEFAULT 'draft',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by_role` varchar(40) NOT NULL DEFAULT 'SUPER_ADMIN',
  `created_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `is_shop_product` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `available_sizes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`available_sizes`)),
  `shoe_categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`shoe_categories`)),
  `delivery_fee` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `service_code`, `name`, `category`, `description`, `short_tagline`, `icon_url`, `academic_year`, `eligibility_levels`, `default_pricing_type`, `validity_start`, `validity_end`, `redemption_method`, `delivery_method`, `stock_quantity`, `payment_rules`, `terms_conditions`, `status`, `created_at`, `updated_at`, `created_by_role`, `created_by_user_id`, `is_shop_product`, `deleted_at`, `available_sizes`, `shoe_categories`, `delivery_fee`) VALUES
(1, 'SHOUSE2026', 'Shoes Voucher', 'Voucher', 'This is Shoes Of students from Nursary to Advanced Level', 'This is Shoes of Students', '/uploads/service-icons/svc-1-(2)-1775205661684-247826917.jpeg', '2026-2027', '[\"Primary\",\"O\'Level\",\"Nursery\",\"A\'Level\"]', 'by_level', '2026-04-02', '2026-04-10', 'School pickup', 'School pickup', NULL, '', '', 'active', '2026-04-03 10:41:01', '2026-04-03 11:34:12', 'SUPER_ADMIN', NULL, 0, NULL, NULL, NULL, 0.00),
(2, 'Black Shoes', 'Black Shoes', 'Agent Shop', 'This isBlack Shoes', 'This is Black Shoes', '/uploads/service-icons/svc-1-(2)-1775815600224-429810059.jpeg', '2026-2027', '[]', 'global', NULL, NULL, NULL, NULL, 50, NULL, NULL, 'active', '2026-04-10 12:06:40', '2026-04-10 12:06:51', 'AGENT', 35, 1, NULL, NULL, NULL, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `service_orders`
--

CREATE TABLE `service_orders` (
  `id` int(10) UNSIGNED NOT NULL,
  `order_number` varchar(40) NOT NULL,
  `service_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED DEFAULT NULL,
  `parent_id` int(10) UNSIGNED DEFAULT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `academic_year` varchar(32) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'FRW',
  `payment_status` enum('pending','awaiting_payment','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `order_status` enum('pending','awaiting_payment','paid','voucher_issued','redeemed','cancelled','expired') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `unit_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `batch_ref` varchar(64) DEFAULT NULL,
  `delivery_mode` enum('AT_SCHOOL','AT_HOME') DEFAULT NULL,
  `delivery_address` varchar(500) DEFAULT NULL,
  `buyer_name` varchar(160) DEFAULT NULL,
  `buyer_contact` varchar(120) DEFAULT NULL,
  `agent_user_id` int(10) UNSIGNED DEFAULT NULL,
  `source_channel` varchar(50) NOT NULL DEFAULT 'PUBLIC',
  `fulfillment_status` varchar(40) NOT NULL DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `service_orders`
--

INSERT INTO `service_orders` (`id`, `order_number`, `service_id`, `student_id`, `parent_id`, `school_id`, `academic_year`, `amount`, `currency`, `payment_status`, `order_status`, `created_at`, `updated_at`, `quantity`, `unit_amount`, `batch_ref`, `delivery_mode`, `delivery_address`, `buyer_name`, `buyer_contact`, `agent_user_id`, `source_channel`, `fulfillment_status`) VALUES
(1, 'SHP-2026-BF87E5', 2, 72, NULL, 3, '2025-2026', 20000.00, 'FRW', 'awaiting_payment', 'awaiting_payment', '2026-04-10 12:09:06', '2026-04-10 12:09:06', 1, 20000.00, 'SHOP-1775815746086-979AAF', 'AT_SCHOOL', NULL, 'Kmana', '0796898894', 35, 'PUBLIC_SHOP', 'Pending'),
(2, 'SHP-2026-5ACFA5', 2, 72, NULL, 3, '2025-2026', 40000.00, 'FRW', 'awaiting_payment', 'awaiting_payment', '2026-04-11 10:50:44', '2026-04-11 10:50:44', 2, 20000.00, 'SHOP-1775897444570-F43927', 'AT_SCHOOL', NULL, 'Kaneza', '0796898894', 35, 'PUBLIC_SHOP', 'Pending');

-- --------------------------------------------------------

--
-- Table structure for table `service_payments`
--

CREATE TABLE `service_payments` (
  `id` int(10) UNSIGNED NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `payment_ref` varchar(128) DEFAULT NULL,
  `payment_method` varchar(64) DEFAULT NULL,
  `amount_paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `transaction_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_date` datetime DEFAULT NULL,
  `payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `provider_response` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_prices`
--

CREATE TABLE `service_prices` (
  `id` int(10) UNSIGNED NOT NULL,
  `service_id` int(10) UNSIGNED NOT NULL,
  `pricing_type` enum('global','level','school') NOT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `level` varchar(64) DEFAULT NULL,
  `academic_year` varchar(32) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'FRW',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `service_prices`
--

INSERT INTO `service_prices` (`id`, `service_id`, `pricing_type`, `school_id`, `level`, `academic_year`, `amount`, `currency`, `is_active`, `created_at`, `updated_at`) VALUES
(5, 1, 'level', NULL, 'Nursery', '2026-2027', 10000.00, 'FRW', 1, '2026-04-03 11:34:12', '2026-04-03 11:34:12'),
(6, 1, 'level', NULL, 'Pre-primary', '2026-2027', 12000.00, 'FRW', 1, '2026-04-03 11:34:12', '2026-04-03 11:34:12'),
(7, 1, 'level', NULL, 'Upper-Primary', '2026-2027', 15000.00, 'FRW', 1, '2026-04-03 11:34:12', '2026-04-03 11:34:12'),
(8, 1, 'level', NULL, 'O-Level', '2026-2027', 20000.00, 'FRW', 1, '2026-04-03 11:34:12', '2026-04-03 11:34:12'),
(9, 1, 'level', NULL, 'A-Level', '2026-2027', 24998.00, 'FRW', 1, '2026-04-03 11:34:12', '2026-04-03 11:34:12'),
(11, 2, 'global', NULL, NULL, '2026-2027', 20000.00, 'FRW', 1, '2026-04-10 12:06:51', '2026-04-10 12:06:51');

-- --------------------------------------------------------

--
-- Table structure for table `shule_avance_requests`
--

CREATE TABLE `shule_avance_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `teacher_user_id` int(10) UNSIGNED NOT NULL,
  `amount_rwf` decimal(14,2) NOT NULL,
  `purpose` text NOT NULL,
  `repayment_term_months` int(10) UNSIGNED NOT NULL,
  `vendor_label` varchar(160) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `invoice_file_name` varchar(255) DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'pending_accountant',
  `accountant_note` text DEFAULT NULL,
  `manager_feedback` text DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `accountant_reviewed_at` datetime DEFAULT NULL,
  `accountant_reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `manager_reviewed_at` datetime DEFAULT NULL,
  `manager_reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `shule_avance_requests`
--

INSERT INTO `shule_avance_requests` (`id`, `school_id`, `teacher_user_id`, `amount_rwf`, `purpose`, `repayment_term_months`, `vendor_label`, `details`, `invoice_file_name`, `status`, `accountant_note`, `manager_feedback`, `submitted_at`, `accountant_reviewed_at`, `accountant_reviewed_by`, `manager_reviewed_at`, `manager_reviewed_by`, `created_at`, `updated_at`) VALUES
(1, 2, 45, 500.00, 'I want', 6, NULL, NULL, NULL, 'sent_to_manager', 'yes check', NULL, '2026-04-15 10:45:34', '2026-04-15 15:13:41', 46, NULL, NULL, '2026-04-15 10:45:34', '2026-04-15 15:13:41');

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
(1, 45, 2, NULL, 'gsrukarateacher', '2026-04-15 09:28:26'),
(2, 46, 2, NULL, 'gsrukaraaccountant', '2026-04-15 12:01:54');

-- --------------------------------------------------------

--
-- Table structure for table `standard_shule_kits`
--

CREATE TABLE `standard_shule_kits` (
  `id` int(10) UNSIGNED NOT NULL,
  `grade_level` varchar(64) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(512) DEFAULT NULL,
  `status` enum('draft','active','inactive') NOT NULL DEFAULT 'draft',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `standard_shule_kits`
--

INSERT INTO `standard_shule_kits` (`id`, `grade_level`, `description`, `image_url`, `status`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'Nursery', NULL, NULL, 'active', 0, '2026-04-10 07:23:59', '2026-04-10 07:23:59');

-- --------------------------------------------------------

--
-- Table structure for table `standard_shule_kit_requests`
--

CREATE TABLE `standard_shule_kit_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `request_no` varchar(40) NOT NULL,
  `kit_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `agent_user_id` int(10) UNSIGNED DEFAULT NULL,
  `requester_name` varchar(160) NOT NULL,
  `requester_contact` varchar(120) NOT NULL,
  `delivery_option` enum('AT_SCHOOL','AT_HOME') NOT NULL DEFAULT 'AT_SCHOOL',
  `delivery_address` varchar(500) DEFAULT NULL,
  `province` varchar(120) DEFAULT NULL,
  `district` varchar(120) DEFAULT NULL,
  `sector` varchar(120) DEFAULT NULL,
  `total_frw` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('awaiting_payment','paid','failed') NOT NULL DEFAULT 'awaiting_payment',
  `status` enum('submitted','paid','processing','completed','cancelled') NOT NULL DEFAULT 'submitted',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `standard_shule_kit_request_payments`
--

CREATE TABLE `standard_shule_kit_request_payments` (
  `id` int(10) UNSIGNED NOT NULL,
  `request_id` int(10) UNSIGNED NOT NULL,
  `payment_ref` varchar(128) DEFAULT NULL,
  `payment_method` varchar(64) DEFAULT NULL,
  `amount_paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('pending','paid','failed') NOT NULL DEFAULT 'pending',
  `provider_response` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `standard_shule_kit_requirements`
--

CREATE TABLE `standard_shule_kit_requirements` (
  `id` int(10) UNSIGNED NOT NULL,
  `kit_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(500) NOT NULL,
  `amount_frw` decimal(12,2) NOT NULL DEFAULT 0.00,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `image_url` varchar(512) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `standard_shule_kit_requirements`
--

INSERT INTO `standard_shule_kit_requirements` (`id`, `kit_id`, `title`, `amount_frw`, `quantity`, `image_url`, `sort_order`, `created_at`) VALUES
(1, 1, 'Note Books', 500.00, 9, NULL, 0, '2026-04-10 07:23:59'),
(2, 1, 'Pencils', 200.00, 1, NULL, 1, '2026-04-10 07:23:59');

-- --------------------------------------------------------

--
-- Table structure for table `store_inventory_items`
--

CREATE TABLE `store_inventory_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(220) NOT NULL,
  `category` varchar(120) DEFAULT NULL,
  `unit` varchar(40) DEFAULT NULL,
  `quantity` decimal(14,2) NOT NULL DEFAULT 0.00,
  `reorder_level` decimal(14,2) NOT NULL DEFAULT 0.00,
  `unit_cost` decimal(14,2) NOT NULL DEFAULT 0.00,
  `location` varchar(180) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `store_movements`
--

CREATE TABLE `store_movements` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `item_id` int(10) UNSIGNED DEFAULT NULL,
  `type` varchar(32) NOT NULL,
  `quantity` decimal(14,2) NOT NULL DEFAULT 0.00,
  `unit_cost` decimal(14,2) DEFAULT NULL,
  `ref` varchar(160) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_by_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `store_suppliers`
--

CREATE TABLE `store_suppliers` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(220) NOT NULL,
  `contact_person` varchar(180) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `email` varchar(180) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `categories` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `father_phone` varchar(160) DEFAULT NULL,
  `father_email` varchar(255) DEFAULT NULL,
  `mother_full_name` varchar(150) DEFAULT NULL,
  `mother_phone` varchar(160) DEFAULT NULL,
  `mother_email` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `import_missing_fields` text DEFAULT NULL,
  `source_row_json` longtext DEFAULT NULL,
  `class_name` varchar(120) DEFAULT NULL,
  `academic_year` varchar(32) DEFAULT NULL,
  `student_code` varchar(15) DEFAULT NULL,
  `sdm_code` varchar(64) DEFAULT NULL,
  `student_photo` varchar(255) DEFAULT NULL,
  `rfid_uid` varchar(64) DEFAULT NULL,
  `fingerprint_id` varchar(128) DEFAULT NULL,
  `identity_remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `student_uid`, `school_id`, `first_name`, `last_name`, `gender`, `birth_year`, `nationality`, `province`, `district`, `sector`, `cell`, `village`, `father_full_name`, `father_phone`, `father_email`, `mother_full_name`, `mother_phone`, `mother_email`, `created_at`, `updated_at`, `import_missing_fields`, `source_row_json`, `class_name`, `academic_year`, `student_code`, `sdm_code`, `student_photo`, `rfid_uid`, `fingerprint_id`, `identity_remarks`) VALUES
(1, '150010001', 1, 'AGANZE', 'DARCY', 'Female', NULL, 'Rwandan', 'North', 'Musanze', 'Musanze', NULL, NULL, NULL, '0785607870', NULL, NULL, '0783151937', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Cell\",\"Village\"]', '[\"\",\"\",\"AGANZE\",\"DARCY\",\"F\",\"\",\"NKURIKIYINKA Faustin\",\"0785607870\",\"\",\"UMUTONI Joselyne\",\"0783151937\",\"\",\"\",\"North\",\"Musanze\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010001', NULL, NULL, NULL, NULL, NULL),
(2, '150010002', 1, 'BISAMAZA', 'MORGAN', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788213658', NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"BISAMAZA\",\"MORGAN\",\"M\",\"\",\"BISAMAZA JAQVES\",788213658,\"\",\"ZAWADI GENTILLE\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010002', NULL, NULL, NULL, NULL, NULL),
(3, '150010003', 1, 'BYISHIMO CYUSA', 'ETHAN', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0787723742', NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"BYISHIMO CYUSA\",\"ETHAN\",\"F\",\"\",\"NSHIMIYIMANA JEAN\",787723742,\"\",\"NIYONSENGA LOUISE\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010003', NULL, NULL, NULL, NULL, NULL),
(4, '150010004', 1, 'BYOSENIMANA GASARO', 'ETOIRE', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788394795', NULL, NULL, '0791989611', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"BYOSENIMANA GASARO\",\"ETOIRE\",\"F\",\"\",\"BYOSIMANA PHILBERT\",788394795,\"\",\"MYANO REHEMA\",791989611,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010004', NULL, NULL, NULL, NULL, NULL),
(5, '150010005', 1, 'CYIZA NGENZI', 'SUIDICK', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788511114', NULL, NULL, '0788290359', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"CYIZA NGENZI\",\"SUIDICK\",\"M\",\"\",\"HABUMUGISHA\",\"0788511114\",\"\",\"NYIRABARITONDA\",\"0788290359\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010005', NULL, NULL, NULL, NULL, NULL),
(6, '150010061', 1, 'CYUSA', 'AKEEM', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0785236130', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"CYUSA\",\"AKEEM\",\"M\",\"\",\"NZABAHUZA HAKEEM\",\"07883129416\",\"\",\"MUKESHIMANA\",\"0785236130\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010061', '07883129416', NULL, NULL, NULL, NULL),
(7, '150010006', 1, 'DUHIRWE KAGABO MUNANA', 'ELIO', 'Male', NULL, 'Rwandan', 'RWANDAN', NULL, NULL, NULL, NULL, NULL, '0789000000', 'kagaboelido0987@gmail.com', NULL, '0789000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"DUHIRWE KAGABO MUNANA\",\"ELIO\",\"M\",\"\",\"KAGABO Elidad\",789000000,\"kagaboelido0987@gmail.com\",\"Furaha Karume Eugenie\",789000000,\"\",\"RWANDAN\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010006', NULL, NULL, NULL, NULL, NULL),
(8, '150010007', 1, 'GIKUNDIRO SABINE', 'WINNY', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788897500', NULL, NULL, '0783120558', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"GIKUNDIRO SABINE\",\"WINNY\",\"F\",\"\",\"KARINIJABO  JOHN WICLIFF\",788897500,\"\",\"NIYOMUKIZA POULINE\",783120558,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010007', NULL, NULL, NULL, NULL, NULL),
(9, '150010008', 1, 'GISA GATAMA', 'GODWIN', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"GISA GATAMA\",\"GODWIN\",\"M\",\"\",\"KAGISHA CONSOLEE\",9876,\"\",\"KAGISHA CONSOLEE\",6754,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010008', NULL, NULL, NULL, NULL, NULL),
(10, '150010009', 1, 'GWIZA', 'IAN', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0784000000', NULL, NULL, '0784725304', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"GWIZA\",\"IAN\",\"M\",\"\",\"NTEGEREJIMANA KAZOYA\",784000000,\"\",\"KAYITESI DENYSE\",\"0784725304\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010009', NULL, NULL, NULL, NULL, NULL),
(11, '150010010', 1, 'GWIZA', 'NOLAN', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"GWIZA\",\"NOLAN\",\"F\",\"\",\"KAGISHA CONSOLEE\",786,\"\",\"KAGISHA CONSOLEE\",8976,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010010', NULL, NULL, NULL, NULL, NULL),
(12, '150010011', 1, 'GWIZA NZIYUMVIRA', 'ELYSIE', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0784885174', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"GWIZA NZIYUMVIRA\",\"ELYSIE\",\"M\",\"\",\"NZIYUMVIRA Ludie\",876,\"\",\"MUKOBWAJANA\",\"0784885174\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010011', NULL, NULL, NULL, NULL, NULL),
(13, '150010012', 1, 'HIRWA', 'RYAN', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0783673533', NULL, NULL, '0739621231', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"HIRWA\",\"RYAN\",\"M\",\"\",\"MBARUSHIMANA \",\"0783673533\",\"\",\"IHIRWE Honorine\",\"0739621231\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010012', NULL, NULL, NULL, NULL, NULL),
(14, '150010013', 1, 'HIRWA MUNYABIHOGO', 'WILLIAM', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"HIRWA MUNYABIHOGO\",\"WILLIAM\",\"M\",\"\",\"KAGISHA CONSOLEE\",9876,\"\",\"KAGISHA CONSOLEE\",987,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010013', NULL, NULL, NULL, NULL, NULL),
(15, '150010014', 1, 'IGABE CIKOMA', 'ELLAN', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0788236826', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IGABE CIKOMA\",\"ELLAN\",\"M\",\"\",\"NDAYIBA FAUSTIN\",78873115,\"\",\"TUMUKUNDE ESPERANCE\",788236826,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010014', NULL, NULL, NULL, NULL, NULL),
(16, '150010015', 1, 'IGIRANEZA', 'YAKIN', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IGIRANEZA\",\"YAKIN\",\"F\",\"\",\"YAKIN\",\"\",\"\",\"YAKINI\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010015', NULL, NULL, NULL, NULL, NULL),
(17, '150010016', 1, 'IKAMBA', 'BRAVE HAYDEN', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789000000', NULL, NULL, '0723000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IKAMBA\",\"BRAVE HAYDEN\",\"F\",\"\",\"UWIMANA FIKIRI JAYDEN\",789000000,\"\",\"KAMAGAJUE JERDINNE\",723000000,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010016', NULL, NULL, NULL, NULL, NULL),
(18, '150010017', 1, 'IKAZE', 'NORA GIANA', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788726943', NULL, NULL, '0782133027', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IKAZE\",\"NORA GIANA\",\"F\",\"\",\"TUYISHIME Silas\",\"0788726943\",\"\",\"UMUHOZA Jeanne\",\"0782133027\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010017', NULL, NULL, NULL, NULL, NULL),
(19, '150010018', 1, 'IKUZO MUHOZA', 'BENON', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788784822', NULL, NULL, '0788784822', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IKUZO MUHOZA\",\"BENON\",\"M\",\"\",\"BISENGA MUHOZA\",\"0788784822\",\"\",\"NYIRANTUNGANE\",\"0788784822\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010018', NULL, NULL, NULL, NULL, NULL),
(20, '150010019', 1, 'IKUZWE GIHOZO', 'OLGA', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0786267730', NULL, NULL, '0788743064', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IKUZWE GIHOZO\",\"OLGA\",\"F\",\"\",\"SIMBIKANGWA Jean\",\"0786267730\",\"\",\"MUKAMASABO Brandine\",\"0788743064\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010019', NULL, NULL, NULL, NULL, NULL),
(21, '150010020', 1, 'IMANATURIKUMWE JANA', 'DANIELLA', 'Female', NULL, 'Rwandan', 'North', 'Musanze', 'Cyuve', 'Rwebeya', 'Marantima', NULL, '0784000000', 'xxx@gmail.com', NULL, '0789000000', 'xxx@gmail.com', '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[]', '[\"\",\"\",\"IMANATURIKUMWE JANA\",\"DANIELLA\",\"F\",\"\",\"MANATURIKUMWE Daniel\",\"0784000000\",\"xxx@gmail.com\",\"MUKARUKUNDO Jeaqueline\",789000000,\"xxx@gmail.com\",\"Rwanda\",\"North\",\"Musanze\",\"Cyuve\",\"Rwebeya\",\"Marantima\"]', 'P1', '2025-2026', '150010020', NULL, NULL, NULL, NULL, NULL),
(22, '150010021', 1, 'IMENA MUGISHA', 'NILAN', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0785446300', NULL, NULL, '0784728967', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IMENA MUGISHA\",\"NILAN\",\"M\",\"\",\"NTEZIRYAYO ERIC\",\"0785446300\",\"\",\"UWIMANA\",\"0784728967\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010021', NULL, NULL, NULL, NULL, NULL),
(23, '150010062', 1, 'IMPANO SHIMO', 'DAVE', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788823101', NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IMPANO SHIMO\",\"DAVE\",\"F\",\"\",\"NIYIBIGIRA VALENS\",\"0788823101\",\"\",\"UMUTONIWASE Patience\",\"07804523820\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010062', '07804523820', NULL, NULL, NULL, NULL),
(24, '150010022', 1, 'INEZA NDEKEZI', 'ELTON', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788307483', NULL, NULL, '0789752259', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"INEZA NDEKEZI\",\"ELTON\",\"F\",\"\",\"NDEKEZI Charles\",\"0788307483\",\"\",\"GATO Doreen\",\"0789752259\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010022', NULL, NULL, NULL, NULL, NULL),
(25, '150010023', 1, 'INEZAYIMANA', 'KELLIA', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0786911589', NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"INEZAYIMANA\",\"KELLIA\",\"M\",\"\",\"UWIRINGIYIMANA DANIEL\",\"0786911589\",\"\",\"MASOYINYANA JEAQUELINE\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010023', NULL, NULL, NULL, NULL, NULL),
(26, '150010024', 1, 'INGENZI', 'ABDOAH FAT', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"INGENZI\",\"ABDOAH FAT\",\"F\",\"\",\"KAGISHA CONSOLEE\",\"\",\"\",\"KAGISHA CONSOLEE\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010024', NULL, NULL, NULL, NULL, NULL),
(27, '150010025', 1, 'IRAKOZE', 'IANNY MULAIKA', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788610703', NULL, NULL, '0788833480', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IRAKOZE\",\"IANNY MULAIKA\",\"F\",\"\",\"DUSABIMANA\",\"0788610703\",\"\",\"MUSAZAWABO\",\"0788833480\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010025', NULL, NULL, NULL, NULL, NULL),
(28, '150010026', 1, 'IRAMUMPAYE', 'ANGE BLESSING', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IRAMUMPAYE\",\"ANGE BLESSING\",\"M\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010026', NULL, NULL, NULL, NULL, NULL),
(29, '150010027', 1, 'IRINATWE', 'TODAH GODWI', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IRINATWE\",\"TODAH GODWI\",\"F\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010027', NULL, NULL, NULL, NULL, NULL),
(30, '150010028', 1, 'ISHEJA', 'NAOMIE', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788553185', NULL, NULL, '0784716614', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"ISHEJA\",\"NAOMIE\",\"M\",\"\",\"NSENGIYUMVA BOSCO\",\"0788553185\",\"\",\"MUKAKABERA Jeannette\",\"0784716614\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010028', NULL, NULL, NULL, NULL, NULL),
(31, '150010029', 1, 'ISHEJA SONGA', 'GAEL', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"ISHEJA SONGA\",\"GAEL\",\"F\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010029', NULL, NULL, NULL, NULL, NULL),
(32, '150010030', 1, 'ISHEMA KUNDWA', 'MAY', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0783533599', NULL, NULL, '0783565900', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"ISHEMA KUNDWA\",\"MAY\",\"M\",\"\",\"MBONIMPA  Daniel\",783533599,\"\",\"NYIRANSABIMANA ESPERENCE\",783565900,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010030', NULL, NULL, NULL, NULL, NULL),
(33, '150010031', 1, 'ISHIMWE', 'CLEVER', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"ISHIMWE\",\"CLEVER\",\"M\",\"\",\"ISHIMWE\",44444,\"\",\"ISHIMWE\",55555,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010031', NULL, NULL, NULL, NULL, NULL),
(34, '150010063', 1, 'ISHIMWE', 'ELLA GAELLA', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0783650215', NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"ISHIMWE\",\"ELLA GAELLA\",\"F\",\"\",\"MANISHIMWE\",\"0783650215\",\"\",\"NYIRAMUGISHA\",\"072542269\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010063', '072542269', NULL, NULL, NULL, NULL),
(35, '150010032', 1, 'ISHIMWE', 'FILLETE', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0782564750', NULL, NULL, '0780789007', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"ISHIMWE\",\"FILLETE\",\"F\",\"\",\"BYABUZE Vedaste\",\"0782564750\",\"\",\"MUKAMANA Scovia\",\"0780789007\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010032', NULL, NULL, NULL, NULL, NULL),
(36, '150010033', 1, 'KALIMBA KAZADI', 'ALIYAH AMELIA', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788600881', NULL, NULL, '0733286819', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"KALIMBA KAZADI\",\"ALIYAH AMELIA\",\"F\",\"\",\"KALIMBA\",\"0788600881\",\"\",\"UMUHUZA Vestine\",\"0733286819\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010033', NULL, NULL, NULL, NULL, NULL),
(37, '150010064', 1, 'KAYIRANGA', 'AURORE MERVEILLE', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0788878363', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"KAYIRANGA\",\"AURORE MERVEILLE\",\"F\",\"\",\"KAYIRANGA\",\"07887675590\",\"\",\"UWIZIHIRWA Marie\",\"0788878363\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010064', '07887675590', NULL, NULL, NULL, NULL),
(38, '150010034', 1, 'KAZUBA', 'LEILA HORTANCE', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0785000000', NULL, NULL, '0786000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"KAZUBA\",\"LEILA HORTANCE\",\"F\",\"LORNA\",\"KAZUBA ERIC\",785000000,\"\",\"BAMURANGE PROVIDENCE\",786000000,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010034', NULL, NULL, NULL, NULL, NULL),
(39, '150010035', 1, 'KUNDWA', 'MUSAGO', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"KUNDWA MUSAGO\",\"\",\"F\",\"\",\"GABIRO\",44444,\"\",\"GABIRO\",33333,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010035', NULL, NULL, NULL, NULL, NULL),
(40, '150010036', 1, 'KUNDWA GABIRO', 'GRAINE', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0782042128', NULL, NULL, '0780459293', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"KUNDWA GABIRO\",\"GRAINE\",\"F\",\"\",\"NTEZIRYAYO ERIC\",\"0782042128\",\"\",\"MUKANDAYISENGA\",\"0780459293\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010036', NULL, NULL, NULL, NULL, NULL),
(41, '150010037', 1, 'MANZI', 'HUZAIFA', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"MANZI\",\"HUZAIFA\",\"M\",\"\",\"GABIRO\",4444,\"\",\"GABIRO\",33333,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010037', NULL, NULL, NULL, NULL, NULL),
(42, '150010038', 1, 'MANZI RWIGEMA', 'JUNIOR', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"MANZI RWIGEMA\",\"JUNIOR\",\"M\",\"\",\"RWIGEMA\",22222,\"\",\"RWIGEMA\",33333,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010038', NULL, NULL, NULL, NULL, NULL),
(43, '150010039', 1, 'MAOMBI', 'CELINE', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"MAOMBI\",\"CELINE\",\"F\",\"\",\"RWIGEMA\",33333,\"\",\"RWIGEMA\",33333,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010039', NULL, NULL, NULL, NULL, NULL),
(44, '150010065', 1, 'MAZIA', 'KEBRON', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"MAZIA\",\"KEBRON\",\"F\",\"\",\"KAGISHA CONSOLEE\",8999999,\"\",\"KAGISHA CONSOLEE\",900000000,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010065', '900000000', NULL, NULL, NULL, NULL),
(45, '150010040', 1, 'MFURAKAZI', 'NADIA INNOCENTE', 'Female', NULL, 'Rwandan', 'East', 'Gatsibo', 'Gatsibo', 'Nyabicwamba', 'Kigarama', NULL, '0783000000', NULL, NULL, '0783000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[]', '[\"\",\"\",\"MFURAKAZI\",\"NADIA INNOCENTE\",\"F\",\"\",\"NDAGIJIMANA INNOCENT\",783000000,\"\",\"MUKAMBUGUJE SOLANGE\",783000000,\"\",\"\",\"East\",\"Gatsibo\",\"Gatsibo\",\"Nyabicwamba\",\"Kigarama\"]', 'P1', '2025-2026', '150010040', NULL, NULL, NULL, NULL, NULL),
(46, '150010041', 1, 'MUGABO', 'ANGEL QUEEN', 'Female', NULL, 'Rwandan', 'RWANDAN', NULL, NULL, NULL, NULL, NULL, '0787000000', NULL, NULL, '0724000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"MUGABO\",\"ANGEL QUEEN\",\"F\",\"\",\"NTAKIRUTIMANA EGIDE\",787000000,\"\",\"MUTONIWASE PATIENCE\",724000000,\"\",\"RWANDAN\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010041', NULL, NULL, NULL, NULL, NULL),
(47, '150010042', 1, 'MUGABO ANGEL', 'QUEEN', 'Female', NULL, 'Rwandan', 'Kigali', 'Nyarugenge', 'Kigali', 'Nyabugogo', 'Nyabikoni', NULL, '0787000000', 'xxxx@gmail.com', NULL, '0787000000', 'xxx@gmail.com', '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[]', '[\"\",\"\",\"MUGABO ANGEL\",\"QUEEN\",\"F\",\"\",\"MUGABO Innocent\",787000000,\"xxxx@gmail.com\",\"UMUTONIWASE Patience\",787000000,\"xxx@gmail.com\",\"Rwanda\",\"Kigali\",\"Nyarugenge\",\"Kigali\",\"Nyabugogo\",\"Nyabikoni\"]', 'P1', '2025-2026', '150010042', NULL, NULL, NULL, NULL, NULL),
(48, '150010043', 1, 'MUGISHA SANO', 'ARCHANGE', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789000000', NULL, NULL, '0783000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"MUGISHA SANO\",\"ARCHANGE\",\"M\",\"\",\"HABUMUGISHA FRANCOIS XAVIER\",789000000,\"\",\"KAMPIRE INNOCENTE\",783000000,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010043', NULL, NULL, NULL, NULL, NULL),
(49, '150010044', 1, 'MUGISHA TETA', 'OLGA', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788643012', NULL, NULL, '0788649464', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"MUGISHA TETA\",\"OLGA\",\"F\",\"\",\"TUYISENGE Gervais\",\"0788643012\",\"\",\"UFITINEMA\",\"0788649464\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010044', NULL, NULL, NULL, NULL, NULL),
(50, '150010045', 1, 'MUNEZERO', 'KEILLA', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"MUNEZERO\",\"KEILLA\",\"F\",\"\",\"MUKESHIMANA\",666666,\"\",\"MUKESHIMANA\",3333,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010045', NULL, NULL, NULL, NULL, NULL),
(51, '150010046', 1, 'NATETE', 'BRIELLA', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788836124', NULL, NULL, '0788736184', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"NATETE\",\"BRIELLA\",\"F\",\"\",\"NDAHIMANA \",\"0788836124\",\"\",\"UWAYO\",\"0788736184\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010046', NULL, NULL, NULL, NULL, NULL),
(52, '150010047', 1, 'NEZERWA', 'ASANTE', 'Female', NULL, 'Rwandan', 'North', 'Musanze', 'Busogo', 'Sahara', 'Nyarubuye', NULL, '0781000000', NULL, NULL, '0786000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[]', '[\"\",\"\",\"NEZERWA\",\"ASANTE\",\"F\",\"\",\"TUGIRIMANA LEONARD\",781000000,\"\",\"NYIRANDATIRA ANGELIQUE\",786000000,\"\",\"\",\"North\",\"Musanze\",\"Busogo\",\"Sahara\",\"Nyarubuye\"]', 'P1', '2025-2026', '150010047', NULL, NULL, NULL, NULL, NULL),
(53, '150010048', 1, 'NISHIMWE MIKA', 'JUNIOR', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788407703', NULL, NULL, '0788832647', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"NISHIMWE MIKA\",\"JUNIOR\",\"M\",\"\",\"TUYISENGE Jean\",\"0788407703\",\"\",\"AMINA Bernadette\",\"0788832647\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010048', NULL, NULL, NULL, NULL, NULL),
(54, '150010049', 1, 'NKESHIMANA', 'ELLA AURORE', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788835052', NULL, NULL, '0784138834', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"NKESHIMANA\",\"ELLA AURORE\",\"F\",\"\",\"MUKESHIMANA\",\"0788835052\",\"\",\"NZINAYO\",\"0784138834\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010049', NULL, NULL, NULL, NULL, NULL),
(55, '150010050', 1, 'NTWARI', 'BRAVE', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"NTWARI\",\"BRAVE\",\"M\",\"\",\"NISHIMWE\",7777777,\"\",\"NISHIMWE\",3333,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010050', NULL, NULL, NULL, NULL, NULL),
(56, '150010051', 1, 'NTWARI MAOMBI', 'MAEL', 'Male', NULL, 'Rwandan', 'North', 'Musanze', 'Musanze', 'Kabazungu', 'Kidendezi', NULL, '0798475369', NULL, NULL, '0789000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[]', '[\"\",\"\",\"NTWARI MAOMBI\",\"MAEL\",\"M\",\"\",\"MAOMBI MURENZI\",\"0798475369\",\"\",\"NYIRARUKUNDO\",789000000,\"\",\"\",\"North\",\"Musanze\",\"Musanze\",\"Kabazungu\",\"Kidendezi\"]', 'P1', '2025-2026', '150010051', NULL, NULL, NULL, NULL, NULL),
(57, '150010052', 1, 'RUGWIRO', 'OWEN IBRAHIM', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0783331233', 'UMUTONI Francoise', NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"RUGWIRO\",\"OWEN IBRAHIM\",\"M\",\"\",\"IBRAHIM SHAKUR\",\"0783331233\",\"UMUTONI Francoise\",\"0781048801\",3333,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010052', NULL, NULL, NULL, NULL, NULL),
(58, '150010053', 1, 'RUGWIRO', 'PEACE GAEL', 'Female', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"RUGWIRO\",\"PEACE GAEL\",\"F\",\"\",\"RUGWIRO\",333,\"\",\"RUGWIRO\",333,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010053', NULL, NULL, NULL, NULL, NULL),
(59, '150010054', 1, 'RUGWIRO SAFARI', 'PRIDE', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789000000', NULL, NULL, '0789000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"RUGWIRO SAFARI\",\"PRIDE\",\"M\",\"\",\"RUGWIRO\",789000000,\"\",\"RUGWIRO\",789000000,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010054', NULL, NULL, NULL, NULL, NULL),
(60, '150010055', 1, 'RWEMA MUSONERA', 'NARDO', 'Male', NULL, 'Rwandan', 'North', 'Musanze', 'Muhoza', 'Ruhengeri', 'Burera', NULL, '0783000000', NULL, NULL, '0787000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[]', '[\"\",\"\",\"RWEMA MUSONERA\",\"NARDO\",\"M\",\"\",\"MUSONERA BARAKABUYE\",783000000,\"\",\"MUHORAKEYE DIVINE\",787000000,\"\",\"\",\"North\",\"Musanze\",\"Muhoza\",\"Ruhengeri\",\"Burera\"]', 'P1', '2025-2026', '150010055', NULL, NULL, NULL, NULL, NULL),
(61, '150010056', 1, 'SHIMWA', 'DANIVA', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0785000000', NULL, NULL, '0785000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"SHIMWA\",\"DANIVA\",\"M\",\"\",\"NIYIBIGIRA VALENS\",785000000,\"\",\"MUTONIWASE DENYSE\",785000000,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010056', NULL, NULL, NULL, NULL, NULL),
(62, '150010057', 1, 'USANASE', 'PRINCE', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0789000000', NULL, NULL, '0789000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"USANASE\",\"PRINCE\",\"M\",\"\",\"USANASE JEAN DE DIEU\",789000000,\"\",\"NIBAGWIRE MIREILLE\",789000000,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010057', NULL, NULL, NULL, NULL, NULL),
(63, '150010058', 1, 'IMANA', 'TURIKUMWE', NULL, NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0784231047', NULL, NULL, '0789109637', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"IMANA TURIKUMWE \",\"\",\"\",\"\",\"IMANATURIKUMWE\",\"0784231047\",\"\",\"MUKARUKUNDO \",\"0789109637\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010058', NULL, NULL, NULL, NULL, NULL),
(64, '150010059', 1, 'BONANE ', 'BOAZ', NULL, NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0788781797', NULL, NULL, NULL, NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"BONANE \",\"BOAZ\",\"\",\"\",\"BONANE Janvier\",\"0788781797\",\"\",\"NYIRAKANYANA\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010059', NULL, NULL, NULL, NULL, NULL),
(65, '150010060', 1, 'UWUMUKIZA', 'CHRISTIAN', 'Male', NULL, 'Rwandan', NULL, NULL, NULL, NULL, NULL, NULL, '0785000000', NULL, NULL, '0785000000', NULL, '2026-04-14 19:59:33', '2026-04-14 19:59:33', '[\"Province\",\"District\",\"Sector\",\"Cell\",\"Village\"]', '[\"\",\"\",\"UWUMUKIZA\",\"CHRISTIAN\",\"M\",\"\",\"UWUMUKIZA\",785000000,\"\",\"UWUMUKIZA\",785000000,\"\",\"\",\"\",\"\",\"\",\"\",\"\"]', 'P1', '2025-2026', '150010060', NULL, NULL, NULL, NULL, NULL),
(66, '110010001', 2, 'MANZI', 'Cledo', 'Male', 2009, 'Rwandan', 'Eastern Province', 'Kayonza', 'Rukara', 'Rwimishinya', 'Nyarutunga I', 'MATAYO Eric', '0789876565', NULL, NULL, NULL, NULL, '2026-04-15 09:10:07', '2026-04-15 09:10:07', NULL, NULL, 'S4', '2025-2026', '110010001', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `student_permissions`
--

CREATE TABLE `student_permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `reason` text DEFAULT NULL,
  `permission_type` enum('MEDICAL','FAMILY','OFFICIAL','OTHER') DEFAULT 'OTHER',
  `status` enum('PENDING','APPROVED','REJECTED','CANCELLED') DEFAULT 'PENDING',
  `requested_by_user_id` int(10) UNSIGNED NOT NULL,
  `approved_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `key` varchar(64) NOT NULL,
  `value` varchar(255) NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`key`, `value`, `updated_at`) VALUES
('maintenance_mode', '0', '2026-03-28 19:46:06');

-- --------------------------------------------------------

--
-- Table structure for table `uniform_voucher_items`
--

CREATE TABLE `uniform_voucher_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `uniform_type` enum('school','sports') NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(512) DEFAULT NULL,
  `sizes_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`sizes_json`)),
  `colors_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`colors_json`)),
  `price_rwf` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `stock_qty` int(11) DEFAULT NULL,
  `gender_scope` enum('any','male','female') NOT NULL DEFAULT 'any',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `uniform_voucher_items`
--

INSERT INTO `uniform_voucher_items` (`id`, `uniform_type`, `name`, `description`, `image_url`, `sizes_json`, `colors_json`, `price_rwf`, `stock_qty`, `gender_scope`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'school', 'Shirt', 'Classic school shirt', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912063361-91843993.png', '[\"XS\",\"S\",\"M\",\"L\",\"XL\",\"38\",\"40\",\"42\"]', '[\"Navy\",\"White\"]', 12000, 2000, 'any', 1, 1, '2026-04-11 14:18:05', '2026-04-11 14:54:38'),
(2, 'school', 'Trousers', 'Tailored school trousers', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912147591-929797677.png', '[\"22\",\"24\",\"26\",\"28\",\"30\",\"32\",\"34\",\"36\",\"38\",\"40\"]', '[\"Navy\",\"Black\"]', 15000, 50000, 'any', 1, 2, '2026-04-11 14:18:06', '2026-04-11 14:55:47'),
(3, 'school', 'Skirt', 'Pleated school skirt', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912162009-603365349.png', '[\"22\",\"24\",\"26\",\"28\",\"30\",\"32\"]', '[\"Navy\"]', 14000, 50000, 'any', 1, 3, '2026-04-11 14:18:06', '2026-04-11 14:56:02'),
(4, 'school', 'Sweater', 'V-neck pullover', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912188192-848068556.png', '[\"XS\",\"S\",\"M\",\"L\",\"XL\"]', '[\"Navy\",\"Grey\"]', 18000, NULL, 'any', 1, 4, '2026-04-11 14:18:08', '2026-04-11 14:56:28'),
(5, 'school', 'Blazer', 'Formal blazer', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912204083-219492970.png', '[\"XS\",\"S\",\"M\",\"L\",\"XL\"]', '[\"Navy\"]', 35000, NULL, 'any', 1, 5, '2026-04-11 14:18:08', '2026-04-11 14:56:44'),
(6, 'school', 'Tie', 'School tie', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912217066-43213715.png', '[\"One size\"]', '[\"Striped navy\"]', 5000, NULL, 'any', 1, 6, '2026-04-11 14:18:09', '2026-04-11 14:56:57'),
(7, 'school', 'Socks', 'Knee-high socks', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912231550-723670189.png', '[\"S\",\"M\",\"L\"]', '[\"Navy\",\"White\"]', 3000, NULL, 'any', 1, 7, '2026-04-11 14:18:09', '2026-04-11 14:57:11'),
(8, 'school', 'Belt', 'Leather belt', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912251198-240147061.png', '[\"S\",\"M\",\"L\",\"XL\"]', '[\"Black\",\"Brown\"]', 4000, NULL, 'any', 1, 8, '2026-04-11 14:18:10', '2026-04-11 14:57:31'),
(9, 'sports', 'Sports T-shirt', 'Breathable PE shirt', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912262780-475159644.png', '[\"XS\",\"S\",\"M\",\"L\",\"XL\"]', '[\"House colours\"]', 8000, NULL, 'any', 1, 1, '2026-04-11 14:18:10', '2026-04-11 14:57:42'),
(10, 'sports', 'Sports trousers', 'Track pants', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912272703-915227375.png', '[\"XS\",\"S\",\"M\",\"L\",\"XL\"]', '[\"Navy\",\"Black\"]', 12000, NULL, 'any', 1, 2, '2026-04-11 14:18:10', '2026-04-11 14:57:52'),
(11, 'sports', 'Shorts', 'PE shorts', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912283707-341564508.png', '[\"XS\",\"S\",\"M\",\"L\",\"XL\"]', '[\"Navy\"]', 7000, NULL, 'any', 1, 3, '2026-04-11 14:18:10', '2026-04-11 14:58:03'),
(12, 'sports', 'Tracksuit', 'Warm-up tracksuit', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912298271-671187054.png', '[\"XS\",\"S\",\"M\",\"L\",\"XL\"]', '[\"Navy\"]', 28000, NULL, 'any', 1, 4, '2026-04-11 14:18:10', '2026-04-11 14:58:18'),
(13, 'sports', 'Sports shoes', 'Indoor / outdoor trainers', '/uploads/uniform-vouchers/uv-Gemini_Generated_Image_2u4r982u4r982-1775912310926-117977725.png', '[\"30\",\"32\",\"34\",\"36\",\"38\",\"40\",\"42\",\"44\"]', '[\"Black\",\"White\"]', 25000, 30000, 'any', 1, 5, '2026-04-11 14:18:10', '2026-04-11 14:58:30');

-- --------------------------------------------------------

--
-- Table structure for table `uniform_voucher_orders`
--

CREATE TABLE `uniform_voucher_orders` (
  `id` int(10) UNSIGNED NOT NULL,
  `order_number` varchar(40) NOT NULL,
  `voucher_number` varchar(40) NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `uniform_type` enum('school','sports') NOT NULL,
  `order_district` varchar(120) DEFAULT NULL,
  `order_sector` varchar(120) DEFAULT NULL,
  `student_detail_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`student_detail_json`)),
  `school_detail_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`school_detail_json`)),
  `lines_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`lines_json`)),
  `delivery_method` enum('school','home') NOT NULL,
  `delivery_detail_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`delivery_detail_json`)),
  `subtotal_rwf` int(10) UNSIGNED NOT NULL,
  `delivery_fee_rwf` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `total_rwf` int(10) UNSIGNED NOT NULL,
  `booking_status` varchar(32) NOT NULL DEFAULT 'Booked',
  `payment_status` varchar(24) NOT NULL DEFAULT 'Unpaid',
  `delivery_status` varchar(48) NOT NULL DEFAULT 'Waiting',
  `payer_name` varchar(160) DEFAULT NULL,
  `payer_phone` varchar(64) DEFAULT NULL,
  `payment_method` varchar(32) DEFAULT NULL,
  `payment_reference` varchar(160) DEFAULT NULL,
  `payment_provider_json` longtext DEFAULT NULL,
  `assigned_agent_user_id` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `uniform_voucher_orders`
--

INSERT INTO `uniform_voucher_orders` (`id`, `order_number`, `voucher_number`, `student_id`, `school_id`, `uniform_type`, `order_district`, `order_sector`, `student_detail_json`, `school_detail_json`, `lines_json`, `delivery_method`, `delivery_detail_json`, `subtotal_rwf`, `delivery_fee_rwf`, `total_rwf`, `booking_status`, `payment_status`, `delivery_status`, `payer_name`, `payer_phone`, `payment_method`, `payment_reference`, `payment_provider_json`, `assigned_agent_user_id`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'UVO-2026-A3227F', 'UNI-2026-458A0FF6', 72, 3, 'school', 'Gasabo', 'Remera', '{\"id\":72,\"student_code\":\"040030004\",\"first_name\":\"Manzi Ineza\",\"last_name\":\"Karebu\",\"gender\":\"Male\",\"class_name\":\"P1\",\"district\":\"Gakenke\",\"sector\":\"Muyongwe\",\"cell\":\"Bumba\",\"village\":\"Gitwe\",\"parent_guardian\":{\"father_name\":\"KARACYE Evode\",\"father_phone\":\"0789090909\",\"mother_name\":\"MARITA Aneth\",\"mother_phone\":\"0798090909\"}}', '{\"school_id\":3,\"school_name\":\"ECOLE NOTRE DAME DES ANGES\",\"school_code\":\"003\",\"district\":\"Gasabo\",\"sector\":\"Remera\",\"province\":\"Kigali City\"}', '[{\"item_id\":1,\"name\":\"Shirt\",\"size\":\"XS\",\"color\":\"Navy\",\"qty\":1,\"unit_price_rwf\":12000,\"line_total_rwf\":12000},{\"item_id\":2,\"name\":\"Trousers\",\"size\":\"22\",\"color\":\"Navy\",\"qty\":1,\"unit_price_rwf\":15000,\"line_total_rwf\":15000},{\"item_id\":3,\"name\":\"Skirt\",\"size\":\"22\",\"color\":\"Navy\",\"qty\":1,\"unit_price_rwf\":14000,\"line_total_rwf\":14000},{\"item_id\":4,\"name\":\"Sweater\",\"size\":\"XS\",\"color\":\"Navy\",\"qty\":1,\"unit_price_rwf\":18000,\"line_total_rwf\":18000}]', 'school', '{}', 59000, 0, 59000, 'Booked', 'Unpaid', 'Waiting', NULL, NULL, NULL, NULL, NULL, 35, NULL, '2026-04-11 14:26:47', '2026-04-11 15:00:19');

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
(1, 'SA-706896305', 'ishimwetheo488@gmail.com', NULL, '+250798699601', '$2b$10$HBOIRb/fyVghQrzqSpIeIeFrcXRLfM3WI/zVKJgvD2b2ni6S0wyG2', 'Ishimwe', 'Theoneste', NULL, NULL, 1, NULL, NULL, NULL, NULL, 1, 1, 0, NULL, 0, 0, '2026-04-14 19:43:00', '::1', NULL, NULL, NULL, '2026-03-06 06:18:26', '2026-04-14 19:43:00', NULL, NULL),
(33, 'FSC-117964849', 'ishimwetheoneste488@gmail.com', NULL, '0796898894', '$2b$10$ZHDUwgsuJsAFSP7BG8b6yuD/l07bdXix.RGYsbXBPKyBi2KQKyPHm', 'Ishimwe', 'Theoneste', NULL, NULL, 14, NULL, NULL, NULL, NULL, 1, 1, 0, NULL, 0, 0, '2026-03-28 22:04:14', '::1', NULL, NULL, NULL, '2026-03-28 22:01:57', '2026-03-28 22:04:14', NULL, NULL),
(43, 'SM-179167988', 'wisdomschoolmusanze@babyeyi.rw', 'wisdomschoolmusanze_sm1', NULL, '$2b$10$qqonNMx5kLiPF3WPyl4ou.Tu4x4R.u2QHXDban36dHODxTOccFw7K', 'NDUWAYESU', 'Elie', NULL, NULL, 2, 1, 'Musanze', 'Northern Province', 'Cyuve', 1, 1, 0, NULL, 3, 0, '2026-04-14 19:58:16', '::1', NULL, NULL, NULL, '2026-04-14 19:36:19', '2026-04-15 09:16:48', NULL, NULL),
(44, 'SM-062210907', 'gsrukaratss@gmail.com', 'gsrukaratss_sm2', NULL, '$2b$10$AiJfqWqCOzAAFjo24bpoI.dXJbNmVFmBJ4u1wBhqpZFGNcG/xjXBO', 'IZERE', 'Peter', NULL, NULL, 2, 2, 'Kayonza', 'Eastern Province', 'Rukara', 1, 1, 0, NULL, 0, 0, '2026-04-15 09:24:36', '::1', NULL, NULL, NULL, '2026-04-15 08:21:02', '2026-04-15 09:24:36', NULL, NULL),
(45, 'ST-106894640', 'gsrukarateacher@gmail.com', 'gsrukarateacher', '0798699601', '$2b$12$C9QuXFbB.B.02WoKfkU3EeAGcG7iNgvFFCSsOK1BKEfoBavM17TBy', 'Ishimwe', 'Theoneste', NULL, NULL, 4, 2, NULL, NULL, NULL, 1, 1, 0, NULL, 0, 0, '2026-04-15 09:29:51', '::1', NULL, NULL, NULL, '2026-04-15 09:28:26', '2026-04-15 09:29:51', NULL, NULL),
(46, 'ST-314531062', 'gsrukaraaccountant@gmail.com', 'gsrukaraaccountant', '0798676545', '$2b$12$uShhu2CugNg89QyHt4XaRO8104ZLaA4a.c6r8S3xDqDoG43ppk7HG', 'MIZERO', 'Alice', NULL, NULL, 8, 2, NULL, NULL, NULL, 1, 1, 0, NULL, 0, 0, '2026-04-15 20:34:45', '::1', NULL, NULL, NULL, '2026-04-15 12:01:54', '2026-04-15 20:34:45', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `vouchers`
--

CREATE TABLE `vouchers` (
  `id` int(10) UNSIGNED NOT NULL,
  `voucher_code` varchar(48) NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED DEFAULT NULL,
  `service_id` int(10) UNSIGNED NOT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('pending','paid','redeemed','expired','cancelled') NOT NULL DEFAULT 'pending',
  `qr_code_path` varchar(512) DEFAULT NULL,
  `redeemed_at` datetime DEFAULT NULL,
  `redeemed_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_redemptions`
--

CREATE TABLE `voucher_redemptions` (
  `id` int(10) UNSIGNED NOT NULL,
  `voucher_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `redeemed_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `redeemed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `xentripay_webhook_logs`
--

CREATE TABLE `xentripay_webhook_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `event_type` varchar(120) DEFAULT NULL,
  `provider_status` varchar(60) DEFAULT NULL,
  `reference_value` varchar(160) DEFAULT NULL,
  `intent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `matched_intent` tinyint(1) NOT NULL DEFAULT 0,
  `processing_status` varchar(40) NOT NULL DEFAULT 'received',
  `error_message` varchar(255) DEFAULT NULL,
  `payload_json` longtext DEFAULT NULL,
  `headers_json` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `processed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `academic_assessments`
--
ALTER TABLE `academic_assessments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assess_school` (`school_id`,`class_name`);

--
-- Indexes for table `academic_attendance_logs`
--
ALTER TABLE `academic_attendance_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_att_log_date` (`school_id`,`timetable_id`,`record_date`);

--
-- Indexes for table `academic_attendance_records`
--
ALTER TABLE `academic_attendance_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_att_rec` (`log_id`,`student_id`);

--
-- Indexes for table `academic_marks`
--
ALTER TABLE `academic_marks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_student_assessment` (`assessment_id`,`student_id`);

--
-- Indexes for table `academic_timetables`
--
ALTER TABLE `academic_timetables`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tt_school_staff` (`school_id`,`staff_id`);

--
-- Indexes for table `accountant_expenses`
--
ALTER TABLE `accountant_expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_exp_school` (`school_id`),
  ADD KEY `idx_exp_status` (`status`);

--
-- Indexes for table `accountant_expense_payments`
--
ALTER TABLE `accountant_expense_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_exp_pay_school` (`school_id`),
  ADD KEY `idx_exp_pay_expense` (`expense_id`);

--
-- Indexes for table `accountant_payroll_rates`
--
ALTER TABLE `accountant_payroll_rates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payroll_rate_school_role` (`school_id`,`role_code`);

--
-- Indexes for table `accountant_payroll_runs`
--
ALTER TABLE `accountant_payroll_runs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payroll_runs_school` (`school_id`),
  ADD KEY `idx_payroll_runs_created` (`created_at`);

--
-- Indexes for table `accountant_payroll_run_lines`
--
ALTER TABLE `accountant_payroll_run_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payroll_line_run` (`run_id`),
  ADD KEY `idx_payroll_line_school` (`school_id`);

--
-- Indexes for table `accountant_payroll_staff_overrides`
--
ALTER TABLE `accountant_payroll_staff_overrides`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payroll_staff_override` (`school_id`,`user_id`);

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
  ADD UNIQUE KEY `uq_invoice_no` (`invoice_no`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_babyeyi` (`babyeyi_id`),
  ADD KEY `idx_payer_phone` (`payer_phone`),
  ADD KEY `idx_invoice_status` (`invoice_status`);

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
-- Indexes for table `field_agent_profiles`
--
ALTER TABLE `field_agent_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_fap_user` (`user_id`),
  ADD KEY `idx_fap_district` (`district`),
  ADD KEY `idx_fap_province` (`province`);

--
-- Indexes for table `field_agent_support_requests`
--
ALTER TABLE `field_agent_support_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fasr_agent` (`agent_user_id`),
  ADD KEY `idx_fasr_location` (`province`,`district`,`sector`),
  ADD KEY `idx_fasr_status` (`status`);

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
-- Indexes for table `momo_transactions`
--
ALTER TABLE `momo_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_id` (`reference_id`),
  ADD KEY `idx_reference_id` (`reference_id`),
  ADD KEY `idx_external_id` (`external_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_intent` (`intent_id`);

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
  ADD KEY `idx_parent_portal_phone` (`phone`),
  ADD KEY `idx_parent_recovery_email` (`recovery_email`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_permission_key` (`permission_key`);

--
-- Indexes for table `portal_operation_audit_logs`
--
ALTER TABLE `portal_operation_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_portal_audit_school` (`school_id`),
  ADD KEY `idx_portal_audit_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_portal_audit_created` (`created_at`);

--
-- Indexes for table `portal_requisitions`
--
ALTER TABLE `portal_requisitions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_req_school` (`school_id`),
  ADD KEY `idx_req_status` (`status`),
  ADD KEY `idx_req_source` (`source_portal`);

--
-- Indexes for table `portal_ticha_ai_history`
--
ALTER TABLE `portal_ticha_ai_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ai_school_user` (`school_id`,`user_id`),
  ADD KEY `idx_ai_created` (`created_at`);

--
-- Indexes for table `pro_shule_avance_applications`
--
ALTER TABLE `pro_shule_avance_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_shule_user` (`user_id`),
  ADD KEY `idx_shule_school` (`school_id`),
  ADD KEY `idx_shule_status` (`status`);

--
-- Indexes for table `pro_shule_avance_organizations`
--
ALTER TABLE `pro_shule_avance_organizations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sa_org_login_username` (`login_username`),
  ADD UNIQUE KEY `uq_sa_org_user` (`user_id`),
  ADD UNIQUE KEY `uq_sa_org_contact_email` (`contact_email`),
  ADD KEY `idx_sa_org_active` (`is_active`);

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
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_role_perm` (`role_id`,`permission_key`),
  ADD KEY `idx_role_permissions_role` (`role_id`),
  ADD KEY `idx_role_permissions_key` (`permission_key`);

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
-- Indexes for table `school_classes`
--
ALTER TABLE `school_classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school_id` (`school_id`);

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
-- Indexes for table `school_gate_logs`
--
ALTER TABLE `school_gate_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_gate_school` (`school_id`),
  ADD KEY `idx_gate_person` (`person_type`),
  ADD KEY `idx_gate_time` (`logged_at`);

--
-- Indexes for table `school_gradebook_columns`
--
ALTER TABLE `school_gradebook_columns`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_school_slug` (`school_id`,`slug`),
  ADD KEY `idx_school_order` (`school_id`,`sort_order`);

--
-- Indexes for table `school_leaders`
--
ALTER TABLE `school_leaders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_role` (`role_type`);

--
-- Indexes for table `school_library_books`
--
ALTER TABLE `school_library_books`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_library_school` (`school_id`),
  ADD KEY `idx_library_status` (`status`);

--
-- Indexes for table `school_library_checkouts`
--
ALTER TABLE `school_library_checkouts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_checkouts_school` (`school_id`),
  ADD KEY `idx_checkouts_book` (`book_id`),
  ADD KEY `idx_checkouts_status` (`status`);

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
-- Indexes for table `school_module_access`
--
ALTER TABLE `school_module_access`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_school_module` (`school_id`,`module_key`),
  ADD KEY `idx_school_module_access_school` (`school_id`);

--
-- Indexes for table `school_stock_items`
--
ALTER TABLE `school_stock_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_stock_items_school` (`school_id`);

--
-- Indexes for table `school_stock_movements`
--
ALTER TABLE `school_stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_stock_mv_school` (`school_id`),
  ADD KEY `idx_stock_mv_item` (`item_id`);

--
-- Indexes for table `school_subjects`
--
ALTER TABLE `school_subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_school_subject` (`school_id`,`name`),
  ADD KEY `idx_school_subjects_school` (`school_id`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_services_code` (`service_code`),
  ADD KEY `idx_services_status_year` (`status`,`academic_year`);

--
-- Indexes for table `service_orders`
--
ALTER TABLE `service_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_order_number` (`order_number`),
  ADD KEY `idx_so_service` (`service_id`);

--
-- Indexes for table `service_payments`
--
ALTER TABLE `service_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pay_order` (`order_id`);

--
-- Indexes for table `service_prices`
--
ALTER TABLE `service_prices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sp_service` (`service_id`),
  ADD KEY `idx_sp_school` (`school_id`);

--
-- Indexes for table `shule_avance_requests`
--
ALTER TABLE `shule_avance_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sa_school` (`school_id`),
  ADD KEY `idx_sa_teacher` (`teacher_user_id`),
  ADD KEY `idx_sa_status` (`status`),
  ADD KEY `idx_sa_submitted` (`submitted_at`);

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
-- Indexes for table `standard_shule_kits`
--
ALTER TABLE `standard_shule_kits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ssk_grade` (`grade_level`),
  ADD KEY `idx_ssk_status` (`status`),
  ADD KEY `idx_ssk_sort` (`sort_order`);

--
-- Indexes for table `standard_shule_kit_requests`
--
ALTER TABLE `standard_shule_kit_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sskr_request_no` (`request_no`),
  ADD KEY `idx_sskr_agent` (`agent_user_id`),
  ADD KEY `idx_sskr_school` (`school_id`),
  ADD KEY `idx_sskr_status` (`status`,`payment_status`),
  ADD KEY `fk_sskr_req_kit` (`kit_id`);

--
-- Indexes for table `standard_shule_kit_request_payments`
--
ALTER TABLE `standard_shule_kit_request_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sskrp_request` (`request_id`);

--
-- Indexes for table `standard_shule_kit_requirements`
--
ALTER TABLE `standard_shule_kit_requirements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sskr_kit` (`kit_id`);

--
-- Indexes for table `store_inventory_items`
--
ALTER TABLE `store_inventory_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_store_item_school` (`school_id`);

--
-- Indexes for table `store_movements`
--
ALTER TABLE `store_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_store_mov_school` (`school_id`),
  ADD KEY `idx_store_mov_item` (`item_id`);

--
-- Indexes for table `store_suppliers`
--
ALTER TABLE `store_suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_store_sup_school` (`school_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_student_uid_school` (`student_uid`,`school_id`),
  ADD KEY `idx_students_school_id` (`school_id`),
  ADD KEY `idx_students_student_uid` (`student_uid`),
  ADD KEY `idx_students_school_rfid` (`school_id`,`rfid_uid`),
  ADD KEY `idx_students_school_fingerprint` (`school_id`,`fingerprint_id`);

--
-- Indexes for table `student_permissions`
--
ALTER TABLE `student_permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_perm_school` (`school_id`),
  ADD KEY `idx_perm_student` (`student_id`),
  ADD KEY `idx_perm_dates` (`starts_at`,`ends_at`),
  ADD KEY `idx_perm_status` (`status`);

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
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `uniform_voucher_items`
--
ALTER TABLE `uniform_voucher_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_uvi_type_active` (`uniform_type`,`is_active`);

--
-- Indexes for table `uniform_voucher_orders`
--
ALTER TABLE `uniform_voucher_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_uvo_order` (`order_number`),
  ADD UNIQUE KEY `uq_uvo_voucher` (`voucher_number`),
  ADD KEY `idx_uvo_student` (`student_id`),
  ADD KEY `idx_uvo_school` (`school_id`),
  ADD KEY `idx_uvo_loc` (`order_district`,`order_sector`),
  ADD KEY `idx_uvo_pay` (`payment_status`,`booking_status`),
  ADD KEY `idx_uvo_agent` (`assigned_agent_user_id`);

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
-- Indexes for table `vouchers`
--
ALTER TABLE `vouchers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_voucher_code` (`voucher_code`),
  ADD KEY `idx_v_order` (`order_id`),
  ADD KEY `idx_v_service` (`service_id`);

--
-- Indexes for table `voucher_redemptions`
--
ALTER TABLE `voucher_redemptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vr_voucher` (`voucher_id`);

--
-- Indexes for table `xentripay_webhook_logs`
--
ALTER TABLE `xentripay_webhook_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_xwl_created` (`created_at`),
  ADD KEY `idx_xwl_ref` (`reference_value`),
  ADD KEY `idx_xwl_intent` (`intent_id`),
  ADD KEY `idx_xwl_status` (`processing_status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `academic_assessments`
--
ALTER TABLE `academic_assessments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `academic_attendance_logs`
--
ALTER TABLE `academic_attendance_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `academic_attendance_records`
--
ALTER TABLE `academic_attendance_records`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `academic_marks`
--
ALTER TABLE `academic_marks`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `academic_timetables`
--
ALTER TABLE `academic_timetables`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accountant_expenses`
--
ALTER TABLE `accountant_expenses`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accountant_expense_payments`
--
ALTER TABLE `accountant_expense_payments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accountant_payroll_rates`
--
ALTER TABLE `accountant_payroll_rates`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accountant_payroll_runs`
--
ALTER TABLE `accountant_payroll_runs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accountant_payroll_run_lines`
--
ALTER TABLE `accountant_payroll_run_lines`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accountant_payroll_staff_overrides`
--
ALTER TABLE `accountant_payroll_staff_overrides`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `babyeyi_doc_ids`
--
ALTER TABLE `babyeyi_doc_ids`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `babyeyi_increase_requests`
--
ALTER TABLE `babyeyi_increase_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `babyeyi_leaders`
--
ALTER TABLE `babyeyi_leaders`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `babyeyi_loan_repayments`
--
ALTER TABLE `babyeyi_loan_repayments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `babyeyi_payments`
--
ALTER TABLE `babyeyi_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `babyeyi_payment_intents`
--
ALTER TABLE `babyeyi_payment_intents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT for table `babyeyi_signatures`
--
ALTER TABLE `babyeyi_signatures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `babyeyi_student_requirements`
--
ALTER TABLE `babyeyi_student_requirements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=83;

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
-- AUTO_INCREMENT for table `field_agent_profiles`
--
ALTER TABLE `field_agent_profiles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `field_agent_support_requests`
--
ALTER TABLE `field_agent_support_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
-- AUTO_INCREMENT for table `momo_transactions`
--
ALTER TABLE `momo_transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `nesa_fee_limits`
--
ALTER TABLE `nesa_fee_limits`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `parent_portal_accounts`
--
ALTER TABLE `parent_portal_accounts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `portal_operation_audit_logs`
--
ALTER TABLE `portal_operation_audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `portal_requisitions`
--
ALTER TABLE `portal_requisitions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `portal_ticha_ai_history`
--
ALTER TABLE `portal_ticha_ai_history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pro_shule_avance_applications`
--
ALTER TABLE `pro_shule_avance_applications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pro_shule_avance_organizations`
--
ALTER TABLE `pro_shule_avance_organizations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `requirement_prices`
--
ALTER TABLE `requirement_prices`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT for table `schools`
--
ALTER TABLE `schools`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `school_babyeyi`
--
ALTER TABLE `school_babyeyi`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `school_classes`
--
ALTER TABLE `school_classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_fee_collections`
--
ALTER TABLE `school_fee_collections`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `school_gate_logs`
--
ALTER TABLE `school_gate_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_gradebook_columns`
--
ALTER TABLE `school_gradebook_columns`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_leaders`
--
ALTER TABLE `school_leaders`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=92;

--
-- AUTO_INCREMENT for table `school_library_books`
--
ALTER TABLE `school_library_books`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_library_checkouts`
--
ALTER TABLE `school_library_checkouts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_mini_websites`
--
ALTER TABLE `school_mini_websites`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `school_module_access`
--
ALTER TABLE `school_module_access`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_stock_items`
--
ALTER TABLE `school_stock_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_stock_movements`
--
ALTER TABLE `school_stock_movements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_subjects`
--
ALTER TABLE `school_subjects`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `service_orders`
--
ALTER TABLE `service_orders`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `service_payments`
--
ALTER TABLE `service_payments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_prices`
--
ALTER TABLE `service_prices`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `shule_avance_requests`
--
ALTER TABLE `shule_avance_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `standard_shule_kits`
--
ALTER TABLE `standard_shule_kits`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `standard_shule_kit_requests`
--
ALTER TABLE `standard_shule_kit_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `standard_shule_kit_request_payments`
--
ALTER TABLE `standard_shule_kit_request_payments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `standard_shule_kit_requirements`
--
ALTER TABLE `standard_shule_kit_requirements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `store_inventory_items`
--
ALTER TABLE `store_inventory_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `store_movements`
--
ALTER TABLE `store_movements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `store_suppliers`
--
ALTER TABLE `store_suppliers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT for table `student_permissions`
--
ALTER TABLE `student_permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT for table `uniform_voucher_items`
--
ALTER TABLE `uniform_voucher_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `uniform_voucher_orders`
--
ALTER TABLE `uniform_voucher_orders`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `vouchers`
--
ALTER TABLE `vouchers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `voucher_redemptions`
--
ALTER TABLE `voucher_redemptions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `xentripay_webhook_logs`
--
ALTER TABLE `xentripay_webhook_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

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
-- Constraints for table `admission_form_questions`
--
ALTER TABLE `admission_form_questions`
  ADD CONSTRAINT `admission_form_questions_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `admission_forms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `field_agent_support_requests`
--
ALTER TABLE `field_agent_support_requests`
  ADD CONSTRAINT `fk_fasr_agent_user` FOREIGN KEY (`agent_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `standard_shule_kit_requests`
--
ALTER TABLE `standard_shule_kit_requests`
  ADD CONSTRAINT `fk_sskr_req_kit` FOREIGN KEY (`kit_id`) REFERENCES `standard_shule_kits` (`id`);

--
-- Constraints for table `standard_shule_kit_request_payments`
--
ALTER TABLE `standard_shule_kit_request_payments`
  ADD CONSTRAINT `fk_sskrp_request` FOREIGN KEY (`request_id`) REFERENCES `standard_shule_kit_requests` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `standard_shule_kit_requirements`
--
ALTER TABLE `standard_shule_kit_requirements`
  ADD CONSTRAINT `fk_sskr_kit` FOREIGN KEY (`kit_id`) REFERENCES `standard_shule_kits` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
