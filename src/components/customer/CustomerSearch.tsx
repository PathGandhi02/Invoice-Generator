import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search, UserPlus, ArrowUpRight } from 'lucide-react-native';
import type { Customer } from '../../models/Customer';
import { useWorkspace } from '../../state/WorkspaceProvider';
import { colors, fonts } from '../../theme';
import { FadeIn } from '../common/FadeIn';
import { Button } from '../common/Button';

export function CustomerSearch({ onSelect, onManual }: { onSelect: (customer: Customer) => void; onManual: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const { customers: customerService, cloud } = useWorkspace();
  const [open, setOpen] = useState(true);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const request = useRef(0);

  useEffect(() => {
    let active = true;
    void customerService.count().then(value => { if (active) { setCount(value); setDirectoryError(null); } })
      .catch(error => { if (active) { setCount(null); setDirectoryError(error instanceof Error ? error.message : 'Unable to load customers. Check your internet connection.'); } })
      .finally(() => { if (active) setDirectoryLoading(false); });
    return () => { active = false; };
  }, [customerService]);

  useEffect(() => {
    const version = ++request.current;
    if (Array.from(query.trim()).length < 2) return;
    const timer = setTimeout(() => {
      setLoading(true);
      void customerService.search(query).then(matches => {
        if (version !== request.current) return;
        setResults(matches); setError(null);
      }).catch(error => { if (version === request.current) { setResults([]); setError(error instanceof Error ? error.message : 'Unable to load customers. Check your internet connection.'); } })
        .finally(() => { if (version === request.current) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); request.current = version + 1; };
  }, [query, customerService]);

  const select = (customer: Customer) => { setOpen(false); inputRef.current?.blur(); onSelect(customer); };
  const showResults = open && Array.from(query.trim()).length >= 2;
  const webKeyboard = Platform.OS === 'web' ? {
    onKeyDown: (event: { key: string; preventDefault: () => void }) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setHighlight(index => Math.min(results.length - 1, index + 1)); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setHighlight(index => Math.max(0, index - 1)); }
      if (event.key === 'Enter' && open && results[highlight]) { event.preventDefault(); select(results[highlight]); }
      if (event.key === 'Escape') setOpen(false);
    },
    'aria-expanded': showResults,
    'aria-controls': 'customer-results',
    'aria-activedescendant': showResults && results[highlight] ? `customer-result-${highlight}` : undefined,
    'aria-autocomplete': 'list' as const,
  } : {};

  return <View style={{ gap: 12 }}>
    <Text accessibilityLiveRegion="polite" style={styles.detail}>{cloud ? 'Cloud customers · Your workspace' : 'Local customers · This device'}</Text>
    <View style={styles.search}>
      <Search size={19} color={colors.blue} />
      <TextInput {...webKeyboard} ref={inputRef} accessibilityLabel="Search customers" placeholder="Search name or username…"
        placeholderTextColor="#869ab6" value={query} onChangeText={value => { setQuery(value); setResults([]); setHighlight(0); setOpen(true); setLoading(Array.from(value.trim()).length >= 2); }}
        onFocus={() => setOpen(true)} maxLength={150} autoCapitalize="none" autoCorrect={false} style={styles.input} returnKeyType="search" />
      {(loading || directoryLoading) && <ActivityIndicator size="small" color={colors.blue} />}
    </View>
    {showResults && <FadeIn style={styles.dropdown}>
      <ScrollView nativeID="customer-results" keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 310 }}>
        {results.map((customer, index) => <Pressable key={customer.username} nativeID={`customer-result-${index}`} accessibilityRole="button"
          accessibilityLabel={`Select ${customer.full_name}, ${customer.username}`} accessibilityState={{ selected: index === highlight }}
          onPress={() => select(customer)} style={[styles.suggestion, index === highlight && { backgroundColor: '#203452' }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={2} style={styles.name}>{customer.full_name}</Text>
            <Text style={styles.username}>@{customer.username}</Text>
            {!!customer.address && <Text numberOfLines={1} style={styles.detail}>{customer.address}</Text>}
            {!!customer.package && <Text style={styles.detail}>{customer.package}</Text>}
          </View><ArrowUpRight size={16} color={colors.muted} />
        </Pressable>)}
        {!results.length && <Text accessibilityLiveRegion="polite" style={styles.empty}>
          {loading ? 'Searching customers…' : error || 'No customer found'}
        </Text>}
      </ScrollView>
      {!!results.length && <Text style={styles.resultHint}>Up to 15 matches · Keep typing to narrow your search</Text>}
    </FadeIn>}
    {!showResults && <Text style={styles.detail}>{directoryLoading ? 'Loading customers…' : directoryError || `${(count ?? 0).toLocaleString('en-IN')} customers available · Type at least 2 characters`}</Text>}
    <Button title="Enter customer manually" variant="ghost" icon={<UserPlus size={16} color={colors.muted} />} onPress={onManual} />
  </View>;
}
const styles = StyleSheet.create({
  search: { borderWidth: 1, borderColor: '#45648d', borderRadius: 10, backgroundColor: '#101a2c', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  input: { flex: 1, minHeight: 50, color: colors.heading, fontFamily: fonts.body, fontSize: 14, paddingVertical: 12, minWidth: 0 },
  dropdown: { borderWidth: 1, borderColor: '#365170', borderRadius: 12, backgroundColor: '#111e31', overflow: 'hidden' },
  suggestion: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { color: colors.heading, fontSize: 13, fontFamily: fonts.bold, lineHeight: 19 },
  username: { color: '#93c5fd', fontSize: 12, fontFamily: fonts.body },
  detail: { color: colors.muted, fontSize: 11, fontFamily: fonts.body, lineHeight: 17 },
  empty: { color: colors.text, fontSize: 13, fontFamily: fonts.body, padding: 18 },
  resultHint: { color: colors.muted, fontSize: 10, fontFamily: fonts.body, padding: 12 },
});
