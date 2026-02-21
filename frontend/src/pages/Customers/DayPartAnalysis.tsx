import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface DayPartData {
  date: string;
  breakfast: number;
  lunch: number;
  snacks: number;
  dinner: number;
  late_night: number;
}

export default function DayPartAnalysis() {
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
  const [data, setData] = useState<DayPartData[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    return `start_date=${start.toISOString().split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/customers/dayparts?${getDateParams()}`);
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Calculate totals
  const totals = data.reduce((acc, day) => ({
    breakfast: acc.breakfast + day.breakfast,
    lunch: acc.lunch + day.lunch,
    snacks: acc.snacks + day.snacks,
    dinner: acc.dinner + day.dinner,
    late_night: acc.late_night + day.late_night,
  }), { breakfast: 0, lunch: 0, snacks: 0, dinner: 0, late_night: 0 });

  // Limit chart to last 20 days
  const chartData = data.slice(-20);

  const barChartOptions = {
    chart: {
      type: "bar" as const,
      height: 350,
      stacked: true,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "70%"
      }
    },
    xaxis: {
      categories: chartData.map(d => d.date),
      labels: { rotate: -45 }
    },
    yaxis: {
      title: { text: "Orders" }
    },
    colors: ["#F59E0B", "#10B981", "#8B5CF6", "#EF4444", "#3B82F6"],
    legend: {
      position: "top" as const,
      horizontalAlign: "left" as const
    }
  };

  const donutChartOptions = {
    chart: {
      type: "donut" as const,
      height: 350
    },
    labels: ["Breakfast", "Lunch", "Snacks", "Dinner", "Late Night"],
    colors: ["#F59E0B", "#10B981", "#8B5CF6", "#EF4444", "#3B82F6"],
    legend: {
      position: "bottom" as const
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`
    }
  };

  return (
    <>
      <PageMeta title="Day-Part Analysis" description="Orders breakdown by time of day" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Day-Part Analysis</h1>
        <Flatpickr
          value={dateRange}
          onChange={(dates) => { if (dates.length === 2) setDateRange([dates[0], dates[1]]); }}
          options={{ mode: "range", dateFormat: "Y-m-d", maxDate: new Date().toISOString().split("T")[0], minDate: "2024-01-01" }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Summary Cards */}
          <div className="col-span-12 md:col-span-4 lg:col-span-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Breakfast</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{totals.breakfast.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 lg:col-span-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Lunch</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{totals.lunch.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 lg:col-span-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Snacks</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{totals.snacks.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 lg:col-span-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Dinner</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{totals.dinner.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 lg:col-span-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Late Night</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{totals.late_night.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 lg:col-span-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</h3>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                {(totals.breakfast + totals.lunch + totals.snacks + totals.dinner + totals.late_night).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Orders by Day-Part Over Time
              </h3>
              <ReactApexChart
                options={barChartOptions}
                series={[
                  { name: "Breakfast", data: chartData.map(d => d.breakfast) },
                  { name: "Lunch", data: chartData.map(d => d.lunch) },
                  { name: "Snacks", data: chartData.map(d => d.snacks) },
                  { name: "Dinner", data: chartData.map(d => d.dinner) },
                  { name: "Late Night", data: chartData.map(d => d.late_night) }
                ]}
                type="bar"
                height={350}
              />
            </div>
          </div>

          {/* Donut Chart */}
          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Day-Part Distribution
              </h3>
              <ReactApexChart
                options={donutChartOptions}
                series={[totals.breakfast, totals.lunch, totals.snacks, totals.dinner, totals.late_night]}
                type="donut"
                height={350}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
