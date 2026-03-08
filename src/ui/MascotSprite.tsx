import { Image, StyleSheet, View } from 'react-native';

type MascotVariant = 'saving' | 'broken' | 'worried' | 'happy' | 'nodata';

const SHEET_W = 1024;
const SHEET_H = 1024;

const FRAMES: Record<MascotVariant, { x: number; y: number; w: number; h: number }> = {
  saving: { x: 24, y: 48, w: 460, h: 320 },
  broken: { x: 520, y: 56, w: 470, h: 320 },
  worried: { x: 50, y: 388, w: 430, h: 320 },
  happy: { x: 532, y: 380, w: 430, h: 320 },
  nodata: { x: 300, y: 700, w: 430, h: 300 },
};

export function MascotSprite({ variant, width = 130 }: { variant: MascotVariant; width?: number }) {
  const f = FRAMES[variant];
  const scale = width / f.w;
  const height = f.h * scale;

  return (
    <View style={[styles.frame, { width, height }]}>
      <Image
        source={require('../../assets/mascot-sheet.jpg')}
        style={{
          position: 'absolute',
          width: SHEET_W * scale,
          height: SHEET_H * scale,
          left: -f.x * scale,
          top: -f.y * scale,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
});
