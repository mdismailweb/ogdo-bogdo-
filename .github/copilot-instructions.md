# Staff Portal AI Coding Instructions

## Architecture Overview

This is a React staff time-tracking system with Google Apps Script backend and timezone-aware shift management. The core architecture involves:

- **React frontend** with Material-UI + Bootstrap for responsive UI
- **Google Apps Script** as backend/API via POST requests to webhook URL
- **Google Sheets** as database (RealTimeShifts, Staff, SimpleFilterTable sheets)
- **No traditional server** - fully serverless Google ecosystem

## Critical Service Integration Pattern

**`src/services/appScriptAPI.js`** is the single source of truth for backend communication. All API calls follow this pattern:

```javascript
export const functionName = async (payload) => {
  return await makeAPICall({
    action: 'backendAction',
    ...payload,
    // Timezone info automatically added by makeAPICall wrapper
  });
};
```

The `makeAPICall` wrapper automatically injects timezone information (`clientTimezone`, `clientTimezoneOffset`) into every request and handles comprehensive error logging.

## Timezone-Critical Status Logic

The system has dual-layer status determination to handle timezone edge cases:

1. **Backend status** from Google Apps Script
2. **Frontend smart status** (`applyFrontendSmartStatus`) that corrects impossible states

Key patterns in `getCurrentShift()`:
- Detects "COMPLETED" status before shift starts (impossible scenario)
- Auto-fixes backend status when detected via `fixShiftStatus()`
- Returns corrected status with `_statusCorrected` flag

When editing shift logic, always account for timezone differences and the `isCurrentTimeBeforeShiftStart()` helper.

## Component Communication Pattern

Components follow strict prop-drilling with AuthContext for user state:

```javascript
// Standard component structure
const Component = () => {
  const { user, userRole } = useAuth(); // Never bypass this pattern
  
  // API integration always through appScriptAPI services
  const handleAction = async () => {
    const result = await apiService(payload);
    if (result.success) { /* handle */ }
  };
};
```

**StaffDashboard** acts as the main router between `ShiftEntry` and `ShiftHistory` components via `activeTab` state.

## Apps Script Backend Updates

The `apps-script-updates/` folder contains **production deployment instructions** with safety-first approach:

- **Always follow `UPDATE-CHECKLIST.md`** in exact order (never skip steps)
- **Phase-based updates**: Safety testing → New functions → Cleanup → Core updates
- **Backup strategy**: Every function gets renamed to `functionName_BACKUP` before replacement
- **Testing at every step**: Use `testCurrentSystem()`, `testUpdatedCoreFunctions()` etc.

When modifying backend integration, reference the update checklist to understand the expected Apps Script function signatures.

## Development Workflow

**Starting development server:**
```bash
npm start  # Opens localhost:3000
```

**Key debugging tools:**
- Browser console shows detailed API call logs from `makeAPICall`
- Google Apps Script execution logs for backend debugging
- `testConnection()` and `debugAllEndpoints()` for API validation

**Component hot-reload gotchas:**
- AuthContext loads user from localStorage on mount
- ShiftEntry polls `getCurrentShift` every 30 seconds when active
- TimeSegmentEntry has complex validation that disables past time editing (currently disabled via feature flags)

## Project-Specific Conventions

**Status values**: `DRAFT` | `ACTIVE` | `ON BREAK` | `COMPLETED` | `OFFLINE`

**Time format**: Always HH:MM (24-hour) format in backend, user timezone-aware display in frontend

**API response pattern**:
```javascript
{
  success: boolean,
  message: string,
  data: object,
  _statusCorrected?: boolean,  // When frontend fixed backend status
  _autoFixed?: boolean        // When backend auto-corrected itself
}
```

**Error handling**: Use `handleAPIError(error)` for user-friendly error messages that distinguish network vs. parsing vs. CORS issues.

**Sheet naming**: RealTimeShifts (data), Staff (users), SimpleFilterTable (reporting) - never modify these names.

## Dependencies & Build

- **React 19.1.0** with Material-UI 7.2.0 and Bootstrap 5.3.8
- **No router** for main app (tab-based navigation in StaffDashboard)
- **No database ORM** - direct Google Sheets integration via Apps Script
- Production build: `npm run build` creates static files for deployment

## Critical Files for Understanding

1. `src/services/appScriptAPI.js` - All backend integration logic
2. `src/contexts/AuthContext.js` - User session management
3. `apps-script-updates/UPDATE-CHECKLIST.md` - Backend deployment process
4. `src/components/ShiftEntry/ShiftEntry.js` - Core time tracking logic
5. `README.md` - Setup instructions and project overview

Focus on timezone handling, status determination logic, and the Apps Script integration pattern when making changes.