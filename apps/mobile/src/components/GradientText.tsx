import React from 'react';
import { Text, TextProps, StyleProp, TextStyle, StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientTextProps extends TextProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
    style?: StyleProp<TextStyle>;
    children: React.ReactNode;
}

export const GradientText: React.FC<GradientTextProps> = ({
    colors,
    start = { x: 0, y: 0 },
    end = { x: 1, y: 0 },
    locations,
    style,
    children,
    ...props
}) => {
    return (
        <MaskedView
            maskElement={
                <Text style={[style, { backgroundColor: 'transparent' }]} {...props}>
                    {children}
                </Text>
            }
        >
            <LinearGradient
                colors={colors}
                start={start}
                end={end}
                locations={locations}
            >
                <Text style={[style, { opacity: 0 }]} {...props}>
                    {children}
                </Text>
            </LinearGradient>
        </MaskedView>
    );
};

const styles = StyleSheet.create({});
