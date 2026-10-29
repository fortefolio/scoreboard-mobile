import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/lib/i18n';
import { Colors, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { t, locale, setLocale } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.brandTitle}>
              SCORE<ThemedText type="title" style={styles.brandAccent}>BOARD</ThemedText>
            </ThemedText>
            <ThemedText type="small" style={styles.subtitle}>
              {t('home.heroSubtitle')}
            </ThemedText>
          </View>

          {/* Language Switcher */}
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => setLocale(locale === 'en' ? 'pt' : 'en')}
            activeOpacity={0.8}
          >
            <ThemedText type="small" style={styles.langText}>
              {locale === 'en' ? '🇬🇧 EN' : '🇵🇹 PT'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            {t('home.heroTitle')}
          </ThemedText>
          <ThemedText style={styles.cardBody}>
            {authLoading
              ? t('common.loading')
              : user
              ? `${t('nav.signedInAs')} ${user.email}`
              : t('home.unauthDesc')}
          </ThemedText>
        </ThemedView>

        {/* Phase 1 Foundations Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <ThemedText type="small" style={styles.badgeText}>
              ✓ Phase 1 Foundations Ready
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#f8fafc',
  },
  brandAccent: {
    color: '#4f46e5',
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 2,
  },
  langButton: {
    backgroundColor: '#151b2d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#232d4b',
  },
  langText: {
    fontWeight: '600',
    color: '#f8fafc',
  },
  card: {
    backgroundColor: '#151b2d',
    borderRadius: 12,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#232d4b',
    marginBottom: Spacing.four,
  },
  cardTitle: {
    color: '#f8fafc',
    marginBottom: Spacing.two,
    fontWeight: '700',
  },
  cardBody: {
    color: '#94a3b8',
    lineHeight: 20,
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  badge: {
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.3)',
  },
  badgeText: {
    color: '#4edea3',
    fontWeight: '600',
  },
});
