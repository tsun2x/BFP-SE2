import { createNavigationContainerRef } from '@react-navigation/native';

// Define the navigation parameter types
type RootStackParamList = {
  MainTabs: undefined;
  MapScreen: undefined;
  FireTruckTracking: undefined;
  // Add other screen names as needed
  [key: string]: object | undefined;
};

// Create the navigation ref with proper typing
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Type-safe navigation function
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    // @ts-ignore - Workaround for TypeScript issue with navigation ref
    navigationRef.navigate(name, params);
  }
}

// Safe goBack with fallback
export function goBack() {
  if (navigationRef.isReady()) {
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
    } else {
      // Fallback to reset if we can't go back
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  }
}
