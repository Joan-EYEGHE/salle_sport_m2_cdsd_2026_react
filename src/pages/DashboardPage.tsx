import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Users, Dumbbell, Ticket } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import type { TransactionSummary } from '../types';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

interface StatCard {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [activityCount, setActivityCount] = useState<number | null>(null);
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [summaryRes, membersRes, activitiesRes, ticketsRes] = await Promise.allSettled([
          api.get('/transactions/summary'),
          api.get('/members'),
          api.get('/activities'),
          api.get('/tickets'),
        ]);

        if (summaryRes.status === 'fulfilled') {
          const d = summaryRes.value.data?.data ?? summaryRes.value.data;
          setSummary(d);
        }
        if (membersRes.status === 'fulfilled') {
          const d = membersRes.value.data?.data ?? membersRes.value.data;
          setMemberCount(Array.isArray(d) ? d.length : d?.total ?? d?.count ?? null);
        }
        if (activitiesRes.status === 'fulfilled') {
          const d = activitiesRes.value.data?.data ?? activitiesRes.value.data;
          setActivityCount(Array.isArray(d) ? d.length : d?.total ?? d?.count ?? null);
        }
        if (ticketsRes.status === 'fulfilled') {
          const d = ticketsRes.value.data?.data ?? ticketsRes.value.data;
          setTicketCount(Array.isArray(d) ? d.length : d?.total ?? d?.count ?? null);
        }
      } catch {
        setError('Erreur lors du chargement du tableau de bord.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) return <Loader size="lg" />;

  const cards: StatCard[] = [
    {
      label: 'Total Revenus',
      value: summary ? fmt(summary.totalRevenus) : '—',
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
    },
    {
      label: 'Total Dépenses',
      value: summary ? fmt(summary.totalDepenses) : '—',
      icon: TrendingDown,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    },
    {
      label: 'Solde Net',
      value: summary ? fmt(summary.solde) : '—',
      icon: Wallet,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Membres',
      value: memberCount !== null ? String(memberCount) : '—',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Activités',
      value: activityCount !== null ? String(activityCount) : '—',
      icon: Dumbbell,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Tickets',
      value: ticketCount !== null ? String(ticketCount) : '—',
      icon: Ticket,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-gray-400 text-sm mt-1">Vue d'ensemble de votre salle de sport</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-gray-800 border rounded-xl p-6 flex items-center gap-4 ${card.bg}`}
          >
            <div className={`p-3 rounded-xl ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-400">{card.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${card.color}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
