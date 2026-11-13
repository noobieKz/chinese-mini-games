import type { Team, Reward } from '../shared/types';
export function pickReward(random = Math.random): Reward {
  const n = random();
  return n < 0.6 ? 'gold' : n < 0.85 ? 'steal' : 'shield';
}
export function applyReward(
  teams: Team[],
  teamId: number,
  reward: Reward,
  targetId?: number,
): { amount: number; blocked?: boolean } {
  const team = teams.find((t) => t.id === teamId);
  if (!team) throw new Error('Đội không tồn tại.');
  if (reward === 'gold') {
    team.gold += 100;
    return { amount: 100 };
  }
  if (reward === 'shield') {
    team.shield = true;
    return { amount: 0 };
  }
  const target = teams.find((t) => t.id === targetId);
  if (!target || target.id === teamId) throw new Error('Hãy chọn đội khác.');
  if (target.shield) {
    target.shield = false;
    return { amount: 0, blocked: true };
  }
  const amount = Math.min(150, target.gold);
  target.gold -= amount;
  team.gold += amount;
  return { amount };
}
