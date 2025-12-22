-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Metric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodId" TEXT NOT NULL,
    "metricNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" REAL,
    "unit" TEXT NOT NULL,
    "isNA" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "naReason" TEXT,
    "insight" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Metric_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Metric" ("createdAt", "description", "id", "insight", "isNA", "metricNumber", "naReason", "name", "periodId", "unit", "updatedAt", "value") SELECT "createdAt", "description", "id", "insight", "isNA", "metricNumber", "naReason", "name", "periodId", "unit", "updatedAt", "value" FROM "Metric";
DROP TABLE "Metric";
ALTER TABLE "new_Metric" RENAME TO "Metric";
CREATE INDEX "Metric_periodId_idx" ON "Metric"("periodId");
CREATE INDEX "Metric_metricNumber_idx" ON "Metric"("metricNumber");
CREATE UNIQUE INDEX "Metric_periodId_metricNumber_key" ON "Metric"("periodId", "metricNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
