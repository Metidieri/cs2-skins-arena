-- CreateTable
CREATE TABLE "Jackpot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'open',
    "seed" TEXT NOT NULL DEFAULT '',
    "winnerId" INTEGER,
    "totalValue" REAL NOT NULL DEFAULT 0,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Jackpot_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JackpotEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jackpotId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "skinId" INTEGER NOT NULL,
    "value" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JackpotEntry_jackpotId_fkey" FOREIGN KEY ("jackpotId") REFERENCES "Jackpot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JackpotEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JackpotEntry_skinId_fkey" FOREIGN KEY ("skinId") REFERENCES "Skin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JackpotEntry_jackpotId_idx" ON "JackpotEntry"("jackpotId");
