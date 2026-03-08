import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Budget, CurrencyCode, Transaction, TransactionCategory, TransactionType } from '../domain/types';
import { colors, spacing } from '../ui/themeTokens';
import { MascotSprite } from '../ui/MascotSprite';
import { BudgetDonutChart } from './transactions/BudgetDonutChart';
import { BudgetSwipeRow } from './transactions/BudgetSwipeRow';
import { TransactionTapRow } from './transactions/TransactionTapRow';

type Props = {
  darkMode?: boolean;
  currency: CurrencyCode;
  transactions: Transaction[];
  budgets: Budget[];
  typeFilter: 'all' | TransactionType;
  onTypeFilterChange: (value: 'all' | TransactionType) => void;
  categoryFilter: 'all' | TransactionCategory;
  onCategoryFilterChange: (value: 'all' | TransactionCategory) => void;
  categoryOptions: TransactionCategory[];
  budgetCategoryOptions: TransactionCategory[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onUpdateTransaction: (input: { id: string; amount: number; type: TransactionType; category: TransactionCategory; name: string; recurrence: 'none' | 'weekly' | 'biweekly' | 'monthly'; date: string }) => Promise<void>;
  onSaveBudget: (category: TransactionCategory, amount: number) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
  onSwipeBeyondLeft: () => void;
  onSwipeBeyondRight: () => void;
};

export function TransactionsScreen(props: Props) {
  const {
    darkMode,
    currency,
    transactions,
    budgets,
    typeFilter,
    onTypeFilterChange,
    categoryFilter,
    onCategoryFilterChange,
    categoryOptions,
    budgetCategoryOptions,
    searchQuery,
    onSearchQueryChange,
    onDeleteTransaction,
    onUpdateTransaction,
    onSaveBudget,
    onDeleteBudget,
    onSwipeBeyondLeft,
    onSwipeBeyondRight,
  } = props;

  const [reviewTab, setReviewTab] = useState<'transactions' | 'budgets'>('transactions');
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amountDesc' | 'amountAsc'>('newest');
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState<TransactionCategory>('Other');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCategoryOpen, setBudgetCategoryOpen] = useState(false);

  const reviewPagerRef = useRef<ScrollView>(null);
  const [activeSwipeBudgetId, setActiveSwipeBudgetId] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const sortOptions = useMemo(() => ['newest', 'oldest', 'amountDesc', 'amountAsc'] as const, []);
  const typeOptions = useMemo(() => ['all', 'income', 'expense'] as const, []);
  const categoryFilterOptions = useMemo(() => ['all', ...categoryOptions] as const, [categoryOptions]);

  const shownTransactions = useMemo(() => {
    const arr = [...transactions];
    if (sortBy === 'newest') arr.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    if (sortBy === 'oldest') arr.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    if (sortBy === 'amountDesc') arr.sort((a, b) => b.amount - a.amount);
    if (sortBy === 'amountAsc') arr.sort((a, b) => a.amount - b.amount);
    return arr;
  }, [transactions, sortBy]);

  useEffect(() => {
    reviewPagerRef.current?.scrollTo({ x: (reviewTab === 'transactions' ? 0 : 1) * width, animated: true });
  }, [reviewTab, width]);

  const onReviewPagerEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setReviewTab(next === 0 ? 'transactions' : 'budgets');
  }, [width]);

  const onReviewEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement, velocity } = event.nativeEvent;
    const atStart = contentOffset.x <= 1;
    const atEnd = contentOffset.x >= contentSize.width - layoutMeasurement.width - 1;
    const fastEnough = Math.abs(velocity?.x ?? 0) > 0.2;

    if (reviewTab === 'transactions' && atStart && fastEnough) onSwipeBeyondLeft();
    if (reviewTab === 'budgets' && atEnd && fastEnough) onSwipeBeyondRight();
  }, [onSwipeBeyondLeft, onSwipeBeyondRight, reviewTab]);

  return (
    <View style={[styles.screenContainer, darkMode && styles.screenDark]}>
      <ScrollView
        ref={reviewPagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onReviewPagerEnd}
        onScrollEndDrag={onReviewEndDrag}
      >
        <View style={[styles.reviewTransactionsPage, { width }]}>
          <View style={[styles.contentContainer, styles.transactionsPageContent]}>
            <TextInput value={searchQuery} onChangeText={onSearchQueryChange} placeholder="Search categories" placeholderTextColor={colors.placeholder} style={[styles.searchInput, darkMode && styles.inputDark]} />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Pressable style={[styles.dropdown, darkMode && styles.inputDark]} onPress={() => setSortOpen((p) => !p)}><Text style={[styles.dropdownText, darkMode && styles.textDark]}>Sort by: {sortBy}</Text><Text>▾</Text></Pressable>
                {sortOpen ? (
                  <View style={[styles.dropdownMenu, darkMode && styles.panelDark]}>
                    {sortOptions.map((o) => (
                      <Pressable key={o} style={styles.dropdownOption} onPress={() => { setSortBy(o); setSortOpen(false); }}>
                        <Text style={[styles.dropdownText, darkMode && styles.textDark]}>{o}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.flex1}>
                <Pressable style={[styles.dropdown, darkMode && styles.inputDark]} onPress={() => setFilterOpen((p) => !p)}><Text style={[styles.dropdownText, darkMode && styles.textDark]}>Filter: {typeFilter}/{categoryFilter}</Text><Text>▾</Text></Pressable>
                {filterOpen ? (
                  <View style={[styles.dropdownMenu, darkMode && styles.panelDark]}>
                    <Text style={styles.section}>Type</Text>
                    <View style={styles.filterRow}>{typeOptions.map((t) => <Pressable key={t} style={[styles.filterChip, typeFilter === t && styles.filterChipActive]} onPress={() => onTypeFilterChange(t)}><Text style={[styles.filterChipText, typeFilter === t && styles.filterChipTextActive]}>{t}</Text></Pressable>)}</View>
                    <Text style={styles.section}>Category</Text>
                    <View style={styles.filterRow}>{categoryFilterOptions.map((cat) => <Pressable key={cat} style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]} onPress={() => onCategoryFilterChange(cat)}><Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>{cat}</Text></Pressable>)}</View>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.tableWrap}>
              <ScrollView
                style={styles.transactionsListScroll}
                contentContainerStyle={styles.transactionsListContent}
                showsVerticalScrollIndicator={false}

              >
                <View style={[styles.tableHeaderRow, darkMode && styles.tableHeaderRowDark]}>
                  <Text style={[styles.tableHeaderText, darkMode && styles.metaDark]}>Name / Category</Text>
                  <Text style={[styles.tableHeaderText, darkMode && styles.metaDark]}>Date / Amount</Text>
                </View>
                {shownTransactions.length === 0 ? (
                  <View style={styles.noDataWrap}>
                    <MascotSprite variant="nodata" width={150} />
                    <Text style={[styles.meta, darkMode && styles.metaDark]}>No transactions yet</Text>
                  </View>
                ) : null}
                {shownTransactions.map((item, index) => (
                  <TransactionTapRow
                    key={item.id}
                    item={item}
                    currency={currency}
                    darkMode={darkMode}
                    activeId={activeTransactionId}
                    setActiveId={setActiveTransactionId}
                    onDeleteTransaction={onDeleteTransaction}
                    onUpdateTransaction={onUpdateTransaction}
                    showSeparator={index < shownTransactions.length - 1}
                    styles={styles}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        <View style={[styles.reviewBudgetsPage, { width }]}> 
          <View style={styles.tableWrap}>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}

            >
              <View style={[styles.panel, darkMode && styles.panelDark]}>
                <BudgetDonutChart budgets={budgets} currency={currency} darkMode={darkMode} styles={styles} />

                <View style={[styles.tableHeaderRow, darkMode && styles.tableHeaderRowDark]}>
                  <Text style={[styles.tableHeaderText, darkMode && styles.metaDark]}>Category</Text>
                  <Text style={[styles.tableHeaderText, darkMode && styles.metaDark]}>Amount</Text>
                </View>

                {budgets.map((b) => (
                  <BudgetSwipeRow
                    key={b.id}
                    budget={b}
                    currency={currency}
                    darkMode={darkMode}
                    onSaveBudget={onSaveBudget}
                    onDeleteBudget={onDeleteBudget}
                    activeSwipeBudgetId={activeSwipeBudgetId}
                    setActiveSwipeBudgetId={setActiveSwipeBudgetId}
                    styles={styles}
                  />
                ))}

              </View>
            </ScrollView>
          </View>
          <View style={styles.reviewAddBudgetWrapInPage}>
            <Pressable style={styles.reviewAddBudgetBtn} onPress={() => setShowAddBudget((v) => !v)}>
              <Text style={styles.reviewAddBudgetText}>Add New Budget</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {showAddBudget ? (
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => { setShowAddBudget(false); setBudgetCategoryOpen(false); }} />
          <View style={[styles.modalCard, darkMode && styles.panelDark]}>
            <Text style={[styles.name, darkMode && styles.textDark]}>Add New Budget</Text>
            <TextInput
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              style={[styles.smallInput, darkMode && styles.inputDark]}
              placeholder="Budget amount"
              keyboardType="decimal-pad"
            />
            <Pressable style={[styles.dropdown, darkMode && styles.inputDark]} onPress={() => setBudgetCategoryOpen((p) => !p)}>
              <Text style={[styles.dropdownText, darkMode && styles.textDark]}>{budgetCategory}</Text>
              <Text>▾</Text>
            </Pressable>
            {budgetCategoryOpen ? (
              <View style={[styles.dropdownMenu, darkMode && styles.panelDark]}>
                {budgetCategoryOptions.map((cat) => (
                  <Pressable key={cat} style={styles.dropdownOption} onPress={() => { setBudgetCategory(cat); setBudgetCategoryOpen(false); }}>
                    <Text style={[styles.dropdownText, darkMode && styles.textDark]}>{cat}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Pressable style={styles.reviewAddBudgetBtn} onPress={async () => {
              const amount = Number(budgetAmount.replace(',', '.'));
              if (!Number.isFinite(amount) || amount <= 0) return;
              await onSaveBudget(budgetCategory, amount);
              setBudgetAmount('');
              setShowAddBudget(false);
              setBudgetCategoryOpen(false);
            }}>
              <Text style={styles.reviewAddBudgetText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={[styles.reviewBottomTabs, darkMode && styles.reviewBottomTabsDark]}>
        {(['transactions', 'budgets'] as const).map((tab) => {
          const active = reviewTab === tab;
          const label = tab === 'transactions' ? 'Transactions' : 'Budgets';
          return (
            <Pressable key={tab} style={styles.reviewBottomTab} onPress={() => setReviewTab(tab)}>
              <View style={[styles.reviewBottomDot, active && styles.reviewBottomDotActive]} />
              <Text style={[styles.reviewBottomLabel, darkMode && styles.textDark, active && styles.reviewBottomLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1 },
  screenDark: { backgroundColor: colors.screenDark },
  panelDark: { backgroundColor: colors.panelDark, borderColor: colors.borderDark },
  contentContainer: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingTop: 8, paddingBottom: 88 },
  transactionsPageContent: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#156530' },
  textDark: { color: colors.textDark },
  exportBtn: { backgroundColor: colors.accentGreen, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  exportBtnText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  reviewBottomTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  reviewBottomTabsDark: { backgroundColor: 'transparent' },
  reviewTransactionsPage: { flex: 1 },
  reviewBudgetsPage: { flex: 1 },
  reviewAddBudgetWrapInPage: { position: 'absolute', left: 16, right: 16, bottom: 56 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', paddingHorizontal: 20, zIndex: 30 },
  modalScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: { backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 14, padding: spacing.lg, gap: spacing.md },
  reviewAddBudgetBtn: { backgroundColor: colors.accentGreen, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  reviewAddBudgetText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  tableWrap: { flex: 1, position: 'relative' },
  transactionsListScroll: { flex: 1 },
  transactionsListContent: { paddingBottom: 18 },
  noDataWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 6 },

  tableHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.tableBorderLight, marginBottom: 6 },
  tableHeaderRowDark: { borderBottomColor: colors.borderDark },
  tableHeaderText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },

  reviewBottomTab: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 2 },
  reviewBottomDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8fdc5f' },
  reviewBottomDotActive: { backgroundColor: '#14b85a', width: 22 },
  reviewBottomLabel: { color: '#2f7a52', fontSize: 12 },
  reviewBottomLabelActive: { color: '#0f5a36', fontWeight: '800' },
  searchInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderInput, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, color: '#156530' },
  inputDark: { backgroundColor: colors.panelDark, borderColor: colors.borderDark, color: colors.textDark },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex1: { flex: 1 },
  nameCol: { flex: 0.8 },
  inputCol: { flex: 1.2 },
  dropdown: { minHeight: 42, borderWidth: 1, borderColor: colors.borderInput, borderRadius: 10, paddingHorizontal: spacing.md, backgroundColor: colors.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: colors.textPrimary, fontWeight: '600', fontSize: 12 },
  dropdownMenu: { marginTop: spacing.xs, borderWidth: 1, borderColor: colors.borderInput, borderRadius: 10, padding: spacing.sm, gap: 6, backgroundColor: colors.panelLight },
  dropdownOption: { paddingVertical: 6 },
  section: { fontSize: 12, color: '#2f7a43', fontWeight: '700' },
  smallInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderInput, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: '#156530' },
  inlineRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.chipBorder, backgroundColor: colors.chipBg },
  filterChipActive: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  filterChipText: { color: colors.textPrimary, fontWeight: '600', textTransform: 'capitalize' },
  filterChipTextActive: { color: colors.white },
  transactionShell: { position: 'relative', overflow: 'hidden' },
  swipeShell: { position: 'relative', marginBottom: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.panelLight, overflow: 'hidden' },
  swipeShellDark: { backgroundColor: colors.panelDark, borderColor: colors.borderDark },
  tapActionsBg: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'flex-end' },
  transactionActionsBg: { top: 8, bottom: 12 },
  tapActionsRight: { flexDirection: 'row', height: '100%', overflow: 'hidden' },
  transactionActionsRail: { alignItems: 'center', gap: 4 },
  transactionActionBtnCompact: { height: 36, borderRadius: 0 },
  updateFlatBtn: { backgroundColor: colors.accentGreen, justifyContent: 'center', alignItems: 'center', width: 60 },
  updateFlatBtnDark: { backgroundColor: colors.accentGreen },
  deleteFlatBtn: { backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', width: 60 },
  deleteFlatBtnDark: { backgroundColor: colors.danger },
  flatBtnText: { color: colors.white, fontWeight: '700', fontSize: 11 },
  flatBtnTextDark: { color: colors.white },
  listRow: { backgroundColor: colors.panelLight, borderRadius: 14, padding: 11, borderWidth: 1, borderColor: colors.borderLight },
  listRowInner: { marginBottom: 0, borderWidth: 0, borderRadius: 0 },
  listRowDark: { backgroundColor: colors.panelDark, borderColor: colors.borderDark },
  transactionRow: { backgroundColor: 'transparent', paddingHorizontal: 6, paddingTop: 10, paddingBottom: 8 },
  transactionRowDark: { backgroundColor: 'transparent' },
  recordSeparator: { marginTop: 10, height: StyleSheet.hairlineWidth, backgroundColor: colors.separatorLight },
  recordSeparatorDark: { backgroundColor: colors.borderDark },
  rightRow: { alignItems: 'flex-end', gap: 6 },
  name: { fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  metaDark: { color: '#9dc9ab' },
  amount: { color: colors.textStrong, fontWeight: '700' },
  actionBtn: { backgroundColor: '#e6f8ec', borderWidth: 1, borderColor: colors.chipBorder, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  actionBtnText: { color: '#2d7a43', fontSize: 12, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#fecaca' },
  deleteBtnText: { color: '#991b1b', fontWeight: '700', fontSize: 12 },
  panel: { backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  budgetExpandedWrap: { gap: spacing.md },
  equalButtonRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  equalButton: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center' },
  chartWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  totalBudgetText: { color: '#14532d', fontWeight: '800', marginTop: 6 },
  legendWrap: { width: '100%', marginTop: spacing.sm, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#14532d', fontWeight: '600', fontSize: 12 },
});
