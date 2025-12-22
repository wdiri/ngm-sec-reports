-- CreateTable
CREATE TABLE "ReportingPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isFinalised" BOOLEAN NOT NULL DEFAULT false,
    "finalisedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodId" TEXT NOT NULL,
    "metricNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" REAL,
    "unit" TEXT NOT NULL,
    "isNA" BOOLEAN NOT NULL DEFAULT false,
    "naReason" TEXT,
    "insight" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Metric_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ToleranceBand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricNumber" INTEGER NOT NULL,
    "greenMin" REAL,
    "greenMax" REAL,
    "greenOperator" TEXT NOT NULL,
    "amberMin" REAL,
    "amberMax" REAL,
    "amberOperator" TEXT NOT NULL,
    "redMin" REAL,
    "redMax" REAL,
    "redOperator" TEXT NOT NULL,
    "isLowerBetter" BOOLEAN NOT NULL DEFAULT false,
    "flatTolerance" REAL NOT NULL DEFAULT 1.0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DashboardConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'config',
    "headerText" TEXT NOT NULL DEFAULT 'Example dashboard – Presented at CORF / TRGC and input to ERC/BRC',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportingPeriod_label_key" ON "ReportingPeriod"("label");

-- CreateIndex
CREATE INDEX "ReportingPeriod_isFinalised_idx" ON "ReportingPeriod"("isFinalised");

-- CreateIndex
CREATE INDEX "ReportingPeriod_startDate_idx" ON "ReportingPeriod"("startDate");

-- CreateIndex
CREATE INDEX "Metric_periodId_idx" ON "Metric"("periodId");

-- CreateIndex
CREATE INDEX "Metric_metricNumber_idx" ON "Metric"("metricNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Metric_periodId_metricNumber_key" ON "Metric"("periodId", "metricNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ToleranceBand_metricNumber_key" ON "ToleranceBand"("metricNumber");

-- CreateIndex
CREATE INDEX "ToleranceBand_metricNumber_idx" ON "ToleranceBand"("metricNumber");
