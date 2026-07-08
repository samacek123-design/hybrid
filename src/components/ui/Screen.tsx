import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { IconBib, IconCard, IconLedger, IconTrend, type IconProps } from '@/components/ui/Icons';
import { PressableScale } from '@/components/ui/Pressable';
import { layout, space } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

const NAV_H = 64;

/** Page chrome: paper background, centered phone-width column, bottom nav.
 *  `overlay` renders above everything (including the nav), pinned to the
 *  viewport rather than the scroll content. */
export function Screen({
  children,
  nav = true,
  scroll = true,
  style,
  overlay,
}: {
  children: React.ReactNode;
  nav?: boolean;
  scroll?: boolean;
  style?: ViewStyle;
  overlay?: React.ReactNode;
}) {
  const { c } = usePalette();
  const insets = useSafeAreaInsets();
  const bottomPad = nav ? NAV_H + insets.bottom + space.xl : insets.bottom + space.xl;
  const inner = (
    <View style={{ width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingHorizontal: layout.gutter, flexGrow: 1 }}>
      {children}
    </View>
  );
  return (
    <View style={[{ flex: 1, backgroundColor: c.paper }, style]}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: bottomPad, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: insets.top + space.lg, paddingBottom: bottomPad }}>{inner}</View>
      )}
      {nav && <BottomNav />}
      {overlay}
    </View>
  );
}

const TABS: { href: string; label: string; Icon: (p: IconProps) => React.JSX.Element }[] = [
  { href: '/', label: 'Today', Icon: IconCard },
  { href: '/history', label: 'History', Icon: IconLedger },
  { href: '/progress', label: 'Progress', Icon: IconTrend },
  { href: '/profile', label: 'Profile', Icon: IconBib },
];

export function BottomNav() {
  const { c } = usePalette();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: c.paperRaised,
        borderTopWidth: layout.rule,
        borderTopColor: c.line,
        paddingBottom: insets.bottom,
        ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as object) : null),
      }}
    >
      <View
        style={{
          height: NAV_H,
          maxWidth: layout.maxWidth,
          width: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
        }}
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          const tint = active ? c.ink : c.inkFaint;
          return (
            <PressableScale
              key={href}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              onPress={() => !active && router.replace(href as never)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              <Icon size={22} color={tint} strokeWidth={active ? 2.4 : 1.8} />
              <AppText v="label" color={tint} style={{ fontSize: 10, letterSpacing: 1 }}>
                {label}
              </AppText>
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  height: 3,
                  width: 28,
                  backgroundColor: active ? c.strength : 'transparent',
                }}
              />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
