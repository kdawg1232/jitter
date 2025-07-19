import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { Theme } from '../theme/colors';

const { height: screenHeight } = Dimensions.get('window');

// Constants for TimePicker
const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface TimePickerProps {
  value: string; // Format: "HH:MM AM/PM"
  onChange: (time: string) => void;
  style?: any;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  style
}) => {
  // Parse the initial value
  const parseTime = (timeString: string) => {
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':');
    return {
      hours: parseInt(hours),
      minutes: parseInt(minutes),
      period: period || 'AM'
    };
  };

  const [selectedTime, setSelectedTime] = useState(() => parseTime(value));

  // Generate arrays for pickers
  const hours = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  // Update parent when time changes
  useEffect(() => {
    const timeString = `${selectedTime.hours.toString().padStart(2, '0')}:${selectedTime.minutes.toString().padStart(2, '0')} ${selectedTime.period}`;
    onChange(timeString);
  }, [selectedTime, onChange]);

  const renderPicker = (
    items: (string | number)[],
    selectedValue: string | number,
    onValueChange: (value: any) => void,
    formatItem?: (item: any) => string
  ) => {
    return (
      <View style={styles.pickerContainer}>
        <ScrollView
          style={styles.picker}
          contentContainerStyle={styles.pickerContent}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate={0.9}
          bounces={true}
          alwaysBounceVertical={true}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
            onValueChange(items[clampedIndex]);
          }}
        >
          {/* Add padding items at top and bottom */}
          {Array.from({ length: Math.floor(VISIBLE_ITEMS / 2) }).map((_, i) => (
            <View key={`top-${i}`} style={styles.pickerItem} />
          ))}
          
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.pickerItem}
              onPress={() => onValueChange(item)}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  selectedValue === item && styles.selectedPickerItemText
                ]}
              >
                {formatItem ? formatItem(item) : item.toString()}
              </Text>
            </TouchableOpacity>
          ))}
          
          {Array.from({ length: Math.floor(VISIBLE_ITEMS / 2) }).map((_, i) => (
            <View key={`bottom-${i}`} style={styles.pickerItem} />
          ))}
        </ScrollView>
        
        {/* Selection indicator */}
        <View style={styles.selectionIndicator} />
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.timePickerContainer}>
        {/* Hours */}
        {renderPicker(
          hours,
          selectedTime.hours,
          (hours) => setSelectedTime(prev => ({ ...prev, hours })),
          (hour) => hour.toString().padStart(2, '0')
        )}
        
        {/* Separator */}
        <View style={styles.separator}>
          <Text style={styles.separatorText}>:</Text>
        </View>
        
        {/* Minutes */}
        {renderPicker(
          minutes,
          selectedTime.minutes,
          (minutes) => setSelectedTime(prev => ({ ...prev, minutes })),
          (minute) => minute.toString().padStart(2, '0')
        )}
        
        {/* AM/PM Buttons */}
        <View style={styles.periodButtonContainer}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedTime.period === period && styles.selectedPeriodButton
              ]}
              onPress={() => setSelectedTime(prev => ({ ...prev, period }))}
            >
              <Text style={[
                styles.periodButtonText,
                selectedTime.period === period && styles.selectedPeriodButtonText
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.sm,
  },
  pickerContainer: {
    position: 'relative',
    height: PICKER_HEIGHT,
    width: 90,
  },
  picker: {
    flex: 1,
  },
  pickerContent: {
    paddingVertical: 0,
    paddingHorizontal: 5,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  pickerItemText: {
    ...Theme.fonts.body,
    fontSize: 22,
    color: Theme.colors.textTertiary,
  },
  selectedPickerItemText: {
    color: Theme.colors.textPrimary,
    fontWeight: '600',
  },
  selectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    marginTop: -ITEM_HEIGHT / 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Theme.colors.divider,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  separator: {
    paddingHorizontal: Theme.spacing.xs,
    justifyContent: 'center',
  },
  separatorText: {
    ...Theme.fonts.body,
    fontSize: 20,
    color: Theme.colors.textPrimary,
    fontWeight: '600',
  },
  periodButtonContainer: {
    flexDirection: 'column',
    marginLeft: Theme.spacing.sm,
  },
  periodButton: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.small,
    marginVertical: 2,
    backgroundColor: Theme.colors.cardBg,
    borderWidth: 1,
    borderColor: Theme.colors.divider,
    minWidth: 50,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  periodButtonText: {
    ...Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  selectedPeriodButtonText: {
    color: Theme.colors.white,
    fontWeight: '600',
  },
});

export default TimePicker; 