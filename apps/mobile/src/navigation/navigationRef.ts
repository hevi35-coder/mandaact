import { createNavigationContainerRef } from '@react-navigation/native'

import type { RootStackParamList } from './RootNavigator'

export const navigationRef = createNavigationContainerRef<RootStackParamList>()

export function resetToHome() {
  if (!navigationRef.isReady()) return

  navigationRef.reset({
    index: 0,
    routes: [{ name: 'Main' }],
  })
}

