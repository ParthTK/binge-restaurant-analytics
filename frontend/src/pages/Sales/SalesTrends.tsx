import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface SalesTrendsData {
  date: string;
  orders: number;
  gross_sales: number;
  net_sales: number;
  total_discounts: number;
}

export default function SalesTrends() {
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
  const [data, setData] = useState<SalesTrendsData[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sales-timeseries?${getDateParams()}`);
      const result = await response.json();
      setData(result.series || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const salesChartOptions = {
    chart: {
      type: "line" as const,
      height: 350,
      toolbar: { show: true }
    },
    stroke: { curve: "smooth" as const, width: 2 },
    xaxis: {
      categories: data.map(d => d.date),
      labels: { rotate: -45 }
    },
    yaxis: {
      title: { text: "Amount (₹)" },
      labels: {
        formatter: (value) => Math.round(value).toLocaleString()
      }
    },
    colors: ["#10B981", "#3B82F6", "#F59E0B"],
    legend: { position: "top" as const }
  };

  const ordersChartOptions = {
    chart: {
      type: "area" as const,
      height: 350,
      toolbar: { show: true }
    },
    stroke: { curve: "smooth" as const, width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3
      }
    },
    xaxis: {
      categories: data.map(d => d.date),
      labels: { rotate: -45 }
    },
    yaxis: {
      title: { text: "Orders" }
    },
    colors: ["#6366F1"]
  };

  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
  const totalGrossSales = data.reduce((sum, d) => sum + d.gross_sales, 0);
  const totalNetSales = data.reduce((sum, d) => sum + d.net_sales, 0);
  const totalDiscounts = data.reduce((sum, d) => sum + d.total_discounts, 0);

  return (
    <>
      <PageMeta
        title="Sales Trends Analysis"
        description="Track daily sales performance and trends over time"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Sales Trends Analysis
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
          {/* Summary Cards */}
          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Total Orders</h3>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{totalOrders.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Gross Sales</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">₹{totalGrossSales.toFixed(2)}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Net Sales</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">₹{totalNetSales.toFixed(2)}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Total Discounts</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">₹{totalDiscounts.toFixed(2)}</p>
            </div>
          </div>

          {/* Sales Trend Chart */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Sales Trends Over Time
              </h3>
              <ReactApexChart
                options={salesChartOptions}
                series={[
                  { name: "Gross Sales", data: data.map(d => d.gross_sales) },
                  { name: "Net Sales", data: data.map(d => d.net_sales) },
                  { name: "Discounts", data: data.map(d => d.total_discounts) }
                ]}
                type="line"
                height={350}
              />
            </div>
          </div>

          {/* Orders Trend Chart */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Daily Orders Trend
              </h3>
              <ReactApexChart
                options={ordersChartOptions}
                series={[
                  { name: "Orders", data: data.map(d => d.orders) }
                ]}
                type="area"
                height={350}
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Daily Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-800 dark:text-white">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-white">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Orders</th>
                      <th className="px-6 py-3">Gross Sales (₹)</th>
                      <th className="px-6 py-3">Net Sales (₹)</th>
                      <th className="px-6 py-3">Discounts (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="px-6 py-4 dark:text-white">{row.date}</td>
                        <td className="px-6 py-4 dark:text-white">{row.orders}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.gross_sales.toFixed(2)}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.net_sales.toFixed(2)}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.total_discounts.toFixed(2)}</td>
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
