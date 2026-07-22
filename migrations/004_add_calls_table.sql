CREATE TABLE IF NOT EXISTS calls (
  "id" TEXT PRIMARY KEY,
  "conversationId" INTEGER NOT NULL,
  "callerId" TEXT NOT NULL,
  "calleeId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "answeredAt" TIMESTAMP,
  "endedAt" TIMESTAMP
);

COMMENT ON TABLE calls IS 'Call history for voice and video calls';
