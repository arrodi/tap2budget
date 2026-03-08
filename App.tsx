import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { AddTransactionScreen } from './src/screens/AddTransactionScreen';
import { BudgetingScreen } from './src/screens/BudgetingScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

import { calculateMonthlyTotals, filterTransactionsByMonth } from './src/domain/summary';
import { Budget, CurrencyCode, RecurringRule, Transaction, TransactionCategory, TransactionType } from './src/domain/types';
import {
  applyRecurringRulesForMonth,
  deleteTransaction,
  initTransactionsRepo,
  insertRecurringRule,
  insertTransaction,
  listBudgets,
  listRecurringRules,
  listTransactions,
  setSetting,
  getSetting,
  toggleRecurringRule,
  updateTransaction,
  upsertBudget,
  deleteBudget,
  clearAllData,
} from './src/storage/transactionsRepo';

const INCOME_CATEGORIES: TransactionCategory[] = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Gift',
  'Refund',
  'Bonus',
  'Interest',
  'Other',
];

const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'Food',
  'Transport',
  'Housing',
  'Subscription',
  'Health',
  'Entertainment',
  'Shopping',
  'Education',
  'Other',
];

function categoriesFor(type: TransactionType): TransactionCategory[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

function monthWindow(now: Date, offsetMonths: number) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function toCsv(transactions: Transaction[]): string {
  const header = ['id', 'name', 'amount', 'type', 'category', 'recurrence', 'date', 'createdAt'];
  const rows = transactions.map((t) => [t.id, t.name, String(t.amount), t.type, t.category, t.recurrence, t.date, t.createdAt]);
  return [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

export default function App() {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState(0);
  const saveLockRef = useRef(false);
  const lastSaveSigRef = useRef<{ sig: string; at: number } | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amountInput, setAmountInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory>('Food');
  const [monthOffset, setMonthOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TransactionCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
    const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initTransactionsRepo();
        const now = new Date();
        await applyRecurringRulesForMonth(now.getUTCFullYear(), now.getUTCMonth());
        const [existing, rules, savedCurrency, savedTheme] = await Promise.all([
          listTransactions(),
          listRecurringRules(),
          getSetting('currency'),
          getSetting('theme'),
        ]);
        setTransactions(existing);
        setRecurringRules(rules);
        if (savedCurrency && ['USD', 'EUR', 'GBP', 'JPY', 'RUB', 'UAH'].includes(savedCurrency)) {
          setCurrency(savedCurrency as CurrencyCode);
        }
        if (savedTheme === 'dark') setDarkMode(true);
      } catch {
        Alert.alert('Oops', 'Could not initialize local database.');
      }
    })();
  }, []);

  const now = new Date();
  const selectedWindow = monthWindow(now, monthOffset);

  useEffect(() => {
    (async () => {
      const rows = await listBudgets(monthKey(selectedWindow.year, selectedWindow.month));
      setBudgets(rows);
    })();
  }, [selectedWindow.year, selectedWindow.month]);

  const baseMonthlyTransactions = useMemo(
    () => filterTransactionsByMonth(transactions, selectedWindow.year, selectedWindow.month),
    [transactions, selectedWindow.year, selectedWindow.month]
  );


  const filteredTransactions = useMemo(() => {
    return baseMonthlyTransactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const name = (t.name ?? '').toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [baseMonthlyTransactions, typeFilter, categoryFilter, searchQuery]);

  const totals = useMemo(() => calculateMonthlyTotals(baseMonthlyTransactions), [baseMonthlyTransactions]);


  const budgetProgressRows = useMemo(() => {
    const spentMap = new Map<TransactionCategory, number>();
    for (const t of baseMonthlyTransactions) {
      if (t.type !== 'expense') continue;
      spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount);
    }
    return budgets.map((b) => ({
      category: b.category,
      budget: b.amount,
      spent: spentMap.get(b.category) ?? 0,
      usagePct: b.amount > 0 ? ((spentMap.get(b.category) ?? 0) / b.amount) * 100 : 0,
    }));
  }, [budgets, baseMonthlyTransactions]);

  const onChangeType = (nextType: TransactionType) => {
    setSelectedType(nextType);
    setSelectedCategory(categoriesFor(nextType)[0]);
  };

  const handleSave = async (input?: { dateIso?: string; recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly' }): Promise<boolean> => {
    if (saveLockRef.current) return false;

    const amount = Number(amountInput.replace(',', '.'));
    const nowIso = input?.dateIso ?? new Date().toISOString();
    const sig = `${selectedType}|${selectedCategory}|${amount}|${nameInput.trim()}|${nowIso}`;
    const last = lastSaveSigRef.current;
    if (last && last.sig === sig && Date.now() - last.at < 1200) {
      return false;
    }

    saveLockRef.current = true;
    try {
      const categoryCount = transactions.filter((t) => t.category === selectedCategory).length + 1;
      const tx = await insertTransaction({
        amount,
        type: selectedType,
        category: selectedCategory,
        name: nameInput.trim() || `${selectedCategory} ${categoryCount}`,
        recurrence: input?.recurrence ?? 'none',
        date: nowIso,
        createdAt: nowIso,
      });
      lastSaveSigRef.current = { sig, at: Date.now() };
      setTransactions((prev) => [tx, ...prev]);
      setAmountInput('');
      setNameInput('');
      return true;
    } catch {
      Alert.alert('Oops', 'Could not save transaction.');
      return false;
    } finally {
      saveLockRef.current = false;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch {
      Alert.alert('Oops', 'Could not delete transaction.');
    }
  };

  const handleUpdateTransaction = async (input: {
    id: string;
    amount: number;
    type: TransactionType;
    category: TransactionCategory;
    name: string;
    recurrence: 'none' | 'weekly' | 'biweekly' | 'monthly';
    date: string;
  }) => {
    try {
      await updateTransaction(input);
      setTransactions((prev) =>
        prev.map((t) => (t.id === input.id ? { ...t, amount: input.amount, type: input.type, category: input.category, name: input.name, recurrence: input.recurrence, date: input.date } : t))
      );
    } catch {
      Alert.alert('Oops', 'Could not update transaction.');
    }
  };

  const handleSaveBudget = async (category: TransactionCategory, amount: number) => {
    try {
      const mk = monthKey(selectedWindow.year, selectedWindow.month);
      await upsertBudget({ category, amount, monthKey: mk });
      const rows = await listBudgets(mk);
      setBudgets(rows);
    } catch {
      Alert.alert('Oops', 'Could not save budget.');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await deleteBudget(id);
      const mk = monthKey(selectedWindow.year, selectedWindow.month);
      const rows = await listBudgets(mk);
      setBudgets(rows);
    } catch {
      Alert.alert('Oops', 'Could not delete budget.');
    }
  };

  const handleAddRecurringRule = async (input: {
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    dayOfMonth: number;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    label: string;
  }) => {
    try {
      await insertRecurringRule(input);
      const rules = await listRecurringRules();
      setRecurringRules(rules);
      await applyRecurringRulesForMonth(selectedWindow.year, selectedWindow.month);
      const txs = await listTransactions();
      setTransactions(txs);
    } catch {
      Alert.alert('Oops', 'Could not add recurring rule.');
    }
  };

  const handleToggleRecurringRule = async (id: string, active: boolean) => {
    try {
      await toggleRecurringRule(id, active);
      const rules = await listRecurringRules();
      setRecurringRules(rules);
    } catch {
      Alert.alert('Oops', 'Could not update recurring rule.');
    }
  };

  const handleCurrencyChange = async (next: CurrencyCode) => {
    setCurrency(next);
    try {
      await setSetting('currency', next);
    } catch {
      Alert.alert('Oops', 'Could not save currency preference.');
    }
  };

  const handleDarkModeChange = async (enabled: boolean) => {
    setDarkMode(enabled);
    try {
      await setSetting('theme', enabled ? 'dark' : 'light');
    } catch {
      Alert.alert('Oops', 'Could not save theme preference.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = toCsv(filteredTransactions);
      const fileUri = `${FileSystem.cacheDirectory}frugeasy-${selectedWindow.year}-${selectedWindow.month + 1}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
      } else {
        Alert.alert('Exported', `CSV saved to ${fileUri}`);
      }
    } catch {
      Alert.alert('Oops', 'Could not export CSV.');
    }
  };

  const handleResetAllData = async () => {
    Alert.alert(
      'Reset all data?',
      'This will permanently delete all transactions, budgets, recurring rules, and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final confirmation',
              'This cannot be undone. Do you want to erase everything now?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Erase all data',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await clearAllData();
                      setTransactions([]);
                      setBudgets([]);
                      setRecurringRules([]);
                      setNameInput('');
                      setAmountInput('');
                      setTypeFilter('all');
                      setCategoryFilter('all');
                      setSearchQuery('');
                      setSelectedType('expense');
                      setSelectedCategory('Other');
                      setCurrency('USD');
                      setDarkMode(false);
                      Alert.alert('Done', 'All app data has been reset.');
                    } catch {
                      Alert.alert('Oops', 'Could not reset app data.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const categoryOptions = Array.from(new Set(baseMonthlyTransactions.map((t) => t.category))).sort();
  const expenseCategoryOptions = ['Food','Transport','Housing','Subscription','Health','Entertainment','Shopping','Education','Other'] as TransactionCategory[];

  const goToTab = (idx: number) => {
    pagerRef.current?.scrollTo({ x: idx * width, animated: true });
    setActiveTab(idx);
  };

  const onPagerEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextTab = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveTab(nextTab);
  };

  return (
    <SafeAreaView style={[styles.safeArea, darkMode && styles.safeAreaDark]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPagerEnd}
      >
        <View style={[styles.page, { width }]}> 
          <AddTransactionScreen
            darkMode={darkMode}
            nameInput={nameInput}
            amountInput={amountInput}
            selectedType={selectedType}
            selectedCategory={selectedCategory}
            categoryOptions={categoriesFor(selectedType)}
            onChangeName={setNameInput}
            onChangeAmount={setAmountInput}
            onChangeType={onChangeType}
            onChangeCategory={setSelectedCategory}
            onSave={handleSave}
            onCreateRecurring={async ({ frequency, label }) => {
              const now = new Date();
              await handleAddRecurringRule({
                type: selectedType,
                category: selectedCategory,
                amount: Number(amountInput.replace(',', '.')),
                dayOfMonth: frequency === 'monthly' ? now.getUTCDate() : now.getUTCDay(),
                frequency,
                label,
              });
            }}
          />
        </View>

        <View style={[styles.page, { width }]}> 
          <BudgetingScreen
            darkMode={darkMode}
            currency={currency}
            budgets={budgets}
            totals={totals}
            budgetProgressRows={budgetProgressRows}
            categoryOptions={expenseCategoryOptions}
            onSaveBudget={handleSaveBudget}
            transactions={transactions}
          />
        </View>

        <View style={[styles.page, { width }]}> 
          <TransactionsScreen
            darkMode={darkMode}
            currency={currency}
            transactions={filteredTransactions}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            categoryOptions={categoryOptions}
            budgetCategoryOptions={expenseCategoryOptions}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            budgets={budgets}
            onSaveBudget={handleSaveBudget}
            onDeleteBudget={handleDeleteBudget}
            onSwipeBeyondLeft={() => goToTab(1)}
            onSwipeBeyondRight={() => goToTab(3)}
          />
        </View>

        <View style={[styles.page, { width }]}> 
          <SettingsScreen
            currency={currency}
            onCurrencyChange={handleCurrencyChange}
            darkMode={darkMode}
            onDarkModeChange={handleDarkModeChange}
            onExportCsv={handleExportCsv}
            onResetAllData={handleResetAllData}
          />
        </View>
      </ScrollView>

      <View style={styles.tabDots}>
        {['Transact', 'Budget', 'Review', 'Settings'].map((label, idx) => (
          <Pressable
            key={label}
            style={styles.tabDotWrap}
            onPress={() => goToTab(idx)}
          >
            <View style={[styles.dot, activeTab === idx && styles.dotActive]} />
            <Text style={[styles.dotLabel, activeTab === idx && styles.dotLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0fbf3' },
  safeAreaDark: { backgroundColor: '#08170f' },
  page: { flex: 1 },
  tabDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tabDotWrap: { flex: 1, alignItems: 'center', gap: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4E97A',
  },
  dotActive: { backgroundColor: '#166B2A', width: 22 },
  dotLabel: { color: '#2f7a43', fontSize: 12 },
  dotLabelActive: { color: '#166B2A', fontWeight: '800' },
});
