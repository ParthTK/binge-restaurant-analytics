import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || "https://binge-company-dashboard-857840687457.asia-south1.run.app";

interface Restaurant {
  rest_id: number;
  name: string;
  swiggy_id: number | null;
  zomato_id: number | null;
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  selectedRestaurant: number | null;
  setSelectedRestaurant: (id: number | null) => void;
  restaurantsLoaded: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/restaurants`);
        const data = await response.json();
        setRestaurants(data.restaurants || []);
        // Auto-select first restaurant
        if (data.restaurants && data.restaurants.length > 0) {
          setSelectedRestaurant(data.restaurants[0].rest_id);
        }
        setRestaurantsLoaded(true);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        setRestaurantsLoaded(true);
      }
    };
    fetchRestaurants();
  }, []);

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        selectedRestaurant,
        setSelectedRestaurant,
        restaurantsLoaded
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};
