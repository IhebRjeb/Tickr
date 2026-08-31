# 💰 Modèle Économique - Tickr

**Version:** 1.0  
**Temps lecture:** 10 minutes

> **Statut des chiffres:** la tarification participant ci-dessous est vérifiée contre le code.
> Les frais gateway, les reversements organisateur et les marges nettes restent des hypothèses de
> planification tant qu'ils ne sont pas contractualisés et implémentés dans un ledger de règlement.

---

## 🎯 Modèle Revenus

### Commission Plateforme

**Taux par défaut:** 6% sur le prix facial du billet, **ajouté au-dessus** du prix organisateur.
Le taux reste configurable par `PLATFORM_COMMISSION_RATE`.

**Surcharge par événement:** un Admin peut définir un taux de 0 à 20 % avec
`PATCH /events/:id/commission`. La valeur `null` retire la surcharge et rétablit l'héritage du taux
global. La priorité appliquée aux nouvelles commandes est:

```text
commissionRateOverride de l'événement ?? PLATFORM_COMMISSION_RATE ?? 0.06
```

Une modification ne re-tarifie jamais une commande existante: `platformFee` et `total` sont figés à
la création de la commande. Chaque changement Admin produit un événement d'audit avec ancien taux,
nouveau taux et identifiant Admin.

`docker-compose.prod.yml` charge `backend/.env.production`: la valeur de production doit donc être
vérifiée dans le déploiement. Le dépôt garantit un défaut de 6%, pas que chaque environnement utilise
effectivement ce défaut.

**Benchmark Concurrents Tunisie:**
```
Teskerti : 10-18% + 1-5 TND/ticket
Ija      : 8% + frais remboursement
Ayo      : 6%
Tunis.Events : 2.8-4% (online only)
```

**Positionnement Tickr:** 6% = compétitif vs leaders (Teskerti/Ija), aligné avec Ayo

```
Prix billet: 50 TND
Frais de service Tickr facturés au participant: 3 TND (6%)
Prix final participant: 53 TND

Valeur brute des billets attribuable à l'organisateur: 50 TND
Revenu brut Tickr avant coûts: 3 TND
Frais de paiement refacturés au participant (`paymentFees`): 0 TND actuellement
```

Pour le même billet à 50 TND avec une surcharge événement à 3 %, le participant paie 51.500 TND,
dont 1.500 TND de frais de service. L'organisateur conserve le même prix facial brut de 50 TND.

Le backend implémente `total = subtotal + platformFee + paymentFees`. À la création d'une commande,
`paymentFees` vaut toujours `0` et aucun flux de production n'appelle `setPaymentFees()`. Le code ne
retire donc **pas** une seconde commission de 6% à l'organisateur. En revanche, aucun ledger de
reversement n'existe encore: les 50 TND sont une attribution économique recommandée, pas un virement
actuellement exécuté par Tickr.

### Répartition Revenus par Transaction

```
Exemple: Billet à 50 TND

┌─────────────────────────────────────┐
│ Participant paie: 53.000 TND        │
└────────────┬────────────────────────┘
             │
    ┌────────┴──────────┐
    │                   │
    ▼                   ▼
┌──────────┐      ┌──────────┐
│50.000 TND│      │ 3.000 TND│
│Billets   │      │Frais Tickr│
│(brut org.)│     │(brut)     │
└──────────┘      └────┬─────┘
             │
             ▼
         Coûts gateway
         non suivis dans
         le backend
```

**Détail:**
- Prix facial / sous-total billets: 50.000 TND
- Frais de service Tickr (6%): 3.000 TND
- Frais de paiement ajoutés par Tickr: 0.000 TND
- **Total participant:** 53.000 TND
- **Brut organisateur recommandé avant ajustements:** 50.000 TND
- **Revenu brut Tickr avant coûts:** 3.000 TND

### Frais des prestataires de paiement

Les adapters envoient le total de commande de 53 TND aux prestataires. Konnect reçoit
`addPaymentFeesToAmount: false`; Paymee et Stripe ne reçoivent aucun supplément Tickr. Les réponses
des trois adapters n'exposent aucun coût marchand, et le backend ne stocke ni frais de transaction,
ni montant net réglé, ni facture gateway.

Le chiffre **1.580 TND** utilisé dans les anciennes projections n'est donc ni calculé par le code,
ni retourné par Konnect/Paymee/Stripe, ni validé par un contrat présent dans le dépôt. Il peut servir
uniquement de scénario financier. Par exemple, si le coût réel était 1.580 TND et si Tickr
l'absorbait, le résultat serait:

```text
Participant paie:                 53.000 TND
Brut organisateur recommandé:     50.000 TND
Revenu brut Tickr:                 3.000 TND
Coût gateway hypothétique:        -1.580 TND
Contribution Tickr avant autres coûts: 1.420 TND
```

**Politique recommandée pour V1:** Tickr absorbe les frais gateway dans ses 3 TND de frais de
service; l'organisateur conserve le prix facial de 50 TND. Une refacturation future au participant
doit être une décision commerciale explicite, alimenter `paymentFees` avant le paiement et être
affichée avant la confirmation. Elle ne doit jamais être activée depuis une estimation interne.

---

## 📊 Projections de frais de service bruts

Les projections de cette section calculent uniquement les frais de service facturés par Tickr.
Elles ne sont **pas** des projections de revenu net, car le dépôt ne contient ni tarifs gateway
contractuels, ni nombre de commandes payées, ni taxes, chargebacks ou coûts de remboursement.

### Scénario Conservateur (Année 1)

**Hypothèses:**
- 50 événements/mois (mois 6-12)
- 200 billets/événement moyenne
- Prix moyen billet: 40 TND
- Commission: 6%

```
Mois 1:  5 événements × 100 billets × 40 TND × 6% =   1,200 TND
Mois 2: 10 événements × 150 billets × 40 TND × 6% =   3,600 TND
Mois 3: 20 événements × 200 billets × 40 TND × 6% =   9,600 TND
Mois 4: 30 événements × 200 billets × 40 TND × 6% =  14,400 TND
Mois 5: 40 événements × 200 billets × 40 TND × 6% =  19,200 TND
Mois 6-12: 50 événements/mois × 7 mois             = 168,000 TND

TOTAL ANNÉE 1: ~216,000 TND de frais de service bruts
```

Le revenu net ne peut pas être déduit d'un simple pourcentage des 216,000 TND. Il faut au minimum,
par prestataire, le GMV traité, le nombre de transactions, le taux variable, le coût fixe, les frais
de remboursement/chargeback et les taxes.

### Scénario Optimiste (Année 2)

**Hypothèses:**
- 100 événements/mois
- 300 billets/événement moyenne
- Prix moyen: 45 TND
- Amélioration marges (négociation gateway)

```
GMV mensuel: 100 × 300 × 45 = 1,350,000 TND
Frais de service bruts mensuels: 1,350,000 × 6% = 81,000 TND
Frais de service bruts annuels: 81,000 × 12 = 972,000 TND
Revenu net: à calculer après intégration des coûts réels
```

---

## 💸 Structure Coûts

### Coûts Fixes Mensuels

```yaml
Infrastructure AWS:
  - ECS Fargate (2 tasks): 50 TND
  - RDS PostgreSQL: 30 TND
  - S3 Storage: 5 TND
  - CloudWatch/X-Ray: 5 TND
  TOTAL: 90 TND/mois

Services SaaS:
  - Domaine .tn: 10 TND/an = 0.8 TND/mois
  - GitHub Pro (optionnel): 4 USD = 13 TND/mois
  TOTAL: ~14 TND/mois

TOTAL FIXES: ~104 TND/mois (~1,250 TND/an)
```

### Coûts Variables

```yaml
Paiements Gateway:
  Konnect (gateway TN principal): tarif contractuel à confirmer
  Paymee (gateway TN fallback): tarif contractuel à confirmer
  Stripe: tarif du compte marchand et de la devise à confirmer

  Formule par prestataire p:
  = GMV_p × taux_variable_p
    + commandes_payées_p × frais_fixe_p
    + remboursements_p + chargebacks_p + taxes_p

  Important: le nombre de billets ne remplace pas le nombre de commandes.
  Une commande peut contenir plusieurs billets, alors que le frais fixe est généralement
  appliqué par transaction.

SMS Notifications:
  Hypothèse historique à confirmer: ~0.05 TND par SMS
  2 SMS par billet (confirmation + rappel)
  
  10,000 billets/mois:
  = 20,000 SMS × 0.05 = 1,000 TND/mois

Emails:
  Tarif du compte AWS à confirmer au moment du budget
```

**Le total des coûts variables reste à déterminer.** Il dépend notamment du mix prestataires, du
nombre de commandes payées, du nombre moyen de billets par commande, des remboursements et du volume
réel de messages.

---

## 📈 Break-Even Analysis

### Point Mort Mensuel

Le point mort se calcule par **commande payée**, pas uniquement par billet:

```
Contribution_commande
= sous_total_commande × 6%
  - coût_gateway_commande
  - communications_variables
  - coût_attendu_remboursements_chargebacks

Commandes_au_point_mort
= coûts_fixes_mensuels / contribution_moyenne_par_commande
```

Le dépôt ne fournit pas encore la contribution moyenne par commande. Tout chiffre de point mort
serait donc une hypothèse, pas un résultat validé.

### Rentabilité

La rentabilité ne doit pas être annoncée avant d'avoir renseigné le modèle financier avec les
contrats gateway, le mix de prestataires, les commandes payées, les taxes, les remboursements, les
chargebacks, le support et les coûts marketing. Les anciens totaux mélangeaient billets et
transactions et ne constituaient pas un P&L exploitable.

---

## 💡 Optimisations Possibles

### 1. Mesurer puis réduire les frais gateway (Priorité Haute)

**Actions:**
- Négocier taux avec gateway TN (Konnect/Paymee) (volume > 100k TND/mois)
- Comparer le coût effectif par commande et par TND de GMV
- Contacter directement banques (taux négociés)

**Impact:** à calculer sur les devis signés et le mix de transactions, jamais sur le seul nombre de
billets.

### 2. Optimiser Coûts SMS

**Actions:**
- API locale Tunisie Telecom au lieu Twilio
- Coût potentiel: 0.03 TND vs 0.05 TND = -40%
- Grouper envois (batch API)

**Impact:**
```
Économie mensuelle: 400 TND
Économie annuelle: 4,800 TND
```

### 3. Valeur Ajoutée Justifiant 6%

**Vs Concurrents Tunisie:**
- 40% moins cher que Teskerti (10-18%)
- 25% moins cher que Ija (8%)
- Égal à Ayo (6%) mais meilleure UX
- Plus cher que Tunis.Events (2.8-4%) mais support complet

**Justification 6%:**
- ✅ Support client réactif
- ✅ Dashboard analytics avancé
- ✅ Check-in mobile temps réel
- ✅ Paiement multi-gateway (Konnect + Paymee + Stripe)
- ✅ Notifications SMS/Email automatiques

**Décision V1:** 6% est le taux produit retenu et implémenté par défaut. Le benchmark reste une
hypothèse commerciale à revalider avec des sources datées; il ne prouve pas à lui seul la marge.

### 4. Revenus Additionnels (V2/V3)

```yaml
Sponsoring Événements:
  - Bannières publicitaires homepage
  - Push événements sponsors
  Potentiel: +5,000 TND/mois

Services Premium Organisateurs:
  - Analytics avancés: 50 TND/mois
  - Email marketing: 100 TND/mois
  - Support prioritaire: 30 TND/mois
  Potentiel: 50 organisateurs × 50 TND = +2,500 TND/mois

Affiliation Partenaires:
  - Hotels, restaurants, transport
  - Commission 5-10% sur ventes
  Potentiel: +3,000 TND/mois
```

---

## 🎯 KPIs Financiers

### Métriques à Suivre

```yaml
Revenus:
  - GMV (Gross Merchandise Value): volume total billets
  - Take rate: % commission effectif
  - ARPU: revenu moyen par utilisateur
  - Revenue growth: croissance MoM

Coûts:
  - CAC: coût acquisition client
  - Gateway fees: % du GMV
  - Infrastructure: coût par billet vendu

Marges:
  - Contribution margin: après coûts variables
  - Operating margin: après coûts fixes
  - Net margin: profitabilité finale
```

### Objectifs V1 (Mois 3)

```
✅ GMV: 80,000 TND
✅ Billets vendus: 2,000
✅ Commission brute: 4,800 TND (6%)
À mesurer: commandes payées et panier moyen
À mesurer: frais gateway réels par prestataire
À calculer: contribution et marge nette
```

---

## 🏦 Gestion Trésorerie

### Délais Paiement

```
Participant → Tickr: Immédiat (J+0)
Tickr → Organisateur: J+7 après événement

Exemple:
- Événement: 15 juin
- Paiements participants: 1-14 juin
- Paiement organisateur: 22 juin

Trésorerie immobilisée: 7-21 jours
```

Le délai J+7 est une **politique cible**, pas une capacité du backend actuel. Aucun compte de solde,
ledger de règlement, RIB organisateur, lot de payout ou rapprochement gateway n'est implémenté.

### Besoins Trésorerie

**Mois 1-3 (Lancement):**
```
Développement: 0 TND (solo dev)
Infrastructure: 300 TND
Marketing initial: 500 TND
Légal (SARL): 1,000 TND

TOTAL: 1,800 TND
```

**Mois 4-12 (Croissance):**
```
Infrastructure: 1,000 TND
Marketing: 2,000 TND
Support client (temps partiel): 2,000 TND

TOTAL: 5,000 TND
```

**Recommandation:** Bootstrapping + financement ami/famille ou incubateur

---

## 📋 Modèle Financier Excel

### Structure Recommandée

```
Onglets:
1. Assumptions (hypothèses)
2. Revenue Model (revenus)
3. Cost Structure (coûts)
4. P&L (compte résultat)
5. Cash Flow (trésorerie)
6. Scenarios (sensibilité)
```

### Formules Clés

```excel
# Revenus Mensuels
= Événements × Billets/Event × Prix_Moyen × Commission%

# Coûts Gateway
= GMV × Gateway_Rate + Transactions × Gateway_Fixed

# Marge Nette par Billet
= (Prix × Commission%) - (Prix × Gateway_Rate) - Gateway_Fixed - SMS_Cost

# Break-Even Billets
= Coûts_Fixes / Marge_Nette_Par_Billet
```

---

## ✅ Checklist Économique

```yaml
✅ Revenus:
  - [x] Commission participant 6% définie et configurable via environnement
  - [ ] Projections 12 mois établies
  - [ ] Scenarios optimiste/réaliste/pessimiste

✅ Coûts:
  - [ ] Fixes identifiés (infra, SaaS)
  - [ ] Tarifs gateway contractualisés et rapprochés par prestataire
  - [ ] Variables calculées (gateway, SMS)
  - [ ] Marges par transaction comprises

✅ Trésorerie:
  - [ ] Besoins lancement estimés (~2k TND)
  - [ ] Politique de reversement validée et implémentée (J+7 proposé)
  - [ ] Sources financement identifiées

✅ KPIs:
  - [ ] Dashboard financier prévu
  - [ ] Métriques trackées (GMV, margins)
  - [ ] Objectifs mois 3 définis

✅ Optimisations:
  - [ ] Plan négociation gateway (mois 6)
  - [ ] Revenus additionnels V2 listés
  - [ ] Stratégie pricing validée
```

---

**Prochaine lecture:** `../03-architecture/01-principes-hexagonaux.md` pour l'architecture technique.
