# PowerShell script to fix remaining hardcoded December 2025 default date ranges

$files = @(
    "frontend\src\pages\Operations\QualityMetrics.tsx",
    "frontend\src\pages\Operations\OnlineStatus.tsx",
    "frontend\src\pages\Operations\KPTandFOR.tsx",
    "frontend\src\pages\Financials\NetRevenue.tsx",
    "frontend\src\pages\Financials\PayoutBreakdown.tsx",
    "frontend\src\pages\Financials\CommissionAnalysis.tsx",
    "frontend\src\pages\Items\ItemsPerOrder.tsx",
    "frontend\src\pages\Items\ItemAvailability.tsx",
    "frontend\src\pages\Items\TopItems.tsx",
    "frontend\src\pages\Customers\DayPartAnalysis.tsx",
    "frontend\src\pages\Customers\UserTypes.tsx"
)

$oldDefaultPattern = '  const \[dateRange, setDateRange\] = useState<\[Date, Date\]>\(\[new Date\("2025-12-01"\), new Date\("2025-12-20"\)\]\);'

$newDefaultPattern = @'
  const getDefaultDateRange = (): [Date, Date] => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30); // 30 days ago
    return [startDate, endDate];
  };

  const [dateRange, setDateRange] = useState<[Date, Date]>(getDefaultDateRange());
'@

$oldFlatpickrPattern = '            maxDate: "2025-12-31",\r?\n            minDate: "2025-01-01",'

$newFlatpickrPattern = @'
            maxDate: new Date().toISOString().split("T")[0],
            minDate: "2024-01-01",
'@

foreach ($file in $files) {
    $fullPath = "d:\tavvlo-database\tavvlo-company-dashboard\$file"
    if (Test-Path $fullPath) {
        Write-Host "Fixing $file..."
        $content = Get-Content $fullPath -Raw

        # Fix default date range
        $content = $content -replace $oldDefaultPattern, $newDefaultPattern

        # Fix Flatpickr limits if they exist
        $content = $content -replace $oldFlatpickrPattern, $newFlatpickrPattern

        Set-Content -Path $fullPath -Value $content -NoNewline
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Done! All remaining December 2025 dates fixed."
