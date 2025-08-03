import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, FileText, Cloud, Calendar,
  CheckSquare, BookOpen, Target, Zap, Bot
} from 'lucide-react-native';
import { PersonalSummary, AppSettings, UserActivity } from '@/types';
import { StorageService } from '@/utils/storage';
import { activityTracker } from '@/utils/activityTracker';
import { formatDisplayDate } from '@/utils/dateUtils';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import SettingsSection from '@/components/SettingsSection';

type ProfileTab = 'overview' | 'summaries' | 'sync' | 'settings';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [summaries, setSummaries] = useState<PersonalSummary[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [loadedSummaries, loadedSettings] = await Promise.all([
      StorageService.getPersonalSummaries(),
      StorageService.getSettings(),
    ]);

    setSummaries(loadedSummaries);
    setSettings(loadedSettings);

    // Load recent activities
    const activities = activityTracker.getRecentActivities(10);
    setRecentActivities(activities);
  };

  const getOverviewStats = () => {
    const recentSummaries = summaries.length;
    return { recentSummaries };
  };

  const stats = getOverviewStats();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.overviewContent}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <FileText size={24} color={colors.semantic.warning} />
                <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                  {stats.recentSummaries}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                  {t('navigation.diary')}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Calendar size={24} color={colors.primary[500]} />
                <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                  {new Date().toLocaleDateString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                  {t('common.today')}
                </Text>
              </View>
            </View>

            <View style={styles.recentSection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Recent Activity
              </Text>
              {recentActivities.length === 0 ? (
                <View style={[styles.emptyActivity, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.emptyActivityText, { color: colors.text.secondary }]}>
                    No recent activity
                  </Text>
                </View>
              ) : (
                recentActivities.slice(0, 5).map((activity) => (
                  <View key={activity.id} style={[styles.activityItem, { backgroundColor: colors.surface }]}>
                    <View style={styles.activityIcon}>
                      {activity.type === 'task_completed' && <CheckSquare size={16} color={colors.semantic.success} />}
                      {activity.type === 'task_created' && <CheckSquare size={16} color={colors.primary[500]} />}
                      {activity.type === 'diary_entry_created' && <BookOpen size={16} color={colors.semantic.warning} />}
                      {activity.type === 'goal_created' && <Target size={16} color={colors.accent[500]} />}
                      {activity.type === 'habit_completed' && <Zap size={16} color={colors.semantic.success} />}
                      {activity.type === 'ai_interaction' && <Bot size={16} color={colors.primary[600]} />}
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityTitle, { color: colors.text.primary }]}>
                        {activity.title}
                      </Text>
                      <Text style={[styles.activityDate, { color: colors.text.secondary }]}>
                        {formatDisplayDate(activity.timestamp)}
                      </Text>
                      {activity.description && (
                        <Text style={[styles.activityDescription, { color: colors.text.tertiary }]}>
                          {activity.description}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        );

      case 'summaries':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.tabTitle, { color: colors.text.primary }]}>
              Personal Summaries
            </Text>

            {summaries.map((summary) => (
              <View key={summary.id} style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <View style={styles.summaryHeader}>
                  <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
                    {summary.title}
                  </Text>
                  <Text style={[styles.summaryPeriod, { color: colors.text.secondary }]}>
                    {summary.period}
                  </Text>
                </View>

                <Text style={[styles.summaryContent, { color: colors.text.secondary }]} numberOfLines={3}>
                  {summary.content}
                </Text>

                <Text style={[styles.summaryDate, { color: colors.text.tertiary }]}>
                  {formatDisplayDate(summary.date)}
                </Text>
              </View>
            ))}
          </View>
        );

      case 'sync':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.tabTitle, { color: colors.text.primary }]}>
              Data Sync
            </Text>
            <View style={[styles.comingSoon, { backgroundColor: colors.surface }]}>
              <Cloud size={48} color={colors.text.tertiary} />
              <Text style={[styles.comingSoonText, { color: colors.text.secondary }]}>
                Sync features coming soon
              </Text>
            </View>
          </View>
        );

      case 'settings':
        return <SettingsSection style={styles.tabContent} />;

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <User size={32} color={colors.primary[500]} />
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {t('navigation.profile')}
        </Text>
      </View>

      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'summaries', label: 'Summaries' },
          { key: 'sync', label: 'Sync' },
          { key: 'settings', label: t('settings.general') },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              { backgroundColor: colors.surface },
              activeTab === tab.key && { backgroundColor: colors.primary[500] },
            ]}
            onPress={() => setActiveTab(tab.key as ProfileTab)}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: colors.text.secondary },
                activeTab === tab.key && { color: colors.text.inverse },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginLeft: 12,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  overviewContent: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyActivity: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 16,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  activityIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  summaryPeriod: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  summaryContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  summaryDate: {
    fontSize: 12,
  },
  comingSoon: {
    padding: 48,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});