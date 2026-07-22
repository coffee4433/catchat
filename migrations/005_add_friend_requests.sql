CREATE TABLE IF NOT EXISTS friend_requests (
  "id" SERIAL PRIMARY KEY,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE friend_requests IS 'Friend requests between users';
