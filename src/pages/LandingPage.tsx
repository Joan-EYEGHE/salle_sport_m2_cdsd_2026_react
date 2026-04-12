import { useNavigate } from 'react-router-dom';
import { Dumbbell, Calendar, Users, DollarSign, ArrowRight } from 'lucide-react';

const kpiIconShadow = {
  info: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.3)',
  success: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(76,175,80,0.3)',
  warning: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(251,140,0,0.3)',
} as const;

const modules = [
  {
    icon: Calendar,
    title: 'Activités',
    description: "Gérer les types d'activités et leur prix",
    gradient: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
    iconShadow: kpiIconShadow.info,
  },
  {
    icon: Users,
    title: 'Membres',
    description: 'Suivre les adhésions et les données clients',
    gradient: 'linear-gradient(195deg, #66BB6A, #43A047)',
    iconShadow: kpiIconShadow.success,
  },
  {
    icon: DollarSign,
    title: 'Finances',
    description: 'Suivre les revenus et dépenses',
    gradient: 'linear-gradient(195deg, #FFA726, #fb8c00)',
    iconShadow: kpiIconShadow.warning,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f0f2f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          maxWidth: 480,
          width: '100%',
          padding: '48px 40px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(195deg, #EC407A, #D81B60)',
            boxShadow: '0 4px 20px rgba(233,30,99,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Dumbbell size={32} color="#fff" />
        </div>

        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#344767',
            margin: '0 0 8px',
          }}
        >
          GymFlow
        </h1>
        <p
          style={{
            fontSize: 16,
            color: '#7b809a',
            margin: '0 0 32px',
          }}
        >
          La gestion de salle, simplifiée.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '0 0 32px',
          }}
        >
          <div style={{ flex: 1, height: 1, background: '#dee2e6' }} />
          <span
            style={{
              fontSize: 11,
              color: '#7b809a',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              whiteSpace: 'nowrap',
            }}
          >
            Accès réservé au personnel
          </span>
          <div style={{ flex: 1, height: 1, background: '#dee2e6' }} />
        </div>

        <button
          type="button"
          onClick={() => navigate('/login')}
          style={{
            width: '100%',
            background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
            border: 'none',
            borderRadius: 8,
            padding: '14px',
            color: 'white',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(26,115,232,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Accéder à l&apos;application
          <ArrowRight size={18} />
        </button>
      </div>

      <div
        style={{
          maxWidth: 560,
          width: '100%',
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
      >
        {modules.map((mod) => (
          <div
            key={mod.title}
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              padding: '20px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                margin: '0 auto 12px',
                background: mod.gradient,
                boxShadow: mod.iconShadow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <mod.icon size={22} color="#fff" />
            </div>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#344767',
                margin: '0 0 6px',
              }}
            >
              {mod.title}
            </h3>
            <p
              style={{
                fontSize: 12,
                color: '#7b809a',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {mod.description}
            </p>
          </div>
        ))}
      </div>

      <p
        style={{
          fontSize: 12,
          color: '#7b809a',
          marginTop: 32,
          textAlign: 'center',
        }}
      >
        © 2026 GymFlow. Tous droits réservés.
      </p>
    </div>
  );
}
