import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface KeywordData {
  keyword: string;
  impressions: number;
  clicks: number;
  orders: number;
  spend: number;
  revenue: number;
  ctr: number;
  conversion_rate: number;
  roas: number;
}

export default function AdsKeywords() {
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
  const [data, setData] = useState<KeywordData[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/ads/by-keyword?${getDateParams()}`);
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

  const topKeywordsByRevenue = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topKeywordsByROAS = [...data].sort((a, b) => b.roas - a.roas).slice(0, 10);

  const revenueChartOptions = {
    chart: {
      type: "bar" as const,
      height: 350,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `₹${val.toLocaleString()}`,
      style: { fontSize: "11px" }
    },
    xaxis: {
      categories: topKeywordsByRevenue.map(d => d.keyword),
      title: { text: "Revenue (₹)" }
    },
    colors: ["#10B981"]
  };

  const roasChartOptions = {
    chart: {
      type: "bar" as const,
      height: 350,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(2)}x`,
      style: { fontSize: "11px" }
    },
    xaxis: {
      categories: topKeywordsByROAS.map(d => d.keyword),
      title: { text: "ROAS" }
    },
    colors: ["#8B5CF6"]
  };

  const totalSpend = data.reduce((sum, d) => sum + d.spend, 0);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
  const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <>
      <PageMeta
        title="Ads Keyword Performance"
        description="Analyze performance of advertising keywords"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Ads Keyword Performance
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
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Keywords</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{data.length}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spend</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">₹{totalSpend.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">₹{totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall ROAS</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{overallROAS.toFixed(2)}x</p>
            </div>
          </div>

          {/* Top Keywords by Revenue */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Top 10 Keywords by Revenue
              </h3>
              <ReactApexChart
                options={revenueChartOptions}
                series={[
                  { name: "Revenue", data: topKeywordsByRevenue.map(d => d.revenue) }
                ]}
                type="bar"
                height={350}
              />
            </div>
          </div>

          {/* Top Keywords by ROAS */}
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Top 10 Keywords by ROAS
              </h3>
              <ReactApexChart
                options={roasChartOptions}
                series={[
                  { name: "ROAS", data: topKeywordsByROAS.map(d => d.roas) }
                ]}
                type="bar"
                height={350}
              />
            </div>
          </div>

          {/* Detailed Table */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                All Keywords Performance
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 dark:text-white">Keyword</th>
                      <th className="px-6 py-3 dark:text-white">Impressions</th>
                      <th className="px-6 py-3 dark:text-white">Clicks</th>
                      <th className="px-6 py-3 dark:text-white">CTR (%)</th>
                      <th className="px-6 py-3 dark:text-white">Orders</th>
                      <th className="px-6 py-3 dark:text-white">Conv. Rate (%)</th>
                      <th className="px-6 py-3 dark:text-white">Spend (₹)</th>
                      <th className="px-6 py-3 dark:text-white">Revenue (₹)</th>
                      <th className="px-6 py-3 dark:text-white">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="px-6 py-4 font-medium dark:text-white">{row.keyword}</td>
                        <td className="px-6 py-4 dark:text-white">{row.impressions.toLocaleString()}</td>
                        <td className="px-6 py-4 dark:text-white">{row.clicks.toLocaleString()}</td>
                        <td className="px-6 py-4 dark:text-white">{row.ctr.toFixed(2)}%</td>
                        <td className="px-6 py-4 dark:text-white">{row.orders}</td>
                        <td className="px-6 py-4 dark:text-white">{row.conversion_rate.toFixed(2)}%</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.spend.toLocaleString()}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.revenue.toLocaleString()}</td>
                        <td className="px-6 py-4 font-semibold dark:text-white">{row.roas.toFixed(2)}x</td>
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
