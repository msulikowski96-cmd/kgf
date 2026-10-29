import React, { forwardRef, useState } from "react";
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface TextFieldProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField(
    { label, icon, error, hint, secureTextEntry, multiline, style, ...props },
    ref,
  ) {
    const { theme } = useTheme();
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(true);

    const borderColor = error
      ? theme.error
      : focused
        ? theme.textSecondary
        : theme.border;

    return (
      <View style={styles.wrapper}>
        {label ? (
          <ThemedText type="small" color="secondary" style={styles.label}>
            {label}
          </ThemedText>
        ) : null}
        <View
          style={[
            styles.field,
            multiline && styles.multiline,
            { backgroundColor: theme.backgroundSecondary, borderColor },
          ]}
        >
          {icon ? (
            <Feather
              name={icon}
              size={18}
              color={theme.textSecondary}
              style={styles.icon}
            />
          ) : null}
          <TextInput
            ref={ref}
            placeholderTextColor={theme.textTertiary}
            selectionColor={theme.accent}
            secureTextEntry={secureTextEntry && hidden}
            multiline={multiline}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            style={[
              styles.input,
              { color: theme.text },
              multiline && styles.multilineInput,
              style,
            ]}
            {...props}
          />
          {secureTextEntry ? (
            <Pressable
              onPress={() => setHidden((h) => !h)}
              hitSlop={12}
              accessibilityLabel={hidden ? "Pokaż hasło" : "Ukryj hasło"}
            >
              <Feather
                name={hidden ? "eye" : "eye-off"}
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
        {error ? (
          <ThemedText
            type="caption"
            style={[styles.helper, { color: theme.error }]}
          >
            {error}
          </ThemedText>
        ) : hint ? (
          <ThemedText type="caption" color="tertiary" style={styles.helper}>
            {hint}
          </ThemedText>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  field: {
    minHeight: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  multiline: {
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
  },
  icon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    outlineStyle: "none",
  } as any,
  multilineInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  helper: {
    marginTop: Spacing.xs,
  },
});
