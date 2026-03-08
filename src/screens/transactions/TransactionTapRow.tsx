import { memo, useCallback } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { CurrencyCode, Transaction, TransactionCategory, TransactionType } from '../../domain/types';
import { formatCurrency } from '../../ui/format';
import { SwipeRevealRow } from './SwipeRevealRow';

type Props = {
  item: Transaction;
  currency: CurrencyCode;
  darkMode?: boolean;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onUpdateTransaction: (input: { id: string; amount: number; type: TransactionType; category: TransactionCategory; name: string; recurrence: 'none' | 'weekly' | 'biweekly' | 'monthly'; date: string }) => Promise<void>;
  showSeparator: boolean;
  styles: any;
};

function TransactionTapRowImpl({ item, currency, darkMode, activeId, setActiveId, onDeleteTransaction, onUpdateTransaction, showSeparator, styles }: Props) {
  const opened = activeId === item.id;
  const dateLabel = new Date(item.date).toLocaleDateString();

  const onPressUpdate = useCallback((e: any) => {
    e.stopPropagation?.();
    if (!opened) return;

    Alert.prompt(
      'Update name',
      'Transaction name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (nameValue?: string) => {
            const nextName = (nameValue ?? '').trim() || item.name || '-';
            Alert.prompt(
              'Update category',
              'Category',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Next',
                  onPress: (categoryValue?: string) => {
                    const nextCategory = ((categoryValue ?? '').trim() || item.category) as TransactionCategory;
                    Alert.prompt(
                      'Update amount',
                      'Amount',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Next',
                          onPress: (amountValue?: string) => {
                            const amount = Number((amountValue ?? '').replace(',', '.'));
                            if (!Number.isFinite(amount) || amount <= 0) return;
                            Alert.alert(
                              'Update recurrence',
                              'Select recurrence',
                              [
                                { text: 'None', onPress: async () => { await onUpdateTransaction({ id: item.id, amount, type: item.type, category: nextCategory, name: nextName, recurrence: 'none', date: item.date }); setActiveId(null); } },
                                { text: 'Weekly', onPress: async () => { await onUpdateTransaction({ id: item.id, amount, type: item.type, category: nextCategory, name: nextName, recurrence: 'weekly', date: item.date }); setActiveId(null); } },
                                { text: 'Bi weekly', onPress: async () => { await onUpdateTransaction({ id: item.id, amount, type: item.type, category: nextCategory, name: nextName, recurrence: 'biweekly', date: item.date }); setActiveId(null); } },
                                { text: 'Monthly', onPress: async () => { await onUpdateTransaction({ id: item.id, amount, type: item.type, category: nextCategory, name: nextName, recurrence: 'monthly', date: item.date }); setActiveId(null); } },
                                { text: 'Cancel', style: 'cancel' },
                              ]
                            );
                          },
                        },
                      ],
                      'plain-text',
                      String(item.amount),
                      'decimal-pad'
                    );
                  },
                },
              ],
              'plain-text',
              item.category
            );
          },
        },
      ],
      'plain-text',
      item.name || '-'
    );
  }, [item.amount, item.category, item.date, item.id, item.name, item.type, onUpdateTransaction, opened, setActiveId]);

  const onPressDelete = useCallback((e: any) => {
    e.stopPropagation?.();
    if (!opened) return;
    onDeleteTransaction(item.id);
  }, [item.id, onDeleteTransaction, opened]);

  return (
    <SwipeRevealRow
      id={item.id}
      activeId={activeId}
      setActiveId={setActiveId}
      shellStyle={styles.transactionShell}
      actionsBackgroundStyle={[styles.tapActionsBg, styles.transactionActionsBg]}
      actionsRailStyle={[styles.tapActionsRight, styles.transactionActionsRail]}
      contentStyle={[styles.transactionRow, darkMode && styles.transactionRowDark]}
      actions={() => (
        <>
          <Pressable
            style={[styles.updateFlatBtn, styles.transactionActionBtnCompact, darkMode && styles.updateFlatBtnDark]}
            onPress={onPressUpdate}
          >
            <Text style={[styles.flatBtnText, darkMode && styles.flatBtnTextDark]}>Update</Text>
          </Pressable>
          <Pressable
            style={[styles.deleteFlatBtn, styles.transactionActionBtnCompact, darkMode && styles.deleteFlatBtnDark]}
            onPress={onPressDelete}
          >
            <Text style={[styles.flatBtnText, darkMode && styles.flatBtnTextDark]}>Delete</Text>
          </Pressable>
        </>
      )}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.name, darkMode && styles.textDark]}>{item.name?.trim() ? item.name : '-'}</Text>
          <Text style={[styles.meta, darkMode && styles.metaDark]}>
            {item.category}{(item.recurrence ?? 'none') !== 'none' ? ` • ${item.recurrence === 'biweekly' ? 'bi weekly' : item.recurrence}` : ''}
          </Text>
        </View>
        <View style={styles.rightRow}>
          <Text style={[styles.meta, darkMode && styles.metaDark]}>{dateLabel}</Text>
          <Text style={[styles.amount, darkMode && styles.textDark]}>{formatCurrency(item.amount, currency)}</Text>
        </View>
      </View>
      {showSeparator ? <View style={[styles.recordSeparator, darkMode && styles.recordSeparatorDark]} /> : null}
    </SwipeRevealRow>
  );
}

export const TransactionTapRow = memo(TransactionTapRowImpl);
