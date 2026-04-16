const cards = [...document.querySelectorAll(".showcase-card")];

function setActiveCard(nextCard) {
  cards.forEach((card) => {
    const isActive = card === nextCard;
    card.classList.toggle("active", isActive);
    card.setAttribute("aria-expanded", String(isActive));
  });
}

cards.forEach((card) => {
  card.addEventListener("click", () => {
    const isActive = card.classList.contains("active");
    setActiveCard(isActive ? null : card);
  });
});
