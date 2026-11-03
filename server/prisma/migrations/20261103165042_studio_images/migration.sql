-- AlterTable
ALTER TABLE "studio_profile" ADD COLUMN     "heroImageAlt" TEXT NOT NULL DEFAULT 'FORMA Studio',
ADD COLUMN     "heroImageUrl" TEXT NOT NULL DEFAULT '/img/home/hero.jpg',
ADD COLUMN     "introImageAlt" TEXT NOT NULL DEFAULT 'Inside the studio',
ADD COLUMN     "introImageUrl" TEXT NOT NULL DEFAULT '/img/home/intro.jpg',
ADD COLUMN     "philosophyImageAlt" TEXT NOT NULL DEFAULT 'Light and shadow detail',
ADD COLUMN     "philosophyImageUrl" TEXT NOT NULL DEFAULT '/img/home/philosophy.jpg';
