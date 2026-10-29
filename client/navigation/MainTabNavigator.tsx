import React from "react";
import { Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import HomeScreen from "@/screens/HomeScreen";
import BookingScreen from "@/screens/BookingScreen";
import RidesScreen from "@/screens/RidesScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import type {
  BookingStackParamList,
  MainTabParamList,
} from "@/navigation/types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<{ Home: undefined }>();
const BookingStack = createNativeStackNavigator<BookingStackParamList>();
const RidesStack = createNativeStackNavigator<{ Rides: undefined }>();
const ProfileStack = createNativeStackNavigator<{ Profile: undefined }>();

function HomeStackNavigator() {
  const options = useScreenOptions();
  return (
    <HomeStack.Navigator screenOptions={options}>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerTitle: () => <Logo />, headerTitleAlign: "left" }}
      />
    </HomeStack.Navigator>
  );
}

function BookingStackNavigator() {
  const options = useScreenOptions();
  return (
    <BookingStack.Navigator screenOptions={options}>
      <BookingStack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: "Zamów przejazd" }}
      />
    </BookingStack.Navigator>
  );
}

function RidesStackNavigator() {
  const options = useScreenOptions();
  return (
    <RidesStack.Navigator screenOptions={options}>
      <RidesStack.Screen
        name="Rides"
        component={RidesScreen}
        options={{ title: "Moje przejazdy" }}
      />
    </RidesStack.Navigator>
  );
}

function ProfileStackNavigator() {
  const options = useScreenOptions();
  return (
    <ProfileStack.Navigator screenOptions={options}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profil" }}
      />
    </ProfileStack.Navigator>
  );
}

export default function MainTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            default: theme.backgroundRoot,
          }),
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: "Start",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BookingTab"
        component={BookingStackNavigator}
        options={{
          title: "Zamów",
          tabBarIcon: ({ color, size }) => (
            <Feather name="plus-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RidesTab"
        component={RidesStackNavigator}
        options={{
          title: "Przejazdy",
          tabBarIcon: ({ color, size }) => (
            <Feather name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
