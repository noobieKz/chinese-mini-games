import { useEffect, useMemo, useState } from 'react';
import {
  levelSlug,
  MIN_WORDS,
  parseBundle,
  parseScopeKey,
  selectCollocations,
  selectWords,
  type ContentBundle,
  type GameId,
  type Scope,
} from '../../shared/content';
import { sampleBundle } from './sample';

let request: Promise<{ bundle: ContentBundle; live: boolean }> | null = null;

/**
 * Course content from Cloudflare (/api/content), fetched once per page load. A missing, slow or
 * malformed response falls back to the bundled sample, so the games always have something to play.
 */
export function loadContent() {
  request ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('/api/content', { signal: controller.signal });
      const bundle = response.ok ? parseBundle(await response.json()) : null;
      return bundle ? { bundle, live: true } : { bundle: sampleBundle, live: false };
    } catch {
      return { bundle: sampleBundle, live: false };
    } finally {
      clearTimeout(timer);
    }
  })();
  return request;
}

export function useContent() {
  const [state, setState] = useState<{ bundle: ContentBundle; live: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadContent().then((result) => alive && setState(result));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** Lessons and counts for one level, as this game can use them. */
export function lessonOptions(bundle: ContentBundle, level: string, game: GameId) {
  const lessons = bundle.levels.find((l) => l.name === level)?.lessons ?? [];
  return lessons.map((lesson) => ({
    ...lesson,
    count: selectWords(bundle, { level, range: 'lesson', lesson: lesson.number }, game).length,
    upto: selectWords(bundle, { level, range: 'upto', lesson: lesson.number }, game).length,
  }));
}

/**
 * The level and lesson range a game plays, kept in the address bar (?cap=hsk-1&bai=3&on=1) so a
 * teacher can share a link to one lesson. Invalid or stale links fall back to the whole level.
 */
export function useScope(bundle: ContentBundle | null, game: GameId) {
  const [choice, setChoice] = useState(() => {
    const query = new URLSearchParams(location.search);
    const lesson = Number(query.get('bai'));
    return {
      levelSlug: query.get('cap') ?? '',
      key: lesson > 0 ? `${query.get('on') === '1' ? 'upto' : 'lesson'}:${lesson}` : 'all',
    };
  });
  const scope = useMemo<Scope | null>(() => {
    if (!bundle?.levels.length) return null;
    const levels = bundle.levels.filter(
      (l) => selectWords(bundle, { level: l.name, range: 'all' }, game).length >= MIN_WORDS[game],
    );
    const level = (
      levels.find((l) => levelSlug(l.name) === choice.levelSlug) ??
      levels[0] ??
      bundle.levels[0]
    ).name;
    const picked = parseScopeKey(level, choice.key);
    const valid =
      picked.range === 'all' ||
      bundle.levels.find((l) => l.name === level)?.lessons.some((x) => x.number === picked.lesson);
    return valid ? picked : { level, range: 'all' };
  }, [bundle, choice, game]);
  const set = (level: string, key: string) => {
    setChoice({ levelSlug: levelSlug(level), key });
    const query = new URLSearchParams(location.search);
    query.set('cap', levelSlug(level));
    const picked = parseScopeKey(level, key);
    query.delete('bai');
    query.delete('on');
    if (picked.range !== 'all') {
      query.set('bai', String(picked.lesson));
      if (picked.range === 'upto') query.set('on', '1');
    }
    history.replaceState(history.state, '', `${location.pathname}?${query}`);
  };
  const words = useMemo(
    () => (bundle && scope ? selectWords(bundle, scope, game) : []),
    [bundle, scope, game],
  );
  const collocations = useMemo(
    () => (bundle && scope ? selectCollocations(bundle, scope) : []),
    [bundle, scope],
  );
  return { scope, set, words, collocations };
}
