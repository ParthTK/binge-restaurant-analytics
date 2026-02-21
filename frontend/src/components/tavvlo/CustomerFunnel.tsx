import type { FunnelData } from "../../pages/Dashboard/Tavvlo";

interface CustomerFunnelProps {
  data: FunnelData | null;
}

const formatNumber = (value: number) => {
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toLocaleString("en-IN");
};

export default function CustomerFunnel({ data }: CustomerFunnelProps) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Customer Funnel
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const maxValue = data.total_impressions || 1;

  const stages = [
    {
      label: "Impressions",
      value: data.total_impressions,
      percentage: 100,
      conversion: null,
    },
    {
      label: "Menu Opens",
      value: data.total_menu_opens,
      percentage: (data.total_menu_opens / maxValue) * 100,
      conversion: data.imp_to_menu_pct,
    },
    {
      label: "Cart Builds",
      value: data.total_carts,
      percentage: (data.total_carts / maxValue) * 100,
      conversion: data.menu_to_cart_pct,
    },
    {
      label: "Orders",
      value: data.total_orders,
      percentage: (data.total_orders / maxValue) * 100,
      conversion: data.cart_to_order_pct,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
        Customer Funnel
      </h3>
      <div className="space-y-6">
        {stages.map((stage, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-white min-w-[120px]">
                  {stage.label}
                </span>
                <span className="text-lg font-bold text-gray-800 dark:text-white/90">
                  {formatNumber(stage.value)}
                </span>
              </div>
              {stage.conversion !== null && (
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {stage.conversion.toFixed(2)}% conversion
                </span>
              )}
            </div>
            <div className="h-12 w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${stage.percentage}%` }}
              >
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
