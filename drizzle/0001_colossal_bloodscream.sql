CREATE TABLE `board_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('언론보도','매뉴얼','기타') NOT NULL DEFAULT '기타',
	`title` varchar(300) NOT NULL,
	`content` text,
	`link` varchar(500),
	`authorName` varchar(100) NOT NULL,
	`isNew` boolean NOT NULL DEFAULT true,
	`isPinned` boolean NOT NULL DEFAULT false,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `board_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `condolences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('결혼','출산','부고','기타') NOT NULL,
	`name` varchar(300) NOT NULL,
	`content` text,
	`eventDate` varchar(20),
	`authorName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `condolences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('입사','퇴직','발령','승진') NOT NULL,
	`title` varchar(300) NOT NULL,
	`content` text,
	`effectiveDate` varchar(20),
	`authorName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_notices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tag` varchar(20) NOT NULL DEFAULT '공지',
	`title` varchar(300) NOT NULL,
	`content` text,
	`category` enum('company','dept','all') NOT NULL DEFAULT 'all',
	`isNew` boolean NOT NULL DEFAULT true,
	`isPinned` boolean NOT NULL DEFAULT false,
	`authorName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notices_id` PRIMARY KEY(`id`)
);
