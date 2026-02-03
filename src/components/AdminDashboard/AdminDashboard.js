import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  getShifts,
  getStaffList,
  makeAPICall,
  handleAPIError,
  debugSheetStructure,
  autoStatusUpdateOnLoad,
  manualStatusUpdate,
  getComprehensiveSheetData,
  processAIPromptWithData,
  runExperimentalAI,
  getAIAnalysisSuggestions,
  getAIInsightsDashboard,
  testBackendVersion,
  applyFrontendSmartStatus,
  fixShiftStatus
} from '../../services/appScriptAPI';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('summary');
  // eslint-disable-next-line no-unused-vars
  const [allShifts, setAllShifts] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalShifts: 0,
    todayShifts: 0,
    activeShifts: 0,
    completedShifts: 0,
    totalStaff: 0
  });
  const [message, setMessage] = useState('');
  
  // Overview tab specific states
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('today');
  const [overviewData, setOverviewData] = useState([]);
  const [showOverviewTable, setShowOverviewTable] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [selectedView, setSelectedView] = useState('complete'); // Column view selector
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [segmentModalContent, setSegmentModalContent] = useState('');
  const [segmentModalTitle, setSegmentModalTitle] = useState('');
  
  // Shifts tab specific states
  const [shiftsTimePeriod, setShiftsTimePeriod] = useState('week');
  const [shiftsData, setShiftsData] = useState([]);
  const [rawShiftsData, setRawShiftsData] = useState([]); // For debugging
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shiftsColumnFilters, setShiftsColumnFilters] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingShift, setEditingShift] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showShiftsTable, setShowShiftsTable] = useState(false);
  const [shiftsCustomDateRange, setShiftsCustomDateRange] = useState({ start: '', end: '' });

  // AI Features states
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [comprehensiveData, setComprehensiveData] = useState(null);

  // Experimental tab states
  const [experimentalData, setExperimentalData] = useState(null);
  const [experimentalLoading, setExperimentalLoading] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState('data-insights');
  const [experimentResults, setExperimentResults] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);

  // Staff Management states
  const [editingStaff, setEditingStaff] = useState(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    employeeId: '',
    name: '',
    email: '',
    role: 'Staff',
    department: ''
  });

  // Status Update System states
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Summary tab states
  const [summaryDateRange, setSummaryDateRange] = useState('month'); // Default to current month
  const [summaryCustomRange, setSummaryCustomRange] = useState({ start: '', end: '' });
  const [showDrafts, setShowDrafts] = useState(true); // Match user's screenshot "Show Drafts: Yes"
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('all'); // all, active (working), inactive (not working)
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [calendarData, setCalendarData] = useState({});
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [summaryViewType, setSummaryViewType] = useState('calendar'); // calendar, list, cards


  // Define exact column order and names from Apps Script (excluding Row Index)
  // 🔥 EXACT GOOGLE SHEETS COLUMN STRUCTURE (16 columns A-P)
  // Updated to match actual sheet structure with Day column
  const appsScriptColumns = [
    { key: 'Shift ID', label: 'Shift ID' },              // Column A
    { key: 'Employee Name', label: 'Employee Name' },    // Column B
    { key: 'Employee ID', label: 'Employee ID' },        // Column C
    { key: 'Shift Date', label: 'Shift Date' },          // Column D
    { key: 'Shift Type', label: 'Shift Type' },          // Column E
    { key: 'First Start Time', label: 'First Start Time' }, // Column F
    { key: 'Last End Time', label: 'Last End Time' },    // Column G
    { key: 'Total Duration', label: 'Total Duration' },  // Column H
    { key: 'Number of Segments', label: 'Number of Segments' }, // Column I
    { key: 'Segments Data', label: 'Segments Data' },    // Column J
    { key: 'Status', label: 'Status' },                  // Column K
    { key: 'Created At', label: 'Created At' },          // Column L
    { key: 'Last Updated', label: 'Last Updated' },      // Column M
    { key: 'Initial Segment Data', label: 'Initial Segment Data' }, // Column N
    { key: 'Updated', label: 'Updated' },                // Column O
    { key: 'Day', label: 'Day' }                         // Column P - NEW
  ];

  // Summary Tab Helper Functions
  const getSummaryDateRange = (period, customRange = summaryCustomRange) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (period) {
      case 'month':
        // This Month: From 1st of current month to last day of current month
        const year = today.getFullYear();
        const month = today.getMonth();
        const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEndDate = new Date(year, month + 1, 0);
        const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`;
        return { 
          start: monthStartStr, 
          end: monthEndStr 
        };
      case 'lastMonth':
        // Last Month: From 1st of previous month to last day of previous month
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return { 
          start: lastMonthStart.toISOString().split('T')[0], 
          end: lastMonthEnd.toISOString().split('T')[0] 
        };
      case 'week':
        // This Week: From Sunday to today
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart.toISOString().split('T')[0], end: todayStr };
      case 'today':
        // Today only
        return { start: todayStr, end: todayStr };
      case 'custom':
        return customRange;
      default:
        return { start: todayStr, end: todayStr };
    }
  };

  const processCalendarData = (shifts, staffList, dateRange, includeDrafts = true, statusFilter = 'all') => {
    const calendar = {};
    
    // Filter shifts based on date range and draft status
    const filteredShifts = shifts.filter(shift => {
      const shiftDate = shift.shiftDate || shift['Shift Date'];
      const status = shift.status || shift['Status'];
      
      // Convert dates to proper Date objects for comparison
      let inDateRange = true;
      if (dateRange.start && dateRange.end && shiftDate) {
        // Normalize all dates to YYYY-MM-DD format for comparison
        const normalizeDate = (dateStr) => {
          if (!dateStr) return '';
          // Handle different date formats
          let normalized = dateStr;
          if (typeof dateStr === 'object' && dateStr.getTime) {
            normalized = dateStr.toISOString().split('T')[0];
          } else if (typeof dateStr === 'string') {
            // If it's already YYYY-MM-DD, keep it
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              normalized = dateStr;
            } else {
              // Try to parse and convert to YYYY-MM-DD
              const parsed = new Date(dateStr);
              if (!isNaN(parsed.getTime())) {
                normalized = parsed.toISOString().split('T')[0];
              }
            }
          }
          return normalized;
        };
        
        const normalizedShiftDate = normalizeDate(shiftDate);
        const normalizedStartDate = normalizeDate(dateRange.start);
        const normalizedEndDate = normalizeDate(dateRange.end);
        
        inDateRange = normalizedShiftDate >= normalizedStartDate && normalizedShiftDate <= normalizedEndDate;
        
        // Debug logging
        if (!inDateRange) {
          console.log('📅 Date filter debug:', {
            originalShiftDate: shiftDate,
            normalizedShiftDate,
            normalizedStartDate,
            normalizedEndDate,
            inRange: inDateRange
          });
        }
      }
      
      const includeShift = includeDrafts || status !== 'DRAFT';
      
      return inDateRange && includeShift;
    });
    
    // Determine which employees to show based on their employment status from Staff sheet
    let employees = [];
    if (statusFilter === 'all') {
      employees = staffList.map(s => s.name).sort();
    } else {
      // Filter employees by their actual employment status from Staff sheet
      employees = staffList
        .filter(employee => {
          // Check status field - treat empty as 'active' by default
          const empStatus = (employee.status || '').toLowerCase();
          const isActive = empStatus === 'active' || empStatus === ''; // Empty status = active
          const isInactive = empStatus === 'inactive';
          
          console.log('🔍 Employee status check:', {
            name: employee.name,
            status: employee.status,
            finalStatus: empStatus || '(empty - treating as active)',
            isActive,
            isInactive
          });
          
          if (statusFilter === 'active') {
            return isActive;
          } else if (statusFilter === 'inactive') {
            return isInactive;
          }
          return true;
        })
        .map(s => s.name)
        .sort();
    }
    
    // Create date array from start to end
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const dates = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    // Initialize calendar grid
    dates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayMonth = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      
      calendar[dateKey] = {
        date: dateKey,
        displayDate: `${dayMonth} ${dayName}`,
        employees: {},
        dayTotal: 0
      };
      
      // Initialize each employee for this date
      employees.forEach(empName => {
        calendar[dateKey].employees[empName] = {
          hours: 0,
          shifts: 0,
          status: 'inactive'
        };
      });
    });
    
    // Fill in actual shift data
    filteredShifts.forEach(shift => {
      const shiftDate = shift.shiftDate || shift['Shift Date'];
      const empName = shift.employeeName || shift['Employee Name'];
      const hours = parseFloat(shift.totalDuration || shift['Total Duration']) || 0;
      const shiftStatus = shift.status || shift['Status'] || 'DRAFT';
      
      if (calendar[shiftDate] && calendar[shiftDate].employees[empName]) {
        calendar[shiftDate].employees[empName].hours += hours;
        calendar[shiftDate].employees[empName].shifts += 1;
        calendar[shiftDate].employees[empName].status = shiftStatus; // Use actual shift status
        calendar[shiftDate].dayTotal += hours;
      }
    });
    
    return { calendar, employees, dates };
  };

  // Function to generate CSV data from calendar
  const generateCalendarCSV = () => {
    if (!calendarData.calendar || !calendarData.employees || !calendarData.dates) {
      return '';
    }

    const rows = [];
    
    // Header row
    const headers = ['Date', ...calendarData.employees, 'Total'];
    rows.push(headers.join(','));
    
    // Data rows
    calendarData.dates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const dayData = calendarData.calendar[dateKey];
      
      const row = [dayData?.displayDate || dateKey];
      
      // Add employee hours for this date
      calendarData.employees.forEach(empName => {
        const empData = dayData?.employees?.[empName];
        const hours = empData?.hours || 0;
        const status = empData?.status || '';
        
        // Format: "12.0h (COMPLETED)" or "0" for no hours
        if (hours > 0) {
          row.push(`"${hours.toFixed(1)}h (${status})"`);
        } else {
          row.push('0');
        }
      });
      
      // Add day total
      row.push(`${(dayData?.dayTotal || 0).toFixed(1)}h`);
      
      rows.push(row.join(','));
    });
    
    // Summary row
    const summaryRow = ['TOTAL'];
    calendarData.employees.forEach(empName => {
      const empTotal = calendarData.dates?.reduce((sum, date) => {
        const dateKey = date.toISOString().split('T')[0];
        const empData = calendarData.calendar[dateKey]?.employees?.[empName];
        return sum + (empData?.hours || 0);
      }, 0) || 0;
      summaryRow.push(`${empTotal.toFixed(1)}h`);
    });
    
    // Grand total
    const grandTotal = calendarData.dates?.reduce((sum, date) => {
      const dateKey = date.toISOString().split('T')[0];
      return sum + (calendarData.calendar[dateKey]?.dayTotal || 0);
    }, 0) || 0;
    summaryRow.push(`${grandTotal.toFixed(1)}h`);
    
    rows.push(summaryRow.join(','));
    
    return rows.join('\n');
  };

  // Function to download CSV file
  const downloadCalendarCSV = () => {
    const csvContent = generateCalendarCSV();
    if (!csvContent) {
      alert('No calendar data to export. Please load summary data first.');
      return;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with date range
      const startDate = summaryDateRange === 'custom' ? summaryCustomRange.start : 
                       getSummaryDateRange(summaryDateRange).start;
      const endDate = summaryDateRange === 'custom' ? summaryCustomRange.end : 
                     getSummaryDateRange(summaryDateRange).end;
      
      const filename = `calendar-summary-${startDate}-to-${endDate}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleLoadSummaryData = async () => {
    setSummaryLoading(true);
    try {
      const dateRange = getSummaryDateRange(summaryDateRange, summaryCustomRange);
      console.log('🗓️ Summary date range:', dateRange);
      console.log('📊 Selected period:', summaryDateRange);
      
      // Load shifts and staff data from both sheets
      console.log('📡 Fetching data from sheets...');
      const [shiftsResponse, staffResponse] = await Promise.all([
        getShifts({
          startDate: dateRange.start,
          endDate: dateRange.end
        }),
        getStaffList()
      ]);
      
      console.log('📊 Shifts response:', shiftsResponse);
      console.log('👥 Staff response:', staffResponse);
      
      // Debug first few shifts to see date format
      if (shiftsResponse.success && shiftsResponse.data.length > 0) {
        console.log('🔍 Sample shift data (first 3):');
        shiftsResponse.data.slice(0, 3).forEach((shift, i) => {
          console.log(`  Shift ${i + 1}:`, {
            'shiftDate': shift.shiftDate,
            'employeeName': shift.employeeName,
            'totalDuration': shift.totalDuration,
            'status': shift.status
          });
        });
      }
      
      if (shiftsResponse.success && staffResponse.success) {
        // ✅ VALIDATE AND FIX STATUS INCONSISTENCIES BEFORE PROCESSING
        console.log('🔄 ADMIN SUMMARY TAB: Running validation-detection-fix cycle...');
        const validationResult = await validateAndFixShiftStatuses(shiftsResponse.data);
        
        let finalShiftsData = shiftsResponse.data;
        
        if (validationResult.needsRefresh) {
          console.log(`🔄 ADMIN SUMMARY TAB RE-FETCHING: ${validationResult.fixedCount} shifts fixed, getting fresh data...`);
          
          const freshShiftsResponse = await getShifts({
            startDate: dateRange.start,
            endDate: dateRange.end,
            forceRefresh: true
          });
          
          if (freshShiftsResponse.success) {
            finalShiftsData = freshShiftsResponse.data;
            setMessage(`✅ ${validationResult.fixedCount} shift status(es) corrected in Google Sheets`);
          }
        }
        
        setSummaryData(finalShiftsData);
        
        // Process into calendar format
        const { calendar, employees, dates } = processCalendarData(
          finalShiftsData, 
          staffResponse.data, 
          dateRange, 
          showDrafts,
          employeeStatusFilter
        );
        
        setCalendarData({ calendar, employees, dates, dateRange });
        setActiveEmployees(employees);
        
        if (!validationResult.needsRefresh) {
          setMessage(`Summary loaded: ${finalShiftsData.length} shifts for ${employees.length} employees`);
        }
      } else {
        setMessage('Failed to load summary data');
      }
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setSummaryLoading(false);
    }
  };

  // Helper function to calculate duration from time strings (HH:MM format)
  const calculateDurationFromTimes = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    
    try {
      // Handle different time formats
      const parseTime = (timeStr) => {
        // Handle ISO timestamp format (e.g., "1899-12-30T05:00:00.000Z")
        if (typeof timeStr === 'string' && (timeStr.includes('T') || timeStr.includes('Z'))) {
          const date = new Date(timeStr);
          return date.getHours() + date.getMinutes() / 60;
        }
        // Handle HH:MM format
        if (typeof timeStr === 'string' && timeStr.includes(':')) {
          const [hours, minutes] = timeStr.split(':').map(num => parseInt(num));
          return hours + minutes / 60;
        }
        return 0;
      };
      
      const startHours = parseTime(startTime);
      const endHours = parseTime(endTime);
      
      let duration = endHours - startHours;
      
      // Handle overnight shifts (end time is before start time)
      if (duration < 0) {
        duration += 24;
      }
      
      return Math.max(0, duration);
    } catch (error) {
      console.error('Error calculating duration from times:', error, { startTime, endTime });
      return 0;
    }
  };

  // Helper function to get duration with fallback to segments
  const getDurationFromShift = (shift) => {
    // Safety check: ensure shift exists and is an object
    if (!shift || typeof shift !== 'object') {
      console.warn('getDurationFromShift: Invalid shift data:', shift);
      return 0;
    }
    
    // Try to get duration from Total Duration column first
    let duration = parseFloat(shift['Total Duration']) || 0;
    
    // Fallback 1: Calculate from segments if main duration is 0
    if (duration === 0 && shift['Segments Data']) {
      try {
        const segmentsData = typeof shift['Segments Data'] === 'string' 
          ? JSON.parse(shift['Segments Data']) 
          : shift['Segments Data'];
        
        if (Array.isArray(segmentsData) && segmentsData.length > 0) {
          // Try to sum up segment durations
          duration = segmentsData.reduce((total, seg) => {
            // If segment has duration field, use it
            if (seg.duration && !isNaN(parseFloat(seg.duration))) {
              return total + parseFloat(seg.duration);
            }
            // Otherwise calculate from start/end times
            if (seg.startTime && seg.endTime) {
              return total + calculateDurationFromTimes(seg.startTime, seg.endTime);
            }
            return total;
          }, 0);
        }
      } catch (error) {
        console.error('Error parsing segments for duration calculation:', error);
      }
    }
    
    // Fallback 2: Calculate from First Start Time and Last End Time
    if (duration === 0 && shift['First Start Time'] && shift['Last End Time']) {
      duration = calculateDurationFromTimes(shift['First Start Time'], shift['Last End Time']);
    }
    
    return duration;
  };

  // Diagnostic function for console testing
  window.debugDurationCalculation = () => {
    console.log('🔍 === DURATION CALCULATION DIAGNOSTIC ===');
    
    const data = getFilteredShiftsData();
    console.log('📊 Total shifts in filtered data:', data.length);
    
    if (data.length === 0) {
      console.log('❌ No shift data available in filtered results.');
      console.log('🔍 Checking raw data and state...');
      console.log('Raw shifts data length:', shiftsData.length);
      console.log('Show shifts table:', showShiftsTable);
      console.log('Selected time period:', shiftsTimePeriod);
      console.log('Column filters:', shiftsColumnFilters);
      console.log('Global filter:', globalFilter);
      
      if (shiftsData.length > 0) {
        console.log('✅ Raw data exists, but filtered out. First raw record:');
        console.log(shiftsData[0]);
      } else {
        console.log('❌ No raw shift data. Try loading shifts first by clicking "Load Data" or changing the time period.');
      }
      return;
    }
    
    data.forEach((shift, index) => {
      console.log(`\n📋 Shift ${index + 1}:`);
      console.log('  Shift ID:', shift['Shift ID']);
      console.log('  Employee:', shift['Employee Name']);
      console.log('  Date:', shift['Shift Date']);
      console.log('  Times:', shift['First Start Time'], '→', shift['Last End Time']);
      console.log('  Backend Duration:', shift['Total Duration']);
      console.log('  Segments Data:', shift['Segments Data']);
      
      try {
        const calculatedDuration = getDurationFromShift(shift);
        console.log('  ✅ Calculated Duration:', calculatedDuration.toFixed(2), 'hours');
        console.log('  ✅ Formatted Display:', calculatedDuration > 0 ? `${calculatedDuration.toFixed(1)}h` : '-');
        
        if (shift['Segments Data']) {
          const segments = JSON.parse(shift['Segments Data']);
          console.log('  📊 Segments breakdown:', segments.map(s => `${s.startTime}-${s.endTime} (${s.duration}h)`));
        }
      } catch (error) {
        console.log('  ❌ Error calculating duration:', error);
      }
    });
    
    console.log('\n🎯 === SUMMARY ===');
    const totalHours = data.reduce((sum, shift) => sum + getDurationFromShift(shift), 0);
    console.log('Total hours across all shifts:', totalHours.toFixed(2));
    console.log('=================================');
  };

  // Additional helper for quick testing
  window.debugAdminData = () => {
    console.log('🔍 === ADMIN DATA STATE DEBUG ===');
    console.log('Shifts data length:', shiftsData.length);
    console.log('Raw shifts data length:', rawShiftsData.length);
    console.log('Show shifts table:', showShiftsTable);
    console.log('Loading state:', loading);
    console.log('Is loading:', isLoading);
    console.log('Time period:', shiftsTimePeriod);
    console.log('Column filters:', shiftsColumnFilters);
    console.log('Global filter:', globalFilter);
    console.log('Filtered data length:', getFilteredShiftsData().length);
    console.log('====================================');
    
    if (rawShiftsData.length > 0) {
      console.log('Sample raw record:', rawShiftsData[0]);
    }
    if (shiftsData.length > 0) {
      console.log('Sample processed record:', shiftsData[0]);
    }
  };

  // Manual data loader for console testing
  window.loadShiftsDataManually = async () => {
    console.log('🚀 === MANUAL DATA LOADING ===');
    console.log('Current time period:', shiftsTimePeriod);
    
    try {
      console.log('📡 Calling handleViewShiftsData...');
      await handleViewShiftsData();
      console.log('✅ Data loading completed!');
      console.log('📊 New data count:', shiftsData.length);
      
      // Run diagnostics automatically after loading
      setTimeout(() => {
        console.log('\n🔄 Running post-load diagnostics...');
        window.debugAdminData();
        window.debugDurationCalculation();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
    }
  };

  // Test edit functionality
  window.testEditFunctionality = () => {
    console.log('🔧 === TESTING EDIT FUNCTIONALITY ===');
    console.log('Available shifts for editing:', shiftsData.length);
    
    if (shiftsData.length > 0) {
      console.log('✅ Test: Click edit on first shift');
      console.log('Shift data:', shiftsData[0]);
      console.log('Fields that can be edited:', ['Employee ID', 'Employee Name', 'Shift Date', 'Shift Type', 'First Start Time', 'Last End Time', 'Status']);
      console.log('\n📝 Instructions:');
      console.log('1. Click the pencil icon on any shift');
      console.log('2. Change the First Start Time or Last End Time');
      console.log('3. Click Save');
      console.log('4. Check console for save operation results');
    } else {
      console.log('❌ No shifts available. Load data first with: loadShiftsDataManually()');
    }
  };

  const columns = useMemo(() => {
    return appsScriptColumns.map(col => ({
      accessorKey: col.key,
      header: col.label,
      Cell: ({ cell, row }) => formatCellData(cell.getValue(), col.key, row.original),
    }));
  }, []);

  // Smart Status Calculation Logic (moved from Apps Script)
  const calculateSmartStatus = (segments, currentTime, firstStartTime, lastEndTime, shiftDate) => {
    if (!segments || segments.length === 0) {
      return 'DRAFT';
    }

    // Parse segments if they're stored as JSON string
    let parsedSegments = segments;
    if (typeof segments === 'string') {
      try {
        parsedSegments = JSON.parse(segments);
      } catch (e) {
        console.log('❌ Failed to parse segments:', e);
        return 'DRAFT';
      }
    }
    
    if (!Array.isArray(parsedSegments)) {
      console.log('❌ Segments not an array');
      return 'DRAFT';
    }

    // Get current time with proper timezone handling
    const now = new Date();
    const currentDateTime = now.getTime();
    console.log('⏰ Current date/time:', now.toLocaleString(), 'timestamp:', currentDateTime);
    
    // Parse shift date
    let shiftDateObj;
    if (shiftDate) {
      // Handle ISO 8601 format: "2025-10-29T18:30:00.000Z"
      if (shiftDate.includes('T') && shiftDate.includes('Z')) {
        shiftDateObj = new Date(shiftDate);
      } else if (shiftDate.includes('/')) {
        // Format: MM/DD/YYYY or DD/MM/YYYY
        shiftDateObj = new Date(shiftDate);
      } else if (shiftDate.includes(',')) {
        // Format: "Oct 8, 2025"
        shiftDateObj = new Date(shiftDate);
      } else {
        // Try parsing as is
        shiftDateObj = new Date(shiftDate);
      }
    }
    
    if (!shiftDateObj || isNaN(shiftDateObj.getTime())) {
      console.log('⚠️ Invalid shift date, using today:', shiftDate);
      shiftDateObj = new Date();
      shiftDateObj.setHours(0, 0, 0, 0); // Start of today
    }
    
    console.log('📅 Shift date:', shiftDateObj.toDateString());
    
    // 🚨 DATE-AWARE STATUS VALIDATION (Compare dates properly, not strings!)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const shiftDateNormalized = new Date(shiftDateObj);
    shiftDateNormalized.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const isShiftFromPast = shiftDateNormalized < today;
    const isShiftFromFuture = shiftDateNormalized > today;
    const isShiftToday = shiftDateNormalized.getTime() === today.getTime();
    
    // Calculate day difference for overnight shift detection
    let dayDifference = 0;
    if (isShiftFromPast) {
      dayDifference = Math.floor((today - shiftDateNormalized) / (1000 * 60 * 60 * 24));
    }
    
    console.log(`📅 Date Analysis: Shift=${shiftDateObj.toDateString()}, Today=${today.toDateString()}`);
    console.log(`📅 isPast=${isShiftFromPast}, isFuture=${isShiftFromFuture}, isToday=${isShiftToday}`);
    
    if (isShiftFromPast) {
      // 🌙 OVERNIGHT SHIFT CHECK: If date is exactly 1 day ago, might still be active
      const dayDifference = Math.floor((today - shiftDateNormalized) / (1000 * 60 * 60 * 24));
      
      if (dayDifference === 1 && parsedSegments.length > 0) {
        // Check if shift ends in early morning (overnight shift indicator)
        const lastSegment = parsedSegments[parsedSegments.length - 1];
        const lastEndTime = lastSegment?.endTime;
        
        if (lastEndTime) {
          const [endHour] = lastEndTime.split(':').map(Number);
          const [currentHour] = currentTime.split(':').map(Number);
          
          // If shift ends between midnight and 8 AM, it's likely an overnight shift
          if (endHour >= 0 && endHour <= 8) {
            // If current time is before shift end time in early morning
            if (currentHour >= 0 && currentHour <= 8 && currentHour < endHour) {
              console.log(`🌙 OVERNIGHT SHIFT STILL ACTIVE: Ends at ${lastEndTime}, current ${currentTime} - continuing to time-based logic`);
              // Don't return here - let the time-based logic below handle it as "today's shift"
            } else {
              // Overnight shift has ended
              console.log('🎯 Overnight shift ended - COMPLETED');
              return 'COMPLETED';
            }
          } else {
            // Normal past date logic
            const hasActiveSegment = parsedSegments.some(seg => !seg.endTime);
            if (hasActiveSegment) {
              console.log('🚨 PAST DATE with active segment - forcing COMPLETED');
              return 'COMPLETED';
            } else if (parsedSegments.every(seg => seg.endTime)) {
              console.log('🎯 Past shift with complete segments - COMPLETED');
              return 'COMPLETED';
            } else {
              console.log('🎯 Past shift with incomplete data - DRAFT');
              return 'DRAFT';
            }
          }
        }
      } else {
        // More than 1 day ago - definitely past
        const hasActiveSegment = parsedSegments.some(seg => !seg.endTime);
        if (hasActiveSegment) {
          console.log('🚨 PAST DATE with active segment - forcing COMPLETED');
          return 'COMPLETED';
        } else if (parsedSegments.length > 0 && parsedSegments.every(seg => seg.endTime)) {
          console.log('🎯 Past shift with complete segments - COMPLETED');
          return 'COMPLETED';
        } else {
          console.log('🎯 Past shift with incomplete data - DRAFT');
          return 'DRAFT';
        }
      }
    } else if (isShiftFromFuture) {
      // For future dates, shifts can only be DRAFT or OFFLINE (never ACTIVE/COMPLETED)
      console.log('🎯 Future shift - can only be DRAFT or OFFLINE');
      return 'DRAFT';
    }
    
    // For today's shifts (or overnight shifts continuing into today), continue with normal time-based logic
    if (!isShiftToday && !(isShiftFromPast && dayDifference === 1)) {
      console.log('🎯 Not today\'s shift - defaulting to DRAFT');
      return 'DRAFT';
    }
    
    // Get the actual start and end times from segments
    const firstSegment = parsedSegments[0];
    const lastSegment = parsedSegments[parsedSegments.length - 1];
    
    if (firstSegment && firstSegment.startTime) {
      // Create full datetime for shift start
      const [startHours, startMinutes] = firstSegment.startTime.split(':').map(Number);
      const shiftStartDateTime = new Date(shiftDateObj);
      shiftStartDateTime.setHours(startHours, startMinutes, 0, 0);
      
      console.log('🚀 Shift start datetime:', shiftStartDateTime.toLocaleString());
      
      // Check if shift hasn't started yet (considering date)
      if (currentDateTime < shiftStartDateTime.getTime()) {
        console.log('⚫ Before start time - OFFLINE');
        return 'OFFLINE';
      }
    }

    // Check for active segments (segments without end time)
    const hasActiveSegment = parsedSegments.some(seg => !seg.endTime);
    console.log('🔄 Has active segment (no end time):', hasActiveSegment);
    
    if (hasActiveSegment) {
      console.log('🟢 Active segment detected - ACTIVE');
      return 'ACTIVE';
    }

    // Check if current time is before the last segment's end time (with date consideration)
    if (lastSegment && lastSegment.endTime) {
      // Create full datetime for shift end
      const [endHours, endMinutes] = lastSegment.endTime.split(':').map(Number);
      const shiftEndDateTime = new Date(shiftDateObj);
      shiftEndDateTime.setHours(endHours, endMinutes, 0, 0);
      
      console.log('🏁 Shift end datetime:', shiftEndDateTime.toLocaleString());
      console.log('⏰ Comparison: current', now.toLocaleString(), 'vs end', shiftEndDateTime.toLocaleString());
      
      if (currentDateTime < shiftEndDateTime.getTime()) {
        console.log('🟢 Current time before end time - should be ACTIVE');
        return 'ACTIVE';
      } else {
        console.log('🔵 Current time after end time - COMPLETED');
        return 'COMPLETED';
      }
    }

    // If all segments have end times but no clear end time, likely still active
    if (parsedSegments.length > 0 && parsedSegments.every(seg => seg.endTime)) {
      console.log('🟡 All segments have end times but unclear - COMPLETED for today');
      return 'COMPLETED'; // For today's completed shifts
    }

    console.log('📝 Fallback to DRAFT');
    return 'DRAFT';
  };

  // Helper function to convert HH:MM to minutes
  const timeToMinutes = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  // Helper function to get current time in HH:MM format
  const getCurrentTimeString = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM format
  };

  // Function to sync status with backend when calculated status differs
  const syncStatusWithBackend = async (shift, calculatedStatus) => {
    if (calculatedStatus !== shift['Status']) {
      try {
        console.log(`🔄 === STATUS SYNC INITIATED ===`);
        console.log(`Shift ID: ${shift['Shift ID']}`);
        console.log(`Backend Status: "${shift['Status']}" → Calculated Status: "${calculatedStatus}"`);
        console.log(`Calling makeAPICall with:`, {
          action: 'updateShiftStatus',
          shiftId: shift['Shift ID'],
          newStatus: calculatedStatus,
          reason: 'Smart status calculation'
        });
        
        const response = await makeAPICall({
          action: 'updateShiftStatus',
          shiftId: shift['Shift ID'],
          newStatus: calculatedStatus,
          reason: 'Smart status calculation'
        });
        
        console.log(`📡 API Response:`, response);
        
        if (response.success) {
          console.log(`✅ Status synced successfully for ${shift['Shift ID']}`);
          return calculatedStatus;
        } else {
          console.warn(`⚠️ Failed to sync status for ${shift['Shift ID']}:`, response.message);
        }
      } catch (error) {
        console.error(`❌ Error syncing status for ${shift['Shift ID']}:`, error);
      }
    } else {
      console.log(`⭐ No sync needed for ${shift['Shift ID']} - statuses match`);
    }
    return shift['Status']; // Return original status if sync failed
  };

  // Enhanced normalization with smart status calculation
  const normalizeRecord = async (rec) => {
    if (!rec || typeof rec !== 'object') return rec;
    
    // Enhanced debug logging for status calculation
    console.log('🔍 === NORMALIZING RECORD ===');
    console.log('Input record:', rec);
    console.log('Shift ID:', rec['Shift ID']);
    console.log('Current stored status:', rec['Status'] || rec.status);
    console.log('Segments data:', rec['Segments Data'] || rec.segments);
    console.log('First start time:', rec['First Start Time'] || rec.startTime);
    console.log('Last end time:', rec['Last End Time'] || rec.endTime);
    console.log('Shift date:', rec['Shift Date'] || rec.date);
    
    // Calculate smart status based on current time and shift data (now with date awareness)
    const currentTime = getCurrentTimeString();
    console.log('⏰ Current time for calculation:', currentTime);
    
    const calculatedStatus = calculateSmartStatus(
      rec['Segments Data'] || rec.segments,
      currentTime,
      rec['First Start Time'] || rec.startTime,
      rec['Last End Time'] || rec.endTime,
      rec['Shift Date'] || rec.date // Pass shift date for proper date/time comparison
    );
    
    console.log('🧮 Calculated smart status:', calculatedStatus);
    console.log('🔍 Original status:', rec['Status'] || rec.status);
    console.log('❓ Status needs update:', calculatedStatus !== (rec['Status'] || rec.status));
    
    // Create normalized record
    const normalized = { ...rec };
    
    // Apply smart status (will be synced with backend if different)
    normalized['Status'] = calculatedStatus;
    normalized['_smartStatus'] = calculatedStatus;
    normalized['_originalStatus'] = rec['Status'] || rec.status;
    normalized['_statusCalculated'] = calculatedStatus !== (rec['Status'] || rec.status);
    
    console.log('🔧 Status flags:', {
      original: rec['Status'] || rec.status,
      calculated: calculatedStatus,
      needsUpdate: normalized['_statusCalculated']
    });
    
    console.log('✅ Normalized record completed');
    console.log('===============================');
    
    return normalized;
  };

  /**
   * VALIDATION & STATUS CORRECTION CYCLE (Exact copy from Staff History)
   * Validates shifts and fixes status inconsistencies in Google Sheets
   * Returns: { shifts: originalShifts, fixedCount: number, needsRefresh: boolean }
   */
  const validateAndFixShiftStatuses = async (shiftsData) => {
    console.log(`📅 ADMIN VALIDATION: Received ${shiftsData.length} shifts - Checking for status inconsistencies`);
    
    let fixedShiftsCount = 0;
    const shiftsToFix = [];
    
    // 🏗️ DETECT: Check each shift for status inconsistencies
    for (const shift of shiftsData) {
      // 🔧 Handle both backend formats: camelCase (getDashboardData) and Pascal Case (getAllShiftsForAdmin)
      const shiftId = shift.shiftId || shift['Shift ID'];
      const status = shift.status || shift['Status'];
      const shiftDate = shift.shiftDate || shift['Shift Date'];
      const firstStartTime = shift.firstStartTime || shift['First Start Time'];
      const lastEndTime = shift.lastEndTime || shift['Last End Time'];
      const segments = shift.segments || shift['Segments Data'];
      
      console.log(`🔍 ADMIN CHECKING SHIFT ${shiftId}:`, {
        originalStatus: status,
        shiftDate: shiftDate,
        startTime: firstStartTime,
        endTime: lastEndTime
      });
      
      // Convert Admin format to Staff format for validation
      const shiftForValidation = {
        shiftId: shiftId,
        status: status,
        shiftDate: shiftDate,
        firstStartTime: firstStartTime,
        lastEndTime: lastEndTime,
        segments: segments
      };
      
      const smartStatus = applyFrontendSmartStatus(shiftForValidation);
      console.log(`📊 ADMIN SMART STATUS RESULT:`, {
        shiftId: shiftId,
        originalStatus: status,
        smartStatus: smartStatus.status,
        statusCorrected: smartStatus._statusCorrected,
        reason: smartStatus._correctionReason
      });
      
      if (smartStatus._statusCorrected) {
        console.log(`❌ ADMIN STATUS INCONSISTENCY DETECTED:`, {
          shiftId: shiftId,
          originalStatus: status,
          correctedStatus: smartStatus.status,
          reason: smartStatus._correctionReason
        });
        
        shiftsToFix.push({
          shiftId: shiftId,
          correctedStatus: smartStatus.status,
          reason: smartStatus._correctionReason
        });
      }
    }
    
    // 🔧 FIX: Fix inconsistencies in Google Sheets
    if (shiftsToFix.length > 0) {
      console.log(`🔧 ADMIN FIXING ${shiftsToFix.length} STATUS INCONSISTENCIES IN GOOGLE SHEETS...`);
      
      for (const fixData of shiftsToFix) {
        try {
          const fixResponse = await fixShiftStatus({
            shiftId: fixData.shiftId,
            correctStatus: fixData.correctedStatus,
            reason: fixData.reason
          });
          
          if (fixResponse.success) {
            console.log(`✅ ADMIN FIXED SHIFT ${fixData.shiftId} in Google Sheets`);
            fixedShiftsCount++;
          } else {
            console.error(`❌ ADMIN FAILED to fix shift ${fixData.shiftId}:`, fixResponse.message);
          }
        } catch (error) {
          console.error(`❌ ADMIN ERROR fixing shift ${fixData.shiftId}:`, error);
        }
      }
    } else {
      console.log('✅ ADMIN VALIDATION: All shift statuses are correct');
    }
    
    return {
      shifts: shiftsData,
      fixedCount: fixedShiftsCount,
      needsRefresh: fixedShiftsCount > 0
    };
  };

  // View Type configurations for column filtering
  const viewTypes = [
    { 
      value: 'essential', 
      label: 'Essential View (8 cols)',
      columns: ['Shift ID', 'Employee Name', 'Shift Date', 'First Start Time', 'Last End Time', 'Total Duration', 'Status', 'Day']
    },
    { 
      value: 'management', 
      label: 'Management View (10 cols)',
      columns: ['Shift ID', 'Employee Name', 'Employee ID', 'Shift Date', 'Shift Type', 'First Start Time', 'Last End Time', 'Total Duration', 'Status', 'Day']
    },
    { 
      value: 'complete', 
      label: 'Complete View (All 16 cols)',
      columns: appsScriptColumns.map(col => col.key)
    },
    { 
      value: 'timetracking', 
      label: 'Time Tracking (9 cols)',
      columns: ['Shift ID', 'Employee Name', 'Shift Date', 'First Start Time', 'Last End Time', 'Total Duration', 'Number of Segments', 'Status', 'Day']
    },
    { 
      value: 'audit', 
      label: 'Audit Trail (11 cols)',
      columns: ['Shift ID', 'Employee Name', 'Employee ID', 'Shift Date', 'Status', 'Created At', 'Last Updated', 'Initial Segment Data', 'Segments Data', 'Updated', 'Day']
    },
    { 
      value: 'quick', 
      label: 'Quick Summary (6 cols)',
      columns: ['Employee Name', 'Shift Date', 'Total Duration', 'Number of Segments', 'Status', 'Day']
    }
    ,
    {
      value: 'updatescheck',
      label: 'Updates Check View (8 cols)',
      columns: [
        'Shift ID',
        'Employee Name',
        'Shift Date',
        'Segments Data',
        'Initial Segment Data',
        'Status',
        'Updated',
        'Day'
      ]
    }
  ];

  // Function to get selected columns in original sheet order
  const getOrderedSelectedColumns = () => {
    if (!shiftsData || shiftsData.length === 0) return [];
    return Object.keys(shiftsData[0]);
  };

  // Function to get ordered selected columns for shifts tab
  const getOrderedShiftsColumns = () => {
    return appsScriptColumns.map(col => col.key);
  };

  // Function to get ordered selected columns for overview tab based on selected view
  const getOrderedOverviewColumns = () => {
    const selectedViewConfig = viewTypes.find(view => view.value === selectedView);
    if (selectedViewConfig) {
      return selectedViewConfig.columns;
    }
    return appsScriptColumns.map(col => col.key);
  };
  
  // Time period options
  const timePeriodOptions = [
  { value: 'today', label: 'Today' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
  { value: 'monthlyTotalPerEmployee', label: 'Monthly Total per Employee' },
  { value: 'monthlyAvgPerEmployee', label: 'Monthly Average per Employee' },
  { value: 'weeklyTotalPerEmployee', label: 'Weekly Total per Employee' },
  { value: 'weeklyAvgPerEmployee', label: 'Weekly Average per Employee' },
  { value: 'quarterlyTotalPerEmployee', label: 'Quarterly Total per Employee' },
  { value: 'quarterlyAvgPerEmployee', label: 'Quarterly Average per Employee' },
  { value: 'yearlyTotalPerEmployee', label: 'Yearly Total per Employee' },
  { value: 'yearlyAvgPerEmployee', label: 'Yearly Average per Employee' },
  { value: 'allTimeTotalPerEmployee', label: 'All Time Total per Employee' },
  { value: 'weeklyTotal', label: 'Weekly Total (All Employees)' },
  { value: 'monthlyTotal', label: 'Monthly Total (All Employees)' },
  { value: 'quarterlyTotal', label: 'Quarterly Total (All Employees)' },
  { value: 'yearlyTotal', label: 'Yearly Total (All Employees)' },
  { value: 'allTimeTotal', label: 'All Time Total (All Employees)' },
  { value: 'allTimeAverage', label: 'All Time Average (All Employees)' },
  { value: 'allTimeData', label: 'All Time Data (All Employees)' } // New option for all data
  ];

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh for status updates every 2 minutes
    const statusRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard for status updates...');
      loadDashboardData();
    }, 2 * 60 * 1000); // 2 minutes
    
    return () => {
      clearInterval(statusRefreshInterval);
    };
  }, []);

  // Automatic status update on admin portal load
  useEffect(() => {
    if (user && user.role === 'admin') {
      handleAutoStatusUpdate();
    }
  }, [user]);

  const handleAutoStatusUpdate = async () => {
    try {
      setStatusUpdateLoading(true);
      console.log('🚀 Running automatic status update on admin portal load...');
      const result = await autoStatusUpdateOnLoad();
      
      if (result.success) {
        console.log('✅ Auto status update completed:', result.message);
        setLastUpdateTime(new Date());
      } else {
        console.warn('⚠️ Auto status update warning:', result.message);
      }
    } catch (error) {
      console.error('❌ Auto status update failed:', error);
      // Don't show error to user for automatic updates
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleManualStatusUpdate = async () => {
    try {
      setStatusUpdateLoading(true);
      console.log('🔄 Running manual status update...');
      const result = await manualStatusUpdate();
      
      if (result.success) {
        alert(`✅ Status update completed!\n${result.message}`);
        setLastUpdateTime(new Date());
        // Trigger refresh of dashboard data
        loadDashboardData();
      } else {
        alert(`⚠️ Status update completed with warnings:\n${result.message}`);
      }
    } catch (error) {
      console.error('❌ Manual status update failed:', error);
      alert(`❌ Status update failed:\n${handleAPIError(error)}`);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load system stats
      const statsResponse = await makeAPICall({ action: 'getSystemStats' });
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      // Load recent shifts
      const shiftsResponse = await getShifts({ 
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
        endDate: new Date().toISOString().split('T')[0]
      });
      
      if (shiftsResponse.success) {
        // ✅ VALIDATE AND FIX STATUS INCONSISTENCIES
        console.log('🔄 ADMIN DASHBOARD: Running validation-detection-fix cycle...');
        const validationResult = await validateAndFixShiftStatuses(shiftsResponse.data);
        
        if (validationResult.needsRefresh) {
          console.log(`🔄 ADMIN DASHBOARD RE-FETCHING: ${validationResult.fixedCount} shifts fixed, getting fresh data...`);
          
          const freshShiftsResponse = await getShifts({ 
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            forceRefresh: true
          });
          
          if (freshShiftsResponse.success) {
            setAllShifts(freshShiftsResponse.data);
            setMessage(`✅ ${validationResult.fixedCount} shift status(es) corrected in Google Sheets`);
          }
        } else {
          setAllShifts(shiftsResponse.data);
        }
      }

      // Load staff list
      const staffResponse = await getStaffList();
      if (staffResponse.success) {
        setAllStaff(staffResponse.data);
      }

    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSimpleFilterTable = async () => {
    setLoading(true);
    try {
      const result = await makeAPICall({ action: 'createSimpleFilterTable' });
      setMessage(result.message);
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSetupProductionSystem = async () => {
    setLoading(true);
    try {
      const result = await makeAPICall({ action: 'setupProductionSystem' });
      setMessage(result.message);
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOldSheets = async () => {
    if (window.confirm('Are you sure you want to cleanup old sheets? This action cannot be undone.')) {
      setLoading(true);
      try {
        const result = await makeAPICall({ action: 'cleanupOldSheets' });
        setMessage(result.message);
        await loadDashboardData(); // Reload stats
      } catch (error) {
        setMessage(handleAPIError(error));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDebugSheetStructure = async () => {
    setLoading(true);
    try {
      const result = await debugSheetStructure();
      console.log('=== SHEET DEBUG RESULTS ===');
      console.log('Headers:', result.data?.headers);
      console.log('First Row:', result.data?.firstRow);
      console.log('Total Rows:', result.data?.totalRows);
      console.log('Total Columns:', result.data?.totalColumns);
      setMessage('Debug info logged to console (F12)');
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  // Download/Export Functions
  const handleExportStaffData = async () => {
    try {
      setLoading(true);
      const response = await getStaffList();
      
      if (response.success && response.data) {
        // Convert staff data to CSV format
        const csvData = convertToCSV(response.data, [
          { key: 'staffId', label: 'Employee ID' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          { key: 'department', label: 'Department' }
        ]);
        
        downloadCSV(csvData, `staff-data-${getCurrentDateString()}.csv`);
        setMessage('Staff data exported successfully!');
      } else {
        setMessage('Failed to export staff data');
      }
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleExportShiftsData = async () => {
    try {
      setLoading(true);
      
      // Get shifts for current month as default
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const response = await getShifts({
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      });
      
      if (response.success && response.data) {
        // Convert shifts data to CSV format
        const csvData = convertToCSV(response.data, [
          { key: 'Shift ID', label: 'Shift ID' },
          { key: 'Employee Name', label: 'Employee Name' },
          { key: 'Employee ID', label: 'Employee ID' },
          { key: 'Shift Date', label: 'Shift Date' },
          { key: 'Shift Type', label: 'Shift Type' },
          { key: 'First Start Time', label: 'Start Time' },
          { key: 'Last End Time', label: 'End Time' },
          { key: 'Total Duration', label: 'Total Hours' },
          { key: 'Status', label: 'Status' },
          { key: 'Number of Segments', label: 'Segments' }
        ]);
        
        downloadCSV(csvData, `shifts-data-${getCurrentDateString()}.csv`);
        setMessage(`Exported ${response.data.length} shifts successfully!`);
      } else {
        setMessage('Failed to export shifts data');
      }
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleExportAllData = async () => {
    if (!window.confirm('This will export all system data. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      setMessage('Preparing complete system export...');
      
      // Get all data
      const [staffResponse, shiftsResponse] = await Promise.all([
        getStaffList(),
        getShifts({ startDate: '2020-01-01', endDate: '2030-12-31' }) // All shifts
      ]);
      
      const exportData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          exportedBy: user?.name || 'Admin',
          version: '1.0'
        },
        staff: staffResponse.success ? staffResponse.data : [],
        shifts: shiftsResponse.success ? shiftsResponse.data : [],
        stats: stats
      };
      
      // Ask user for format preference
      const exportAsCSV = window.confirm('Export as CSV files? (Cancel for JSON backup)');
      
      if (exportAsCSV) {
        // Export as multiple CSV files
        await handleExportAllDataAsCSV(exportData);
        setMessage('Complete system data exported as CSV files!');
      } else {
        // Download as JSON for complete backup
        const jsonData = JSON.stringify(exportData, null, 2);
        downloadJSON(jsonData, `complete-backup-${getCurrentDateString()}.json`);
        setMessage('Complete system backup exported as JSON!');
      }
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleExportAllDataAsCSV = async (exportData) => {
    const dateStr = getCurrentDateString();
    
    // Export staff data as CSV
    if (exportData.staff && exportData.staff.length > 0) {
      const staffCSV = convertToCSV(exportData.staff, [
        { key: 'staffId', label: 'Employee ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'department', label: 'Department' }
      ]);
      downloadCSV(staffCSV, `staff-complete-${dateStr}.csv`);
    }
    
    // Export shifts data as CSV
    if (exportData.shifts && exportData.shifts.length > 0) {
      const shiftsCSV = convertToCSV(exportData.shifts, [
        { key: 'Shift ID', label: 'Shift ID' },
        { key: 'Employee Name', label: 'Employee Name' },
        { key: 'Employee ID', label: 'Employee ID' },
        { key: 'Shift Date', label: 'Shift Date' },
        { key: 'Shift Type', label: 'Shift Type' },
        { key: 'First Start Time', label: 'Start Time' },
        { key: 'Last End Time', label: 'End Time' },
        { key: 'Total Duration', label: 'Total Hours' },
        { key: 'Status', label: 'Status' },
        { key: 'Number of Segments', label: 'Segments' },
        { key: 'Segments Data', label: 'Segments Details' }
      ]);
      downloadCSV(shiftsCSV, `shifts-complete-${dateStr}.csv`);
    }
    
    // Export system info as CSV
    const systemInfo = [
      {
        'Export Date': exportData.exportInfo.timestamp,
        'Exported By': exportData.exportInfo.exportedBy,
        'Version': exportData.exportInfo.version,
        'Total Staff': exportData.staff ? exportData.staff.length : 0,
        'Total Shifts': exportData.shifts ? exportData.shifts.length : 0,
        'Total Active Shifts': exportData.stats?.activeShifts || 0,
        'Total Completed Shifts': exportData.stats?.completedShifts || 0,
        'Today Shifts': exportData.stats?.todayShifts || 0
      }
    ];
    
    const systemCSV = convertToCSV(systemInfo, [
      { key: 'Export Date', label: 'Export Date' },
      { key: 'Exported By', label: 'Exported By' },
      { key: 'Version', label: 'Version' },
      { key: 'Total Staff', label: 'Total Staff' },
      { key: 'Total Shifts', label: 'Total Shifts' },
      { key: 'Total Active Shifts', label: 'Total Active Shifts' },
      { key: 'Total Completed Shifts', label: 'Total Completed Shifts' },
      { key: 'Today Shifts', label: 'Today Shifts' }
    ]);
    downloadCSV(systemCSV, `system-info-${dateStr}.csv`);
    
    // Small delay between downloads to prevent browser issues
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleConvertJSONToCSV = () => {
    // Create a file input element for JSON upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        setLoading(true);
        setMessage('Converting JSON backup to CSV files...');
        
        const text = await file.text();
        const jsonData = JSON.parse(text);
        
        // Validate JSON structure
        if (!jsonData.staff && !jsonData.shifts) {
          setMessage('Invalid JSON backup file format');
          return;
        }
        
        await handleExportAllDataAsCSV(jsonData);
        setMessage('JSON backup successfully converted to CSV files!');
        
      } catch (error) {
        setMessage('Error converting JSON file: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    input.click();
  };

  // Enhanced AI Functions with Data-First Approach
  const handleEnhancedAIAnalysis = async () => {
    try {
      setAiLoading(true);
      setMessage('🤖 Fetching comprehensive data for AI analysis...');
      
      // Step 1: Get comprehensive sheet data first
      const dataResponse = await getComprehensiveSheetData();
      
      if (dataResponse.success) {
        setComprehensiveData(dataResponse.data);
        setMessage('✅ Data loaded! Processing with AI...');
        
        // Step 2: Process with AI using the comprehensive data
        const analysisResponse = await processAIPromptWithData(customPrompt, true);
        
        if (analysisResponse.success) {
          setAiResponse(analysisResponse.data.analysis);
          setLastAnalysis({
            prompt: customPrompt,
            response: analysisResponse.data.analysis,
            recommendations: analysisResponse.data.recommendations || [],
            confidence: analysisResponse.data.confidence || 95,
            processingTime: analysisResponse.data.processingTime || 0,
            dataSource: `${dataResponse.data.shiftsCount || 0} shifts, ${dataResponse.data.staffCount || 0} staff`,
            timestamp: new Date().toISOString(),
            dataSnapshot: dataResponse.data
          });
          
          setMessage('🎉 Enhanced AI analysis completed! Response displayed below.');
        } else {
          setMessage('❌ AI processing failed: ' + analysisResponse.message);
        }
      } else {
        setMessage('❌ Failed to fetch comprehensive data: ' + dataResponse.message);
      }
    } catch (error) {
      setMessage('❌ Enhanced AI analysis failed: ' + handleAPIError(error));
    } finally {
      setAiLoading(false);
    }
  };

  const handleTestBackend = async () => {
    try {
      setLoading(true);
      setMessage('🔍 Testing backend version...');
      
      const result = await testBackendVersion();
      
      if (result.isUpdated) {
        setMessage(`✅ ${result.message} Backend is up to date!`);
      } else {
        setMessage(`🚨 ${result.message} Need to deploy updated appscript.js!`);
        console.log('📋 Backend test details:', result);
      }
    } catch (error) {
      setMessage('❌ Backend test failed: ' + handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleExperimentalAI = async (experimentType) => {
    try {
      setExperimentalLoading(true);
      setMessage(`🧪 Running experimental AI: ${experimentType}...`);
      
      const response = await runExperimentalAI(experimentType, {
        includeTimeAnalysis: true,
        includePatternDetection: true,
        includePredictions: true
      });
      
      if (response.success) {
        setExperimentResults(prev => [...prev, {
          id: Date.now(),
          type: experimentType,
          result: response.data,
          timestamp: new Date().toISOString()
        }]);
        setMessage(`✅ Experimental AI completed: ${experimentType}`);
      } else {
        setMessage(`❌ Experimental AI failed: ${response.message}`);
      }
    } catch (error) {
      setMessage(`❌ Experimental AI error: ${handleAPIError(error)}`);
    } finally {
      setExperimentalLoading(false);
    }
  };

  const loadAIInsightsDashboard = async () => {
    try {
      const insightsResponse = await getAIInsightsDashboard();
      if (insightsResponse.success) {
        setAiInsights(insightsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    }
  };

  const processCustomPrompt = async (prompt, staff, shifts, systemStats) => {
    const startTime = Date.now();
    
    // Analyze the prompt to understand what the user is asking for
    const promptLower = prompt.toLowerCase();
    let response = '';
    let recommendations = [];
    let confidence = 85;

    // Active employee queries
    if (promptLower.includes('active') && (promptLower.includes('employee') || promptLower.includes('staff') || promptLower.includes('who'))) {
      const activeShifts = shifts.filter(shift => shift['Status'] === 'ACTIVE' || shift['Status'] === 'ON BREAK');
      const activeEmployees = activeShifts.map(shift => ({
        name: shift['Employee Name'],
        id: shift['Employee ID'],
        status: shift['Status'],
        startTime: shift['First Start Time'],
        currentDuration: shift['Total Duration']
      }));
      
      if (activeEmployees.length > 0) {
        response = `Currently active employees: ${activeEmployees.map(emp => 
          `${emp.name} (${emp.id}) - Status: ${emp.status}`
        ).join(', ')}. Total active: ${activeEmployees.length} employee(s). `;
        
        if (activeEmployees.some(emp => emp.status === 'ON BREAK')) {
          response += 'Some employees are currently on break. ';
        }
        
        recommendations.push('Monitor active employee workload', 'Check break schedules', 'Ensure adequate coverage');
        confidence = 95;
      } else {
        response = `No employees are currently active. All employees have completed their shifts or are offline. Recent shift statuses: ${shifts.slice(-3).map(s => `${s['Employee Name']}: ${s['Status']}`).join(', ')}. `;
        recommendations.push('Check if employees need to start shifts', 'Review schedule compliance', 'Monitor shift transitions');
        confidence = 90;
      }
    }

    // Current status queries
    else if (promptLower.includes('current') && (promptLower.includes('status') || promptLower.includes('shift') || promptLower.includes('working'))) {
      const statusBreakdown = {};
      shifts.forEach(shift => {
        const status = shift['Status'] || 'Unknown';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });
      
      const recentShifts = shifts.slice(-5);
      response = `Current shift status breakdown: ${Object.entries(statusBreakdown)
        .map(([status, count]) => `${status}: ${count}`)
        .join(', ')}. Recent activity: ${recentShifts.map(s => 
          `${s['Employee Name']}: ${s['Status']}`
        ).join(', ')}. `;
      
      recommendations.push('Review shift transitions', 'Monitor status accuracy', 'Check for stuck statuses');
      confidence = 92;
    }

    // Who is working queries
    else if ((promptLower.includes('who') && promptLower.includes('work')) || 
             (promptLower.includes('who') && promptLower.includes('shift')) ||
             (promptLower.includes('working') && promptLower.includes('now'))) {
      const workingNow = shifts.filter(shift => 
        shift['Status'] === 'ACTIVE' || shift['Status'] === 'ON BREAK'
      );
      
      if (workingNow.length > 0) {
        response = `Currently working: ${workingNow.map(shift => 
          `${shift['Employee Name']} (${shift['Status']}${shift['Total Duration'] ? `, ${shift['Total Duration']}h so far` : ''})`
        ).join(', ')}. `;
        recommendations.push('Monitor current shifts', 'Check progress', 'Ensure break compliance');
        confidence = 95;
      } else {
        response = 'No one is currently working. All employees are either offline or have completed their shifts. ';
        recommendations.push('Check schedule adherence', 'Review shift start times', 'Consider coverage needs');
        confidence = 90;
      }
    }

    // Staff-related queries
    else if (promptLower.includes('staff') || promptLower.includes('employee') || promptLower.includes('team')) {
      if (promptLower.includes('performance') || promptLower.includes('productivity')) {
        const avgShiftsPerEmployee = shifts.length / staff.length;
        const totalHours = shifts.reduce((sum, shift) => sum + getDurationFromShift(shift), 0);
        const avgHoursPerEmployee = totalHours / staff.length;
        
        response = `Staff performance analysis: You have ${staff.length} employees with an average of ${avgShiftsPerEmployee.toFixed(1)} shifts per employee. Average working hours per employee is ${avgHoursPerEmployee.toFixed(1)} hours. `;
        
        if (avgHoursPerEmployee > 40) {
          response += 'Your team shows high engagement with above-average working hours. ';
          recommendations.push('Consider workload balance to prevent burnout');
        } else if (avgHoursPerEmployee < 20) {
          response += 'Your team has relatively low working hours. ';
          recommendations.push('Consider increasing schedule availability or shifts');
        }
        
        recommendations.push('Implement regular performance reviews', 'Track individual productivity metrics');
      } else if (promptLower.includes('list') || promptLower.includes('all') || promptLower.includes('who are')) {
        const employeeList = staff.map(emp => 
          `${emp.name} (${emp.employeeId || emp.staffId}) - ${emp.role} in ${emp.department || 'General'}`
        );
        
        response = `Your team consists of: ${employeeList.join(', ')}. Total staff: ${staff.length}. `;
        
        const roleBreakdown = {};
        const deptBreakdown = {};
        staff.forEach(emp => {
          const role = emp.role || 'Staff';
          const dept = emp.department || 'Unassigned';
          roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
          deptBreakdown[dept] = (deptBreakdown[dept] || 0) + 1;
        });
        
        response += `Roles: ${Object.entries(roleBreakdown).map(([role, count]) => `${role}: ${count}`).join(', ')}. Departments: ${Object.entries(deptBreakdown).map(([dept, count]) => `${dept}: ${count}`).join(', ')}. `;
        
        recommendations.push('Ensure balanced team structure', 'Consider cross-training opportunities');
        confidence = 95;
      } else if (promptLower.includes('department') || promptLower.includes('role')) {
        const departments = {};
        const roles = {};
        
        staff.forEach(emp => {
          const dept = emp.department || 'Unassigned';
          const role = emp.role || 'Staff';
          departments[dept] = (departments[dept] || 0) + 1;
          roles[role] = (roles[role] || 0) + 1;
        });
        
        response = `Department distribution: ${Object.entries(departments).map(([dept, count]) => `${dept}: ${count}`).join(', ')}. Role distribution: ${Object.entries(roles).map(([role, count]) => `${role}: ${count}`).join(', ')}. `;
        recommendations.push('Ensure balanced department coverage', 'Consider cross-training opportunities');
      }
    }
    
    // Shift-related queries
    else if (promptLower.includes('shift') || promptLower.includes('schedule') || promptLower.includes('hours')) {
      if (promptLower.includes('overtime') || promptLower.includes('long')) {
        const longShifts = shifts.filter(shift => getDurationFromShift(shift) > 8);
        const overtimeHours = longShifts.reduce((sum, shift) => sum + (getDurationFromShift(shift) - 8), 0);
        
        response = `Overtime analysis: ${longShifts.length} shifts exceeded 8 hours, totaling ${overtimeHours.toFixed(1)} overtime hours. This represents ${((longShifts.length / shifts.length) * 100).toFixed(1)}% of all shifts. `;
        
        if (overtimeHours > 50) {
          recommendations.push('Review workload distribution to reduce overtime', 'Consider hiring additional staff');
        } else {
          recommendations.push('Current overtime levels are manageable');
        }
      } else if (promptLower.includes('pattern') || promptLower.includes('trend')) {
        const dayCount = {};
        shifts.forEach(shift => {
          const date = new Date(shift['Shift Date']);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
          dayCount[dayName] = (dayCount[dayName] || 0) + 1;
        });
        
        const mostActiveDay = Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b);
        const leastActiveDay = Object.keys(dayCount).reduce((a, b) => dayCount[a] < dayCount[b] ? a : b);
        
        response = `Shift patterns show ${mostActiveDay} as the most active day (${dayCount[mostActiveDay]} shifts) and ${leastActiveDay} as least active (${dayCount[leastActiveDay] || 0} shifts). `;
        recommendations.push('Consider balancing shifts across weekdays', 'Analyze customer/business demand patterns');
      }
    }
    
    // Time-related queries
    else if (promptLower.includes('time') || promptLower.includes('duration') || promptLower.includes('average')) {
      const totalHours = shifts.reduce((sum, shift) => sum + (parseFloat(shift['Total Duration']) || 0), 0);
      const avgShiftDuration = totalHours / shifts.length;
      const shortShifts = shifts.filter(shift => parseFloat(shift['Total Duration']) < 6);
      const longShifts = shifts.filter(shift => parseFloat(shift['Total Duration']) > 10);
      
      response = `Time analysis: Average shift duration is ${avgShiftDuration.toFixed(1)} hours. ${shortShifts.length} shifts under 6 hours, ${longShifts.length} shifts over 10 hours. Total tracked time: ${totalHours.toFixed(1)} hours. `;
      recommendations.push('Optimize shift lengths for productivity', 'Monitor fatigue levels in long shifts');
    }
    
    // Default analysis for unclear prompts
    else {
      response = `I analyzed your prompt "${prompt}". Your system has ${staff.length} staff members and ${shifts.length} total shifts. `;
      
      // Try to provide something useful based on current data
      const activeCount = shifts.filter(s => s['Status'] === 'ACTIVE').length;
      const completedCount = shifts.filter(s => s['Status'] === 'COMPLETED').length;
      
      response += `Current status: ${activeCount} active shifts, ${completedCount} completed shifts. `;
      
      if (promptLower.includes('improve') || promptLower.includes('optimize')) {
        recommendations.push('Implement regular data review cycles', 'Use AI analytics for pattern recognition', 'Consider staff feedback in scheduling');
      } else if (promptLower.includes('problem') || promptLower.includes('issue')) {
        recommendations.push('Review anomaly detection reports', 'Check for scheduling conflicts', 'Monitor overtime levels');
      } else {
        recommendations.push('Try asking: "who is currently working?", "show me active employees", "staff performance", "overtime analysis"');
      }
      confidence = 70;
    }
    
    // Add contextual insights
    if (promptLower.includes('recommendation') || promptLower.includes('suggest')) {
      confidence = 92;
      response += 'Key recommendations based on your data patterns: ';
    }
    
    if (response === '') {
      response = `I couldn't find specific information for "${prompt}". Try asking about: active employees, current shifts, staff performance, or specific employee names.`;
      recommendations.push('Use specific keywords like "active employees", "who is working", "staff list", or employee names');
      confidence = 50;
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      response: response.trim(),
      recommendations: recommendations.length > 0 ? recommendations : ['Continue monitoring your workforce metrics'],
      confidence,
      processingTime
    };
  };

  // Helper function to convert data to CSV
  const convertToCSV = (data, columns) => {
    if (!data || data.length === 0) return '';
    
    // Create header row
    const headers = columns.map(col => col.label).join(',');
    
    // Create data rows
    const rows = data.map(item => {
      return columns.map(col => {
        const value = item[col.key] || '';
        // Escape commas and quotes in CSV
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });
    
    return [headers, ...rows].join('\n');
  };

  // Helper function to download CSV
  const downloadCSV = (csvData, filename) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to download JSON
  const downloadJSON = (jsonData, filename) => {
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to get current date string
  const getCurrentDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // AI Analysis Helper Functions
  const generateShiftAnalysis = (shifts) => {
    const totalShifts = shifts.length;
    const totalHours = shifts.reduce((sum, shift) => sum + (parseFloat(shift['Total Duration']) || 0), 0);
    const avgDuration = totalShifts > 0 ? (totalHours / totalShifts).toFixed(1) : 0;
    
    // Analyze day patterns
    const dayCount = {};
    const hourCount = {};
    let overtimeHours = 0;
    
    shifts.forEach(shift => {
      const date = new Date(shift['Shift Date']);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      dayCount[dayName] = (dayCount[dayName] || 0) + 1;
      
      const startTime = shift['First Start Time'];
      if (startTime) {
        const hour = new Date(startTime).getHours();
        hourCount[hour] = (hourCount[hour] || 0) + 1;
      }
      
      const duration = parseFloat(shift['Total Duration']) || 0;
      if (duration > 8) {
        overtimeHours += duration - 8;
      }
    });
    
    const mostActiveDay = Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b, 'Monday');
    const peakHour = Object.keys(hourCount).reduce((a, b) => hourCount[a] > hourCount[b] ? a : b, '9');
    const peakHours = `${peakHour}:00 - ${parseInt(peakHour) + 1}:00`;
    
    // Generate AI score and recommendations
    const patternScore = Math.min(100, Math.round(
      (totalShifts > 10 ? 30 : totalShifts * 3) +
      (avgDuration >= 7 && avgDuration <= 9 ? 25 : 10) +
      (overtimeHours < totalHours * 0.1 ? 25 : 10) +
      (Object.keys(dayCount).length >= 5 ? 20 : Object.keys(dayCount).length * 4)
    ));
    
    const recommendations = [];
    if (avgDuration > 9) recommendations.push('Consider reducing average shift length');
    if (overtimeHours > totalHours * 0.15) recommendations.push('High overtime detected - review workload distribution');
    if (Object.keys(dayCount).length < 5) recommendations.push('Increase schedule diversity across weekdays');
    if (patternScore > 80) recommendations.push('Excellent shift patterns - maintain current scheduling');
    
    return {
      totalShifts,
      avgDuration,
      mostActiveDay,
      peakHours,
      overtimeHours: overtimeHours.toFixed(1),
      patternScore,
      recommendations: recommendations.length > 0 ? recommendations : ['Schedule patterns are within normal parameters']
    };
  };

  const generateProductivityInsights = (staff, shifts) => {
    return staff.map(employee => {
      const employeeShifts = shifts.filter(shift => 
        shift['Employee ID'] === employee.staffId || shift['Employee ID'] === employee.employeeId
      );
      
      const totalShifts = employeeShifts.length;
      const totalHours = employeeShifts.reduce((sum, shift) => sum + (parseFloat(shift['Total Duration']) || 0), 0);
      const avgShiftLength = totalShifts > 0 ? (totalHours / totalShifts).toFixed(1) : 0;
      
      // Calculate on-time percentage
      const onTimeShifts = employeeShifts.filter(shift => shift['Status'] !== 'DRAFT').length;
      const onTimePercentage = totalShifts > 0 ? Math.round((onTimeShifts / totalShifts) * 100) : 0;
      
      // Generate productivity score
      const productivityScore = Math.min(100, Math.round(
        (onTimePercentage * 0.4) +
        (totalShifts > 20 ? 30 : totalShifts * 1.5) +
        (avgShiftLength >= 7 && avgShiftLength <= 9 ? 30 : 15)
      ));
      
      const recentShifts = employeeShifts.slice(-10);
      const earlierShifts = employeeShifts.slice(-20, -10);
      const trend = recentShifts.length > earlierShifts.length ? 'Increasing' : 
                   recentShifts.length < earlierShifts.length ? 'Decreasing' : 'Stable';
      
      const suggestions = [];
      if (onTimePercentage < 90) suggestions.push('Focus on improving punctuality');
      if (totalShifts < 15) suggestions.push('Consider increasing shift frequency');
      if (avgShiftLength > 10) suggestions.push('Monitor for potential burnout');
      if (productivityScore > 90) suggestions.push('Excellent performance - consider leadership opportunities');
      
      return {
        employeeId: employee.staffId || employee.employeeId,
        name: employee.name,
        totalShifts,
        totalHours: totalHours.toFixed(1),
        avgShiftLength,
        onTimePercentage,
        productivityScore,
        department: employee.department || 'Unassigned',
        trend,
        suggestions: suggestions.length > 0 ? suggestions : ['Performance is within expected parameters']
      };
    });
  };

  const detectShiftAnomalies = (shifts) => {
    const anomalies = [];
    const avgDuration = shifts.reduce((sum, shift) => sum + (parseFloat(shift['Total Duration']) || 0), 0) / shifts.length;
    const stdDev = Math.sqrt(
      shifts.reduce((sum, shift) => {
        const duration = parseFloat(shift['Total Duration']) || 0;
        return sum + Math.pow(duration - avgDuration, 2);
      }, 0) / shifts.length
    );
    
    shifts.forEach(shift => {
      const duration = parseFloat(shift['Total Duration']) || 0;
      const shiftDate = new Date(shift['Shift Date']);
      const dayOfWeek = shiftDate.getDay();
      
      // Detect unusual duration
      if (Math.abs(duration - avgDuration) > 2 * stdDev && duration > 0) {
        anomalies.push({
          shiftId: shift['Shift ID'],
          employeeName: shift['Employee Name'],
          date: shift['Shift Date'],
          type: duration > avgDuration ? 'Unusually Long Shift' : 'Unusually Short Shift',
          severity: Math.abs(duration - avgDuration) > 3 * stdDev ? 'High' : 'Medium',
          description: `Shift duration ${duration}h deviates significantly from average ${avgDuration.toFixed(1)}h`,
          expected: `${avgDuration.toFixed(1)}h`,
          actual: `${duration}h`,
          confidence: Math.min(95, Math.round(Math.abs(duration - avgDuration) / stdDev * 30)),
          recommendation: duration > avgDuration + 2 * stdDev ? 'Review workload and break times' : 'Investigate reason for short shift'
        });
      }
      
      // Detect weekend work patterns
      if ((dayOfWeek === 0 || dayOfWeek === 6) && duration > 6) {
        anomalies.push({
          shiftId: shift['Shift ID'],
          employeeName: shift['Employee Name'],
          date: shift['Shift Date'],
          type: 'Weekend Long Shift',
          severity: 'Medium',
          description: 'Extended work on weekend detected',
          expected: 'Reduced weekend hours',
          actual: `${duration}h on ${dayOfWeek === 0 ? 'Sunday' : 'Saturday'}`,
          confidence: 75,
          recommendation: 'Consider workload distribution to reduce weekend overtime'
        });
      }
    });
    
    return anomalies;
  };

  const generateScheduleSuggestions = (staff, recentShifts) => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const weekStart = nextWeek.toISOString().split('T')[0];
    
    return staff.map(employee => {
      const employeeShifts = recentShifts.filter(shift => 
        shift['Employee ID'] === employee.staffId || shift['Employee ID'] === employee.employeeId
      );
      
      const dayFrequency = {};
      const avgDuration = employeeShifts.reduce((sum, shift) => sum + (parseFloat(shift['Total Duration']) || 0), 0) / employeeShifts.length || 8;
      
      employeeShifts.forEach(shift => {
        const date = new Date(shift['Shift Date']);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        dayFrequency[dayName] = (dayFrequency[dayName] || 0) + 1;
      });
      
      const preferredDays = Object.keys(dayFrequency)
        .sort((a, b) => dayFrequency[b] - dayFrequency[a])
        .slice(0, 3);
      
      const suggestedDays = preferredDays.length > 0 ? preferredDays : ['Monday', 'Wednesday', 'Friday'];
      const optimalHours = Math.round(Math.max(6, Math.min(10, avgDuration)));
      const reasoning = `Based on ${employeeShifts.length} recent shifts, employee shows strong performance on ${suggestedDays[0]}`;
      
      return {
        weekStart,
        employeeId: employee.staffId || employee.employeeId,
        employeeName: employee.name,
        suggestedDays,
        optimalHours: `${optimalHours} hours`,
        reasoning,
        productivityBoost: Math.round(5 + Math.random() * 15),
        workloadBalance: employeeShifts.length > 15 ? 'High' : employeeShifts.length > 8 ? 'Medium' : 'Light',
        departmentCoverage: employee.department || 'General',
        confidence: Math.round(70 + Math.random() * 25)
      };
    });
  };

  // Calculate date range based on selected time period
  const getDateRangeForPeriod = (period, customRange = customDateRange) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    switch (period) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Include full week (Sun-Sat)
        return { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
        return { start: monthStart.toISOString().split('T')[0], end: monthEnd.toISOString().split('T')[0] };
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0);
        return { start: quarterStart.toISOString().split('T')[0], end: quarterEnd.toISOString().split('T')[0] };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        return { start: yearStart.toISOString().split('T')[0], end: yearEnd.toISOString().split('T')[0] };
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(today.getDate() - 6);
        return { start: last7.toISOString().split('T')[0], end: todayStr };
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(today.getDate() - 29);
        return { start: last30.toISOString().split('T')[0], end: todayStr };
      case 'custom':
        return customRange;
      case 'monthlyTotalPerEmployee':
        // Logic: Get current month range
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: startOfMonth.toISOString().split('T')[0], end: endOfMonth.toISOString().split('T')[0] };
      case 'allTimeData':
        // Logic: Show all data from earliest to far future
        return { start: '2020-01-01', end: '2030-12-31' };
      default:
        return { start: todayStr, end: todayStr };
    }
  };

  // Load shifts data based on selected period
  const handleViewShiftsData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRangeForPeriod(shiftsTimePeriod, shiftsCustomDateRange);
      
      const response = await makeAPICall({
        action: 'getAllShiftsForAdmin',
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      
      if (response.success) {
        // ✅ VALIDATE AND FIX STATUS INCONSISTENCIES BEFORE PROCESSING
        console.log('🔄 ADMIN SHIFTS TAB: Running validation-detection-fix cycle...');
        const validationResult = await validateAndFixShiftStatuses(response.data);
        
        let dataToProcess = response.data;
        
        if (validationResult.needsRefresh) {
          console.log(`🔄 ADMIN SHIFTS TAB RE-FETCHING: ${validationResult.fixedCount} shifts fixed, getting fresh data...`);
          
          const freshResponse = await makeAPICall({
            action: 'getAllShiftsForAdmin',
            startDate: dateRange.start,
            endDate: dateRange.end,
            forceRefresh: true
          });
          
          if (freshResponse.success) {
            dataToProcess = freshResponse.data;
            setMessage(`✅ ${validationResult.fixedCount} shift status(es) corrected and ${freshResponse.data.length} shifts loaded`);
          }
        }
        
        // Hold raw data for debugging, and normalized data for display
        setRawShiftsData(dataToProcess);
        console.log('=== DEBUG: Backend Response ===');
        console.log('Raw data length:', dataToProcess.length);
        if (dataToProcess.length > 0) {
          console.log('First record keys:', Object.keys(dataToProcess[0]));
          console.log('First record:', dataToProcess[0]);
        }
        
        // Apply smart status calculation to each record
        const normalizedData = [];
        const statusUpdates = [];
        
        console.log('🚀 Starting normalization loop for', dataToProcess.length, 'records');
        
        try {
          for (const rec of dataToProcess) {
            console.log('📝 Processing record:', rec['Shift ID']);
            
            try {
              const normalized = await normalizeRecord(rec);
              normalizedData.push(normalized);
              
              // DETAILED DEBUG: Check every field of normalized record
              console.log('🔍 === NORMALIZED RECORD COMPLETE DEBUG ===');
              console.log('Shift ID:', normalized['Shift ID']);
              console.log('Original Status:', normalized['_originalStatus']);
              console.log('Smart Status:', normalized['_smartStatus']);
              console.log('Status Calculated Flag:', normalized['_statusCalculated']);
              console.log('Current Status Field:', normalized['Status']);
              console.log('===========================================');
              
              // If status was calculated differently, prepare for backend sync
              if (normalized['_statusCalculated']) {
                console.log('✅ STATUS UPDATE NEEDED - Adding to status updates array');
                statusUpdates.push({
                  shiftId: normalized['Shift ID'],
                  oldStatus: normalized['_originalStatus'],
                  newStatus: normalized['_smartStatus']
                });
                console.log('🎯 Current statusUpdates array length:', statusUpdates.length);
              } else {
                console.log('⏭️ No status update needed for this record');
              }
            } catch (recordError) {
              console.error('❌ Error processing record:', rec['Shift ID'], recordError);
              // Add the record without normalization as fallback
              normalizedData.push(rec);
            }
          }
        } catch (loopError) {
          console.error('❌ Error in normalization loop:', loopError);
        }
        
        console.log('🎯 === NORMALIZATION LOOP COMPLETED ===');
        console.log('Normalized data count:', normalizedData.length);
        console.log('Status updates count:', statusUpdates.length);
        
        console.log('=== DEBUG: After Smart Status Calculation ===');
        if (normalizedData.length > 0) {
          console.log('Normalized first record:', normalizedData[0]);
        }
        
        console.log('🔍 Status updates array:', statusUpdates);
        console.log('📊 Status updates count:', statusUpdates.length);
        
        if (statusUpdates.length > 0) {
          console.log('=== Status Updates Needed ===');
          console.log(statusUpdates);
          
          // Sync status updates with backend
          for (const update of statusUpdates) {
            console.log(`🚀 Processing update for shift ${update.shiftId}:`, update);
            await syncStatusWithBackend({
              'Shift ID': update.shiftId,
              'Status': update.oldStatus
            }, update.newStatus);
          }
        } else {
          console.log('⭐ No status updates needed - all statuses match');
        }
        
        setShiftsData(normalizedData);
        setShowShiftsTable(true);
        
        if (!validationResult.needsRefresh) {
          setMessage(`Loaded ${dataToProcess.length} shifts for ${timePeriodOptions.find(o => o.value === shiftsTimePeriod)?.label}`);
        }
      } else {
        setError(response.message || 'Failed to fetch shifts data.');
      }
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  // Apply column filters for shifts
  const getFilteredShiftsData = () => {
    let filtered = [...shiftsData];
    
    // Apply column filters
    Object.keys(shiftsColumnFilters).forEach(column => {
      const filterValue = shiftsColumnFilters[column];
      if (filterValue) {
        filtered = filtered.filter(row => 
          String(row[column] || '').toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        // Handle different data types
        if (sortConfig.key === 'shiftDate') {
          const aDate = new Date(aVal);
          const bDate = new Date(bVal);
          return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
        } else if (sortConfig.key === 'startTime' || sortConfig.key === 'endTime') {
          const aTime = aVal ? aVal.split(':').map(Number) : [0, 0];
          const bTime = bVal ? bVal.split(':').map(Number) : [0, 0];
          const aMinutes = aTime[0] * 60 + aTime[1];
          const bMinutes = bTime[0] * 60 + bTime[1];
          return sortConfig.direction === 'asc' ? aMinutes - bMinutes : bMinutes - aMinutes;
        } else if (sortConfig.key === 'totalTime') {
          const aNum = parseFloat(aVal) || 0;
          const bNum = parseFloat(bVal) || 0;
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        } else {
          // String comparison
          const aStr = String(aVal || '').toLowerCase();
          const bStr = String(bVal || '').toLowerCase();
          if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
      });
    }
    
    return filtered;
  };

  // Handle sorting
  const handleSort = (columnKey) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Format data for display
  const formatCellData = (value, columnKey, row = {}) => {
    if (!value && value !== 0) return '-';
    
    switch (columnKey) {
      case 'employeeName':
        // Ensure employee names are properly formatted and not showing IDs
        if (typeof value === 'string') {
          // If it looks like an ID (starts with EMP or is just numbers), it might be misplaced data
          if (value.match(/^(EMP|emp)\d+$/i) || value.match(/^\d+$/)) {
            return `[ID: ${value}]`; // Mark as potentially misplaced ID
          }
          return value.trim() || '-';
        }
        return value || '-';
        
      case 'employeeID':
        // Format employee ID consistently and detect if it's actually a name
        if (typeof value === 'string') {
          // If it contains spaces or common name patterns, it might be misplaced data
          if (value.includes(' ') || value.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/)) {
            return `[Name: ${value}]`; // Mark as potentially misplaced name
          }
          return value.trim() || '-';
        }
        return value || '-';
        
      case 'shiftType':
        // Handle shift type formatting
        if (typeof value === 'string') {
          // Capitalize first letter
          const clean = value.trim();
          if (!clean) return '-';
          return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
        }
        return value || '-';
        
      case 'startTime':
      case 'endTime':
      case 'First Start Time':
      case 'Last End Time':
        // Format time from various formats to HH:MM
        if (typeof value === 'string') {
          // If it looks like a shift type instead of time, hide it (normalizer should have moved it)
          if (/^(regular|overtime|night|day|evening)$/i.test(value.trim())) {
            return '-';
          }
          // Handle ISO timestamp format (e.g., "1899-12-30T03:26:50.000Z")
          if (value.includes('T') || value.includes('Z')) {
            try {
              const date = new Date(value);
              if (isNaN(date.getTime())) return value;
              // For time-only display, extract just the time part in user's local timezone
              return date.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit'
                // No timeZone specified = automatic system timezone detection
              });
            } catch (error) {
              return value;
            }
          }
          // Handle HH:MM format
          if (value.match(/^\d{1,2}:\d{2}$/)) {
            return value;
          }
          // Handle other time formats
          if (value.includes(':')) {
            return value.split(':').slice(0, 2).join(':');
          }
        }
        return value;
        
      case 'Shift Date':
      case 'shiftDate':
        // Format date from ISO string to readable format
        if (typeof value === 'string') {
          // Handle ISO date format (e.g., "2025-10-07T18:30:00.000Z")
          if (value.includes('T') || value.includes('Z') || value.match(/^\d{4}-\d{2}-\d{2}/)) {
            try {
              const date = new Date(value);
              if (isNaN(date.getTime())) return value;
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
                // No timeZone specified = automatic system timezone detection
              });
            } catch (error) {
              return value;
            }
          }
          // Already formatted date
          return value;
        }
        return value;
        
      case 'Created At':
      case 'Last Updated':
        // Format timestamp from ISO string to readable format
        if (typeof value === 'string') {
          // Handle ISO timestamp format (e.g., "2025-10-08T08:18:28.807Z")
          if (value.includes('T') || value.includes('Z') || value.match(/^\d{4}-\d{2}-\d{2}/)) {
            try {
              const date = new Date(value);
              
              // Check for invalid or bogus dates (like 1899 Excel epoch)
              if (isNaN(date.getTime()) || date.getFullYear() < 2020) {
                return 'Invalid Date';
              }
              
              return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
                // No timeZone specified = automatic system timezone detection
              });
            } catch (error) {
              return 'Invalid Date';
            }
          }
          // Already formatted date
          return value;
        }
        return value;
        
      case 'totalTime':
      case 'Total Duration':
        // Format total time as hours with fallback to segments data
        if (!row) {
          console.warn('formatCellData: No row data available for Total Duration');
          return typeof value === 'number' && value > 0 ? `${value.toFixed(1)}h` : '-';
        }
        
        const duration = getDurationFromShift(row);
        return duration > 0 ? `${duration.toFixed(1)}h` : '-';
        
      case 'Number of Segments':
      case 'numberOfSegments':
        // Format segment count
        if (typeof value === 'number') {
          return value.toString();
        }
        if (typeof value === 'string' && !isNaN(parseInt(value))) {
          return parseInt(value).toString();
        }
        return value || '0';
        
      case 'segments':
      case 'Segments Data':
        // Format segments count or description
        if (typeof value === 'string') {
          // If it's JSON-like string with segment data, try to parse and count
          if (value.includes('segmentId') || value.includes('startTime') || value.includes('endTime')) {
            try {
              // Try to count segments in JSON string
              const segmentMatches = value.match(/"segmentId":/g) || value.match(/segmentId/g);
              if (segmentMatches) {
                const count = segmentMatches.length;
                return `${count} segment${count !== 1 ? 's' : ''}`;
              }
              // Try to parse as JSON array
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                return `${parsed.length} segment${parsed.length !== 1 ? 's' : ''}`;
              }
              return '1 segment';
            } catch (error) {
              // If parsing fails, try to count brackets or other indicators
              const bracketCount = (value.match(/{/g) || []).length;
              if (bracketCount > 0) {
                return `${bracketCount} segment${bracketCount !== 1 ? 's' : ''}`;
              }
              return '1 segment';
            }
          }
          // If it's a timestamp, show segment count instead
          if (value.includes('T') || value.includes('Z')) {
            return '1 segment';
          }
          // If it's already formatted, return as is
          if (value.includes('segment')) {
            return value;
          }
          // If it's a number string, format it
          if (!isNaN(parseInt(value))) {
            const count = parseInt(value);
            return `${count} segment${count !== 1 ? 's' : ''}`;
          }
          // Handle other string formats
          if (value.trim() === '' || value === 'null' || value === 'undefined') {
            return '0 segments';
          }
          // For any other string, assume it's 1 segment
          return '1 segment';
        }
        if (Array.isArray(value)) {
          return `${value.length} segment${value.length !== 1 ? 's' : ''}`;
        }
        if (typeof value === 'number') {
          return `${value} segment${value !== 1 ? 's' : ''}`;
        }
        return value || '0 segments';
        
      case 'lastUpdate':
        // Format last update timestamp
        if (typeof value === 'string' && (value.includes('T') || value.includes('Z'))) {
          try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            const now = new Date();
            const diffHours = (now - date) / (1000 * 60 * 60);
            
            if (diffHours < 1) {
              return 'Just now';
            } else if (diffHours < 24) {
              return `${Math.floor(diffHours)}h ago`;
            } else {
              return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          } catch (error) {
            return value;
          }
        }
        return value;
        
      case 'shiftDate':
        // Format date consistently
        if (typeof value === 'string') {
          try {
            // Handle various date formats
            if (value.includes('/')) {
              const date = new Date(value);
              return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
            }
            if (value.includes('-') && value.length === 10) {
              return value; // Already in YYYY-MM-DD format
            }
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('en-CA');
            }
          } catch (error) {
            return value;
          }
        }
        return value;
        
      case 'comments':
        // Format and display comments properly
        if (!value || value === '' || value === null || value === undefined) {
          return '-';
        }
        if (typeof value === 'string') {
          // Clean up any weird formatting
          const cleanComment = value.trim();
          if (cleanComment === '' || cleanComment === 'undefined' || cleanComment === 'null') {
            return '-';
          }
          // Limit comment length for table display
          if (cleanComment.length > 25) {
            return cleanComment.substring(0, 22) + '...';
          }
          return cleanComment;
        }
        return value || '-';
        
      case 'segmentCount':
        // Format segment count
        if (typeof value === 'number') {
          return `${value} segment${value !== 1 ? 's' : ''}`;
        }
        if (typeof value === 'string' && !isNaN(parseInt(value))) {
          const count = parseInt(value);
          return `${count} segment${count !== 1 ? 's' : ''}`;
        }
        return value || '0 segments';
        
      case 'initialSegmentData':
        // Format initial segment data
        if (typeof value === 'string' && value.includes('{')) {
          return 'Initial data';
        }
        return value || '-';
        
      case 'Updated':
        // Format updated flag
        if (value === 'Yes' || value === true || value === 'TRUE' || value === 'true') {
          return '✅ Yes';
        }
        if (value === 'No' || value === false || value === 'FALSE' || value === 'false') {
          return '❌ No';
        }
        return value || '-';
        
      case 'Time Zone':
        // Format timezone display
        if (!value || value === 'Not Set' || value === '') {
          return '🌍 Not Set';
        }
        return `🌍 ${value}`;
        
      case 'Status':
        // Enhanced status display with smart status indicators
        const isCalculated = value !== undefined && typeof value === 'object' && value._statusCalculated;
        const displayStatus = isCalculated ? value._smartStatus : value;
        const originalStatus = isCalculated ? value._originalStatus : value;
        
        if (isCalculated && displayStatus !== originalStatus) {
          return (
            <span>
              <span className={`badge ${
                displayStatus === 'ACTIVE' ? 'bg-success' :
                displayStatus === 'COMPLETED' ? 'bg-primary' :
                displayStatus === 'OFFLINE' ? 'bg-secondary' :
                'bg-warning'
              }`}>
                {displayStatus}
              </span>
              <small className="text-muted ms-1">📊</small>
            </span>
          );
        }
        
        return (
          <span className={`badge ${
            displayStatus === 'ACTIVE' ? 'bg-success' :
            displayStatus === 'COMPLETED' ? 'bg-primary' :
            displayStatus === 'OFFLINE' ? 'bg-secondary' :
            'bg-warning'
          }`}>
            {displayStatus || 'DRAFT'}
          </span>
        );
        
      case 'id':
        // Format shift ID for better display
        if (typeof value === 'string' && value.length > 10) {
          return value.substring(0, 8) + '...';
        }
        return value || '-';
        
      case 'timeStamp':
        // Format creation timestamp
        if (typeof value === 'string' && (value.includes('T') || value.includes('Z'))) {
          try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch (error) {
            return value;
          }
        }
        return value || '-';
        
      case 'rowIndex':
        // Display sheet row number
        return `Row ${value}`;
        
      default:
        return value || '-';
    }
  };

  // Handle edit shift
  const handleEditShift = (shift) => {
    setEditingShift(shift['Shift ID']);
    setEditFormData({
      'Employee ID': shift['Employee ID'],
      'Employee Name': shift['Employee Name'],
      'Shift Date': shift['Shift Date'],
      'Shift Type': shift['Shift Type'],
      'First Start Time': shift['First Start Time'],
      'Last End Time': shift['Last End Time'],
      'Status': shift['Status'],
      'Comments': shift['Comments'] || ''
    });
  };

  // Save edited shift
  const handleSaveEdit = async (shiftId) => {
    setLoading(true);
    try {
      console.log('=== SAVING SHIFT EDIT ===');
      console.log('Shift ID:', shiftId);
      console.log('Edit Form Data:', editFormData);
      
      // Create proper timestamp in the format: 2025-10-10 16:12:26
      const now = new Date();
      const fullTimestamp = now.getFullYear() + '-' + 
                           String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(now.getDate()).padStart(2, '0') + ' ' + 
                           String(now.getHours()).padStart(2, '0') + ':' + 
                           String(now.getMinutes()).padStart(2, '0') + ':' + 
                           String(now.getSeconds()).padStart(2, '0');
      
      // Prepare the update data in the format the backend expects
      const updateData = {
        shiftId: shiftId,
        updates: {
          employeeName: editFormData['Employee Name'],
          employeeID: editFormData['Employee ID'],
          shiftDate: editFormData['Shift Date'],
          shiftType: editFormData['Shift Type'],
          startTime: editFormData['First Start Time'],  // Map to backend field
          endTime: editFormData['Last End Time'],       // Map to backend field
          status: editFormData['Status'],
          lastUpdated: fullTimestamp  // Send full timestamp from frontend
        }
      };
      
      console.log('Formatted update data:', updateData);
      console.log('Full timestamp being sent:', fullTimestamp);
      
      // Use the correct API call that matches backend
      const response = await makeAPICall({
        action: 'updateShiftAsAdmin',
        ...updateData
      });
      
      console.log('Update response:', response);
      
      if (response.success) {
        setMessage('Shift updated successfully');
        setEditingShift(null);
        setEditFormData({});
        // Reload shifts data to show changes
        await handleViewShiftsData();
      } else {
        setMessage(response.message || 'Failed to update shift');
        console.error('Update failed:', response);
      }
    } catch (error) {
      console.error('Update error:', error);
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingShift(null);
    setEditFormData({});
  };

  // Delete shift
  const handleDeleteShift = async (shiftId, employeeName) => {
    if (window.confirm(`Are you sure you want to delete this shift for ${employeeName}? This action cannot be undone.`)) {
      setLoading(true);
      try {
        const response = await makeAPICall({
          action: 'deleteShiftAsAdmin',
          shiftId: shiftId
        });
        
        if (response.success) {
          setMessage('Shift deleted successfully');
          // Reload shifts data
          await handleViewShiftsData();
        } else {
          setMessage(response.message || 'Failed to delete shift');
        }
      } catch (error) {
        setMessage(handleAPIError(error));
      } finally {
        setLoading(false);
      }
    }
  };

  // Load overview data based on selected period with smart status sync
  const handleViewData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRangeForPeriod(selectedTimePeriod);
      
      console.log('🔍 === ADMIN OVERVIEW DEBUG ===');
      console.log('Selected time period:', selectedTimePeriod);
      console.log('Date range calculated:', dateRange);
      console.log('Date range start:', dateRange.start);
      console.log('Date range end:', dateRange.end);
      console.log('Today is:', new Date().toISOString().split('T')[0]);
      console.log('Your data has dates: 2025-10-22, 2025-10-13');
      console.log('===============================');
      
      const response = await makeAPICall({
        action: 'getAllShiftsForAdmin',
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      
      if (response.success) {
        // ✅ VALIDATE AND FIX STATUS INCONSISTENCIES BEFORE PROCESSING
        console.log('🔄 ADMIN OVERVIEW TAB: Running validation-detection-fix cycle...');
        const validationResult = await validateAndFixShiftStatuses(response.data);
        
        let dataToProcess = response.data;
        
        if (validationResult.needsRefresh) {
          console.log(`🔄 ADMIN OVERVIEW TAB RE-FETCHING: ${validationResult.fixedCount} shifts fixed, getting fresh data...`);
          
          const freshResponse = await makeAPICall({
            action: 'getAllShiftsForAdmin',
            startDate: dateRange.start,
            endDate: dateRange.end,
            forceRefresh: true
          });
          
          if (freshResponse.success) {
            dataToProcess = freshResponse.data;
            setMessage(`✅ ${validationResult.fixedCount} shift status(es) corrected and ${freshResponse.data.length} shifts loaded`);
          }
        }
        
        console.log('🔍 === OVERVIEW SECTION: Smart Status Processing ===');
        console.log('Overview data received:', dataToProcess.length, 'records');
        
        // Apply smart status calculation and sync with backend
        const normalizedData = [];
        const statusUpdates = [];
        
        console.log('🚀 Starting overview normalization loop for', dataToProcess.length, 'records');
        
        try {
          for (const rec of dataToProcess) {
            console.log('📝 Overview processing record:', rec['Shift ID']);
            
            try {
              const normalized = await normalizeRecord(rec);
              normalizedData.push(normalized);
              
              // DETAILED DEBUG: Check every field of normalized record
              console.log('🔍 === OVERVIEW NORMALIZED RECORD DEBUG ===');
              console.log('Shift ID:', normalized['Shift ID']);
              console.log('Original Status:', normalized['_originalStatus']);
              console.log('Smart Status:', normalized['_smartStatus']);
              console.log('Status Calculated Flag:', normalized['_statusCalculated']);
              console.log('Current Status Field:', normalized['Status']);
              console.log('=============================================');
              
              // If status was calculated differently, prepare for backend sync
              if (normalized['_statusCalculated']) {
                console.log('✅ OVERVIEW STATUS UPDATE NEEDED - Adding to status updates array');
                statusUpdates.push({
                  shiftId: normalized['Shift ID'],
                  oldStatus: normalized['_originalStatus'],
                  newStatus: normalized['_smartStatus']
                });
                console.log('🎯 Current overview statusUpdates array length:', statusUpdates.length);
              } else {
                console.log('⏭️ No overview status update needed for this record');
              }
            } catch (recordError) {
              console.error('❌ Error processing overview record:', rec['Shift ID'], recordError);
              // Add the record without normalization as fallback
              normalizedData.push(rec);
            }
          }
        } catch (loopError) {
          console.error('❌ Error in overview normalization loop:', loopError);
        }
        
        console.log('🎯 === OVERVIEW NORMALIZATION LOOP COMPLETED ===');
        console.log('Overview normalized data count:', normalizedData.length);
        console.log('Overview status updates count:', statusUpdates.length);
        
        console.log('🔍 Overview status updates array:', statusUpdates);
        console.log('📊 Overview status updates count:', statusUpdates.length);
        
        if (statusUpdates.length > 0) {
          console.log('=== Overview Status Updates Needed ===');
          console.log(statusUpdates);
          
          // Sync status updates with backend
          for (const update of statusUpdates) {
            console.log(`🚀 Processing overview update for shift ${update.shiftId}:`, update);
            await syncStatusWithBackend({
              'Shift ID': update.shiftId,
              'Status': update.oldStatus
            }, update.newStatus);
          }
        } else {
          console.log('⭐ No overview status updates needed - all statuses match');
        }
        
        setOverviewData(normalizedData);
        setShowOverviewTable(true);
        setMessage(`Loaded ${response.data.length} shifts for ${timePeriodOptions.find(o => o.value === selectedTimePeriod)?.label}${statusUpdates.length > 0 ? ` (${statusUpdates.length} status updates synced)` : ''}`);
      } else {
        setMessage(response.message || 'Failed to load data');
      }
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  // Apply column filters
  const getFilteredData = () => {
    let filtered = [...overviewData];
    
    Object.keys(columnFilters).forEach(column => {
      const filterValue = columnFilters[column];
      if (filterValue) {
        filtered = filtered.filter(row => 
          String(row[column] || '').toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });
    
    return filtered;
  };

  // Staff Management Functions
  const handleAddStaff = () => {
    setNewStaffData({
      employeeId: '',
      name: '',
      email: '',
      role: 'Staff',
      department: ''
    });
    setShowAddStaffModal(true);
  };

  const handleSaveNewStaff = async () => {
    if (!newStaffData.name || !newStaffData.email || !newStaffData.employeeId) {
      setMessage('Please fill in all required fields (Name, Email, Employee ID)');
      return;
    }

    setLoading(true);
    try {
      const response = await makeAPICall({
        action: 'addStaff',
        staffData: newStaffData
      });

      if (response.success) {
        setMessage('Staff member added successfully!');
        setShowAddStaffModal(false);
        await loadDashboardData(); // Reload staff list
      } else {
        setMessage(response.message || 'Failed to add staff member');
      }
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEditStaff = (staff) => {
    setEditingStaff({ ...staff });
  };

  const handleSaveStaffEdit = async () => {
    if (!editingStaff.name || !editingStaff.email) {
      setMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await makeAPICall({
        action: 'updateStaff',
        staffId: editingStaff.staffId,
        staffData: editingStaff
      });

      if (response.success) {
        setMessage('Staff member updated successfully!');
        setEditingStaff(null);
        await loadDashboardData(); // Reload staff list
      } else {
        setMessage(response.message || 'Failed to update staff member');
      }
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Are you sure you want to delete ${staff.name}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await makeAPICall({
        action: 'deleteStaff',
        staffId: staff.staffId
      });

      if (response.success) {
        setMessage('Staff member deleted successfully!');
        await loadDashboardData(); // Reload staff list
      } else {
        setMessage(response.message || 'Failed to delete staff member');
      }
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStaffList = async () => {
    setLoading(true);
    try {
      await loadDashboardData(); // This loads the staff list
      setMessage('Staff list refreshed successfully!');
    } catch (error) {
      setMessage(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-md navbar-dark bg-danger sticky-top">
        <div className="container-fluid px-3">
          <span className="navbar-brand mb-0 h1 d-flex align-items-center">
            <i className="bi bi-shield-check me-2"></i>
            <span className="d-none d-sm-inline">Admin Dashboard</span>
            <span className="d-inline d-sm-none">Admin</span>
          </span>
          
          {/* Tab Navigation */}
          <div className="navbar-nav me-auto d-flex flex-row">
            <button 
              className={`btn btn-sm me-2 ${activeTab === 'overview' ? 'btn-light' : 'btn-outline-light'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`btn btn-sm me-2 ${activeTab === 'summary' ? 'btn-light' : 'btn-outline-light'}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            <button 
              className={`btn btn-sm me-2 ${activeTab === 'staff' ? 'btn-light' : 'btn-outline-light'}`}
              onClick={() => setActiveTab('staff')}
            >
              Staff
            </button>
          </div>
          
          <div className="navbar-nav ms-auto d-flex flex-row align-items-center">
            <button
              className="theme-toggle me-2"
              onClick={toggleTheme}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <span style={{ fontSize: '1rem' }}>☀️</span>
              ) : (
                <span style={{ fontSize: '1rem' }}>🌙</span>
              )}
            </button>
            <span className="navbar-text me-3 d-none d-md-inline">
              Welcome, <strong>{user?.name?.split(' ')[0] || 'Admin'}</strong>
            </span>
            <button 
              className="btn btn-outline-light btn-sm me-2" 
              onClick={handleManualStatusUpdate}
              disabled={statusUpdateLoading}
              title={lastUpdateTime ? `Last updated: ${lastUpdateTime.toLocaleTimeString()}` : 'Update all shift statuses'}
            >
              {statusUpdateLoading ? (
                <>
                  <div className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></div>
                  <span className="d-none d-sm-inline">Updating...</span>
                  <span className="d-inline d-sm-none">⏳</span>
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  <span className="d-none d-sm-inline">Update Status</span>
                  <span className="d-inline d-sm-none">🔄</span>
                </>
              )}
            </button>
            <button 
              className="btn btn-outline-light btn-sm" 
              onClick={logout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              <span className="d-none d-sm-inline">Logout</span>
              <span className="d-inline d-sm-none">Exit</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container-fluid p-2 p-md-4">
        {message && (
          <div className="alert alert-info alert-dismissible fade show" role="alert">
            {message}
            <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="row g-3 g-md-4">
            <div className="col-12">
              <h2 className="h4 mb-3">📊 Data Overview & Analysis</h2>
            </div>
            
            {/* Stats Cards */}
            <div className="col-6 col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title text-primary">{stats.totalShifts}</h5>
                  <p className="card-text small">Total Shifts</p>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title text-success">{stats.activeShifts}</h5>
                  <p className="card-text small">Active Now</p>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title text-info">{stats.todayShifts}</h5>
                  <p className="card-text small">Today's Shifts</p>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title text-warning">{stats.totalStaff}</h5>
                  <p className="card-text small">Total Staff</p>
                </div>
              </div>
            </div>

            {/* Quick Actions - Data Viewing Controls */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">⚡ Quick Actions - Data Viewer</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3 align-items-end">
                    {/* Time Period Selection */}
                    <div className="col-12 col-md-4">
                      <label className="form-label small">Select Time Period:</label>
                      <select 
                        className="form-select"
                        value={selectedTimePeriod}
                        onChange={(e) => setSelectedTimePeriod(e.target.value)}
                      >
                        {timePeriodOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Custom Date Range (when Custom is selected) */}
                    {selectedTimePeriod === 'custom' && (
                      <>
                        <div className="col-6 col-md-2">
                          <label className="form-label small">Start Date:</label>
                          <input 
                            type="date" 
                            className="form-control"
                            value={customDateRange.start}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                          />
                        </div>
                        <div className="col-6 col-md-2">
                          <label className="form-label small">End Date:</label>
                          <input 
                            type="date" 
                            className="form-control"
                            value={customDateRange.end}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                          />
                        </div>
                      </>
                    )}
                    
                    {/* View Button */}
                    <div className={`col-12 ${selectedTimePeriod === 'custom' ? 'col-md-4' : 'col-md-8'}`}>
                      <button 
                        className="btn btn-primary w-100"
                        onClick={handleViewData}
                        disabled={loading || (selectedTimePeriod === 'custom' && (!customDateRange.start || !customDateRange.end))}
                      >
                        {loading ? (
                          <span className="spinner-border spinner-border-sm me-2" />
                        ) : (
                          <i className="bi bi-eye me-2"></i>
                        )}
                        View Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column Selection and Filters */}
            {showOverviewTable && (
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h6 className="card-title mb-0">🎛️ Column Controls & Filters</h6>
                  </div>
                  <div className="card-body">
                    {/* Column Filters */}
                    <div className="row">
                      <div className="col-12">
                        <label className="form-label small fw-bold">Filter by Columns:</label>
                        <div className="row g-2">
                          {(selectedView === 'complete' 
                            ? ['Shift ID', 'Employee Name', 'Day', 'Updated', 'Status', 'Number of Segments', 'Shift Type', 'Employee ID'] 
                            : getOrderedOverviewColumns()
                          ).map(colKey => {
                            const column = appsScriptColumns.find(col => col.key === colKey);
                            return (
                              <div key={colKey} className="col-6 col-md-3">
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text" style={{fontSize: '0.75rem'}}>
                                    {column?.label || colKey}
                                  </span>
                                  <input 
                                    type="text"
                                    className="form-control"
                                    placeholder="Filter..."
                                    value={columnFilters[colKey] || ''}
                                    onChange={(e) => setColumnFilters(prev => ({ 
                                      ...prev, 
                                      [colKey]: e.target.value 
                                    }))}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View Type Selector - Add dropdown for customized column views */}
            {showOverviewTable && (
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h6 className="card-title mb-0">👁️ View Type</h6>
                  </div>
                  <div className="card-body">
                    <div className="row align-items-center">
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold mb-2">Select Column View:</label>
                        <select 
                          className="form-select"
                          value={selectedView}
                          onChange={(e) => setSelectedView(e.target.value)}
                        >
                          {viewTypes.map(view => (
                            <option key={view.value} value={view.value}>
                              {view.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-6">
                        <small className="text-muted d-block mt-3 mt-md-0">
                          <strong>Current View:</strong> {viewTypes.find(v => v.value === selectedView)?.label || 'Complete View'}
                          <br />
                          <strong>Columns:</strong> {getOrderedOverviewColumns().length} columns displayed
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Table - Rebuilt from scratch with proper column mapping */}
            {showOverviewTable && (
              <>
                {/* Summary Box for special time period selections */}
                {['monthlyAvgPerEmployee','weeklyTotalPerEmployee','weeklyAvgPerEmployee','quarterlyTotalPerEmployee','quarterlyAvgPerEmployee','yearlyAvgPerEmployee','yearlyTotalPerEmployee','allTimeTotalPerEmployee','monthlyTotalPerEmployee','monthlyAverage','weeklyTotal','monthlyTotal','quarterlyTotal','yearlyTotal','allTimeTotal','allTimeAverage'].includes(selectedTimePeriod) && (
                  <div className="col-12 mb-3">
                    <div className="card border-info">
                      <div className="card-header bg-info text-white">
                        <strong>
                          {selectedTimePeriod === 'monthlyAvgPerEmployee' && 'Monthly Average per Employee'}
                          {selectedTimePeriod === 'weeklyTotalPerEmployee' && 'Weekly Total per Employee'}
                          {selectedTimePeriod === 'weeklyAvgPerEmployee' && 'Weekly Average per Employee'}
                          {selectedTimePeriod === 'quarterlyTotalPerEmployee' && 'Quarterly Total per Employee'}
                          {selectedTimePeriod === 'quarterlyAvgPerEmployee' && 'Quarterly Average per Employee'}
                          {selectedTimePeriod === 'yearlyAvgPerEmployee' && 'Yearly Average per Employee'}
                          {selectedTimePeriod === 'yearlyTotalPerEmployee' && 'Yearly Total per Employee'}
                          {selectedTimePeriod === 'allTimeTotalPerEmployee' && 'All Time Total per Employee'}
                          {selectedTimePeriod === 'monthlyTotal' && 'Monthly Total (All Employees)'}
                          {selectedTimePeriod === 'monthlyAverage' && 'Monthly Average (All Employees)'}
                          {selectedTimePeriod === 'weeklyTotal' && 'Weekly Total (All Employees)'}
                          {selectedTimePeriod === 'quarterlyTotal' && 'Quarterly Total (All Employees)'}
                          {selectedTimePeriod === 'yearlyTotal' && 'Yearly Total (All Employees)'}
                          {selectedTimePeriod === 'allTimeTotal' && 'All Time Total (All Employees)'}
                          {selectedTimePeriod === 'allTimeAverage' && 'All Time Average (All Employees)'}
                        </strong>
                      </div>
                      <div className="card-body">
                        {/* Per-employee summaries */}
                        {selectedTimePeriod === 'weeklyTotalPerEmployee' && (() => {
                          // Group by employee and week
                          const weekTotals = {};
                          getFilteredData().forEach(shift => {
                            const name = shift['Employee Name'] || 'Unknown';
                            const dateStr = shift['Shift Date'];
                            const duration = parseFloat(shift['Total Duration']) || 0;
                            if (!dateStr) return;
                            const date = new Date(dateStr);
                            if (isNaN(date)) return;
                            // Get ISO week number and year
                            const getWeekYear = d => {
                              const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                              const dayNum = dt.getUTCDay() || 7;
                              dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
                              const yearStart = new Date(Date.UTC(dt.getUTCFullYear(),0,1));
                              const weekNum = Math.ceil((((dt - yearStart) / 86400000) + 1)/7);
                              return { year: dt.getUTCFullYear(), week: weekNum };
                            };
                            const { year, week } = getWeekYear(date);
                            const weekKey = `${year}-W${String(week).padStart(2,'0')}`;
                            const key = `${name}__${weekKey}`;
                            weekTotals[key] = (weekTotals[key] || 0) + duration;
                          });
                          // Build rows: Employee, Week, Total
                          const rows = Object.entries(weekTotals).map(([key, total]) => {
                            const [name, weekKey] = key.split('__');
                            return (
                              <tr key={key}>
                                <td>{name}</td>
                                <td>{weekKey}</td>
                                <td>{total.toFixed(2)} h</td>
                              </tr>
                            );
                          });
                          return (
                            <table className="table table-bordered table-sm mb-0">
                              <thead>
                                <tr><th>Employee</th><th>Week</th><th>Total Hours</th></tr>
                              </thead>
                              <tbody>{rows}</tbody>
                            </table>
                          );
                        })()}
                        {selectedTimePeriod === 'monthlyTotalPerEmployee' && (() => {
                          // Group by employee and month
                          const monthTotals = {};
                          getFilteredData().forEach(shift => {
                            const name = shift['Employee Name'] || 'Unknown';
                            const dateStr = shift['Shift Date'];
                            const duration = parseFloat(shift['Total Duration']) || 0;
                            if (!dateStr) return;
                            const date = new Date(dateStr);
                            if (isNaN(date)) return;
                            const monthKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
                            const key = `${name}__${monthKey}`;
                            monthTotals[key] = (monthTotals[key] || 0) + duration;
                          });
                          // Build rows: Employee, Month, Total
                          const rows = Object.entries(monthTotals).map(([key, total]) => {
                            const [name, monthKey] = key.split('__');
                            const [year, month] = monthKey.split('-');
                            const monthName = new Date(year, month-1).toLocaleString('default', { month: 'short' });
                            return (
                              <tr key={key}>
                                <td>{name}</td>
                                <td>{monthName} {year}</td>
                                <td>{total.toFixed(2)} h</td>
                              </tr>
                            );
                          });
                          return (
                            <table className="table table-bordered table-sm mb-0">
                              <thead>
                                <tr><th>Employee</th><th>Month</th><th>Total Hours</th></tr>
                              </thead>
                              <tbody>{rows}</tbody>
                            </table>
                          );
                        })()}
                        {selectedTimePeriod === 'monthlyAvgPerEmployee' && (() => {
                          // Group by employee and month, calculate average
                          const monthTotals = {};
                          const monthCounts = {};
                          getFilteredData().forEach(shift => {
                            const name = shift['Employee Name'] || 'Unknown';
                            const dateStr = shift['Shift Date'];
                            const duration = parseFloat(shift['Total Duration']) || 0;
                            if (!dateStr) return;
                            const date = new Date(dateStr);
                            if (isNaN(date)) return;
                            const monthKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
                            const key = `${name}__${monthKey}`;
                            monthTotals[key] = (monthTotals[key] || 0) + duration;
                            monthCounts[key] = (monthCounts[key] || 0) + (duration > 0 ? 1 : 0);
                          });
                          const rows = Object.entries(monthTotals).map(([key, total]) => {
                            const [name, monthKey] = key.split('__');
                            const [year, month] = monthKey.split('-');
                            const monthName = new Date(year, month-1).toLocaleString('default', { month: 'short' });
                            const avg = monthCounts[key] > 0 ? (total/monthCounts[key]) : 0;
                            return (
                              <tr key={key}>
                                <td>{name}</td>
                                <td>{monthName} {year}</td>
                                <td>{avg.toFixed(2)} h</td>
                              </tr>
                            );
                          });
                          return (
                            <table className="table table-bordered table-sm mb-0">
                              <thead>
                                <tr><th>Employee</th><th>Month</th><th>Average Hours</th></tr>
                              </thead>
                              <tbody>{rows}</tbody>
                            </table>
                          );
                        })()}
                        {selectedTimePeriod === 'weeklyAvgPerEmployee' && (() => {
                          // Group by employee and week, calculate average
                          const weekTotals = {};
                          const weekCounts = {};
                          getFilteredData().forEach(shift => {
                            const name = shift['Employee Name'] || 'Unknown';
                            const dateStr = shift['Shift Date'];
                            const duration = parseFloat(shift['Total Duration']) || 0;
                            if (!dateStr) return;
                            const date = new Date(dateStr);
                            if (isNaN(date)) return;
                            const getWeekYear = d => {
                              const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                              const dayNum = dt.getUTCDay() || 7;
                              dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
                              const yearStart = new Date(Date.UTC(dt.getUTCFullYear(),0,1));
                              const weekNum = Math.ceil((((dt - yearStart) / 86400000) + 1)/7);
                              return { year: dt.getUTCFullYear(), week: weekNum };
                            };
                            const { year, week } = getWeekYear(date);
                            const weekKey = `${year}-W${String(week).padStart(2,'0')}`;
                            const key = `${name}__${weekKey}`;
                            weekTotals[key] = (weekTotals[key] || 0) + duration;
                            weekCounts[key] = (weekCounts[key] || 0) + (duration > 0 ? 1 : 0);
                          });
                          const rows = Object.entries(weekTotals).map(([key, total]) => {
                            const [name, weekKey] = key.split('__');
                            const avg = weekCounts[key] > 0 ? (total/weekCounts[key]) : 0;
                            return (
                              <tr key={key}>
                                <td>{name}</td>
                                <td>{weekKey}</td>
                                <td>{avg.toFixed(2)} h</td>
                              </tr>
                            );
                          });
                          return (
                            <table className="table table-bordered table-sm mb-0">
                              <thead>
                                <tr><th>Employee</th><th>Week</th><th>Average Hours</th></tr>
                              </thead>
                              <tbody>{rows}</tbody>
                            </table>
                          );
                        })()}
                        {selectedTimePeriod === 'quarterlyTotalPerEmployee' && (() => {
                          // Group by employee and quarter
                          const quarterTotals = {};
                          getFilteredData().forEach(shift => {
                            const name = shift['Employee Name'] || 'Unknown';
                            const dateStr = shift['Shift Date'];
                            const duration = parseFloat(shift['Total Duration']) || 0;
                            if (!dateStr) return;
                            const date = new Date(dateStr);
                            if (isNaN(date)) return;
                            const quarter = Math.floor(date.getMonth()/3)+1;
                            const quarterKey = `${date.getFullYear()}-Q${quarter}`;
                            const key = `${name}__${quarterKey}`;
                            quarterTotals[key] = (quarterTotals[key] || 0) + duration;
                          });
                          const rows = Object.entries(quarterTotals).map(([key, total]) => {
                            const [name, quarterKey] = key.split('__');
                            return (
                              <tr key={key}>
                                <td>{name}</td>
                                <td>{quarterKey}</td>
                                <td>{total.toFixed(2)} h</td>
                              </tr>
                            );
                          });
                          return (
                            <table className="table table-bordered table-sm mb-0">
                              <thead>
                                <tr><th>Employee</th><th>Quarter</th><th>Total Hours</th></tr>
                              </thead>
                              <tbody>{rows}</tbody>
                            </table>
                          );
                        })()}
                        {selectedTimePeriod === 'quarterlyAvgPerEmployee' && (() => {
                          // Group by employee and quarter, calculate average
                          const quarterTotals = {};
                          const quarterCounts = {};
                          getFilteredData().forEach(shift => {
                            const name = shift['Employee Name'] || 'Unknown';
                            const dateStr = shift['Shift Date'];
                            const duration = parseFloat(shift['Total Duration']) || 0;
                            if (!dateStr) return;
                            const date = new Date(dateStr);
                            if (isNaN(date)) return;
                            const quarter = Math.floor(date.getMonth()/3)+1;
                            const quarterKey = `${date.getFullYear()}-Q${quarter}`;
                            const key = `${name}__${quarterKey}`;
                            quarterTotals[key] = (quarterTotals[key] || 0) + duration;
                            quarterCounts[key] = (quarterCounts[key] || 0) + (duration > 0 ? 1 : 0);
                          });
                          const rows = Object.entries(quarterTotals).map(([key, total]) => {
                            const [name, quarterKey] = key.split('__');
                            const avg = quarterCounts[key] > 0 ? (total/quarterCounts[key]) : 0;
                            return (
                              <tr key={key}>
                                <td>{name}</td>
                                <td>{quarterKey}</td>
                                <td>{avg.toFixed(2)} h</td>
                              </tr>
                            );
                          });
                          return (
                            <table className="table table-bordered table-sm mb-0">
                              <thead>
                                <tr><th>Employee</th><th>Quarter</th><th>Average Hours</th></tr>
                              </thead>
                              <tbody>{rows}</tbody>
                            </table>
                          );
                        })()}
                        {selectedTimePeriod === 'yearlyTotalPerEmployee' && (() => {
                          // Group by employee and year
                          const yearTotals = {};
                          getFilteredData().forEach(shift => {
                            const name = shift['Employee Name'] || 'Unknown';
                            const dateStr = shift['Shift Date'];
                            const duration = parseFloat(shift['Total Duration']) || 0;
                            if (!dateStr) return;
                            const date = new Date(dateStr);
                            if (isNaN(date)) return;
                            const yearKey = `${date.getFullYear()}`;
                            const key = `${name}__${yearKey}`;
                            yearTotals[key] = (yearTotals[key] || 0) + duration;
                          });
                          const rows = Object.entries(yearTotals).map(([key, total]) => {
                            const [name, yearKey] = key.split('__');
                            return (
                              <tr key={key}>
                                <td>{name}</td>
                                <td>{yearKey}</td>
                                <td>{total.toFixed(2)} h</td>
                              </tr>
                            );
                          });
                          return (
                            <table className="table table-bordered table-sm mb-0">
                              <thead>
                                <tr><th>Employee</th><th>Year</th><th>Total Hours</th></tr>
                              </thead>
                              <tbody>{rows}</tbody>
                            </table>
                          );
                        })()}
                        {selectedTimePeriod === 'yearlyAvgPerEmployee' && (() => {
                          // Group by employee and year, calculate average
                          const yearTotals = {};
                          const yearCounts = {};
                          getFilteredData().forEach(shift => {
                            const name = shift['Employee Name'] || 'Unknown';
                            const dateStr = shift['Shift Date'];
                            const duration = parseFloat(shift['Total Duration']) || 0;
                            if (!dateStr) return;
                            const date = new Date(dateStr);
                            if (isNaN(date)) return;
                            const yearKey = `${date.getFullYear()}`;
                            const key = `${name}__${yearKey}`;
                            yearTotals[key] = (yearTotals[key] || 0) + duration;
                            yearCounts[key] = (yearCounts[key] || 0) + (duration > 0 ? 1 : 0);
                          });
                          const rows = Object.entries(yearTotals).map(([key, total]) => {
                            const [name, yearKey] = key.split('__');
                            const avg = yearCounts[key] > 0 ? (total/yearCounts[key]) : 0;
                            return (
                              <tr key={key}>
                                <td>{name}</td>
                                <td>{yearKey}</td>
                                <td>{avg.toFixed(2)} h</td>
                              </tr>
                            );
                          });
                          return (
                            <table className="table table-bordered table-sm mb-0">
                              <thead>
                                <tr><th>Employee</th><th>Year</th><th>Average Hours</th></tr>
                              </thead>
                              <tbody>{rows}</tbody>
                            </table>
                          );
                        })()}
                        {selectedTimePeriod === 'allTimeTotalPerEmployee' && (() => {
                          // Group by employee, sum all time
                          const totals = {};
                          getFilteredData().forEach(shift => {
                            const name = shift['Employee Name'] || 'Unknown';
                            const duration = parseFloat(shift['Total Duration']) || 0;
                            totals[name] = (totals[name] || 0) + duration;
                          });
                          const rows = Object.entries(totals).map(([name, total]) => (
                            <tr key={name}>
                              <td>{name}</td>
                              <td>All Time</td>
                              <td>{total.toFixed(2)} h</td>
                            </tr>
                          ));
                          return (
                            <table className="table table-bordered table-sm mb-0">
                              <thead>
                                <tr><th>Employee</th><th>Period</th><th>Total Hours</th></tr>
                              </thead>
                              <tbody>{rows}</tbody>
                            </table>
                          );
                        })()}
                        {/* Overall summaries */}
                        {['monthlyTotal','monthlyAverage','weeklyTotal','quarterlyTotal','yearlyTotal','allTimeTotal','allTimeAverage'].includes(selectedTimePeriod) && (() => {
                          const durations = getFilteredData().map(shift => parseFloat(shift['Total Duration']) || 0).filter(d => d > 0);
                          let value = 0;
                          let label = '';
                          if (selectedTimePeriod.endsWith('Average')) {
                            value = durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
                            label = 'Average';
                          } else {
                            value = durations.reduce((a, b) => a + b, 0);
                            label = 'Total';
                          }
                          return <div><strong>{label} Hours:</strong> {value.toFixed(2)} h</div>;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
                <div className="col-12">
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h6 className="card-title mb-0">📋 Shift Data Table</h6>
                      <small className="text-muted">
                        Showing {getFilteredData().length} of {overviewData.length} shifts
                      </small>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-striped table-hover table-sm">
                          <thead className="table-dark">
                            <tr>
                              {/* Render table headers from selected view columns */}
                              {getOrderedOverviewColumns().map(colKey => {
                                const column = appsScriptColumns.find(col => col.key === colKey);
                                return (
                                  <th key={colKey} className="text-nowrap" style={{fontSize: '0.85rem'}}>
                                    {column?.label || colKey}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredData().length > 0 ? (
                              getFilteredData().map((shift, index) => (
                                <tr key={shift['Shift ID'] || index}>
                                  {/* Render table cells matching selected view columns */}
                                  {getOrderedOverviewColumns().map(colKey => {
                                    const column = appsScriptColumns.find(col => col.key === colKey);
                                    const cellValue = shift[colKey];
                                    return (
                                      <td key={colKey} className="text-nowrap" style={{fontSize: '0.8rem'}}>
                                        {/* Special rendering for Status column */}
                                        {colKey === 'Status' ? (
                                          <span>
                                            <span className={`badge ${
                                              (shift['_smartStatus'] || cellValue) === 'ACTIVE' ? 'bg-success' :
                                              (shift['_smartStatus'] || cellValue) === 'COMPLETED' ? 'bg-primary' :
                                              (shift['_smartStatus'] || cellValue) === 'ON BREAK' ? 'bg-warning text-dark' :
                                              (shift['_smartStatus'] || cellValue) === 'OFFLINE' ? 'bg-secondary' :
                                              'bg-info text-dark'
                                            }`}>
                                              {shift['_smartStatus'] || cellValue || 'DRAFT'}
                                            </span>
                                            {shift['_statusCalculated'] && (
                                              <small className="text-muted ms-1" title="Status calculated by smart logic">
                                                📊
                                              </small>
                                            )}
                                          </span>
                                        ) : colKey === 'Total Duration' ? (
                                          // Special rendering for Total Duration with fallback calculation
                                          formatCellData(cellValue, colKey, shift)
                                        ) : colKey === 'Segments Data' || colKey === 'Initial Segment Data' ? (
                                          // Make cell clickable to show modal with full data
                                          <button
                                            type="button"
                                            className="btn btn-link p-0 font-monospace text-truncate d-inline-block"
                                            style={{maxWidth: '120px', fontSize: '0.7rem', verticalAlign: 'middle'}}
                                            title="Click to view full data"
                                            onClick={() => {
                                              setSegmentModalTitle(colKey + ' for Shift ' + (shift['Shift ID'] || ''));
                                              setSegmentModalContent(cellValue || '-');
                                              setSegmentModalOpen(true);
                                            }}
                                          >
                                            {cellValue && cellValue.length > 30
                                              ? cellValue.slice(0, 30) + '...'
                                              : cellValue || '-'}
                                          </button>
                                        ) : colKey === 'Updated' ? (
                                          // Special rendering for Updated column (boolean)
                                          <span className={`badge ${
                                            cellValue === 'Yes' || cellValue === true || cellValue === 'TRUE' 
                                              ? 'bg-success' 
                                              : 'bg-secondary'
                                          }`}>
                                            {cellValue === 'Yes' || cellValue === true || cellValue === 'TRUE' ? 'Yes' : 'No'}
                                          </span>
                                        ) : (
                                          // Default rendering with formatCellData helper
                                          formatCellData(cellValue, colKey, shift)
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={getOrderedOverviewColumns().length} className="text-center py-4">
                                  <p className="text-muted mb-0">No shifts match your filters</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segment Data Modal */}
                {segmentModalOpen && (
                  <div 
                    className="modal fade show" 
                    style={{display: 'block', background: 'rgba(0,0,0,0.5)'}} 
                    tabIndex={-1}
                    role="dialog"
                  >
                    <div className="modal-dialog modal-dialog-centered" role="document">
                      <div className="modal-content">
                        <div className="modal-header">
                          <h5 className="modal-title">{segmentModalTitle}</h5>
                          <button type="button" className="btn-close" aria-label="Close" onClick={() => setSegmentModalOpen(false)}></button>
                        </div>
                        <div className="modal-body">
                          <pre style={{fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{segmentModalContent}</pre>
                        </div>
                        <div className="modal-footer">
                          <button type="button" className="btn btn-secondary" onClick={() => setSegmentModalOpen(false)}>
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="row g-3 g-md-4">
            <div className="col-12">
              <h2 className="h4 mb-3">📊 Employee Summary Calendar</h2>
            </div>
            
            {/* Summary Controls */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">⚙️ Summary Controls</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3 align-items-end">
                    {/* Date Range Selection */}
                    <div className="col-12 col-md-3">
                      <label className="form-label small">Date Range:</label>
                      <select 
                        className="form-select"
                        value={summaryDateRange}
                        onChange={(e) => setSummaryDateRange(e.target.value)}
                      >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>
                    
                    {/* Custom Date Range */}
                    {summaryDateRange === 'custom' && (
                      <>
                        <div className="col-6 col-md-2">
                          <label className="form-label small">Start Date:</label>
                          <input 
                            type="date" 
                            className="form-control"
                            value={summaryCustomRange.start}
                            onChange={(e) => setSummaryCustomRange(prev => ({ ...prev, start: e.target.value }))}
                          />
                        </div>
                        <div className="col-6 col-md-2">
                          <label className="form-label small">End Date:</label>
                          <input 
                            type="date" 
                            className="form-control"
                            value={summaryCustomRange.end}
                            onChange={(e) => setSummaryCustomRange(prev => ({ ...prev, end: e.target.value }))}
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Show Drafts Toggle - Matching user's screenshot */}
                    <div className="col-12 col-md-2">
                      <label className="form-label small">Show Drafts:</label>
                      <select 
                        className="form-select"
                        value={showDrafts ? 'Yes' : 'No'}
                        onChange={(e) => setShowDrafts(e.target.value === 'Yes')}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    
                    {/* Employee Status Filter */}
                    <div className="col-12 col-md-2">
                      <label className="form-label small">Employee Status:</label>
                      <select 
                        className="form-select"
                        value={employeeStatusFilter}
                        onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                      >
                        <option value="all">All Employees</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="col-12 col-md-3">
                      <div className="d-flex gap-2">
                        <button 
                          className="btn btn-primary flex-fill"
                          onClick={handleLoadSummaryData}
                          disabled={summaryLoading || (summaryDateRange === 'custom' && (!summaryCustomRange.start || !summaryCustomRange.end))}
                        >
                          {summaryLoading ? (
                            <span className="spinner-border spinner-border-sm me-2" />
                          ) : (
                            <i className="bi bi-calendar3 me-2"></i>
                          )}
                          Load
                        </button>
                        
                        <button 
                          className="btn btn-outline-success"
                          onClick={downloadCalendarCSV}
                          disabled={!calendarData.calendar}
                          title="Download calendar as CSV file"
                        >
                          <i className="bi bi-download"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar View - Matching user's screenshot layout */}
            {calendarData.calendar && (
              <div className="col-12">
                <div className="card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 className="card-title mb-0">📅 Calendar Summary</h6>
                    <small className="text-muted">
                      {calendarData.employees?.length || 0} employees • {calendarData.dates?.length || 0} days
                    </small>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-bordered table-sm mb-0" style={{fontSize: '0.8rem'}}>
                        <thead className="table-light">
                          <tr>
                            <th className="text-center" style={{minWidth: '120px'}}>Date</th>
                            {calendarData.employees?.map(empName => (
                              <th key={empName} className="text-center" style={{minWidth: '80px'}}>
                                {empName}
                              </th>
                            ))}
                            <th className="text-center bg-info text-white" style={{minWidth: '80px'}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calendarData.dates?.map(date => {
                            const dateKey = date.toISOString().split('T')[0];
                            const dayData = calendarData.calendar[dateKey];
                            
                            return (
                              <tr key={dateKey}>
                                <td className="text-center fw-bold">
                                  {dayData?.displayDate || dateKey}
                                </td>
                                {calendarData.employees?.map(empName => {
                                  const empData = dayData?.employees?.[empName];
                                  const hours = empData?.hours || 0;
                                  const status = empData?.status || 'DRAFT';
                                  
                                  // Determine badge color based on shift status
                                  let badgeClass = 'badge ';
                                  if (status === 'DRAFT') {
                                    badgeClass += 'bg-secondary'; // Grey for drafts
                                  } else if (status === 'ACTIVE' || status === 'ON BREAK') {
                                    badgeClass += 'bg-success'; // Green for active
                                  } else if (status === 'COMPLETED') {
                                    badgeClass += 'bg-primary'; // Blue for completed
                                  } else {
                                    badgeClass += 'bg-secondary'; // Default grey
                                  }
                                  
                                  return (
                                    <td key={empName} className="text-center">
                                      {hours > 0 ? (
                                        <span className={badgeClass} title={`Status: ${status}`}>
                                          {hours.toFixed(1)}h
                                        </span>
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="text-center bg-light">
                                  {dayData?.dayTotal > 0 ? (
                                    <strong className="text-primary">
                                      {dayData.dayTotal.toFixed(1)}h
                                    </strong>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          
                          {/* Total Row */}
                          <tr className="table-warning">
                            <td className="text-center fw-bold">Total</td>
                            {calendarData.employees?.map(empName => {
                              const empTotal = calendarData.dates?.reduce((sum, date) => {
                                const dateKey = date.toISOString().split('T')[0];
                                const empData = calendarData.calendar[dateKey]?.employees?.[empName];
                                return sum + (empData?.hours || 0);
                              }, 0) || 0;
                              
                              return (
                                <td key={empName} className="text-center fw-bold">
                                  {empTotal > 0 ? (
                                    <span className="text-primary">
                                      {empTotal.toFixed(1)}h
                                    </span>
                                  ) : (
                                    <span className="text-muted">0h</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center fw-bold bg-info text-white">
                              {calendarData.dates?.reduce((sum, date) => {
                                const dateKey = date.toISOString().split('T')[0];
                                return sum + (calendarData.calendar[dateKey]?.dayTotal || 0);
                              }, 0).toFixed(1) || '0.0'}h
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="row mt-3">
                      <div className="col-md-3">
                        <div className="text-center">
                          <h6 className="text-muted mb-1">Total Hours</h6>
                          <h4 className="text-primary mb-0">
                            {calendarData.dates?.reduce((sum, date) => {
                              const dateKey = date.toISOString().split('T')[0];
                              return sum + (calendarData.calendar[dateKey]?.dayTotal || 0);
                            }, 0).toFixed(1) || '0.0'}h
                          </h4>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <h6 className="text-muted mb-1">Active Days</h6>
                          <h4 className="text-success mb-0">
                            {calendarData.dates?.filter(date => {
                              const dateKey = date.toISOString().split('T')[0];
                              return (calendarData.calendar[dateKey]?.dayTotal || 0) > 0;
                            }).length || 0}
                          </h4>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <h6 className="text-muted mb-1">Employees</h6>
                          <h4 className="text-info mb-0">
                            {calendarData.employees?.length || 0}
                          </h4>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <h6 className="text-muted mb-1">Avg per Day</h6>
                          <h4 className="text-warning mb-0">
                            {calendarData.dates?.length > 0 ? (
                              (calendarData.dates.reduce((sum, date) => {
                                const dateKey = date.toISOString().split('T')[0];
                                return sum + (calendarData.calendar[dateKey]?.dayTotal || 0);
                              }, 0) / calendarData.dates.length).toFixed(1)
                            ) : '0.0'}h
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* No Data Message */}
            {!summaryLoading && !calendarData.calendar && (
              <div className="col-12">
                <div className="card">
                  <div className="card-body text-center py-5">
                    <i className="bi bi-calendar-x display-1 text-muted mb-3"></i>
                    <h5 className="text-muted mb-2">No Summary Data</h5>
                    <p className="text-muted mb-3">Select a date range and click "Load Summary" to view the calendar.</p>
                    <button 
                      className="btn btn-outline-primary"
                      onClick={handleLoadSummaryData}
                      disabled={summaryLoading}
                    >
                      <i className="bi bi-calendar3 me-2"></i>
                      Load Current Month
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Staff Management Tab */}
        {activeTab === 'staff' && (
          <div className="row">
            <div className="col-12">
              <h2 className="h4 mb-3">👥 Staff Management</h2>
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">
                    All Staff Members
                    {loading && (
                      <span className="spinner-border spinner-border-sm ms-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </span>
                    )}
                  </h5>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleRefreshStaffList}
                      disabled={loading}
                      title="Refresh staff list"
                    >
                      <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                      {loading ? '' : ' Refresh'}
                    </button>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={handleAddStaff}
                      disabled={loading}
                    >
                      <i className="bi bi-person-plus me-1"></i> Add Staff
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading staff data...</span>
                      </div>
                      <p className="mt-2 text-muted">Loading staff data...</p>
                    </div>
                  ) : allStaff.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Employee ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allStaff.map(staff => (
                            <tr key={staff.staffId || staff.employeeId}>
                              <td>{staff.staffId || staff.employeeId}</td>
                              <td>{staff.name}</td>
                              <td>{staff.email}</td>
                              <td>
                                <span className={`badge ${
                                  staff.role === 'Admin' ? 'bg-danger' : 'bg-info'
                                }`}>
                                  {staff.role}
                                </span>
                              </td>
                              <td>{staff.department}</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-outline-primary me-1"
                                  onClick={() => handleEditStaff(staff)}
                                  disabled={loading}
                                  title="Edit Staff"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteStaff(staff)}
                                  disabled={loading}
                                  title="Delete Staff"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="bi bi-people display-1 text-muted"></i>
                      <p className="text-muted mt-2 mb-3">No staff members found</p>
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleRefreshStaffList}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Management Tab removed */}

        {/* Experimental Tab removed */}
      </div>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Staff Member</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAddStaffModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">Employee ID *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newStaffData.employeeId}
                      onChange={(e) => setNewStaffData({...newStaffData, employeeId: e.target.value})}
                      placeholder="Enter Employee ID (e.g., EMP003)"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newStaffData.name}
                      onChange={(e) => setNewStaffData({...newStaffData, name: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={newStaffData.email}
                      onChange={(e) => setNewStaffData({...newStaffData, email: e.target.value})}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={newStaffData.role}
                      onChange={(e) => setNewStaffData({...newStaffData, role: e.target.value})}
                    >
                      <option value="Staff">Staff</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newStaffData.department}
                      onChange={(e) => setNewStaffData({...newStaffData, department: e.target.value})}
                      placeholder="Enter department"
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAddStaffModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSaveNewStaff}
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Staff Member</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setEditingStaff(null)}
                ></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">Employee ID</label>
                    <input
                      type="text"
                      className="form-control bg-light"
                      value={editingStaff.employeeId || editingStaff.staffId}
                      disabled
                    />
                    <small className="text-muted">Employee ID cannot be changed</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingStaff.name}
                      onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editingStaff.email}
                      onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={editingStaff.role}
                      onChange={(e) => setEditingStaff({...editingStaff, role: e.target.value})}
                    >
                      <option value="Staff">Staff</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingStaff.department}
                      onChange={(e) => setEditingStaff({...editingStaff, department: e.target.value})}
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingStaff(null)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSaveStaffEdit}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
