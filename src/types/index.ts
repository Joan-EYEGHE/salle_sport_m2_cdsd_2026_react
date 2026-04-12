export interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'CASHIER' | 'CONTROLLER';
  isActive: boolean;
  lastLogin?: string;
}

export interface Activity {
  id: number;
  nom: string;
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
  nom: string;
  prenom: string;
  slug?: string;
  email?: string;
  phone?: string;
  uuid_qr: string;
  initials?: string;
  date_inscription?: string;
  subscriptions?: Subscription[];
}

export interface Subscription {
  id: number;
  id_membre: number;
  id_activity: number;
  type_forfait: 'HEBDO' | 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';
  frais_inscription_payes: number;
  frais_uniquement: boolean;
  montant_total: number;
  date_debut: string;
  date_prochain_paiement: string;
  activity?: Activity;
}

export interface Batch {
  id: number;
  id_activity: number;
  quantite: number;
  prix_unitaire_applique: number;
  activity?: Activity;
}

export interface Ticket {
  id: number;
  uuid_qr: string;
  code_ticket: string;
  id_batch: number;
  status: 'DISPONIBLE' | 'VENDU' | 'UTILISE' | 'EXPIRE';
  date_expiration: string;
  batch?: Batch;
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
  id_ticket?: number;
  id_membre?: number;
  date_scan: string;
  resultat: string;
  id_controller: number;
  ticket?: Ticket;
  membre?: { nom: string; prenom: string };
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
