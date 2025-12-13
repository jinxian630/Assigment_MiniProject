import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { GradientBackground } from '@/components/common/GradientBackground';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useRegistration } from '@/contexts/RegistrationContext';
import { Theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterStep2() {
  const { data, updateStep2, goToNextStep, goToPreviousStep } = useRegistration();

  const [birthDate, setBirthDate] = useState<Date>(
    data.birthDate ? new Date(data.birthDate) : new Date(2000, 0, 1)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>(
    (data.gender as 'male' | 'female') || 'male'
  );
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber || '');
  const [errors, setErrors] = useState<{
    birthDate?: string;
    gender?: string;
    phoneNumber?: string;
  }>({});

  const validateForm = () => {
    const newErrors: any = {};

    // Validate birth date (must be at least 13 years old)
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 13) {
      newErrors.birthDate = 'You must be at least 13 years old';
    }

    if (!phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (phoneNumber.length < 10) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;

    // Save data to context (convert date to ISO string)
    updateStep2({
      birthDate: birthDate.toISOString().split('T')[0], // YYYY-MM-DD format
      gender,
      phoneNumber,
    });

    // Navigate to next step
    goToNextStep();
  };

  const handleDateSelect = (date: string) => {
    setBirthDate(new Date(date));
    setShowDatePicker(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderCustomHeader = (date: any) => {
    const currentDate = birthDate;
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 150 }, (_, i) => 1900 + i).reverse();

    return (
      <View style={styles.customHeader}>
        <View style={styles.monthYearContainer}>
          {/* Month Dropdown */}
          <View style={styles.monthDropdownWrapper}>
            <Text style={styles.monthYearLabel}>Month</Text>
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={currentMonth}
                onValueChange={(itemValue) => {
                  const newDate = new Date(currentYear, itemValue, 1);
                  setBirthDate(newDate);
                }}
                style={styles.monthYearPicker}
                itemStyle={styles.pickerItemStyle}
                dropdownIconColor={Theme.colors.textSecondary}
              >
                {months.map((month, index) => (
                  <Picker.Item key={month} label={month} value={index} color="#FFFFFF" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Year Dropdown */}
          <View style={styles.yearDropdownWrapper}>
            <Text style={styles.monthYearLabel}>Year</Text>
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={currentYear}
                onValueChange={(itemValue) => {
                  const newDate = new Date(itemValue, currentMonth, 1);
                  setBirthDate(newDate);
                }}
                style={styles.monthYearPicker}
                itemStyle={styles.pickerItemStyle}
                dropdownIconColor={Theme.colors.textSecondary}
              >
                {years.map((year) => (
                  <Picker.Item key={year} label={year.toString()} value={year} color="#FFFFFF" />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <GradientBackground colors={['#000000', '#000000']}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Profile Details</Text>
              <Text style={styles.subtitle}>
                Tell us a bit more about yourself
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Birth Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Birth Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateButtonText}>{formatDate(birthDate)}</Text>
                  <Ionicons name="calendar-outline" size={20} color={Theme.colors.textSecondary} />
                </TouchableOpacity>
                {errors.birthDate && (
                  <Text style={styles.errorText}>{errors.birthDate}</Text>
                )}
              </View>

              {/* Calendar Modal */}
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Birth Date</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Ionicons name="close" size={24} color={Theme.colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.customCalendarWrapper}>
                      {renderCustomHeader(birthDate)}
                      <Calendar
                        current={birthDate.toISOString().split('T')[0]}
                        onDayPress={(day: { dateString: string }) => handleDateSelect(day.dateString)}
                        markedDates={{
                          [birthDate.toISOString().split('T')[0]]: {
                            selected: true,
                            selectedColor: Theme.colors.primary,
                          },
                        }}
                        maxDate={new Date().toISOString().split('T')[0]}
                        minDate="1900-01-01"
                        theme={{
                          backgroundColor: '#1A1A1A',
                          calendarBackground: '#1A1A1A',
                          textSectionTitleColor: Theme.colors.textSecondary,
                          selectedDayBackgroundColor: Theme.colors.primary,
                          selectedDayTextColor: '#ffffff',
                          todayTextColor: Theme.colors.primary,
                          dayTextColor: '#FFFFFF',
                          textDisabledColor: '#444444',
                          monthTextColor: '#FFFFFF',
                          arrowColor: Theme.colors.primary,
                        }}
                        hideArrows={false}
                      />
                    </View>
                    <Button
                      variant="primary"
                      onPress={() => setShowDatePicker(false)}
                      style={styles.confirmButton}
                    >
                      Confirm
                    </Button>
                  </View>
                </View>
              </Modal>

              {/* Gender */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gender</Text>
                <TouchableOpacity
                  style={styles.genderButton}
                  activeOpacity={0.7}
                  onPress={() => setShowGenderPicker(true)}
                >
                  <Text style={styles.genderButtonText}>
                    {gender === 'male' ? 'Male' : 'Female'}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={20} color={Theme.colors.textSecondary} style={styles.chevronIcon} />
                </TouchableOpacity>
              </View>

              {/* Gender Picker Modal */}
              <Modal
                visible={showGenderPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGenderPicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.genderModalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Gender</Text>
                      <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.genderOption,
                        gender === 'male' && styles.genderOptionSelected,
                      ]}
                      onPress={() => {
                        setGender('male');
                        setShowGenderPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          gender === 'male' && styles.genderOptionTextSelected,
                        ]}
                      >
                        Male
                      </Text>
                      {gender === 'male' && (
                        <Ionicons name="checkmark" size={20} color={Theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.genderOption,
                        gender === 'female' && styles.genderOptionSelected,
                      ]}
                      onPress={() => {
                        setGender('female');
                        setShowGenderPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          gender === 'female' && styles.genderOptionTextSelected,
                        ]}
                      >
                        Female
                      </Text>
                      {gender === 'female' && (
                        <Ionicons name="checkmark" size={20} color={Theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Phone Number */}
              <View style={styles.inputGroup}>
                <Input
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  leftIcon="call-outline"
                  keyboardType="phone-pad"
                  error={errors.phoneNumber}
                  containerStyle={styles.inputStyle}
                />
              </View>

              <View style={styles.buttonGroup}>
                <Button
                  variant="outline"
                  onPress={goToPreviousStep}
                  style={styles.backButton}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onPress={handleNext}
                  style={styles.nextButton}
                >
                  Next: Photo
                </Button>
              </View>
            </View>

            {/* Info Text */}
            <Text style={styles.infoText}>
              Step 2 of 3: Profile Information
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxl,
  },
  header: {
    marginBottom: Theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: Theme.typography.fontSizes.xxxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: '#FFFFFF',
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.typography.fontWeights.regular,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: Theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: Theme.spacing.lg,
  },
  label: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.medium,
    color: '#FFFFFF',
    marginBottom: Theme.spacing.sm,
    marginLeft: 4,
  },
  dateButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
  },
  dateButtonText: {
    fontSize: Theme.typography.fontSizes.md,
    color: '#FFFFFF',
  },
  genderButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
  },
  genderButtonText: {
    fontSize: Theme.typography.fontSizes.md,
    color: '#FFFFFF',
    flex: 1,
  },
  chevronIcon: {
    marginRight: 4,
  },
  genderModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333333',
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.sm,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
  },
  genderOptionSelected: {
    backgroundColor: '#1A1A1A',
    borderColor: Theme.colors.primary,
  },
  genderOptionText: {
    fontSize: Theme.typography.fontSizes.md,
    color: '#FFFFFF',
    fontWeight: Theme.typography.fontWeights.medium,
  },
  genderOptionTextSelected: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.fontWeights.bold,
  },
  inputStyle: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333333',
  },
  errorText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
    marginLeft: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.xl,
  },
  backButton: {
    flex: 1,
    borderColor: '#333333',
  },
  nextButton: {
    flex: 2,
  },
  infoText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: Theme.typography.fontWeights.medium,
    marginTop: Theme.spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  confirmButton: {
    marginTop: Theme.spacing.md,
  },
  customHeader: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    backgroundColor: '#000000',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#333333',
  },
  monthYearContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    justifyContent: 'space-between',
  },
  monthDropdownWrapper: {
    flex: 1,
  },
  yearDropdownWrapper: {
    flex: 1,
  },
  monthYearLabel: {
    fontSize: Theme.typography.fontSizes.xs,
    fontWeight: Theme.typography.fontWeights.medium,
    color: '#FFFFFF',
    marginBottom: Theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dropdownContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    height: 48,
    justifyContent: 'center',
  },
  monthYearPicker: {
    color: '#FFFFFF',
    ...Platform.select({
      ios: {
        height: 150,
        marginTop: -50,
      },
      android: {
        height: 48,
        textAlignVertical: 'center',
      },
    }),
  },
  pickerItemStyle: {
    color: '#FFFFFF',
    backgroundColor: '#1A1A1A',
    fontSize: 14,
  },
  customCalendarWrapper: {
    marginVertical: Theme.spacing.md,
  },
});
