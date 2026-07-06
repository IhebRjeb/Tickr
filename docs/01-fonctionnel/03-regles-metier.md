# ⚖️ Règles Métier & Contraintes - Tickr

**Version:** 1.0  
**Temps lecture:** 10 minutes

---

## 🇹🇳 Spécificités Marché Tunisien

### Paiements

#### Gateway Local Tunisie (Prioritaire)

**Gateways Tunisie:**
- **Konnect** (gateway principal)
  - Montants traités en millimes (TND × 1000)
  - Flux par redirection (page de paiement hébergée)
  - API REST disponible

- **Paymee** (fallback)
  - Montants en TND (format décimal, ex: 10.500)
  - Flux par redirection (page de paiement hébergée)
  - Utilisé en repli si Konnect indisponible

**Contraintes:**
- Conversion 3D Secure obligatoire
- Remboursement Konnect: manuel via dashboard

#### Stripe International (Secondaire)

**Utilisation:**
- Cartes internationales (Visa, Mastercard, Amex)
- Frais: 2.9% + 0.3 USD par transaction
- Conversion automatique TND → USD/EUR
- Délai paiement organisateur: J+7

**Contraintes:**
- Compte Stripe Connect requis pour organisateurs
- Frais conversion devise: ~3% additionnel
- Limites par mois avant vérification KYC

---

### Téléphonie & SMS

**Format Numéros:**
- Format international: `+216XXXXXXXX` (8 chiffres)
- Opérateurs: Tunisie Telecom, Ooredoo, Orange
- Validation regex: `^\+216[2-9][0-9]{7}$`

**SMS Transactionnels:**
- **Prestataire recommandé:** Twilio (international)
- **Alternative locale:** API Tunisie Telecom
- **Coût:** ~0.05 TND par SMS
- **Limite:** 160 caractères (alphabet latin)
- **Taux délivrabilité:** > 95%

**Contraintes:**
- Pas de SMS marketing sans opt-in explicite
- Horaire envoi: 8h-20h uniquement
- Obligation mention "STOP au XXX" pour désabonnement

---

### Localisation & Langue

**V1 MVP:**
- **Langue interface:** Français uniquement
- **Format dates:** DD/MM/YYYY
- **Format heures:** 24h (HH:mm)
- **Devise:** TND (Dinar Tunisien)
- **Timezone:** Africa/Tunis (UTC+1)

**V2 (futur):**
- Ajout Arabe (interface + contenu)
- Anglais pour touristes étrangers

**Villes Principales:**
```
Tunis (capitale)
Sousse
Sfax
Monastir
Nabeul
Hammamet
Bizerte
```

---

## 💰 Modèle Économique

### Commission Plateforme

**Taux:** 6% du prix billet (HT)

**Benchmark Concurrents Tunisie:**
- Teskerti : 10-18% + 1-5 TND/ticket
- Ija : 8% + frais remboursement
- Ayo : 6%
- Tunis.Events : 2.8-4% (online only)

**Positionnement:** Tickr = 6% (aligné avec Ayo, bien meilleur que Teskerti/Ija)

**Calcul:**
```
Prix billet HT: 50 TND
Commission Tickr (6%): 3 TND
Prix final participant: 53 TND

Organisateur reçoit: 47 TND
Tickr reçoit: 3 TND
```

**Paiement organisateur:**
- Délai: J+7 après événement
- Méthode: Virement bancaire (RIB)
- Minimum retrait: 100 TND

### Frais Gateway Paiement

**Qui paie ?** Organisateur (inclus dans commission)

**Exemple Konnect:**
```
Billet: 50 TND
Commission Tickr: 3 TND (6%)
Frais gateway: ~1.58 TND

Organisateur reçoit: 45.42 TND
Tickr reçoit net: 1.42 TND
```

✅ **Marges raisonnables** permettant rentabilité plus rapide

---

## 🎟️ Règles Billets

### Types Billets

**Maximum par événement:** 10 types

**Exemples valides:**
- Standard, VIP
- Early Bird, Normal, Last Minute
- Tribune Nord, Tribune Sud, Pelouse
- Étudiant, Normal, VIP

**Contraintes:**
- Prix minimum: 0.001 (unité devise)
- Prix maximum: 999,999 (unité devise)
- Quantité minimum: 1
- Quantité maximum: 10,000 par type
- Noms uniques au sein d'un événement
- Fin des ventes doit précéder le début de l'événement

### Réservation Temporaire

**Durée:** 15 minutes

**Fonctionnement:**
```
1. Participant ajoute billets au panier
   → Stock réservé temporairement
   
2. Timer 15 min démarre
   
3. Si paiement avant expiration:
   → Réservation confirmée
   
4. Si expiration sans paiement:
   → Stock libéré automatiquement
   → Panier vidé
```

**Raison:** Éviter blocage stock par paniers abandonnés

### Modification Billet

**Après achat:**
- ❌ Pas de changement type billet
- ❌ Pas de revente entre participants (V1)
- ✅ Changement nom participant (avant J-7)
- ✅ Remboursement possible (conditions)

---

## 🔄 Politique Remboursement

### Conditions

**Remboursement accepté si:**
- Demande > 7 jours avant événement
- Événement annulé par organisateur
- Événement reporté (option remboursement ou report)

**Remboursement refusé si:**
- Demande < 7 jours avant événement
- Participant ne se présente pas
- Événement s'est déroulé normalement

### Délais

**Traitement demande:** 48h max
**Remboursement effectif:** 5-10 jours ouvrés (délai bancaire)

### Montant

- Remboursement: 100% prix billet
- Commission Tickr: non remboursée
- Frais gateway: non remboursés

**Exemple:**
```
Billet payé: 53 TND
Remboursé: 50 TND (prix initial HT)
Perte participant: 3 TND
```

---

## 📅 Règles Événements

### Dates

**Contraintes:**
- Date début > maintenant + 7 jours minimum
- Date fin > date début
- Durée max: 7 jours (V1)
- Pas d'événements récurrents (V1)

**Modification dates:**
- Possible si > 14 jours avant événement
- Notification automatique tous participants
- Option remboursement proposée

### Statuts Événement

```
DRAFT (brouillon)
  ↓
PUBLISHED (publié)
  ↓
COMPLETED (terminé)

ou

CANCELLED (annulé)
```

**Statuts détaillés:**
- **DRAFT**: Événement en cours de création/modification
- **PUBLISHED**: Événement visible publiquement, vente de billets active
- **CANCELLED**: Événement annulé (état terminal)
- **COMPLETED**: Événement terminé (état terminal)

> **Note:** Pas de statut ONGOING - le passage PUBLISHED → COMPLETED est automatique via un scheduler après la date de fin.

**Règles transition:**
- DRAFT → PUBLISHED: validation complétude (min 1 type billet actif, dates futures, lieu défini)
- PUBLISHED → COMPLETED: date fin passée (automatique via scheduler)
- DRAFT → CANCELLED: organisateur abandonne le brouillon
- PUBLISHED → CANCELLED: organisateur annule avant le début

**États terminaux (aucune modification permise):**
- CANCELLED: plus aucune modification possible
- COMPLETED: plus aucune modification possible

### Annulation

**Règles d'annulation:**

| Statut | Événement non commencé | Événement commencé |
|--------|------------------------|-------------------|
| DRAFT | ✅ Annulation permise | N/A |
| PUBLISHED | ✅ Annulation permise | ❌ Impossible |
| CANCELLED | ❌ Déjà annulé | ❌ Déjà annulé |
| COMPLETED | ❌ Déjà terminé | ❌ Déjà terminé |

**Par organisateur:**
- DRAFT: peut être annulé à tout moment (abandon du brouillon)
- PUBLISHED: peut être annulé uniquement si l'événement n'a pas commencé
- Remboursement automatique tous billets vendus
- Pénalité: commission Tickr conservée

**Par plateforme:**
- Événement frauduleux
- Contenu inapproprié
- Non-respect CGU

---

## 🔒 Sécurité & Fraude

### QR Codes

**Génération:**
- Format: `{eventId}|{ticketId}|{userId}|{timestamp}|{hash}`
- Hash: HMAC-SHA256 avec secret serveur
- Validité: usage unique

**Validation:**
- Vérification hash
- Check statut billet (pas déjà utilisé)
- Check correspondance événement
- Temps réponse: < 1 seconde

**Anti-fraude:**
- Screenshot détectable (watermark timestamp)
- Rate limiting scan: 1 par seconde max
- Log tous scans (audit trail)

### Paiements

**Validation:**
- 3D Secure obligatoire
- Vérification CVV
- Adresse IP géolocalisée
- Rate limiting: 3 tentatives/15 min

**Détection fraude:**
- Multiple paiements refusés → blocage temporaire
- Achat massif même carte → alerte
- Changement IP entre tentatives → vérification

---

## 👤 Données Personnelles (RGPD Light)

### Collecte

**Données minimales:**
- Email (obligatoire)
- Téléphone (obligatoire pour SMS)
- Nom/Prénom (obligatoire)
- Mot de passe hashé (bcrypt)

**Données optionnelles:**
- Photo profil
- Préférences notifications

### Conservation

- **Comptes actifs:** illimitée
- **Comptes inactifs > 2 ans:** suppression automatique
- **Historique achats:** 5 ans (légal comptabilité)

### Droits

- **Accès:** export JSON profil + achats
- **Rectification:** modification profil
- **Suppression:** sur demande (sauf historique légal)
- **Portabilité:** export CSV/JSON

---

## 📊 Limites Système

### Par Utilisateur

```
Événements créés (organisateur): illimité
Billets achetés par événement: 10 max
Billets en panier: 20 max
Tentatives paiement/jour: 10 max
```

### Par Événement

```
Types billets: 5 max
Billets total: 10,000 max
Durée: 7 jours max
Images: 1 couverture (5MB max)
```

### Performance

```
API rate limiting: 100 req/min par IP
Recherche événements: 12 résultats/page
Dashboard rafraîchissement: 30 sec
Génération PDF billet: 5 sec max
```

---

## ✅ Checklist Validation Règles

Avant développement, vérifier compréhension:

```yaml
✅ Paiements:
  - [ ] Gateways Tunisie identifiés (Konnect/Paymee)
  - [ ] Frais et délais compris
  - [ ] Stripe comme fallback

✅ SMS:
  - [ ] Format téléphone tunisien (+216)
  - [ ] Prestataire choisi (Twilio)
  - [ ] Coûts estimés

✅ Commission:
  - [ ] Calcul 6% maîtrisé (configurable via PLATFORM_COMMISSION_RATE)
  - [ ] Répartition frais gateway comprise

✅ Remboursement:
  - [ ] Politique J-7 claire
  - [ ] Montants calculés correctement

✅ QR Codes:
  - [ ] Sécurité HMAC comprise
  - [ ] Anti-fraude anticipée

✅ RGPD:
  - [ ] Données minimales définies
  - [ ] Conservation durées connues
```

---

**Prochaine lecture:** `../02-technique/01-stack-technique.md` pour les choix technologiques.
