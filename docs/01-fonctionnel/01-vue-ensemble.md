# 📘 Vue d'Ensemble Fonctionnelle - Tickr

**Version:** 1.0  
**Audience:** Développeurs, Product Owner  
**Temps lecture:** 15 minutes

---

## 🎯 Vision Produit

Plateforme web de billetterie en ligne permettant aux organisateurs d'événements en Tunisie de créer, gérer et vendre des billets digitaux avec paiement en ligne et entrée par QR code.

### Proposition de Valeur

**Pour Organisateurs:**

- Création événement en < 5 minutes
- Paiement en ligne sécurisé (Konnect/Paymee/Stripe)
- Gestion billets temps réel
- Statistiques ventes instantanées

**Pour Participants:**

- Achat billets mobile-first
- Paiement carte locale + internationale
- Billet QR code instantané
- Notifications SMS rappels

---

## 👥 Acteurs Système

### 1. Organisateur (Primary Actor)

**Qui:** Associations, startups, organisateurs privés  
**Objectif:** Vendre des billets et gérer son événement

**Capacités:**

- Créer/modifier/supprimer événements
- Définir types billets (VIP, Standard, Early Bird)
- Configurer prix et disponibilités
- Consulter statistiques ventes
- Exporter listes participants
- Gérer check-in entrée

### 2. Participant (Primary Actor)

**Qui:** Grand public tunisien 18-45 ans  
**Objectif:** Acheter billets et accéder événements

**Capacités:**

- Rechercher événements (ville, catégorie, date)
- Acheter billets en ligne
- Recevoir QR code par email/SMS
- Consulter historique achats
- Partager événements réseaux sociaux

### 3. Administrateur Plateforme (Secondary Actor)

**Qui:** Équipe technique Tickr  
**Objectif:** Administrer la plateforme

**Capacités:**

- Modérer événements
- Gérer utilisateurs
- Support client
- Monitoring système

---

## 🔄 Workflows Critiques

### Workflow 1: Création Événement (Organisateur)

```
┌─────────────────────────────────────────────────────────┐
│                  CRÉATION ÉVÉNEMENT                      │
└─────────────────────────────────────────────────────────┘

1. Organisateur se connecte
   ↓
2. Clique "Créer Événement"
   ↓
3. Remplit formulaire:
   • Nom événement
   • Description
   • Lieu (adresse + coordonnées GPS)
   • Date/heure début et fin
   • Catégorie (Concert, Sport, Formation)
   • Image couverture
   ↓
4. Définit types billets:
   • Nom (ex: VIP, Standard)
   • Prix (TND)
   • Quantité disponible
   ↓
5. Valide création
   ↓
6. Système:
   • Upload image → S3
   • Crée événement (status: BROUILLON)
   • Génère URL unique événement
   ↓
7. Organisateur publie événement
   ↓
8. Événement visible publiquement
   ✅ Participants peuvent acheter billets
```

**Durée cible:** < 5 minutes

---

### Workflow 2: Achat Billet (Participant)

```
┌─────────────────────────────────────────────────────────┐
│                    ACHAT BILLET                          │
└─────────────────────────────────────────────────────────┘

1. Participant recherche événement
   • Par ville: Tunis, Sousse, Sfax
   • Par catégorie: Concert, Sport, Formation
   • Par date: Ce weekend, Ce mois
   ↓
2. Consulte détails événement
   • Description complète
   • Lieu sur carte
   • Types billets disponibles
   • Prix en TND
   ↓
3. Sélectionne type et quantité billets
   ↓
4. Se connecte OU crée compte:
   • Email
   • Téléphone (+216)
   • Mot de passe
   ↓
5. Confirme commande
   • Voit récapitulatif
   • Prix total (prix + commission 6%)
   ↓
6. Choisit mode paiement:
   • Paiement local Tunisie (Konnect - gateway principal)
   • Paiement local Tunisie (Paymee - fallback)
   • Carte internationale (Stripe)
   ↓
7. Effectue paiement
   ↓
8. Système:
   • Valide paiement
   • Génère QR codes uniques
   • Envoie email confirmation + PDF billets
   • Envoie SMS avec lien téléchargement
   ↓
9. Participant reçoit billets instantanément
   ✅ Peut présenter QR code à l'entrée
```

**Durée cible:** 2-3 minutes

---

### Workflow 3: Check-in Entrée (Staff Événement)

Le staff de porte utilise un compte Tickr existant affecté à cet événement par son organisateur.
Il conserve son rôle global (`PARTICIPANT` ou `ORGANIZER`) et ne reçoit aucun accès aux prix,
revenus, exports participants ou réglages de l'organisateur.

```
┌─────────────────────────────────────────────────────────┐
│                  CHECK-IN ENTRÉE                         │
└─────────────────────────────────────────────────────────┘

1. Staff se connecte à l'app Check-in
   • Authentification
   • Sélectionne un événement autorisé
   ↓
2. Participant arrive à l'entrée
   • Présente QR code (smartphone ou papier)
   ↓
3. Staff scanne QR code
   ↓
4. Système valide:
   • Billet existe ?
   • Billet non utilisé ?
   • Billet pour cet événement ?
   ↓
5. Si valide:
   ✅ Écran vert "ACCÈS AUTORISÉ"
   • Nom participant
   • Type billet (VIP, Standard)
   • Marque billet comme "UTILISÉ"
   ↓
6. Si invalide:
   ❌ Écran rouge "ACCÈS REFUSÉ"
   • Raison: déjà utilisé / faux billet / mauvais événement
   ↓
7. Participant entre (si autorisé)
```

**Durée cible:** < 10 secondes par personne

---

### Workflow 4: Suivi Ventes (Organisateur)

```
┌─────────────────────────────────────────────────────────┐
│                  SUIVI VENTES                            │
└─────────────────────────────────────────────────────────┘

1. Organisateur accède Dashboard
   ↓
2. Voit statistiques temps réel:
   • Billets vendus / Total
   • Chiffre d'affaires (brut - commission)
   • Taux remplissage (%)
   • Graphique ventes par jour
   ↓
3. Consulte liste participants:
   • Nom, email, téléphone
   • Type billet acheté
   • Date achat
   • Statut (payé, check-in)
   ↓
4. Exporte données:
   • CSV pour mailing
   • PDF liste check-in
   ↓
5. Reçoit notifications:
   • Email quotidien résumé ventes
   • SMS si jalon atteint (ex: 50% vendus)
```

---

### Workflow 5: Remboursement (Exception)

```
┌─────────────────────────────────────────────────────────┐
│                   REMBOURSEMENT                          │
└─────────────────────────────────────────────────────────┘

1. Participant demande remboursement:
   • Via email support
   • Raison: annulation événement, empêchement
   ↓
2. Support Tickr valide demande:
   • Conforme politique remboursement
   • Délai respecté (ex: 7 jours avant événement)
   ↓
3. Support initie remboursement
   ↓
4. Système:
   • Annule billet (status: REMBOURSÉ)
   • Crée transaction remboursement
   • Appelle gateway paiement (Konnect/Paymee/Stripe)
   ↓
5. Gateway traite remboursement:
   • Montant recrédité carte participant
   • Délai: 5-10 jours ouvrés
   ↓
6. Participant reçoit:
   • Email confirmation remboursement
   • SMS notification
   ↓
7. Organisateur voit:
   • Billet remboursé dashboard
   • Ajustement chiffre d'affaires
```

---

## 📊 Cas d'Usage Principaux

### Pour Organisateurs

| ID    | Cas d'Usage                 | Priorité | Complexité |
| ----- | --------------------------- | -------- | ---------- |
| UC-O1 | Créer événement             | P0       | Moyenne    |
| UC-O2 | Modifier événement          | P0       | Faible     |
| UC-O3 | Publier événement           | P0       | Faible     |
| UC-O4 | Définir types billets       | P0       | Moyenne    |
| UC-O5 | Consulter statistiques      | P0       | Moyenne    |
| UC-O6 | Exporter liste participants | P1       | Faible     |
| UC-O7 | Gérer check-in              | P1       | Moyenne    |
| UC-O8 | Annuler événement           | P2       | Moyenne    |

### Pour Participants

| ID    | Cas d'Usage                 | Priorité | Complexité |
| ----- | --------------------------- | -------- | ---------- |
| UC-P1 | Rechercher événements       | P0       | Moyenne    |
| UC-P2 | Consulter détails événement | P0       | Faible     |
| UC-P3 | Acheter billets             | P0       | Élevée     |
| UC-P4 | Payer en ligne              | P0       | Élevée     |
| UC-P5 | Recevoir billets QR         | P0       | Moyenne    |
| UC-P6 | Consulter historique achats | P1       | Faible     |
| UC-P7 | Partager événement          | P2       | Faible     |
| UC-P8 | Demander remboursement      | P2       | Moyenne    |

---

## 🎨 Types Événements Ciblés V1

### 1. Concerts / Musique 🎵

- **Exemples:** Concerts, festivals, DJ sets
- **Spécificités:** Places numérotées optionnelles, merchandising

### 2. Événements Sportifs ⚽

- **Exemples:** Matchs football, marathons, tournois
- **Spécificités:** Tribunes/catégories, billets saison

### 3. Formations / Workshops 📚

- **Exemples:** Conférences, séminaires, ateliers
- **Spécificités:** Early bird pricing, certificats participation

---

## 🌍 Spécificités Marché Tunisie

### Paiements

- **Paiement local Tunisie:** Konnect (gateway principal), Paymee (fallback)
- **Carte internationale:** Stripe (secondaire)

### Communication

- **SMS:** Très important (taux ouverture 95% en Tunisie)
- **Email:** Confirmation + billets PDF
- **WhatsApp:** Futur (V2)

### Localisation

- **Langues:** Français (V1), Arabe (V2), Anglais (V3)
- **Villes principales:** Tunis, Sousse, Sfax, Monastir, Nabeul
- **Devise:** TND (Dinar Tunisien)

---

## 📈 Métriques Succès

### Métriques Business

- **Nombre événements créés/mois:** > 50 (mois 3)
- **Nombre billets vendus/mois:** > 1,000 (mois 3)
- **Chiffre d'affaires commissions/mois:** > 2,000 TND (mois 3)
- **Taux conversion organisateurs:** > 60%

### Métriques Produit

- **Temps création événement:** < 5 min
- **Temps achat billet:** < 3 min
- **Taux succès paiement:** > 85%
- **Taux utilisation app check-in:** > 70%

### Métriques Techniques

- **Disponibilité:** > 99.5%
- **Temps réponse API:** < 500ms (p95)
- **Temps génération QR code:** < 2s
- **Support navigateurs:** Chrome, Firefox, Safari (2 dernières versions)

---

## ✅ Checklist Compréhension

Avant de passer à la suite, validez que vous comprenez:

```yaml
✅ Vision:
  - [ ] Proposition valeur claire (organisateurs + participants)
  - [ ] Différenciation marché tunisien

✅ Acteurs:
  - [ ] 3 types utilisateurs identifiés
  - [ ] Besoins spécifiques chacun

✅ Workflows:
  - [ ] 5 workflows critiques maîtrisés
  - [ ] Durées cibles comprises

✅ Marché:
  - [ ] Spécificités paiements Tunisie
  - [ ] Types événements ciblés V1

✅ Métriques:
  - [ ] Objectifs business clairs
  - [ ] Métriques succès définies
```

---

**Prochaine lecture:** `02-specifications-detaillees.md` pour le détail des features par version.
