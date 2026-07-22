CREATE TABLE IF NOT EXISTS friend_requests (
  "id" SERIAL PRIMARY KEY,
  "requester_id" TEXT NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE friend_requests IS 'Friend requests between users';
