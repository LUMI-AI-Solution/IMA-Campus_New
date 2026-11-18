-- ============================================================
-- Multi-batch allocation (one chat room, many batches/coordinators)
-- Run ONCE on the live MySQL database BEFORE deploying the new backend.
-- Only ADDS a table and 2 nullable columns. Existing data is not changed.
-- If your tables are lower-case (e.g. `lead`), adjust the names below.
-- ============================================================

ALTER TABLE `Lead`
  ADD COLUMN `lastReplyByName` VARCHAR(191) NULL,
  ADD COLUMN `lastReplyAt` DATETIME(3) NULL;

CREATE TABLE `LeadBatchAssignment` (
  `id`               INT NOT NULL AUTO_INCREMENT,
  `leadId`           INT NOT NULL,
  `batchId`          INT NOT NULL,
  `assignedTo`       INT NULL,
  `source`           VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
  `unreadCount`      INT NOT NULL DEFAULT 0,
  `paidCallStatus`   VARCHAR(191) NOT NULL DEFAULT 'pending',
  `paidCallAttempt`  INT NOT NULL DEFAULT 1,
  `paidCallMethod`   VARCHAR(191) NULL,
  `paidFeedback`     TEXT NULL,
  `paidAttemptsData` LONGTEXT NULL,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3) NOT NULL,

  UNIQUE INDEX `LeadBatchAssignment_leadId_batchId_key`(`leadId`, `batchId`),
  INDEX `LeadBatchAssignment_assignedTo_idx`(`assignedTo`),
  INDEX `LeadBatchAssignment_batchId_idx`(`batchId`),
  PRIMARY KEY (`id`),

  CONSTRAINT `LeadBatchAssignment_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LeadBatchAssignment_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LeadBatchAssignment_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
