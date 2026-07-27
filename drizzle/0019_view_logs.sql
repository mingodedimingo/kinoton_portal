-- 조회수 중복 방지 로그 테이블 생성
CREATE TABLE IF NOT EXISTS `post_view_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postType` enum('board','notice','hr_notice','condolence') NOT NULL,
  `postId` int NOT NULL,
  `viewerKey` varchar(128) NOT NULL,
  `viewedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_view_log` (`postType`, `postId`, `viewerKey`),
  KEY `idx_view_log_viewer` (`viewerKey`, `viewedAt`)
);
