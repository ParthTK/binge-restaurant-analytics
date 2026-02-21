import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface AOVData {
  date: string;
  orders: number;
  gross_sales: number;
  net_sales: number;
  avg_order_value?: number;
}

export default function AOVAnalysis() {
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
  const [data, setData] = useState<AOVData[]>([]);

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
      const processedData = (result.series || []).map((item: AOVData) => ({
        ...item,
        avg_order_value: item.orders > 0 ? item.net_sales / item.orders : 0
      }));
      setData(processedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const aovChartOptions = {
    chart: {
      type: "line" as const,
      height: 350,
      toolbar: { show: true }
    },
    stroke: {
      curve: "smooth" as const,
      width: 3
    },
    markers: {
      size: 5
    },
    xaxis: {
      categories: data.map(d => d.date),
      labels: { rotate: -45 }
    },
    yaxis: {
      title: { text: "AOV (₹)" },
      labels: {
        formatter: (value) => Math.round(value).toLocaleString()
      }
    },
    colors: ["#8B5CF6"],
    tooltip: {
      y: {
        formatter: (val: number) => `₹${val.toFixed(2)}`
      }
    }
  };

  const ordersVsAOVOptions = {
    chart: {
      type: "line" as const,
      height: 350,
      toolbar: { show: true }
    },
    stroke: {
      curve: "smooth" as const,
      width: [3, 3]
    },
    xaxis: {
      categories: data.map(d => d.date),
      labels: { rotate: -45 }
    },
    yaxis: [
      {
        title: { text: "Orders" },
        labels: {
          formatter: (value) => Math.round(value).toLocaleString()
        }
      },
      {
        opposite: true,
        title: { text: "AOV (₹)" },
        labels: {
          formatter: (value) => `₹${Math.round(value).toLocaleString()}`
        }
      }
    ],
    colors: ["#3B82F6", "#F59E0B"]
  };

  const avgAOV = data.length > 0
    ? data.reduce((sum, d) => sum + (d.avg_order_value || 0), 0) / data.length
    : 0;
  const maxAOV = data.length > 0
    ? Math.max(...data.map(d => d.avg_order_value || 0))
    : 0;
  const minAOV = data.length > 0
    ? Math.min(...data.map(d => d.avg_order_value || 0))
    : 0;
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <>
      <PageMeta
        title="Average Order Value Analysis"
        description="Track and analyze average order value trends over time"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Average Order Value (AOV) Analysis
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
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average AOV</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">₹{avgAOV.toFixed(2)}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Max AOV</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">₹{maxAOV.toFixed(2)}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Min AOV</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">₹{minAOV.toFixed(2)}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{totalOrders.toLocaleString()}</p>
            </div>
          </div>

          {/* AOV Trend Chart */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                AOV Trend Over Time
              </h3>
              <ReactApexChart
                options={aovChartOptions}
                series={[
                  { name: "AOV", data: data.map(d => d.avg_order_value || 0) }
                ]}
                type="line"
                height={350}
              />
            </div>
          </div>

          {/* Orders vs AOV Correlation */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Orders vs AOV Correlation
              </h3>
              <ReactApexChart
                options={ordersVsAOVOptions}
                series={[
                  { name: "Orders", data: data.map(d => d.orders) },
                  { name: "AOV", data: data.map(d => d.avg_order_value || 0) }
                ]}
                type="line"
                height={350}
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Daily AOV Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 dark:text-white">Date</th>
                      <th className="px-6 py-3 dark:text-white">Orders</th>
                      <th className="px-6 py-3 dark:text-white">Net Sales (₹)</th>
                      <th className="px-6 py-3 dark:text-white">AOV (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="px-6 py-4 dark:text-white">{row.date}</td>
                        <td className="px-6 py-4 dark:text-white">{row.orders}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.net_sales.toFixed(2)}</td>
                        <td className="px-6 py-4 font-semibold text-purple-600 dark:text-purple-400">₹{(row.avg_order_value || 0).toFixed(2)}</td>
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
