import type { ContentWord } from '../../../shared/content';
import { sampleBundle } from '../../content/sample';

/** A course word; the content itself lives in src/content (sample) and on Cloudflare (live). */
export type Word = ContentWord;
export type MatchMode = 'meaning' | 'characters';
export type Difficulty = 'normal' | 'hard';
/** The bundled sample words, kept for tests and as the offline fallback. */
export const vocabulary: Word[] = sampleBundle.words;
