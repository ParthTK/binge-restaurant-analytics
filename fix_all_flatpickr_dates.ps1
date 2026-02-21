# PowerShell script to fix ALL hardcoded Flatpickr dates

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
    "frontend\src\pages\Funnel\OrganicFunnel.tsx",
    "frontend\src\pages\Ads\AdsOverview.tsx"
)

$oldPattern = @'
            maxDate: "2025-12-31",
            minDate: "2025-01-01",
'@

$newPattern = @'
            maxDate: new Date().toISOString().split("T")[0],
            minDate: "2024-01-01",
'@

foreach ($file in $files) {
    $fullPath = "d:\tavvlo-database\tavvlo-company-dashboard\$file"
    if (Test-Path $fullPath) {
        Write-Host "Fixing $file..."
        $content = Get-Content $fullPath -Raw
        $content = $content -replace 'maxDate: "2025-12-31",\r?\n            minDate: "2025-01-01",', $newPattern
        Set-Content -Path $fullPath -Value $content -NoNewline
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Done! All Flatpickr date limits updated."
