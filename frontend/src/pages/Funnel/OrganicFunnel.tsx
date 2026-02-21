import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface FunnelData {
  stage: string;
  count: number;
  conversion_rate: number;
}

export default function OrganicFunnel() {
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
  const [data, setData] = useState<FunnelData[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/funnel/organic?${getDateParams()}`);
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

  const funnelChartOptions = {
    chart: {
      type: "bar" as const,
      height: 400
    },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        barHeight: "80%"
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toLocaleString(),
      style: { fontSize: "14px", fontWeight: "bold" }
    },
    xaxis: {
      categories: data.map(d => d.stage),
      title: { text: "Count" }
    },
    yaxis: {
      title: { text: "Funnel Stage" }
    },
    colors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"],
    legend: { show: false }
  };

  const conversionChartOptions = {
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
      categories: data.map(d => d.stage),
    },
    yaxis: {
      title: { text: "Conversion Rate (%)" },
      min: 0,
      max: 100
    },
    colors: ["#8B5CF6"],
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toFixed(2)}%`
      }
    }
  };

  const totalVisitors = data.length > 0 ? data[0].count : 0;
  const finalOrders = data.length > 0 ? data[data.length - 1].count : 0;
  const overallConversion = totalVisitors > 0 ? (finalOrders / totalVisitors) * 100 : 0;

  return (
    <>
      <PageMeta
        title="Organic Funnel Analysis"
        description="Track user journey through the organic funnel stages"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Organic Funnel Analysis
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
          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Total Visitors</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{totalVisitors.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Final Orders</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{finalOrders.toLocaleString()}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Overall Conversion</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{overallConversion.toFixed(2)}%</p>
            </div>
          </div>

          {/* Funnel Visualization */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Funnel Stages
              </h3>
              <ReactApexChart
                options={funnelChartOptions}
                series={[
                  { name: "Count", data: data.map(d => d.count) }
                ]}
                type="bar"
                height={400}
              />
            </div>
          </div>

          {/* Conversion Rate Chart */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Stage-by-Stage Conversion Rate
              </h3>
              <ReactApexChart
                options={conversionChartOptions}
                series={[
                  { name: "Conversion Rate", data: data.map(d => d.conversion_rate) }
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
                Funnel Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-800 dark:text-white">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-white">
                    <tr>
                      <th className="px-6 py-3">Stage</th>
                      <th className="px-6 py-3">Count</th>
                      <th className="px-6 py-3">Conversion Rate (%)</th>
                      <th className="px-6 py-3">Drop-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="px-6 py-4 font-medium dark:text-white">{row.stage}</td>
                        <td className="px-6 py-4 dark:text-white">{row.count.toLocaleString()}</td>
                        <td className="px-6 py-4 dark:text-white">{row.conversion_rate.toFixed(2)}%</td>
                        <td className="px-6 py-4 dark:text-white">
                          {idx > 0 ? `${((data[idx - 1].count - row.count) / data[idx - 1].count * 100).toFixed(2)}%` : "-"}
                        </td>
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
