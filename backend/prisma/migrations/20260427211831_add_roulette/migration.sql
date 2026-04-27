-- CreateTable
CREATE TABLE "RouletteRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'betting',
    "result" INTEGER,
    "color" TEXT,
    "potTotal" REAL NOT NULL DEFAULT 0,
    "jackpotPool" REAL NOT NULL DEFAULT 0,
    "consecutiveGreens" INTEGER NOT NULL DEFAULT 0,
    "seed" TEXT NOT NULL DEFAULT '',
    "bettingEndsAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "RouletteBet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "payout" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouletteBet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RouletteRound" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RouletteBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RouletteRound_status_createdAt_idx" ON "RouletteRound"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RouletteBet_roundId_idx" ON "RouletteBet"("roundId");

-- CreateIndex
CREATE INDEX "RouletteBet_userId_idx" ON "RouletteBet"("userId");
