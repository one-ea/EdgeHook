import type { DeliveryRecord } from "./delivery_store";
import { getFailedDeliveryRecords } from "./delivery_repo";

export interface DeliveryMetrics {
  periodMs: number;
  totalAttempts: number;
  successCount: number;
  transientCount: number;
  terminalCount: number;
  successRate: number;
  terminalRate: number;
  byEventType: Record<string, { total: number; success: number; terminal: number }>;
  byProducer: Record<string, { total: number; success: number; terminal: number }>;
  terminalEvents: string[];
  timestamp: string;
}

export function computeDeliveryMetrics(records: DeliveryRecord[]): DeliveryMetrics {
  const byEventType: Record<string, { total: number; success: number; terminal: number }> = {};
  const byProducer: Record<string, { total: number; success: number; terminal: number }> = {};
  const terminalEvents: string[] = [];

  let successCount = 0;
  let transientCount = 0;
  let terminalCount = 0;

  for (const record of records) {
    byEventType[record.eventType] ??= { total: 0, success: 0, terminal: 0 };
    byProducer[record.producerId] ??= { total: 0, success: 0, terminal: 0 };

    byEventType[record.eventType].total++;
    byProducer[record.producerId].total++;

    if (record.status === "success") {
      successCount++;
      byEventType[record.eventType].success++;
      byProducer[record.producerId].success++;
    } else if (record.status === "transient_failure") {
      transientCount++;
    } else if (record.status === "terminal_failure") {
      terminalCount++;
      byEventType[record.eventType].terminal++;
      byProducer[record.producerId].terminal++;
      terminalEvents.push(record.eventId);
    }
  }

  const total = records.length;

  return {
    periodMs: 0,
    totalAttempts: total,
    successCount,
    transientCount,
    terminalCount,
    successRate: total > 0 ? successCount / total : 1,
    terminalRate: total > 0 ? terminalCount / total : 0,
    byEventType,
    byProducer,
    terminalEvents,
    timestamp: new Date().toISOString()
  };
}

export interface AlertThreshold {
  terminalRateMax: number;
  queueBacklogMax: number;
}

const DEFAULT_THRESHOLD: AlertThreshold = {
  terminalRateMax: 0.1,
  queueBacklogMax: 100
};

export function checkAlerts(
  metrics: DeliveryMetrics,
  threshold: AlertThreshold = DEFAULT_THRESHOLD
): string[] {
  const alerts: string[] = [];

  if (metrics.totalAttempts > 0 && metrics.terminalRate > threshold.terminalRateMax) {
    alerts.push(`HIGH_TERMINAL_RATE: ${(metrics.terminalRate * 100).toFixed(1)}% (threshold: ${(threshold.terminalRateMax * 100).toFixed(1)}%)`);
  }

  if (metrics.terminalEvents.length > 0) {
    alerts.push(`TERMINAL_DELIVERIES: ${metrics.terminalEvents.length} events in terminal_failure state`);
  }

  return alerts;
}

export async function computeAndCheckAlerts(
  db: D1Database,
  threshold?: AlertThreshold
): Promise<{ metrics: DeliveryMetrics; alerts: string[] }> {
  const records = await getFailedDeliveryRecords(db, 100);
  const metrics = computeDeliveryMetrics(records);
  const alerts = checkAlerts(metrics, threshold);
  return { metrics, alerts };
}
