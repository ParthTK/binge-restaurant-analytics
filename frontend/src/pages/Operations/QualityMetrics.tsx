import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface DailyMetrics {
  date: string;
  avg_rating: number;
  for_accuracy: number;
  kpt: number;
  online_pct: number;
  poor_rated_orders: number;
  rated_orders: number;
  total_complaints: number;
}

export default function QualityMetrics() {
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
  const [data, setData] = useState<{ data: DailyMetrics[] } | null>(null);

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

  // Calculate aggregated metrics
  const aggregatedMetrics = data?.data ? {
    avgRating: data.data.reduce((sum, d) => sum + d.avg_rating, 0) / data.data.length,
    avgFOR: data.data.reduce((sum, d) => sum + d.for_accuracy, 0) / data.data.length,
    avgKPT: data.data.reduce((sum, d) => sum + d.kpt, 0) / data.data.length,
    avgOnlinePct: data.data.reduce((sum, d) => sum + d.online_pct, 0) / data.data.length,
    totalComplaints: data.data.reduce((sum, d) => sum + d.total_complaints, 0),
    totalPoorRated: data.data.reduce((sum, d) => sum + d.poor_rated_orders, 0),
    totalRated: data.data.reduce((sum, d) => sum + d.rated_orders, 0),
  } : null;

  const ratingChartOptions = {
    chart: { type: "line" as const, height: 350, toolbar: { show: true } },
    xaxis: {
      categories: data?.data.map(d => {
        const date = new Date(d.date);
        return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
      }) || [],
      title: { text: "Date" },
      labels: {
        rotate: -45,
        rotateAlways: true,
        hideOverlappingLabels: true,
        maxHeight: 120,
        style: { fontSize: '10px' }
      },
      tickAmount: Math.min(data?.data.length || 10, 10)
    },
    yaxis: {
      title: { text: "Rating" },
      min: 0,
      max: 5,
      labels: {
        formatter: (value: number) => Math.round(value).toString()
      }
    },
    stroke: { curve: "smooth" as const, width: 2 },
    colors: ["#3B82F6"],
    dataLabels: { enabled: false }
  };

  const kptForChartOptions = {
    chart: { type: "line" as const, height: 350, toolbar: { show: true } },
    xaxis: {
      categories: data?.data.map(d => {
        const date = new Date(d.date);
        return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
      }) || [],
      title: { text: "Date" },
      labels: {
        rotate: -45,
        rotateAlways: true,
        hideOverlappingLabels: true,
        maxHeight: 120,
        style: { fontSize: '10px' }
      },
      tickAmount: Math.min(data?.data.length || 10, 10)
    },
    yaxis: {
      title: { text: "Minutes / %" },
      labels: {
        formatter: (value: number) => Math.round(value).toString()
      }
    },
    stroke: { curve: "smooth" as const, width: 2 },
    colors: ["#10B981", "#F59E0B"],
    dataLabels: { enabled: false },
    legend: { position: "top" as const }
  };

  return (
    <>
      <PageMeta title="Quality Metrics" description="Restaurant quality and performance metrics" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Quality Metrics</h1>
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
      ) : aggregatedMetrics ? (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Summary Cards */}
          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rating</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {aggregatedMetrics.avgRating.toFixed(2)} ⭐
              </p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg KPT</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {aggregatedMetrics.avgKPT.toFixed(1)} min
              </p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg FOR Accuracy</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {aggregatedMetrics.avgFOR.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Complaints</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {aggregatedMetrics.totalComplaints}
              </p>
            </div>
          </div>

          {/* Rating Trend Chart */}
          <div className="col-span-12 xl:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Rating Trend</h3>
              <ReactApexChart
                options={ratingChartOptions}
                series={[{ name: "Avg Rating", data: data?.data.map(d => d.avg_rating) || [] }]}
                type="line"
                height={350}
              />
            </div>
          </div>

          {/* KPT & FOR Chart */}
          <div className="col-span-12 xl:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">KPT & FOR Accuracy</h3>
              <ReactApexChart
                options={kptForChartOptions}
                series={[
                  { name: "KPT (min)", data: data?.data.map(d => d.kpt) || [] },
                  { name: "FOR Accuracy (%)", data: data?.data.map(d => d.for_accuracy) || [] }
                ]}
                type="line"
                height={350}
              />
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Additional Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Avg Online %</h4>
                  <p className="text-2xl font-bold text-green-600">{aggregatedMetrics.avgOnlinePct.toFixed(1)}%</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Rated Orders</h4>
                  <p className="text-2xl font-bold text-blue-600">{aggregatedMetrics.totalRated.toLocaleString()}</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Poor Rated Orders</h4>
                  <p className="text-2xl font-bold text-red-600">{aggregatedMetrics.totalPoorRated.toLocaleString()}</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Poor Rating %</h4>
                  <p className="text-2xl font-bold text-orange-600">
                    {((aggregatedMetrics.totalPoorRated / aggregatedMetrics.totalRated) * 100).toFixed(2)}%
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
