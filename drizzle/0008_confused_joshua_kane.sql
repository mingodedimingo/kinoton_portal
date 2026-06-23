CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text,
	`eventDate` varchar(10) NOT NULL,
	`startTime` varchar(5),
	`endTime` varchar(5),
	`color` varchar(20) NOT NULL DEFAULT '#1a1a1a',
	`authorName` varchar(100),
	`authorOpenId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
