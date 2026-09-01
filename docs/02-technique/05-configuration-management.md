# ⚙️ Configuration Management - Tickr

**Version:** 1.0  
**Temps lecture:** 15 minutes  
**Audience:** Développeurs Backend, DevOps

---

## 🎯 Objectif

Documenter la gestion de la configuration applicative, notamment les paramètres métier critiques comme le **taux de commission plateforme**, afin de garantir:

- ✅ Flexibilité opérationnelle (changement sans redéploiement code)
- ✅ Environnements multiples (dev/staging/prod avec configs différentes)
- ✅ Sécurité (secrets isolés du code)
- ✅ Traçabilité (changements configurables auditables)

---

## 📊 Paramètres Métier Configurables

### 1. Commission Plateforme (CRITIQUE)

**Variable:** `PLATFORM_COMMISSION_RATE`

**Description:** taux global hérité par tout événement sans surcharge Admin.

**Spécifications:**
```yaml
Nom: PLATFORM_COMMISSION_RATE
Type: Decimal (0.00 - 0.20)
Valeur par défaut: 0.06 (6%)
Valeur minimale: 0.00 (0% - pour promotions/lancement)
Valeur maximale: 0.20 (20% - limite raisonnable)
Format: Décimal, jusqu'à 4 décimales
Exemple: 0.06 = 6%, 0.03 = 3%, 0.025 = 2.5%
```

**Cas d'usage:**
```yaml
Lancement Plateforme (Mois 1-2):
  PLATFORM_COMMISSION_RATE=0.00
  Justification: Attirer les premiers organisateurs

Phase Bêta (Mois 3-4):
  PLATFORM_COMMISSION_RATE=0.03
  Justification: Commission réduite pour early adopters

Production Standard (Mois 5+):
  PLATFORM_COMMISSION_RATE=0.06
  Justification: Commission cible compétitive

Promotion Ponctuelle:
  PLATFORM_COMMISSION_RATE=0.04
  Justification: Campagne marketing temporaire

VIP/Partenaires Premium:
  PLATFORM_COMMISSION_RATE=0.04
  Justification: Tarif négocié pour gros volumes
```

### 2. Surcharge de commission par événement

- Stockage: `events.events.commission_rate_override`, nullable, contrainte 0–20 %.
- Écriture: `PATCH /events/:id/commission`, rôle `ADMIN` uniquement.
- Héritage: `null` utilise le taux global courant.
- Effet: nouvelles commandes uniquement; les commandes existantes gardent leurs montants.
- Audit: `EventCommissionOverrideUpdatedEvent` enregistre ancien/nouveau taux et Admin.

---

## 🏗️ Architecture de Configuration

### Hiérarchie des Sources

```
┌─────────────────────────────────────────┐
│  1. Override événement en base          │  ← PRIORITÉ MAXIMALE
└────────────────┬────────────────────────┘
                 │ null → héritage
┌────────────────▼────────────────────────┐
│  2. PLATFORM_COMMISSION_RATE (.env)     │
└────────────────┬────────────────────────┘
                 │ absent
┌────────────────▼────────────────────────┐
│  3. Défaut code 0.06                    │  ← PRIORITÉ MINIMALE
└─────────────────────────────────────────┘
```

**Règle:** Variable d'environnement > Fichier config > Valeur par défaut

---

## 💻 Implémentation Backend (NestJS)

### Structure Recommandée

```typescript
// backend/src/config/business.config.ts

import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export const businessConfigSchema = {
  PLATFORM_COMMISSION_RATE: Joi.number()
    .min(0)
    .max(0.20)
    .default(0.06)
    .description('Platform commission rate (0.00-0.20)'),
  
  PLATFORM_COMMISSION_MIN: Joi.number()
    .min(0)
    .default(0.00),
  
  PLATFORM_COMMISSION_MAX: Joi.number()
    .max(1)
    .default(0.20),
};

export default registerAs('business', () => ({
  commission: {
    rate: parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.06'),
    min: parseFloat(process.env.PLATFORM_COMMISSION_MIN || '0.00'),
    max: parseFloat(process.env.PLATFORM_COMMISSION_MAX || '0.20'),
  },
}));
```

### Service de Configuration

```typescript
// backend/src/shared/domain/services/business-config.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BusinessConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Retourne le taux de commission plateforme actuel
   * @returns {number} Taux entre 0.00 et 0.20
   */
  getPlatformCommissionRate(): number {
    const rate = this.configService.get<number>('business.commission.rate');
    
    // Validation runtime
    if (rate < 0 || rate > 0.20) {
      throw new Error(
        `Invalid PLATFORM_COMMISSION_RATE: ${rate}. Must be between 0.00 and 0.20`
      );
    }
    
    return rate;
  }

  /**
   * Calcule le montant de commission pour un prix donné
   * @param {number} amount - Prix du billet en TND
   * @returns {number} Montant commission arrondi à 3 décimales
   */
  calculateCommission(amount: number): number {
    const rate = this.getPlatformCommissionRate();
    return Math.round(amount * rate * 1000) / 1000; // Arrondi à 3 décimales
  }

  /**
   * Calcule le prix final pour le participant (prix + commission)
   * @param {number} ticketPrice - Prix HT du billet
   * @returns {number} Prix TTC (prix + commission)
   */
  calculateFinalPrice(ticketPrice: number): number {
    const commission = this.calculateCommission(ticketPrice);
    return ticketPrice + commission;
  }

}
```

Ce service calcule uniquement le prix participant. La commission est ajoutée au prix facial; elle
n'est pas déduite une seconde fois de l'organisateur. Le montant réellement reversé exige un ledger
de règlement, les ajustements/remboursements et le rapprochement gateway, absents du backend V1.

### Utilisation dans les Use Cases

```typescript
// backend/src/modules/payments/application/commands/calculate-order-total.handler.ts

import { Injectable } from '@nestjs/common';
import { BusinessConfigService } from '@shared/domain/services/business-config.service';

@Injectable()
export class CalculateOrderTotalHandler {
  constructor(
    private readonly businessConfig: BusinessConfigService,
  ) {}

  async execute(command: CalculateOrderTotalCommand): Promise<OrderTotal> {
    const { tickets } = command;

    let subtotal = 0;
    let commissionTotal = 0;

    for (const ticket of tickets) {
      subtotal += ticket.price * ticket.quantity;
      
      // Utilise la configuration dynamique
      const commission = this.businessConfig.calculateCommission(ticket.price);
      commissionTotal += commission * ticket.quantity;
    }

    return {
      subtotal,
      commission: commissionTotal,
      total: subtotal + commissionTotal,
      commissionRate: this.businessConfig.getPlatformCommissionRate(),
    };
  }
}
```

---

## 🌐 Exposition Frontend

### API de configuration publique

```http
GET /api/config/public
GET /api/config/public?eventId=<uuid>
```

```json
{
  "globalCommissionRate": 0.06,
  "commissionRateOverride": 0.03,
  "effectiveCommissionRate": 0.03,
  "currency": "TND",
  "reservationTtlMinutes": 15
}
```

Sans `eventId`, `commissionRateOverride` vaut `null` et le taux effectif est global. Un événement
inconnu retourne `404`.

### API Admin

```http
PATCH /api/events/:id/commission
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{ "commissionRate": 0.03 }
```

Envoyer `{ "commissionRate": null }` rétablit l'héritage global. L'API refuse les taux hors 0–20 %
et vérifie le rôle Admin au contrôleur et dans le use case.

### Frontend - Récupération Dynamique

```typescript
// frontend/src/lib/api/config.ts

export interface PlatformConfig {
  globalCommissionRate: number;
  commissionRateOverride: number | null;
  effectiveCommissionRate: number;
  currency: 'TND';
  reservationTtlMinutes: number;
}

export async function getPlatformConfig(eventId?: string): Promise<PlatformConfig> {
  const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/public${query}`);
  return response.json();
}
```

```typescript
// frontend/src/components/checkout/price-breakdown.tsx

import { useQuery } from '@tanstack/react-query';
import { getPlatformConfig } from '@/lib/api/config';

export function PriceBreakdown({ ticketPrice, eventId }: { ticketPrice: number; eventId: string }) {
  const { data: config } = useQuery({
    queryKey: ['platform-config', eventId],
    queryFn: () => getPlatformConfig(eventId),
    staleTime: 0,
  });

  if (!config) return null;
  const commissionAmount = ticketPrice * config.effectiveCommissionRate;
  const totalPrice = ticketPrice + commissionAmount;

  return (
    <div className="price-breakdown">
      <div>Prix billet: {ticketPrice.toFixed(2)} TND</div>
      <div>Frais de service ({config.effectiveCommissionRate * 100}%): {commissionAmount.toFixed(3)} TND</div>
      <div className="font-bold">Total: {totalPrice.toFixed(2)} TND</div>
    </div>
  );
}
```

---

## 🔒 Sécurité & Validation

### Validation au Démarrage

```typescript
// backend/src/main.ts

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Valider configuration critique au démarrage
  const businessConfig = app.get(BusinessConfigService);
  const commissionRate = businessConfig.getPlatformCommissionRate();
  
  const logger = new Logger('Bootstrap');
  logger.log(`✅ Platform commission rate: ${(commissionRate * 100).toFixed(1)}%`);
  
  // Alerter si configuration anormale
  if (commissionRate === 0) {
    logger.warn('⚠️  WARNING: Commission rate is 0% (promotional mode)');
  }
  
  if (commissionRate > 0.10) {
    logger.warn(`⚠️  WARNING: Commission rate is high (${(commissionRate * 100)}%)`);
  }
  
  await app.listen(3000);
}
```

### Audit Trail

```typescript
// backend/src/shared/infrastructure/events/config-changed.event.ts

export class ConfigurationChangedEvent {
  constructor(
    public readonly key: string,
    public readonly oldValue: any,
    public readonly newValue: any,
    public readonly changedBy: string,
    public readonly timestamp: Date,
  ) {}
}
```

---

## 📁 Fichiers de Configuration par Environnement

### Development (.env.local)
```bash
PLATFORM_COMMISSION_RATE=0.00
# Commission à 0% pour tests locaux
```

### Staging (.env.staging)
```bash
PLATFORM_COMMISSION_RATE=0.03
# Commission réduite pour bêta testeurs
```

### Production (.env.production)
```bash
PLATFORM_COMMISSION_RATE=0.06
# Commission standard production
```

---

## 🧪 Tests

### Tests Unitaires

```typescript
// backend/src/shared/domain/services/business-config.service.spec.ts

describe('BusinessConfigService', () => {
  let service: BusinessConfigService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue(0.06),
    } as any;

    service = new BusinessConfigService(configService);
  });

  describe('calculateCommission', () => {
    it('should calculate correct commission for 6%', () => {
      const amount = 50;
      const commission = service.calculateCommission(amount);
      expect(commission).toBe(3.0);
    });

    it('should calculate correct commission for 0%', () => {
      jest.spyOn(configService, 'get').mockReturnValue(0.00);
      const commission = service.calculateCommission(50);
      expect(commission).toBe(0);
    });

    it('should throw error if rate is invalid', () => {
      jest.spyOn(configService, 'get').mockReturnValue(0.25);
      expect(() => service.getPlatformCommissionRate()).toThrow();
    });
  });
});
```

---

## 📊 Monitoring & Alertes

### Métriques à Tracker

```yaml
Prometheus Metrics:
  - platform_commission_rate_current: Gauge (taux actuel)
  - platform_commission_total_amount: Counter (montant total commissions)
  - platform_commission_transactions: Counter (nombre transactions)
  - platform_commission_config_changes: Counter (changements config)
```

### Alertes CloudWatch

```yaml
Alert: CommissionRateZero
  Condition: platform_commission_rate == 0 for > 24h
  Severity: WARNING
  Action: Notify Slack #ops-alerts

Alert: CommissionRateTooHigh
  Condition: platform_commission_rate > 0.10
  Severity: WARNING
  Action: Notify Slack #ops-alerts

Alert: CommissionConfigChanged
  Condition: platform_commission_config_changes > 0
  Severity: INFO
  Action: Log to audit trail
```

---

## 🔄 Processus de Changement

### Procédure de Modification

```yaml
1. Décision Business:
   - Validation CEO/Product
   - Documentation justification
   - Calcul impact revenus

2. Préparation Technique:
   - Update .env.{environment}
   - Review code dependencies
   - Plan de rollback

3. Déploiement:
   - Staging: Test 24-48h
   - Production: Déploiement sans downtime
   - Monitoring actif 72h

4. Communication:
   - Email organisateurs (si impact)
   - Update documentation publique
   - Blog post si changement majeur
```

### Exemple de Changement

```bash
# Étape 1: Update variable en staging
aws ssm put-parameter \
  --name "/tickr/staging/PLATFORM_COMMISSION_RATE" \
  --value "0.05" \
  --overwrite

# Étape 2: Redémarrer services
aws ecs update-service \
  --cluster tickr-staging \
  --service backend \
  --force-new-deployment

# Étape 3: Vérifier logs
aws logs tail /aws/ecs/tickr-staging-backend --follow

# Étape 4: Si OK, répéter pour production
```

---

## ✅ Checklist Implémentation

```yaml
✅ Backend:
  - [ ] Configuration service créé
  - [ ] Validation Joi schéma
  - [ ] Tests unitaires > 90% coverage
  - [ ] Logging startup configuration
  - [ ] API endpoint /config/public
  - [ ] Audit trail implémenté

✅ Frontend:
  - [ ] API client configuration
  - [ ] Cache React Query 1h
  - [ ] Affichage dynamique prix
  - [ ] Fallback si API échoue (6% par défaut)

✅ Infrastructure:
  - [ ] Variables environnement par env (dev/staging/prod)
  - [ ] Secrets Manager AWS pour prod
  - [ ] Monitoring CloudWatch
  - [ ] Alertes configurées

✅ Documentation:
  - [ ] Guide opérationnel
  - [ ] Procédure changement
  - [ ] Impact business calculé
  - [ ] Communication template
```

---

## 📚 Ressources

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [Joi Validation](https://joi.dev/api/)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [12-Factor App Config](https://12factor.net/config)

---

**Prochaine lecture:** `../03-architecture/02-structure-modules.md` pour l'architecture des modules.
