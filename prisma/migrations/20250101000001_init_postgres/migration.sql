-- CreateTable
CREATE TABLE "ReportingPeriod" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isFinalised" BOOLEAN NOT NULL DEFAULT false,
    "finalisedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "metricNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "isNA" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "naReason" TEXT,
    "insight" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToleranceBand" (
    "id" TEXT NOT NULL,
    "metricNumber" INTEGER NOT NULL,
    "greenMin" DOUBLE PRECISION,
    "greenMax" DOUBLE PRECISION,
    "greenOperator" TEXT NOT NULL,
    "amberMin" DOUBLE PRECISION,
    "amberMax" DOUBLE PRECISION,
    "amberOperator" TEXT NOT NULL,
    "redMin" DOUBLE PRECISION,
    "redMax" DOUBLE PRECISION,
    "redOperator" TEXT NOT NULL,
    "isLowerBetter" BOOLEAN NOT NULL DEFAULT false,
    "flatTolerance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToleranceBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardConfig" (
    "id" TEXT NOT NULL,
    "headerText" TEXT NOT NULL DEFAULT 'Example dashboard – Presented at CORF / TRGC and input to ERC/BRC',
    "openaiApiKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportingPeriod_label_key" ON "ReportingPeriod"("label");

-- CreateIndex
CREATE INDEX "ReportingPeriod_isFinalised_idx" ON "ReportingPeriod"("isFinalised");

-- CreateIndex
CREATE INDEX "ReportingPeriod_startDate_idx" ON "ReportingPeriod"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Metric_periodId_metricNumber_key" ON "Metric"("periodId", "metricNumber");

-- CreateIndex
CREATE INDEX "Metric_periodId_idx" ON "Metric"("periodId");

-- CreateIndex
CREATE INDEX "Metric_metricNumber_idx" ON "Metric"("metricNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ToleranceBand_metricNumber_key" ON "ToleranceBand"("metricNumber");

-- CreateIndex
CREATE INDEX "ToleranceBand_metricNumber_idx" ON "ToleranceBand"("metricNumber");

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

