import type { OperationsData } from "../../pages/Dashboard/Tavvlo";

interface OperationsProps {
  data: OperationsData | null;
}

export default function Operations({ data }: OperationsProps) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Operations
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const metrics = [
    {
      label: "Average Rating",
      value: data.avg_rating.toFixed(2),
      icon: "⭐",
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Average KPT",
      value: `${data.avg_kpt.toFixed(2)} min`,
      icon: "⏱️",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Total Complaints",
      value: data.total_complaints.toString(),
      icon: "⚠️",
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "FOR Accuracy",
      value: `${data.avg_for.toFixed(2)}%`,
      icon: "✅",
      color: "text-green-600 dark:text-green-400",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
        Operations
      </h3>
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{metric.icon}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {metric.label}
              </span>
            </div>
            <span className={`text-lg font-bold ${metric.color}`}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
