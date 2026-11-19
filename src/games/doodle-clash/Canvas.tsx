import {
  useRef,
  useState,
} from 'react';

import {
  View,
  StyleSheet,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import Svg, {
  Path,
  Circle,
} from 'react-native-svg';

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
  onStrokeProgress?: (stroke: Stroke) => void;
};

function StrokeShape({
  stroke,
}: {
  stroke: Stroke;
}) {
  if (!stroke.points.length) return null;

  if (stroke.points.length === 1) {
    const point = stroke.points[0];

    return (
      <Circle
        cx={point.x}
        cy={point.y}
        r={stroke.width / 2}
        fill={stroke.color}
      />
    );
  }

  const path = stroke.points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
    )
    .join(' ');

  return (
    <Path
      d={path}
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

export default function Canvas({
  strokes,
  color,
  brushSize,
  tool,
  canDraw,
  onStrokeComplete,
  onStrokeProgress,
}: Props) {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  const [draft, setDraft] =
    useState<Stroke | null>(null);

  const active =
    useRef<Stroke | null>(null);

  const sequence = useRef(0);

  function layout(event: LayoutChangeEvent) {
    const { width, height } =
      event.nativeEvent.layout;

    setSize({ width, height });
  }

  function getPoint(
    event: GestureResponderEvent,
  ): Point {
    const { locationX, locationY } =
      event.nativeEvent;

    return {
      x: Math.round(
        Math.max(
          0,
          Math.min(
            CANVAS_WIDTH,
            locationX /
              Math.max(1, size.width) *
              CANVAS_WIDTH,
          ),
        ),
      ),
      y: Math.round(
        Math.max(
          0,
          Math.min(
            CANVAS_HEIGHT,
            locationY /
              Math.max(1, size.height) *
              CANVAS_HEIGHT,
          ),
        ),
      ),
    };
  }

  function begin(
    event: GestureResponderEvent,
  ) {
    if (!canDraw) return;

    sequence.current += 1;

    const stroke: Stroke = {
      id: `${Date.now()}-${sequence.current}-${Math.random().toString(36).slice(2, 9)}`,
      color:
        tool === 'eraser'
          ? '#FFFFFF'
          : color,
      width:
        tool === 'eraser'
          ? brushSize * 2
          : brushSize,
      points: [getPoint(event)],
    };

    active.current = stroke;
    setDraft(stroke);

    onStrokeProgress?.(stroke);
  }

  function move(
    event: GestureResponderEvent,
  ) {
    const previous = active.current;

    if (!canDraw || !previous) return;

    const point = getPoint(event);

    const last =
      previous.points[previous.points.length - 1];

    if (
      Math.hypot(
        point.x - last.x,
        point.y - last.y,
      ) < 2
    ) {
      return;
    }

    let points = [
      ...previous.points,
      point,
    ];

    if (points.length > 500) {
      const end = points[points.length - 1];

      points = points.filter(
        (_, index) => index % 2 === 0,
      );

      if (points[points.length - 1] !== end) {
        points.push(end);
      }
    }

    const updated: Stroke = {
      ...previous,
      points,
    };

    active.current = updated;
    setDraft(updated);

    onStrokeProgress?.(updated);
  }

  function finish() {
    const stroke = active.current;

    active.current = null;
    setDraft(null);

    if (stroke && canDraw) {
      onStrokeComplete(stroke);
    }
  }

  function cancel() {
    active.current = null;
    setDraft(null);
  }

  return (
    <View
      onLayout={layout}
      style={s.canvas}
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
          {strokes.map(stroke => (
            <StrokeShape
              key={stroke.id}
              stroke={stroke}
            />
          ))}

          {!!draft && canDraw && (
            <StrokeShape stroke={draft} />
          )}
        </Svg>
      </View>

      {canDraw && (
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => canDraw}
          onMoveShouldSetResponder={() => canDraw}
          onResponderGrant={begin}
          onResponderMove={move}
          onResponderRelease={finish}
          onResponderTerminate={cancel}
          onResponderTerminationRequest={() => false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  canvas: {
    width: '100%',
    aspectRatio: CANVAS_WIDTH / CANVAS_HEIGHT,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});
