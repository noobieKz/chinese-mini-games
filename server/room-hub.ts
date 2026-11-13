import { z } from 'zod';
import type { Bank, Player, Reward, RoomView, Team, Reply } from '../shared/types';
import type { Teacher } from '../shared/auth';
import { applyReward, pickReward } from './game';
import { bankSchema } from '../shared/schema';
const randomUUID = () => crypto.randomUUID();
const randomBytes = (_count: number) => ({
  readUInt32BE: () => crypto.getRandomValues(new Uint32Array(1))[0],
});
type Member = Player & {
  token: string;
  socketId: string;
  index: number;
  pending?: Reward;
  lastAnswer: number;
};
export type Room = {
  code: string;
  hostToken: string;
  teacherId: string;
  hostSocket: string;
  bank: Bank;
  teams: Team[];
  players: Member[];
  status: RoomView['status'];
  duration: number;
  endsAt: number;
  activity: string[];
  createdAt: number;
};
export class GamePeer {
  handlers = new Map<string, (data: unknown, reply: (value: Reply) => void) => void>();
  data: { code?: string } = {};
  teacher: Teacher | null = null;
  constructor(
    public id: string,
    public emit: (event: string, data?: unknown) => void,
  ) {}
  on(event: string, handler: (data: unknown, reply: (value: Reply) => void) => void) {
    this.handlers.set(event, handler);
  }
  dispatch(event: string, data: unknown): Reply {
    let result: Reply = {};
    const handler = this.handlers.get(event);
    if (!handler) return { error: 'Lệnh không hợp lệ.' };
    handler(data, (value) => (result = value));
    return result;
  }
}
function requireTeacher(peer: GamePeer) {
  if (!peer.teacher) throw new Error('Vui lòng đăng nhập tài khoản giáo viên được cấp quyền.');
  return peer.teacher;
}
export function createRoomHub(seed: Room[] = []) {
  const rooms = new Map(seed.map((room) => [room.code, room]));
  const peers = new Map<string, GamePeer>();
  const io = {
    sockets: { sockets: peers },
    emit: (event: string, data: unknown) => {
      for (const peer of peers.values()) peer.emit(event, data);
    },
  };
  function publish(room: Room) {
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.code !== room.code) continue;
      const member = room.players.find((p) => p.socketId === socket.id);
      const host = room.hostSocket === socket.id;
      const question =
        room.status === 'playing' && member && !member.pending
          ? room.bank.questions[member.index]
          : undefined;
      const view: RoomView = {
        code: room.code,
        status: room.status,
        title: room.bank.title,
        teams: room.teams,
        players: room.players.map(({ id, name, team, online, correct }) => ({
          id,
          name,
          team,
          online,
          correct,
        })),
        duration: room.duration,
        endsAt: room.endsAt,
        activity: room.activity,
        host,
        me: member?.id,
        question: question
          ? {
              id: question.id,
              text: question.text,
              pinyin: question.pinyin,
              options: question.options,
            }
          : undefined,
        pending: member?.pending,
        answered: member?.index ?? 0,
        total: room.bank.questions.length,
      };
      socket.emit('room', view);
    }
  }
  function log(room: Room, message: string) {
    room.activity.unshift(message);
    room.activity = room.activity.slice(0, 12);
  }
  const attach = (socket: GamePeer) => {
    const handle = (event: string, action: (data: unknown) => Reply) =>
      socket.on(event, (data, reply) => {
        if (typeof reply !== 'function') return;
        try {
          reply(action(data));
        } catch (error) {
          reply({
            error:
              error instanceof z.ZodError
                ? 'Thông tin chưa hợp lệ. Kiểm tra lại dữ liệu nhé.'
                : error instanceof Error
                  ? error.message
                  : 'Yêu cầu không hợp lệ.',
          });
        }
      });
    const current = () => {
      const room = rooms.get(socket.data.code ?? '');
      if (!room) throw new Error('Không tìm thấy phòng.');
      if (room.status === 'playing' && Date.now() >= room.endsAt) {
        room.status = 'finished';
        publish(room);
      }
      return room;
    };
    handle('create', (data) => {
      const teacher = requireTeacher(socket);
      if (socket.data.code) throw new Error('Bạn đang ở trong một phòng.');
      if (rooms.size >= 500) throw new Error('Máy chủ đang đầy. Hãy thử lại sau.');
      const parsed = z
        .object({
          bank: bankSchema,
          teamCount: z.number().int().min(2).max(4),
          duration: z.number().int().min(1).max(15),
        })
        .parse(data);
      let code: string;
      do {
        code = String((randomBytes(4).readUInt32BE() % 900000) + 100000);
      } while (rooms.has(code));
      const hostToken = randomUUID();
      const names = ['Rồng lửa', 'Gấu trúc', 'Hổ sấm', 'Phượng hoàng'];
      const room: Room = {
        code,
        hostToken,
        teacherId: teacher.id,
        hostSocket: socket.id,
        bank: parsed.bank,
        teams: names
          .slice(0, parsed.teamCount)
          .map((name, id) => ({ id, name, gold: 0, shield: false })),
        players: [],
        status: 'lobby',
        duration: parsed.duration,
        endsAt: 0,
        activity: [],
        createdAt: Date.now(),
      };
      rooms.set(code, room);
      socket.data.code = code;
      publish(room);
      return { code, token: hostToken };
    });
    handle('join', (data) => {
      if (socket.data.code) throw new Error('Bạn đang ở trong một phòng.');
      const { code, name } = z
        .object({ code: z.string().regex(/^\d{6}$/), name: z.string().trim().min(1).max(24) })
        .parse(data);
      const room = rooms.get(code);
      if (!room) throw new Error('Mã phòng không tồn tại.');
      if (room.status !== 'lobby') throw new Error('Phòng đã bắt đầu hoặc kết thúc.');
      if (room.players.length >= 60) throw new Error('Phòng đã đủ 60 học viên.');
      const team = room.teams.reduce(
        (best, t) =>
          room.players.filter((p) => p.team === t.id).length <
          room.players.filter((p) => p.team === best.id).length
            ? t
            : best,
        room.teams[0],
      );
      const token = randomUUID();
      room.players.push({
        id: randomUUID(),
        name,
        team: team.id,
        online: true,
        correct: 0,
        token,
        socketId: socket.id,
        index: 0,
        lastAnswer: 0,
      });
      socket.data.code = code;
      publish(room);
      return { code, token };
    });
    handle('resume', (data) => {
      const { code, token } = z.object({ code: z.string(), token: z.string() }).parse(data);
      const room = rooms.get(code);
      if (!room) throw new Error('Phòng đã hết hạn.');
      const member = room.players.find((p) => p.token === token);
      if (room.hostToken === token) {
        if (requireTeacher(socket).id !== room.teacherId)
          throw new Error('Bạn không sở hữu phòng này.');
        const old = io.sockets.sockets.get(room.hostSocket);
        if (old && old.id !== socket.id) {
          old.data.code = undefined;
          old.emit('replaced');
        }
        room.hostSocket = socket.id;
      } else if (member) {
        const old = io.sockets.sockets.get(member.socketId);
        if (old && old.id !== socket.id) {
          old.data.code = undefined;
          old.emit('replaced');
        }
        member.socketId = socket.id;
        member.online = true;
      } else throw new Error('Phiên tham gia không hợp lệ.');
      socket.data.code = code;
      publish(room);
      return {};
    });
    handle('start', () => {
      const room = current();
      if (requireTeacher(socket).id !== room.teacherId)
        throw new Error('Bạn không sở hữu phòng này.');
      if (room.hostSocket !== socket.id) throw new Error('Chỉ giáo viên được bắt đầu.');
      if (room.status !== 'lobby') throw new Error('Phòng đã bắt đầu.');
      if (!room.players.some((p) => p.online))
        throw new Error('Cần ít nhất một học viên tham gia.');
      room.status = 'playing';
      room.endsAt = Date.now() + room.duration * 60000;
      log(room, 'Cuộc săn vàng bắt đầu. Cố lên nào!');
      publish(room);
      return {};
    });
    handle('answer', (data) => {
      const room = current();
      const p = room.players.find((p) => p.socketId === socket.id);
      if (room.status !== 'playing' || !p || p.pending) throw new Error('Chưa thể trả lời.');
      if (Date.now() - p.lastAnswer < 700) throw new Error('Chậm một chút, đọc kỹ câu hỏi nhé.');
      const { index, option } = z
        .object({ index: z.number().int(), option: z.number().int().min(0).max(3) })
        .parse(data);
      if (index !== p.index) throw new Error('Câu hỏi đã thay đổi.');
      const q = room.bank.questions[p.index];
      if (!q) throw new Error('Bạn đã hoàn thành bộ câu hỏi.');
      p.lastAnswer = Date.now();
      p.index++;
      const correct = option === q.answer;
      if (correct) {
        p.correct++;
        p.pending = pickReward();
      }
      publish(room);
      return { correct, correctAnswer: q.options[q.answer] };
    });
    handle('claim', (data) => {
      const room = current();
      const p = room.players.find((p) => p.socketId === socket.id);
      if (room.status !== 'playing' || !p?.pending) throw new Error('Không có rương đang chờ.');
      const target = z.object({ target: z.number().int().optional() }).parse(data).target;
      const reward = p.pending;
      const result = applyReward(room.teams, p.team, reward, target);
      p.pending = undefined;
      log(
        room,
        `${p.name} · ${reward === 'gold' ? '+100 vàng' : reward === 'shield' ? 'nhận lá chắn' : result.blocked ? 'bị lá chắn chặn' : `cướp ${result.amount} vàng`}`,
      );
      publish(room);
      return { reward, amount: result.amount };
    });
    handle('finish', () => {
      const room = current();
      if (requireTeacher(socket).id !== room.teacherId)
        throw new Error('Bạn không sở hữu phòng này.');
      if (room.hostSocket !== socket.id) throw new Error('Chỉ giáo viên được kết thúc.');
      if (room.status !== 'playing') throw new Error('Ván chơi chưa bắt đầu.');
      room.status = 'finished';
      publish(room);
      return {};
    });
    handle('leave', () => {
      const room = current();
      const p = room.players.find((p) => p.socketId === socket.id);
      if (p) {
        if (room.status === 'lobby') room.players = room.players.filter((x) => x !== p);
        else p.online = false;
      }
      if (room.hostSocket === socket.id) room.hostSocket = '';
      socket.data.code = undefined;
      publish(room);
      return {};
    });
    socket.on('disconnect', () => {
      const room = rooms.get(socket.data.code ?? '');
      const p = room?.players.find((p) => p.socketId === socket.id);
      if (room && p) {
        p.online = false;
        publish(room);
      }
    });
  };
  const tick = () => {
    for (const [code, room] of rooms) {
      if (room.status === 'playing' && Date.now() >= room.endsAt) {
        room.status = 'finished';
        publish(room);
      }
      if (Date.now() - room.createdAt > 6 * 3600000) {
        io.emit('room-expired', code);
        rooms.delete(code);
        for (const peer of peers.values()) if (peer.data.code === code) peer.data.code = undefined;
      }
    }
  };
  return {
    rooms,
    peers,
    connect(peer: GamePeer) {
      peers.set(peer.id, peer);
      attach(peer);
    },
    dispatch(peer: GamePeer, event: string, data: unknown) {
      if (
        !['create', 'join', 'resume', 'start', 'finish', 'answer', 'claim', 'leave'].includes(event)
      )
        return { error: 'Lệnh không hợp lệ.' };
      return peer.dispatch(event, data);
    },
    disconnect(peer: GamePeer) {
      peer.dispatch('disconnect', {});
      peers.delete(peer.id);
    },
    tick,
  };
}
