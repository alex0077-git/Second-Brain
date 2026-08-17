import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius } from '../app-colors';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'easy' | 'hard';
  style?: ViewStyle;
};

export function AppButton({ title, onPress, disabled, variant = 'primary', style }: Props) {
  const bg =
    variant === 'primary' ? colors.accent :
    variant === 'easy' ? colors.easy :
    variant === 'hard' ? colors.hard :
    'transparent';

  const textColor = variant === 'outline' ? colors.text : colors.accentText;
  const borderColor = variant === 'outline' ? colors.border : bg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: {
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});