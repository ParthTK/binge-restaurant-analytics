import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface DailyOnlineData {
  date: string;
  online_pct: number;
}

export default function OnlineStatus() {
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
  const [data, setData] = useState<{ data: DailyOnlineData[] } | null>(null);

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

  const avgOnlinePct = data?.data ?
    data.data.reduce((sum, d) => sum + d.online_pct, 0) / data.data.length : 0;

  const chartOptions = {
    chart: {
      type: "area" as const,
      height: 350,
      toolbar: { show: true }
    },
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
      title: { text: "Online %" },
      min: 0,
      max: 100
    },
    stroke: {
      curve: "smooth" as const,
      width: 2
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100]
      }
    },
    colors: ["#10B981"],
    dataLabels: { enabled: false }
  };

  return (
    <>
      <PageMeta title="Online Status" description="Restaurant online status and availability tracking" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Online Status</h1>
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
      ) : data?.data ? (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Summary Card */}
          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Average Online %</h3>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">
                {avgOnlinePct.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">Across {data.data.length} days</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Peak Online %</h3>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {Math.max(...data.data.map(d => d.online_pct)).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">Best day performance</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Lowest Online %</h3>
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {Math.min(...data.data.map(d => d.online_pct)).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">Needs attention</p>
            </div>
          </div>

          {/* Online % Trend Chart */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Online Status Trend
              </h3>
              <ReactApexChart
                options={chartOptions}
                series={[{ name: "Online %", data: data.data.map(d => d.online_pct) }]}
                type="area"
                height={350}
              />
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Daily Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-white">Date</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">Online %</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4 text-gray-800 dark:text-white">{row.date}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${
                            row.online_pct >= 90 ? 'text-green-600' :
                            row.online_pct >= 75 ? 'text-blue-600' :
                            row.online_pct >= 50 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {row.online_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.online_pct >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            row.online_pct >= 75 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            row.online_pct >= 50 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {row.online_pct >= 90 ? 'Excellent' :
                             row.online_pct >= 75 ? 'Good' :
                             row.online_pct >= 50 ? 'Fair' : 'Poor'}
                          </span>
                        </td>
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
