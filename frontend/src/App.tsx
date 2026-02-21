import { BrowserRouter as Router, Routes, Route } from "react-router";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Tavvlo from "./pages/Dashboard/Tavvlo";

// Sales Analysis Pages
import WeekdayWeekend from "./pages/Sales/WeekdayWeekend";
import Weekly from "./pages/Sales/Weekly";
import SalesTrends from "./pages/Sales/SalesTrends";
import OrdersAnalysis from "./pages/Sales/OrdersAnalysis";
import AOVAnalysis from "./pages/Sales/AOVAnalysis";

// Platform Comparison
import PlatformComparison from "./pages/PlatformComparison";

// Funnel Pages
import OrganicFunnel from "./pages/Funnel/OrganicFunnel";
import ConversionRates from "./pages/Funnel/ConversionRates";

// Ads Pages
import AdsOverview from "./pages/Ads/AdsOverview";
import AdsPlatforms from "./pages/Ads/AdsPlatforms";
import AdsKeywords from "./pages/Ads/AdsKeywords";
import AdsTimeslots from "./pages/Ads/AdsTimeslots";

// Discounts Pages
import DiscountAnalysis from "./pages/Discounts/DiscountAnalysis";
import CouponPerformance from "./pages/Discounts/CouponPerformance";
import EffectiveDiscount from "./pages/Discounts/EffectiveDiscount";

// Customer Pages
import UserTypes from "./pages/Customers/UserTypes";
import DayPartAnalysis from "./pages/Customers/DayPartAnalysis";

// Operations Pages
import QualityMetrics from "./pages/Operations/QualityMetrics";
import KPTandFOR from "./pages/Operations/KPTandFOR";
import Complaints from "./pages/Operations/Complaints";
import OnlineStatus from "./pages/Operations/OnlineStatus";

// Items Pages
import TopItems from "./pages/Items/TopItems";
import ItemsPerOrder from "./pages/Items/ItemsPerOrder";

// Financials Pages
import CommissionAnalysis from "./pages/Financials/CommissionAnalysis";
import PayoutBreakdown from "./pages/Financials/PayoutBreakdown";
import NetRevenue from "./pages/Financials/NetRevenue";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Tavvlo />} />

            {/* Platform Comparison */}
            <Route path="/platform-comparison" element={<PlatformComparison />} />

            {/* Sales Analysis */}
            <Route path="/sales/trends" element={<SalesTrends />} />
            <Route path="/sales/orders" element={<OrdersAnalysis />} />
            <Route path="/sales/aov" element={<AOVAnalysis />} />
            <Route path="/sales/weekday-weekend" element={<WeekdayWeekend />} />
            <Route path="/sales/weekly" element={<Weekly />} />

            {/* Customer Funnel */}
            <Route path="/funnel/organic" element={<OrganicFunnel />} />
            <Route path="/funnel/conversion" element={<ConversionRates />} />

            {/* Ads Performance */}
            <Route path="/ads/overview" element={<AdsOverview />} />
            <Route path="/ads/platforms" element={<AdsPlatforms />} />
            <Route path="/ads/timeslots" element={<AdsTimeslots />} />

            {/* Discounts & Offers */}
            <Route path="/discounts/analysis" element={<DiscountAnalysis />} />
            <Route path="/discounts/coupons" element={<CouponPerformance />} />
            <Route path="/discounts/effective" element={<EffectiveDiscount />} />

            {/* Customer Segmentation */}
            <Route path="/customers/types" element={<UserTypes />} />
            <Route path="/customers/dayparts" element={<DayPartAnalysis />} />

            {/* Operations */}
            <Route path="/operations/quality" element={<QualityMetrics />} />
            <Route path="/operations/kpt-for" element={<KPTandFOR />} />
            <Route path="/operations/complaints" element={<Complaints />} />
            <Route path="/operations/online" element={<OnlineStatus />} />

            {/* Item Analysis */}
            <Route path="/items/top" element={<TopItems />} />
            <Route path="/items/per-order" element={<ItemsPerOrder />} />

            {/* Financials */}
            <Route path="/financials/commission" element={<CommissionAnalysis />} />
            <Route path="/financials/payout" element={<PayoutBreakdown />} />
            <Route path="/financials/revenue" element={<NetRevenue />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
