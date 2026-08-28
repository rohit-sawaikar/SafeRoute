# Safe Haven — AI Safety Tools Architecture & Production Audit

This document provides a comprehensive audit of all 11 AI Safety Tools and diagnostic modules in the Safe Haven codebase.

## 📊 Summary Matrix of the 11 Safety Tools

| # | Tool | Purpose | UI Trigger | Backend Function | Real / Mock / AI | Production Dependency | Safe to Remove? |
|---|---|---|---|---|---|---|:---:|
| **1** | **Safety Pulse** | Aggregates multi-signal urban telemetry into overall safety state (`NORMAL`, `CAUTION`, `HIGH_ALERT`) | Safety Tools tab & `SafetyPulseBanner.tsx` | `geminiSafetyEngine.ts` -> `computeSafetyPulse()` | **AI (Gemini 3.7) + Deterministic Fallback** | `SafetyPulseBanner.tsx` displays live area safety pulse | ❌ **NO** |
| **2** | **Incident Classification** | Categorizes user reports, evaluates severity, and checks photo evidence consistency | Report submission pipeline | `geminiSafetyEngine.ts` -> `classifyIncident()` | **AI (Gemini 3.7) + Fallback** | Used in report validation pipeline | ❌ **NO** |
| **3** | **Duplicate Detection** | Spatial (<20m) and semantic NLP comparison to detect duplicate reports and suggest merges | Report submission pipeline | `geminiSafetyEngine.ts` -> `detectDuplicates()` | **AI (Gemini 3.7) + Fallback** | Prevents report spam and merges duplicates | ❌ **NO** |
| **4** | **Severity Decay** | Mathematical exponential decay of report confidence as time passes without corroboration | Background verification loop | `incidentVerificationService.ts` -> `calculateConfidenceScore()` | **Real Mathematical Algorithm** | Core confidence decay logic for active incident filtering | ❌ **NO** |
| **5** | **Safer Route Scoring** | Multi-factor route safety evaluation (0–100 score and 1–5 star rating) based on lighting, foot traffic, & hazards | Route selection & `RouteScoringView.tsx` | `geminiSafetyEngine.ts` -> `scoreSaferRoutes()` | **Real Routing Scoring Engine** | `RouteScoringView.tsx` and Navigation HUD depend on this | 🚨 **NO** (Breaks Navigation) |
| **6** | **Followed Mode** | Immediate sanctuary routing, tactical avoidance steps, emergency dispatch payload, discreet guidance | "Being Followed / Silent SOS" button in HUD | `geminiSafetyEngine.ts` -> `activateFollowedMode()` | **Real Interactive Component** | `FollowedModeHud.tsx` depends on this trigger | 🚨 **NO** (Breaks SOS Feature) |
| **7** | **Safe Haven Ranking** | Ranks verified 24/7 partner sanctuaries (pharmacies, police stations, hospitals) by distance & accessibility | Safe Havens tab & Followed Mode | `geminiSafetyEngine.ts` -> `rankSafeHavens()` | **Real Proximity Scoring Engine** | `SafeHavensDirectory.tsx` depends on this ranking | 🚨 **NO** (Breaks Haven Directory) |
| **8** | **Cross-Signal Risk** | Detects compound friction synergies (e.g. darkness + rain + sidewalk blockage) that increase risk | Multi-signal risk evaluator | `geminiSafetyEngine.ts` -> `analyzeCrossSignalRisk()` | **AI (Gemini 3.7) + Fallback** | Evaluates risk synergies in navigation area | ❌ **NO** |
| **9** | **Area Summary** | Generates factual narrative separating observed verified facts from predictive trend indicators | Area query & Safety Tools tab | `geminiSafetyEngine.ts` -> `generateAreaSummary()` | **AI (Gemini 3.7) + Fallback** | Provides non-panic factual area summaries | ❌ **NO** |
| **10** | **Report Verification** | Calculates trust score (0-100) based on corroborations, GPS proximity, and photo proof while preserving anonymity | Incident verification pipeline | `incidentVerificationService.ts` -> `verifyCommunityReport()` | **Real Verification Engine** | Determines whether report is published or unverified | ❌ **NO** |
| **11** | **Safety Notification** | Generates calm, non-panic in-route warning toasts when an active hazard is detected near user route | In-route proximity detector | `geminiSafetyEngine.ts` -> `generateSafetyNotification()` | **Real Notification Engine** | In-route caution banners depend on this | 🚨 **NO** (Breaks Route Alerts) |

---

## 🛠️ Detailed Component Analysis

### 1. Safety Pulse (`/api/safety/pulse`)
* **Purpose:** Evaluates ambient illumination, pedestrian volume, and emergency service proximity to calculate an overall safety pulse index.
* **Consumes:** Location name, time of day, lighting index, nearby emergency facilities.
* **Produces:** Structured JSON containing `safety_status`, `confidence`, `recent_signals`, and `explanation`.
* **Production Status:** Used directly by `SafetyPulseBanner.tsx`.

### 2. Incident Classification (`/api/safety/classify-incident`)
* **Purpose:** Analyzes incident text descriptions and photo descriptions to verify legitimacy and classify category/severity.
* **Consumes:** Description, photo description, location context.
* **Produces:** `category`, `severity`, `confidence`, `evidence`, `is_urgent`.
* **Production Status:** Runs as part of report verification.

### 3. Duplicate Detection (`/api/safety/detect-duplicates`)
* **Purpose:** Prevents multiple reports for the same incident within 300 meters and 30 minutes.
* **Consumes:** New report object and active reports array.
* **Produces:** `duplicate_probability`, `matching_report_ids`, `merge_recommendation`.
* **Production Status:** Backend verification pipeline dependency.

### 4. Severity Decay (`/api/safety/severity-decay`)
* **Purpose:** Automatically lowers incident confidence over time if no new corroborations are received.
* **Consumes:** Report timestamp, initial severity, corroboration count.
* **Produces:** `current_confidence`, `decay_factor`, `is_active`.
* **Production Status:** Active mathematical function in `incidentVerificationService.ts`.

### 5. Safer Route Scoring (`/api/safety/route-scoring`)
* **Purpose:** Evaluates candidate walking or driving paths and scores them out of 100 based on safety factors.
* **Consumes:** Array of route options, time of day, travel mode.
* **Produces:** Safest route ID, score breakdown (lighting, pedestrian density, isolation avoidance).
* **Production Status:** Core production engine for navigation.

### 6. Followed Mode (`/api/safety/followed-mode`)
* **Purpose:** Activated when a user feels followed. Provides direct navigation to the nearest open, verified safe haven and prepares an emergency dispatch payload.
* **Consumes:** GPS coordinates, time of day, battery level, nearby havens.
* **Produces:** `immediate_steps`, `top_safe_haven`, `emergency_dispatch` payload.
* **Production Status:** Core emergency feature of Safe Haven.

### 7. Safe Haven Ranking (`/api/safety/rank-safe-havens`)
* **Purpose:** Orders 24/7 verified pharmacies, police stations, transit hubs, and hospitals by distance, walking time, lighting, and security staff.
* **Consumes:** Candidate havens array, time of day.
* **Produces:** Ranked list of havens with scores and navigation tips.
* **Production Status:** Powers `SafeHavensDirectory.tsx`.

### 8. Cross-Signal Risk (`/api/safety/cross-signal-risk`)
* **Purpose:** Detects compounding hazard conditions (e.g. unlit road + heavy rain + construction blockage).
* **Consumes:** Active signal list, area type, time of day.
* **Produces:** `synergy_detected`, `risk_level`, `compound_factors`.
* **Production Status:** Risk engine module.

### 9. Area Summary (`/api/safety/area-summary`)
* **Purpose:** Creates factual, non-panic area safety digests.
* **Consumes:** Area name, observed incidents, lighting sensor telemetry.
* **Produces:** `observed_facts`, `predictive_indicators`, `factual_summary`.
* **Production Status:** Diagnostic & summary engine.

### 10. Community Report Verification (`/api/safety/verify-community-report`)
* **Purpose:** Calculates trust score (0-100) using zero-knowledge reporter tokens.
* **Consumes:** Reporter karma, corroboration count, photo proof, GPS verification.
* **Produces:** `verification_score`, `verification_level`, `trust_metrics`.
* **Production Status:** Production trust algorithm.

### 11. Safety Notification (`/api/safety/safety-notification`)
* **Purpose:** Generates calm, clear notification banners when user approaches a reported hazard.
* **Consumes:** Incident category, distance to route, user route name.
* **Produces:** `alert_title`, `notification_text`, `urgency`, `action_prompt`.
* **Production Status:** Active navigation alert toast provider.

---

## 💡 Architecture & UI Separation Guidance

The **Safety Tools Tab** (`AiFunctionWorkbench.tsx`) serves as an **AI Engine Workbench & Architecture Inspector**. It allows developers and auditors to test all 11 structured JSON safety reasoning functions powering the app. 

All 11 functions are active, functional, and necessary for the production application's navigation, safety pulse, safe havens, and emergency SOS systems. **None of these functions should be removed.**
