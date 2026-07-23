import { useLiveRoomToken } from '@/hooks/useLiveRoom';
import { ApiError } from '@findemy/types';
import { Button, IconCamera, IconX, useTheme } from '@findemy/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LiveClassRoom() {
  const { batch_id } = useLocalSearchParams<{ batch_id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data, isLoading, error } = useLiveRoomToken(batch_id);

  const errorCode = error instanceof ApiError ? error.code : null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.color.ink }]}
      edges={['top', 'bottom']}
    >
      {/* Top bar: close */}
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Close">
          <IconX size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#fff" size="large" />
          <Text
            style={[styles.label, { fontFamily: theme.font.sans, color: '#fff', marginTop: 16 }]}
          >
            Connecting to class…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.heading, { fontFamily: theme.font.sansBold, color: '#fff' }]}>
            {errorCode === 'NOT_IN_SESSION' ? "Class isn't live yet" : 'Unable to join'}
          </Text>
          <Text
            style={[
              styles.label,
              { fontFamily: theme.font.sans, color: 'rgba(255,255,255,0.6)', marginTop: 8 },
            ]}
          >
            {errorCode === 'NOT_IN_SESSION'
              ? "The class hasn't started. Join up to 10 min before your scheduled time."
              : 'Something went wrong. Please try again.'}
          </Text>
          <View style={styles.cta}>
            <Button variant="primary" onPress={() => router.back()} block>
              Go back
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          {/* S3.3: `data.token` + `data.room_id` are a real 100ms room. Join here with
              @100ms/react-native-sdk (HMSSDK.join → render peer tiles). Native module →
              needs a dev build + camera/mic permissions. Attendance is written server-side
              by the 100ms peer.join webhook — no client write needed. */}
          <View style={[styles.badge, { backgroundColor: theme.color.jade }]}>
            <IconCamera size={34} color="#fff" />
          </View>
          <Text
            style={[
              styles.heading,
              { fontFamily: theme.font.sansBold, color: '#fff', marginTop: 18 },
            ]}
          >
            You're in · {data?.room_name}
          </Text>
          <Text
            style={[
              styles.label,
              { fontFamily: theme.font.sans, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
            ]}
          >
            Live class in progress
          </Text>

          <View style={styles.tokenCard}>
            <Text
              style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: theme.font.sans }}
            >
              Room ID: {data?.room_id}
            </Text>
          </View>

          <View style={styles.cta}>
            <Button variant="primary" onPress={() => router.back()} block>
              Leave class
            </Button>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 22,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  tokenCard: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cta: {
    marginTop: 32,
    alignSelf: 'stretch',
  },
});
