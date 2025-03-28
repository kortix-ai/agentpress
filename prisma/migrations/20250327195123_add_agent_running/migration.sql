-- CreateTable
CREATE TABLE "threads" (
    "thread_id" TEXT NOT NULL,
    "messages" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "agent_running" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("thread_id")
);

-- CreateTable
CREATE TABLE "state_stores" (
    "store_id" TEXT NOT NULL,
    "store_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "state_stores_pkey" PRIMARY KEY ("store_id")
);
