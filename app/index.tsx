import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/pay" />;
  }
  
  return <Redirect href="/(auth)/sign-in" />;
}
