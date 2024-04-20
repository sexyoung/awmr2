/*
  Warnings:

  - Added the required column `projectId` to the `ToChangeArea` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ToChangeArea` ADD COLUMN `projectId` INTEGER UNSIGNED NOT NULL;

-- AddForeignKey
ALTER TABLE `ToChangeArea` ADD CONSTRAINT `ToChangeArea_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
