import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface DailyKPTFORData {
  date: string;
  kpt: number;
  for_accuracy: number;
}

export default function KPTandFOR() {
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
  const [data, setData] = useState<{ data: DailyKPTFORData[] } | null>(null);

  const getDateParams = () => {
    const [start, end] = dateRange;
    return `start_date=${start.toISOString().split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/operations/quality-metrics?${getDateParams()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const avgMetrics = data?.data ? {
    avgKPT: data.data.reduce((sum, d) => sum + d.kpt, 0) / data.data.length,
    avgFOR: data.data.reduce((sum, d) => sum + d.for_accuracy, 0) / data.data.length
  } : null;

  // Limit charts to last 20 days
  const chartData = data?.data ? data.data.slice(-20) : [];

  const kptChartOptions = {
    chart: { type: "line" as const, height: 350, toolbar: { show: true } },
    xaxis: { categories: chartData.map(d => d.date) || [], title: { text: "Date" } },
    yaxis: { title: { text: "KPT (minutes)" } },
    stroke: { curve: "smooth" as const, width: 3 },
    colors: ["#10B981"],
    dataLabels: { enabled: false },
    markers: { size: 4 }
  };

  const forChartOptions = {
    chart: { type: "area" as const, height: 350, toolbar: { show: true } },
    xaxis: { categories: chartData.map(d => d.date) || [], title: { text: "Date" } },
    yaxis: { title: { text: "FOR Accuracy (%)" }, min: 0, max: 100 },
    stroke: { curve: "smooth" as const, width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100]
      }
    },
    colors: ["#F59E0B"],
    dataLabels: { enabled: false }
  };

  const combinedChartOptions = {
    chart: { type: "line" as const, height: 350, toolbar: { show: true } },
    xaxis: { categories: chartData.map(d => d.date) || [], title: { text: "Date" } },
    yaxis: [
      { title: { text: "KPT (minutes)" }, seriesName: "KPT" },
      { opposite: true, title: { text: "FOR Accuracy (%)" }, seriesName: "FOR Accuracy" }
    ],
    stroke: { curve: "smooth" as const, width: 2 },
    colors: ["#10B981", "#F59E0B"],
    dataLabels: { enabled: false },
    legend: { position: "top" as const }
  };

  return (
    <>
      <PageMeta title="KPT and FOR Analysis" description="Kitchen prep time and fulfillment order accuracy" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">KPT and FOR Analysis</h1>
        <Flatpickr
          value={dateRange}
          onChange={(dates) => { if (dates.length === 2) setDateRange([dates[0], dates[1]]); }}
          options={{ mode: "range", dateFormat: "Y-m-d", maxDate: "2025-12-31", minDate: "2025-01-01" }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        </div>
      ) : avgMetrics && data?.data ? (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Summary Cards */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average KPT</h3>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">
                {avgMetrics.avgKPT.toFixed(1)} <span className="text-lg">min</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">Kitchen Preparation Time</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average FOR Accuracy</h3>
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {avgMetrics.avgFOR.toFixed(1)}<span className="text-lg">%</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">Fulfillment Order Accuracy</p>
            </div>
          </div>

          {/* Combined Trend Chart */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                KPT & FOR Trend Comparison
              </h3>
              <ReactApexChart
                options={combinedChartOptions}
                series={[
                  { name: "KPT", data: chartData.map(d => d.kpt) },
                  { name: "FOR Accuracy", data: chartData.map(d => d.for_accuracy) }
                ]}
                type="line"
                height={350}
              />
            </div>
          </div>

          {/* KPT Trend Chart */}
          <div className="col-span-12 xl:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">KPT Trend</h3>
              <ReactApexChart
                options={kptChartOptions}
                series={[{ name: "KPT (min)", data: chartData.map(d => d.kpt) }]}
                type="line"
                height={350}
              />
            </div>
          </div>

          {/* FOR Trend Chart */}
          <div className="col-span-12 xl:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">FOR Accuracy Trend</h3>
              <ReactApexChart
                options={forChartOptions}
                series={[{ name: "FOR Accuracy (%)", data: chartData.map(d => d.for_accuracy) }]}
                type="area"
                height={350}
              />
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Best KPT</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.min(...data.data.map(d => d.kpt)).toFixed(1)} min
                  </p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Worst KPT</h4>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.max(...data.data.map(d => d.kpt)).toFixed(1)} min
                  </p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Best FOR %</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.max(...data.data.map(d => d.for_accuracy)).toFixed(1)}%
                  </p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Worst FOR %</h4>
                  <p className="text-2xl font-bold text-orange-600">
                    {Math.min(...data.data.map(d => d.for_accuracy)).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-white">No data available for the selected period.</p>
        </div>
      )}
    </>
  );
}
