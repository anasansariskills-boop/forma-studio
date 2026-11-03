-- AlterTable
ALTER TABLE "services" ADD COLUMN     "imageAlt" TEXT NOT NULL DEFAULT 'FORMA Studio service',
ADD COLUMN     "imageUrl" TEXT NOT NULL DEFAULT '/img/services/architecture.jpg';
