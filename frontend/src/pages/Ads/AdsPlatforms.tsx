import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface PlatformAdsData {
  platform: string;
  orders: number;
  net_sales: number;
  ad_spend: number;
  roas: number;
}

export default function AdsPlatforms() {
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
  const [data, setData] = useState<PlatformAdsData[]>([]);

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
      // Process data to include ad metrics
      const processedData = (result.data || []).map((item: any) => ({
        platform: item.platform,
        orders: item.orders,
        net_sales: item.net_sales,
        ad_spend: item.total_commission || 0, // Using commission as proxy for ad spend
        roas: item.net_sales > 0 ? (item.net_sales / (item.total_commission || 1)) : 0
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

  const swiggy = data.find(d => d.platform === "swiggy");
  const zomato = data.find(d => d.platform === "zomato");

  const chartOptions = {
    chart: { type: "bar" as const, height: 350, toolbar: { show: true } },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "55%", borderRadius: 4 }
    },
    dataLabels: { enabled: true, style: { fontSize: "12px" } },
    xaxis: { categories: ["Swiggy", "Zomato"] },
    yaxis: {
      labels: {
        formatter: (value: number) => Math.round(value).toString()
      }
    },
    colors: ["#FB6514", "#DC2626"] // Swiggy orange, Zomato red
  };

  return (
    <>
      <PageMeta
        title="Ads Performance by Platform"
        description="Compare advertising performance across Swiggy and Zomato"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Ads Performance by Platform
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
          {/* Platform Cards */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 shadow-sm dark:border-orange-900 dark:bg-orange-950">
              <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-3">Swiggy Ads</h3>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-orange-600">{swiggy?.orders.toLocaleString()} Orders</p>
                <p className="text-xl dark:text-white">₹{swiggy?.net_sales.toFixed(2)} Revenue</p>
                <p className="dark:text-white">Ad Spend: ₹{swiggy?.ad_spend.toFixed(2)}</p>
                <p className="dark:text-white">ROAS: {swiggy?.roas.toFixed(2)}x</p>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900 dark:bg-red-950">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3">Zomato Ads</h3>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-red-600">{zomato?.orders.toLocaleString()} Orders</p>
                <p className="text-xl dark:text-white">₹{zomato?.net_sales.toFixed(2)} Revenue</p>
                <p className="dark:text-white">Ad Spend: ₹{zomato?.ad_spend.toFixed(2)}</p>
                <p className="dark:text-white">ROAS: {zomato?.roas.toFixed(2)}x</p>
              </div>
            </div>
          </div>

          {/* Orders Comparison */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold dark:text-white">Orders from Ads</h3>
              <ReactApexChart
                options={chartOptions}
                series={[{ name: "Orders", data: [swiggy?.orders || 0, zomato?.orders || 0] }]}
                type="bar"
                height={300}
              />
            </div>
          </div>

          {/* Revenue Comparison */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold dark:text-white">Revenue from Ads (₹)</h3>
              <ReactApexChart
                options={chartOptions}
                series={[{ name: "Revenue", data: [swiggy?.net_sales || 0, zomato?.net_sales || 0] }]}
                type="bar"
                height={300}
              />
            </div>
          </div>

          {/* Ad Spend Comparison */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold dark:text-white">Ad Spend (₹)</h3>
              <ReactApexChart
                options={chartOptions}
                series={[{ name: "Ad Spend", data: [swiggy?.ad_spend || 0, zomato?.ad_spend || 0] }]}
                type="bar"
                height={300}
              />
            </div>
          </div>

          {/* Detailed Table */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold dark:text-white">Platform Performance Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-white">
                    <tr>
                      <th className="px-6 py-3">Platform</th>
                      <th className="px-6 py-3">Orders</th>
                      <th className="px-6 py-3">Revenue (₹)</th>
                      <th className="px-6 py-3">Ad Spend (₹)</th>
                      <th className="px-6 py-3">ROAS</th>
                      <th className="px-6 py-3">Profit (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="px-6 py-4 font-medium capitalize dark:text-white">{row.platform}</td>
                        <td className="px-6 py-4 dark:text-white">{row.orders.toLocaleString()}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.net_sales.toFixed(2)}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.ad_spend.toFixed(2)}</td>
                        <td className="px-6 py-4 dark:text-white">{row.roas.toFixed(2)}x</td>
                        <td className="px-6 py-4 dark:text-white">₹{(row.net_sales - row.ad_spend).toFixed(2)}</td>
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
