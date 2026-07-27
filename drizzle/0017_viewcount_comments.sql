-- 공지사항, 인사발령, 경조사 테이블에 viewCount 컬럼 추가
ALTER TABLE `notices` ADD COLUMN `viewCount` int NOT NULL DEFAULT 0;
ALTER TABLE `hr_notices` ADD COLUMN `viewCount` int NOT NULL DEFAULT 0;
ALTER TABLE `condolences` ADD COLUMN `viewCount` int NOT NULL DEFAULT 0;

-- 댓글 테이블 생성 (게시판, 공지사항, 인사발령, 경조사 공통)
CREATE TABLE `post_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postType` enum('board','notice','hr_notice','condolence') NOT NULL,
  `postId` int NOT NULL,
  `authorName` varchar(100) NOT NULL,
  `authorOpenId` varchar(64) DEFAULT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_comments_post` (`postType`, `postId`)
);
