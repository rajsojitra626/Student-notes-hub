import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 🚀 Yeh line niche wale home/navigation bar ko permanent hide (remove) kar degi
        tabBarStyle: { display: 'none' }, 
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
    </Tabs>
  );
}