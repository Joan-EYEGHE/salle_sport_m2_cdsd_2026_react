import type { Activity, Member, Subscription } from '../types';

function normalizeEmbeddedSubscription(
  s: Subscription & { Activity?: Activity },
): Subscription {
  return {
    ...s,
    activity: s.activity ?? s.Activity,
  };
}

/**
 * Sérialisation Sequelize : abonnements sous `Subscriptions`, activité sous `Activity`.
 */
export function normalizeMemberFromApi(raw: unknown): Member {
  const r = raw as Member & { Subscriptions?: Subscription[]; created_at?: string };
  const rawSubs = r.subscriptions ?? r.Subscriptions ?? [];
  const subscriptions = Array.isArray(rawSubs)
    ? rawSubs.map((s) => normalizeEmbeddedSubscription(s as Subscription & { Activity?: Activity }))
    : [];
  const { Subscriptions, ...rest } = r;
  void Subscriptions;
  const created = rest.createdAt ?? r.created_at;
  const date_inscription =
    rest.date_inscription ?? (created != null && created !== '' ? String(created) : undefined);
  return { ...rest, subscriptions, date_inscription };
}
