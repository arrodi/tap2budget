import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

type MascotVariant = 'saving' | 'broken' | 'worried' | 'happy' | 'nodata';

const SOURCES: Record<MascotVariant, ImageSourcePropType> = {
  saving: require('../../assets/mascot/income.png'),
  broken: require('../../assets/mascot/expense.png'),
  worried: require('../../assets/mascot/worried.png'),
  happy: require('../../assets/mascot/happy.png'),
  nodata: require('../../assets/mascot/no_data.png'),
};

export function MascotSprite({ variant, width = 130 }: { variant: MascotVariant; width?: number }) {
  return (
    <View style={[styles.frame, { width, height: width }]}> 
      <Image source={SOURCES[variant]} resizeMode="contain" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '88%', height: '88%' },
});
