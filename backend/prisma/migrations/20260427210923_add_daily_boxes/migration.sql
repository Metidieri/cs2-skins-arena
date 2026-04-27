-- CreateTable
CREATE TABLE "DailyBox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "skinWonId" INTEGER NOT NULL,
    "coinsValue" REAL NOT NULL,
    CONSTRAINT "DailyBox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyBox_skinWonId_fkey" FOREIGN KEY ("skinWonId") REFERENCES "Skin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DailyBox_userId_openedAt_idx" ON "DailyBox"("userId", "openedAt");
