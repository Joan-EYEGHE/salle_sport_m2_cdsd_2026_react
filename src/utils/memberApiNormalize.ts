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
  const r = raw as Member & { Subscriptions?: Subscription[] };
  const rawSubs = r.subscriptions ?? r.Subscriptions ?? [];
  const subscriptions = Array.isArray(rawSubs)
    ? rawSubs.map((s) => normalizeEmbeddedSubscription(s as Subscription & { Activity?: Activity }))
    : [];
  const { Subscriptions: _s, ...rest } = r;
  return { ...rest, subscriptions };
}
