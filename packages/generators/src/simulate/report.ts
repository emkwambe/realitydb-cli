import type { SimulationEvent } from './eventStream.js';

export interface SimulationReport {
  totalEvents: number;
  timelineStart: string;
  timelineEnd: string;
  durationMs: number;
  eventsBySource: Record<string, number>;
  eventsByType: Record<string, number>;
  correlationChains: number;
  uniqueActors: number;
  uniqueSessions: number;
}

export function buildSimulationReport(events: SimulationEvent[]): SimulationReport {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      timelineStart: '',
      timelineEnd: '',
      durationMs: 0,
      eventsBySource: {},
      eventsByType: {},
      correlationChains: 0,
      uniqueActors: 0,
      uniqueSessions: 0,
    };
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const eventsBySource: Record<string, number> = {};
  const eventsByType: Record<string, number> = {};
  const correlationIds = new Set<string>();
  const actorIds = new Set<string>();
  const sessionIds = new Set<string>();

  for (const event of sorted) {
    eventsBySource[event.source] = (eventsBySource[event.source] ?? 0) + 1;
    eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
    correlationIds.add(event.correlationId);
    if (event.actor) actorIds.add(event.actor.id);
    if (event.sessionId) sessionIds.add(event.sessionId);
  }

  const startMs = new Date(sorted[0].timestamp).getTime();
  const endMs = new Date(sorted[sorted.length - 1].timestamp).getTime();

  return {
    totalEvents: events.length,
    timelineStart: sorted[0].timestamp,
    timelineEnd: sorted[sorted.length - 1].timestamp,
    durationMs: endMs - startMs,
    eventsBySource,
    eventsByType,
    correlationChains: correlationIds.size,
    uniqueActors: actorIds.size,
    uniqueSessions: sessionIds.size,
  };
}

export function formatSimulationReport(report: SimulationReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('Simulation Report');
  lines.push('───────────────────────────────────────');
  lines.push(`  Total events: ${report.totalEvents}`);
  lines.push(`  Timeline: ${report.timelineStart.slice(0, 19)} → ${report.timelineEnd.slice(0, 19)}`);

  const hours = Math.round(report.durationMs / 3_600_000 * 10) / 10;
  lines.push(`  Duration: ${hours}h`);
  lines.push(`  Unique actors: ${report.uniqueActors}`);
  lines.push(`  Unique sessions: ${report.uniqueSessions}`);
  lines.push(`  Correlation chains: ${report.correlationChains}`);
  lines.push('');
  lines.push('  Events by source:');
  for (const [source, count] of Object.entries(report.eventsBySource).sort((a, b) => b[1] - a[1])) {
    lines.push(`    ${source}: ${count}`);
  }
  lines.push('');
  lines.push('  Top event types:');
  const sorted = Object.entries(report.eventsByType).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [type, count] of sorted) {
    lines.push(`    ${type}: ${count}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function formatSimulationReportCI(report: SimulationReport): Record<string, unknown> {
  return {
    totalEvents: report.totalEvents,
    timelineStart: report.timelineStart,
    timelineEnd: report.timelineEnd,
    durationMs: report.durationMs,
    eventsBySource: report.eventsBySource,
    eventsByType: report.eventsByType,
    correlationChains: report.correlationChains,
    uniqueActors: report.uniqueActors,
    uniqueSessions: report.uniqueSessions,
  };
}
