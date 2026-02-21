import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface DiscountAnalysisData {
  total_discounts: number;
  discounted_orders: number;
  avg_discount_pct: number;
  total_orders: number;
  discount_penetration: number;
  gross_sales: number;
  net_sales: number;
}

export default function DiscountAnalysis() {
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
  const [data, setData] = useState<DiscountAnalysisData | null>(null);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/discounts/analysis?${getDateParams()}`);
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

  const discountBreakdownOptions = {
    chart: {
      type: "donut" as const,
      height: 350
    },
    labels: ["Discounted Orders", "Full Price Orders"],
    colors: ["#F59E0B", "#10B981"],
    legend: { position: "bottom" as const },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Orders",
              formatter: () => data?.total_orders.toLocaleString() || "0"
            }
          }
        }
      }
    }
  };

  const salesImpactOptions = {
    chart: {
      type: "bar" as const,
      height: 350,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `₹${val.toFixed(2)}`,
      style: { fontSize: "11px" }
    },
    xaxis: {
      categories: ["Gross Sales", "Total Discounts", "Net Sales"]
    },
    colors: ["#3B82F6", "#EF4444", "#10B981"]
  };

  return (
    <>
      <PageMeta
        title="Discount Analysis"
        description="Comprehensive analysis of discount usage and impact"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Discount Analysis
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
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Discounts</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">₹{data.total_discounts.toFixed(2)}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Discounted Orders</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{data.discounted_orders.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Discount %</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{data.avg_discount_pct.toFixed(2)}%</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Discount Penetration</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{data.discount_penetration.toFixed(2)}%</p>
            </div>
          </div>

          {/* Discount Distribution */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Order Distribution
              </h3>
              <ReactApexChart
                options={discountBreakdownOptions}
                series={[data.discounted_orders, data.total_orders - data.discounted_orders]}
                type="donut"
                height={350}
              />
            </div>
          </div>

          {/* Sales Impact */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Sales Impact Analysis
              </h3>
              <ReactApexChart
                options={salesImpactOptions}
                series={[
                  {
                    name: "Amount",
                    data: [data.gross_sales, data.total_discounts, data.net_sales]
                  }
                ]}
                type="bar"
                height={350}
              />
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Detailed Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Gross Sales</h4>
                  <p className="text-2xl font-bold text-blue-600">₹{data.gross_sales.toFixed(2)}</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Net Sales</h4>
                  <p className="text-2xl font-bold text-green-600">₹{data.net_sales.toFixed(2)}</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Discount as % of Gross</h4>
                  <p className="text-2xl font-bold text-red-600">
                    {((data.total_discounts / data.gross_sales) * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Orders</h4>
                  <p className="text-2xl font-bold text-purple-600">{data.total_orders.toLocaleString()}</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Avg Discount per Order</h4>
                  <p className="text-2xl font-bold text-orange-600">
                    ₹{(data.total_discounts / data.total_orders).toFixed(2)}
                  </p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Orders without Discount</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {(data.total_orders - data.discounted_orders).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No data available for the selected period.</p>
        </div>
      )}
    </>
  );
}
