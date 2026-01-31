import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ContactScreen from "@/screens/ContactScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ContactStackParamList = {
  Contact: undefined;
};

const Stack = createNativeStackNavigator<ContactStackParamList>();

export default function ContactStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Contact"
        component={ContactScreen}
        options={{
          title: "Kontakt",
        }}
      />
    </Stack.Navigator>
  );
}
