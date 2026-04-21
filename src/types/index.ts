export interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'CASHIER' | 'CONTROLLER';
  active: boolean;
}

export interface Activity {
  id: number;
  nom: string;
  active?: boolean;
  status: boolean;
  frais_inscription: number;
  prix_ticket: number;
  prix_hebdomadaire: number;
  prix_mensuel: number;
  prix_trimestriel: number;
  prix_annuel: number;
  isMonthlyOnly: boolean;
}

export interface Member {
  id: number;
  active?: boolean;
  nom: string;
  prenom: string;
  slug?: string;
  email?: string;
  phone?: string;
  date_naissance?: string | null;
  uuid_qr: string;
  initials?: string;
  /** Alias côté UI ; l’API renvoie souvent `createdAt`. */
  date_inscription?: string;
  createdAt?: string;
  subscriptions?: Subscription[];
  transactions?: Transaction[];
}

/** Aligné sur l’API Sequelize : fin = date_prochain_paiement (pas end_date). */
export interface Subscription {
  id: number;
  active?: boolean;
  id_membre: number;
  id_activity: number;
  type_forfait: 'HEBDO' | 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';
  frais_inscription_payes: number;
  frais_uniquement: boolean;
  montant_total: number;
  date_debut: string;
  date_prochain_paiement: string;
  /** Sérialisation Sequelize brute éventuelle */
  Member?: Member;
  Activity?: Activity;
  member?: Member;
  activity?: Activity;
}

export interface Batch {
  id: number;
  active?: boolean;
  id_activity: number;
  quantite: number;
  prix_unitaire_applique: number;
  activity?: Activity;
}

export interface Ticket {
  id: number;
  active?: boolean;
  /** API Sequelize (`qr_code`) ; `uuid_qr` reste pour compatibilité typage ancien. */
  qr_code?: string;
  uuid_qr?: string;
  code_ticket: string;
  id_batch: number;
  id_membre?: number | null;
  status: 'DISPONIBLE' | 'VENDU' | 'UTILISE' | 'EXPIRE';
  date_expiration: string;
  batch?: Batch;
  /** Présent si l’API dénormalise ; sinon l’activité est sous `batch.activity`. */
  activity?: Activity;
  member?: Member;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: number;
  montant: number;
  type: 'REVENU' | 'DEPENSE';
  libelle: string;
  date: string;
  id_membre?: number;
  member?: Member;
}

export interface AccessLog {
  id: number;
  id_ticket?: number | null;
  id_membre?: number | null;
  date_scan: string;
  resultat: string;
  id_controller: number;
  ticket?: Ticket | null;
  membre?: { nom: string; prenom: string } | null;
}

export interface TransactionSummary {
  total_revenus: number;
  total_depenses: number;
  solde: number;
  nb_transactions: number;
}

export interface AccessLogStats {
  total_scans: number;
  total_succes: number;
  total_echec: number;
  taux_succes: number;
}

export interface MemberSearchResult {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  initials?: string;
}

export interface BatchFormOption {
  id: number;
  name: string;
  amount: number;
  duration_days?: number;
  duration_type?: 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';
}
