import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface TopItem {
  item_name: string;
  order_count: number;
  total_quantity: number;
  platform?: string;
  restaurant_count?: number;
}

export default function TopItems() {
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
  const [data, setData] = useState<{ items: TopItem[] } | null>(null);

  const getDateParams = () => {
    const [start, end] = dateRange;
    return `start_date=${start.toISOString().split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/items/top-items?${getDateParams()}`);
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
  }, [dateRange]);

  const top10Items = data?.items?.slice(0, 10) || [];

  const chartOptions = {
    chart: {
      type: "bar" as const,
      height: 400,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: { position: "top" as const }
      }
    },
    dataLabels: {
      enabled: true,
      offsetX: 30,
      style: { fontSize: "11px" }
    },
    xaxis: {
      categories: top10Items.map(item => item.item_name),
      title: { text: "Order Count" }
    },
    yaxis: {
      labels: {
        style: { fontSize: "11px" },
        maxWidth: 150
      }
    },
    colors: ["#3B82F6"]
  };

  return (
    <>
      <PageMeta title="Top Items" description="Best-selling items and menu analysis" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Top Selling Items</h1>
        <Flatpickr
          value={dateRange}
          onChange={(dates) => { if (dates.length === 2) setDateRange([dates[0], dates[1]]); }}
          options={{
            mode: "range",
            dateFormat: "Y-m-d",
            maxDate: new Date().toISOString().split("T")[0],
            minDate: "2024-01-01"
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        </div>
      ) : data?.items && data.items.length > 0 ? (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Top 10 Chart */}
          <div className="col-span-12 xl:col-span-8">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Top 10 Best-Selling Items
              </h3>
              <ReactApexChart
                options={chartOptions}
                series={[{
                  name: "Orders",
                  data: top10Items.map(item => item.order_count)
                }]}
                type="bar"
                height={400}
              />
            </div>
          </div>

          {/* Summary Card */}
          <div className="col-span-12 xl:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-white">Total Items</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {data.items.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white">Top Item</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white mt-1">
                    {top10Items[0]?.item_name || "N/A"}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {top10Items[0]?.order_count.toLocaleString() || 0} orders
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white">Total Orders</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {data.items.reduce((sum, item) => sum + item.order_count, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full Table */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">All Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-white">
                    <tr>
                      <th className="px-6 py-3">Rank</th>
                      <th className="px-6 py-3">Item Name</th>
                      <th className="px-6 py-3">Order Count</th>
                      <th className="px-6 py-3">Total Quantity</th>
                      {data.items.some(item => item.platform) && <th className="px-6 py-3">Platform</th>}
                      {data.items.some(item => item.restaurant_count) && <th className="px-6 py-3">Restaurants</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 font-medium dark:text-white">#{idx + 1}</td>
                        <td className="px-6 py-4 dark:text-white">{item.item_name}</td>
                        <td className="px-6 py-4 dark:text-white">{item.order_count.toLocaleString()}</td>
                        <td className="px-6 py-4 dark:text-white">{item.total_quantity.toLocaleString()}</td>
                        {data.items.some(item => item.platform) && (
                          <td className="px-6 py-4">
                            {item.platform ? (
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${
                                item.platform.toLowerCase() === 'swiggy'
                                  ? 'bg-swiggy-500/10 text-swiggy-500'
                                  : item.platform.toLowerCase() === 'zomato'
                                  ? 'bg-zomato-500/10 text-zomato-500'
                                  : 'bg-primary/10 text-primary dark:text-white'
                              }`}>
                                {item.platform}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        {data.items.some(item => item.restaurant_count) && (
                          <td className="px-6 py-4 dark:text-white">{item.restaurant_count || "-"}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
