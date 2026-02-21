import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface ConversionData {
  metric: string;
  value: number;
  platform?: string;
}

export default function ConversionRates() {
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
  const [data, setData] = useState<ConversionData[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/funnel/conversion-summary?${getDateParams()}`);
      const result = await response.json();
      // Convert API response to array format for the charts
      const metrics = [
        { metric: "Impressions to Menu Opens", value: result.imp_to_menu_pct || 0 },
        { metric: "Menu Opens to Cart Builds", value: result.menu_to_cart_pct || 0 },
        { metric: "Cart Builds to Orders", value: result.cart_to_order_pct || 0 },
        { metric: "Overall Conversion", value: result.overall_conversion_pct || 0 }
      ];
      setData(metrics);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const conversionMetrics = data.filter(d => d.metric.includes("conversion") || d.metric.includes("rate"));

  const chartOptions = {
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
      formatter: (val: number) => `${val.toFixed(2)}%`,
      style: { fontSize: "12px", fontWeight: "bold" }
    },
    xaxis: {
      categories: conversionMetrics.map(d => d.metric),
      title: { text: "Conversion Rate (%)" }
    },
    colors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"]
  };

  const donutOptions = {
    chart: {
      type: "donut" as const,
      height: 350
    },
    labels: data.map(d => d.metric),
    colors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"],
    legend: {
      position: "bottom" as const
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`
    }
  };

  const avgConversion = data.length > 0
    ? data.reduce((sum, d) => sum + d.value, 0) / data.length
    : 0;

  return (
    <>
      <PageMeta
        title="Conversion Rates Analysis"
        description="Detailed analysis of conversion rates across different stages"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Conversion Rates Analysis
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
      ) : (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Summary Card */}
          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Average Conversion Rate</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{avgConversion.toFixed(2)}%</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Total Metrics</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{data.length}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Best Performance</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {data.length > 0 ? Math.max(...data.map(d => d.value)).toFixed(2) : 0}%
              </p>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="col-span-12 md:col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Conversion Distribution
              </h3>
              <ReactApexChart
                options={donutOptions}
                series={data.map(d => d.value)}
                type="donut"
                height={350}
              />
            </div>
          </div>

          {/* Metric Cards */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Conversion Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-white mb-2">{item.metric}</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{item.value.toFixed(2)}%</p>
                    {item.platform && (
                      <p className="text-xs text-gray-500 dark:text-white mt-1">Platform: {item.platform}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Detailed Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-800 dark:text-white">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-white">
                    <tr>
                      <th className="px-6 py-3">Metric</th>
                      <th className="px-6 py-3">Value (%)</th>
                      {data.some(d => d.platform) && <th className="px-6 py-3">Platform</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="px-6 py-4 font-medium dark:text-white">{row.metric}</td>
                        <td className="px-6 py-4 dark:text-white">{row.value.toFixed(2)}%</td>
                        {data.some(d => d.platform) && <td className="px-6 py-4 dark:text-white">{row.platform || "-"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
