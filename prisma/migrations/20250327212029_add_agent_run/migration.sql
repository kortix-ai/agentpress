/*
  Warnings:

  - You are about to drop the column `agent_running` on the `threads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "threads" DROP COLUMN "agent_running";

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "use_xml" BOOLEAN NOT NULL DEFAULT true,
    "responses" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);
