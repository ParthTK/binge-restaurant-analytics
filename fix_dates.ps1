# PowerShell script to fix all hardcoded December 2025 dates in frontend

$files = @(
    "frontend\src\pages\Operations\KPTandFOR.tsx",
    "frontend\src\pages\Operations\OnlineStatus.tsx",
    "frontend\src\pages\Operations\Complaints.tsx",
    "frontend\src\pages\Operations\QualityMetrics.tsx",
    "frontend\src\pages\Financials\NetRevenue.tsx",
    "frontend\src\pages\Financials\PayoutBreakdown.tsx",
    "frontend\src\pages\Financials\CommissionAnalysis.tsx",
    "frontend\src\pages\Items\ItemsPerOrder.tsx",
    "frontend\src\pages\Items\ItemAvailability.tsx",
    "frontend\src\pages\Items\TopItems.tsx",
    "frontend\src\pages\Customers\DayPartAnalysis.tsx",
    "frontend\src\pages\Customers\UserTypes.tsx",
    "frontend\src\pages\Discounts\EffectiveDiscount.tsx",
    "frontend\src\pages\Discounts\CouponPerformance.tsx",
    "frontend\src\pages\Discounts\DiscountAnalysis.tsx",
    "frontend\src\pages\Ads\AdsTimeslots.tsx",
    "frontend\src\pages\Ads\AdsKeywords.tsx",
    "frontend\src\pages\Ads\AdsPlatforms.tsx",
    "frontend\src\pages\Funnel\NewVsRepeat.tsx",
    "frontend\src\pages\Funnel\ConversionRates.tsx",
    "frontend\src\pages\Sales\AOVAnalysis.tsx",
    "frontend\src\pages\Sales\OrdersAnalysis.tsx",
    "frontend\src\pages\Sales\SalesTrends.tsx",
    "frontend\src\pages\PlatformComparison.tsx",
    "frontend\src\pages\Sales\Weekly.tsx",
    "frontend\src\pages\Sales\WeekdayWeekend.tsx"
)

$oldPattern = @'
  const \[dateRange, setDateRange\] = useState<\[Date, Date\]>\(\[
    new Date\("2025-12-01"\),
    new Date\("2025-12-20"\),
  \]\);
'@

$newCode = @'
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

foreach ($file in $files) {
    $fullPath = "d:\tavvlo-database\tavvlo-company-dashboard\$file"
    if (Test-Path $fullPath) {
        Write-Host "Fixing $file..."
        $content = Get-Content $fullPath -Raw
        $content = $content -replace '  const \[dateRange, setDateRange\] = useState<\[Date, Date\]>\(\[\r?\n    new Date\("2025-12-01"\),\r?\n    new Date\("2025-12-20"\),\r?\n  \]\);', $newCode
        Set-Content -Path $fullPath -Value $content -NoNewline
    }
}

Write-Host "Done! All files updated."
