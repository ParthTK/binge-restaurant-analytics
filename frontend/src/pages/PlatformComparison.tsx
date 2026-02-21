import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface PlatformData {
  platform: string;
  orders: number;
  net_sales: number;
  gross_sales: number;
  total_discounts: number;
  avg_order_value: number;
  total_commission: number;
  avg_commission_pct: number;
  discounted_orders: number;
  avg_discount_pct: number;
}

export default function PlatformComparison() {
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
  const [data, setData] = useState<PlatformData[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/platform-comparison?${getDateParams()}`);
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

  const swiggy = data.find(d => d.platform === "swiggy");
  const zomato = data.find(d => d.platform === "zomato");

  const chartOptions = {
    chart: { type: "bar" as const, height: 350 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        dataLabels: { position: "top" },
        distributed: true  // This makes each bar use a different color from the colors array
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: { fontSize: "12px", colors: ["#304758"] },
      formatter: (val: number) => val.toFixed(2)
    },
    xaxis: { categories: ["Swiggy", "Zomato"] },
    colors: ["#FB6514", "#DC2626"], // Swiggy: Orange, Zomato: Bright Red
    legend: { show: false } // Hide legend since we're using distributed colors
  };

  const netSalesChartOptions = {
    ...chartOptions,
    yaxis: {
      labels: {
        formatter: (value: number) => Math.round(value).toLocaleString()
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: { fontSize: "12px", colors: ["#304758"] },
      formatter: (val: number) => Math.round(val).toLocaleString()
    }
  };

  const aovChartOptions = {
    ...chartOptions,
    yaxis: {
      labels: {
        formatter: (value: number) => Math.round(value).toLocaleString()
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: { fontSize: "12px", colors: ["#304758"] },
      formatter: (val: number) => Math.round(val).toLocaleString()
    }
  };

  return (
    <>
      <PageMeta title="Platform Comparison - Swiggy vs Zomato" description="Detailed platform analysis" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-offwhite mb-4">
          Platform Comparison: Swiggy vs Zomato
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
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-midnight-700 dark:bg-gray-800 dark:text-offwhite"
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
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 shadow-sm dark:border-orange-900 dark:bg-midnight-600">
              <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-3">Swiggy</h3>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-orange-600">{swiggy?.orders.toLocaleString()} Orders</p>
                <p className="text-xl dark:text-offwhite">₹{swiggy?.net_sales.toFixed(2)} Net Sales</p>
                <p className="dark:text-offwhite">AOV: ₹{swiggy?.avg_order_value.toFixed(2)}</p>
                <p className="dark:text-offwhite">Commission: {swiggy?.avg_commission_pct.toFixed(2)}%</p>
                <p className="dark:text-offwhite">Avg Discount: {swiggy?.avg_discount_pct.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900 dark:bg-midnight-600">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3">Zomato</h3>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-red-600">{zomato?.orders.toLocaleString()} Orders</p>
                <p className="text-xl dark:text-offwhite">₹{zomato?.net_sales.toFixed(2)} Net Sales</p>
                <p className="dark:text-offwhite">AOV: ₹{zomato?.avg_order_value.toFixed(2)}</p>
                <p className="dark:text-offwhite">Commission: {zomato?.avg_commission_pct.toFixed(2)}%</p>
                <p className="dark:text-offwhite">Avg Discount: {zomato?.avg_discount_pct.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-midnight-700 dark:bg-midnight-600">
              <h3 className="mb-4 text-lg font-semibold dark:text-offwhite">Orders Comparison</h3>
              <ReactApexChart
                options={chartOptions}
                series={[{ name: "Orders", data: [swiggy?.orders || 0, zomato?.orders || 0] }]}
                type="bar"
                height={300}
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-midnight-700 dark:bg-midnight-600">
              <h3 className="mb-4 text-lg font-semibold dark:text-offwhite">Net Sales Comparison (₹)</h3>
              <ReactApexChart
                options={netSalesChartOptions}
                series={[{ name: "Net Sales", data: [swiggy?.net_sales || 0, zomato?.net_sales || 0] }]}
                type="bar"
                height={300}
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-midnight-700 dark:bg-midnight-600">
              <h3 className="mb-4 text-lg font-semibold dark:text-offwhite">Average Order Value (₹)</h3>
              <ReactApexChart
                options={aovChartOptions}
                series={[{ name: "AOV", data: [swiggy?.avg_order_value || 0, zomato?.avg_order_value || 0] }]}
                type="bar"
                height={300}
              />
            </div>
          </div>

          {/* Detailed Table */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-midnight-700 dark:bg-midnight-600">
              <h3 className="mb-4 text-lg font-semibold dark:text-offwhite">Detailed Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-midnight-700">
                    <tr>
                      <th className="px-6 py-3 dark:text-offwhite">Metric</th>
                      <th className="px-6 py-3 dark:text-offwhite">Swiggy</th>
                      <th className="px-6 py-3 dark:text-offwhite">Zomato</th>
                      <th className="px-6 py-3 dark:text-offwhite">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b dark:border-midnight-700">
                      <td className="px-6 py-4 font-medium dark:text-offwhite">Orders</td>
                      <td className="px-6 py-4 dark:text-offwhite">{swiggy?.orders.toLocaleString()}</td>
                      <td className="px-6 py-4 dark:text-offwhite">{zomato?.orders.toLocaleString()}</td>
                      <td className="px-6 py-4 dark:text-offwhite">{((swiggy?.orders || 0) - (zomato?.orders || 0)).toLocaleString()}</td>
                    </tr>
                    <tr className="border-b dark:border-midnight-700">
                      <td className="px-6 py-4 font-medium dark:text-offwhite">Net Sales (₹)</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{swiggy?.net_sales.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{zomato?.net_sales.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{((swiggy?.net_sales || 0) - (zomato?.net_sales || 0)).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b dark:border-midnight-700">
                      <td className="px-6 py-4 font-medium dark:text-offwhite">Gross Sales (₹)</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{swiggy?.gross_sales.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{zomato?.gross_sales.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{((swiggy?.gross_sales || 0) - (zomato?.gross_sales || 0)).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b dark:border-midnight-700">
                      <td className="px-6 py-4 font-medium dark:text-offwhite">Total Discounts (₹)</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{swiggy?.total_discounts.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{zomato?.total_discounts.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{((swiggy?.total_discounts || 0) - (zomato?.total_discounts || 0)).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b dark:border-midnight-700">
                      <td className="px-6 py-4 font-medium dark:text-offwhite">AOV (₹)</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{swiggy?.avg_order_value.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{zomato?.avg_order_value.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{((swiggy?.avg_order_value || 0) - (zomato?.avg_order_value || 0)).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b dark:border-midnight-700">
                      <td className="px-6 py-4 font-medium dark:text-offwhite">Total Commission (₹)</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{swiggy?.total_commission.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{zomato?.total_commission.toFixed(2)}</td>
                      <td className="px-6 py-4 dark:text-offwhite">₹{((swiggy?.total_commission || 0) - (zomato?.total_commission || 0)).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b dark:border-midnight-700">
                      <td className="px-6 py-4 font-medium dark:text-offwhite">Avg Commission %</td>
                      <td className="px-6 py-4 dark:text-offwhite">{swiggy?.avg_commission_pct.toFixed(2)}%</td>
                      <td className="px-6 py-4 dark:text-offwhite">{zomato?.avg_commission_pct.toFixed(2)}%</td>
                      <td className="px-6 py-4 dark:text-offwhite">{((swiggy?.avg_commission_pct || 0) - (zomato?.avg_commission_pct || 0)).toFixed(2)}%</td>
                    </tr>
                    <tr className="border-b dark:border-midnight-700">
                      <td className="px-6 py-4 font-medium dark:text-offwhite">Discounted Orders</td>
                      <td className="px-6 py-4 dark:text-offwhite">{swiggy?.discounted_orders.toLocaleString()}</td>
                      <td className="px-6 py-4 dark:text-offwhite">{zomato?.discounted_orders.toLocaleString()}</td>
                      <td className="px-6 py-4 dark:text-offwhite">{((swiggy?.discounted_orders || 0) - (zomato?.discounted_orders || 0)).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium dark:text-offwhite">Avg Discount %</td>
                      <td className="px-6 py-4 dark:text-offwhite">{swiggy?.avg_discount_pct.toFixed(2)}%</td>
                      <td className="px-6 py-4 dark:text-offwhite">{zomato?.avg_discount_pct.toFixed(2)}%</td>
                      <td className="px-6 py-4 dark:text-offwhite">{((swiggy?.avg_discount_pct || 0) - (zomato?.avg_discount_pct || 0)).toFixed(2)}%</td>
                    </tr>
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
