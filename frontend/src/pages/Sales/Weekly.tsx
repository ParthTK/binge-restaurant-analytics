import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface WeeklyData {
  week_number: number;
  week_start: string;
  orders: number;
  net_sales: number;
  gross_sales: number;
  total_discounts: number;
}

export default function Weekly() {
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
  const [data, setData] = useState<WeeklyData[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sales/weekly?${getDateParams()}`);
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

  const chartOptions = {
    chart: {
      type: "line" as const,
      height: 350
    },
    xaxis: {
      categories: data.map(d => `Week ${d.week_number}`)
    },
    yaxis: {
      labels: {
        formatter: (value: number) => Math.round(value).toString()
      }
    },
    stroke: {
      curve: "smooth" as const,
      width: 2
    },
    colors: ["#3b82f6", "#10b981"]
  };

  return (
    <>
      <PageMeta title="Weekly Sales Analysis" description="Weekly aggregated sales metrics" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Weekly Sales Analysis
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
          <div className="col-span-12 xl:col-span-8">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Net Sales by Week</h3>
              <ReactApexChart
                options={chartOptions}
                series={[
                  {
                    name: "Net Sales",
                    data: data.map(d => d.net_sales)
                  },
                  {
                    name: "Gross Sales",
                    data: data.map(d => d.gross_sales)
                  }
                ]}
                type="line"
                height={350}
              />
            </div>
          </div>

          <div className="col-span-12 xl:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Orders by Week</h3>
              <ReactApexChart
                options={{
                  ...chartOptions,
                  chart: { type: "bar", height: 350 },
                  colors: ["#f59e0b"]
                }}
                series={[
                  {
                    name: "Orders",
                    data: data.map(d => d.orders)
                  }
                ]}
                type="bar"
                height={350}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
