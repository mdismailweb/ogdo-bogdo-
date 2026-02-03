// ===============================================================
// DAY COLUMN IMPLEMENTATION FOR APPSCRIPT.JS
// Copy these functions to your appscript.js file
// ===============================================================

// 1. ADD THIS UTILITY FUNCTION
function getDayName(dateString) {
  try {
    // Handle both YYYY-MM-DD and DD/MM/YYYY formats
    let date;
    if (dateString.includes('/')) {
      // DD/MM/YYYY format
      const [day, month, year] = dateString.split('/');
      date = new Date(year, month - 1, day);
    } else {
      // YYYY-MM-DD format
      date = new Date(dateString + 'T00:00:00');
    }
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } catch (error) {
    Logger.log(`❌ Error getting day name for ${dateString}: ${error}`);
    return '';
  }
}

// 2. UPDATE createRealTimeHeaders FUNCTION
function createRealTimeHeaders() {
  return [
    'Timestamp',           // A (1)
    'Employee Name',       // B (2)  
    'Employee ID',         // C (3)
    'Shift Date',         // D (4)
    'Shift Type',         // E (5)
    'First Start Time',   // F (6)
    'Last End Time',      // G (7)
    'Total Duration',     // H (8)
    'Number of Segments', // I (9)
    'Segments Data',      // J (10)
    'Schedule Status',    // K (11)
    'Created At',         // L (12)
    'Last Updated',       // M (13)
    'Time Zone',          // N (14)
    'Shift ID',           // O (15)
    'Day'                 // P (16) - NEW COLUMN
  ];
}

// 3. UPDATE createCompleteShift FUNCTION - ADD DAY COLUMN LOGIC
// Find your createCompleteShift function and modify the newShiftData array to include Day column:

/*
In your createCompleteShift function, change this line:
const newShiftData = [
  timestamp,              // A (1)
  params.employeeName,    // B (2)
  params.employeeId,      // C (3)
  params.shiftDate,       // D (4)
  params.shiftType,       // E (5)
  params.firstStartTime,  // F (6)
  params.lastEndTime,     // G (7)
  params.totalDuration,   // H (8)
  params.segments.length, // I (9)
  JSON.stringify(params.segments), // J (10)
  params.scheduleStatus,  // K (11)
  params.scheduleStatus,  // L (12) - Created At
  timestamp,              // M (13) - Last Updated
  clientTimezone,         // N (14)
  shiftId                 // O (15)
];

TO THIS (add Day column):
const dayName = getDayName(params.shiftDate);
const newShiftData = [
  timestamp,              // A (1)
  params.employeeName,    // B (2)
  params.employeeId,      // C (3)
  params.shiftDate,       // D (4)
  params.shiftType,       // E (5)
  params.firstStartTime,  // F (6)
  params.lastEndTime,     // G (7)
  params.totalDuration,   // H (8)
  params.segments.length, // I (9)
  JSON.stringify(params.segments), // J (10)
  params.scheduleStatus,  // K (11)
  params.scheduleStatus,  // L (12) - Created At
  timestamp,              // M (13) - Last Updated
  clientTimezone,         // N (14)
  shiftId,                // O (15)
  dayName                 // P (16) - NEW DAY COLUMN
];
*/

// 4. UPDATE startShift FUNCTION - ADD DAY COLUMN LOGIC
// Find your startShift function and modify the rowData array:

/*
In your startShift function, change this line:
const rowData = [
  timestamp,       // A (1) - Timestamp
  employeeName,    // B (2) - Employee Name
  employeeId,      // C (3) - Employee ID
  shiftDate,       // D (4) - Shift Date
  shiftType,       // E (5) - Shift Type
  startTime,       // F (6) - First Start Time
  '',              // G (7) - Last End Time (empty initially)
  0,               // H (8) - Total Duration (0 initially)
  1,               // I (9) - Number of Segments (1 initially)
  JSON.stringify(segments), // J (10) - Segments Data
  'ACTIVE',        // K (11) - Schedule Status
  'ACTIVE',        // L (12) - Created At
  timestamp,       // M (13) - Last Updated
  clientTimezone,  // N (14) - Time Zone
  shiftId          // O (15) - Shift ID
];

TO THIS (add Day column):
const dayName = getDayName(shiftDate);
const rowData = [
  timestamp,       // A (1) - Timestamp
  employeeName,    // B (2) - Employee Name
  employeeId,      // C (3) - Employee ID
  shiftDate,       // D (4) - Shift Date
  shiftType,       // E (5) - Shift Type
  startTime,       // F (6) - First Start Time
  '',              // G (7) - Last End Time (empty initially)
  0,               // H (8) - Total Duration (0 initially)
  1,               // I (9) - Number of Segments (1 initially)
  JSON.stringify(segments), // J (10) - Segments Data
  'ACTIVE',        // K (11) - Schedule Status
  'ACTIVE',        // L (12) - Created At
  timestamp,       // M (13) - Last Updated
  clientTimezone,  // N (14) - Time Zone
  shiftId,         // O (15) - Shift ID
  dayName          // P (16) - NEW DAY COLUMN
];
*/

// 5. UPDATE DATA READING FUNCTIONS - MODIFY getShiftsDirectlyFromSheet
// Find your getShiftsDirectlyFromSheet function and change:

/*
Change this line:
const allData = sheet.getRange(2, 1, lastRow - 1, 15).getValues(); // Read 15 columns

TO:
const allData = sheet.getRange(2, 1, lastRow - 1, 16).getValues(); // Read 16 columns now

And in the mapping function, add Day field:
return {
  shiftId: row[14] || '',           // O (15)
  employeeName: row[1] || '',       // B (2)
  employeeId: row[2] || '',         // C (3)
  shiftDate: formatDate(row[3]),    // D (4)
  date: formatDate(row[3]),         // D (4)
  shiftType: row[4] || '',          // E (5)
  firstStartTime: row[5] || '',     // F (6)
  lastEndTime: formatTime(row[6]),  // G (7)
  totalDuration: row[7] || 0,       // H (8)
  numberOfSegments: row[8] || 0,    // I (9)
  segments: parseSegments(row[9]),  // J (10)
  status: row[10] || 'DRAFT',       // K (11)
  createdAt: row[11] || '',         // L (12)
  lastUpdated: formatTimestamp(row[12]), // M (13)
  timezone: row[13] || '',          // N (14)
  day: row[15] || '',               // P (16) - NEW DAY FIELD
  _freshFromSheet: true,
  _rowIndex: index + 2
};
*/

// 6. ADD TEST FUNCTION
function testDayColumnIntegration() {
  try {
    const testDate = '2025-10-23';
    const dayName = getDayName(testDate);
    
    Logger.log(`✅ Day calculation test: ${testDate} = ${dayName}`);
    
    return {
      success: true,
      message: `Day column test passed: ${testDate} = ${dayName}`,
      data: { date: testDate, day: dayName }
    };
  } catch (error) {
    Logger.log(`❌ Day column test failed: ${error}`);
    return { success: false, message: error.toString() };
  }
}

// 7. UPDATE doPost FUNCTION - ADD TEST ACTION
// Find your doPost function and add this case to the switch statement:

/*
case 'testDayColumnIntegration':
  return createJSONResponse(testDayColumnIntegration());
*/

// 8. OPTIONAL: BACKFILL FUNCTION FOR EXISTING DATA
function backfillDayColumn() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getOrCreateSheet(spreadsheet);
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return { success: true, message: 'No data to backfill' };
    }
    
    Logger.log('🔄 Starting Day column backfill...');
    const allData = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
    let backfillCount = 0;
    
    allData.forEach((row, index) => {
      const rowNumber = index + 2;
      const shiftDate = row[3]; // D: Shift Date
      let dayName = row[15]; // P: Day column
      
      // Only backfill if Day column is empty
      if (!dayName || dayName === '') {
        dayName = getDayName(shiftDate);
        sheet.getRange(rowNumber, 16).setValue(dayName); // P: Day column
        backfillCount++;
        Logger.log(`📅 Backfilled Day for row ${rowNumber}: ${shiftDate} → ${dayName}`);
      }
    });
    
    Logger.log(`✅ Backfill complete: ${backfillCount} entries updated`);
    return {
      success: true,
      message: `Backfill complete: ${backfillCount} entries updated`,
      backfillCount: backfillCount
    };
    
  } catch (error) {
    Logger.log(`❌ Error in Day column backfill: ${error}`);
    return {
      success: false,
      message: 'Error in backfill: ' + error.toString()
    };
  }
}

// ===============================================================
// IMPLEMENTATION STEPS:
// 1. Copy getDayName function to your appscript.js
// 2. Update createRealTimeHeaders function
// 3. Modify createCompleteShift function to include Day column
// 4. Modify startShift function to include Day column  
// 5. Update getShiftsDirectlyFromSheet to read 16 columns and include day field
// 6. Add testDayColumnIntegration function
// 7. Add test action to doPost function
// 8. Optional: Add backfillDayColumn function for existing data
// ===============================================================