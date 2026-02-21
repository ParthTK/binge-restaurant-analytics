import { ApexOptions } from "apexcharts";
import ReactApexChart from "react-apexcharts";
import type { PlatformData } from "../../pages/Dashboard/Tavvlo";

interface PlatformSplitProps {
  data: PlatformData | null;
}

export default function PlatformSplit({ data }: PlatformSplitProps) {
  if (!data || !data.platforms || data.platforms.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Platform Split
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const labels = data.platforms.map((p) => p.platform);
  const seriesData = data.platforms.map((p) => p.net_sales);

  // Map platform names to colors
  const platformColors = data.platforms.map((p) => {
    const platform = p.platform.toLowerCase();
    if (platform === "swiggy") return "#FB6514"; // Swiggy Orange
    if (platform === "zomato") return "#DC2626"; // Zomato Red
    return "#3C50E0"; // Default blue for any other platform
  });

  const options: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "Inter, sans-serif",
    },
    colors: platformColors,
    labels: labels,
    legend: {
      position: "bottom",
      labels: {
        colors: "#9CA3AF",
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Sales",
              fontSize: "14px",
              fontWeight: 600,
              color: "#9CA3AF",
              formatter: () => {
                const total = seriesData.reduce((a, b) => a + b, 0);
                if (total >= 10000000) return `₹${(total / 10000000).toFixed(2)}Cr`;
                if (total >= 100000) return `₹${(total / 100000).toFixed(2)}L`;
                if (total >= 1000) return `₹${(total / 1000).toFixed(2)}K`;
                return `₹${total.toLocaleString("en-IN")}`;
              },
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => {
          if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
          if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
          if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
          return `₹${value.toLocaleString("en-IN")}`;
        },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        Platform Split
      </h3>
      <ReactApexChart options={options} series={seriesData} type="donut" height={350} />
    </div>
  );
}
