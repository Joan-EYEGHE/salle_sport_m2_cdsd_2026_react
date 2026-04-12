import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import type { Member } from '../types';

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function getInitials(m: Member): string {
  if (m.initials) return m.initials;
  return `${(m.prenom ?? '?').charAt(0)}${(m.nom ?? '?').charAt(0)}`.toUpperCase();
}

function isSubActive(dateStr: string): boolean {
  return new Date(dateStr) >= new Date();
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/members/${id}`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setMember(data);
      })
      .catch(() => setError('Impossible de charger ce membre.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div
      style={{
        padding: '20px 24px 24px',
        marginTop: 14,
        background: '#f0f2f5',
        minHeight: 'calc(100vh - 60px)',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          maxWidth: 720,
        }}
      >
        {/* floating header */}
        <div
          style={{
            margin: '-20px 16px 0',
            background: 'linear-gradient(195deg,#49a3f1,#1A73E8)',
            borderRadius: 10,
            padding: '16px 20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Détail du membre</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>
              Profil complet et historique d'abonnements
            </div>
          </div>
          <button
            onClick={() => navigate('/members')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              padding: '7px 14px',
              borderRadius: 7,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← Retour
          </button>
        </div>

        <div style={{ padding: '28px 24px 24px' }}>
          {loading && (
            <p style={{ textAlign: 'center', color: '#7b809a', fontSize: 13 }}>Chargement…</p>
          )}

          {error && (
            <div
              style={{
                background: '#fde8e8',
                color: '#F44335',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {!loading && member && (
            <>
              {/* profile block */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#49a3f1,#1A73E8)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(member)}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#344767' }}>
                    {member.prenom} {member.nom}
                  </div>
                  <div style={{ fontSize: 13, color: '#7b809a', marginTop: 2 }}>
                    {member.email ?? 'Pas d\'email'}
                  </div>
                </div>
              </div>

              {/* info grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 28,
                }}
              >
                {[
                  { label: 'Téléphone', value: member.phone ?? '—' },
                  { label: 'Inscription', value: fmtDate(member.date_inscription) },
                  { label: 'Code QR', value: member.uuid_qr },
                  { label: 'Slug', value: member.slug ?? '—' },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: '#f8f9fa',
                      borderRadius: 8,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#7b809a', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 13, color: '#344767', fontWeight: 500, wordBreak: 'break-all' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* subscriptions */}
              {(member.subscriptions ?? []).length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#344767',
                      marginBottom: 12,
                    }}
                  >
                    Historique des abonnements
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[...(member.subscriptions ?? [])].reverse().map((sub) => {
                      const active = isSubActive(sub.date_prochain_paiement);
                      return (
                        <div
                          key={sub.id}
                          style={{
                            border: `1px solid ${active ? '#c8e6c9' : '#f0f2f5'}`,
                            borderRadius: 8,
                            padding: '12px 16px',
                            background: active ? '#f9fef9' : '#fff',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: 8,
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: '#344767',
                                }}
                              >
                                {sub.activity?.nom ?? sub.type_forfait}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: '#7b809a',
                                  marginLeft: 8,
                                }}
                              >
                                {sub.type_forfait}
                              </span>
                            </div>
                            <span
                              style={{
                                background: active ? '#eaf7ea' : '#fde8e8',
                                color: active ? '#43A047' : '#F44335',
                                padding: '2px 8px',
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {active ? 'Actif' : 'Expiré'}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1fr',
                              gap: 8,
                            }}
                          >
                            {[
                              { label: 'Montant', value: fmtAmount(sub.montant_total) },
                              { label: 'Début', value: fmtDate(sub.date_debut) },
                              { label: 'Prochain paiement', value: fmtDate(sub.date_prochain_paiement) },
                            ].map((item) => (
                              <div key={item.label}>
                                <div style={{ fontSize: 10, color: '#7b809a', fontWeight: 600, textTransform: 'uppercase' }}>
                                  {item.label}
                                </div>
                                <div style={{ fontSize: 12, color: '#344767', fontWeight: 500, marginTop: 2 }}>
                                  {item.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {(member.subscriptions ?? []).length === 0 && (
                <p style={{ color: '#7b809a', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                  Aucun abonnement enregistré pour ce membre.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
