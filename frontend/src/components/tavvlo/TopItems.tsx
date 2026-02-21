import type { TopItemsData } from "../../pages/Dashboard/Tavvlo";

interface TopItemsProps {
  data: TopItemsData | null;
}

const formatNumber = (value: number) => {
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toLocaleString("en-IN");
};

export default function TopItems({ data }: TopItemsProps) {
  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Top Selling Items
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
        Top Selling Items
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="pb-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">
                #
              </th>
              <th className="pb-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">
                Item Name
              </th>
              <th className="pb-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">
                Platform
              </th>
              <th className="pb-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">
                Order Count
              </th>
              <th className="pb-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">
                Total Quantity
              </th>
              <th className="pb-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">
                Restaurants
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr
                key={index}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-4 text-sm text-gray-600 dark:text-gray-400">
                  {index + 1}
                </td>
                <td className="py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                  {item.item_name}
                </td>
                <td className="py-4">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    item.platform.toLowerCase() === 'swiggy'
                      ? 'bg-swiggy-500/10 text-swiggy-500'
                      : item.platform.toLowerCase() === 'zomato'
                      ? 'bg-zomato-500/10 text-zomato-500'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {item.platform}
                  </span>
                </td>
                <td className="py-4 text-right text-sm text-gray-800 dark:text-white/90">
                  {formatNumber(item.order_count)}
                </td>
                <td className="py-4 text-right text-sm font-semibold text-gray-800 dark:text-white/90">
                  {formatNumber(item.total_quantity)}
                </td>
                <td className="py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                  {item.restaurant_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
