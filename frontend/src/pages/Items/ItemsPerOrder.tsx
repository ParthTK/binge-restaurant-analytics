import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface DailyItemsPerOrder {
  date: string;
  avg_items_per_order: number;
  total_items: number;
  total_orders: number;
}

interface ItemsPerOrderResponse {
  data: DailyItemsPerOrder[];
}

export default function ItemsPerOrder() {
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
  const [data, setData] = useState<DailyItemsPerOrder[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    return `start_date=${start.toISOString().split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/items/avg-per-order?${getDateParams()}`);
      const result: ItemsPerOrderResponse = await response.json();
      setData(result.data || []);
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

  // Calculate summary metrics
  const totalItems = data.reduce((sum, d) => sum + d.total_items, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.total_orders, 0);
  const avgItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;

  // Limit chart to last 20 days
  const chartData = data.slice(-20);

  const chartOptions = {
    chart: {
      type: "line" as const,
      height: 350,
      toolbar: { show: true }
    },
    stroke: {
      curve: "smooth" as const,
      width: 3
    },
    xaxis: {
      categories: chartData.map(d => d.date),
      title: { text: "Date" },
      labels: { rotate: -45 }
    },
    yaxis: {
      title: { text: "Average Items Per Order" },
      decimalsInFloat: 2
    },
    colors: ["#3B82F6"],
    dataLabels: { enabled: false },
    markers: { size: 4 },
    tooltip: {
      y: {
        formatter: (val: number) => val.toFixed(2) + " items"
      }
    }
  };

  return (
    <>
      <PageMeta title="Items Per Order" description="Average items per order analysis" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-offwhite mb-4">Items Per Order</h1>
        <Flatpickr
          value={dateRange}
          onChange={(dates) => { if (dates.length === 2) setDateRange([dates[0], dates[1]]); }}
          options={{ mode: "range", dateFormat: "Y-m-d", maxDate: new Date().toISOString().split("T")[0], minDate: "2024-01-01" }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-offwhite"
        />
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        </div>
      ) : data.length > 0 ? (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Summary Cards */}
          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Items Per Order</h3>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {avgItemsPerOrder.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">Overall average</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</h3>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">
                {totalItems.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">In selected period</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</h3>
              <p className="text-4xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {totalOrders.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">In selected period</p>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Items Per Order Trend
              </h3>
              <ReactApexChart
                options={chartOptions}
                series={[{
                  name: "Avg Items/Order",
                  data: chartData.map(d => d.avg_items_per_order)
                }]}
                type="line"
                height={350}
              />
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
