import { useRef, useState } from 'react';

import {
  View,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';

import Svg, { Path, Circle } from 'react-native-svg';

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  type Point,
  type Stroke,
  type DrawingTool,
} from './types';

type Props = {
  strokes: Stroke[];
  color: string;
  brushSize: number;
  tool: DrawingTool;
  canDraw: boolean;
  onStrokeComplete: (stroke: Stroke) => void;
};

function createPath(points: Point[]): string {
  if (!points.length) return '';

  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ');
}

export default function Canvas({
  strokes,
  color,
  brushSize,
  tool,
  canDraw,
  onStrokeComplete,
}: Props) {
  const [layout, setLayout] = useState({
    width: 1,
    height: 1,
  });

  const [draft, setDraft] =
    useState<Stroke | null>(null);

  const activeStroke =
    useRef<Stroke | null>(null);

  const sequence = useRef(0);

  function getPoint(
    event: GestureResponderEvent
  ): Point {
    const { locationX, locationY } =
      event.nativeEvent;

    return {
      x: Math.max(
        0,
        Math.min(
          CANVAS_WIDTH,
          locationX / layout.width * CANVAS_WIDTH
        )
      ),
      y: Math.max(
        0,
        Math.min(
          CANVAS_HEIGHT,
          locationY / layout.height * CANVAS_HEIGHT
        )
      ),
    };
  }

  function beginStroke(
    event: GestureResponderEvent
  ) {
    if (!canDraw) return;

    sequence.current += 1;

    const stroke: Stroke = {
      id: `${Date.now()}-${sequence.current}`,
      color:
        tool === 'eraser' ? '#FFFFFF' : color,
      width:
        tool === 'eraser'
          ? brushSize * 2
          : brushSize,
      points: [getPoint(event)],
    };

    activeStroke.current = stroke;
    setDraft(stroke);
  }

  function moveStroke(
    event: GestureResponderEvent
  ) {
    if (!canDraw || !activeStroke.current) {
      return;
    }

    const current = activeStroke.current;
    const point = getPoint(event);

    const previous =
      current.points[current.points.length - 1];

    if (
      Math.hypot(
        point.x - previous.x,
        point.y - previous.y
      ) < 2
    ) {
      return;
    }

    const updated: Stroke = {
      ...current,
      points: [...current.points, point],
    };

    activeStroke.current = updated;
    setDraft(updated);
  }

  function finishStroke() {
    const completed = activeStroke.current;

    activeStroke.current = null;
    setDraft(null);

    if (completed && canDraw) {
      onStrokeComplete(completed);
    }
  }

  function cancelStroke() {
    activeStroke.current = null;
    setDraft(null);
  }

  const visibleStrokes = draft
    ? [...strokes, draft]
    : strokes;

  return (
    <View
      style={styles.container}
      onLayout={event => {
        const { width, height } =
          event.nativeEvent.layout;

        if (width > 0 && height > 0) {
          setLayout({ width, height });
        }
      }}
    >
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        >
          {visibleStrokes.map(stroke =>
            stroke.points.length === 1 ? (
              <Circle
                key={stroke.id}
                cx={stroke.points[0].x}
                cy={stroke.points[0].y}
                r={stroke.width / 2}
                fill={stroke.color}
              />
            ) : (
              <Path
                key={stroke.id}
                d={createPath(stroke.points)}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )
          )}
        </Svg>
      </View>

      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => canDraw}
        onMoveShouldSetResponder={() => canDraw}
        onResponderGrant={beginStroke}
        onResponderMove={moveStroke}
        onResponderRelease={finishStroke}
        onResponderTerminate={cancelStroke}
        onResponderTerminationRequest={() => false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: CANVAS_WIDTH / CANVAS_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
});

