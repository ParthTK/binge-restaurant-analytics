import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import PageMeta from "../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

export default function UserTypes() {
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
  const [data, setData] = useState<any>(null);

  const getDateParams = () => {
    const [start, end] = dateRange;
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return `start_date=${startStr}&end_date=${endStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/customers/segmentation?${getDateParams()}`);
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

  const donutOptions: ApexOptions = {
    chart: { type: "donut" },
    labels: ["New Users", "Repeat Users", "Lapsed Users"],
    colors: ["#10b981", "#3b82f6", "#f59e0b"],
    legend: { position: "bottom" },
  };

  const donutSeries = [
    data?.new_customers || 0,
    data?.repeat_customers || 0,
    data?.lapsed_customers || 0,
  ];

  return (
    <>
      <PageMeta title="User Types" description="Customer segmentation by user type" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Customer Segmentation by User Type</h1>
        <Flatpickr value={dateRange} onChange={(dates) => { if (dates.length === 2) { setDateRange([dates[0], dates[1]]); } }} options={{ mode: "range", dateFormat: "Y-m-d", maxDate: "2025-12-31", minDate: "2025-01-01", }} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
      </div>
      {loading ? ( <div className="flex h-96 items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div></div> ) : ( <div className="grid grid-cols-12 gap-4 md:gap-6"><div className="col-span-12 md:col-span-6"><div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Customer Distribution</h2><ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={350} /></div></div><div className="col-span-12 md:col-span-6"><div className="grid grid-cols-1 gap-4"><div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h3 className="text-sm text-gray-500 dark:text-gray-400 mb-2">New Customers</h3><p className="text-2xl font-bold text-green-600">{data?.new_customers?.toLocaleString() || 0}</p></div><div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h3 className="text-sm text-gray-500 dark:text-gray-400 mb-2">Repeat Customers</h3><p className="text-2xl font-bold text-blue-600">{data?.repeat_customers?.toLocaleString() || 0}</p></div><div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h3 className="text-sm text-gray-500 dark:text-gray-400 mb-2">Lapsed Customers</h3><p className="text-2xl font-bold text-yellow-600">{data?.lapsed_customers?.toLocaleString() || 0}</p></div></div></div></div> )}
    </>
  );
}
