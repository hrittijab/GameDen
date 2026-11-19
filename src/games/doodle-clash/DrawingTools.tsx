import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  BRUSH_COLORS,
  BRUSH_SIZES,
  type DrawingTool,
} from './types';

type Props = {
  restricted?: boolean;
  canClear?: boolean;
  color: string;
  brushSize: number;
  tool: DrawingTool;
  canUndo: boolean;
  canRedo: boolean;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onToolChange: (tool: DrawingTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

export default function DrawingTools({
  color,
  brushSize,
  tool,
  canUndo,
  canRedo,
  onColorChange,
  onSizeChange,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  restricted = false,
  canClear = true,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>COLORS</Text>

      <View style={styles.row}>
        {BRUSH_COLORS.filter(
          item =>
            !restricted ||
            item !== '#FFFFFF',
        ).map(item => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Color ${item}`}
            accessibilityState={{
              selected: item === color && tool === 'brush',
            }}
            onPress={() => {
              onToolChange('brush');
              onColorChange(item);
            }}
            style={[
              styles.color,
              { backgroundColor: item },
              item === color &&
                tool === 'brush' &&
                styles.selectedColor,
            ]}
          />
        ))}
      </View>

      <Text style={styles.label}>BRUSH SIZE</Text>

      <View style={styles.row}>
        {BRUSH_SIZES.map(size => (
          <Pressable
            key={size}
            accessibilityRole="button"
            accessibilityLabel={`Brush size ${size}`}
            accessibilityState={{
              selected: size === brushSize,
            }}
            onPress={() => onSizeChange(size)}
            style={[
              styles.sizeButton,
              size === brushSize &&
                styles.selectedButton,
            ]}
          >
            <View style={{
              width: Math.max(4, size * 0.65),
              height: Math.max(4, size * 0.65),
              borderRadius: 50,
              backgroundColor: '#FFFFFF',
            }} />
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={() => onToolChange('brush')}
          style={[
            styles.button,
            tool === 'brush' &&
              styles.selectedButton,
          ]}
        >
          <Text style={styles.buttonText}>Brush</Text>
        </Pressable>

        <Pressable
          disabled={restricted}
          onPress={() => onToolChange('eraser')}
          style={[
            styles.button,
            tool === 'eraser' &&
              styles.selectedButton,
            restricted && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>Eraser</Text>
        </Pressable>

        <Pressable
          disabled={restricted || !canUndo}
          onPress={onUndo}
          style={[
            styles.button,
            (restricted || !canUndo) && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>Undo</Text>
        </Pressable>

        <Pressable
          disabled={restricted || !canRedo}
          onPress={onRedo}
          style={[
            styles.button,
            (restricted || !canRedo) && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>Redo</Text>
        </Pressable>

        <Pressable
          disabled={restricted || !canClear}
          onPress={onClear}
          style={[
            styles.button,
            styles.clearButton,
            (restricted || !canClear) &&
              styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#242841',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },

  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#A6A9C4',
  },

  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },

  color: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF25',
  },

  selectedColor: {
    borderWidth: 3,
    borderColor: '#A991FF',
    transform: [{ scale: 1.15 }],
  },

  sizeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#343956',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedButton: {
    backgroundColor: '#7463C5',
  },

  button: {
    backgroundColor: '#343956',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 10,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  clearButton: {
    backgroundColor: '#72354C',
  },

  disabled: {
    opacity: 0.35,
  },
});

