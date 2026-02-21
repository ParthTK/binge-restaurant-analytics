import type { AdsData } from "../../pages/Dashboard/Tavvlo";

interface AdsPerformanceProps {
  data: AdsData | null;
}

const formatCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
  return `₹${value.toFixed(2)}`;
};

export default function AdsPerformance({ data }: AdsPerformanceProps) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Advertising Performance
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const metrics = [
    {
      label: "Total Spend",
      value: formatCurrency(data.total_spend),
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(data.total_revenue),
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "ROI",
      value: `${data.roi_pct.toFixed(2)}%`,
      color: data.roi_pct >= 100 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
        Advertising Performance
      </h3>
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
          >
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {metric.label}
            </span>
            <span className={`text-lg font-bold ${metric.color}`}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
