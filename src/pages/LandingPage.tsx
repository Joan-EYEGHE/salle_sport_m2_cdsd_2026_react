import { useNavigate } from 'react-router-dom';
import { Dumbbell, Calendar, Users, DollarSign, ArrowRight } from 'lucide-react';

const modules = [
  {
    icon: Calendar,
    iconBg: 'bg-amber-500',
    title: 'Gestion des activités',
    description: 'Gérer les types d\'activités et leur prix',
  },
  {
    icon: Users,
    iconBg: 'bg-orange-500',
    title: 'Gestion des membres',
    description: 'Suivre les adhésions et les données clients',
  },
  {
    icon: DollarSign,
    iconBg: 'bg-amber-600',
    title: 'Suivi financier',
    description: 'Suivre les revenus et dépenses',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: 'radial-gradient(ellipse at center top, #2a2a2a 0%, #111111 70%, #000000 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="bg-amber-500 rounded-2xl p-4 mb-5 shadow-lg shadow-amber-500/30">
          <Dumbbell className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-white text-4xl font-bold tracking-tight">GymFlow</h1>
        <p className="text-gray-400 text-lg mt-1">Système de gestion</p>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full mb-10">
        {modules.map((mod) => (
          <div
            key={mod.title}
            className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 text-center"
          >
            <div className={`inline-flex items-center justify-center w-12 h-12 ${mod.iconBg} rounded-xl mb-4`}>
              <mod.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-white font-semibold text-base mb-1">{mod.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{mod.description}</p>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <button
        onClick={() => navigate('/login')}
        className="group flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-amber-500/40"
      >
        Commencer
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Footer */}
      <p className="text-gray-500 text-sm mt-12">© 2026 GymFlow. Tous droits réservés.</p>
    </div>
  );
}
