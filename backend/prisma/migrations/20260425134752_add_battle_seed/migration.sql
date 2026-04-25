/*
  Warnings:

  - Added the required column `seed` to the `Battle` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Battle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerAId" INTEGER NOT NULL,
    "playerBId" INTEGER,
    "winnerId" INTEGER,
    "skinAId" INTEGER NOT NULL,
    "skinBId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "seed" TEXT NOT NULL,
    "result" TEXT,
    "betType" TEXT NOT NULL DEFAULT 'skin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Battle_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Battle_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Battle" ("createdAt", "id", "playerAId", "playerBId", "resolvedAt", "skinAId", "skinBId", "status", "winnerId") SELECT "createdAt", "id", "playerAId", "playerBId", "resolvedAt", "skinAId", "skinBId", "status", "winnerId" FROM "Battle";
DROP TABLE "Battle";
ALTER TABLE "new_Battle" RENAME TO "Battle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
