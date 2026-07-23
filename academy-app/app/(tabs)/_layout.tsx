import { TabBar } from '@/components/common/TabBar';
import { useInbox } from '@/stores/inbox';
import { IconCal, IconHome, IconUsers } from '@findemy/ui';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

/** Home / dashboard — a 2×2 grid of rounded squares (prototype icon). */
function GridIcon({ size = 21, color }: { size?: number; color: string }) {
  const cell = size * 0.42;
  const gap = size - cell * 2;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={{ width: cell, height: cell, borderRadius: 3, borderWidth: 2, borderColor: color }}
        />
      ))}
    </View>
  );
}

export default function TabLayout() {
  const newCount = useInbox((state) => state.newCountSinceLastSeen);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        const routeName = state.routes[state.index].name;
        // settings & workshops are Studio sub-pages reached via router.push (no
        // tab button of their own) — keep the Studio tab highlighted there.
        const active = routeName === 'settings' || routeName === 'workshops' ? 'studio' : routeName;
        const items = [
          {
            key: 'inbox',
            label: 'Home',
            renderIcon: (c: string) => <GridIcon size={21} color={c} />,
            badge: newCount,
          },
          {
            key: 'schedule',
            label: 'Schedule',
            renderIcon: (c: string) => <IconCal size={22} color={c} />,
          },
          {
            key: 'students',
            label: 'Students',
            renderIcon: (c: string) => <IconUsers size={22} color={c} />,
          },
          {
            key: 'studio',
            label: 'Studio',
            renderIcon: (c: string) => <IconHome size={22} color={c} />,
          },
        ];
        return (
          <TabBar
            items={items}
            active={active}
            onChange={(key) => {
              const route = state.routes.find((tabRoute) => tabRoute.name === key);
              if (route) navigation.navigate(route.name);
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
      <Tabs.Screen name="students" options={{ title: 'Students' }} />
      <Tabs.Screen name="studio" options={{ title: 'Studio' }} />
      <Tabs.Screen name="workshops" options={{ title: 'Workshops' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
