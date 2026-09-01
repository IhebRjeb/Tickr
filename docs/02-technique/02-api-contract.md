# 🔌 API Contract - Tickr REST API

**Version:** 1.0  
**Base URL:** `https://api.tickr.tn/api`  
**Temps lecture:** 20 minutes

---

## 🎯 Principes Généraux

### Format

```yaml
Protocol: HTTPS only
Format: JSON
Charset: UTF-8
```

### Authentification

```http
Authorization: Bearer <JWT_TOKEN>
```

**JWT Token:**

- Expiration: **7 jours** (`JWT_EXPIRES_IN`, défaut `'7d'` — `jwt.service.ts:74`)
- Refresh token: **30 jours** (`JWT_REFRESH_EXPIRES_IN`, défaut `'30d'` — `jwt.service.ts:75`)
- Algorithme: HS256

### Codes Statut HTTP

```
200 OK              - Succès GET/PUT/PATCH
201 Created         - Succès POST (création)
204 No Content      - Succès DELETE
400 Bad Request     - Validation échouée
401 Unauthorized    - Token manquant/invalide
403 Forbidden       - Accès refusé
404 Not Found       - Ressource inexistante
409 Conflict        - Contrainte métier (ex: stock épuisé)
429 Too Many Requests - Rate limit dépassé
500 Internal Error  - Erreur serveur
```

### Pagination

```http
GET /events?page=1&limit=12
```

**Response:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 156,
    "totalPages": 13
  }
}
```

### Erreurs

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be valid"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## ⚙️ Configuration Publique

### GET /config/public

**Description:** Récupère le taux global ou le taux effectif d'un événement.

**Authentification:** Non requise (public)

**Response 200:**

```json
{
  "globalCommissionRate": 0.06,
  "commissionRateOverride": 0.03,
  "effectiveCommissionRate": 0.03,
  "currency": "TND",
  "reservationTtlMinutes": 15
}
```

**Utilisation Frontend:**

- Sans `eventId`: cache recommandé 1 heure
- Avec `eventId`: rafraîchir à l'ouverture de la sélection de billets
- Ne pas inventer un fallback à 6 % pour un événement; une surcharge peut s'appliquer
- Les montants retournés par `POST /orders` restent autoritaires

**Notes:**

- ✅ Endpoint public (pas de token requis)
- ✅ Permet changement commission sans redéployer frontend

**Query optionnelle:** `eventId` (UUID). Un événement inconnu retourne `404`.

### PATCH /events/:id/commission

**Auth:** Required (`ADMIN` uniquement)

**Body:**

```json
{ "commissionRate": 0.03 }
```

Utiliser `null` pour rétablir le taux global. Valeurs acceptées: 0 à 0.20, maximum 4 décimales.

**Response 200:**

```json
{
  "eventId": "uuid",
  "commissionRateOverride": 0.03,
  "effectiveCommissionRate": 0.03,
  "usesGlobalRate": false
}
```

---

## 🔐 Authentification

### POST /auth/register

**Description:** Inscription nouveau participant

**Body:**

```json
{
  "email": "john@example.com",
  "phone": "+21698123456",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response 201:**

```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "PARTICIPANT"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### POST /auth/login

**Description:** Connexion utilisateur

**Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**

```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "role": "PARTICIPANT"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### POST /auth/refresh-token

**Description:** Renouveler access token

**Body:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response 200:**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

## 👤 Utilisateurs

### GET /users/me

**Auth:** Required  
**Description:** Profil utilisateur connecté

**Response 200:**

```json
{
  "id": "uuid",
  "email": "john@example.com",
  "phone": "+21698123456",
  "firstName": "John",
  "lastName": "Doe",
  "role": "PARTICIPANT",
  "isOrganizer": false,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### PATCH /users/me

**Auth:** Required  
**Description:** Modifier profil

**Body:**

```json
{
  "firstName": "Johnny",
  "phone": "+21698765432"
}
```

**Response 200:**

```json
{
  "id": "uuid",
  "firstName": "Johnny",
  "phone": "+21698765432"
}
```

---

### POST /users/me/become-organizer

**Auth:** Required  
**Description:** Devenir organisateur

**Body:**

```json
{
  "organizationName": "TunisConcerts",
  "description": "Organisation événements musicaux",
  "logo": "https://s3.../logo.png",
  "socialLinks": {
    "facebook": "https://fb.com/tunisconcerts",
    "instagram": "@tunisconcerts"
  }
}
```

**Response 200:**

```json
{
  "id": "uuid",
  "isOrganizer": true,
  "organizerProfile": {
    "organizationName": "TunisConcerts",
    "description": "...",
    "logo": "https://..."
  }
}
```

---

## 🎉 Événements

### POST /events

**Auth:** Required (Organizer)  
**Description:** Créer événement (brouillon)

**Body:**

```json
{
  "name": "Concert Balti 2024",
  "description": "<p>Concert exceptionnel...</p>",
  "category": "CONCERT",
  "location": {
    "name": "Théâtre de Carthage",
    "address": "2078 La Marsa, Tunis",
    "coordinates": {
      "lat": 36.8065,
      "lng": 10.1815
    }
  },
  "startDate": "2024-06-15T20:00:00Z",
  "endDate": "2024-06-15T23:00:00Z",
  "coverImage": "https://s3.../cover.jpg"
}
```

**Response 201:**

```json
{
  "id": "uuid",
  "slug": "concert-balti-2024",
  "name": "Concert Balti 2024",
  "status": "DRAFT",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

### GET /events/:id

**Auth:** Optional  
**Description:** Détails événement

**Response 200:**

```json
{
  "id": "uuid",
  "slug": "concert-balti-2024",
  "name": "Concert Balti 2024",
  "description": "<p>Concert exceptionnel...</p>",
  "category": "CONCERT",
  "status": "PUBLISHED",
  "location": {
    "name": "Théâtre de Carthage",
    "address": "2078 La Marsa, Tunis",
    "coordinates": {
      "lat": 36.8065,
      "lng": 10.1815
    }
  },
  "startDate": "2024-06-15T20:00:00Z",
  "endDate": "2024-06-15T23:00:00Z",
  "coverImage": "https://s3.../cover.jpg",
  "organizer": {
    "id": "uuid",
    "organizationName": "TunisConcerts",
    "logo": "https://..."
  },
  "ticketTypes": [
    {
      "id": "uuid",
      "name": "Standard",
      "price": 50.0,
      "quantity": 500,
      "sold": 120,
      "available": 380
    },
    {
      "id": "uuid",
      "name": "VIP",
      "price": 100.0,
      "quantity": 100,
      "sold": 45,
      "available": 55
    }
  ],
  "stats": {
    "views": 1250,
    "sold": 165,
    "revenue": 10500.0
  }
}
```

---

### GET /events

**Auth:** Optional  
**Description:** Rechercher événements

**Query Params:**

```
?q=concert              # Recherche texte
&category=CONCERT       # CONCERT|SPORT|TRAINING
&city=Tunis             # Ville
&dateFrom=2024-06-01    # Date min
&dateTo=2024-06-30      # Date max
&priceMin=0             # Prix min TND
&priceMax=100           # Prix max TND
&sort=date              # date|price|popularity
&order=asc              # asc|desc
&page=1                 # Pagination
&limit=12               # Items par page
```

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "concert-balti-2024",
      "name": "Concert Balti 2024",
      "coverImage": "https://...",
      "category": "CONCERT",
      "startDate": "2024-06-15T20:00:00Z",
      "location": {
        "name": "Théâtre de Carthage",
        "city": "Tunis"
      },
      "ticketTypes": [
        {
          "name": "Standard",
          "price": 50.0,
          "available": 380
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 42,
    "totalPages": 4
  }
}
```

---

### PATCH /events/:id

**Auth:** Required (Organizer - owner)  
**Description:** Modifier événement

**Body:**

```json
{
  "description": "<p>Nouvelle description...</p>",
  "startDate": "2024-06-16T20:00:00Z"
}
```

**Response 200:**

```json
{
  "id": "uuid",
  "description": "<p>Nouvelle description...</p>",
  "startDate": "2024-06-16T20:00:00Z"
}
```

---

### POST /events/:id/ticket-types

**Auth:** Required (Organizer - owner)  
**Description:** Ajouter type billet

**Body:**

```json
{
  "name": "Early Bird",
  "description": "Prix réduit pour les premiers",
  "price": 35.0,
  "currency": "TND",
  "quantity": 200,
  "salesStartDate": "2026-06-01T00:00:00Z",
  "salesEndDate": "2026-07-14T23:59:59Z",
  "isActive": true
}
```

`price` est le **prix facial organisateur hors frais de service**, pas un total participant cible.
Le backend V1 n'accepte ni `pricingMode` ni `targetBuyerTotal`.

**Response 201:**

```json
{
  "ticketTypeId": "uuid",
  "message": "Ticket type added successfully"
}
```

---

### POST /events/:id/publish

**Auth:** Required (Organizer - owner)  
**Description:** Publier événement

**Response 200:**

```json
{
  "id": "uuid",
  "status": "PUBLISHED",
  "publishedAt": "2024-01-15T10:30:00Z"
}
```

---

## 🛒 Panier & Commandes

### POST /cart/add

**Auth:** Required  
**Description:** Ajouter billets au panier

**Body:**

```json
{
  "ticketTypeId": "uuid",
  "quantity": 2
}
```

**Response 200:**

```json
{
  "cart": {
    "items": [
      {
        "ticketTypeId": "uuid",
        "eventName": "Concert Balti 2024",
        "ticketTypeName": "Standard",
        "unitPrice": 50.0,
        "quantity": 2,
        "subtotal": 100.0
      }
    ],
    "subtotal": 100.0,
    "platformFee": 4.0,
    "total": 104.0,
    "expiresAt": "2024-01-15T10:45:00Z"
  }
}
```

---

### GET /cart

**Auth:** Required  
**Description:** Voir panier

**Response 200:**

```json
{
  "items": [...],
  "subtotal": 100.00,
  "platformFee": 4.00,
  "total": 104.00,
  "expiresAt": "2024-01-15T10:45:00Z"
}
```

---

### POST /orders

**Auth:** Required  
**Description:** Créer commande (avant paiement)

**Body:**

```json
{
  "paymentMethod": "KONNECT"
}
```

**Response 201:**

```json
{
  "orderId": "uuid",
  "amount": 104.0,
  "status": "PENDING",
  "paymentUrl": "https://gateway.konnect.network/pay/abc123",
  "expiresAt": "2024-01-15T10:45:00Z"
}
```

---

## 💳 Paiements

### GET /payments/webhooks/konnect

**Auth:** Webhook signature  
**Description:** Callback Konnect (gateway TN principal)

**Body:**

```json
{
  "orderId": "uuid",
  "status": "COMPLETED",
  "transactionId": "CTP123456789",
  "amount": 104.0,
  "timestamp": "2024-01-15T10:35:00Z",
  "signature": "sha256..."
}
```

**Response 200:**

```json
{
  "received": true
}
```

---

### POST /payments/webhooks/stripe

**Auth:** Stripe signature  
**Description:** Callback Stripe (paiements internationaux)

**Body:** (Stripe Event Object)

---

### POST /payments/webhooks/paymee

**Auth:** Webhook signature  
**Description:** Callback Paymee (gateway TN fallback)

---

## 🎫 Billets

### GET /tickets/me

**Auth:** Required  
**Description:** Mes billets

**Response 200:**

```json
{
  "upcoming": [
    {
      "id": "uuid",
      "ticketNumber": "TICKR-001234",
      "event": {
        "id": "uuid",
        "name": "Concert Balti 2024",
        "startDate": "2024-06-15T20:00:00Z",
        "location": {
          "name": "Théâtre de Carthage"
        }
      },
      "ticketType": "Standard",
      "price": 50.00,
      "qrCode": "https://s3.../qr-001234.png",
      "qrCodeData": "TICKR|evt-uuid|tkt-uuid|hash",
      "status": "VALID",
      "purchasedAt": "2024-01-15T10:35:00Z"
    }
  ],
  "past": [...],
  "cancelled": [...]
}
```

---

### GET /tickets/:id/pdf

**Auth:** Required (owner)  
**Description:** Télécharger PDF billet

**Response:** Binary PDF file

---

## ✅ Check-in

Le staff de check-in n'est pas un rôle global. Un compte `PARTICIPANT` ou `ORGANIZER` peut recevoir
une affectation limitée à un événement. Le propriétaire de l'événement et un `ADMIN` ont un accès
implicite. Toutes les décisions relisent l'état courant du compte, de l'événement et de
l'affectation.

### POST /events/:eventId/check-in-staff

**Auth:** Required (`ORGANIZER`, propriétaire uniquement)  
**Description:** Affecter un compte Tickr existant et vérifié au check-in de l'événement

```json
{ "email": "staff@example.com" }
```

**Response 201:** affectation avec `id`, `eventId`, identité du compte et `assignedAt`.

**Erreurs:** `403` non-propriétaire, `404` événement absent, `409` déjà affecté, `422` compte
absent/inactif/non vérifié. Le `422` reste volontairement générique pour ne pas révéler l'existence
d'un compte.

### GET /events/:eventId/check-in-staff

**Auth:** Required (`ORGANIZER`, propriétaire uniquement)  
**Description:** Lister les affectations actives avec pagination plate (`page`, `limit`).

### DELETE /events/:eventId/check-in-staff/:assignmentId

**Auth:** Required (`ORGANIZER`, propriétaire uniquement)  
**Description:** Révoquer une affectation précise. La révocation est conservée pour audit.

**Response:** `204 No Content`

### GET /events/check-in-access/me

**Auth:** Required (tout compte actif et vérifié)  
**Description:** Lister les événements publiés non terminés que le compte peut scanner comme
propriétaire, administrateur ou staff affecté.

### POST /tickets/check-in

**Auth:** Required (propriétaire, `ADMIN` actuel ou staff activement affecté à l'événement)  
**Description:** Valider un billet dans la fenêtre `début - 1 h` jusqu'à la fin de l'événement.

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "qrCode": "v1-550e8400-e29b-41d4-a716-446655440010-a1b2",
  "deviceId": "scanner-gate-a-001",
  "locationGate": "Gate A"
}
```

**Response 200:**

```json
{
  "isValid": true,
  "ticketId": "550e8400-e29b-41d4-a716-446655440010",
  "holderName": "John Doe",
  "ticketTypeName": "General Admission",
  "checkedInAt": "2026-09-01T19:45:00Z",
  "failureReason": null
}
```

Le billet doit appartenir à `eventId`. La transition vers `CHECKED_IN` et l'audit sont atomiques:
deux scanners concurrents ne peuvent pas valider le même billet. Les refus sont `400`, un billet
inconnu pour l'événement est `404`, et un opérateur non autorisé reçoit `403`.

### GET /tickets/event/:eventId/stats

**Auth:** Required (propriétaire, `ADMIN` actuel ou staff activement affecté)  
**Description:** Compteurs agrégés limités aux billets `CONFIRMED` et `CHECKED_IN`.

```json
{
  "totalTickets": 165,
  "checkedIn": 42,
  "remaining": 123,
  "checkInRate": 25,
  "byType": [
    {
      "ticketTypeName": "Standard",
      "total": 120,
      "checkedIn": 30,
      "rate": 25
    }
  ]
}
```

---

## 📊 Dashboard Organisateur

### GET /dashboard/events/:eventId/stats

**Auth:** Required (Organizer - owner)  
**Description:** Statistiques événement

**Response 200:**

```json
{
  "sales": {
    "sold": 165,
    "total": 600,
    "soldPercentage": 27.5,
    "revenue": {
      "gross": 10500.0,
      "platformFee": 420.0,
      "net": 10080.0
    }
  },
  "salesByTicketType": [
    {
      "name": "Standard",
      "sold": 120,
      "revenue": 6000.0
    },
    {
      "name": "VIP",
      "sold": 45,
      "revenue": 4500.0
    }
  ],
  "salesByDay": [
    {
      "date": "2024-01-10",
      "sold": 23,
      "revenue": 1380.0
    }
  ],
  "conversion": {
    "views": 1250,
    "conversions": 165,
    "rate": 13.2
  }
}
```

---

### GET /dashboard/events/:eventId/participants

**Auth:** Required (Organizer - owner)  
**Description:** Liste participants

**Query:** `?page=1&limit=50&search=john`

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+21698123456",
      "ticketType": "Standard",
      "purchasedAt": "2024-01-15T10:35:00Z",
      "status": "VALID",
      "checkedIn": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 165
  }
}
```

---

## 📤 Uploads

### POST /upload/image

**Auth:** Required  
**Description:** Upload image événement  
**Content-Type:** `multipart/form-data`

**Body:**

```
file: [Binary]
```

**Response 201:**

```json
{
  "url": "https://s3.amazonaws.com/tickr-images/evt-uuid-123456.jpg",
  "size": 2048576,
  "mimeType": "image/jpeg"
}
```

---

## 🔒 Rate Limiting

```
Endpoint: /auth/login
Limite: 5 requêtes / 15 min / IP

Endpoint: /orders
Limite: 10 requêtes / min / user

Endpoint: /tickets/check-in
Limite: 10 requêtes / s, 80 / 10 s, 300 / min / client

Endpoint: /events/:id/check-in-staff
Limite: 3 requêtes / s, 10 / 10 s, 20 / heure / organisateur

Général (autres endpoints):
Limite: 100 requêtes / min / IP
```

**Response 429:**

```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "retryAfter": 300
}
```

---

## ✅ Checklist API

Validation implémentation:

```yaml
✅ Auth:
  - [ ] JWT tokens générés correctement
  - [ ] Refresh token implémenté
  - [ ] Rate limiting login actif

✅ Validation:
  - [ ] DTOs avec class-validator
  - [ ] Messages erreur clairs
  - [ ] Codes statut HTTP corrects

✅ Sécurité:
  - [ ] HTTPS uniquement
  - [ ] CORS configuré
  - [ ] Rate limiting global

✅ Documentation:
  - [ ] Swagger UI accessible
  - [ ] Exemples requêtes/réponses
  - [ ] Authentification testée

✅ Performance:
  - [ ] Pagination implémentée
  - [ ] Temps réponse < 500ms
  - [ ] Cache Redis actif
```

---

**Prochaine lecture:** `03-database-schema.md` pour la structure des tables PostgreSQL.
