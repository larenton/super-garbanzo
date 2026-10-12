import { Pressable, Text, View } from 'react-native';

import { dayStatus, plannedTemplate } from '@/lib/analytics';
import { addDays, fromISODate, today, WEEKDAYS_SHORT } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { kindColor, radius, space, type, useTheme } from '@/lib/theme';
import { tap } from './ui';

/** Seven-day strip: each day shows its session colour and whether it was done. */
export function WeekStrip({ weekStart, selected, onSelect }: { weekStart: string; selected?: string; onSelect: (date: string) => void }) {
  const t = useTheme();
  const s = useStore();
  const now = today();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        const tpl = plannedTemplate(s, date);
        const status = dayStatus(s, s.logs, date);
        const isSel = date === selected;
        const isToday = date === now;
        const c = tpl ? kindColor(t, tpl.kind) : status === 'extra' ? t.good : t.text3;
        const done = status === 'done' || status === 'extra';
        return (
          <Pressable
            key={date}
            onPress={() => {
              tap();
              onSelect(date);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isSel }}
            accessibilityLabel={`${WEEKDAYS_SHORT[i]} ${fromISODate(date).getDate()}${tpl ? `, ${tpl.name}` : ', rest'}${done ? ', done' : status === 'missed' ? ', missed' : ''}`}
            style={{
              alignItems: 'center',
              gap: 6,
              paddingVertical: space.sm,
              width: 44,
              borderRadius: radius.md,
              backgroundColor: isSel ? t.ink : 'transparent',
            }}
          >
            <Text style={[type.caption, { color: isSel ? t.onInk : t.text3 }]}>{WEEKDAYS_SHORT[i].slice(0, 1)}</Text>
            <Text style={[type.headline, { color: isSel ? t.onInk : isToday ? t.accent : t.text, fontVariant: ['tabular-nums'] }]}>
              {fromISODate(date).getDate()}
            </Text>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: done || (tpl && status !== 'missed') ? (done ? c : 'transparent') : 'transparent',
                borderWidth: tpl && !done ? 1.5 : 0,
                borderColor: status === 'missed' ? t.bad : c,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
