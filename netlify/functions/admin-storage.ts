type EventRecord = {
  id: string;
  status?: string;
  start?: string;
  end?: string;
  createdAt?: string;
  updatedAt?: string;
  lastReason?: string;
  reasonHistory?: Array<{
    action: string;
    reason?: string;
    actorEmail?: string;
    actorRole?: string;
    ts?: string;
  }>;
};

type AuditRecord = {
  id: string;
  eventId: string;
  title?: string;
  action: string;
  reason?: string;
  actorEmail?: string;
  actorRole?: string;
  ts?: string;
};

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

export const getRetentionConfig = () => ({
  approvedDays: parseNumber(process.env.WOD_APPROVED_TTL_DAYS, 180),
  rejectedDays: parseNumber(process.env.WOD_REJECTED_TTL_DAYS, 30),
  pendingDays: parseNumber(process.env.WOD_PENDING_TTL_DAYS, 30),
  auditDays: parseNumber(process.env.WOD_AUDIT_TTL_DAYS, 180),
  maxEvents: parseNumber(process.env.WOD_MAX_EVENTS, 500),
  maxAudit: parseNumber(process.env.WOD_MAX_AUDIT, 1000)
});

const getEventAgeBase = (event: EventRecord) => {
  return (
    toDate(event.end) ||
    toDate(event.start) ||
    toDate(event.updatedAt) ||
    toDate(event.createdAt)
  );
};

const getUpdatedAt = (event: EventRecord) =>
  toDate(event.updatedAt) || toDate(event.createdAt) || new Date(0);

export const pruneEvents = (events: EventRecord[], now = new Date()) => {
  const config = getRetentionConfig();
  const cutoffApproved = new Date(now);
  cutoffApproved.setDate(cutoffApproved.getDate() - config.approvedDays);
  const cutoffRejected = new Date(now);
  cutoffRejected.setDate(cutoffRejected.getDate() - config.rejectedDays);
  const cutoffPending = new Date(now);
  cutoffPending.setDate(cutoffPending.getDate() - config.pendingDays);

  const filtered = events.filter((event) => {
    const status = event.status || 'pending';
    const base = getEventAgeBase(event);
    if (!base) return true;
    if (status === 'approved') {
      return base >= cutoffApproved;
    }
    if (status === 'rejected') {
      return base >= cutoffRejected;
    }
    return base >= cutoffPending;
  });

  const sorted = filtered.sort((a, b) => getUpdatedAt(b).valueOf() - getUpdatedAt(a).valueOf());
  const trimmed = sorted.slice(0, config.maxEvents);

  return trimmed;
};

const getAuditDate = (entry: AuditRecord) => toDate(entry.ts) || new Date(0);

export const pruneAudit = (audit: AuditRecord[], now = new Date()) => {
  const config = getRetentionConfig();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - config.auditDays);
  const filtered = audit.filter((entry) => {
    const date = getAuditDate(entry);
    return date >= cutoff;
  });
  const sorted = filtered.sort((a, b) => getAuditDate(b).valueOf() - getAuditDate(a).valueOf());
  return sorted.slice(0, config.maxAudit);
};
