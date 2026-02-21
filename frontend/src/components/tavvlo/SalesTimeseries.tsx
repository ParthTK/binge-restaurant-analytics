import { ApexOptions } from "apexcharts";
import ReactApexChart from "react-apexcharts";
import type { SalesTimeseriesData } from "../../pages/Dashboard/Tavvlo";

interface SalesTimeseriesProps {
  data: SalesTimeseriesData | null;
}

export default function SalesTimeseries({ data }: SalesTimeseriesProps) {
  if (!data || !data.series || data.series.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Sales Trend
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const categories = data.series.map((d) => d.date);
  const salesData = data.series.map((d) => d.net_sales);
  const ordersData = data.series.map((d) => d.orders);

  const options: ApexOptions = {
    chart: {
      type: "area",
      height: 350,
      fontFamily: "Inter, sans-serif",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    colors: ["#3C50E0", "#80CAEE"],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: "#9CA3AF",
        },
      },
    },
    yaxis: [
      {
        title: {
          text: "Net Sales (₹)",
          style: {
            color: "#9CA3AF",
          },
        },
        labels: {
          style: {
            colors: "#9CA3AF",
          },
          formatter: (value) => {
            if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
            if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
            return `₹${value.toFixed(2)}`;
          },
        },
      },
      {
        opposite: true,
        title: {
          text: "Orders",
          style: {
            color: "#9CA3AF",
          },
        },
        labels: {
          style: {
            colors: "#9CA3AF",
          },
          formatter: (value) => Math.round(value).toString(),
        },
      },
    ],
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 5,
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: {
        colors: "#9CA3AF",
      },
    },
    tooltip: {
      theme: "dark",
      y: [
        {
          formatter: (value) => {
            if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
            if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
            return `₹${value.toLocaleString("en-IN")}`;
          },
        },
        {
          formatter: (value) => `${value.toLocaleString("en-IN")} orders`,
        },
      ],
    },
  };

  const series = [
    {
      name: "Net Sales",
      data: salesData,
    },
    {
      name: "Orders",
      data: ordersData,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        Sales Trend
      </h3>
      <ReactApexChart options={options} series={series} type="area" height={350} />
    </div>
  );
}
