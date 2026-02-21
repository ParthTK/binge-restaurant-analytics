import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface WeekdayWeekendData {
  day_type: string;
  platform: string;
  orders: number;
  net_sales: number;
}

export default function WeekdayWeekend() {
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
  const [data, setData] = useState<WeekdayWeekendData[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sales/weekday-weekend?${getDateParams()}`);
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

  // Process data for charts
  const chartData = {
    series: [
      {
        name: "Weekday Orders",
        data: data.filter(d => d.day_type === "Weekday").map(d => d.orders)
      },
      {
        name: "Weekend Orders",
        data: data.filter(d => d.day_type === "Weekend").map(d => d.orders)
      }
    ],
    options: {
      chart: {
        type: "bar" as const,
        height: 350
      },
      xaxis: {
        categories: [...new Set(data.map(d => d.platform))]
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
        }
      }
    }
  };

  return (
    <>
      <PageMeta
        title="Weekday vs Weekend Analysis"
        description="Compare weekday and weekend sales performance"
      />

      {/* Date Range Selector */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Weekday vs Weekend Analysis
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
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Orders: Weekday vs Weekend
              </h3>
              <ReactApexChart
                options={chartData.options}
                series={chartData.series}
                type="bar"
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
                <table className="w-full text-sm text-left text-gray-800 dark:text-white">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-white">
                    <tr>
                      <th className="px-6 py-3">Day Type</th>
                      <th className="px-6 py-3">Platform</th>
                      <th className="px-6 py-3">Orders</th>
                      <th className="px-6 py-3">Net Sales (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="px-6 py-4 dark:text-white">{row.day_type}</td>
                        <td className="px-6 py-4 dark:text-white">{row.platform}</td>
                        <td className="px-6 py-4 dark:text-white">{row.orders}</td>
                        <td className="px-6 py-4 dark:text-white">₹{row.net_sales.toLocaleString()}</td>
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
