import type { NavigatorScreenParams } from "@react-navigation/native";
import type { VehicleId } from "@shared/fleet";

export type BookingStackParamList = {
  Booking: { vehicle?: VehicleId } | undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  BookingTab: NavigatorScreenParams<BookingStackParamList> | undefined;
  RidesTab: undefined;
  ProfileTab: undefined;
};

export type DriverTabParamList = {
  DriverHomeTab: undefined;
  DriverRidesTab: undefined;
  DriverProfileTab: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  DriverMain: NavigatorScreenParams<DriverTabParamList> | undefined;
  RideDetails: { id: string };
  // `then: "booking"` opens the booking form after choosing the place
  PlaceSearch: { field: "pickup" | "destination"; then?: "booking" };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
