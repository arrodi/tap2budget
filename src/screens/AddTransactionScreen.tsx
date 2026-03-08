import { useRef, useState } from 'react';
import {
  Alert,
  InputAccessoryView,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TransactionCategory, TransactionType } from '../domain/types';

type Props = {
  darkMode?: boolean;
  nameInput: string;
  amountInput: string;
  selectedType: TransactionType;
  selectedCategory: TransactionCategory;
  categoryOptions: TransactionCategory[];
  onChangeName: (value: string) => void;
  onChangeAmount: (value: string) => void;
  onChangeType: (value: TransactionType) => void;
  onChangeCategory: (value: TransactionCategory) => void;
  onSave: (input?: { dateIso?: string; recurrence?: 'none' | 'weekly' | 'monthly' }) => Promise<boolean>;
  onCreateRecurring: (input: { frequency: 'weekly' | 'monthly'; label: string }) => Promise<void>;
};

export function AddTransactionScreen({
  darkMode,
  nameInput,
  amountInput,
  selectedType,
  selectedCategory,
  categoryOptions,
  onChangeName,
  onChangeAmount,
  onChangeType,
  onChangeCategory,
  onSave,
  onCreateRecurring,
}: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [freq, setFreq] = useState<'none' | 'weekly' | 'monthly'>('none');
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [recurrenceModalOpen, setRecurrenceModalOpen] = useState(false);
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDateInput, setCustomDateInput] = useState('');
  const amountInputRef = useRef<TextInput>(null);
  const amountAccessoryId = 'amountKeyboardAccessory';



  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }


  const onPressSave = async () => {
    if (isSaving) return;

    const amount = Number(amountInput.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    let dateIso: string | undefined;
    if (useCustomDate && customDateInput.trim()) {
      const parsed = new Date(customDateInput.trim());
      if (Number.isNaN(parsed.getTime())) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Invalid date', 'Use a valid date/time (e.g. 2026-02-26 14:30).');
        return;
      }
      dateIso = parsed.toISOString();
    }

    setIsSaving(true);
    try {
      const ok = await onSave({ dateIso, recurrence: advanced ? freq : 'none' });
      if (ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSaveDone(true);
        setTimeout(() => setSaveDone(false), 900);
        setAdvanced(false);
        Keyboard.dismiss();
      }
      if (ok && advanced && freq !== 'none') {
        await onCreateRecurring({ frequency: freq, label: nameInput.trim() || `${selectedCategory} recurring` });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={[styles.screenTitle, darkMode && styles.textDark]}>Transact!</Text>
      <View style={styles.contentWrap}>
      <View style={[styles.formArea, darkMode && styles.formAreaDark]}>
        <TextInput
          ref={amountInputRef}
          value={amountInput}
          onChangeText={onChangeAmount}
          keyboardType="decimal-pad"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={() => Keyboard.dismiss()}
          inputAccessoryViewID={Platform.OS === 'ios' ? amountAccessoryId : undefined}
          placeholder="$0.00"
          placeholderTextColor={darkMode ? '#86a893' : '#3e5f47'}
          style={[
            styles.amountInput,
            selectedType === 'income' ? styles.amountIncome : styles.amountExpense,
            darkMode && styles.amountInputDark,
          ]}
        />

        <Pressable
          style={[
            styles.categoryButton,
            selectedType === 'income' ? styles.typeButtonIncome : styles.typeButtonExpense,
            darkMode && styles.rowDark,
          ]}
          onPress={() => setTypeModalOpen(true)}
        >
          <Text style={styles.typeButtonValue}>{selectedType === 'income' ? 'Income' : 'Expense'}</Text>
        </Pressable>

        <Pressable style={[styles.categoryButton, darkMode && styles.rowDark]} onPress={() => setCategoryModalOpen(true)}>
          <Text style={[styles.categoryButtonValue, darkMode && styles.textDark]}>{categoryChosen ? selectedCategory : 'Category'}</Text>
        </Pressable>

        {advanced ? (
          <>
            <TextInput
              value={nameInput}
              onChangeText={onChangeName}
              placeholder="Name"
              placeholderTextColor={darkMode ? '#86a893' : '#3e5f47'}
              style={[styles.input, darkMode && styles.inputDark]}
            />

            <Pressable style={[styles.categoryButton, darkMode && styles.rowDark]} onPress={() => setRecurrenceModalOpen(true)}>
              <Text style={[styles.categoryButtonValue, darkMode && styles.textDark]}>
                {freq === 'none' ? 'Recurrence' : freq === 'monthly' ? 'Monthly' : 'Weekly'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.advancedBtn, darkMode && styles.rowDark]}
              onPress={() => setUseCustomDate((v) => !v)}
            >
              <Text style={[styles.advancedText, darkMode && styles.textDark]}>
                {useCustomDate ? 'Use custom date/time: ON' : 'Use custom date/time'}
              </Text>
            </Pressable>

            {useCustomDate ? (
              <TextInput
                value={customDateInput}
                onChangeText={setCustomDateInput}
                placeholder="YYYY-MM-DD HH:mm"
                placeholderTextColor={darkMode ? '#86a893' : '#3e5f47'}
                style={[styles.input, darkMode && styles.inputDark]}
              />
            ) : null}
          </>
        ) : null}

        <Pressable
          disabled={isSaving}
          style={[
            styles.saveBtn,
            selectedType === 'income' ? styles.saveBtnIncome : styles.saveBtnExpense,
            saveDone && styles.saveBtnDone,
            isSaving && styles.saveBtnDisabled,
          ]}
          onPress={onPressSave}
        >
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : saveDone ? 'Saved ✓' : 'Save transaction'}</Text>
        </Pressable>

        <Pressable
          style={styles.advancedHintWrap}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setAdvanced((v) => !v);
          }}
        >
          <Text style={styles.advancedHint}>{advanced ? 'hide advanced options' : 'advanced options'}</Text>
        </Pressable>
      </View>
      </View>

      <Modal visible={typeModalOpen} animationType="fade" transparent onRequestClose={() => setTypeModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTypeModalOpen(false)}>
          <Pressable style={[styles.modalCard, darkMode && styles.formAreaDark]} onPress={() => {}}>
            <Text style={[styles.modalTitle, darkMode && styles.textDark]}>Select type</Text>
            <View style={styles.typeTileWrap}>
              {(['expense', 'income'] as const).map((type) => {
                const selected = type === selectedType;
                return (
                  <Pressable key={type} style={[styles.typeTile, selected && styles.categoryTileSelected]} onPress={() => { onChangeType(type); setTypeModalOpen(false); }}>
                    <Text style={[styles.categoryTileText, selected && styles.categoryTileTextSelected]}>{type === 'income' ? 'Income' : 'Expense'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={recurrenceModalOpen} animationType="fade" transparent onRequestClose={() => setRecurrenceModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRecurrenceModalOpen(false)}>
          <Pressable style={[styles.modalCard, darkMode && styles.formAreaDark]} onPress={() => {}}>
            <Text style={[styles.modalTitle, darkMode && styles.textDark]}>Select recurrence</Text>
            <View style={styles.typeTileWrap}>
              {(['none', 'weekly', 'monthly'] as const).map((r) => {
                const selected = r === freq;
                return (
                  <Pressable key={r} style={[styles.typeTile, darkMode && styles.typeTileDark, selected && styles.categoryTileSelected]} onPress={() => { setFreq(r); setRecurrenceModalOpen(false); }}>
                    <Text style={[styles.categoryTileText, darkMode && styles.categoryTileTextDark, selected && styles.categoryTileTextSelected]}>{r === 'none' ? 'None' : r === 'weekly' ? 'Weekly' : 'Monthly'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={categoryModalOpen} animationType="fade" transparent onRequestClose={() => setCategoryModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryModalOpen(false)}>
          <Pressable style={[styles.modalCard, darkMode && styles.formAreaDark]} onPress={() => {}}>
            <Text style={[styles.modalTitle, darkMode && styles.textDark]}>Select category</Text>
            <View style={styles.tileWrap}>
              {categoryOptions.map((category) => {
                const selected = category === selectedCategory;
                return (
                  <Pressable key={category} style={[styles.categoryTile, darkMode && styles.categoryTileDark, selected && styles.categoryTileSelected]} onPress={() => { onChangeCategory(category); setCategoryChosen(true); setCategoryModalOpen(false); }}>
                    <Text style={[styles.categoryTileText, darkMode && styles.categoryTileTextDark, selected && styles.categoryTileTextSelected]}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={amountAccessoryId}>
          <View style={styles.accessoryBar}>
            <Pressable onPress={() => Keyboard.dismiss()} style={styles.doneTypingButton}>
              <Text style={styles.doneTypingText}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, paddingHorizontal: 0, paddingTop: 18, justifyContent: 'flex-start', alignItems: 'stretch' },
  contentWrap: { flex: 1, width: '100%', justifyContent: 'center' },
  formArea: { width: '100%', backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, paddingVertical: 8, gap: 10 },
  formAreaDark: { backgroundColor: 'transparent', borderColor: 'transparent' },
  screenTitle: { width: '100%', textAlign: 'center', fontSize: 38, fontWeight: '900', color: '#166534', letterSpacing: 0.4, marginBottom: 18 },
  sectionTitle: { fontSize: 44, fontWeight: '900', color: '#166534', letterSpacing: 0.4 },
  textDark: { color: '#d6f5df' },
  amountInput: { backgroundColor: 'transparent', borderWidth: 0, color: '#0f5a36', borderRadius: 0, paddingHorizontal: 0, paddingVertical: 4, fontSize: 36, fontWeight: '700', textAlign: 'center' },
  amountIncome: { color: '#0f8d45' },
  amountExpense: { color: '#c92a2a' },
  amountInputDark: { color: '#d6f5df' },
  input: { backgroundColor: '#e6f4ea', borderWidth: 1, borderColor: '#8fdf8e', color: '#0f5a36', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '600' },
  inputDark: { backgroundColor: '#08170f', borderColor: '#26523a', color: '#d6f5df' },
  rowDark: { backgroundColor: 'rgba(0,0,0,0.24)' },
  label: { color: '#166534', fontWeight: '700', fontSize: 16 },
  categoryButton: { minHeight: 54, width: '100%', borderRadius: 0, borderWidth: 0, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  typeButtonIncome: { backgroundColor: '#15a34a' },
  typeButtonExpense: { backgroundColor: '#dc2626' },
  typeButtonValue: { color: '#ffffff', fontWeight: '800', fontSize: 18, textAlign: 'center' },
  categoryButtonValue: { color: '#14532d', fontWeight: '700', fontSize: 18, textAlign: 'center' },
  rowGap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#a9e6b7', backgroundColor: '#e6f4ea' },
  pillActive: { backgroundColor: '#14b85a', borderColor: '#14b85a' },
  pillText: { color: '#1e6e37', fontWeight: '600' },
  pillTextActive: { color: 'white' },
  advancedBtn: { width: '100%', borderWidth: 0, borderRadius: 0, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  advancedText: { color: '#166534', fontWeight: '700' },
  advancedHintWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 2, paddingBottom: 2 },
  advancedHint: { color: '#6f8f78', fontSize: 12, fontWeight: '500' },
  saveBtn: { marginTop: 'auto', width: '100%', borderWidth: 0, borderRadius: 0, paddingVertical: 16, alignItems: 'center' },
  saveBtnIncome: { backgroundColor: '#0f8d45' },
  saveBtnExpense: { backgroundColor: '#c92a2a' },
  saveBtnDone: { backgroundColor: '#0c6e36' },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#e6f4ea', borderRadius: 16, borderWidth: 1, borderColor: '#b8efc4', padding: 14, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#166534' },
  typeTileWrap: { width: '100%', gap: 8 },
  typeTile: { width: '100%', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#9dddad', backgroundColor: '#e6f4ea', alignItems: 'center' },
  typeTileDark: { backgroundColor: '#08170f', borderColor: '#26523a' },
  tileWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  categoryTile: { width: '31%', minHeight: 52, borderRadius: 10, borderWidth: 1, borderColor: '#9dddad', backgroundColor: '#e6f4ea', alignItems: 'center', justifyContent: 'center' },
  categoryTileDark: { backgroundColor: '#08170f', borderColor: '#26523a' },
  categoryTileSelected: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  categoryTileText: { color: '#14532d', fontWeight: '700' },
  categoryTileTextDark: { color: '#d6f5df' },
  categoryTileTextSelected: { color: 'white' },
  accessoryBar: { backgroundColor: '#e5faeb', borderTopWidth: 1, borderTopColor: '#b9ebc7', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end' },
  doneTypingButton: { backgroundColor: '#d2f5dc', borderWidth: 1, borderColor: '#98dda9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  doneTypingText: { color: '#14632f', fontWeight: '700' },
});
