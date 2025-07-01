// Check the detailed breadcrumb error logs
// Run this after the enhanced error handling kicks in

console.log('🔍 Checking stored breadcrumb error logs...')

function checkBreadcrumbErrors() {
  const errorLogs = JSON.parse(localStorage.getItem('breadcrumb_errors') || '[]')
  const failedBreadcrumbs = JSON.parse(localStorage.getItem('failed_breadcrumbs') || '[]')
  
  console.log(`📊 Found ${errorLogs.length} detailed error logs`)
  console.log(`📊 Found ${failedBreadcrumbs.length} failed breadcrumbs`)
  
  if (errorLogs.length > 0) {
    console.log('\n=== DETAILED ERROR LOGS ===')
    errorLogs.forEach((log, i) => {
      console.log(`\n🔴 Error ${i + 1} (${log.timestamp}):`)
      console.log('   Code:', log.error.code)
      console.log('   Message:', log.error.message)
      console.log('   Details:', log.error.details)
      console.log('   Hint:', log.error.hint)
      console.log('   Driver ID:', log.driverId)
      console.log('   GPS Accuracy:', log.gpsAccuracy)
      console.log('   Data:', log.breadcrumbData)
    })
  }
  
  if (failedBreadcrumbs.length > 0) {
    console.log('\n=== FAILED BREADCRUMBS ===')
    failedBreadcrumbs.slice(-5).forEach((breadcrumb, i) => {
      console.log(`\n📍 Failed breadcrumb ${i + 1}:`)
      console.log('   Time:', breadcrumb.failed_at)
      console.log('   Error:', breadcrumb.error)
      console.log('   Location:', breadcrumb.latitude, breadcrumb.longitude)
      console.log('   Driver ID:', breadcrumb.driver_id)
    })
  }
  
  if (errorLogs.length === 0 && failedBreadcrumbs.length === 0) {
    console.log('✅ No error logs found yet')
    console.log('💡 Try starting a route and wait for breadcrumb tracking to begin')
  }
}

function clearErrorLogs() {
  localStorage.removeItem('breadcrumb_errors')
  localStorage.removeItem('failed_breadcrumbs')
  console.log('🧹 Cleared all error logs')
}

// Export functions
window.errorLogs = {
  check: checkBreadcrumbErrors,
  clear: clearErrorLogs
}

// Auto-run
checkBreadcrumbErrors()

console.log('\n💡 Available commands:')
console.log('   window.errorLogs.check() - Check error logs')
console.log('   window.errorLogs.clear() - Clear error logs') 