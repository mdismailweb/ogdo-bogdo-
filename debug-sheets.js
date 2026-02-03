// Debug Google Sheets connection from Apps Script side
// Import the main APPS_SCRIPT_URL from appScriptAPI.js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJsVl6QArWTF0KDk9U7PTpxdqDcaF80GUEwHJgU03JWOCFcyD2YWdNfAVuwjLvGx6Rhw/exec';

window.debugSheetConnection = async function() {
  console.log('🔍 Debugging Google Sheets connection from Apps Script...');
  
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'debugSheetConnection',
        clientTimezone: 'Asia/Calcutta',
        clientTimezoneOffset: -330
      })
    });
    
    const data = await response.json();
    
    console.log('📊 Sheet Connection Debug Results:');
    console.log('Success:', data.success);
    console.log('Message:', data.message);
    
    if (data.success) {
      console.log('📋 Available sheets:', data.availableSheets);
      console.log('📊 Last row:', data.lastRow);
      console.log('📊 Last column:', data.lastColumn);
      if (data.headers) {
        console.log('📋 Headers:', data.headers);
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error debugging sheet connection:', error);
    return { success: false, error: error.message };
  }
};

console.log('🔧 Debug function added: debugSheetConnection()');