import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface OrdersData {
  day_name: string;
  orders: number;
  net_sales: number;
  avg_order_value: number;
}

export default function OrdersAnalysis() {
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
  const [data, setData] = useState<OrdersData[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sales/by-day-of-week?${getDateParams()}`);
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

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sortedData = [...data].sort((a, b) =>
    dayOrder.indexOf(a.day_name) - dayOrder.indexOf(b.day_name)
  );

  const ordersChartOptions = {
    chart: {
      type: "bar" as const,
      height: 350,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: "12px" }
    },
    xaxis: {
      categories: sortedData.map(d => d.day_name),
    },
    yaxis: {
      title: { text: "Number of Orders" }
    },
    colors: ["#3B82F6"]
  };

  const salesChartOptions = {
    chart: {
      type: "bar" as const,
      height: 350,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `₹${Math.round(val).toLocaleString()}`,
      style: { fontSize: "11px" }
    },
    xaxis: {
      categories: sortedData.map(d => d.day_name),
    },
    yaxis: {
      title: { text: "Net Sales (₹)" },
      labels: {
        formatter: (value: number) => Math.round(value).toLocaleString()
      }
    },
    colors: ["#10B981"]
  };

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
      size: 6
    },
    xaxis: {
      categories: sortedData.map(d => d.day_name),
    },
    yaxis: {
      title: { text: "Average Order Value (₹)" },
      labels: {
        formatter: (value) => Math.round(value).toLocaleString()
      }
    },
    colors: ["#F59E0B"]
  };

  const totalOrders = sortedData.reduce((sum, d) => sum + d.orders, 0);
  const avgAOV = sortedData.length > 0
    ? sortedData.reduce((sum, d) => sum + d.avg_order_value, 0) / sortedData.length
    : 0;

  return (
    <>
      <PageMeta
        title="Orders Analysis by Day of Week"
        description="Analyze order patterns across different days of the week"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Orders Analysis by Day of Week
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
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{totalOrders.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average AOV</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">₹{avgAOV.toFixed(2)}</p>
            </div>
          </div>

          {/* Orders by Day of Week */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Orders by Day of Week
              </h3>
              <ReactApexChart
                options={ordersChartOptions}
                series={[
                  { name: "Orders", data: sortedData.map(d => d.orders) }
                ]}
                type="bar"
                height={350}
              />
            </div>
          </div>

          {/* Sales by Day of Week */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Net Sales by Day of Week
              </h3>
              <ReactApexChart
                options={salesChartOptions}
                series={[
                  { name: "Net Sales", data: sortedData.map(d => d.net_sales) }
                ]}
                type="bar"
                height={350}
              />
            </div>
          </div>

          {/* AOV by Day of Week */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Average Order Value by Day of Week
              </h3>
              <ReactApexChart
                options={aovChartOptions}
                series={[
                  { name: "AOV", data: sortedData.map(d => d.avg_order_value) }
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
                Detailed Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 dark:text-white">Day of Week</th>
                      <th className="px-6 py-3 dark:text-white">Orders</th>
                      <th className="px-6 py-3 dark:text-white">Net Sales (₹)</th>
                      <th className="px-6 py-3 dark:text-white">Avg Order Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="px-6 py-4 font-medium dark:text-white">{row.day_name}</td>
                        <td className="px-6 py-4 dark:text-white">{row.orders}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.net_sales.toFixed(2)}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.avg_order_value.toFixed(2)}</td>
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
