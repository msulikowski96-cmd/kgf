import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BookingScreen from "@/screens/BookingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type BookingStackParamList = {
  Booking: undefined;
};

const Stack = createNativeStackNavigator<BookingStackParamList>();

export default function BookingStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{
          title: "Rezerwacja",
        }}
      />
    </Stack.Navigator>
  );
}
