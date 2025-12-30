# Tasks: Datadog LLM Observability Platform

**Input**: Design documents from `/specs/001-datadog-llm-observability/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification. This plan focuses on implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md project structure:
- Backend: `backend/src/` for source code
- Config: `backend/config/` and `config/` for configuration
- Scripts: `scripts/` for utilities
- Docs: `docs/` for documentation

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize Node.js 20.x project with TypeScript 5.3+ configuration in backend/
- [X] T002 Install core dependencies: @google/genai, dd-trace, @datadog/datadog-api-client, zod, express in backend/package.json
- [X] T003 [P] Configure TypeScript compiler options in backend/tsconfig.json with strict mode enabled
- [X] T004 [P] Setup ESLint and Prettier configuration in backend/.eslintrc.js and backend/.prettierrc
- [X] T005 [P] Create project directory structure: backend/src/{llm,observability,api}, backend/tests/, config/datadog/
- [X] T006 [P] Create environment variable template in backend/config/env.example with all required keys
- [X] T007 [P] Setup Docker configuration in Dockerfile and docker-compose.yml for local development
- [X] T008 [P] Create .gitignore with Node.js and environment file exclusions
- [X] T009 [P] Add MIT license file in LICENSE
- [X] T010 [P] Create README.md with project overview and quickstart instructions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Initialize Gemini client wrapper in backend/src/llm/client.ts with API key configuration
- [ ] T012 Setup Datadog dd-trace initialization in backend/src/index.ts with environment-based configuration
- [ ] T013 Create TypeScript interfaces for telemetry events in backend/src/observability/types.ts matching data-model.md
- [ ] T014 Implement cost calculation utility in backend/src/observability/cost-calculator.ts with model pricing
- [ ] T015 Create Express application setup in backend/src/index.ts with middleware registration
- [ ] T016 [P] Setup environment configuration loading in backend/src/config.ts with validation
- [ ] T017 [P] Create error handling middleware in backend/src/api/middleware/error-handler.ts
- [ ] T018 [P] Create request logging middleware in backend/src/api/middleware/logger.ts
- [ ] T019 Create health check endpoint in backend/src/api/routes/health.ts
- [ ] T020 Setup Jest test framework configuration in backend/jest.config.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Real-Time LLM Performance Monitoring (Priority: P1) 🎯 MVP

**Goal**: Enable AI engineers to monitor LLM application performance in real-time with telemetry data appearing in Datadog within 5 seconds

**Independent Test**: Send chat requests via API and verify telemetry (tokens, latency, costs) appears in Datadog dashboard within 5 seconds with accurate metrics

### Implementation for User Story 1

#### Core Telemetry Capture (FR-001, FR-002, FR-003, FR-004, FR-005)

- [ ] T021 [P] [US1] Create telemetry capture middleware in backend/src/llm/telemetry-capture.ts to wrap Gemini API calls
- [ ] T022 [P] [US1] Implement telemetry buffer with 10MB cap and circular queue in backend/src/observability/telemetry-buffer.ts
- [ ] T023 [P] [US1] Create conversation tracker for multi-turn sessions in backend/src/observability/conversation-tracker.ts
- [ ] T024 [US1] Implement Datadog metrics emission in backend/src/observability/metrics.ts using dd-trace dogstatsd
- [ ] T025 [US1] Create custom span wrapper for LLM operations in backend/src/llm/telemetry-capture.ts with token tagging
- [ ] T026 [US1] Implement exponential backoff retry logic in backend/src/observability/telemetry-buffer.ts for Datadog failures
- [ ] T027 [US1] Add telemetry flush on buffer size threshold or 5-second timeout in backend/src/observability/telemetry-buffer.ts

#### Chat API Endpoint (Primary feature showcase)

- [ ] T028 [US1] Create chat request/response schemas using Zod in backend/src/api/schemas/chat.ts
- [ ] T029 [US1] Implement POST /api/v1/chat endpoint in backend/src/api/routes/chat.ts with non-streaming support
- [ ] T030 [US1] Integrate Gemini client with telemetry capture in chat endpoint
- [ ] T031 [US1] Add conversation ID generation and tracking in backend/src/api/routes/chat.ts
- [ ] T032 [US1] Implement streaming response support for POST /api/v1/chat in backend/src/api/routes/chat.ts

#### Feature-Specific Telemetry (FR-003)

- [ ] T033 [P] [US1] Add Google Search grounding detection in backend/src/llm/telemetry-capture.ts using groundingMetadata
- [ ] T034 [P] [US1] Add URL context tool detection in backend/src/llm/telemetry-capture.ts
- [ ] T035 [P] [US1] Create feature type classifier in backend/src/llm/features/classifier.ts (chat/grounding/streaming/etc)

#### Dashboard Creation (FR-006, FR-007, FR-010)

- [ ] T036 [US1] Create dashboard configuration JSON in config/datadog/dashboard.json with overview section
- [ ] T037 [US1] Add performance widgets (latency P50/P95/P99, request volume) to config/datadog/dashboard.json
- [ ] T038 [US1] Add LLM metrics widgets (token consumption, cost breakdown) to config/datadog/dashboard.json
- [ ] T039 [US1] Create dashboard deployment script in scripts/setup-datadog.ts using @datadog/datadog-api-client
- [ ] T040 [US1] Add time range selector and grouping tags to dashboard configuration

#### Health & Metrics Endpoints

- [ ] T041 [P] [US1] Implement GET /api/v1/metrics endpoint in backend/src/api/routes/telemetry.ts with summary aggregation
- [ ] T042 [P] [US1] Add telemetry buffer status to health check endpoint in backend/src/api/routes/health.ts

**Checkpoint**: User Story 1 complete - Real-time monitoring functional with dashboard displaying LLM telemetry

---

## Phase 4: User Story 2 - Intelligent Alert Management (Priority: P1)

**Goal**: Enable AI engineers to receive actionable alerts when critical issues occur with full diagnostic context

**Independent Test**: Simulate failure scenarios (slow responses, high error rates) and verify alerts fire within threshold periods with complete context (prompt, metrics, remediation)

### Implementation for User Story 2

#### Detection Rule Configuration (FR-011, FR-012, FR-013, FR-014, FR-015)

- [ ] T043 [US2] Create detection rule definitions in config/datadog/monitors.json for performance degradation (latency > 5s)
- [ ] T044 [US2] Add error rate monitor in config/datadog/monitors.json (error rate > 5% in 5min window)
- [ ] T045 [US2] Add cost anomaly monitor in config/datadog/monitors.json (hourly cost > 1.5x baseline)
- [ ] T046 [US2] Create token exhaustion monitor in config/datadog/monitors.json (tokens/min > 100k threshold)
- [ ] T047 [US2] Deploy monitors using Datadog API in scripts/setup-datadog.ts

#### Security Detection Rules (FR-012)

- [ ] T048 [P] [US2] Implement prompt injection pattern detection in backend/src/observability/security-detector.ts with regex patterns
- [ ] T049 [P] [US2] Implement PII detection patterns in backend/src/observability/security-detector.ts (SSN, email, phone, credit card)
- [ ] T050 [US2] Create security alert monitor in config/datadog/monitors.json for injection attempts
- [ ] T051 [US2] Add rate limit violation monitor in config/datadog/monitors.json (requests > 100/min per user)

#### Alert Context Enrichment (FR-016, FR-017, FR-018, FR-019)

- [ ] T052 [US2] Create incident context builder in backend/src/observability/alert-context.ts capturing prompt, response, system state
- [ ] T053 [US2] Add suggested remediation generator in backend/src/observability/alert-context.ts based on alert type
- [ ] T054 [US2] Configure monitor messages with @notification templates in config/datadog/monitors.json
- [ ] T055 [US2] Add monitor tags for severity routing (critical → incident, high → case, medium → alert)

#### Alert Testing Infrastructure

- [ ] T056 [P] [US2] Create alert simulation script in scripts/generate-test-traffic.ts for triggering latency alerts
- [ ] T057 [P] [US2] Add error generation scenarios in scripts/generate-test-traffic.ts for error rate alerts
- [ ] T058 [P] [US2] Add cost spike simulation in scripts/generate-test-traffic.ts using high token requests

**Checkpoint**: User Story 2 complete - Alert system functional with detection rules firing and providing diagnostic context

---

## Phase 5: User Story 3 - Historical Analysis and Cost Optimization (Priority: P2)

**Goal**: Enable engineering managers to analyze historical usage patterns and costs for optimization decisions

**Independent Test**: Generate 7 days of historical data with varied patterns, then query aggregations (token trends by feature, cost per conversation, model comparison) and verify accuracy

### Implementation for User Story 3

#### Cost Tracking & Analysis (FR-004, FR-024)

- [ ] T059 [US3] Extend conversation tracker in backend/src/observability/conversation-tracker.ts with cost accumulation per session
- [ ] T060 [US3] Create cost analysis aggregation view in backend/src/observability/cost-analyzer.ts with feature/model breakdown
- [ ] T061 [US3] Implement GET /api/v1/conversations/:id endpoint in backend/src/api/routes/conversations.ts with full history
- [ ] T062 [US3] Add cost per conversation calculation to conversation endpoint response

#### Dashboard Analytics Widgets (FR-007, FR-009)

- [ ] T063 [US3] Add cost analysis section to dashboard in config/datadog/dashboard.json with hourly cost trend widget
- [ ] T064 [US3] Add cost by feature pie chart widget to config/datadog/dashboard.json
- [ ] T065 [US3] Add top expensive conversations widget (top list) to config/datadog/dashboard.json
- [ ] T066 [US3] Add cost per conversation efficiency metric widget to config/datadog/dashboard.json

#### Tool Effectiveness Tracking (FR-003)

- [ ] T067 [P] [US3] Add grounding effectiveness metrics in backend/src/observability/metrics.ts (invocation count, success rate)
- [ ] T068 [P] [US3] Add URL context tool metrics in backend/src/observability/metrics.ts
- [ ] T069 [US3] Create tool analytics widget in config/datadog/dashboard.json showing tool usage distribution

#### Historical Data Generation

- [ ] T070 [US3] Create historical data generator in scripts/generate-test-traffic.ts with 7-day varied usage patterns
- [ ] T071 [US3] Add feature mix scenarios in test traffic generator (simple chat, grounding, structured, streaming)

**Checkpoint**: User Story 3 complete - Historical analysis functional with cost optimization insights available

---

## Phase 6: User Story 4 - Security and Compliance Monitoring (Priority: P2)

**Goal**: Enable security engineers to detect and respond to security threats and compliance violations

**Independent Test**: Simulate security scenarios (prompt injection, PII exposure, rate abuse) and verify security alerts trigger with redacted context and threat details

### Implementation for User Story 4

#### Security Detection Integration (FR-012, FR-026, FR-027)

- [ ] T072 [US4] Integrate security detector into telemetry capture in backend/src/llm/telemetry-capture.ts with pre-log scanning
- [ ] T073 [US4] Implement PII redaction before Datadog transmission in backend/src/observability/security-detector.ts
- [ ] T074 [US4] Create security audit log writer in backend/src/observability/audit-logger.ts with immutable timestamps
- [ ] T075 [US4] Add security signals to telemetry events in backend/src/observability/types.ts

#### Compliance Monitoring

- [ ] T076 [P] [US4] Create compliance alert for PII in responses in config/datadog/monitors.json
- [ ] T077 [P] [US4] Add anomaly detection monitor in config/datadog/monitors.json (user request rate deviation)
- [ ] T078 [US4] Create security dashboard section in config/datadog/dashboard.json with event stream widget

#### Audit Trail (FR-028)

- [ ] T079 [US4] Implement audit trail query endpoint in backend/src/api/routes/audit.ts with time range filtering
- [ ] T080 [US4] Add role-based access control middleware in backend/src/api/middleware/rbac.ts for audit access

**Checkpoint**: User Story 4 complete - Security monitoring functional with threat detection and compliance auditing

---

## Phase 7: User Story 5 - Quality Assurance and Model Behavior Tracking (Priority: P3)

**Goal**: Enable QA engineers to track model behavior patterns and response quality for hallucination/refusal detection

**Independent Test**: Analyze corpus with known quality issues and verify system identifies low-confidence responses, validation failures, and quality degradation patterns

### Implementation for User Story 5

#### Structured Output Validation (FR-013)

- [ ] T081 [P] [US5] Create structured output schemas using Zod in backend/src/api/schemas/structured-outputs.ts (customer_issue, order_info, feedback)
- [ ] T082 [P] [US5] Implement POST /api/v1/chat/structured endpoint in backend/src/api/routes/chat.ts with schema parameter
- [ ] T083 [US5] Create validation wrapper in backend/src/llm/features/structured-validator.ts capturing validation errors
- [ ] T084 [US5] Add schema validation metrics emission in backend/src/observability/metrics.ts

#### Quality Monitoring

- [ ] T085 [US5] Create quality degradation monitor in config/datadog/monitors.json (validation failures > 10 in 15min)
- [ ] T086 [US5] Add quality metrics widgets to dashboard in config/datadog/dashboard.json (validation failure counter, error distribution)
- [ ] T087 [US5] Implement quality baseline tracking in backend/src/observability/quality-tracker.ts with 7-day moving average

#### Grounding Quality Analysis

- [ ] T088 [P] [US5] Add grounding vs non-grounding comparison metrics in backend/src/observability/metrics.ts
- [ ] T089 [P] [US5] Create grounding effectiveness widget in config/datadog/dashboard.json showing quality improvement

**Checkpoint**: User Story 5 complete - Quality monitoring functional with validation tracking and degradation detection

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and demo readiness

#### Demo & Documentation

- [ ] T090 [P] Create comprehensive README.md in root with features overview, tech stack, setup instructions
- [ ] T091 [P] Create ARCHITECTURE.md in docs/ with system design diagram and component descriptions
- [ ] T092 [P] Create DEMO_SCRIPT.md in docs/ with 3-minute demo walkthrough and talking points
- [ ] T093 [P] Update quickstart.md with actual setup steps, troubleshooting, and demo instructions

#### Load Testing & Simulation

- [ ] T094 [US1] Implement POST /api/v1/admin/simulate-load endpoint in backend/src/api/routes/admin.ts for demo traffic
- [ ] T095 [US1] Add diverse scenario mix to test traffic generator: simple, grounding, structured, streaming, errors
- [ ] T096 [US1] Create npm scripts for common operations: test:gemini, test:datadog, simulate-load, trigger-alert

#### Dashboard Finalization

- [ ] T097 Update dashboard with final widget positioning and color palette in config/datadog/dashboard.json
- [ ] T098 Add dashboard sharing configuration for public demo link in config/datadog/dashboard.json

#### Deployment Preparation

- [ ] T099 [P] Create deployment guide in docs/SETUP.md with Google Cloud Run instructions
- [ ] T100 [P] Optimize Docker image in Dockerfile (multi-stage build, minimal base image)
- [ ] T101 [P] Add production environment configuration validation in backend/src/config.ts

#### Code Quality

- [ ] T102 [P] Run full linting and fix all ESLint warnings across backend/src/
- [ ] T103 [P] Add JSDoc comments to all public APIs in backend/src/
- [ ] T104 Verify all telemetry events match data-model.md schema
- [ ] T105 Test quickstart.md setup process end-to-end on clean environment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T010) - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion (T011-T020)
  - User Story 1 (P1): Can start after T020 - Core monitoring foundation
  - User Story 2 (P1): Can start after T020 - Adds alerting on top of telemetry
  - User Story 3 (P2): Can start after T020 - Extends US1 with cost analysis
  - User Story 4 (P2): Can start after T020 - Adds security layer to telemetry
  - User Story 5 (P3): Can start after T020 - Adds quality tracking
- **Polish (Phase 8)**: Depends on US1 (MVP) completion minimum, ideally all desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: Independent - Only depends on Foundational phase
- **User Story 2 (P1)**: Independent - Can be built on its own telemetry infrastructure
- **User Story 3 (P2)**: Extends US1 conversation tracking but independently testable
- **User Story 4 (P2)**: Independent - Adds security layer without breaking US1/US2
- **User Story 5 (P3)**: Independent - Adds quality validation without affecting other stories

### Within Each User Story

**User Story 1 flow**:
1. T021-T027: Telemetry infrastructure (parallel where marked [P])
2. T028-T032: Chat API implementation (sequential, builds on telemetry)
3. T033-T035: Feature detection (parallel)
4. T036-T040: Dashboard creation (sequential configuration)
5. T041-T042: Metrics endpoints (parallel)

**User Story 2 flow**:
1. T043-T047: Detection rule configuration (can be created in parallel, deployed together)
2. T048-T051: Security rules (parallel)
3. T052-T055: Context enrichment (sequential, builds on rules)
4. T056-T058: Test infrastructure (parallel)

### Parallel Opportunities

**Within Setup (Phase 1)**:
- T003-T010 can all run in parallel after T001-T002

**Within Foundational (Phase 2)**:
- T016-T018 can run in parallel (different subsystems)

**Within User Story 1**:
- T021, T022, T023 (telemetry components) can run in parallel
- T033, T034, T035 (feature detection) can run in parallel
- T041, T042 (endpoints) can run in parallel

**Across User Stories**:
- After Foundational phase (T020), US1-US5 can all proceed in parallel with different developers

---

## Parallel Example: User Story 1 Core Telemetry

```bash
# Launch telemetry infrastructure tasks together:
Task T021: "Create telemetry capture middleware in backend/src/llm/telemetry-capture.ts"
Task T022: "Implement telemetry buffer in backend/src/observability/telemetry-buffer.ts"
Task T023: "Create conversation tracker in backend/src/observability/conversation-tracker.ts"

# Then launch feature detection tasks together:
Task T033: "Add Google Search grounding detection in backend/src/llm/telemetry-capture.ts"
Task T034: "Add URL context tool detection in backend/src/llm/telemetry-capture.ts"
Task T035: "Create feature type classifier in backend/src/llm/features/classifier.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended for Demo

1. **Complete Phase 1**: Setup (T001-T010) → ~2 hours
2. **Complete Phase 2**: Foundational (T011-T020) → ~4 hours
3. **Complete Phase 3**: User Story 1 (T021-T042) → ~16 hours
4. **STOP and VALIDATE**: 
   - Send chat requests
   - Verify telemetry in Datadog
   - View dashboard with live data
5. **Demo Ready**: Basic monitoring with real-time telemetry

**Total MVP time**: ~22 hours (2-3 days of focused work)

### Full Implementation (All User Stories)

1. Complete Setup + Foundational → ~6 hours
2. Add User Story 1 (T021-T042) → ~16 hours → Test independently → **MVP deployed**
3. Add User Story 2 (T043-T058) → ~10 hours → Test alerts → **Alert system ready**
4. Add User Story 3 (T059-T071) → ~8 hours → Verify analytics → **Cost optimization ready**
5. Add User Story 4 (T072-T080) → ~6 hours → Test security → **Security monitoring ready**
6. Add User Story 5 (T081-T089) → ~6 hours → Verify quality tracking → **Full feature set**
7. Polish (T090-T105) → ~8 hours → **Demo ready**

**Total implementation time**: ~60 hours (7-8 days of focused work)

### Parallel Team Strategy (If multiple developers available)

**Day 1-2**: Team completes Setup + Foundational together (T001-T020)

**Day 3-5**: After Foundational complete, parallelize:
- **Developer A**: User Story 1 (T021-T042) - Core monitoring
- **Developer B**: User Story 2 (T043-T058) - Alerting
- **Developer C**: User Story 3 + 4 (T059-T080) - Analytics + Security

**Day 6-7**: 
- **All**: User Story 5 together (T081-T089) - Quality tracking
- **All**: Polish together (T090-T105) - Demo prep

**Day 8**: Final testing, video recording, submission prep

---

## Task Count Summary

- **Total Tasks**: 105 tasks
- **Phase 1 (Setup)**: 10 tasks (9 parallelizable)
- **Phase 2 (Foundational)**: 10 tasks (5 parallelizable) - BLOCKING
- **Phase 3 (US1 - P1)**: 22 tasks (9 parallelizable) - MVP
- **Phase 4 (US2 - P1)**: 16 tasks (6 parallelizable)
- **Phase 5 (US3 - P2)**: 13 tasks (4 parallelizable)
- **Phase 6 (US4 - P2)**: 9 tasks (3 parallelizable)
- **Phase 7 (US5 - P3)**: 9 tasks (4 parallelizable)
- **Phase 8 (Polish)**: 16 tasks (8 parallelizable)

**Parallelization Potential**: 48 tasks marked [P] can run in parallel within their phase

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] labels**: Map tasks to user stories (US1-US5) for traceability
- **Tests**: Not included since not explicitly requested in specification
- **MVP scope**: User Story 1 only (T001-T042) delivers functional demo
- **Independent testing**: Each user story can be validated independently
- **Commit strategy**: Commit after each task or logical group of parallel tasks
- **Validation checkpoints**: Stop after each user story phase to test independently
- **File paths**: All paths are exact as specified for immediate implementation

---

## Success Criteria Alignment

This task breakdown ensures all success criteria from spec.md are met:

- **SC-001** (30s issue identification): US1 dashboard with real-time updates → T036-T040
- **SC-002** (99.9% telemetry capture): US1 buffer with retry → T022, T026
- **SC-003** (10s alert latency): US2 monitors with real-time evaluation → T043-T047
- **SC-004** (90% alerts with context): US2 context enrichment → T052-T053
- **SC-005** (5s historical queries): US3 Datadog query optimization → T060-T062
- **SC-006** (20% cost reduction): US3 cost analysis enables optimization → T059-T066
- **SC-007** (100% security detection): US4 pattern detection → T048-T051, T072-T073
- **SC-008** (2s dashboard load): US1 widget design for performance → T036-T040
- **SC-009** (1h quality degradation detection): US5 quality monitoring → T085-T087
- **SC-010** (50% faster incident resolution): US2 alert context → T052-T055
