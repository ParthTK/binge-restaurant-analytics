import { ApexOptions } from "apexcharts";
import ReactApexChart from "react-apexcharts";
import type { CustomerSegmentationData } from "../../pages/Dashboard/Tavvlo";

interface CustomerSegmentationProps {
  data: CustomerSegmentationData | null;
}

export default function CustomerSegmentation({ data }: CustomerSegmentationProps) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Customer Segmentation
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const options: ApexOptions = {
    chart: {
      type: "pie",
      fontFamily: "Inter, sans-serif",
    },
    colors: ["#10B981", "#3C50E0"],
    labels: ["New Customers", "Repeat Customers"],
    legend: {
      position: "bottom",
      labels: {
        colors: "#9CA3AF",
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => {
        return `${(val as number).toFixed(2)}%`;
      },
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => `${value.toLocaleString("en-IN")} orders`,
      },
    },
  };

  const series = [data.new_customers, data.repeat_customers];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        Customer Segmentation
      </h3>
      <ReactApexChart options={options} series={series} type="pie" height={300} />
    </div>
  );
}
