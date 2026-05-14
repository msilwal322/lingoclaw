# Realtime Voice Hardening Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make Lingoclaw realtime voice more reliable by fixing response assembly, surfacing audio playback failures, and hardening connection/bootstrap behavior, then perform a deeper WebRTC/audio-path review.

**Architecture:** Keep the existing backend-issued ephemeral session + frontend WebRTC flow, but make the frontend event model deterministic, expose explicit audio/playback/connectivity states, and fail earlier and more clearly when mic/bootstrap/playback issues occur. Prefer minimal, targeted changes in `frontend/app/voice/page.tsx` and `frontend/lib/realtime-client.ts` over broader architectural rewrites.

**Tech Stack:** Next.js 16, React 19, TypeScript, NestJS backend, OpenAI/Azure realtime-style WebRTC bootstrap.

---

### Task 1: Stabilize assistant response assembly

**Objective:** Ensure streamed assistant text is assembled once and finalized once, with no duplicate or overwritten messages.

**Files:**
- Modify: `frontend/app/voice/page.tsx`

**Step 1: Add explicit per-response assembly state**
- Add refs/state to track:
  - current response text buffer
  - active response item/response id if available
  - finalized response ids to prevent duplicate insertion

**Step 2: Update delta handlers**
- Keep `response.text.delta` as the append path.
- Avoid treating `response.text.done` as a second full message source.

**Step 3: Finalize only once**
- In `response.done`, finalize using the accumulated streamed text first.
- Fall back to parsing the response payload only when the streamed text is empty.
- Insert one assistant message and clear the active buffer.

**Step 4: Verify by inspection**
- Search for all `response.*` handlers and confirm only one path appends the final assistant message.

**Step 5: Commit**
```bash
git add frontend/app/voice/page.tsx
git commit -m "fix: stabilize realtime response assembly"
```

### Task 2: Surface playback/audio-state failures

**Objective:** Stop swallowing remote-audio playback failures and expose user-visible audio state.

**Files:**
- Modify: `frontend/lib/realtime-client.ts`
- Modify: `frontend/app/voice/page.tsx`

**Step 1: Extend client event types**
- Add events for audio playback started / blocked / error as needed.

**Step 2: Replace silent playback catch**
- In `ontrack`, emit a structured error/event when `remoteAudio.play()` fails.

**Step 3: Make start streaming safer**
- Avoid redundant restarts.
- Attempt playback start there too if needed after user gesture.

**Step 4: Reflect audio state in UI**
- Show a helpful status/error message in realtime mode when connected but playback is blocked or failed.

**Step 5: Commit**
```bash
git add frontend/lib/realtime-client.ts frontend/app/voice/page.tsx
git commit -m "fix: surface realtime audio playback failures"
```

### Task 3: Harden realtime connection/bootstrap flow

**Objective:** Fail earlier on missing mic access, avoid indefinite connecting states, and improve bootstrap reliability.

**Files:**
- Modify: `frontend/app/voice/page.tsx`
- Optional small type-safe updates: `frontend/lib/realtime-client.ts`

**Step 1: Add preflight mic check**
- Check `navigator.mediaDevices` availability and microphone permission/access before backend session bootstrap.

**Step 2: Add connect timeout guard**
- Wrap realtime connect flow with a timeout that cleanly disconnects and reports a specific error.

**Step 3: Improve connect/disconnect cleanup**
- Ensure stale client refs, temporary timers, and streaming flags are reset consistently on failure.

**Step 4: Improve actionable errors**
- Distinguish mic-permission, bootstrap/API, and playback/connectivity failures in displayed messaging.

**Step 5: Commit**
```bash
git add frontend/app/voice/page.tsx frontend/lib/realtime-client.ts
git commit -m "fix: harden realtime voice bootstrap flow"
```

### Task 4: Validate and perform deeper review

**Objective:** Verify the changes compile cleanly and audit the remaining WebRTC/audio-path risks.

**Files:**
- Review: `frontend/app/voice/page.tsx`
- Review: `frontend/lib/realtime-client.ts`
- Review: `backend/src/api.service.ts`
- Review: `backend/src/llm.service.ts`

**Step 1: Run frontend lint**
```bash
cd /home/azureuser/lingoclaw/frontend && npm run lint
```
Expected: pass with no new errors.

**Step 2: Run frontend build**
```bash
cd /home/azureuser/lingoclaw/frontend && npm run build
```
Expected: successful production build.

**Step 3: Run backend build**
```bash
cd /home/azureuser/lingoclaw/backend && npm run build
```
Expected: successful Nest build.

**Step 4: Perform deeper review**
- Re-read the WebRTC/audio path and note remaining risks not addressed by the targeted fixes, especially:
  - capability detection heuristics
  - hardcoded VAD settings
  - split transcript/realtime conversation state
  - provider/session lifecycle limitations

**Step 5: Summarize residual risks**
- Report what is fixed now vs what still needs follow-up.

---

## Verification Checklist
- [ ] Assistant response text is not duplicated between delta/done handlers
- [ ] Playback failures are visible to the user
- [ ] Mic denial is caught before backend session creation
- [ ] Realtime connect cannot hang forever
- [ ] Frontend lint/build pass
- [ ] Backend build passes
- [ ] Residual WebRTC/audio risks documented
