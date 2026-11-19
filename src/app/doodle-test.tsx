import { useState } from 'react';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

import Canvas from '../games/doodle-clash/Canvas';

import DrawingTools from
  '../games/doodle-clash/DrawingTools';

import type {
  Stroke,
  DrawingTool,
} from '../games/doodle-clash/types';

export default function DoodleTest() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [strokes, setStrokes] =
    useState<Stroke[]>([]);

  const [redoStack, setRedoStack] =
    useState<Stroke[]>([]);

  const [color, setColor] =
    useState('#171717');

  const [brushSize, setBrushSize] =
    useState(8);

  const [tool, setTool] =
    useState<DrawingTool>('brush');

  const [canDraw, setCanDraw] =
    useState(true);

  const [drawing, setDrawing] =
    useState(false);

  function addStroke(stroke: Stroke) {
    setStrokes(previous => [...previous, stroke]);
    setRedoStack([]);
  }

  function undo() {
    if (!strokes.length) return;

    const last = strokes[strokes.length - 1];

    setRedoStack(previous => [...previous, last]);
    setStrokes(previous => previous.slice(0, -1));
  }

  function redo() {
    if (!redoStack.length) return;

    const last = redoStack[redoStack.length - 1];

    setStrokes(previous => [...previous, last]);
    setRedoStack(previous => previous.slice(0, -1));
  }

  function clear() {
    setStrokes([]);
    setRedoStack([]);
  }

  return (
    <ScrollView
      style={styles.root}
      scrollEnabled={!drawing}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 15, 30),
          paddingBottom: insets.bottom + 30,
        },
      ]}
    >
      <Pressable onPress={() => router.replace('/')}>
        <Text style={styles.back}>Back to GameDen</Text>
      </Pressable>

      <Text style={styles.eyebrow}>
        DEVELOPMENT PREVIEW
      </Text>

      <Text style={styles.title}>
        Doodle Clash
      </Text>

      <Text style={styles.subtitle}>
        Test drawing, colors, erasing and undo.
      </Text>

      <View style={styles.status}>
        <Text style={styles.statusText}>
          {canDraw ? 'Artist mode' : 'Viewer mode'}
        </Text>

        <Pressable
          onPress={() => {
            setCanDraw(previous => !previous);
            setDrawing(false);
          }}
        >
          <Text style={styles.toggle}>
            Switch mode
          </Text>
        </Pressable>
      </View>

      <View
        onTouchStart={() => {
          if (canDraw) setDrawing(true);
        }}
        onTouchEnd={() => setDrawing(false)}
        onTouchCancel={() => setDrawing(false)}
      >
        <Canvas
          strokes={strokes}
          color={color}
          brushSize={brushSize}
          tool={tool}
          canDraw={canDraw}
          onStrokeComplete={addStroke}
        />
      </View>

      {canDraw && (
        <DrawingTools
          color={color}
          brushSize={brushSize}
          tool={tool}
          canUndo={strokes.length > 0}
          canRedo={redoStack.length > 0}
          onColorChange={setColor}
          onSizeChange={setBrushSize}
          onToolChange={setTool}
          onUndo={undo}
          onRedo={redo}
          onClear={clear}
        />
      )}

      <Text style={styles.subtitle}>
        Strokes: {strokes.length}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121629',
  },

  content: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 18,
  },

  back: {
    fontWeight: '800',
    color: '#A5E1EB',
  },

  eyebrow: {
    color: '#C5BAFF',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '900',
  },

  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  subtitle: {
    fontSize: 14,
    color: '#A6A9C4',
  },

  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#242841',
    borderRadius: 12,
  },

  statusText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  toggle: {
    color: '#A5E1EB',
    fontWeight: '800',
  },
});
