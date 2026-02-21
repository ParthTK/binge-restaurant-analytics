import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface DailyPayout {
  date: string;
  avg_commission_pct: number;
  gross_sales: number;
  other_commissions: number;
  packing_charges: number;
  service_charges: number;
  total_commission: number;
  total_gst: number;
}

interface PayoutResponse {
  data: DailyPayout[];
}

export default function PayoutBreakdown() {
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
  const [data, setData] = useState<DailyPayout[]>([]);

  const getDateParams = () => {
    const [start, end] = dateRange;
    return `start_date=${start.toISOString().split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/financials/commission?${getDateParams()}`);
      const result: PayoutResponse = await response.json();
      setData(result.data || []);
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

  // Calculate totals and net payout
  const totalGrossSales = data.reduce((sum, d) => sum + d.gross_sales, 0);
  const totalCommission = data.reduce((sum, d) => sum + d.total_commission, 0);
  const totalGST = data.reduce((sum, d) => sum + d.total_gst, 0);
  const totalDeductions = totalCommission + totalGST;
  const netPayout = totalGrossSales - totalDeductions;

  // Limit chart to last 20 days
  const chartData = data.slice(-20);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const chartOptions = {
    chart: {
      type: "bar" as const,
      height: 350,
      stacked: true,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "70%"
      }
    },
    xaxis: {
      categories: chartData.map(d => d.date),
      title: { text: "Date" },
      labels: { rotate: -45 }
    },
    yaxis: {
      title: { text: "Amount (₹)" },
      labels: {
        formatter: (val: number) => formatCurrency(val)
      }
    },
    colors: ["#10B981", "#DC2626", "#F59E0B"],
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter: (val: number) => formatCurrency(val)
      }
    },
    legend: {
      position: "top" as const
    }
  };

  return (
    <>
      <PageMeta title="Payout Breakdown" description="Restaurant payout details and breakdown" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Payout Breakdown</h1>
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
      ) : data.length > 0 ? (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Summary Cards */}
          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Gross Sales</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {formatCurrency(totalGrossSales)}
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">Total revenue</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Deductions</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {formatCurrency(totalDeductions)}
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">Commission + GST</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Payout</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {formatCurrency(netPayout)}
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">After deductions</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Payout %</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {totalGrossSales > 0 ? ((netPayout / totalGrossSales) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-white mt-2">Of gross sales</p>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Daily Payout Breakdown
              </h3>
              <ReactApexChart
                options={chartOptions}
                series={[
                  {
                    name: "Net Payout",
                    data: chartData.map(d => d.gross_sales - d.total_commission - d.total_gst)
                  },
                  {
                    name: "Commission",
                    data: chartData.map(d => d.total_commission)
                  },
                  {
                    name: "GST",
                    data: chartData.map(d => d.total_gst)
                  }
                ]}
                type="bar"
                height={350}
              />
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
