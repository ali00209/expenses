import type {
  Answer,
  Sources,
  Storage,
  Database,
  Result,
  SQLCommand,
  SQLValue,
} from './app.contract.d.ts';

export const appId = 'com.tally.expenses';

// The publishable key is public by design; user access comes from Supabase Auth.
const SUPABASE_URL = 'https://loegjvmmacswekbencpp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4WjfoK700zv2VZjk3I_TaA_N2iI8CFT';
const POWERSYNC_URL = 'https://6acfa86d3b1803753bd1acb2.powersync.journeyapps.com';
const DB_PATH = 'app:/data/tally.db';

export const grants = [
  `sqlite.open ${DB_PATH}`,
  `net.fetch ${SUPABASE_URL}`,
  `net.fetch ${POWERSYNC_URL}`,
  'secret.keep tally.session',
  'secret.keep tally.profile',
  'secret.keep tally.demo',
  'secret.keep tally.client',
].join('\n');

type Bootstrap = Result<'bootstrap'>;
type SyncStatus = Result<'syncStatus'>;
type Group = Result<'groupList'>[number];
type GroupView = Result<'groupView'>;
type Member = GroupView['members'][number];
type Expense = GroupView['expenses'][number];
type Balance = GroupView['balances'][number];
type Transfer = GroupView['transfers'][number];
type Activity = GroupView['activity'][number];
type AuthReply = Result<'authenticate'>;
type SessionReply = Result<'ensureSession'>;
type JoinReply = Result<'joinGroup'>;
type SaveReply = Result<'saveExpense'>;
type SyncReply = Result<'drainSync'>;
type SyncFeed = Result<'syncStream'>;
type Store = Parameters<Answer>[2];

type Profile = { id: string; name: string; email: string };
type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: Profile;
};

type GroupRow = {
  id: string;
  name: string;
  currency: string;
  code: string;
  createdAt: string;
  role: string;
};

type MemberRow = {
  groupId: string;
  userId: string;
  role: string;
  name: string;
  email: string;
};

type ExpenseRecord = {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  payerId: string;
  date: string;
  category: string;
  scope: string;
  participants: string[];
  createdById: string;
  createdAt: string;
  updatedById: string;
  remainderTo: string;
  assignmentId: string | null;
  spentById: string | null;
  overLimit: number;
};

type SettlementRecord = {
  id: string;
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
  scope: string;
  method: string | null;
  createdById: string;
  potId: string | null;
};

type ActivityRecord = {
  id: string;
  actorId: string;
  actorName: string;
  message: string;
  createdAt: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SCHEMA: SQLCommand[] = [
  {
    sql: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      created_at TEXT
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT,
      code TEXT,
      currency TEXT,
      created_by_id TEXT,
      created_at TEXT
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      user_id TEXT,
      role TEXT,
      joined_at TEXT
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      description TEXT,
      amount_cents INTEGER,
      currency TEXT,
      payer_id TEXT,
      date TEXT,
      category TEXT,
      scope TEXT,
      participants TEXT,
      created_by_id TEXT,
      created_at TEXT,
      updated_by_id TEXT,
      remainder_to TEXT,
      assignment_id TEXT,
      spent_by_id TEXT,
      over_limit INTEGER
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      from_id TEXT,
      to_id TEXT,
      amount_cents INTEGER,
      date TEXT,
      note TEXT,
      created_at TEXT,
      scope TEXT,
      method TEXT,
      created_by_id TEXT,
      pot_id TEXT
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS settlement_units (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      name TEXT,
      created_at TEXT
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS unit_members (
      id TEXT PRIMARY KEY,
      unit_id TEXT,
      user_id TEXT
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      actor_id TEXT,
      type TEXT,
      message TEXT,
      created_at TEXT,
      target_id TEXT
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS outbox (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      op TEXT NOT NULL,
      object_id TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      error TEXT NOT NULL DEFAULT ''
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id)' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id)' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(group_id)' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_activities_group ON activities(group_id)' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_units_group ON settlement_units(group_id)' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_unit_members_unit ON unit_members(unit_id)' },
];

const CLEAR_ALL: SQLCommand[] = [
  { sql: 'DELETE FROM groups' },
  { sql: 'DELETE FROM group_members' },
  { sql: 'DELETE FROM expenses' },
  { sql: 'DELETE FROM settlements' },
  { sql: 'DELETE FROM activities' },
  { sql: 'DELETE FROM unit_members' },
  { sql: 'DELETE FROM settlement_units' },
  { sql: 'DELETE FROM users' },
  { sql: 'DELETE FROM outbox' },
  { sql: 'DELETE FROM meta' },
];

const TABLE_COLUMNS: Record<string, string[]> = {
  users: ['id', 'name', 'email', 'created_at'],
  groups: ['id', 'name', 'code', 'currency', 'created_by_id', 'created_at'],
  group_members: ['id', 'group_id', 'user_id', 'role', 'joined_at'],
  expenses: [
    'id',
    'group_id',
    'description',
    'amount_cents',
    'currency',
    'payer_id',
    'date',
    'category',
    'scope',
    'participants',
    'created_by_id',
    'created_at',
    'updated_by_id',
    'remainder_to',
    'assignment_id',
    'spent_by_id',
    'over_limit',
  ],
  settlements: [
    'id',
    'group_id',
    'from_id',
    'to_id',
    'amount_cents',
    'date',
    'note',
    'created_at',
    'scope',
    'method',
    'created_by_id',
    'pot_id',
  ],
  settlement_units: ['id', 'group_id', 'name', 'created_at'],
  unit_members: ['id', 'unit_id', 'user_id'],
  activities: ['id', 'group_id', 'actor_id', 'type', 'message', 'created_at', 'target_id'],
};

// One database operation at a time, as Fieldnotes does: on web every execute
// exports the file, and two windows must not replace each other's work.
let tail: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = tail.then(work);
  tail = result.catch(() => {});
  return result;
}

async function openDatabase(storage: Storage): Promise<Database> {
  const db = await storage.sqlite.open(DB_PATH);
  try {
    const found = await db.query(
      "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='outbox'",
    );
    if (!found.rows.length) await db.transaction(SCHEMA);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

function withDatabase<T>(storage: Storage, work: (db: Database) => Promise<T>): Promise<T> {
  return serial(async () => {
    const db = await openDatabase(storage);
    try {
      return await work(db);
    } finally {
      await db.close();
    }
  });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isoFrom(ms: number): string {
  return new Date(ms).toISOString();
}

function msFrom(value: string): number {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatDay(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return value.slice(0, 10);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatStamp(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return value;
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}, ${hours}:${minutes}`;
}

function formatWhen(value: string): string {
  const ms = msFrom(value);
  if (!ms) return '';
  return formatDay(value);
}

function asNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string') as string[];
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string') as string[];
      }
    } catch {
      return [];
    }
  }
  return [];
}

function sqlValue(value: unknown): SQLValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function putCommand(table: string, row: Record<string, unknown>): SQLCommand {
  const columns = TABLE_COLUMNS[table];
  const placeholders = columns.map(() => '?').join(',');
  return {
    sql: `INSERT OR REPLACE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`,
    params: columns.map((column) => sqlValue(row[column])),
  };
}

function patchCommand(table: string, row: Record<string, unknown>): SQLCommand {
  const columns = TABLE_COLUMNS[table];
  const present = columns.filter((column) => column === 'id' || row[column] !== undefined);
  const updates = present.filter((column) => column !== 'id');
  if (!updates.length) return putCommand(table, row);
  return {
    sql: `INSERT INTO ${table} (${present.join(',')}) VALUES (${present
      .map(() => '?')
      .join(',')}) ON CONFLICT(id) DO UPDATE SET ${updates
      .map((column) => `${column}=excluded.${column}`)
      .join(',')}`,
    params: present.map((column) => sqlValue(row[column])),
  };
}

function groupDeleteCommands(groupId: string): SQLCommand[] {
  return [
    { sql: 'DELETE FROM groups WHERE id=?', params: [groupId] },
    { sql: 'DELETE FROM group_members WHERE group_id=?', params: [groupId] },
    { sql: 'DELETE FROM expenses WHERE group_id=?', params: [groupId] },
    { sql: 'DELETE FROM settlements WHERE group_id=?', params: [groupId] },
    { sql: 'DELETE FROM activities WHERE group_id=?', params: [groupId] },
    {
      sql: 'DELETE FROM unit_members WHERE unit_id IN (SELECT id FROM settlement_units WHERE group_id=?)',
      params: [groupId],
    },
    { sql: 'DELETE FROM settlement_units WHERE group_id=?', params: [groupId] },
  ];
}

function outboxCommand(
  table: string,
  op: string,
  objectId: string,
  payload: unknown,
  nowMs: number,
): SQLCommand {
  return {
    sql: 'INSERT INTO outbox (table_name,op,object_id,payload,created_at) VALUES (?,?,?,?,?)',
    params: [
      table,
      op,
      objectId,
      payload === null ? '' : JSON.stringify(payload),
      nowMs,
    ],
  };
}

function readProfile(store: Store): Profile {
  const raw = store.get('tally.profile');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Profile>;
      if (parsed && typeof parsed.id === 'string') {
        return {
          id: parsed.id,
          name: typeof parsed.name === 'string' ? parsed.name : '',
          email: typeof parsed.email === 'string' ? parsed.email : '',
        };
      }
    } catch {
      // A damaged profile is replaced on the next sign-in.
    }
  }
  return { id: '', name: '', email: '' };
}

function writeProfile(store: Store, profile: Profile): void {
  store.set('tally.profile', JSON.stringify(profile));
}

function readSession(store: Store): Session | null {
  const raw = store.get('tally.session');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (
      parsed &&
      typeof parsed.access_token === 'string' &&
      typeof parsed.refresh_token === 'string' &&
      typeof parsed.expires_at === 'number' &&
      parsed.user &&
      typeof parsed.user.id === 'string'
    ) {
      return {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
        expires_at: parsed.expires_at,
        user: {
          id: parsed.user.id,
          name: typeof parsed.user.name === 'string' ? parsed.user.name : '',
          email: typeof parsed.user.email === 'string' ? parsed.user.email : '',
        },
      };
    }
  } catch {
    // A damaged session means signing in again.
  }
  return null;
}

function writeSession(store: Store, session: Session): void {
  store.set('tally.session', JSON.stringify(session));
  writeProfile(store, session.user);
}

function demoMode(store: Store): boolean {
  return store.get('tally.demo') === '1';
}

function clientId(store: Store): string {
  const existing = store.get('tally.client');
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set('tally.client', id);
  return id;
}

function newId(demo: boolean): string {
  const id = crypto.randomUUID();
  return demo ? `d-${id}` : id;
}

function makeCode(): string {
  const raw = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return raw.length === 6 ? raw : 'TALLY1';
}

function parseAmount(text: string): number {
  const clean = text.replace(/[,\s]/g, '');
  const value = Number(clean);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

function normalizeDate(text: string, nowMs: number): string {
  const trimmed = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T12:00:00.000Z`;
  const ms = msFrom(trimmed);
  return ms ? isoFrom(ms) : isoFrom(nowMs);
}

function seedFrom(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) & 0x7fffffff;
  }
  return hash;
}

function splitShares(
  total: number,
  participants: string[],
  seedKey: string,
  remainderTo: string,
  payerId: string,
): Map<string, number> {
  const shares = new Map<string, number>();
  if (!participants.length) return shares;
  if (remainderTo === 'payer' && participants.includes(payerId)) {
    const base = Math.floor(total / participants.length);
    for (const id of participants) shares.set(id, base);
    shares.set(payerId, base + (total - base * participants.length));
    return shares;
  }
  const sorted = [...participants].sort();
  const base = Math.floor(total / sorted.length);
  const remainder = total - base * sorted.length;
  const start = seedFrom(seedKey) % sorted.length;
  for (const id of sorted) shares.set(id, base);
  for (let index = 0; index < remainder; index++) {
    const id = sorted[(start + index) % sorted.length];
    shares.set(id, (shares.get(id) || 0) + 1);
  }
  return shares;
}

function netFor(
  memberIds: string[],
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[],
): Map<string, number> {
  const net = new Map<string, number>();
  const bump = (id: string, delta: number) => {
    if (!id) return;
    net.set(id, (net.get(id) || 0) + delta);
  };
  for (const id of memberIds) net.set(id, 0);
  for (const expense of expenses) {
    if (!expense.payerId || !expense.participants.length || expense.amount <= 0) continue;
    bump(expense.payerId, expense.amount);
    const shares = splitShares(
      expense.amount,
      expense.participants,
      expense.id,
      expense.remainderTo,
      expense.payerId,
    );
    for (const [id, cents] of shares) bump(id, -cents);
  }
  for (const settlement of settlements) {
    if (settlement.amount <= 0 || settlement.fromId === settlement.toId) continue;
    bump(settlement.fromId, settlement.amount);
    bump(settlement.toId, -settlement.amount);
  }
  for (const [id, value] of [...net]) {
    if (value === 0) net.delete(id);
  }
  return net;
}

function collapseNet(
  net: Map<string, number>,
  partyOf: Map<string, string>,
): Map<string, number> {
  const collapsed = new Map<string, number>();
  for (const [id, value] of net) {
    const party = partyOf.get(id) || id;
    collapsed.set(party, (collapsed.get(party) || 0) + value);
  }
  for (const [id, value] of [...collapsed]) {
    if (value === 0) collapsed.delete(id);
  }
  return collapsed;
}

function minimizeDebts(net: Map<string, number>): Transfer[] {  const creditors: Array<[string, number]> = [];
  const debtors: Array<[string, number]> = [];
  for (const [id, value] of net) {
    if (value > 0) creditors.push([id, value]);
    if (value < 0) debtors.push([id, -value]);
  }
  const order = (a: [string, number], b: [string, number]) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  };
  creditors.sort(order);
  debtors.sort(order);
  const transfers: Transfer[] = [];
  let creditIndex = 0;
  let debtIndex = 0;
  while (creditIndex < creditors.length && debtIndex < debtors.length) {
    const credit = creditors[creditIndex];
    const debt = debtors[debtIndex];
    const amount = Math.min(credit[1], debt[1]);
    if (amount > 0) {
      transfers.push({
        fromId: debt[0],
        fromName: '',
        toId: credit[0],
        toName: '',
        amount,
      });
    }
    credit[1] -= amount;
    debt[1] -= amount;
    if (credit[1] === 0) creditIndex++;
    if (debt[1] === 0) debtIndex++;
  }
  return transfers;
}

function groupRow(row: SQLValue[]): GroupRow {
  return {
    id: asText(row[0]),
    name: asText(row[1]),
    currency: asText(row[2]) || 'PKR',
    code: asText(row[3]),
    createdAt: asText(row[4]),
    role: asText(row[5]),
  };
}

function memberRow(row: SQLValue[]): MemberRow {
  return {
    groupId: asText(row[0]),
    userId: asText(row[1]),
    role: asText(row[2]),
    name: asText(row[3]),
    email: asText(row[4]),
  };
}

function expenseRecord(row: SQLValue[]): ExpenseRecord {
  return {
    id: asText(row[0]),
    groupId: asText(row[1]),
    description: asText(row[2]),
    amount: asNumber(row[3]),
    currency: asText(row[4]) || 'PKR',
    payerId: asText(row[5]),
    date: asText(row[6]),
    category: asText(row[7]) || 'general',
    scope: asText(row[8]) || 'group',
    participants: asList(row[9]),
    createdById: asText(row[10]),
    createdAt: asText(row[11]),
    updatedById: asText(row[12]),
    remainderTo: asText(row[13]) || 'seeded',
    assignmentId: row[14] === null || row[14] === undefined ? null : asText(row[14]),
    spentById: row[15] === null || row[15] === undefined ? null : asText(row[15]),
    overLimit: asNumber(row[16]),
  };
}

function settlementRecord(row: SQLValue[]): SettlementRecord {
  return {
    id: asText(row[0]),
    groupId: asText(row[1]),
    fromId: asText(row[2]),
    toId: asText(row[3]),
    amount: asNumber(row[4]),
    date: asText(row[5]),
    note: row[6] === null || row[6] === undefined ? null : asText(row[6]),
    createdAt: asText(row[7]),
    scope: asText(row[8]) || 'group',
    method: row[9] === null || row[9] === undefined ? null : asText(row[9]),
    createdById: asText(row[10]),
    potId: row[11] === null || row[11] === undefined ? null : asText(row[11]),
  };
}

const GROUP_SELECT =
  'SELECT g.id, g.name, g.currency, g.code, g.created_at, gm.role ' +
  'FROM groups g JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ? ' +
  'ORDER BY g.name COLLATE NOCASE';

const MEMBER_SELECT =
  'SELECT gm.group_id, gm.user_id, gm.role, COALESCE(u.name, \'\'), COALESCE(u.email, \'\') ' +
  'FROM group_members gm LEFT JOIN users u ON u.id = gm.user_id ';

const EXPENSE_SELECT =
  'SELECT id, group_id, description, amount_cents, currency, payer_id, date, category, scope, ' +
  'participants, created_by_id, created_at, updated_by_id, remainder_to, assignment_id, ' +
  'spent_by_id, over_limit FROM expenses ';

const SETTLEMENT_SELECT =
  'SELECT id, group_id, from_id, to_id, amount_cents, date, note, created_at, scope, method, ' +
  'created_by_id, pot_id FROM settlements ';

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(',');
}

async function countOutboxDb(db: Database): Promise<number> {
  const result = await db.query('SELECT count(*) FROM outbox');
  return result.rows.length ? asNumber(result.rows[0][0]) : 0;
}

async function countOutbox(storage: Storage): Promise<number> {
  try {
    return await withDatabase(storage, (db) => countOutboxDb(db));
  } catch {
    return 0;
  }
}

function emptyGroupView(): GroupView {
  return {
    id: '',
    name: '',
    currency: 'PKR',
    code: '',
    role: '',
    createdAt: '',
    members: [],
    expenses: [],
    balances: [],
    transfers: [],
    activity: [],
    myNet: 0,
    myName: '',
    expenseCount: 0,
    canManage: false,
  };
}

async function loadGroupList(db: Database, me: Profile): Promise<Group[]> {
  const groupsResult = await db.query(GROUP_SELECT, [me.id]);
  const groups = groupsResult.rows.map(groupRow);
  if (!groups.length) return [];
  const ids = groups.map((group) => group.id);
  const marks = placeholders(ids.length);
  const membersResult = await db.query(`${MEMBER_SELECT} WHERE gm.group_id IN (${marks})`, ids);
  const expensesResult = await db.query(
    `${EXPENSE_SELECT} WHERE group_id IN (${marks}) AND (scope IS NULL OR scope <> 'personal')`,
    ids,
  );
  const settlementsResult = await db.query(
    `${SETTLEMENT_SELECT} WHERE group_id IN (${marks}) AND (scope IS NULL OR scope <> 'pot')`,
    ids,
  );
  const unitsResult = await db.query(
    `SELECT id, group_id, name FROM settlement_units WHERE group_id IN (${marks})`,
    ids,
  );
  const unitMembersResult = await db.query(
    `SELECT um.unit_id, um.user_id FROM unit_members um ` +
      `JOIN settlement_units u ON u.id = um.unit_id WHERE u.group_id IN (${marks})`,
    ids,
  );
  const unitMembersByUnit = new Map<string, string[]>();
  for (const row of unitMembersResult.rows) {
    const unitId = asText(row[0]);
    const userId = asText(row[1]);
    const list = unitMembersByUnit.get(unitId) || [];
    list.push(userId);
    unitMembersByUnit.set(unitId, list);
  }
  const unitsByGroup = new Map<string, Array<{ id: string; name: string }>>();
  for (const row of unitsResult.rows) {
    const groupId = asText(row[1]);
    const list = unitsByGroup.get(groupId) || [];
    list.push({ id: asText(row[0]), name: asText(row[2]) });
    unitsByGroup.set(groupId, list);
  }
  const membersByGroup = new Map<string, MemberRow[]>();
  for (const row of membersResult.rows) {
    const member = memberRow(row);
    const list = membersByGroup.get(member.groupId) || [];
    list.push(member);
    membersByGroup.set(member.groupId, list);
  }
  const expensesByGroup = new Map<string, ExpenseRecord[]>();
  for (const row of expensesResult.rows) {
    const expense = expenseRecord(row);
    const list = expensesByGroup.get(expense.groupId) || [];
    list.push(expense);
    expensesByGroup.set(expense.groupId, list);
  }
  const settlementsByGroup = new Map<string, SettlementRecord[]>();
  for (const row of settlementsResult.rows) {
    const settlement = settlementRecord(row);
    const list = settlementsByGroup.get(settlement.groupId) || [];
    list.push(settlement);
    settlementsByGroup.set(settlement.groupId, list);
  }
  return groups.map((group) => {
    const members = membersByGroup.get(group.id) || [];
    const expenses = expensesByGroup.get(group.id) || [];
    const settlements = settlementsByGroup.get(group.id) || [];
    const net = netFor(
      members.map((member) => member.userId),
      expenses,
      settlements,
    );
    const partyOf = new Map<string, string>();
    for (const unit of unitsByGroup.get(group.id) || []) {
      for (const userId of unitMembersByUnit.get(unit.id) || []) {
        partyOf.set(userId, unit.id);
      }
    }
    const collapsed = collapseNet(net, partyOf);
    const myParty = partyOf.get(me.id) || me.id;
    return {
      id: group.id,
      name: group.name,
      currency: group.currency,
      code: group.code,
      role: group.role,
      memberCount: members.length,
      expenseCount: expenses.length,
      myNet: collapsed.get(myParty) || 0,
      createdAt: group.createdAt,
    };
  });
}

async function loadGroupView(db: Database, groupId: string, me: Profile): Promise<GroupView> {
  if (!groupId) return emptyGroupView();
  const groupResult = await db.query(
    'SELECT id, name, currency, code, created_at FROM groups WHERE id=?',
    [groupId],
  );
  if (!groupResult.rows.length) return emptyGroupView();
  const group = groupResult.rows[0];
  const membersResult = await db.query(
    `${MEMBER_SELECT} WHERE gm.group_id=? ORDER BY u.name COLLATE NOCASE`,
    [groupId],
  );
  const members: Member[] = [];
  const names = new Map<string, string>();
  let myRole = '';
  for (const row of membersResult.rows) {
    const member = memberRow(row);
    if (member.userId === me.id) myRole = member.role;
    const name = member.name || (member.userId === me.id ? me.name : 'Member');
    names.set(member.userId, name);
    members.push({
      id: member.userId,
      name,
      email: member.email,
      role: member.role,
      net: 0,
    });
  }
  if (me.id && !names.has(me.id)) {
    names.set(me.id, me.name || 'You');
  }
  const unitsResult = await db.query(
    'SELECT id, name FROM settlement_units WHERE group_id=?',
    [groupId],
  );
  const unitMembersResult = await db.query(
    'SELECT um.unit_id, um.user_id FROM unit_members um ' +
      'JOIN settlement_units u ON u.id = um.unit_id WHERE u.group_id=?',
    [groupId],
  );
  const partyOf = new Map<string, string>();
  for (const row of unitMembersResult.rows) {
    partyOf.set(asText(row[1]), asText(row[0]));
  }
  for (const row of unitsResult.rows) {
    const unitId = asText(row[0]);
    const unitName = asText(row[1]) || 'Unit';
    names.set(unitId, unitName);
  }
  const expensesResult = await db.query(
    `${EXPENSE_SELECT} WHERE group_id=? AND (scope IS NULL OR scope <> 'personal') ` +
      'ORDER BY date DESC, created_at DESC',
    [groupId],
  );
  const records: ExpenseRecord[] = [];
  const expenses: Expense[] = [];
  for (const row of expensesResult.rows) {
    const record = expenseRecord(row);
    records.push(record);
    expenses.push({
      id: record.id,
      description: record.description,
      amount: record.amount,
      currency: record.currency,
      payerId: record.payerId,
      payerName: names.get(record.payerId) || (record.payerId ? 'Someone' : 'No one'),
      date: record.date,
      dateLabel: formatDay(record.date),
      participants: record.participants,
      participantCount: record.participants.length,
      createdById: record.createdById,
      canEdit: me.id !== '' && (record.createdById === me.id || myRole === 'admin'),
    });
  }
  const settlementsResult = await db.query(
    `${SETTLEMENT_SELECT} WHERE group_id=? AND (scope IS NULL OR scope <> 'pot') ` +
      'ORDER BY date DESC, created_at DESC',
    [groupId],
  );
  const settlements = settlementsResult.rows.map(settlementRecord);
  const net = netFor(
    members.map((member) => member.id),
    records,
    settlements,
  );
  for (const member of members) {
    member.net = net.get(member.id) || 0;
  }
  const collapsed = collapseNet(net, partyOf);
  const balances: Balance[] = [];
  const partyOrder: string[] = [];
  const seen = new Set<string>();
  for (const member of members) {
    const party = partyOf.get(member.id) || member.id;
    if (!seen.has(party)) {
      seen.add(party);
      partyOrder.push(party);
    }
  }
  for (const row of unitsResult.rows) {
    const unitId = asText(row[0]);
    if (!seen.has(unitId)) {
      seen.add(unitId);
      partyOrder.push(unitId);
    }
  }
  for (const party of partyOrder) {
    const value = collapsed.get(party) || 0;
    if (value !== 0) {
      balances.push({ id: party, name: names.get(party) || 'Someone', net: value });
    }
  }
  const transfers = minimizeDebts(collapsed).map((transfer) => ({
    ...transfer,
    fromName: names.get(transfer.fromId) || 'Someone',
    toName: names.get(transfer.toId) || 'Someone',
  }));
  const activityResult = await db.query(
    'SELECT a.id, a.actor_id, COALESCE(u.name, \'\'), a.message, a.created_at ' +
      'FROM activities a LEFT JOIN users u ON u.id = a.actor_id ' +
      'WHERE a.group_id=? ORDER BY a.created_at DESC LIMIT 40',
    [groupId],
  );
  const activity: Activity[] = activityResult.rows.map((row) => ({
    id: asText(row[0]),
    actorName: asText(row[2]) || 'Someone',
    message: asText(row[3]),
    when: formatWhen(asText(row[4])),
  }));
  const myNet = net.get(me.id) || 0;
  return {
    id: asText(group[0]),
    name: asText(group[1]),
    currency: asText(group[2]) || 'PKR',
    code: asText(group[3]),
    role: myRole,
    createdAt: asText(group[4]),
    members,
    expenses,
    balances,
    transfers,
    activity,
    myNet,
    myName: names.get(me.id) || me.name,
    expenseCount: expenses.length,
    canManage: myRole === 'admin',
  };
}

// ── Supabase Auth and PostgREST ─────────────────────────────────────

type RestReply = { status: number; data: unknown; text: string };

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function restRequest(
  path: string,
  method: string,
  body: unknown,
  token?: string,
): Promise<RestReply> {
  const headers = authHeaders(token);
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body === null || body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: response.status, data, text };
}

function serverMessage(reply: RestReply): string {
  const data = reply.data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    for (const key of ['message', 'error_description', 'msg', 'error', 'details', 'hint']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  if (typeof data === 'string' && data.trim()) return data;
  if (reply.status === 401) return 'Sign in again to sync.';
  if (reply.status === 403) return 'You do not have permission for that change.';
  if (reply.status === 409) return 'That change conflicts with the server.';
  if (reply.status >= 500) return 'The server is unavailable. Try again soon.';
  return `The server refused the change (${reply.status}).`;
}

function sessionFrom(payload: Record<string, unknown>, nowMs: number, fallbackName: string): Session {
  const rawUser = payload.user && typeof payload.user === 'object'
    ? (payload.user as Record<string, unknown>)
    : {};
  const metadata = rawUser.user_metadata && typeof rawUser.user_metadata === 'object'
    ? (rawUser.user_metadata as Record<string, unknown>)
    : {};
  const email = asText(rawUser.email);
  const name =
    asText(metadata.name) ||
    asText(metadata.full_name) ||
    fallbackName ||
    (email ? email.split('@')[0] : 'You');
  const expiresIn = asNumber(payload.expires_in) || 3600;
  return {
    access_token: asText(payload.access_token),
    refresh_token: asText(payload.refresh_token),
    expires_at: nowMs + expiresIn * 1000,
    user: {
      id: asText(rawUser.id),
      name,
      email,
    },
  };
}

async function switchAccount(store: Store, storage: Storage, nextId: string): Promise<void> {
  const current = readProfile(store);
  if (current.id && current.id !== nextId) {
    await withDatabase(storage, (db) => db.transaction(CLEAR_ALL));
  }
}

async function authenticate(
  mode: string,
  email: string,
  password: string,
  name: string,
  nowMs: number,
  store: Store,
  storage: Storage,
): Promise<AuthReply> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { ok: false, error: 'Enter your email and password.', name: '', email: '' };
  }
  try {
    const reply =
      mode === 'signup'
        ? await restRequest('/auth/v1/signup', 'POST', {
            email: cleanEmail,
            password,
            data: { name: name.trim() },
          })
        : await restRequest('/auth/v1/token?grant_type=password', 'POST', {
            email: cleanEmail,
            password,
          });
    if (reply.status >= 300) {
      return { ok: false, error: serverMessage(reply), name: '', email: cleanEmail };
    }
    const data = reply.data && typeof reply.data === 'object'
      ? (reply.data as Record<string, unknown>)
      : {};
    const sessionPayload =
      data.session && typeof data.session === 'object'
        ? (data.session as Record<string, unknown>)
        : data;
    if (!asText(sessionPayload.access_token)) {
      return {
        ok: false,
        error: 'Account created. Check your email to confirm it, then sign in.',
        name: '',
        email: cleanEmail,
      };
    }
    const session = sessionFrom(sessionPayload, nowMs, name.trim());
    if (!session.user.id) {
      return { ok: false, error: 'The server did not return an account.', name: '', email: cleanEmail };
    }
    await switchAccount(store, storage, session.user.id);
    writeSession(store, session);
    setSyncSnapshot('idle');
    syncError = '';
    lastUploadError = '';
    tokenExpiresIn = 0;
    return { ok: true, error: '', name: session.user.name, email: session.user.email };
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach the server. ${message(error)}`,
      name: '',
      email: cleanEmail,
    };
  }
}

async function ensureSession(nowMs: number, store: Store): Promise<SessionReply> {
  const session = readSession(store);
  if (!session) return { ok: false, refreshed: false, error: '' };
  if (session.expires_at - nowMs > 120000) {
    return { ok: true, refreshed: false, error: '' };
  }
  try {
    const reply = await restRequest('/auth/v1/token?grant_type=refresh_token', 'POST', {
      refresh_token: session.refresh_token,
    });
    if (reply.status >= 300) {
      if (reply.status === 400 || reply.status === 401) {
        store.forget('tally.session');
        return {
          ok: false,
          refreshed: false,
          error: 'Your session expired. Sign in again.',
        };
      }
      return { ok: false, refreshed: false, error: serverMessage(reply) };
    }
    const data = reply.data && typeof reply.data === 'object'
      ? (reply.data as Record<string, unknown>)
      : {};
    const refreshed = sessionFrom(data, nowMs, session.user.name);
    if (!refreshed.access_token || !refreshed.user.id) {
      return { ok: false, refreshed: false, error: 'Could not refresh the session.' };
    }
    writeSession(store, refreshed);
    return { ok: true, refreshed: true, error: '' };
  } catch {
    // Offline: keep the session and try again on the next tick.
    return { ok: false, refreshed: false, error: '' };
  }
}

async function signOutSession(store: Store, storage: Storage): Promise<AuthReply> {
  const session = readSession(store);
  if (session) {
    try {
      await restRequest('/auth/v1/logout', 'POST', {}, session.access_token);
    } catch {
      // Signing out locally must work offline too.
    }
  }
  try {
    await withDatabase(storage, (db) => db.transaction(CLEAR_ALL));
  } catch {
    // The next launch can still clear a damaged cache.
  }
  store.forget('tally.session');
  store.forget('tally.profile');
  store.forget('tally.demo');
  setSyncSnapshot('idle');
  syncError = '';
  lastUploadError = '';
  tokenExpiresIn = 0;
  return { ok: true, error: '', name: '', email: '' };
}

// ── Demo ─────────────────────────────────────────────────────────────

const DEMO_ME: Profile = { id: 'd-user-ali', name: 'Ali', email: 'ali@demo.local' };

async function seedDemo(db: Database, nowMs: number): Promise<void> {
  const existing = await db.query("SELECT count(*) FROM groups WHERE id LIKE 'd-%'");
  if (asNumber(existing.rows[0][0]) > 0) return;
  const at = isoFrom(nowMs);
  const commands: SQLCommand[] = [];
  commands.push(putCommand('users', { id: 'd-user-ali', name: 'Ali', email: 'ali@demo.local', created_at: at }));
  commands.push(putCommand('users', { id: 'd-user-numan', name: 'Numan', email: 'numan@demo.local', created_at: at }));
  commands.push(putCommand('users', { id: 'd-user-shahroz', name: 'Shahroz', email: 'shahroz@demo.local', created_at: at }));
  commands.push(
    putCommand('groups', {
      id: 'd-group-hostel',
      name: 'Hostel',
      code: 'HOSTEL',
      currency: 'PKR',
      created_by_id: 'd-user-ali',
      created_at: at,
    }),
  );
  commands.push(
    putCommand('groups', {
      id: 'd-group-trip',
      name: 'Trip',
      code: 'TRIP01',
      currency: 'USD',
      created_by_id: 'd-user-ali',
      created_at: at,
    }),
  );
  for (const userId of ['d-user-ali', 'd-user-numan', 'd-user-shahroz']) {
    commands.push(
      putCommand('group_members', {
        id: `d-group-hostel:${userId}`,
        group_id: 'd-group-hostel',
        user_id: userId,
        role: userId === 'd-user-ali' ? 'admin' : 'member',
        joined_at: at,
      }),
    );
  }
  for (const userId of ['d-user-ali', 'd-user-numan']) {
    commands.push(
      putCommand('group_members', {
        id: `d-group-trip:${userId}`,
        group_id: 'd-group-trip',
        user_id: userId,
        role: userId === 'd-user-ali' ? 'admin' : 'member',
        joined_at: at,
      }),
    );
  }
  const expenses: ExpenseRecord[] = [
    {
      id: 'd-expense-rent',
      groupId: 'd-group-hostel',
      description: 'Rent',
      amount: 30000,
      currency: 'PKR',
      payerId: 'd-user-ali',
      date: '2026-11-01T12:00:00.000Z',
      category: 'general',
      scope: 'group',
      participants: ['d-user-ali', 'd-user-numan', 'd-user-shahroz'],
      createdById: 'd-user-ali',
      createdAt: '2026-11-01T12:00:00.000Z',
      updatedById: 'd-user-ali',
      remainderTo: 'seeded',
      assignmentId: null,
      spentById: null,
      overLimit: 0,
    },
    {
      id: 'd-expense-groceries',
      groupId: 'd-group-hostel',
      description: 'Groceries',
      amount: 6000,
      currency: 'PKR',
      payerId: 'd-user-numan',
      date: '2026-11-03T12:00:00.000Z',
      category: 'general',
      scope: 'group',
      participants: ['d-user-ali', 'd-user-numan', 'd-user-shahroz'],
      createdById: 'd-user-numan',
      createdAt: '2026-11-03T12:00:00.000Z',
      updatedById: 'd-user-numan',
      remainderTo: 'seeded',
      assignmentId: null,
      spentById: null,
      overLimit: 0,
    },
    {
      id: 'd-expense-cabin',
      groupId: 'd-group-trip',
      description: 'Cabin',
      amount: 10000,
      currency: 'USD',
      payerId: 'd-user-numan',
      date: '2026-11-05T12:00:00.000Z',
      category: 'general',
      scope: 'group',
      participants: ['d-user-ali', 'd-user-numan'],
      createdById: 'd-user-numan',
      createdAt: '2026-11-05T12:00:00.000Z',
      updatedById: 'd-user-numan',
      remainderTo: 'seeded',
      assignmentId: null,
      spentById: null,
      overLimit: 0,
    },
  ];
  for (const expense of expenses) {
    commands.push(
      putCommand('expenses', {
        id: expense.id,
        group_id: expense.groupId,
        description: expense.description,
        amount_cents: expense.amount,
        currency: expense.currency,
        payer_id: expense.payerId,
        date: expense.date,
        category: expense.category,
        scope: expense.scope,
        participants: JSON.stringify(expense.participants),
        created_by_id: expense.createdById,
        created_at: expense.createdAt,
        updated_by_id: expense.updatedById,
        remainder_to: expense.remainderTo,
        assignment_id: null,
        spent_by_id: null,
        over_limit: 0,
      }),
    );
  }
  commands.push(
    putCommand('activities', {
      id: 'd-activity-rent',
      group_id: 'd-group-hostel',
      actor_id: 'd-user-ali',
      type: 'expenseAdded',
      message: 'Added "Rent" · PKR 300',
      created_at: '2026-11-01T12:00:00.000Z',
      target_id: 'd-expense-rent',
    }),
  );
  commands.push(
    putCommand('activities', {
      id: 'd-activity-groceries',
      group_id: 'd-group-hostel',
      actor_id: 'd-user-numan',
      type: 'expenseAdded',
      message: 'Added "Groceries" · PKR 60',
      created_at: '2026-11-03T12:00:00.000Z',
      target_id: 'd-expense-groceries',
    }),
  );
  commands.push(
    putCommand('activities', {
      id: 'd-activity-cabin',
      group_id: 'd-group-trip',
      actor_id: 'd-user-numan',
      type: 'expenseAdded',
      message: 'Added "Cabin" · $100.00',
      created_at: '2026-11-05T12:00:00.000Z',
      target_id: 'd-expense-cabin',
    }),
  );
  await db.transaction(commands);
}

async function startDemo(nowMs: number, store: Store, storage: Storage): Promise<AuthReply> {
  try {
    await withDatabase(storage, (db) => seedDemo(db, nowMs));
    store.set('tally.demo', '1');
    writeProfile(store, DEMO_ME);
    setSyncSnapshot('idle');
    return { ok: true, error: '', name: DEMO_ME.name, email: DEMO_ME.email };
  } catch (error) {
    return { ok: false, error: `Could not open the demo: ${message(error)}`, name: '', email: '' };
  }
}

async function leaveDemo(store: Store, storage: Storage): Promise<AuthReply> {
  try {
    await withDatabase(storage, async (db) => {
      const commands: SQLCommand[] = [
        { sql: "DELETE FROM activities WHERE id LIKE 'd-%'" },
        { sql: "DELETE FROM expenses WHERE id LIKE 'd-%'" },
        { sql: "DELETE FROM settlements WHERE id LIKE 'd-%'" },
        { sql: "DELETE FROM group_members WHERE id LIKE 'd-%'" },
        { sql: "DELETE FROM groups WHERE id LIKE 'd-%'" },
        { sql: "DELETE FROM users WHERE id LIKE 'd-%'" },
        { sql: "DELETE FROM outbox WHERE object_id LIKE 'd-%'" },
        { sql: "DELETE FROM meta WHERE key='demoSeeded'" },
      ];
      await db.transaction(commands);
    });
  } catch {
    // The flag still leaves the demo; a later launch can clean the rows.
  }
  store.forget('tally.demo');
  store.forget('tally.profile');
  setSyncSnapshot('idle');
  return { ok: true, error: '', name: '', email: '' };
}

// ── Local writes ─────────────────────────────────────────────────────

async function createGroup(
  name: string,
  currency: string,
  nowMs: number,
  store: Store,
  storage: Storage,
): Promise<JoinReply> {
  const me = readProfile(store);
  if (!me.id) return { ok: false, error: 'Sign in to create a group.', groupId: '' };
  const demo = demoMode(store);
  const cleanName = name.trim();
  if (!cleanName) return { ok: false, error: 'Give the group a name.', groupId: '' };
  const id = newId(demo);
  const createdAt = isoFrom(nowMs);
  const group = {
    id,
    name: cleanName,
    code: makeCode(),
    currency: currency || 'PKR',
    created_by_id: me.id,
    created_at: createdAt,
  };
  const membership = {
    id: `${id}:${me.id}`,
    group_id: id,
    user_id: me.id,
    role: 'admin',
    joined_at: createdAt,
  };
  try {
    await withDatabase(storage, async (db) => {
      const commands: SQLCommand[] = [
        putCommand('groups', group),
        putCommand('group_members', membership),
      ];
      if (!demo) {
        commands.push(outboxCommand('groups', 'insert', id, group, nowMs));
        commands.push(
          outboxCommand('group_members', 'insert', membership.id, membership, nowMs),
        );
      }
      await db.transaction(commands);
    });
    return { ok: true, error: '', groupId: id };
  } catch (error) {
    return { ok: false, error: message(error), groupId: '' };
  }
}

async function joinGroup(
  code: string,
  store: Store,
  storage: Storage,
): Promise<JoinReply> {
  if (demoMode(store)) {
    return { ok: false, error: 'Leave the demo before joining a real group.', groupId: '' };
  }
  const session = readSession(store);
  if (!session) return { ok: false, error: 'Sign in to join a group.', groupId: '' };
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, error: 'Enter an invite code.', groupId: '' };
  try {
    const reply = await restRequest(
      '/rest/v1/rpc/join_group_by_code',
      'POST',
      { p_code: clean },
      session.access_token,
    );
    if (reply.status >= 300) {
      const detail = serverMessage(reply);
      return {
        ok: false,
        error: detail.includes('Unknown invite code')
          ? "That invite code doesn't match a group."
          : detail,
        groupId: '',
      };
    }
    const groupId =
      typeof reply.data === 'string'
        ? reply.data
        : reply.data && typeof reply.data === 'object' && 'id' in reply.data
          ? asText((reply.data as Record<string, unknown>).id)
          : '';
    if (!groupId) {
      return { ok: false, error: 'The server did not return the group.', groupId: '' };
    }
    return { ok: true, error: '', groupId };
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach the server. ${message(error)}`,
      groupId: '',
    };
  }
}

async function addGroupMember(
  groupId: string,
  email: string,
  name: string,
  nowMs: number,
  store: Store,
  storage: Storage,
): Promise<AuthReply> {
  if (demoMode(store)) {
    return { ok: false, error: 'Member invites need an account.', name: '', email: '' };
  }
  const session = readSession(store);
  if (!session) return { ok: false, error: 'Sign in to add a member.', name: '', email: '' };
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.', name: '', email: '' };
  }
  const params: Record<string, string> = {
    p_group_id: groupId,
    p_email: cleanEmail,
  };
  if (name.trim()) params.p_name = name.trim();
  try {
    await withDatabase(storage, (db) =>
      db.execute(
        'INSERT INTO outbox (table_name,op,object_id,payload,created_at) VALUES (?,?,?,?,?)',
        [
          'rpc',
          'call',
          crypto.randomUUID(),
          JSON.stringify({ rpc: 'add_group_member', params }),
          nowMs,
        ],
      ),
    );
    return { ok: true, error: '', name: name.trim(), email: cleanEmail };
  } catch (error) {
    return { ok: false, error: message(error), name: '', email: '' };
  }
}

async function saveExpense(
  groupId: string,
  editingId: string,
  description: string,
  amountText: string,
  payerId: string,
  participants: string[],
  dateText: string,
  nowMs: number,
  store: Store,
  storage: Storage,
): Promise<SaveReply> {
  const me = readProfile(store);
  if (!me.id) return { ok: false, error: 'Sign in to save an expense.', id: '' };
  const demo = demoMode(store);
  const amount = parseAmount(amountText);
  if (!description.trim()) return { ok: false, error: 'Describe the expense.', id: '' };
  if (amount <= 0) return { ok: false, error: 'Enter an amount above zero.', id: '' };
  const people = [...new Set(participants)];
  if (!people.length) return { ok: false, error: 'Choose at least one person.', id: '' };
  try {
    return await withDatabase(storage, async (db) => {
      const groupResult = await db.query('SELECT currency FROM groups WHERE id=?', [groupId]);
      if (!groupResult.rows.length) {
        return { ok: false, error: 'This group is not on this device yet.', id: '' };
      }
      const membership = await db.query(
        'SELECT role FROM group_members WHERE group_id=? AND user_id=?',
        [groupId, me.id],
      );
      if (!membership.rows.length) {
        return { ok: false, error: 'You are not a member of this group.', id: '' };
      }
      const role = asText(membership.rows[0][0]);
      const currency = asText(groupResult.rows[0][0]) || 'PKR';
      const date = normalizeDate(dateText, nowMs);
      if (editingId) {
        const oldResult = await db.query(
          `${EXPENSE_SELECT} WHERE id=?`,
          [editingId],
        );
        if (!oldResult.rows.length) {
          return { ok: false, error: 'This expense is no longer here.', id: '' };
        }
        const old = expenseRecord(oldResult.rows[0]);
        if (old.groupId !== groupId) {
          return { ok: false, error: 'That expense belongs to another group.', id: '' };
        }
        if (old.createdById !== me.id && role !== 'admin') {
          return { ok: false, error: 'Only an admin can edit this expense.', id: '' };
        }
        const row: Record<string, unknown> = {
          id: old.id,
          group_id: old.groupId,
          description: description.trim(),
          amount_cents: amount,
          currency: old.currency,
          payer_id: payerId || me.id,
          date,
          category: old.category || 'general',
          scope: old.scope || 'group',
          participants: JSON.stringify(people),
          created_by_id: old.createdById,
          created_at: old.createdAt,
          updated_by_id: me.id,
          remainder_to: old.remainderTo || 'seeded',
          assignment_id: old.assignmentId,
          spent_by_id: old.spentById,
          over_limit: old.overLimit,
        };
        const commands: SQLCommand[] = [putCommand('expenses', row)];
        if (!demo) commands.push(outboxCommand('expenses', 'update', old.id, row, nowMs));
        await db.transaction(commands);
        return { ok: true, error: '', id: old.id };
      }
      const id = newId(demo);
      const row: Record<string, unknown> = {
        id,
        group_id: groupId,
        description: description.trim(),
        amount_cents: amount,
        currency,
        payer_id: payerId || me.id,
        date,
        category: 'general',
        scope: 'group',
        participants: JSON.stringify(people),
        created_by_id: me.id,
        created_at: isoFrom(nowMs),
        updated_by_id: me.id,
        remainder_to: 'seeded',
        assignment_id: null,
        spent_by_id: null,
        over_limit: 0,
      };
      const commands: SQLCommand[] = [putCommand('expenses', row)];
      if (!demo) commands.push(outboxCommand('expenses', 'insert', id, row, nowMs));
      await db.transaction(commands);
      return { ok: true, error: '', id };
    });
  } catch (error) {
    return { ok: false, error: message(error), id: '' };
  }
}

async function deleteExpense(
  groupId: string,
  expenseId: string,
  nowMs: number,
  store: Store,
  storage: Storage,
): Promise<SaveReply> {
  const me = readProfile(store);
  if (!me.id) return { ok: false, error: 'Sign in to delete an expense.', id: '' };
  const demo = demoMode(store);
  try {
    return await withDatabase(storage, async (db) => {
      const found = await db.query(`${EXPENSE_SELECT} WHERE id=?`, [expenseId]);
      if (!found.rows.length) {
        return { ok: false, error: 'This expense is already gone.', id: '' };
      }
      const expense = expenseRecord(found.rows[0]);
      if (expense.groupId !== groupId) {
        return { ok: false, error: 'That expense belongs to another group.', id: '' };
      }
      const membership = await db.query(
        'SELECT role FROM group_members WHERE group_id=? AND user_id=?',
        [groupId, me.id],
      );
      const role = membership.rows.length ? asText(membership.rows[0][0]) : '';
      if (expense.createdById !== me.id && role !== 'admin') {
        return { ok: false, error: 'Only an admin can delete this expense.', id: '' };
      }
      const commands: SQLCommand[] = [
        { sql: 'DELETE FROM expenses WHERE id=?', params: [expenseId] },
      ];
      if (!demo) {
        commands.push(outboxCommand('expenses', 'delete', expenseId, null, nowMs));
      }
      await db.transaction(commands);
      return { ok: true, error: '', id: expenseId };
    });
  } catch (error) {
    return { ok: false, error: message(error), id: '' };
  }
}

async function recordSettlement(
  groupId: string,
  fromId: string,
  toId: string,
  amount: number,
  nowMs: number,
  store: Store,
  storage: Storage,
): Promise<SaveReply> {
  const me = readProfile(store);
  if (!me.id) return { ok: false, error: 'Sign in to record a payment.', id: '' };
  if (!fromId || !toId || fromId === toId) {
    return { ok: false, error: 'Choose two different people.', id: '' };
  }
  if (amount <= 0) return { ok: false, error: 'The payment must be above zero.', id: '' };
  const demo = demoMode(store);
  try {
    return await withDatabase(storage, async (db) => {
      const members = await db.query(
        'SELECT user_id, role FROM group_members WHERE group_id=?',
        [groupId],
      );
      if (!members.rows.length) {
        return { ok: false, error: 'This group is not on this device yet.', id: '' };
      }
      const ids = members.rows.map((row) => asText(row[0]));
      if (!ids.includes(me.id)) {
        return { ok: false, error: 'You are not a member of this group.', id: '' };
      }
      if (!ids.includes(fromId) || !ids.includes(toId)) {
        return { ok: false, error: 'Both people must belong to the group.', id: '' };
      }
      const id = newId(demo);
      const at = isoFrom(nowMs);
      const row = {
        id,
        group_id: groupId,
        from_id: fromId,
        to_id: toId,
        amount_cents: amount,
        date: at,
        note: null,
        created_at: at,
        scope: 'group',
        method: null,
        created_by_id: me.id,
        pot_id: null,
      };
      const commands: SQLCommand[] = [putCommand('settlements', row)];
      if (!demo) commands.push(outboxCommand('settlements', 'insert', id, row, nowMs));
      await db.transaction(commands);
      return { ok: true, error: '', id };
    });
  } catch (error) {
    return { ok: false, error: message(error), id: '' };
  }
}

// ── PowerSync stream ─────────────────────────────────────────────────

let syncState = 'idle';
let syncError = '';
let lastUploadError = '';
let tokenExpiresIn = 0;
let syncGeneration = 0;
let syncLines = 0;
let syncBuffer: string[] = [];
let syncSnapshot: SyncFeed = { state: 'idle', lines: 0, expiresIn: 0 };

function setSyncSnapshot(state: string, lines?: number, expiresIn?: number): void {
  syncState = state;
  syncSnapshot = {
    state,
    lines: lines === undefined ? syncSnapshot.lines : lines,
    expiresIn: expiresIn === undefined ? syncSnapshot.expiresIn : expiresIn,
  };
}

function snapshot(): SyncFeed {
  return syncSnapshot;
}

function resetCommands(): SQLCommand[] {
  return [
    { sql: 'DELETE FROM groups' },
    { sql: 'DELETE FROM group_members' },
    { sql: 'DELETE FROM expenses' },
    { sql: 'DELETE FROM settlements' },
    { sql: 'DELETE FROM activities' },
    { sql: 'DELETE FROM unit_members' },
    { sql: 'DELETE FROM settlement_units' },
  ];
}

type ApplyContext = { completed: boolean };

function applyLine(line: string, commands: SQLCommand[], context: ApplyContext): void {
  let parsed: Record<string, unknown> | null = null;
  try {
    const value: unknown = JSON.parse(line);
    if (value && typeof value === 'object') parsed = value as Record<string, unknown>;
  } catch {
    return;
  }
  if (!parsed) return;
  if (parsed.checkpoint) {
    commands.push(...resetCommands());
    return;
  }
  if (parsed.checkpoint_complete) {
    context.completed = true;
    return;
  }
  if (parsed.token_expires_in !== undefined) {
    tokenExpiresIn = asNumber(parsed.token_expires_in);
    return;
  }
  const body = parsed.data;
  if (!body || typeof body !== 'object') return;
  const ops = (body as Record<string, unknown>).data;
  if (!Array.isArray(ops)) return;
  for (const raw of ops) {
    if (!raw || typeof raw !== 'object') continue;
    const op = raw as Record<string, unknown>;
    const kind = asText(op.op);
    const table = asText(op.object_type);
    const objectId = asText(op.object_id);
    if (!TABLE_COLUMNS[table] || !objectId) continue;
    if (kind === 'PUT' || kind === 'PATCH') {
      let row: Record<string, unknown> | null = null;
      const data = op.data;
      if (data && typeof data === 'object') {
        row = data as Record<string, unknown>;
      } else if (typeof data === 'string') {
        try {
          const value: unknown = JSON.parse(data);
          if (value && typeof value === 'object') row = value as Record<string, unknown>;
        } catch {
          row = null;
        }
      }
      if (!row) continue;
      if (!row.id) row.id = objectId;
      commands.push(kind === 'PUT' ? putCommand(table, row) : patchCommand(table, row));
    } else if (kind === 'REMOVE') {
      if (table === 'groups') {
        commands.push(...groupDeleteCommands(objectId));
      } else if (table === 'settlement_units') {
        commands.push({ sql: 'DELETE FROM unit_members WHERE unit_id=?', params: [objectId] });
        commands.push({ sql: 'DELETE FROM settlement_units WHERE id=?', params: [objectId] });
      } else {
        commands.push({ sql: `DELETE FROM ${table} WHERE id=?`, params: [objectId] });
      }
    }
  }
}

async function outboxCommands(db: Database): Promise<SQLCommand[]> {
  const result = await db.query(
    'SELECT table_name, op, object_id, payload FROM outbox ORDER BY seq',
  );
  const commands: SQLCommand[] = [];
  for (const row of result.rows) {
    const table = asText(row[0]);
    const op = asText(row[1]);
    const objectId = asText(row[2]);
    const payload = asText(row[3]);
    if (table === 'rpc' || !TABLE_COLUMNS[table]) continue;
    if (op === 'delete') {
      if (table === 'groups') commands.push(...groupDeleteCommands(objectId));
      else commands.push({ sql: `DELETE FROM ${table} WHERE id=?`, params: [objectId] });
      continue;
    }
    let data: Record<string, unknown> | null = null;
    try {
      const value: unknown = JSON.parse(payload);
      if (value && typeof value === 'object') data = value as Record<string, unknown>;
    } catch {
      data = null;
    }
    if (!data) continue;
    if (!data.id) data.id = objectId;
    commands.push(putCommand(table, data));
  }
  return commands;
}

async function drainSync(nowMs: number, storage: Storage): Promise<SyncReply> {
  const lines = syncBuffer.slice();
  if (!lines.length) {
    return {
      applied: 0,
      uploaded: 0,
      pending: await countOutbox(storage),
      state: syncState,
      error: syncError,
    };
  }
  try {
    const result = await serial(async () => {
      const db = await openDatabase(storage);
      try {
        const commands: SQLCommand[] = [];
        const context: ApplyContext = { completed: false };
        for (const line of lines) applyLine(line, commands, context);
        commands.push(...(await outboxCommands(db)));
        if (context.completed) {
          commands.push({
            sql: "INSERT OR REPLACE INTO meta (key,value) VALUES ('lastSynced',?)",
            params: [isoFrom(nowMs)],
          });
        }
        if (commands.length) await db.transaction(commands);
        return await countOutboxDb(db);
      } finally {
        await db.close();
      }
    });
    syncBuffer.splice(0, lines.length);
    return {
      applied: lines.length,
      uploaded: 0,
      pending: result,
      state: syncState,
      error: syncError,
    };
  } catch (error) {
    syncError = message(error);
    syncState = 'error';
    return {
      applied: 0,
      uploaded: 0,
      pending: 0,
      state: 'error',
      error: syncError,
    };
  }
}

function syncStream(store: Store): SyncFeed | Promise<SyncFeed> {
  if (demoMode(store)) {
    setSyncSnapshot('idle');
    return snapshot();
  }
  const session = readSession(store);
  if (!session) {
    setSyncSnapshot('idle');
    return snapshot();
  }
  const generation = ++syncGeneration;
  const decoder = new TextDecoder('utf-8');
  let carry = '';
  let lineCount = 0;
  syncLines = 0;
  syncError = '';
  setSyncSnapshot('syncing');
  return fetch(`${POWERSYNC_URL}/sync/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${session.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify({
      buckets: [],
      include_checksum: true,
      raw_data: true,
      binary_data: false,
      client_id: clientId(store),
      parameters: {},
      streams: { include_defaults: true, subscriptions: [] },
    }),
    exactStream(event) {
      if (generation !== syncGeneration) return snapshot();
      if (event.type === 'error') {
        if (event.kind === 'Aborted') {
          setSyncSnapshot('idle');
        } else if (event.status === 401) {
          syncError = 'Sign in again to sync.';
          setSyncSnapshot('auth');
        } else {
          syncError = '';
          setSyncSnapshot('offline');
        }
        return snapshot();
      }
      if (event.type !== 'message') return snapshot();
      const text =
        typeof event.data === 'string'
          ? event.data
          : decoder.decode(new Uint8Array(event.data), { stream: true });
      carry += text;
      let index = carry.indexOf('\n');
      while (index >= 0) {
        const line = carry.slice(0, index).trim();
        carry = carry.slice(index + 1);
        if (line) {
          syncBuffer.push(line);
          lineCount++;
          syncLines = lineCount;
          let parsed: Record<string, unknown> | null = null;
          try {
            const value: unknown = JSON.parse(line);
            if (value && typeof value === 'object') parsed = value as Record<string, unknown>;
          } catch {
            parsed = null;
          }
          if (parsed) {
            if (parsed.checkpoint) setSyncSnapshot('syncing');
            if (parsed.checkpoint_complete) setSyncSnapshot('live', lineCount);
            if (parsed.token_expires_in !== undefined) {
              tokenExpiresIn = asNumber(parsed.token_expires_in);
              setSyncSnapshot(syncState, undefined, tokenExpiresIn);
            }
          }
        }
        index = carry.indexOf('\n');
      }
      return snapshot();
    },
  });
}

// ── Uploads ──────────────────────────────────────────────────────────

type UploadResult = {
  ok: boolean;
  auth: boolean;
  offline: boolean;
  error: string;
};

async function uploadRow(
  session: Session,
  table: string,
  op: string,
  objectId: string,
  payload: string,
): Promise<UploadResult> {
  try {
    if (table === 'rpc') {
      let call: Record<string, unknown> = {};
      try {
        const value: unknown = JSON.parse(payload);
        if (value && typeof value === 'object') call = value as Record<string, unknown>;
      } catch {
        return { ok: false, auth: false, offline: false, error: 'The queued request is damaged.' };
      }
      const reply = await restRequest(
        `/rest/v1/rpc/${asText(call.rpc)}`,
        'POST',
        call.params || {},
        session.access_token,
      );
      if (reply.status < 300) return { ok: true, auth: false, offline: false, error: '' };
      return classifyUpload(reply);
    }
    if (op === 'delete') {
      const reply = await restRequest(
        `/rest/v1/${table}?id=eq.${encodeURIComponent(objectId)}`,
        'DELETE',
        null,
        session.access_token,
      );
      if (reply.status < 300 || reply.status === 404) {
        return { ok: true, auth: false, offline: false, error: '' };
      }
      return classifyUpload(reply);
    }
    let body: unknown = null;
    try {
      body = JSON.parse(payload);
    } catch {
      return { ok: false, auth: false, offline: false, error: 'The queued change is damaged.' };
    }
    const update = op === 'update';
    const path = update
      ? `/rest/v1/${table}?id=eq.${encodeURIComponent(objectId)}`
      : `/rest/v1/${table}`;
    const reply = await restRequest(path, update ? 'PATCH' : 'POST', body, session.access_token);
    if (reply.status < 300) return { ok: true, auth: false, offline: false, error: '' };
    if (reply.status === 409 && reply.data && typeof reply.data === 'object') {
      const code = asText((reply.data as Record<string, unknown>).code);
      if (code === '23505') return { ok: true, auth: false, offline: false, error: '' };
    }
    return classifyUpload(reply);
  } catch (error) {
    return { ok: false, auth: false, offline: true, error: message(error) };
  }
}

function classifyUpload(reply: RestReply): UploadResult {
  if (reply.status === 401) {
    return { ok: false, auth: true, offline: false, error: 'Sign in again to sync.' };
  }
  if (reply.status === 429 || reply.status >= 500) {
    return { ok: false, auth: false, offline: true, error: serverMessage(reply) };
  }
  return { ok: false, auth: false, offline: false, error: serverMessage(reply) };
}

async function uploadPending(nowMs: number, store: Store, storage: Storage): Promise<SyncReply> {
  if (demoMode(store)) {
    return { applied: 0, uploaded: 0, pending: 0, state: 'demo', error: '' };
  }
  const session = readSession(store);
  if (!session) {
    return {
      applied: 0,
      uploaded: 0,
      pending: await countOutbox(storage),
      state: 'auth',
      error: 'Sign in again to sync.',
    };
  }
  let rows: SQLValue[][] = [];
  try {
    const result = await withDatabase(storage, (db) =>
      db.query(
        "SELECT seq, table_name, op, object_id, payload FROM outbox WHERE error='' ORDER BY seq LIMIT 40",
      ),
    );
    rows = result.rows;
  } catch (error) {
    return {
      applied: 0,
      uploaded: 0,
      pending: 0,
      state: 'error',
      error: message(error),
    };
  }
  let uploaded = 0;
  for (const row of rows) {
    const seq = asNumber(row[0]);
    const table = asText(row[1]);
    const op = asText(row[2]);
    const objectId = asText(row[3]);
    const payload = asText(row[4]);
    const result = await uploadRow(session, table, op, objectId, payload);
    if (result.ok) {
      uploaded++;
      lastUploadError = '';
      try {
        await withDatabase(storage, (db) =>
          db.execute('DELETE FROM outbox WHERE seq=?', [seq]),
        );
      } catch {
        // The change is on the server; a duplicate retry is harmless.
      }
      continue;
    }
    if (result.auth) {
      return {
        applied: 0,
        uploaded,
        pending: await countOutbox(storage),
        state: 'auth',
        error: result.error,
      };
    }
    if (result.offline) {
      return {
        applied: 0,
        uploaded,
        pending: await countOutbox(storage),
        state: 'offline',
        error: '',
      };
    }
    lastUploadError = result.error;
    try {
      await withDatabase(storage, (db) =>
        db.execute('UPDATE outbox SET attempts=attempts+1, error=? WHERE seq=?', [
          result.error,
          seq,
        ]),
      );
    } catch {
      // Leave the row queued if the error could not be recorded.
    }
    return {
      applied: 0,
      uploaded,
      pending: await countOutbox(storage),
      state: 'error',
      error: result.error,
    };
  }
  return {
    applied: 0,
    uploaded,
    pending: await countOutbox(storage),
    state: syncState === 'live' ? 'live' : 'syncing',
    error: lastUploadError,
  };
}

async function discardFailed(storage: Storage): Promise<SaveReply> {
  try {
    await withDatabase(storage, async (db) => {
      const failed = await db.query(
        "SELECT seq, table_name, op, object_id FROM outbox WHERE error <> ''",
      );
      const commands: SQLCommand[] = [];
      for (const row of failed.rows) {
        const seq = asNumber(row[0]);
        const table = asText(row[1]);
        const op = asText(row[2]);
        const objectId = asText(row[3]);
        commands.push({ sql: 'DELETE FROM outbox WHERE seq=?', params: [seq] });
        if (op === 'insert' && table !== 'rpc' && TABLE_COLUMNS[table]) {
          if (table === 'groups') commands.push(...groupDeleteCommands(objectId));
          else commands.push({ sql: `DELETE FROM ${table} WHERE id=?`, params: [objectId] });
        }
      }
      if (commands.length) await db.transaction(commands);
    });
    return { ok: true, error: '', id: '' };
  } catch (error) {
    return { ok: false, error: message(error), id: '' };
  }
}

// ── Sources ──────────────────────────────────────────────────────────

async function bootstrap(store: Store, storage: Storage): Promise<Bootstrap> {
  const demo = demoMode(store);
  const profile = readProfile(store);
  const session = readSession(store);
  const pending = demo ? 0 : await countOutbox(storage);
  if (demo) {
    return {
      signedIn: false,
      demo: true,
      userId: profile.id || DEMO_ME.id,
      name: profile.name || DEMO_ME.name,
      email: profile.email || DEMO_ME.email,
      pending: 0,
      mode: 'demo',
      message: '',
    };
  }
  if (!session) {
    return {
      signedIn: false,
      demo: false,
      userId: '',
      name: '',
      email: '',
      pending,
      mode: 'local',
      message: '',
    };
  }
  return {
    signedIn: true,
    demo: false,
    userId: session.user.id,
    name: profile.name || session.user.name,
    email: profile.email || session.user.email,
    pending,
    mode: 'cloud',
    message: '',
  };
}

async function syncStatus(store: Store, storage: Storage): Promise<SyncStatus> {
  const demo = demoMode(store);
  const session = readSession(store);
  let pending = 0;
  let failed = 0;
  let lastSynced = '';
  try {
    const result = await withDatabase(storage, async (db) => {
      const pendingResult = await db.query('SELECT count(*) FROM outbox');
      const failedResult = await db.query("SELECT count(*) FROM outbox WHERE error <> ''");
      const lastResult = await db.query("SELECT value FROM meta WHERE key='lastSynced'");
      return {
        pending: asNumber(pendingResult.rows[0][0]),
        failed: asNumber(failedResult.rows[0][0]),
        last: lastResult.rows.length ? asText(lastResult.rows[0][0]) : '',
      };
    });
    pending = result.pending;
    failed = result.failed;
    lastSynced = formatStamp(result.last);
  } catch {
    // A damaged cache still shows the last state the app knows.
  }
  const state = demo ? 'demo' : !session ? 'idle' : syncState;
  return {
    state,
    pending: demo ? 0 : pending,
    failed: demo ? 0 : failed,
    error: demo ? '' : syncError || lastUploadError,
    lastSynced,
    expiresIn: tokenExpiresIn,
    demo,
  };
}

const sources: Sources = {
  bootstrap: (_args, store, storage) => bootstrap(store, storage),
  syncStatus: (_args, store, storage) => syncStatus(store, storage),
  syncStream: (_args, store) => syncStream(store),
  groupList: async (_args, store, storage) => {
    const me = readProfile(store);
    if (!me.id) return [];
    try {
      return await withDatabase(storage, (db) => loadGroupList(db, me));
    } catch {
      return [];
    }
  },
  groupView: async ([groupId], store, storage) => {
    const me = readProfile(store);
    if (!me.id) return emptyGroupView();
    try {
      return await withDatabase(storage, (db) => loadGroupView(db, groupId, me));
    } catch {
      return emptyGroupView();
    }
  },
  authenticate: ([mode, email, password, name, nowMs], store, storage) =>
    authenticate(mode, email, password, name, nowMs, store, storage),
  startDemo: ([nowMs], store, storage) => startDemo(nowMs, store, storage),
  leaveDemo: (_args, store, storage) => leaveDemo(store, storage),
  signOutSession: (_args, store, storage) => signOutSession(store, storage),
  ensureSession: ([nowMs], store) => ensureSession(nowMs, store),
  createGroup: ([name, currency, nowMs], store, storage) =>
    createGroup(name, currency, nowMs, store, storage),
  joinGroup: ([code], store, storage) => joinGroup(code, store, storage),
  addGroupMember: ([groupId, email, name, nowMs], store, storage) =>
    addGroupMember(groupId, email, name, nowMs, store, storage),
  saveExpense: (
    [groupId, editingId, description, amountText, payerId, participants, dateText, nowMs],
    store,
    storage,
  ) =>
    saveExpense(
      groupId,
      editingId,
      description,
      amountText,
      payerId,
      participants,
      dateText,
      nowMs,
      store,
      storage,
    ),
  deleteExpense: ([groupId, expenseId, nowMs], store, storage) =>
    deleteExpense(groupId, expenseId, nowMs, store, storage),
  recordSettlement: ([groupId, fromId, toId, amount, nowMs], store, storage) =>
    recordSettlement(groupId, fromId, toId, amount, nowMs, store, storage),
  drainSync: ([nowMs], _store, storage) => drainSync(nowMs, storage),
  uploadPending: ([nowMs], store, storage) => uploadPending(nowMs, store, storage),
  discardFailed: (_args, _store, storage) => discardFailed(storage),
};

export const answer: Answer = (source, args, store, storage, native) =>
  sources[source](args, store, storage, native);
