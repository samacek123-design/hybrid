/**
 * Settings — theme control and the OpenRouter AI connection. Calm, quiet
 * page in the same register as Profile: rows, small type, no theatrics.
 */
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Rule } from '@/components/ui/Bits';
import { PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { useStore } from '@/lib/store';
import type { ThemeMode } from '@/lib/types';
import { fonts, layout, space } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
];

export default function Settings() {
  const { c } = usePalette();
  const { state, apply } = useStore();
  const [apiKey, setApiKey] = useState(state.aiSettings.apiKey ?? '');
  const [model, setModel] = useState(state.aiSettings.model ?? '');

  const setThemeMode = (mode: ThemeMode) => apply((prev) => ({ ...prev, themeMode: mode }));

  const saveApiKey = (value: string) => {
    setApiKey(value);
    apply((prev) => ({ ...prev, aiSettings: { ...prev.aiSettings, apiKey: value.trim() || undefined } }));
  };
  const saveModel = (value: string) => {
    setModel(value);
    apply((prev) => ({ ...prev, aiSettings: { ...prev.aiSettings, model: value.trim() || undefined } }));
  };

  const inputStyle = {
    borderWidth: layout.rule,
    borderColor: c.line,
    backgroundColor: c.paper,
    padding: 10,
    fontFamily: fonts.mono,
    fontSize: 14,
    color: c.ink,
    minHeight: 44,
  } as const;

  return (
    <Screen>
      <AppText v="label" color={c.inkSoft}>
        preferences
      </AppText>
      <AppText v="hero" style={{ fontSize: 44, lineHeight: 46, marginTop: 2 }}>
        Settings
      </AppText>
      <Rule style={{ marginTop: space.md, marginBottom: space.lg }} />

      {/* theme */}
      <AppText v="label" color={c.inkSoft} style={{ marginBottom: space.sm }}>
        appearance
      </AppText>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {THEME_OPTIONS.map(({ key, label }) => {
          const active = state.themeMode === key;
          return (
            <PressableScale
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setThemeMode(key)}
              style={{
                flex: 1,
                borderWidth: layout.rule,
                borderColor: active ? c.ink : c.lineFaint,
                backgroundColor: active ? c.ink : 'transparent',
                paddingVertical: 10,
                alignItems: 'center',
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <AppText v="title" color={active ? c.paper : c.inkSoft} style={{ fontSize: 14 }}>
                {label}
              </AppText>
            </PressableScale>
          );
        })}
      </View>

      {/* AI */}
      <AppText v="label" color={c.inkSoft} style={{ marginTop: space.xl, marginBottom: space.sm }}>
        AI coach · OpenRouter
      </AppText>
      <AppText v="serif" color={c.inkSoft} style={{ fontSize: 14, marginBottom: space.md }}>
        Paste your own OpenRouter API key to let the coach build and refine your program. Without a
        key, Hybrid falls back to its built-in rule-based planner — the app always works offline.
      </AppText>

      <AppText v="label" color={c.inkFaint} style={{ marginBottom: 4, fontSize: 10 }}>
        API key
      </AppText>
      <TextInput
        value={apiKey}
        onChangeText={saveApiKey}
        placeholder="sk-or-v1-…"
        placeholderTextColor={c.inkFaint}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={inputStyle}
      />

      <AppText v="label" color={c.inkFaint} style={{ marginTop: space.md, marginBottom: 4, fontSize: 10 }}>
        model (OpenRouter slug — optional)
      </AppText>
      <TextInput
        value={model}
        onChangeText={saveModel}
        placeholder="openai/gpt-4o-mini"
        placeholderTextColor={c.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        style={inputStyle}
      />

      <AppText v="label" color={c.inkFaint} style={{ marginTop: space.xl, fontSize: 9 }}>
        the key lives on this device only, inside the same local app data as your program and logs.
      </AppText>
    </Screen>
  );
}
