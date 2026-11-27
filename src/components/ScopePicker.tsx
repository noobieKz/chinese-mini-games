import { Fragment } from 'react';
import { Select } from './Select';
import {
  MIN_WORDS,
  scopeKey,
  selectWords,
  type ContentBundle,
  type GameId,
  type Scope,
} from '../../shared/content';
import { lessonOptions } from '../content/useContent';

/**
 * Level → lesson → range, the same three questions in every game. Renders label/select pairs so it
 * slots into each game's own option grid or sidebar. Lessons too small for this game are disabled
 * rather than hidden, so the numbering stays the same as the course.
 */
export function ScopePicker({
  bundle,
  game,
  scope,
  onChange,
  disabled,
  idPrefix,
  wrapFields,
}: {
  bundle: ContentBundle;
  game: GameId;
  scope: Scope;
  onChange(level: string, key: string): void;
  disabled?: boolean;
  idPrefix: string;
  /** Wrap each label + select in a <div>, for option grids laid out per field. */
  wrapFields?: boolean;
}) {
  const Field = wrapFields ? 'div' : Fragment;
  const min = MIN_WORDS[game];
  const levels = bundle.levels.filter(
    (l) => selectWords(bundle, { level: l.name, range: 'all' }, game).length >= min,
  );
  const lessons = lessonOptions(bundle, scope.level, game);
  const total = selectWords(bundle, { level: scope.level, range: 'all' }, game).length;
  const lesson = scope.range === 'all' ? null : lessons.find((l) => l.number === scope.lesson);
  return (
    <>
      <Field>
        <label htmlFor={`${idPrefix}-level`}>Cấp độ</label>
        <Select
          id={`${idPrefix}-level`}
          aria-label="Cấp độ"
          value={scope.level}
          disabled={disabled}
          onValueChange={(level) => onChange(level, 'all')}
        >
          {levels.map((l) => (
            <option key={l.name} value={l.name}>
              {l.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field>
        <label htmlFor={`${idPrefix}-lesson`}>Bài học</label>
        <Select
          id={`${idPrefix}-lesson`}
          aria-label="Bài học"
          showDisabledOptions
          value={scope.range === 'all' ? 'all' : String(scope.lesson)}
          disabled={disabled}
          onValueChange={(value) => {
            if (value === 'all') return onChange(scope.level, 'all');
            const picked = lessons.find((l) => String(l.number) === value);
            // A lesson too small on its own opens as a review of every lesson up to it.
            const range = scope.range === 'upto' || (picked?.count ?? 0) < min ? 'upto' : 'lesson';
            onChange(scope.level, `${range}:${value}`);
          }}
        >
          <option value="all">Tổng hợp · {total} từ</option>
          {lessons.map((l) => (
            <option key={l.number} value={String(l.number)} disabled={l.upto < min}>
              {`Bài ${l.number}${l.title ? ` · ${l.title}` : ''} · ${l.upto < min ? (l.count ? 'Chưa đủ từ' : 'Chưa có từ cho game này') : `${l.count} từ`}`}
            </option>
          ))}
        </Select>
      </Field>
      {lesson && lesson.number > 1 && (
        <Field>
          <label htmlFor={`${idPrefix}-range`}>Phạm vi</label>
          <Select
            id={`${idPrefix}-range`}
            aria-label="Phạm vi"
            value={scopeKey(scope)}
            disabled={disabled}
            onValueChange={(key) => onChange(scope.level, key)}
          >
            <option value={`lesson:${lesson.number}`} disabled={lesson.count < min}>
              {`Chỉ bài ${lesson.number} · ${lesson.count} từ`}
            </option>
            <option value={`upto:${lesson.number}`}>
              {`Ôn bài 1–${lesson.number} · ${lesson.upto} từ`}
            </option>
          </Select>
        </Field>
      )}
    </>
  );
}
