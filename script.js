const searchInput = document.querySelector("#faq-search");
const clearButton = document.querySelector("#clear-search");
const expandAllButton = document.querySelector("#expand-all");
const collapseAllButton = document.querySelector("#collapse-all");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const faqItems = Array.from(document.querySelectorAll(".faq-item"));
const categories = Array.from(document.querySelectorAll(".category"));

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
