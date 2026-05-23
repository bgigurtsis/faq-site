const searchInput = document.querySelector("#faq-search");
const clearButton = document.querySelector("#clear-search");
const expandAllButton = document.querySelector("#expand-all");
const collapseAllButton = document.querySelector("#collapse-all");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const concernedCount = document.querySelector("#concerned-count");
const concernedButton = document.querySelector("#concerned-button");
const concernedStatus = document.querySelector("#concerned-status");
const concernedAdmin = document.querySelector("#concerned-admin");
const faqItems = Array.from(document.querySelectorAll(".faq-item"));
const categories = Array.from(document.querySelectorAll(".category"));
const concernedCounterUrl = "/api/concerned-counter";
const concernedRequestTimeoutMs = 8000;
const concernedDailyLimitFallback = 3;
const concernedRegisterLabel = "Register a concerned chatter";
const concernedRegisteredLabel = "Chatter registered";
const countFormatter = new Intl.NumberFormat("en-US");

function normalize(value) {
  return value.trim().toLowerCase();
}

function getSearchText(item) {
  return normalize(item.textContent || "");
}

function updateResults() {
  const query = normalize(searchInput.value);
  let visibleCount = 0;

  faqItems.forEach((item) => {
    const isMatch = query.length === 0 || getSearchText(item).includes(query);
    item.hidden = !isMatch;

    if (isMatch) {
      visibleCount += 1;
      item.open = query.length > 0;
    }
  });

  categories.forEach((category) => {
    const hasVisibleItems = Array.from(category.querySelectorAll(".faq-item"))
      .some((item) => !item.hidden);
    category.hidden = !hasVisibleItems;
  });

  emptyState.hidden = visibleCount !== 0;
  resultCount.textContent = query.length === 0
    ? "Showing all questions"
    : `Showing ${visibleCount} matching question${visibleCount === 1 ? "" : "s"}`;
}

function formatCount(value) {
  const count = Number(value);
  return countFormatter.format(Number.isFinite(count) && count > 0 ? count : 0);
}

function setConcernedStatus(message) {
  concernedStatus.textContent = message || "";
}

function setAdminIndicator(isAdmin) {
  if (concernedAdmin) {
    concernedAdmin.hidden = !isAdmin;
  }
}

function hasConcernedCounter() {
  return concernedCount && concernedButton && concernedStatus;
}

function formatRetryHours(retryAfterSeconds) {
  const seconds = Number(retryAfterSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "1h";
  }
  const hours = Math.max(1, Math.round(seconds / 3600));
  return `${hours}h`;
}

function buildConcernedStatus(data, justRegistered) {
  if (data.admin) {
    return justRegistered ? "Chatter registered." : "";
  }

  const dailyLimit = Number.isFinite(data.dailyLimit) ? data.dailyLimit : concernedDailyLimitFallback;
  const remaining = Number.isFinite(data.registrationsRemaining)
    ? data.registrationsRemaining
    : dailyLimit;
  const used = Math.max(0, dailyLimit - remaining);

  if (data.canIncrement) {
    if (justRegistered) {
      return "Chatter registered.";
    }
    return used > 0 ? `${used} of ${dailyLimit} registrations used today.` : "";
  }

  const tail = data.reason === "daily_limit"
    ? "Daily limit reached - try again tomorrow."
    : `You can register another in about ${formatRetryHours(data.retryAfterSeconds)}.`;

  return justRegistered ? `Chatter registered. ${tail}` : tail;
}

function renderConcernedCounter(data, justRegistered = false) {
  const canIncrement = data.canIncrement !== false;
  const enabled = canIncrement || data.admin === true;

  concernedCount.textContent = formatCount(data.count);
  concernedButton.disabled = !enabled;
  concernedButton.textContent = enabled ? concernedRegisterLabel : concernedRegisteredLabel;
  setAdminIndicator(data.admin === true);
  setConcernedStatus(buildConcernedStatus(data, justRegistered));
}

async function fetchConcernedCounter(method) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, concernedRequestTimeoutMs);

  try {
    const response = await fetch(concernedCounterUrl, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      signal: controller.signal,
    });
    const data = await response.json();

    if (!response.ok && response.status !== 429) {
      throw new Error(data.error || "Counter request failed.");
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadConcernedCounter() {
  if (!hasConcernedCounter()) {
    return;
  }

  concernedButton.disabled = true;

  try {
    renderConcernedCounter(await fetchConcernedCounter("GET"));
  } catch {
    concernedCount.textContent = "Unavailable";
    concernedButton.disabled = true;
    concernedButton.textContent = concernedRegisterLabel;
    setAdminIndicator(false);
    setConcernedStatus("Counter unavailable in this preview.");
  }
}

searchInput.addEventListener("input", updateResults);

clearButton.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  updateResults();
});

expandAllButton.addEventListener("click", () => {
  faqItems
    .filter((item) => !item.hidden)
    .forEach((item) => {
      item.open = true;
    });
});

collapseAllButton.addEventListener("click", () => {
  faqItems.forEach((item) => {
    item.open = false;
  });
});

if (hasConcernedCounter()) {
  concernedButton.addEventListener("click", async () => {
    concernedButton.disabled = true;
    concernedButton.textContent = "Registering...";
    setConcernedStatus("");

    try {
      renderConcernedCounter(await fetchConcernedCounter("POST"), true);
    } catch {
      concernedButton.disabled = false;
      concernedButton.textContent = concernedRegisterLabel;
      setConcernedStatus("Couldn't register the chatter. Try again.");
    }
  });

  loadConcernedCounter();
}
