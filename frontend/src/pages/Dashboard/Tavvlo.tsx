import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import TavvloMetrics from "../../components/tavvlo/TavvloMetrics";
import SalesTimeseries from "../../components/tavvlo/SalesTimeseries";
import PlatformSplit from "../../components/tavvlo/PlatformSplit";
import CustomerFunnel from "../../components/tavvlo/CustomerFunnel";
import AdsPerformance from "../../components/tavvlo/AdsPerformance";
import CustomerSegmentation from "../../components/tavvlo/CustomerSegmentation";
import Operations from "../../components/tavvlo/Operations";
import TopItems from "../../components/tavvlo/TopItems";
import { useRestaurant } from "../../context/RestaurantContext";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

export interface OverviewData {
  current: {
    net_sales: number;
    delivered_orders: number;
    avg_order_value: number;
    active_restaurants: number;
  };
  previous: {
    net_sales: number;
    delivered_orders: number;
    avg_order_value: number;
  };
  changes: {
    sales_pct: number;
    orders_pct: number;
    aov_pct: number;
  };
}

export interface SalesTimeseriesData {
  series: Array<{
    date: string;
    orders: number;
    net_sales: number;
  }>;
}

export interface PlatformData {
  platforms: Array<{
    platform: string;
    orders: number;
    net_sales: number;
  }>;
}

export interface FunnelData {
  total_impressions: number;
  total_menu_opens: number;
  total_carts: number;
  total_orders: number;
  imp_to_menu_pct: number;
  menu_to_cart_pct: number;
  cart_to_order_pct: number;
}

export interface AdsData {
  total_spend: number;
  total_revenue: number;
  roi_pct: number;
}

export interface CustomerSegmentationData {
  new_customers: number;
  repeat_customers: number;
  new_customer_pct: number;
  repeat_customer_pct: number;
}

export interface OperationsData {
  avg_rating: number;
  avg_kpt: number;
  total_complaints: number;
  avg_for: number;
}

export interface TopItemsData {
  items: Array<{
    item_name: string;
    platform: string;
    order_count: number;
    total_quantity: number;
    restaurant_count: number;
  }>;
}

export default function Tavvlo() {
  const { selectedRestaurant, restaurantsLoaded } = useRestaurant();

  // Default to last 30 days
  const getDefaultDateRange = (): [Date, Date] => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30); // 30 days ago
    return [startDate, endDate];
  };

  const [dateRange, setDateRange] = useState<[Date, Date]>(getDefaultDateRange());
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [salesTimeseries, setSalesTimeseries] = useState<SalesTimeseriesData | null>(null);
  const [platformSplit, setPlatformSplit] = useState<PlatformData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [ads, setAds] = useState<AdsData | null>(null);
  const [customerSeg, setCustomerSeg] = useState<CustomerSegmentationData | null>(null);
  const [operations, setOperations] = useState<OperationsData | null>(null);
  const [topItems, setTopItems] = useState<TopItemsData | null>(null);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const restParam = selectedRestaurant ? `&rest_id=${selectedRestaurant}` : '';
    return `start_date=${startStr}&end_date=${endStr}${restParam}`;
  };

  const setQuickRange = (range: string) => {
    const today = new Date();
    let start: Date, end: Date;

    switch (range) {
      case "yesterday":
        start = end = new Date(today);
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case "last_7_days":
        end = new Date(today);
        end.setDate(end.getDate() - 1); // Yesterday
        start = new Date(end);
        start.setDate(start.getDate() - 6); // 7 days including yesterday
        break;
      case "last_30_days":
        end = new Date(today);
        end.setDate(end.getDate() - 1); // Yesterday
        start = new Date(end);
        start.setDate(start.getDate() - 29); // 30 days including yesterday
        break;
      case "this_month":
        const now = new Date(today);
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(today);
        end.setDate(end.getDate() - 1); // Yesterday
        break;
      default:
        end = new Date(today);
        end.setDate(end.getDate() - 1); // Yesterday
        start = new Date(end);
        start.setDate(start.getDate() - 29); // 30 days
    }

    setDateRange([start, end]);
  };

  const fetchData = async () => {
    setLoading(true);
    const params = getDateParams();

    try {
      const [
        overviewRes,
        salesRes,
        platformRes,
        funnelRes,
        adsRes,
        customerRes,
        opsRes,
        itemsRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/overview?${params}`),
        fetch(`${API_BASE}/api/sales-timeseries?${params}`),
        fetch(`${API_BASE}/api/platform-split?${params}`),
        fetch(`${API_BASE}/api/funnel?${params}`),
        fetch(`${API_BASE}/api/ads?${params}`),
        fetch(`${API_BASE}/api/customer-segmentation?${params}`),
        fetch(`${API_BASE}/api/operations?${params}`),
        fetch(`${API_BASE}/api/top-items?${params}`),
      ]);

      setOverview(await overviewRes.json());
      setSalesTimeseries(await salesRes.json());
      setPlatformSplit(await platformRes.json());
      setFunnel(await funnelRes.json());
      setAds(await adsRes.json());
      setCustomerSeg(await customerRes.json());
      setOperations(await opsRes.json());
      setTopItems(await itemsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data after restaurants list has been loaded
    if (restaurantsLoaded) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedRestaurant, restaurantsLoaded]);

  return (
    <>
      <PageMeta
        title="Tavvlo Company Dashboard"
        description="Company-level analytics dashboard with T-1 day data"
      />

      {/* Date Range Selector */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Overview
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Date Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setQuickRange("yesterday")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              Yesterday
            </button>
            <button
              onClick={() => setQuickRange("last_7_days")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setQuickRange("last_30_days")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setQuickRange("this_month")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              This Month
            </button>
          </div>

          {/* Calendar Date Range Picker */}
          <div className="flex items-center gap-2">
            <Flatpickr
              value={dateRange}
              onChange={(dates) => {
                if (dates.length === 2) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              options={{
                mode: "range",
                dateFormat: "Y-m-d",
                maxDate: new Date().toISOString().split("T")[0],
                minDate: "2024-01-01",
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Select date range"
            />
            <button
              onClick={fetchData}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Metrics */}
          <div className="col-span-12">
            <TavvloMetrics data={overview} />
          </div>

          {/* Sales Timeseries */}
          <div className="col-span-12 xl:col-span-8">
            <SalesTimeseries data={salesTimeseries} />
          </div>

          {/* Platform Split */}
          <div className="col-span-12 xl:col-span-4">
            <PlatformSplit data={platformSplit} />
          </div>

          {/* Customer Funnel */}
          <div className="col-span-12">
            <CustomerFunnel data={funnel} />
          </div>

          {/* Ads Performance */}
          <div className="col-span-12 md:col-span-6 xl:col-span-4">
            <AdsPerformance data={ads} />
          </div>

          {/* Customer Segmentation */}
          <div className="col-span-12 md:col-span-6 xl:col-span-4">
            <CustomerSegmentation data={customerSeg} />
          </div>

          {/* Operations */}
          <div className="col-span-12 xl:col-span-4">
            <Operations data={operations} />
          </div>

          {/* Top Items */}
          <div className="col-span-12">
            <TopItems data={topItems} />
          </div>
        </div>
      )}
    </>
  );
}
