CREATE TABLE `flights` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL
);
