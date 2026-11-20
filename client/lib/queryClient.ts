import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  rides: ["rides"] as const,
  ride: (id: string) => ["rides", id] as const,
  nearby: ["nearby"] as const,
  driverProfile: ["driver", "me"] as const,
  driverOffers: ["driver", "offers"] as const,
  driverRides: ["driver", "rides"] as const,
};
