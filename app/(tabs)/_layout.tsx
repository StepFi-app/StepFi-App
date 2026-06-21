import { Tabs } from 'expo-router';
import { Home, CreditCard, Calendar, Star, Settings, Calculator } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTranslation } from '../../hooks/useTranslation';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandGreen,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: t('tabs.loans'),
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
  name="simulate"
  options={{
    title: 'Simulate',
    tabBarIcon: ({ color, size }) => <Calculator color={color} size={size} />,
  }}
/>
<Tabs.Screen
  name="calendar"
  options={{
    title: t('tabs.calendar'),
    tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
  }}
/>
      />
      <Tabs.Screen
        name="reputation"
        options={{
          title: t('tabs.score'),
          tabBarIcon: ({ color, size }) => <Star color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
