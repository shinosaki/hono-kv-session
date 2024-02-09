-- Migration number: 0000 	 2024-02-09T20:50:00.000Z
CREATE TABLE session(
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "ttl" INTEGER NOT NULL
);