const COUNT_KEY = "concerned:count";
const RATE_LIMIT_PREFIX = "concerned:rl:";
const WINDOW_SECONDS = 24 * 60 * 60;
const DAILY_LIMIT = 3;
const MIN_GAP_SECONDS = 6 * 60 * 60;

function json(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}

function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "local";
}

function getRateLimitKey(ip) {
  return `${RATE_LIMIT_PREFIX}${ip}`;
}

function isAdminIp(env, ip) {
  const raw = env && typeof env.CONCERNED_ADMIN_IPS === "string" ? env.CONCERNED_ADMIN_IPS : "";
  const allowlist = raw.split(",").map((value) => value.trim()).filter(Boolean);
  return allowlist.includes(ip);
}

function parseCount(value) {
  const count = Number.parseInt(value || "0", 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

async function getCount(store) {
  return parseCount(await store.get(COUNT_KEY));
}

async function getRecord(store, ip) {
  const raw = await store.get(getRateLimitKey(ip));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      Number.isFinite(parsed.count) &&
      Number.isFinite(parsed.firstAt) &&
      Number.isFinite(parsed.lastAt)
    ) {
      return parsed;
    }
  } catch {
    // Stale or malformed value; treat as missing so the next write replaces it.
  }

  return null;
}

function evaluateGate(record, now) {
  if (!record) {
    return { canIncrement: true, reason: null, retryAfterSeconds: 0 };
  }

  if (record.count >= DAILY_LIMIT) {
    const resetAt = record.firstAt + WINDOW_SECONDS * 1000;
    return {
      canIncrement: false,
      reason: "daily_limit",
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  const elapsedSeconds = Math.floor((now - record.lastAt) / 1000);
  if (elapsedSeconds < MIN_GAP_SECONDS) {
    return {
      canIncrement: false,
      reason: "cooldown",
      retryAfterSeconds: Math.max(1, MIN_GAP_SECONDS - elapsedSeconds),
    };
  }

  return { canIncrement: true, reason: null, retryAfterSeconds: 0 };
}

function isSameOriginPost(request) {
  const origin = request.headers.get("Origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function buildState({ count, admin, gate, remaining }) {
  return {
    count,
    admin,
    canIncrement: gate.canIncrement,
    reason: gate.reason,
    retryAfterSeconds: gate.retryAfterSeconds,
    registrationsRemaining: remaining,
    dailyLimit: DAILY_LIMIT,
  };
}

async function handleGet(env, request) {
  const store = env.CONCERNED_COUNTER;

  if (!store) {
    return json({ error: "Counter storage is not configured." }, { status: 500 });
  }

  const ip = getClientIp(request);
  const admin = isAdminIp(env, ip);
  const now = Date.now();

  const [count, record] = await Promise.all([
    getCount(store),
    admin ? Promise.resolve(null) : getRecord(store, ip),
  ]);

  const gate = admin
    ? { canIncrement: true, reason: null, retryAfterSeconds: 0 }
    : evaluateGate(record, now);

  const remaining = admin
    ? DAILY_LIMIT
    : Math.max(0, DAILY_LIMIT - (record?.count ?? 0));

  return json(buildState({ count, admin, gate, remaining }));
}

async function handlePost(env, request) {
  const store = env.CONCERNED_COUNTER;

  if (!store) {
    return json({ error: "Counter storage is not configured." }, { status: 500 });
  }

  if (!isSameOriginPost(request)) {
    return json({ error: "This request is not allowed." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const admin = isAdminIp(env, ip);
  const now = Date.now();

  if (admin) {
    const count = await getCount(store);
    const nextCount = count + 1;
    await store.put(COUNT_KEY, String(nextCount));

    return json(buildState({
      count: nextCount,
      admin: true,
      gate: { canIncrement: true, reason: null, retryAfterSeconds: 0 },
      remaining: DAILY_LIMIT,
    }));
  }

  const record = await getRecord(store, ip);
  const gate = evaluateGate(record, now);

  if (!gate.canIncrement) {
    return json(buildState({
      count: await getCount(store),
      admin: false,
      gate,
      remaining: Math.max(0, DAILY_LIMIT - (record?.count ?? 0)),
    }), {
      status: 429,
      headers: {
        "Retry-After": String(gate.retryAfterSeconds),
      },
    });
  }

  const nextRecord = record
    ? { count: record.count + 1, firstAt: record.firstAt, lastAt: now }
    : { count: 1, firstAt: now, lastAt: now };

  const windowEndMs = nextRecord.firstAt + WINDOW_SECONDS * 1000;
  const ttl = Math.max(60, Math.ceil((windowEndMs - now) / 1000));

  const count = await getCount(store);
  const nextCount = count + 1;

  await store.put(getRateLimitKey(ip), JSON.stringify(nextRecord), {
    expirationTtl: ttl,
  });
  await store.put(COUNT_KEY, String(nextCount));

  const reachedLimit = nextRecord.count >= DAILY_LIMIT;
  const remaining = Math.max(0, DAILY_LIMIT - nextRecord.count);
  const retryAfterSeconds = reachedLimit
    ? Math.max(1, Math.ceil((windowEndMs - now) / 1000))
    : MIN_GAP_SECONDS;

  return json(buildState({
    count: nextCount,
    admin: false,
    gate: {
      canIncrement: false,
      reason: reachedLimit ? "daily_limit" : "cooldown",
      retryAfterSeconds,
    },
    remaining,
  }));
}

export function onRequest({ env, request }) {
  if (request.method === "GET") {
    return handleGet(env, request);
  }

  if (request.method === "POST") {
    return handlePost(env, request);
  }

  return json({ error: "Method not allowed." }, {
    status: 405,
    headers: {
      Allow: "GET, POST",
    },
  });
}
