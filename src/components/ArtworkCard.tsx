import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

type Props = {
  image?: ImageSourcePropType;
  title: string;
  description: string;
  color: string;
  accent?: string;
  meta: string;
  onPress: () => void;
  available?: boolean;
  banner?: boolean;
};

export default function ArtworkCard({
  image,
  title,
  description,
  color,
  accent = '#A5E1EB',
  meta,
  onPress,
  available = true,
  banner = false,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta}`}
      disabled={!available}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: color },
        pressed && s.pressed,
      ]}
    >
      <View
        style={[
          s.artwork,
          { aspectRatio: banner ? 16 / 9 : 1 },
        ]}
      >
        {image ? (
          <Image
            source={image}
            style={s.image}
            resizeMode="cover"
          />
        ) : (
          <View style={s.placeholder}>
            <Text style={s.placeholderText}>
              Coming soon
            </Text>
          </View>
        )}

        {!available && image && (
          <View style={s.overlay}>
            <Text style={s.overlayText}>
              COMING SOON
            </Text>
          </View>
        )}
      </View>

      <View style={[s.body, banner && s.bannerBody]}>
        <Text
          style={[
            s.title,
            banner && s.bannerTitle,
          ]}
        >
          {title}
        </Text>

        <Text style={s.description}>
          {description}
        </Text>

        <View style={s.footer}>
          <Text
            style={[
              s.meta,
              { color: accent },
            ]}
          >
            {meta}
          </Text>

          {available && (
            <Text
              style={[
                s.arrow,
                { color: accent },
              ]}
            >
              →
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF14',
    flex: 1,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  artwork: {
    width: '100%',
    backgroundColor: '#252940',
    position: 'relative',
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },

  placeholderText: {
    color: '#A6A9C4',
    fontWeight: '800',
    fontSize: 18,
    textAlign: 'center',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  body: {
    padding: 15,
    gap: 8,
    flex: 1,
  },

  bannerBody: {
    padding: 19,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  bannerTitle: {
    fontSize: 24,
  },

  description: {
    color: '#D0D1E5',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 5,
  },

  meta: {
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },

  arrow: {
    fontSize: 25,
    fontWeight: '800',
  },
});
