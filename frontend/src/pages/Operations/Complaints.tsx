import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface ComplaintsData {
  missing_items: number;
  poor_packaging: number;
  poor_quality: number;
  wrong_order: number;
}

export default function Complaints() {
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
  const [data, setData] = useState<ComplaintsData | null>(null);

  const getDateParams = () => {
    const [start, end] = dateRange;
    return `start_date=${start.toISOString().split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/operations/complaints-breakdown?${getDateParams()}`);
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

  const totalComplaints = data ?
    data.missing_items + data.poor_packaging + data.poor_quality + data.wrong_order : 0;

  const chartOptions = {
    chart: { type: "donut" as const, height: 400 },
    labels: ["Missing Items", "Poor Packaging", "Poor Quality", "Wrong Order"],
    colors: ["#EF4444", "#F59E0B", "#8B5CF6", "#EC4899"],
    legend: { position: "bottom" as const, fontSize: "14px" },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Complaints",
              formatter: () => totalComplaints.toString()
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`
    }
  };

  const barChartOptions = {
    chart: { type: "bar" as const, height: 350, toolbar: { show: true } },
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
      style: { fontSize: "12px" }
    },
    xaxis: {
      categories: ["Missing Items", "Poor Packaging", "Poor Quality", "Wrong Order"],
      title: { text: "Number of Complaints" }
    },
    colors: ["#EF4444", "#F59E0B", "#8B5CF6", "#EC4899"]
  };

  return (
    <>
      <PageMeta title="Complaints Analysis" description="Customer complaints breakdown and trends" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Complaints Analysis</h1>
        <Flatpickr
          value={dateRange}
          onChange={(dates) => { if (dates.length === 2) setDateRange([dates[0], dates[1]]); }}
          options={{ mode: "range", dateFormat: "Y-m-d", maxDate: new Date().toISOString().split("T")[0], minDate: "2024-01-01" }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        </div>
      ) : data ? (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Summary Cards */}
          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Total Complaints</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{totalComplaints}</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Missing Items</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{data.missing_items}</p>
              <p className="text-xs text-gray-500 dark:text-white mt-1">
                {totalComplaints > 0 ? ((data.missing_items / totalComplaints) * 100).toFixed(1) : '0.0'}% of total
              </p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Poor Packaging</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{data.poor_packaging}</p>
              <p className="text-xs text-gray-500 dark:text-white mt-1">
                {totalComplaints > 0 ? ((data.poor_packaging / totalComplaints) * 100).toFixed(1) : '0.0'}% of total
              </p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Poor Quality</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{data.poor_quality}</p>
              <p className="text-xs text-gray-500 dark:text-white mt-1">
                {totalComplaints > 0 ? ((data.poor_quality / totalComplaints) * 100).toFixed(1) : '0.0'}% of total
              </p>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="col-span-12 xl:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Complaint Distribution
              </h3>
              <ReactApexChart
                options={chartOptions}
                series={[data.missing_items, data.poor_packaging, data.poor_quality, data.wrong_order]}
                type="donut"
                height={400}
              />
            </div>
          </div>

          {/* Bar Chart */}
          <div className="col-span-12 xl:col-span-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Complaints Breakdown
              </h3>
              <ReactApexChart
                options={barChartOptions}
                series={[{
                  name: "Complaints",
                  data: [data.missing_items, data.poor_packaging, data.poor_quality, data.wrong_order]
                }]}
                type="bar"
                height={350}
              />
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Detailed Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-white">Wrong Order</h4>
                    <span className="text-xs font-semibold text-pink-600 bg-pink-100 dark:bg-pink-900/30 px-2 py-1 rounded">
                      {totalComplaints > 0 ? ((data.wrong_order / totalComplaints) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-pink-600">{data.wrong_order}</p>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-600"
                      style={{ width: `${totalComplaints > 0 ? (data.wrong_order / totalComplaints) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-white">Missing Items</h4>
                    <span className="text-xs font-semibold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                      {totalComplaints > 0 ? ((data.missing_items / totalComplaints) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{data.missing_items}</p>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600"
                      style={{ width: `${totalComplaints > 0 ? (data.missing_items / totalComplaints) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-white">Poor Packaging</h4>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                      {totalComplaints > 0 ? ((data.poor_packaging / totalComplaints) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{data.poor_packaging}</p>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600"
                      style={{ width: `${totalComplaints > 0 ? (data.poor_packaging / totalComplaints) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-white">Poor Quality</h4>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
                      {totalComplaints > 0 ? ((data.poor_quality / totalComplaints) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{data.poor_quality}</p>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600"
                      style={{ width: `${totalComplaints > 0 ? (data.poor_quality / totalComplaints) * 100 : 0}%` }}
                    />
                  </div>
                </div>
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
