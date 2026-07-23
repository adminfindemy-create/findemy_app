import { TabBar } from '@/components/common/TabBar';
import { useClasses } from '@/hooks/useClasses';
import { useAuth } from '@/stores/auth';
import { IconCal, IconSearch, IconUser } from '@findemy/ui';
import { Tabs, useRouter } from 'expo-router';
import { View } from 'react-native';

/** Graduation cap — Classes */
function ClassesIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.8,
          height: size * 0.34,
          backgroundColor: color,
          transform: [{ rotate: '0deg' }, { skewX: '0deg' }],
          borderRadius: 2,
          // diamond cap via rotation
          ...({} as object),
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          width: size * 0.5,
          height: size * 0.34,
          borderWidth: 1.8,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const _user = useAuth((state) => state.user);

  // S3.1: the Classes tab is shown only once the student has at least one class.
  const { data: classes } = useClasses();
  const hasClasses = (classes?.active?.length ?? 0) + (classes?.past?.length ?? 0) > 0;

  return (
    <Tabs
      tabBar={({ state }) => {
        const active = state.routes[state.index].name;
        const items = [
          {
            key: 'index',
            label: 'Discover',
            renderIcon: (c: string) => <IconSearch size={21} color={c} />,
          },
          {
            key: 'events',
            label: 'Events',
            renderIcon: (c: string) => <IconCal size={21} color={c} />,
          },
          ...(hasClasses
            ? [
                {
                  key: 'classes',
                  label: 'Classes',
                  renderIcon: (c: string) => (
                    <View
                      style={{
                        width: 21,
                        height: 21,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ClassesIcon size={21} color={c} />
                    </View>
                  ),
                },
              ]
            : []),
          {
            key: 'profile',
            label: 'Profile',
            renderIcon: (c: string) => <IconUser size={21} color={c} />,
          },
        ];

        return (
          <TabBar
            items={items}
            active={active}
            onChange={(key) => {
              const path = key === 'index' ? '/(tabs)' : `/(tabs)/${key}`;
              router.navigate(path as any);
            }}
          />
        );
      }}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Explore' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="classes" options={{ title: 'Classes' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
