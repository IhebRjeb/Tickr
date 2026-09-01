# 👔 Tech Lead Agent - Usage Guide

**Agent Type:** Technical Lead & Code Review Expert  
**Version:** 1.0  
**Last Updated:** November 25, 2025

---

## 🎯 Purpose

The **Tech Lead Agent** is your comprehensive code reviewer and architecture guardian. Unlike the Backend and Frontend agents that help you BUILD features, the Tech Lead agent helps you REVIEW and VALIDATE code before merging.

---

## 🤖 What Makes This Agent Special

### Complete Project Knowledge

- ✅ Knows entire backend structure (all 6 modules)
- ✅ Knows entire frontend structure (Next.js 16 App Router)
- ✅ Has read ALL documentation in `docs/` directory
- ✅ Understands complete CI/CD pipeline
- ✅ Knows all 30 architecture fitness functions
- ✅ Understands team conventions and standards

### Cross-Cutting Concerns

- ✅ Reviews architecture across backend AND frontend
- ✅ Verifies documentation alignment
- ✅ Checks CI/CD compliance
- ✅ Validates security practices
- ✅ Ensures performance optimization
- ✅ Maintains consistency across codebase

---

## 🚀 When to Use

### Use Tech Lead Agent For:

#### 1. **Final Code Reviews**

```
After backend/frontend agents helped you build:
→ Use Tech Lead agent to review before PR

"Review this code for architecture compliance, documentation
alignment, and CI/CD readiness"
```

#### 2. **Architecture Validation**

```
When unsure if design follows principles:
→ Ask Tech Lead for architectural review

"Does this module structure follow our hexagonal architecture?
Review against docs/03-architecture/"
```

#### 3. **Documentation Verification**

```
After making changes:
→ Verify docs are up-to-date

"Check if my code changes match the documentation in docs/.
What needs updating?"
```

#### 4. **Cross-Module Integration**

```
When modules need to communicate:
→ Validate event-driven approach

"Review this cross-module communication. Am I using events correctly?"
```

#### 5. **Security Audits**

```
Before deploying sensitive features:
→ Get security review

"Security review: check input validation, authentication,
and authorization in this payment flow"
```

#### 6. **Performance Review**

```
For high-traffic features:
→ Check performance implications

"Performance review: will this event listing page handle
10,000+ events efficiently?"
```

#### 7. **CI/CD Pre-Flight**

```
Before pushing:
→ Verify will pass pipeline

"Will this code pass all CI/CD stages? Check against our pipeline."
```

---

## 💡 Usage Examples

### Example 1: Complete PR Review

```
Chat: @workspace /context .github/copilot-instructions-techlead.md

I've implemented the ticket check-in feature. Please review:

1. Architecture compliance (hexagonal, CQRS, events)
2. Documentation alignment
3. Test coverage
4. CI/CD readiness
5. Security concerns
6. Performance implications

Files changed:
- backend/src/modules/tickets/domain/entities/ticket.entity.ts
- backend/src/modules/tickets/application/commands/check-in-ticket/
- backend/src/modules/tickets/infrastructure/controllers/tickets.controller.ts
- frontend/src/app/(participant)/check-in/page.tsx

Agent Response:
✅ Provides comprehensive review
✅ Checks hexagonal architecture
✅ Verifies documentation matches
✅ Validates tests exist
✅ Confirms CI/CD compliance
✅ Highlights any issues
✅ Suggests improvements
```

### Example 2: Architecture Decision Review

```
Chat: @workspace /context .github/copilot-instructions-techlead.md

I need to add analytics tracking for every ticket purchase.
Should I:
A) Import AnalyticsService in Tickets module
B) Publish a TicketPurchasedEvent for Analytics to listen
C) Something else?

Review against our architecture principles.

Agent Response:
✅ Explains event-driven architecture requirement
✅ Confirms option B is correct
✅ References docs/03-architecture/03-event-driven.md
✅ Provides implementation example
✅ Warns against option A (cross-module import)
```

### Example 3: Documentation Sync Check

```
Chat: @workspace /context .github/copilot-instructions-techlead.md

I changed the payment API from:
POST /api/payments/process
to:
POST /api/orders/:orderId/pay

What documentation needs updating?

Agent Response:
✅ Lists affected documentation files
✅ Shows specific sections to update
✅ Checks if frontend code needs changes
✅ Verifies Swagger annotations updated
✅ Confirms test expectations updated
```

### Example 4: Security Review

```
Chat: @workspace /context .github/copilot-instructions-techlead.md

Security review of this refund endpoint:

[paste code]

Check for:
- Input validation
- Authorization (only admins or organizers)
- Idempotency (prevent double refunds)
- Rate limiting
- Audit logging

Agent Response:
✅ Reviews authentication/authorization
✅ Checks input validation
✅ Verifies idempotency mechanism
✅ Suggests rate limiting approach
✅ Confirms audit logging present
✅ Highlights any vulnerabilities
```

### Example 5: Performance Audit

```
Chat: @workspace /context .github/copilot-instructions-techlead.md

Performance review of event listing page:

[paste code]

This page could display 10,000+ events. Review:
- Database query optimization
- Pagination implementation
- Server vs Client Components usage
- Image optimization
- Caching strategy

Agent Response:
✅ Identifies N+1 query issues
✅ Suggests proper eager loading
✅ Recommends pagination approach
✅ Validates Server Component usage
✅ Suggests caching layer
✅ Provides optimized code
```

---

## 🔄 Recommended Workflow

### Development Workflow with All 3 Agents

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: DEVELOPMENT                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Backend Work:                                            │
│ └─> Use Backend Agent                                   │
│     "Create Tickets module with check-in logic"         │
│                                                          │
│ Frontend Work:                                           │
│ └─> Use Frontend Agent                                  │
│     "Create ticket check-in page"                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: SELF-REVIEW                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Run Local Checks:                                        │
│ ├─ npm run lint:check                                   │
│ ├─ npm run test:arch (backend)                          │
│ ├─ npm run test:unit                                    │
│ └─ npm run build                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 3: TECH LEAD REVIEW                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Use Tech Lead Agent:                                     │
│ └─> Comprehensive review before PR                      │
│     "Review this feature for architecture compliance,   │
│      documentation alignment, and CI/CD readiness"      │
│                                                          │
│ Tech Lead Checks:                                        │
│ ├─ ✅ Architecture compliance                           │
│ ├─ ✅ Documentation sync                                │
│ ├─ ✅ Test coverage                                     │
│ ├─ ✅ Security validation                               │
│ ├─ ✅ Performance review                                │
│ └─ ✅ CI/CD compliance                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 4: FIX & ITERATE                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ If Tech Lead finds issues:                               │
│ ├─> Use Backend/Frontend agent to fix                   │
│ ├─> Update documentation                                │
│ ├─> Re-run tests                                        │
│ └─> Ask Tech Lead to re-review                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 5: PUSH & PR                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ✅ All checks pass                                       │
│ ✅ Tech Lead approved                                    │
│ ✅ Documentation updated                                 │
│                                                          │
│ → Push code                                             │
│ → Create PR                                             │
│ → CI/CD runs (and passes!)                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Review Checklist Template

When asking Tech Lead for review, provide context:

```
@workspace /context .github/copilot-instructions-techlead.md

**Feature:** [Feature name]

**Files Changed:**
- backend/src/...
- frontend/src/...
- docs/...

**What I Changed:**
[Brief description]

**What I Need Reviewed:**
- [ ] Architecture compliance (hexagonal, CQRS, events)
- [ ] Documentation alignment
- [ ] Test coverage (unit/integration/E2E)
- [ ] Security (auth, validation, XSS, CSRF)
- [ ] Performance implications
- [ ] Accessibility (WCAG AA)
- [ ] CI/CD readiness
- [ ] Code quality (TypeScript types, error handling)

**Questions:**
[Any specific concerns or questions]
```

---

## 🎓 Learning from Reviews

### Tech Lead Reviews Are Educational

Every review from the Tech Lead agent is a learning opportunity:

#### Example Learning Review:

```
You: "Review my event creation module"

Tech Lead:
✅ Architecture compliance: PASSED
   Great job keeping domain pure!

⚠️ Testing concern: NEEDS IMPROVEMENT
   Missing integration tests for repository.

   Why this matters: Integration tests verify your TypeORM mapping
   works correctly with actual database.

   Add this test:
   [provides example]

   Learn more: docs/06-testing/03-backend-testing-guide.md

🟢 Documentation: GOOD
   API docs updated correctly.

💡 Suggestion: Consider extracting validation to Value Objects
   Example: instead of validating email in entity,
   create Email value object that validates on construction.

   See: docs/03-architecture/01-principes-hexagonaux.md (Value Objects)

✅ APPROVED with suggestions
```

---

## 🎯 Common Review Scenarios

### Scenario 1: "Will This Pass CI/CD?"

```
Question: "Will this code pass our CI/CD pipeline?"

Tech Lead checks:
✅ Linting rules
✅ Architecture tests (npm run test:arch)
✅ Unit tests pass and coverage adequate
✅ Integration tests (if backend)
✅ E2E tests for new features
✅ TypeScript compiles
✅ Build succeeds
✅ No security vulnerabilities

Answer: "Yes/No, here's what needs fixing: ..."
```

### Scenario 2: "Is My Architecture Correct?"

```
Question: "Does this follow hexagonal architecture?"

Tech Lead checks:
✅ Domain layer pure TypeScript
✅ Application layer uses Ports
✅ Infrastructure implements Ports
✅ No cross-module imports
✅ Event-driven communication
✅ Database schema isolation
✅ CQRS pattern correct

Answer: "Yes/No, here are the violations: ..."
```

### Scenario 3: "Are My Docs Up-To-Date?"

```
Question: "Does my code match the documentation?"

Tech Lead checks:
✅ API matches docs/02-technique/02-api-contract.md
✅ Architecture matches docs/03-architecture/
✅ Database schema matches docs/02-technique/03-database-schema.md
✅ README files current
✅ Comments explain business logic

Answer: "Documentation is current / Here's what needs updating: ..."
```

### Scenario 4: "Is This Secure?"

```
Question: "Security review of payment processing"

Tech Lead checks:
✅ Input validation (DTOs with class-validator)
✅ Authentication (@UseGuards(JwtAuthGuard))
✅ Authorization (role checks)
✅ XSS prevention (proper escaping)
✅ CSRF protection (tokens)
✅ Rate limiting
✅ Audit logging
✅ Sensitive data handling

Answer: "Security looks good / Found these issues: ..."
```

---

## 📚 Tech Lead's Knowledge Base

The Tech Lead agent has complete knowledge of:

### Architecture Documentation

- ✅ `docs/03-architecture/00-architecture-governance-summary.md`
- ✅ `docs/03-architecture/01-principes-hexagonaux.md`
- ✅ `docs/03-architecture/02-structure-modules.md`
- ✅ `docs/03-architecture/03-event-driven.md`
- ✅ `docs/03-architecture/04-migration-microservices.md`
- ✅ `docs/03-architecture/05-fitness-functions.md`
- ✅ `docs/03-architecture/06-architecture-quick-ref.md`
- ✅ All other architecture docs

### Technical Specifications

- ✅ `docs/02-technique/01-stack-technique.md`
- ✅ `docs/02-technique/02-api-contract.md`
- ✅ `docs/02-technique/03-database-schema.md`
- ✅ `docs/02-technique/04-modele-economique.md`

### Testing Strategies

- ✅ `docs/06-testing/` (all testing guides)
- ✅ Backend testing (Jest, architecture tests)
- ✅ Frontend testing (Vitest, Playwright)

### CI/CD Pipeline

- ✅ `.github/workflows/ci.yml`
- ✅ All 9 pipeline stages
- ✅ Quality gates and thresholds

### Backend Structure

- ✅ All 6 modules (Users, Events, Tickets, Payments, Notifications, Analytics)
- ✅ Hexagonal architecture patterns
- ✅ 30 architecture fitness functions

### Frontend Structure

- ✅ Next.js 16 App Router structure
- ✅ Server vs Client Components
- ✅ Testing setup

---

## 💬 Best Practices for Working with Tech Lead

### 1. Be Specific

```
✅ GOOD: "Review payment processing for security, performance,
         and architecture compliance"
❌ BAD: "Is this code ok?"
```

### 2. Provide Context

```
✅ GOOD: "This refund feature touches Payments and Tickets modules.
         Review cross-module communication via events."
❌ BAD: "Review this" [paste code with no context]
```

### 3. Ask for Learning

```
✅ GOOD: "Review this and explain why each issue matters"
❌ BAD: "Just tell me what's wrong"
```

### 4. Request Specific Checks

```
✅ GOOD: "Focus on security and performance, architecture looks good"
❌ BAD: "Review everything"
```

### 5. Iterate Based on Feedback

```
✅ GOOD: "I fixed the issues you mentioned. Can you re-review?"
❌ BAD: [Ignores feedback and merges anyway]
```

---

## 🎉 Expected Outcomes

### After Using Tech Lead Agent:

- ✅ **Higher code quality** - Issues caught before PR
- ✅ **Better architecture** - Violations prevented
- ✅ **Updated docs** - Code and docs always in sync
- ✅ **Faster CI/CD** - Code passes pipeline first time
- ✅ **Team learning** - Educational reviews improve skills
- ✅ **Consistent standards** - Same quality bar for all code
- ✅ **Fewer bugs** - Comprehensive reviews catch issues early

---

## 🚀 Get Started

### Simple First Review

```
@workspace /context .github/copilot-instructions-techlead.md

I'm new to the Tech Lead agent. Can you:
1. Explain what you check in a review
2. Review this simple function as an example
3. Show me what a good review looks like

[paste a small code snippet]
```

### Full Feature Review

```
@workspace /context .github/copilot-instructions-techlead.md

Complete review of ticket check-in feature:

Files:
- backend/src/modules/tickets/...
- frontend/src/app/(participant)/check-in/...
- docs/02-technique/02-api-contract.md (updated)

Check:
- Architecture compliance
- Documentation alignment
- Test coverage
- Security
- Performance
- CI/CD readiness

Provide: Approval status, issues found, learning points
```

---

## 📞 Questions?

**How is Tech Lead different from Backend/Frontend agents?**

- Backend/Frontend: Help you BUILD features
- Tech Lead: Help you REVIEW and VALIDATE features

**When should I use Tech Lead?**

- Before creating PR
- When unsure about architecture decisions
- To verify documentation alignment
- For security/performance audits
- To check CI/CD compliance

**Can I use all three agents together?**

- Yes! Build with Backend/Frontend, review with Tech Lead

**What if Tech Lead and Backend agent disagree?**

- Tech Lead has final say (broader perspective)
- Tech Lead considers cross-cutting concerns
- Ask Tech Lead to clarify the conflict

---

## ✅ Success Checklist

You're using Tech Lead agent effectively when:

- [ ] Code passes all CI/CD stages first try
- [ ] Architecture violations caught before PR
- [ ] Documentation always matches code
- [ ] Security issues identified early
- [ ] Performance optimized from the start
- [ ] Team learns from reviews
- [ ] Consistent code quality across team

---

**The Tech Lead agent is your quality guardian. Use it before every merge!** 🚀

---

**Version:** 1.0  
**Last Updated:** November 25, 2025  
**Agent File:** `.github/copilot-instructions-techlead.md`
