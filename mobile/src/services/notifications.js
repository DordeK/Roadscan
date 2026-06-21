import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[notifications] Permission not granted');
  }
  return status === 'granted';
}

export async function sendPotholeWarning(distanceM) {
  const dist = Math.round(distanceM);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Pothole Ahead',
      body: `Pothole detected ${dist}m ahead — slow down.`,
      sound: true,
    },
    trigger: null,
  });
}

export async function scheduleDemoAlert(delaySeconds = 10) {
  const granted = await requestNotificationPermissions();
  if (!granted) {
    console.warn('[notifications] Permission denied — cannot schedule demo alert');
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Pothole Ahead',
      body: 'HIGH severity pothole in 50m — slow down!',
      sound: true,
      data: { demo: true },
    },
    trigger: {
      type: 'timeInterval',
      seconds: delaySeconds,
      repeats: false,
    },
  });
}
