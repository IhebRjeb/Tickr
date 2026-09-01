# Tickr Product, Business, and Growth Source Brief

**Audience:** Head of Growth, founders, product leadership, commercial partners  
**Status:** Working source of truth for business planning  
**Snapshot date:** September 1, 2026  
**Initial market:** Tunisia  
**Product stage:** V1 pre-launch

## Purpose of this document

This document explains what Tickr is, whom it serves, how the product works, how the business can
make money, what has already been built, what still blocks launch, and how the roadmap should
progress. It is intended to give the Head of Growth a reliable starting point for the business
plan, go-to-market plan, financial model, sales materials, partnerships, and investor documents.

It deliberately separates four kinds of information:

| Label             | Meaning                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **Confirmed**     | Verified in the current product specification or codebase                  |
| **Target**        | A measurable product or business outcome that has been agreed in principle |
| **Hypothesis**    | A growth idea that must be tested with customers and market data           |
| **Open decision** | A policy, commercial term, or operating model that leadership must define  |

This is not a market research report. It does not claim a market size, customer acquisition cost,
payment-provider cost, or launch date where Tickr does not yet have validated evidence.

---

## 1. Executive summary

### What Tickr is

Tickr is a mobile-first event discovery and ticketing platform built first for Tunisia. It helps
participants find events, pay in Tunisian dinars through local or international payment providers,
receive digital tickets, and enter events using QR codes. It helps organizers create events, sell
ticket types, follow sales, communicate with participants, and operate check-in at the door.

### The problem

Event discovery and ticket sales in Tunisia are fragmented across social media posts, messaging
apps, phone numbers, physical box offices, bank transfers, and separate payment tools. This creates
friction and uncertainty:

- Participants struggle to discover relevant events and verify practical details.
- Prices and fees are not always visible before payment.
- Local online payment can feel unfamiliar or untrustworthy.
- Tickets are difficult to retrieve or validate reliably at the venue.
- Organizers manage promotion, orders, attendance, and reporting across disconnected tools.
- Event teams have limited real-time visibility into sales and entry operations.

### The V1 solution

Tickr brings the critical journey into one product:

```text
Discover event -> compare options -> select tickets -> see full price
-> reserve inventory -> pay -> receive QR ticket -> check in
```

The organizer journey is equally important:

```text
Create event -> define ticket types -> publish -> sell
-> monitor results -> manage participants -> scan tickets
```

### The market entry strategy

**Confirmed:** Tickr launches with Tunisia-specific product foundations:

- TND pricing with three-decimal millime precision.
- French-first product language.
- Konnect and Paymee for local payment flows.
- Stripe for supported international card use cases.
- Mobile-first experiences for participants and event-door operations.
- Email and SMS as the supported communication channels.

The initial strategic wedge is not "the largest catalog of events." It is a more dependable path
from seeing an event to holding a valid ticket, with local payment and transparent pricing.

### How Tickr makes money

**Confirmed:** Tickr applies a configurable service fee to the organizer's ticket face price. The
default rate is 6 percent and an administrator can configure an event-specific rate from 0 to 20
percent. The fee is added to the participant total rather than deducted from the ticket face price.

For a 50.000 TND ticket at the default rate:

```text
Ticket face price:             50.000 TND
Tickr service fee at 6%:        3.000 TND
Participant total:             53.000 TND
Organizer gross entitlement:   50.000 TND
Tickr gross service fee:        3.000 TND
```

The 3.000 TND is gross revenue before gateway costs, messaging costs, refunds, chargebacks, taxes,
support, and operating expenses. Organizer payout and settlement are not yet implemented.

### Current readiness

Tickr has a substantial backend and a complete frontend product/design specification, but it is not
ready for a public launch.

| Area                  | Current state                                                                                                           | Business interpretation                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Product definition    | Detailed V1 scope, journeys, screens, design system, and architecture are specified                                     | The intended customer experience is clear                          |
| Backend modules       | Users, Events, Tickets, Payments, Notifications, and Analytics are implemented at module level                          | Most core business capabilities exist                              |
| Backend quality       | Latest local unit run: 205 suites passed, 1 skipped; 2,694 tests passed, 23 skipped                                     | Strong automated unit-test foundation                              |
| Frontend design       | Eleven specification phases are complete; external Figma artifacts remain pending for wireframes and high-fidelity work | Build direction is ready, visual production is not complete        |
| Frontend application  | Only foundational scaffolding and a small API/client surface exist                                                      | The customer-facing product still needs implementation             |
| End-to-end purchase   | A ticket-reservation adapter is still a stub                                                                            | A real purchase cannot yet complete reliably end to end            |
| Account activation    | Registration does not currently issue and send the required verification token                                          | A new account can be blocked from logging in                       |
| Settlement            | No organizer balance, payout ledger, bank-account capture, or reconciliation flow exists                                | Tickr cannot yet operate organizer payouts as a controlled process |
| Production operations | Provider contracts, legal policies, support process, settlement process, and production validation remain open          | Commercial launch readiness is not established                     |

### Strategic conclusion

The immediate company priority is not adding more feature categories. It is closing the complete
commercial loop for one market:

```text
Organizer onboarded -> event published -> participant acquired
-> payment completed -> ticket issued -> attendee checked in
-> organizer reconciled and paid -> both sides return
```

Growth investment should begin with controlled organizer and event acquisition while the product
team closes the launch blockers. Large paid-acquisition campaigns should wait until the purchase,
support, refund, and payout loops have been proven in a closed beta.

---

## 2. Product vision and strategic direction

### V1 mission

Prove that Tickr can become a trusted marketplace for discovering and attending events in Tunisia.
The V1 must make five outcomes dependable:

1. A participant can find an event worth attending.
2. The participant understands the full cost before paying.
3. A successful payment produces valid tickets without manual intervention.
4. The ticket remains easy to retrieve and validate at the venue.
5. The organizer can understand sales, operate entry, and reconcile what is owed.

### Long-term vision

Tickr can grow from a ticketing platform into a global event network where people discover relevant
events, attend with confidence, and connect safely around shared experiences.

Ticketing is the trust foundation for that vision. A confirmed ticket creates a verified
relationship among a participant, an organizer, and an event. Social or community features should
enhance that relationship only after the transaction, identity, privacy, and safety foundations are
reliable.

### Product principles

1. **Discovery is a product surface.** Users should be able to browse by category, city, date, and
   price even when they have no search query in mind.
2. **Speed is measured.** The target is poster-to-paid in under 90 seconds for a returning user and
   under three minutes for a first-time user, including registration.
3. **Trust is structural.** Prices, service fees, provider identity, reservation time, order status,
   and next actions must remain visible and understandable.
4. **Checkout minimizes decisions.** Ask only for ticket type, quantity, attendee information, and
   payment method.
5. **Mobile is the primary context.** The participant journey and event-door workflow must work on
   mid-range mobile devices and unstable networks.
6. **The product is local by construction.** TND, local gateways, French-first language, and
   Tunisian phone formats are V1 defaults rather than later adaptations.
7. **Growth cannot outrun operations.** Acquisition should scale only when payment, ticketing,
   refunds, support, and organizer settlement can handle the resulting demand.

### What Tickr is not in V1

- A native mobile application.
- A seat-map or assigned-seating system.
- A ticket resale marketplace.
- A public social network.
- An algorithmic recommendation feed.
- A multi-country, multi-currency platform.
- A recurring-event management suite.
- A complete organizer payout platform.
- A generic corporate SaaS dashboard.

Ticket transfer exists as a direct participant-to-participant capability. It is not a resale
marketplace because the product has no listing, pricing, discovery, or escrow model for resale.

---

## 3. Customers and jobs to be done

Product attention is weighted approximately 70 percent to participants, 25 percent to organizers,
and 5 percent to platform administrators. This is a product-design weighting, not a revenue split.

### 3.1 Participant

**Profile:** An adult event-goer in Tunisia who primarily discovers activities through Instagram,
Facebook, WhatsApp, friends, artists, venues, and local communities. Mobile is the default device.

**Core job:** "Help me find something worth attending, understand the real cost, pay with
confidence, and get through the door without trouble."

**Main pains:**

- Event information is scattered or incomplete.
- The user may not know what to search for.
- Online payment creates anxiety when the provider or final amount is unclear.
- A failed or delayed payment can leave the user unsure whether money was taken.
- A digital ticket is useless if it cannot be found or loaded at the venue.

**Value Tickr must deliver:**

- Browseable discovery by city, category, date, and price.
- Decision-critical facts visible before opening every event.
- Transparent face price, service fee, and final total.
- Local payment options presented as first-class choices.
- A visible 15-minute reservation window.
- Immediate access to ticket status and QR code.
- Clear payment, expiry, cancellation, and refund states.

### 3.2 Organizer

**Profile:** An association, venue, promoter, startup, community, trainer, or independent event
producer. The organizer may create events on a laptop but monitor sales and operate the venue from a
phone.

**Core job:** "Help me publish and sell my event quickly, understand performance, control entry,
and know what Tickr owes me."

**Main pains:**

- Event setup, promotion, payment collection, attendee lists, and check-in use separate tools.
- Sales information is delayed or manually maintained.
- Door teams need a fast and unambiguous validation workflow.
- Fees and expected payout can be difficult to explain.
- Small organizers may lack technical staff or formal operating processes.

**Value Tickr must deliver:**

- Event creation centered on poster, title, date, place, and ticket types.
- Draft and published states that are impossible to confuse.
- Face-price control with a transparent preview of participant fees.
- Sales, gross ticket value, and check-in visibility.
- Participant management and exports.
- Mobile QR scanning with clear valid or invalid results.
- A documented cancellation, refund, reconciliation, and payout process.

### 3.3 Platform administrator

**Profile:** Tickr operations, support, finance, and authorized platform staff.

**Core job:** "Help me operate the marketplace safely, resolve issues, monitor performance, and
maintain an audit trail."

**Required capabilities:**

- User and event visibility.
- Platform and revenue reporting.
- Exportable operational data.
- Commission configuration and audit history.
- Event moderation and escalation.
- Payment, refund, and settlement reconciliation.
- Support access to order and ticket status without exposing unnecessary personal data.

Some administrative read surfaces exist, but complete moderation and settlement operations remain
roadmap work.

---

## 4. Core product journeys

### 4.1 Participant purchase

1. Discover an event through browsing, search, a shared link, or a campaign.
2. Compare date, place, price, and availability.
3. Open the event page and review practical information.
4. Select a ticket type and quantity.
5. See the ticket subtotal, effective service fee, and participant total.
6. Sign in or register when required.
7. Reserve inventory for 15 minutes.
8. Choose Konnect, Paymee, or Stripe where available.
9. Complete payment through redirect or in-page payment.
10. Wait for authoritative payment confirmation.
11. Receive and retrieve the ticket and QR code.
12. Present the ticket for check-in.

**Important constraints:**

- One reservation request supports 1 to 10 ticket holders.
- A user is limited to 10 tickets per event.
- Fraud controls limit order creation to 5 orders per hour per user.
- Availability shown in the interface is a snapshot and must be revalidated.
- The participant must not be told that payment failed while confirmation is merely delayed.

### 4.2 Organizer event lifecycle

1. Register and obtain organizer access.
2. Create an event as a draft.
3. Add title, description, category, location, dates, and cover image.
4. Define one or more ticket types with face price, quantity, and sales period.
5. Review how the participant will see the event and ticket total.
6. Publish the event when requirements are complete.
7. Share and promote the public event page.
8. Monitor sales, ticket volume, and timeline data.
9. Manage participants and check-in.
10. Cancel or complete the event according to policy.
11. Reconcile refunds, adjustments, gateway records, and organizer payout.

The first nine steps are substantially represented in the product model. Step 11 requires an
operational and technical settlement system before public launch at scale.

### 4.3 Door check-in

1. Authorized event staff select the event.
2. Staff scan or enter a ticket QR code.
3. Tickr checks authenticity, event match, status, and prior use.
4. The interface returns a clear accepted or refused result.
5. A valid ticket is marked as checked in.
6. Duplicate and invalid attempts remain traceable for operations.

Door staff uses an existing active, verified Tickr account with an event-scoped assignment. The
assignment grants only scanner and basic door-progress access; it does not grant organizer editing,
revenue, refund, participant-export, or platform permissions. Owners and current administrators
retain implicit check-in access, and simultaneous scans cannot both validate one ticket.

The experience must prioritize speed, large touch targets, high contrast, and recovery from weak
connectivity. Offline behavior must be validated before it is promised commercially.

### 4.4 Refund and cancellation

The current product model supports refund requests and event cancellation, but the commercial
policy and gateway operations must be finalized.

**Confirmed calculation:** The refund amount is the ticket subtotal plus any payment fees. The
Tickr service fee is non-refundable. Payment fees are currently zero in production flows.

For the 50.000 TND example, the participant pays 53.000 TND and the modeled refund is 50.000 TND.
This rule must be shown before purchase and reviewed against consumer law and provider contracts.

---

## 5. Product scope

### Confirmed V1 capability areas

| Area           | Capability                                                                           |
| -------------- | ------------------------------------------------------------------------------------ |
| Accounts       | Registration, login, profile, roles, email verification model, password reset model  |
| Events         | Create, update, publish, cancel, complete, categorize, locate, and add a cover image |
| Discovery      | Public event listing, text search, category, city, country, date, and price filters  |
| Ticket types   | Face price, currency, quantity, availability, sales period, and active state         |
| Orders         | Create and track orders with immutable price components and expiration               |
| Payments       | Konnect, Paymee, Stripe, asynchronous webhook handling, and idempotency controls     |
| Tickets        | Reservation model, ticket issue, direct transfer, QR code, status, and check-in      |
| Notifications  | Email and SMS preferences, templates, scheduling, retries, and bulk processing       |
| Analytics      | Event metrics, platform metrics, sales timelines, dashboards, and report exports     |
| Administration | User visibility, platform reporting, and per-event commission override               |

"Capability area" does not mean every journey is production-ready. The integration gaps in Section
8 remain controlling launch constraints.

### Initial event categories

The product can support multiple category values, but the commercial launch should concentrate
supply instead of presenting an empty catalog across every category. Existing planning prioritizes:

- Concerts, festivals, and nightlife.
- Sports events and competitions.
- Conferences, workshops, and training.
- Community and cultural events where digital ticketing solves a clear operational problem.

**Open decision:** Select the first one or two category wedges and launch cities using organizer
interviews, event frequency, average capacity, payment readiness, and audience reach. Do not decide
only from product preference.

---

## 6. Value proposition and positioning

### Participant value proposition

> Find a relevant event, see exactly what it costs, pay through a familiar option, and keep a valid
> ticket ready for the door.

### Organizer value proposition

> Launch ticket sales quickly, manage the event from one place, understand demand in real time, and
> operate faster entry with verifiable digital tickets.

### Platform positioning

Tickr should position itself around three combined advantages:

1. **Local relevance:** TND, Tunisian payment options, local language, local phone numbers, and
   market-specific operations.
2. **Transaction clarity:** visible fees, stable order totals, named payment providers, and clear
   order states.
3. **Operational completeness:** creation, sale, ticket issue, analytics, and check-in within one
   system.

### Messaging boundaries

Tickr should not claim the following until each statement is proven:

- "Guaranteed payment success."
- "Instant organizer payout."
- "Works fully offline."
- "The cheapest platform in Tunisia."
- "The largest event marketplace in Tunisia."
- "Secure" as an unsupported absolute claim.
- A specific saving against a competitor without dated, externally verified pricing.
- A net organizer revenue amount before settlement and gateway accounting exist.

The brand voice should be energetic around events and precise around money. Transactional copy must
state what happened, what it means for the user's money, and what action comes next.

---

## 7. Business model

### 7.1 Primary revenue model

Tickr's confirmed V1 revenue mechanism is a service fee added to the ticket face price.

Let:

- `P` be the organizer's ticket face price.
- `r` be the effective service-fee rate.
- `F` be the Tickr service fee.
- `T` be the participant total before any future payment fee.

```text
F = round_to_TND_precision(P x r)
T = P + F
```

The effective rate is:

```text
event commission override ?? global configured rate ?? 6%
```

An administrator can change an event's rate for new orders. Existing orders are not repriced.

### 7.2 What revenue reporting must distinguish

| Measure                       | Definition                                                               |
| ----------------------------- | ------------------------------------------------------------------------ |
| Gross merchandise value (GMV) | Total ticket face-price value sold                                       |
| Gross service-fee revenue     | Service fees charged by Tickr                                            |
| Gateway cost                  | Merchant fees charged by payment providers                               |
| Variable communication cost   | SMS, email, and other per-transaction communication cost                 |
| Refund and chargeback cost    | Amounts lost or paid through refunds, disputes, and operational handling |
| Contribution margin           | Gross service-fee revenue minus transaction-level variable costs         |
| Operating margin              | Contribution margin minus fixed operating costs                          |

GMV is not Tickr revenue. Gross service fees are not net revenue. Organizer ticket value is not a
confirmed payable balance until refunds, adjustments, and settlement are reconciled.

### 7.3 Costs that remain unvalidated

- Konnect merchant pricing and refund fees.
- Paymee merchant pricing and refund fees.
- Stripe account, currency, and card pricing for the intended setup.
- Chargeback and dispute costs.
- Banking and organizer payout costs.
- SMS unit cost and expected number of messages per order.
- Email cost at expected volume.
- Customer support cost per order and per event.
- Tax treatment of ticket value and Tickr service fees.

These values must come from contracts, invoices, and legal advice. They should not be copied from
historical estimates into an investor model as facts.

### 7.4 Organizer payout

**Open decision:** Existing planning proposes organizer payout seven days after the event, but this
is not an implemented or approved commercial policy.

Before accepting live money at scale, Tickr needs:

- Organizer identity and bank-account requirements.
- A definition of the legal merchant and collection model.
- A ledger separating ticket value, service fee, refund, chargeback, adjustment, and payout.
- Reconciliation against each payment provider.
- Payout approval, execution, failure, retry, and audit processes.
- Rules for cancelled, postponed, disputed, and partially refunded events.
- Tax documents and organizer statements.

### 7.5 Future revenue hypotheses

These are optional hypotheses, not committed roadmap items:

- Organizer subscriptions for advanced tools or support.
- Paid promotion or sponsored event placement with clear labeling.
- White-label or API access for larger organizers.
- Marketing and audience tools for organizers.
- Affiliate revenue from transport, hospitality, or local experiences.
- Enterprise pricing for venues with recurring high volume.

Each model needs customer interviews, willingness-to-pay testing, unit economics, and a decision on
whether it improves or distracts from marketplace liquidity.

---

## 8. Current product and launch readiness

### 8.1 What is strong today

- The core domain is modeled across six bounded backend modules.
- Product rules cover events, ticket types, orders, payments, refunds, tickets, and check-in.
- Multiple payment providers are represented behind a common contract.
- Pricing components are explicit and existing orders are protected from later rate changes.
- The product has unit, integration, end-to-end, and architecture test structures.
- Frontend information architecture, user journeys, screen inventory, component inventory, design
  system, responsive rules, and technical architecture are documented.
- The V1 experience is constrained by actual backend capabilities rather than invented screens.

### 8.2 Launch blockers

#### P0: Complete ticket reservation and issuance

The Payments module currently binds ticket reservation to a stub adapter. It returns placeholder
ticket identifiers without reserving real inventory. Until this is replaced and tested, a payment
cannot safely guarantee a real ticket.

**Launch evidence required:** One automated and one manually observed journey from event inventory
through paid order, real ticket creation, QR retrieval, check-in, and duplicate-scan rejection.

#### P0: Complete account verification and transactional email

Registration does not currently mint and send the email verification token required by the login
policy. Password-reset and several transaction-triggered messages also contain unfinished wiring.

**Launch evidence required:** Register, receive email, verify, log in, reset password, and resend a
verification email in a production-like environment.

#### P0: Build the customer-facing frontend

The frontend repository remains close to scaffold level even though the full specification exists.

**Launch evidence required:** Responsive participant, organizer, and minimum admin journeys tested
on supported mobile and desktop browsers against the production-like API.

#### P0: Define and implement money operations

Organizer settlement, provider reconciliation, payout, refund operations, and financial reporting
are incomplete.

**Launch evidence required:** A finance-approved ledger and operating process tested against
sandbox transactions, refunds, failed payouts, and event cancellation.

#### P0: Establish legal and commercial readiness

The repository does not establish final legal advice, provider contracts, tax treatment, privacy
policy, terms of service, organizer agreement, refund policy, or customer-support commitments.

**Launch evidence required:** Approved policies and signed production-provider arrangements for the
chosen beta scope.

### 8.3 Important P1 gaps

- Complete administrative moderation actions and audit behavior.
- Validate event-owner staff assignment and revocation ergonomics in the organizer frontend.
- Finish notification integrations for payment, ticket, cancellation, and refund events.
- Verify analytics definitions and backfill any historical revenue metrics that used buyer totals.
- Validate offline ticket retrieval and scanning behavior before marketing it.
- Implement operational monitoring, alerting, incident response, and support escalation.
- Validate performance and accessibility on representative low-end devices and weak networks.

### 8.4 Readiness statement

Tickr is **product-defined and backend-advanced, but commercially pre-launch**. Completion
percentages from older status reports should not be used in external materials. Readiness must be
measured by successful end-to-end outcomes and operating controls, not by source-file counts.

---

## 9. Product and growth roadmap

The roadmap is organized by evidence gates rather than fixed dates. Leadership can add dates only
after team capacity, provider onboarding, legal work, and launch scope are confirmed.

### Phase 0: Close the commercial loop

**Objective:** Make one real event transaction safe from creation through organizer reconciliation.

**Product and operations:**

- Replace the ticket-reservation stub with real inventory operations.
- Finish registration verification, resend, password reset, and transactional communications.
- Implement the minimum participant, organizer, check-in, and admin frontend.
- Finalize refund, cancellation, settlement, payout, and reconciliation policies.
- Validate Konnect, Paymee, Stripe, SES, and SMS production arrangements.
- Complete privacy, terms, organizer agreement, and customer-support procedures.
- Instrument the full acquisition and purchase funnel.

**Growth work:**

- Build a qualified organizer pipeline.
- Interview organizers by city, category, size, frequency, and current ticketing method.
- Identify a narrow launch wedge with repeat event supply.
- Build beta positioning, sales materials, onboarding scripts, and an event launch checklist.
- Recruit beta organizers without promising unavailable functionality.

**Exit gate:** At least one production-like event completes the full money and ticket lifecycle with
no manual data correction, and support can explain every state.

### Phase 1: Closed beta in Tunisia

**Objective:** Prove the product with a controlled set of organizers and live events.

**Product and operations:**

- Onboard organizers manually and observe event setup.
- Run payment, ticket delivery, check-in, refund, cancellation, and settlement playbooks.
- Measure support reasons and remove recurring friction.
- Validate analytics against provider and bank records.
- Improve the highest-impact conversion and organizer workflow problems.

**Growth work:**

- Concentrate on one or two cities and one or two event categories.
- Treat each event as a launch campaign with organizer-owned and Tickr-owned distribution.
- Capture participant consent for useful lifecycle communication.
- Collect structured organizer and participant feedback.
- Document proof points only after they are measured.

**Exit gate:** Repeated live events complete successfully, payment and ticket delivery are reliable,
organizers can be paid accurately, and the same organizers choose to run another event.

### Phase 2: Public V1 and marketplace liquidity

**Objective:** Establish repeatable supply acquisition and participant demand in the first market.

**Product:**

- Improve discovery quality and event merchandising.
- Strengthen organizer self-service onboarding.
- Add trustworthy event and organizer quality signals.
- Improve campaign attribution and conversion measurement.
- Reduce support contacts per paid order.
- Improve participant return and cross-event discovery.

**Growth:**

- Build repeatable organizer segmentation and sales motions.
- Create category and city landing experiences around real inventory.
- Use organizer, venue, artist, sponsor, and community distribution partnerships.
- Develop event-level referral and sharing loops.
- Scale paid acquisition only where contribution margin and repeat behavior are understood.

**Exit gate:** Supply, conversion, repeat purchase, organizer retention, and contribution margin are
stable enough to forecast by cohort.

### Phase 3: V2 international readiness

**Objective:** Make the platform capable of entering additional markets without duplicating the
product for each country.

**Potential scope, subject to V1 evidence:**

- Arabic and English in addition to French, including right-to-left layouts.
- Multiple countries, currencies, time zones, tax rules, and refund policies.
- Market-specific payment providers and settlement rules.
- Organizer verification, moderation, and market-specific support.
- Optional participant interests and private attendance-intent controls.
- Stronger consent, reporting, blocking, age policy, and safety foundations.

**Expansion rule:** A market launches only when payments, legal compliance, support, event supply,
content quality, and operational ownership are ready together.

**Exit gate:** A second market can run the complete transaction and settlement lifecycle with local
compliance, support, and sufficient event supply.

### Phase 4: V3 event network

**Objective:** Extend trusted event participation into safe connection and community.

**Potential capabilities:**

- Personalized event recommendations based on explicit signals.
- Opt-in matching among people attending or considering the same event.
- Private go-together groups and companion discovery.
- Temporary Event Spaces before, during, and after an event.
- Organizer controls for public or verified-attendee access.
- Reporting, blocking, moderation, visibility, opening, and archive controls.

These capabilities require evidence of demand and mature privacy and safety systems. They must not
obstruct discovery, purchase, ticket access, or check-in.

---

## 10. Growth strategy framework

This section defines recommended hypotheses for the Head of Growth to test. It is not a record of
validated channel performance.

### 10.1 Marketplace growth model

Tickr is a two-sided marketplace. Supply and demand reinforce each other:

```text
More relevant events
-> stronger participant acquisition
-> more paid attendance and organizer value
-> more organizer retention and referrals
-> more relevant events
```

The loop fails if Tickr spreads limited inventory across too many cities or categories. Early growth
should prioritize density: enough relevant events for a specific audience in a specific place and
time window.

### 10.2 Supply-side growth hypotheses

**Priority segments to research:**

- Venues with recurring programming.
- Independent promoters and nightlife organizers.
- Training, conference, and community organizers.
- Sports clubs and race organizers.
- University, association, and cultural communities.

**Potential acquisition motions:**

- Founder-led and growth-led direct outreach.
- Partnerships with venues, artists, communities, and event service providers.
- A concierge onboarding offer for the first event.
- Migration assistance for attendee lists and ticket structures.
- Organizer referrals after a successful settlement.
- Case studies focused on sell-through, operational time saved, and check-in speed.

**Questions every organizer interview should answer:**

1. How many events do you run each month or year?
2. What is the average capacity, ticket price, and number of ticket types?
3. How do people currently discover and pay for the event?
4. Where do abandoned purchases or support problems occur?
5. Who owns customer support, refunds, and the venue door?
6. When and how does the organizer expect to be paid?
7. Which reports and exports are required?
8. What would make the organizer switch platforms or run the next event with Tickr?

### 10.3 Demand-side growth hypotheses

- Organizer-owned audiences should be the first acquisition channel for each event.
- Shared event links and participant-to-friend sharing can reduce paid acquisition dependence.
- City, category, venue, and date-based discovery pages can capture high-intent demand.
- Creator, artist, club, university, and community partnerships can aggregate trusted audiences.
- Email and SMS should focus on transactional value and relevant reminders before promotional use.
- Paid social should begin with measurable event inventory and stop when contribution economics do
  not support it.

### 10.4 Event-level launch playbook

Every beta event should have one shared plan between Tickr and the organizer:

1. Confirm event information, capacity, ticket structure, and sales window.
2. Confirm commercial terms, cancellation rules, settlement date, and responsible contacts.
3. Define target audience and organizer-owned distribution channels.
4. Prepare the event page and tracked campaign links.
5. Test purchase, ticket delivery, refund, and scan before sales open.
6. Monitor views, ticket selection, order creation, payment success, and support issues.
7. Prepare door staff, devices, connectivity fallback, and escalation contacts.
8. Reconcile sales, refunds, provider records, and payout after the event.
9. Run a post-event review with participant and organizer feedback.
10. Ask for the next event only after the current event has been reconciled successfully.

### 10.5 Retention model

Participant retention and organizer retention need different programs.

**Participant retention:** relevance, reliable transactions, easy ticket access, event reminders,
and useful discovery after attendance.

**Organizer retention:** successful settlement, low support burden, faster event setup, useful
performance data, reliable check-in, and confidence that Tickr helps sell the next event.

The strongest early retention indicator is not account creation. It is whether participants buy
again and whether organizers publish another event.

---

## 11. Measurement framework

### 11.1 Proposed north-star metric

**Candidate:** Monthly verified attendees.

Definition: unique participants with at least one paid, valid ticket for an event in the month.
Checked-in attendees should be reported separately until check-in adoption is consistent across
organizers.

Why it is useful:

- It measures delivered participant value rather than registrations or page views.
- It grows when Tickr adds useful supply, converts demand, and issues valid tickets.
- It avoids treating GMV or gross fees as the only definition of product success.

**Open decision:** Leadership must approve the north-star definition after checking whether the
analytics model can calculate unique paid participants reliably.

### 11.2 Marketplace scorecard

| Area            | Core measures                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Supply          | Qualified organizers, activated organizers, events published, live events, repeat organizers, event cancellation rate |
| Demand          | Unique visitors, event-detail viewers, new buyers, repeat buyers, tickets per buyer, city/category demand             |
| Funnel          | Event view to selection, selection to order, order to payment start, payment success, paid order to ticket delivery   |
| Engagement      | Search usage, event saves or shares when available, message delivery, return discovery sessions                       |
| Event outcome   | Tickets sold, sell-through rate, paid attendees, check-in rate, refund rate, support contacts                         |
| Revenue         | GMV, gross service fees, effective take rate, average order value, tickets per order                                  |
| Unit economics  | Gateway cost per paid order, messaging cost, support cost, refunds, chargebacks, contribution margin                  |
| Organizer value | Time to publish, first-event activation, days to first sale, repeat-event rate, organizer satisfaction                |
| Reliability     | API availability, payment confirmation time, ticket-delivery success, scan response time, incident rate               |

### 11.3 Funnel definitions

Use stable event names and definitions before running growth experiments:

```text
Discovery visit
-> event detail viewed
-> ticket type selected
-> checkout started
-> order created
-> payment initiated
-> payment confirmed
-> ticket delivered
-> ticket checked in
```

Report conversion by event, organizer, category, city, device, acquisition source, payment provider,
and new versus returning participant. Never combine payment initiation with payment confirmation.

### 11.4 Cohorts that matter

- Participant first-purchase month.
- Organizer first-published-event month.
- First acquisition source.
- First event category and city.
- Payment provider.
- Organizer size and event frequency.

Without cohorts, aggregate growth can hide poor retention or dependence on a few large events.

### 11.5 Proposed beta success criteria

Leadership should set numeric thresholds after baseline tests. The beta should at minimum prove:

- Real organizers can publish without engineering intervention.
- Participants can complete payment and retrieve tickets reliably.
- Payment records, tickets, refunds, and provider records reconcile.
- Door teams can operate check-in under realistic conditions.
- Support can resolve failed and delayed states using available data.
- Organizers receive accurate statements and payout.
- Some participants purchase again or express measurable intent to do so.
- Some organizers commit to a second event.

---

## 12. Launch strategy and go/no-go gates

### Recommended launch sequence

1. Internal end-to-end sandbox events.
2. Invite-only events with known organizers and controlled attendance.
3. Closed beta in a narrow city/category wedge.
4. Public launch for proven segments.
5. Expansion to adjacent categories and cities based on measured supply and demand.

### Product gate

- Registration, verification, login, and password recovery work.
- Real inventory is reserved and released correctly.
- Payment success creates valid tickets exactly once.
- Payment delay and failure states are recoverable.
- Tickets remain retrievable at the venue.
- Check-in rejects invalid and duplicate tickets.
- Refund and cancellation calculations match policy.
- Participant and organizer interfaces meet accessibility and mobile requirements.

### Finance gate

- Each provider's commercial terms are documented.
- GMV, service fees, refunds, chargebacks, and payouts reconcile.
- Organizer settlement ownership and approval are defined.
- Failed payouts and disputes have operating procedures.
- Finance reporting separates GMV, gross fees, costs, and contribution.

### Legal and trust gate

- Terms of service, privacy policy, organizer agreement, and refund policy are approved.
- Marketing and SMS consent rules are implemented.
- Personal-data access, correction, retention, and deletion responsibilities are defined.
- Payment and organizer verification obligations are confirmed for the operating model.
- Public claims can be supported with evidence.

### Operations gate

- Support channels, hours, service levels, and escalation owners are known.
- Event-day incident and connectivity procedures exist.
- Monitoring and alerting cover payment, ticket delivery, and check-in.
- Organizer onboarding and event quality checks are documented.
- A named owner can reconcile and close every live event.

### Growth gate

- Launch inventory is relevant and dense enough for the target segment.
- Every campaign has attribution and a defined conversion goal.
- Growth spend has a stop condition.
- Organizer and participant feedback loops are active.
- The team can distinguish acquisition, activation, conversion, retention, and revenue.

No public growth campaign should begin until all P0 product and money gates pass.

---

## 13. Key risks and mitigations

| Risk                           | Why it matters                                                                     | Mitigation                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Empty marketplace              | Broad coverage with little inventory gives participants no reason to return        | Launch with category and geographic density                                          |
| Organizer concentration        | One large organizer can distort growth and create revenue dependency               | Track concentration and build a segmented pipeline                                   |
| Payment uncertainty            | Delayed or unclear status damages trust immediately                                | Use authoritative confirmation, idempotency, status polling, and clear support paths |
| Inventory mismatch             | Selling without real reservation can oversell an event                             | Replace the stub and test concurrency before beta                                    |
| Settlement failure             | Incorrect or late payout can end organizer relationships                           | Build a ledger, reconciliation, approvals, and payout controls                       |
| Hidden unit economics          | Gross fees can look healthy while transaction costs destroy margin                 | Measure provider, message, support, refund, and chargeback cost per paid order       |
| Weak event quality             | Incomplete or misleading listings reduce conversion and trust                      | Add onboarding standards and quality review                                          |
| Event cancellation             | Participants need fast information and organizers need clear liability             | Define communication, refund, and settlement policies in advance                     |
| Door failure                   | A valid ticket that cannot be checked destroys the core promise                    | Rehearse event-day workflows and connectivity fallback                               |
| Premature internationalization | New markets multiply payment, legal, support, and supply complexity                | Expand market by market through readiness gates                                      |
| Premature social features      | Matching without safety and consent creates privacy and moderation risk            | Build identity, consent, reporting, blocking, and moderation first                   |
| Unsupported claims             | Unverified competitor, security, or performance claims create legal and trust risk | Require evidence and review for every external claim                                 |

---

## 14. Decisions and research still required

### Market research

- Tunisian event-ticketing market size and digital share.
- Event volume, capacity, ticket price, and frequency by city and category.
- Current organizer workflows and switching barriers.
- Participant discovery behavior and payment-provider trust.
- Competitor pricing, contract terms, payout timing, support, and category strength.
- Addressable organizer segments and their willingness to pay.

### Commercial decisions

- First launch city or cities.
- First category wedge or wedges.
- Beta organizer profile and qualification criteria.
- Whether the default 6 percent rate is appropriate for every launch segment.
- Discount and event-specific commission authority.
- Organizer contract, settlement timing, reserves, and cancellation liability.
- Refund policy and who absorbs each cost.
- Support model and service levels.

### Financial decisions

- Legal merchant and funds-flow model.
- Payment-provider mix and routing policy.
- Gateway costs and minimum fees by provider.
- Tax and accounting treatment of GMV and service fees.
- Payout costs, reserves, chargebacks, and bad-debt assumptions.
- Marketing budget and acceptable payback period.

### Product decisions

- Whether users must verify email before purchase or only before protected actions.
- Required organizer verification for beta and public launch.
- Minimum viable moderation controls.
- Exact offline ticket and check-in promise.
- Which analytics are trustworthy enough for organizer-facing reporting.
- Which V2 capabilities are triggered by evidence rather than enthusiasm.

---

## 15. Business documents to build from this brief

The Head of Growth can use this document as the product source for the following outputs. Each still
requires its own research and owner.

| Document                  | Purpose                                                                          | Additional evidence required                                             |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Business plan             | Explain company, market, model, operations, and milestones                       | Market sizing, legal structure, team plan, financial model               |
| Go-to-market plan         | Define launch segments, channels, campaigns, ownership, and budget               | Organizer pipeline, channel tests, launch inventory, baseline conversion |
| Market research report    | Quantify demand, supply, categories, cities, and competition                     | Primary interviews and dated external sources                            |
| Financial model           | Forecast GMV, fees, cost, cash, and runway                                       | Provider contracts, order behavior, taxes, payroll, marketing, support   |
| Organizer sales playbook  | Standardize prospecting, qualification, demo, proposal, onboarding, and renewal  | Segment interviews, objections, terms, onboarding capacity               |
| Partnership strategy      | Define venue, artist, community, sponsor, bank, and provider partnerships        | Partner map, mutual value, commercial terms, owners                      |
| Brand and messaging guide | Convert positioning into audience-specific messages and campaigns                | Message testing in French and later Arabic/English                       |
| Launch plan               | Coordinate product, events, marketing, support, finance, and incident response   | Launch dates, named owners, beta events, readiness evidence              |
| KPI dictionary            | Establish metric formulas, sources, owners, and reporting cadence                | Analytics audit and event-tracking implementation                        |
| Investor deck             | Present problem, solution, market, traction, model, moat, roadmap, team, and ask | Validated market size, traction, economics, funding need                 |
| Operating plan            | Define support, moderation, event-day response, reconciliation, and payout       | Staffing, service levels, controls, tools, legal review                  |

### Recommended creation order

1. Market and organizer research plan.
2. Go-to-market plan for the closed beta.
3. Organizer sales and onboarding playbook.
4. KPI dictionary and experiment backlog.
5. Transaction-level financial model.
6. Launch operations and readiness plan.
7. Full business plan and investor materials after initial evidence exists.

This order prevents the business plan from becoming a collection of untested assumptions.

---

## 16. One-page product fact sheet

| Topic                 | Current answer                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Product               | Mobile-first event discovery, ticketing, payment, QR entry, organizer operations, and analytics |
| Initial market        | Tunisia                                                                                         |
| Primary users         | Participants and event organizers; administrators operate the platform                          |
| Language              | French-first in V1; Arabic and English are future readiness goals                               |
| Currency              | TND with three-decimal precision                                                                |
| Local payments        | Konnect and Paymee                                                                              |
| International payment | Stripe where the commercial setup supports it                                                   |
| Revenue               | Configurable service fee, default 6 percent, added to ticket face price                         |
| Reservation           | 15-minute hold                                                                                  |
| Purchase limits       | Up to 10 tickets per event per user; 5 orders per hour per user                                 |
| Notifications         | Email and SMS                                                                                   |
| Core ticket           | Digital ticket with unique QR code and check-in state                                           |
| Backend               | Six product modules implemented, with critical cross-module wiring still open                   |
| Frontend              | Product and architecture specifications complete; application implementation minimal            |
| Launch state          | Pre-launch; not ready for public acquisition at scale                                           |
| V2 direction          | International readiness, localization, market-specific operations, safety foundations           |
| V3 direction          | Opt-in matching and event-specific community experiences                                        |

---

## 17. Source hierarchy

When documents disagree, use the following order:

1. Current backend and frontend source code for implemented behavior.
2. `docs/08-frontend/` for the current frontend product contract and V1 experience.
3. `docs/02-technique/04-modele-economique.md` for the corrected pricing model.
4. `docs/02-technique/02-api-contract.md` for API intent, checked against source code.
5. `docs/01-fonctionnel/` for original product intent and planning assumptions.
6. `docs/PROJECT_STATUS.md` only as a historical snapshot dated June 16, 2026.
7. The root `README.md` as an orientation document, not a current commercial source of truth.

Key references:

- `docs/08-frontend/02-product-design-brief.md`
- `docs/08-frontend/03-information-architecture.md`
- `docs/08-frontend/04-user-journeys.md`
- `docs/08-frontend/06-feature-inventory.md`
- `docs/08-frontend/11-frontend-architecture.md`
- `docs/01-fonctionnel/01-vue-ensemble.md`
- `docs/01-fonctionnel/02-specifications-detaillees.md`
- `docs/01-fonctionnel/03-regles-metier.md`
- `docs/02-technique/02-api-contract.md`
- `docs/02-technique/04-modele-economique.md`

---

## 18. Final guidance for business planning

Tickr has a credible product concept, strong domain coverage, a locally relevant payment strategy,
and a clear long-term direction. The central business challenge is now execution across the whole
marketplace, not additional conceptual scope.

The Head of Growth should treat the next stage as evidence creation:

- Prove which organizers have urgent enough problems to switch.
- Prove which event category and city can achieve inventory density.
- Prove participants complete payment and return for another event.
- Prove the 6 percent fee supports healthy contribution after real costs.
- Prove organizers can be reconciled, paid, and retained.
- Prove Tickr can support live event operations without losing trust.

Only after those points are measured should Tickr lock aggressive forecasts, broad paid acquisition,
new-country expansion, or social-network investment.
