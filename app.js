/* ==========================================================================
   Pokédex app
   Stage 2: capture the search, fetch from PokéAPI, render the card,
   handle errors and the loading state.
   Stage 3: type palette, animated sprite, skyline stats, ability tooltips.
   ========================================================================== */

const API_BASE = "https://pokeapi.co/api/v2";

// Highest base stat any Pokémon has. Used for the meter's aria-valuemax.
const MAX_BASE_STAT = 255;

// Bars are scaled to 180 instead of 255 so a typical Pokémon fills the space.
// Anything above 180 is capped at a full bar.
const STAT_BAR_SCALE = 180;

const STAT_LABELS = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

// One color per type. The card sets its --type variable from this and the CSS
// mixes every other shade (glow, badge, bars) from that single value.
const TYPE_COLORS = {
  normal: "#a8a878",
  fire: "#f08030",
  water: "#6890f0",
  electric: "#f8d030",
  grass: "#78c850",
  ice: "#98d8d8",
  fighting: "#c03028",
  poison: "#a040a0",
  ground: "#e0c068",
  flying: "#a890f0",
  psychic: "#f85888",
  bug: "#a8b820",
  rock: "#b8a038",
  ghost: "#705898",
  dragon: "#7038f8",
  dark: "#705848",
  steel: "#b8b8d0",
  fairy: "#ee99ac",
};

/* --- DOM references (queried once, reused everywhere) -------------------- */

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const displayEl = document.getElementById("pokemon-display");

// A copy of the empty state from the HTML, so we can put it back after an error.
const emptyStateTemplate = displayEl.firstElementChild.cloneNode(true);

/* --- Application state ---------------------------------------------------- */

// The Pokémon currently on screen. Later stages (Previous / Next, Compare) read this.
let currentPokemon = null;

// Ability descriptions already fetched, keyed by ability URL. Hovering the same
// ability twice should not hit the API twice.
const abilityCache = new Map();

/* --- Small helpers -------------------------------------------------------- */

function cleanQuery(rawValue) {
  return rawValue.trim().toLowerCase();
}

// PokéAPI names are lowercase letters, digits, and hyphens (mr-mime, ho-oh, 25).
function isValidQuery(query) {
  return /^[a-z0-9-]+$/.test(query);
}

function formatName(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatId(id) {
  return "#" + String(id).padStart(4, "0");
}

// Flavor text comes with line-break and form-feed characters from the games.
function cleanFlavorText(text) {
  return text.replace(/[\n\f\r]+/g, " ").replace(/\s+/g, " ").replace(/POKéMON/g, "Pokémon").trim();
}

// Creates an element, optionally with a class and text, in one call.
function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/* --- API functions -------------------------------------------------------- */

async function fetchJson(url) {
  const response = await fetch(url);

  // fetch() only rejects on network failure. A 404 is a "successful" response,
  // so we have to check it ourselves and turn it into an error.
  if (!response.ok) {
    throw new Error(response.status === 404 ? "not-found" : `HTTP ${response.status}`);
  }

  return response.json();
}

async function getPokemon(nameOrId) {
  return fetchJson(`${API_BASE}/pokemon/${encodeURIComponent(nameOrId)}`);
}

async function getSpecies(speciesName) {
  return fetchJson(`${API_BASE}/pokemon-species/${encodeURIComponent(speciesName)}`);
}

// The ability list already contains the full URL for each ability, so this
// takes a URL instead of a name.
async function getAbility(url) {
  if (abilityCache.has(url)) return abilityCache.get(url);

  const ability = await fetchJson(url);
  abilityCache.set(url, ability);
  return ability;
}

/* --- Data extraction ------------------------------------------------------ */

// Animated game sprite first, then the older animated set, then static artwork.
function getSprite(pokemon) {
  const sprites = pokemon.sprites;
  const showdown = sprites.other.showdown && sprites.other.showdown.front_default;
  const blackWhite = sprites.versions["generation-v"]["black-white"].animated.front_default;
  const artwork = sprites.other["official-artwork"].front_default;

  if (showdown) return { url: showdown, animated: true };
  if (blackWhite) return { url: blackWhite, animated: true };
  return { url: artwork || sprites.front_default, animated: false };
}

function getEnglishGenus(species) {
  const entry = species.genera.find((genus) => genus.language.name === "en");
  return entry ? entry.genus : "";
}

// Shared by the species description and the ability descriptions: both use
// the same flavor_text_entries shape.
function getLatestEnglishFlavorText(entries) {
  const englishEntries = entries.filter((entry) => entry.language.name === "en");
  if (englishEntries.length === 0) return "";

  // The last entry is from the newest game, which has the most modern wording.
  return cleanFlavorText(englishEntries[englishEntries.length - 1].flavor_text);
}

function getStatTotal(stats) {
  return stats.reduce((total, entry) => total + entry.base_stat, 0);
}

/* --- Rendering ------------------------------------------------------------ */

function renderPokemon(pokemon, species) {
  const primaryType = pokemon.types[0].type.name;

  const card = createElement("article", `card type-${primaryType}`);
  card.style.setProperty("--type", TYPE_COLORS[primaryType] || "#a8a878");

  // Header: sprite, number, name, category, types
  const header = createElement("header", "card-header");
  header.appendChild(renderSprite(pokemon));

  const titleBlock = createElement("div", "card-title");
  titleBlock.appendChild(createElement("p", "card-id", formatId(pokemon.id)));
  titleBlock.appendChild(createElement("h2", "card-name", formatName(pokemon.name)));
  if (species) {
    titleBlock.appendChild(createElement("p", "card-genus", getEnglishGenus(species)));
  }
  titleBlock.appendChild(renderTypes(pokemon.types));
  header.appendChild(titleBlock);
  card.appendChild(header);

  // Description from the species endpoint
  if (species) {
    const description = getLatestEnglishFlavorText(species.flavor_text_entries);
    if (description) {
      card.appendChild(createElement("p", "card-description", description));
    }
  }

  // Quick facts
  card.appendChild(renderFacts(pokemon));

  // Abilities
  const abilitiesSection = createElement("section", "card-section");
  abilitiesSection.appendChild(createElement("h3", "card-section-title", "Abilities"));
  abilitiesSection.appendChild(renderAbilities(pokemon.abilities));
  card.appendChild(abilitiesSection);

  // Base stats
  const statsSection = createElement("section", "card-section");
  statsSection.appendChild(createElement("h3", "card-section-title", "Base stats"));
  statsSection.appendChild(renderStats(pokemon.stats));
  card.appendChild(statsSection);

  // replaceChildren() removes whatever was there (empty state or the last card)
  // and inserts the new card in one step.
  displayEl.replaceChildren(card);
}

function renderSprite(pokemon) {
  const wrap = createElement("div", "sprite-wrap");
  const sprite = getSprite(pokemon);

  if (!sprite.url) return wrap;

  const image = createElement("img", "card-sprite");
  image.src = sprite.url;
  image.alt = `${formatName(pokemon.name)} ${sprite.animated ? "animated sprite" : "official artwork"}`;

  if (sprite.animated) {
    // Game sprites are tiny pixel art (40 to 140 px). Show them at double size,
    // capped to the box, and keep the pixels crisp instead of blurring them.
    image.classList.add("is-pixel");
    image.addEventListener("load", () => {
      image.style.width = `${Math.min(image.naturalWidth * 2, 160)}px`;
    });
  }

  wrap.appendChild(image);
  return wrap;
}

function renderTypes(types) {
  const list = createElement("ul", "type-list");
  list.setAttribute("aria-label", "Types");

  for (const entry of types) {
    const typeName = entry.type.name;
    list.appendChild(createElement("li", `type-badge type-${typeName}`, formatName(typeName)));
  }

  return list;
}

function renderFacts(pokemon) {
  // The API stores height in decimetres and weight in hectograms.
  const facts = [
    ["Height", `${(pokemon.height / 10).toFixed(1)} m`],
    ["Weight", `${(pokemon.weight / 10).toFixed(1)} kg`],
    ["Base XP", pokemon.base_experience ?? "Unknown"],
  ];

  const list = createElement("dl", "facts");

  for (const [label, value] of facts) {
    const item = createElement("div", "fact");
    item.appendChild(createElement("dt", "fact-label", label));
    item.appendChild(createElement("dd", "fact-value", String(value)));
    list.appendChild(item);
  }

  return list;
}

function renderAbilities(abilities) {
  const wrap = createElement("div", "ability-area");
  const list = createElement("ul", "ability-list");

  for (const entry of abilities) {
    const item = createElement("li", "ability");

    // A button, not a span, so keyboard users can reach the tooltip too.
    const badge = createElement("button", "ability-badge", formatName(entry.ability.name));
    badge.type = "button";
    badge.dataset.url = entry.ability.url;
    badge.setAttribute("aria-describedby", "ability-tip");

    if (entry.is_hidden) {
      badge.classList.add("is-hidden-ability");
      badge.appendChild(createElement("span", "ability-hidden", "Hidden"));
    }

    item.appendChild(badge);
    list.appendChild(item);
  }

  // One tooltip per card, shared by all its badges.
  const tip = createElement("div", "ability-tip");
  tip.id = "ability-tip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;

  wrap.appendChild(list);
  wrap.appendChild(tip);
  return wrap;
}

function renderStats(stats) {
  const wrap = createElement("div", "stats");
  const list = createElement("ul", "stat-list");

  for (const entry of stats) {
    const statName = entry.stat.name;
    const value = entry.base_stat;
    const label = STAT_LABELS[statName] || formatName(statName);

    const item = createElement("li", "stat");
    item.appendChild(createElement("span", "stat-value", String(value)));

    const bar = createElement("div", "stat-bar");
    bar.setAttribute("role", "meter");
    bar.setAttribute("aria-label", label);
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", String(MAX_BASE_STAT));
    bar.setAttribute("aria-valuenow", String(value));

    const fill = createElement("div", "stat-fill");
    fill.style.height = `${Math.min(Math.round((value / STAT_BAR_SCALE) * 100), 100)}%`;
    bar.appendChild(fill);

    item.appendChild(bar);
    item.appendChild(createElement("span", "stat-name", label));
    list.appendChild(item);
  }

  const total = createElement("div", "stat-total");
  total.appendChild(createElement("span", "", "Total"));
  total.appendChild(createElement("strong", "", String(getStatTotal(stats))));

  wrap.appendChild(list);
  wrap.appendChild(total);
  return wrap;
}

function renderError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;

  // Never leave the previous Pokémon on screen next to an error.
  displayEl.replaceChildren(emptyStateTemplate.cloneNode(true));
  currentPokemon = null;
}

function clearError() {
  errorEl.textContent = "";
  errorEl.hidden = true;
}

function setLoading(isLoading) {
  statusEl.textContent = isLoading ? "Searching Pokédex..." : "";
  displayEl.setAttribute("aria-busy", String(isLoading));
  searchButton.disabled = isLoading;
}

/* --- Ability tooltip ------------------------------------------------------ */

async function showAbilityTip(badge) {
  const tip = badge.closest(".ability-area").querySelector(".ability-tip");
  const abilityName = badge.firstChild.textContent;

  // Mark the active badge so the CSS can highlight it.
  for (const other of badge.closest(".ability-list").querySelectorAll(".ability-badge")) {
    other.classList.toggle("is-active", other === badge);
  }

  tip.replaceChildren(createElement("strong", "", abilityName), " ", "Loading...");
  tip.hidden = false;

  try {
    const ability = await getAbility(badge.dataset.url);
    const description = getLatestEnglishFlavorText(ability.flavor_text_entries) || "No description available.";

    // The user may have moved to another badge while this request was in flight.
    if (!badge.classList.contains("is-active")) return;

    tip.replaceChildren(createElement("strong", "", abilityName), " ", description);
  } catch {
    tip.replaceChildren(createElement("strong", "", abilityName), " ", "Could not load this ability.");
  }
}

function hideAbilityTip(badge) {
  // A clicked (pinned) badge stays open until it is clicked again or Escape is pressed.
  if (badge.classList.contains("is-pinned")) return;

  badge.classList.remove("is-active");
  badge.closest(".ability-area").querySelector(".ability-tip").hidden = true;
}

function hideAllAbilityTips() {
  for (const badge of displayEl.querySelectorAll(".ability-badge")) {
    badge.classList.remove("is-pinned", "is-active");
  }
  for (const tip of displayEl.querySelectorAll(".ability-tip")) {
    tip.hidden = true;
  }
}

// One set of listeners on the display area covers every badge on every card
// that will ever be rendered (event delegation). The badges themselves are
// thrown away and rebuilt on each search.
function handleAbilityHover(event) {
  const badge = event.target.closest(".ability-badge");
  if (badge) showAbilityTip(badge);
}

function handleAbilityLeave(event) {
  const badge = event.target.closest(".ability-badge");
  if (badge && !badge.contains(event.relatedTarget)) hideAbilityTip(badge);
}

function handleAbilityClick(event) {
  const badge = event.target.closest(".ability-badge");
  if (!badge) return;

  if (badge.classList.contains("is-pinned")) {
    badge.classList.remove("is-pinned");
    hideAbilityTip(badge);
    return;
  }

  hideAllAbilityTips();
  badge.classList.add("is-pinned");
  showAbilityTip(badge);
}

/* --- Application logic ---------------------------------------------------- */

// One place that turns a query into a card. Search calls this now;
// Random, Previous, and Next will call it in a later stage.
async function loadPokemon(query) {
  clearError();
  setLoading(true);

  try {
    const pokemon = await getPokemon(query);

    // A form name like "deoxys-attack" has its species under "deoxys",
    // so the species request uses the name the API gives us, not the query.
    let species = null;
    try {
      species = await getSpecies(pokemon.species.name);
    } catch {
      // The card still renders without a description if species data fails.
    }

    currentPokemon = pokemon;
    renderPokemon(pokemon, species);
  } catch (error) {
    if (error.message === "not-found") {
      renderError("Pokémon not found. Check the name or Pokédex number and try again.");
    } else {
      renderError("Could not reach the Pokédex. Check your connection and try again.");
    }
  } finally {
    setLoading(false);
  }
}

async function handleSearch(event) {
  // Stop the browser from reloading the page on submit.
  event.preventDefault();

  const query = cleanQuery(searchInput.value);

  // Guard clauses: bail out early on bad input instead of nesting the happy path.
  if (query === "") {
    renderError("Type a Pokémon name or Pokédex number first.");
    return;
  }

  if (!isValidQuery(query)) {
    renderError("Use letters, numbers, and hyphens only, like mr-mime or 122.");
    return;
  }

  await loadPokemon(query);
}

/* --- Wire up events ------------------------------------------------------- */

searchForm.addEventListener("submit", handleSearch);

displayEl.addEventListener("mouseover", handleAbilityHover);
displayEl.addEventListener("mouseout", handleAbilityLeave);
displayEl.addEventListener("focusin", handleAbilityHover);
displayEl.addEventListener("focusout", handleAbilityLeave);
displayEl.addEventListener("click", handleAbilityClick);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideAllAbilityTips();
});
