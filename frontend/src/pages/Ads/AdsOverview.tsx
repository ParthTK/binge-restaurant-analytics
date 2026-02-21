import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface AdsOverviewData {
  total_spend: number;
  total_orders: number;
  total_revenue: number;
  roas: number;
  cpa: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export default function AdsOverview() {
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
  const [data, setData] = useState<AdsOverviewData | null>(null);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/ads/overview?${getDateParams()}`);
      const result = await response.json();
      setData(result.data || null);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const metricsChartOptions = {
    chart: {
      type: "bar" as const,
      height: 350,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        barHeight: "70%"
      }
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: "12px", fontWeight: "bold" }
    },
    xaxis: {
      categories: ["Total Spend", "Total Orders", "Total Revenue", "ROAS", "CPA"]
    },
    colors: ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"]
  };

  const performanceChartOptions = {
    chart: {
      type: "radialBar" as const,
      height: 350
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: "60%"
        },
        dataLabels: {
          show: true,
          name: {
            show: true,
            fontSize: "16px"
          },
          value: {
            show: true,
            fontSize: "24px",
            fontWeight: "bold"
          }
        }
      }
    },
    labels: ["ROAS Performance"],
    colors: ["#10B981"]
  };

  return (
    <>
      <PageMeta
        title="Ads Overview"
        description="Comprehensive overview of advertising performance"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-offwhite mb-4">
          Ads Performance Overview
        </h1>
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
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-offwhite"
        />
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        </div>
      ) : data ? (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Summary Cards */}
          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Total Ad Spend</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">₹{data.total_spend.toFixed(2)}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Total Orders</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{data.total_orders.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Total Revenue</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">₹{data.total_revenue.toFixed(2)}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">ROAS</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{data.roas.toFixed(2)}x</p>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Cost Per Acquisition</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">₹{data.cpa.toFixed(2)}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Total Impressions</h3>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{data.impressions.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Total Clicks</h3>
              <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">{data.clicks.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Click-Through Rate</h3>
              <p className="text-3xl font-bold text-pink-600 dark:text-pink-400 mt-2">{data.ctr.toFixed(2)}%</p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-offwhite">
                Key Metrics Overview
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between border-l-4 border-red-500 pl-4 py-3 bg-red-50 dark:bg-red-900/20 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Total Spend</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">₹{data.total_spend.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Total Orders</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.total_orders.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-l-4 border-green-500 pl-4 py-3 bg-green-50 dark:bg-green-900/20 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{data.total_revenue.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-l-4 border-purple-500 pl-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-offwhite/70">ROAS</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.roas.toFixed(2)}x</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-l-4 border-orange-500 pl-4 py-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Cost Per Acquisition</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">₹{data.cpa.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROAS Performance Gauge */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-offwhite">
                ROAS Performance
              </h3>
              <ReactApexChart
                options={performanceChartOptions}
                series={[Math.min(data.roas * 20, 100)]}
                type="radialBar"
                height={350}
              />
              <div className="text-center mt-4">
                <p className="text-2xl font-bold text-purple-600">{data.roas.toFixed(2)}x</p>
                <p className="text-sm text-gray-600 dark:text-offwhite/70">Return on Ad Spend</p>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-offwhite">
                Performance Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Revenue Metrics</h4>
                  <p className="text-lg font-semibold mt-2 dark:text-offwhite">Revenue: ₹{data.total_revenue.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 dark:text-offwhite/70">Spend: ₹{data.total_spend.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 dark:text-offwhite/70">Net Profit: ₹{(data.total_revenue - data.total_spend).toFixed(2)}</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-offwhite/70">Efficiency Metrics</h4>
                  <p className="text-lg font-semibold mt-2 dark:text-offwhite">CPA: ₹{data.cpa.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 dark:text-offwhite/70">CTR: {data.ctr.toFixed(2)}%</p>
                  <p className="text-sm text-gray-600 dark:text-offwhite/70">ROAS: {data.roas.toFixed(2)}x</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-offwhite/70">No data available for the selected period.</p>
        </div>
      )}
    </>
  );
}
