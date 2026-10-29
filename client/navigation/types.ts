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

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  RideDetails: { id: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
