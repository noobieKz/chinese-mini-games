import { useEffect, useRef, useState } from 'react';
import { confirmLeave } from './lib/useLeaveWarning';
import { Lobby } from './arcade/Lobby';
import { GameAdRails, useDesktopAds } from './arcade/LobbyAds';
import { FruitSlash } from './games/fruit-slash/FruitSlash';
import { DragonWords } from './games/dragon-words/DragonWords';
import { WordGarden } from './games/word-garden/WordGarden';
import { DuelPage } from './games/duel/DuelPage';
import type { MatchMode } from './games/word-garden/vocabulary';
import './games/word-garden/garden.css';
import './arcade/arcade.css';
const getPage = () => location.pathname + location.search;
const getMode = (path: string): MatchMode | null => {
  const [rawRoute, query] = path.split('?');
  const route = rawRoute.replace(/\/+$/, '') || '/';
  if (route === '/games/noi-tu') return 'meaning';
  if (route === '/games/ghep-chu') return 'characters';
  if (route === '/games/pikachu')
    return new URLSearchParams(query).get('mode') === 'meaning' ? 'meaning' : 'characters';
  return null;
};
const libraryRoutes = ['/', '/games', '/index.html'];
export default function App() {
  const [path, setPath] = useState(getPage);
  const position = useRef<number>(history.state?.hanplayPosition ?? 0);
  const restoring = useRef(false);
  const mode = getMode(path);
  const route = path.split('?')[0].replace(/\/+$/, '') || '/';
  const fruit = route === '/games/chem-hoa-qua';
  const dragon = route === '/games/rong-san-chu';
  const duel = route === '/games/solo';
  const notFound = !mode && !fruit && !dragon && !duel && !libraryRoutes.includes(route);
  const game = Boolean(mode || fruit || dragon || duel);
  // On PC, game screens keep a banner in each side margin (the game is narrowed to make room).
  const ads = useDesktopAds(game);
  const shell = (page: React.ReactNode) => (
    <div className={`arcade-app${ads ? ' has-ad-rails' : ''}`}>
      {page}
      {ads && <GameAdRails />}
    </div>
  );
  useEffect(() => {
    document.title = fruit
      ? 'Chém hoa quả · HanPlay'
      : dragon
        ? 'Rồng săn chữ · HanPlay'
        : duel
          ? 'Solo 2 người · HanPlay'
          : mode
            ? mode === 'meaning'
              ? 'Nối từ với nghĩa · HanPlay'
              : 'Ghép chữ thành từ · HanPlay'
            : notFound
              ? 'Không tìm thấy trang · HanPlay'
              : 'HanPlay · Chơi một lượt, nhớ thêm một từ';
  }, [fruit, dragon, duel, mode, notFound]);
  useEffect(() => {
    history.replaceState({ ...history.state, hanplayPosition: position.current }, '');
    const changed = (event: PopStateEvent) => {
      if (restoring.current) {
        restoring.current = false;
        return;
      }
      const next = event.state?.hanplayPosition;
      if (typeof next === 'number' && next !== position.current && !confirmLeave()) {
        restoring.current = true;
        history.go(position.current - next);
        return;
      }
      if (typeof next === 'number') position.current = next;
      setPath(getPage());
    };
    window.addEventListener('popstate', changed);
    return () => window.removeEventListener('popstate', changed);
  }, []);
  const navigate = (path: string) => {
    position.current++;
    history.pushState({ hanplayPosition: position.current }, '', path);
    setPath(path);
    window.scrollTo(0, 0);
  };
  if (fruit) return shell(<FruitSlash onBack={() => navigate('/games')} />);
  if (dragon) return shell(<DragonWords onBack={() => navigate('/games')} />);
  if (duel) return shell(<DuelPage onBack={() => navigate('/games')} />);
  if (mode) return shell(<WordGarden key={mode} mode={mode} onBack={() => navigate('/games')} />);
  return <Lobby navigate={navigate} notFound={notFound} />;
}
