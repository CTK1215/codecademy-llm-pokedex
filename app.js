/* ==========================================================================
   Pokédex app
   Stage 2: capture the search, fetch from PokéAPI, render the card,
   handle errors and the loading state.
   Stage 3: type palette, animated sprite, skyline stats, ability tooltips.
   Stage 4: random, previous / next, recently viewed, evolution chain.
   Stage 5: the Explore view, paginated grid and client-side filter.
   Stage 6: search suggestions, the team dock with type coverage, compare.
   ========================================================================== */

const API_BASE = "https://pokeapi.co/api/v2";

// The last Pokémon in the National Pokédex (Pecharunt). Anything above this id
// is an alternate form, not a numbered species.
const MAX_POKEMON_ID = 1025;

// Artwork lives at a predictable URL keyed by Pokédex number. Building the URL
// saves one request per evolution (Eevee's chain alone has nine members).
const ARTWORK_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

const RECENT_KEY = "pokedex-recent";
const RECENT_LIMIT = 8;

// 24 divides evenly by the grid's 2, 3, and 4 column layouts, so no page ends
// with an orphan row on any screen size.
const PAGE_SIZE = 24;
const TOTAL_PAGES = Math.ceil(MAX_POKEMON_ID / PAGE_SIZE);

const TEAM_KEY = "pokedex-team";

// A Pokémon party is six. The dock enforces the same limit.
const TEAM_LIMIT = 6;

const SUGGESTION_LIMIT = 8;

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

const randomButton = document.getElementById("random-button");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

const evolutionSection = document.getElementById("evolution");
const evolutionChainEl = document.getElementById("evolution-chain");
const recentSection = document.getElementById("recent");
const recentListEl = document.getElementById("recent-list");

const mainEl = document.getElementById("main");
const viewTabsEl = document.querySelector(".view-tabs");
const searchView = document.getElementById("search-view");
const exploreView = document.getElementById("explore-view");

const filterInput = document.getElementById("filter-input");
const exploreStatusEl = document.getElementById("explore-status");
const gridEl = document.getElementById("grid");
const pagePrevButton = document.getElementById("page-prev");
const pageNextButton = document.getElementById("page-next");
const pageIndicatorEl = document.getElementById("page-indicator");

const suggestionsEl = document.getElementById("suggestions");

const teamToggleButton = document.getElementById("team-toggle");
const teamCountEl = document.getElementById("team-count");
const teamDock = document.getElementById("team-dock");
const teamCloseButton = document.getElementById("team-close");
const teamListEl = document.getElementById("team-list");
const teamCoverageEl = document.getElementById("team-coverage");

const compareButton = document.getElementById("compare-button");
const compareDialog = document.getElementById("compare-dialog");
const compareCloseButton = document.getElementById("compare-close");
const compareForm = document.getElementById("compare-form");
const compareInput = document.getElementById("compare-input");
const compareSubjectEl = document.getElementById("compare-subject");
const compareErrorEl = document.getElementById("compare-error");
const compareResultEl = document.getElementById("compare-result");

// A copy of the empty state from the HTML, so we can put it back after an error.
const emptyStateTemplate = displayEl.firstElementChild.cloneNode(true);

/* --- Application state ---------------------------------------------------- */

// The Pokémon currently on screen. Previous / Next and Compare read this.
let currentPokemon = null;

// Its species record, which carries the Pokédex number used for stepping.
// A form like deoxys-attack has id 10001 but species id 386.
let currentSpecies = null;

// Ability descriptions already fetched, keyed by ability URL. Hovering the same
// ability twice should not hit the API twice.
const abilityCache = new Map();

// Recently viewed Pokémon, newest first: [{ name, id }].
let recentlyViewed = [];

/* Explore view state. */

// Zero-based index of the page on screen.
let currentPage = 0;

// Full detail objects for that page. The filter works on this array, which is
// the whole point: filtering is not another search, it is a pass over data
// the app already holds.
let pageEntries = [];

// Pages already fetched, keyed by page index, so paging back is instant.
const pageCache = new Map();

// The Explore grid loads on first visit, not on page load.
let exploreLoaded = false;

/* Stage 6 state. */

// Every Pokémon name, fetched once and reused for every keystroke.
let allNames = [];

// Which suggestion the arrow keys have landed on, or -1 for none.
let activeSuggestion = -1;

// The saved team: [{ name, id, types: [...] }], at most TEAM_LIMIT.
let team = [];

// Type records keyed by name, so coverage never refetches a type.
const typeCache = new Map();

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

// Resource URLs end in the record's id, like ".../pokemon-species/133/".
function getIdFromUrl(url) {
  return Number(url.split("/").filter(Boolean).pop());
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

// The species record points at its evolution chain by URL, same as abilities.
async function getEvolutionChain(url) {
  return fetchJson(url);
}

// The list endpoint pages through the Pokédex. It returns names and URLs only,
// with no sprite or type, so the grid still has to fetch each entry's detail.
async function getPokemonList(limit, offset) {
  return fetchJson(`${API_BASE}/pokemon?limit=${limit}&offset=${offset}`);
}

// A type record carries the damage chart, which is where coverage comes from.
async function getType(name) {
  if (typeCache.has(name)) return typeCache.get(name);

  const type = await fetchJson(`${API_BASE}/type/${name}`);
  typeCache.set(name, type);
  return type;
}

// Every name in one 68KB request, fetched the first time the user types and
// reused for every keystroke after. Suggestions never hit the network again.
async function loadAllNames() {
  if (allNames.length > 0) return allNames;

  const list = await getPokemonList(MAX_POKEMON_ID, 0);
  allNames = list.results.map((entry) => entry.name);
  return allNames;
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

  const card = createElement("article", "card");
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

  // Team action. Its label depends on team state, so updateTeamButton sets it.
  const actions = createElement("div", "card-actions");
  const teamAction = createElement("button", "btn team-action");
  teamAction.type = "button";
  actions.appendChild(teamAction);
  card.appendChild(actions);

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
    list.appendChild(createElement("li", "type-badge", formatName(entry.type.name)));
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
    const item = createElement("li");

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

/* --- Evolution chain ------------------------------------------------------ */

// The API nests the chain: each node holds the species plus an evolves_to
// array of the nodes it becomes. Walking it one level at a time turns that
// nesting into a flat list of stages, which is what the UI draws.
// Eevee is one stage of 1 and one stage of 8; Wurmple branches in the middle.
function flattenEvolutionChain(chain) {
  const stages = [];
  let level = [chain];

  while (level.length > 0) {
    stages.push(
      level.map((node) => ({
        name: node.species.name,
        id: getIdFromUrl(node.species.url),
      }))
    );

    level = level.flatMap((node) => node.evolves_to);
  }

  return stages;
}

function renderEvolution(chain) {
  const stages = flattenEvolutionChain(chain);

  // A Pokémon that never evolves is a single stage. There is nothing to show.
  if (stages.length < 2) {
    evolutionSection.hidden = true;
    evolutionChainEl.replaceChildren();
    return;
  }

  const parts = [];

  stages.forEach((stage, index) => {
    const group = createElement("div", "evolution-stage");

    for (const member of stage) {
      const button = createElement("button", "evolution-member");
      button.type = "button";
      button.dataset.name = member.name;

      const image = createElement("img", "evolution-image");
      image.src = `${ARTWORK_BASE}/${member.id}.png`;
      image.alt = "";
      image.loading = "lazy";

      button.appendChild(image);
      button.appendChild(createElement("span", "evolution-name", formatName(member.name)));

      // Mark the Pokémon already on screen instead of linking back to itself.
      if (currentSpecies && member.id === currentSpecies.id) {
        button.classList.add("is-current");
        button.disabled = true;
        button.setAttribute("aria-current", "true");
      }

      group.appendChild(button);
    }

    // Every stage after the first is wrapped together with the arrow that
    // points at it. Keeping the pair in one box means a narrow screen can
    // never wrap an arrow onto the end of a line with nothing after it.
    if (index === 0) {
      parts.push(group);
      return;
    }

    const step = createElement("div", "evolution-step");
    const arrow = createElement("span", "evolution-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    step.appendChild(arrow);
    step.appendChild(group);
    parts.push(step);
  });

  evolutionChainEl.replaceChildren(...parts);
  evolutionSection.hidden = false;
}

function hideEvolution() {
  evolutionSection.hidden = true;
  evolutionChainEl.replaceChildren();
}

/* --- Recently viewed ------------------------------------------------------ */

// localStorage can throw (private windows, blocked site data) and can hold
// anything, so every read is guarded and re-validated.
function loadRecentlyViewed() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY));
    if (!Array.isArray(stored)) return [];

    return stored
      .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.id))
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function saveRecentlyViewed() {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentlyViewed));
  } catch {
    // Not being able to remember the history is not worth interrupting a search.
  }
}

function addRecentlyViewed(pokemon) {
  // Drop any earlier visit so the newest one moves to the front.
  recentlyViewed = recentlyViewed.filter((entry) => entry.name !== pokemon.name);
  recentlyViewed.unshift({ name: pokemon.name, id: pokemon.id });
  recentlyViewed = recentlyViewed.slice(0, RECENT_LIMIT);

  saveRecentlyViewed();
  renderRecentlyViewed();
}

function renderRecentlyViewed() {
  if (recentlyViewed.length === 0) {
    recentSection.hidden = true;
    recentListEl.replaceChildren();
    return;
  }

  const items = recentlyViewed.map((entry) => {
    const item = createElement("li");
    const chip = createElement("button", "chip", formatName(entry.name));
    chip.type = "button";
    chip.dataset.name = entry.name;

    if (currentPokemon && currentPokemon.name === entry.name) {
      chip.classList.add("is-current");
    }

    item.appendChild(chip);
    return item;
  });

  recentListEl.replaceChildren(...items);
  recentSection.hidden = false;
}

/* --- Navigation controls -------------------------------------------------- */

// Stepping walks the Pokédex, so it uses the species number rather than the
// Pokémon id, which is in the 10000s for alternate forms.
function getCurrentDexNumber() {
  if (currentSpecies && currentSpecies.id <= MAX_POKEMON_ID) return currentSpecies.id;
  if (currentPokemon && currentPokemon.id <= MAX_POKEMON_ID) return currentPokemon.id;
  return null;
}

function updateNavButtons() {
  const canStep = getCurrentDexNumber() !== null;
  prevButton.disabled = !canStep;
  nextButton.disabled = !canStep;
}

function handleRandom() {
  const id = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
  loadPokemon(String(id));
}

// The Pokédex wraps at both ends: Previous from Bulbasaur lands on Pecharunt.
function handleStep(offset) {
  const current = getCurrentDexNumber();
  if (current === null) return;

  const next = ((current - 1 + offset + MAX_POKEMON_ID) % MAX_POKEMON_ID) + 1;
  loadPokemon(String(next));
}

/* --- Views ---------------------------------------------------------------- */

function setView(view) {
  mainEl.dataset.view = view;
  searchView.hidden = view !== "search";
  exploreView.hidden = view !== "explore";

  for (const tab of viewTabsEl.querySelectorAll(".tab")) {
    const isActive = tab.dataset.view === view;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  }

  // The grid costs 25 requests, so it waits until someone actually opens it.
  if (view === "explore" && !exploreLoaded) {
    exploreLoaded = true;
    loadExplorePage(0);
  }
}

/* --- Explore grid --------------------------------------------------------- */

function renderGridCard(pokemon) {
  const primaryType = pokemon.types[0].type.name;

  const card = createElement("button", "grid-card");
  card.type = "button";
  card.dataset.name = pokemon.name;
  card.style.setProperty("--type", TYPE_COLORS[primaryType] || "#a8a878");

  // The small sprite is about half a kilobyte against 200KB for the artwork.
  // At 24 per page that is the difference between 13KB and 5MB.
  const spriteUrl = pokemon.sprites.front_default || `${ARTWORK_BASE}/${pokemon.id}.png`;
  const image = createElement("img", "grid-image");
  image.src = spriteUrl;
  image.alt = "";
  image.loading = "lazy";

  card.appendChild(image);
  card.appendChild(createElement("span", "grid-id", formatId(pokemon.id)));
  card.appendChild(createElement("span", "grid-name", formatName(pokemon.name)));
  card.appendChild(
    createElement("span", "grid-types", pokemon.types.map((entry) => formatName(entry.type.name)).join(" / "))
  );

  return card;
}

// An empty list clears the grid on its own, since replaceChildren() with no
// arguments removes everything.
function renderGrid(entries) {
  gridEl.replaceChildren(...entries.map(renderGridCard));
}

// Filtering never touches the network. It runs over pageEntries, which the app
// already fetched, which is why it can respond on every keystroke.
function applyFilter() {
  const query = filterInput.value.trim().toLowerCase();

  const matches =
    query === ""
      ? pageEntries
      : pageEntries.filter(
          (pokemon) =>
            pokemon.name.includes(query) ||
            pokemon.types.some((entry) => entry.type.name.includes(query))
        );

  renderGrid(matches);

  if (pageEntries.length === 0) {
    exploreStatusEl.textContent = "";
  } else if (matches.length === 0) {
    exploreStatusEl.textContent = `Nothing on page ${currentPage + 1} matches "${filterInput.value.trim()}".`;
  } else if (query === "") {
    exploreStatusEl.textContent = `${pageEntries.length} Pokémon on page ${currentPage + 1}.`;
  } else {
    exploreStatusEl.textContent = `${matches.length} of ${pageEntries.length} match on page ${currentPage + 1}.`;
  }
}

function updatePager(isLoading) {
  pagePrevButton.disabled = isLoading || currentPage === 0;
  pageNextButton.disabled = isLoading || currentPage >= TOTAL_PAGES - 1;
  pageIndicatorEl.textContent = `Page ${currentPage + 1} of ${TOTAL_PAGES}`;
}

async function loadExplorePage(page) {
  // Guard clause: ignore anything outside the Pokédex.
  if (page < 0 || page >= TOTAL_PAGES) return;

  currentPage = page;

  if (pageCache.has(page)) {
    pageEntries = pageCache.get(page);
    updatePager(false);
    applyFilter();
    return;
  }

  gridEl.replaceChildren();
  exploreStatusEl.textContent = `Loading page ${page + 1}...`;
  gridEl.setAttribute("aria-busy", "true");
  updatePager(true);

  try {
    const offset = page * PAGE_SIZE;

    // The final page is short, because the Pokédex ends at 1025 and the list
    // endpoint would otherwise run on into the alternate forms.
    const limit = Math.min(PAGE_SIZE, MAX_POKEMON_ID - offset);
    const list = await getPokemonList(limit, offset);

    // One request per entry, all in flight at once. Sequential awaits here
    // would turn a quarter of a second into several seconds.
    pageEntries = await Promise.all(list.results.map((entry) => fetchJson(entry.url)));
    pageCache.set(page, pageEntries);

    applyFilter();
  } catch {
    pageEntries = [];
    gridEl.replaceChildren();
    exploreStatusEl.textContent = "Could not load this page. Check your connection and try again.";
  } finally {
    gridEl.setAttribute("aria-busy", "false");
    updatePager(false);
  }
}

// A grid card opens the full card, which lives in the Search view.
function handleGridClick(event) {
  const card = event.target.closest(".grid-card");
  if (!card) return;

  setView("search");
  loadPokemon(card.dataset.name);
}

function handleTabClick(event) {
  const tab = event.target.closest(".tab");
  if (!tab) return;

  setView(tab.dataset.view);
}

/* --- Search suggestions --------------------------------------------------- */

// Names that begin with the query come first, then names that merely contain
// it, so typing "char" offers Charmander before Charjabug.
function matchNames(query) {
  const startsWith = [];
  const contains = [];

  for (const name of allNames) {
    if (name.startsWith(query)) startsWith.push(name);
    else if (name.includes(query)) contains.push(name);

    if (startsWith.length >= SUGGESTION_LIMIT) break;
  }

  return [...startsWith, ...contains].slice(0, SUGGESTION_LIMIT);
}

function closeSuggestions() {
  suggestionsEl.hidden = true;
  suggestionsEl.replaceChildren();
  searchInput.setAttribute("aria-expanded", "false");
  searchInput.removeAttribute("aria-activedescendant");
  activeSuggestion = -1;
}

function highlightSuggestion(index) {
  const options = [...suggestionsEl.querySelectorAll(".suggestion")];
  if (options.length === 0) return;

  // Wrap in both directions so the list is a loop.
  activeSuggestion = (index + options.length) % options.length;

  options.forEach((option, i) => {
    const isActive = i === activeSuggestion;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-selected", String(isActive));
  });

  searchInput.setAttribute("aria-activedescendant", options[activeSuggestion].id);
}

function renderSuggestions(names) {
  if (names.length === 0) {
    closeSuggestions();
    return;
  }

  suggestionsEl.replaceChildren(
    ...names.map((name, index) => {
      const option = createElement("li", "suggestion", formatName(name));
      option.id = `suggestion-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.dataset.name = name;
      return option;
    })
  );

  suggestionsEl.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
  activeSuggestion = -1;
}

async function handleSearchInput() {
  const query = cleanQuery(searchInput.value);

  // A number is a Pokédex lookup, not a name, so there is nothing to suggest.
  if (query.length < 2 || /^\d+$/.test(query)) {
    closeSuggestions();
    return;
  }

  try {
    await loadAllNames();
  } catch {
    // Suggestions are a convenience. Losing them must not break searching.
    closeSuggestions();
    return;
  }

  // The user may have kept typing while the name list was downloading.
  if (cleanQuery(searchInput.value) !== query) return;

  renderSuggestions(matchNames(query));
}

function chooseSuggestion(name) {
  searchInput.value = formatName(name);
  closeSuggestions();
  loadPokemon(name);
}

function handleSearchKeydown(event) {
  if (suggestionsEl.hidden) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightSuggestion(activeSuggestion + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightSuggestion(activeSuggestion - 1);
  } else if (event.key === "Escape") {
    closeSuggestions();
  } else if (event.key === "Enter" && activeSuggestion >= 0) {
    // Take the highlighted suggestion instead of submitting the raw text.
    event.preventDefault();
    chooseSuggestion(suggestionsEl.querySelectorAll(".suggestion")[activeSuggestion].dataset.name);
  }
}

/* --- Team dock ------------------------------------------------------------ */

function loadTeam() {
  try {
    const stored = JSON.parse(localStorage.getItem(TEAM_KEY));
    if (!Array.isArray(stored)) return [];

    return stored
      .filter(
        (entry) =>
          entry && typeof entry.name === "string" && Number.isFinite(entry.id) && Array.isArray(entry.types)
      )
      .slice(0, TEAM_LIMIT);
  } catch {
    return [];
  }
}

function saveTeam() {
  try {
    localStorage.setItem(TEAM_KEY, JSON.stringify(team));
  } catch {
    // Same as the history: a storage failure is not worth an interruption.
  }
}

function isOnTeam(name) {
  return team.some((member) => member.name === name);
}

function toggleTeamMember(pokemon) {
  if (isOnTeam(pokemon.name)) {
    team = team.filter((member) => member.name !== pokemon.name);
  } else {
    // The card's button is already disabled at the limit; this is the backstop.
    if (team.length >= TEAM_LIMIT) return;

    team.push({
      name: pokemon.name,
      id: pokemon.id,
      types: pokemon.types.map((entry) => entry.type.name),
    });
  }

  saveTeam();
  renderTeam();
  updateTeamButton();
}

// Which of the 18 battle types this team can hit for double damage. Each of
// the team's own types contributes the list the API gives for it.
async function computeCoverage() {
  const teamTypes = [...new Set(team.flatMap((member) => member.types))];
  const records = await Promise.all(teamTypes.map(getType));

  const covered = new Set();
  for (const record of records) {
    for (const entry of record.damage_relations.double_damage_to) {
      covered.add(entry.name);
    }
  }

  return covered;
}

async function renderCoverage() {
  if (team.length === 0) {
    teamCoverageEl.replaceChildren();
    return;
  }

  teamCoverageEl.replaceChildren(createElement("p", "coverage-status", "Working out coverage..."));

  let covered;
  try {
    covered = await computeCoverage();
  } catch {
    teamCoverageEl.replaceChildren(createElement("p", "coverage-status", "Could not load type coverage."));
    return;
  }

  const allTypes = Object.keys(TYPE_COLORS);

  const heading = createElement(
    "p",
    "coverage-status",
    `Hits ${covered.size} of ${allTypes.length} types for double damage.`
  );

  const list = createElement("ul", "coverage-list");
  list.setAttribute("aria-label", "Type coverage");

  for (const typeName of allTypes) {
    const isCovered = covered.has(typeName);
    const chip = createElement("li", `coverage-chip${isCovered ? " is-covered" : ""}`, formatName(typeName));
    chip.style.setProperty("--type", TYPE_COLORS[typeName]);
    chip.title = isCovered ? `Your team hits ${formatName(typeName)} for 2x` : `No 2x hit on ${formatName(typeName)}`;
    list.appendChild(chip);
  }

  teamCoverageEl.replaceChildren(heading, list);
}

function renderTeam() {
  teamCountEl.textContent = String(team.length);

  if (team.length === 0) {
    teamListEl.replaceChildren(
      createElement("li", "team-empty", "No Pokémon yet. Open one and press Add to team.")
    );
    teamCoverageEl.replaceChildren();
    return;
  }

  teamListEl.replaceChildren(
    ...team.map((member) => {
      const item = createElement("li", "team-member");
      item.style.setProperty("--type", TYPE_COLORS[member.types[0]] || "#a8a878");

      const image = createElement("img", "team-image");
      image.src = `${ARTWORK_BASE}/${member.id}.png`;
      image.alt = "";
      image.loading = "lazy";

      const open = createElement("button", "team-open", formatName(member.name));
      open.type = "button";
      open.dataset.name = member.name;

      const remove = createElement("button", "team-remove", "×");
      remove.type = "button";
      remove.dataset.remove = member.name;
      remove.setAttribute("aria-label", `Remove ${formatName(member.name)} from team`);

      item.append(image, open, remove);
      return item;
    })
  );

  renderCoverage();
}

function setTeamDockOpen(isOpen) {
  teamDock.hidden = !isOpen;
  teamToggleButton.setAttribute("aria-expanded", String(isOpen));
}

function handleTeamListClick(event) {
  const remove = event.target.closest("[data-remove]");
  if (remove) {
    team = team.filter((member) => member.name !== remove.dataset.remove);
    saveTeam();
    renderTeam();
    updateTeamButton();
    return;
  }

  const open = event.target.closest("[data-name]");
  if (open) {
    setView("search");
    loadPokemon(open.dataset.name);
  }
}

// The card's own add / remove button, rebuilt with every card.
function updateTeamButton() {
  const button = displayEl.querySelector(".team-action");
  if (!button || !currentPokemon) return;

  const onTeam = isOnTeam(currentPokemon.name);
  const full = !onTeam && team.length >= TEAM_LIMIT;

  button.textContent = onTeam ? "Remove from team" : full ? `Team is full (${TEAM_LIMIT})` : "Add to team";
  button.classList.toggle("is-on-team", onTeam);
  button.disabled = full;
}

function handleTeamActionClick() {
  if (!currentPokemon) return;
  toggleTeamMember(currentPokemon);
}

/* --- Compare -------------------------------------------------------------- */

function openCompare() {
  if (!currentPokemon) return;

  compareSubjectEl.textContent = formatName(currentPokemon.name);
  compareErrorEl.hidden = true;
  compareResultEl.replaceChildren();
  compareInput.value = "";
  compareDialog.showModal();
  compareInput.focus();
}

function renderComparison(left, right) {
  const table = createElement("table", "compare-table");

  const head = createElement("thead");
  const headRow = createElement("tr");
  headRow.appendChild(createElement("th", "", "Stat"));

  for (const pokemon of [left, right]) {
    const cell = createElement("th", "compare-name", formatName(pokemon.name));
    cell.scope = "col";
    cell.style.setProperty("--type", TYPE_COLORS[pokemon.types[0].type.name] || "#a8a878");
    headRow.appendChild(cell);
  }

  head.appendChild(headRow);
  table.appendChild(head);

  const body = createElement("tbody");

  left.stats.forEach((leftStat, index) => {
    const rightStat = right.stats[index];
    const label = STAT_LABELS[leftStat.stat.name] || formatName(leftStat.stat.name);

    const row = createElement("tr");
    const header = createElement("th", "", label);
    header.scope = "row";
    row.appendChild(header);

    const leftCell = createElement("td", "", String(leftStat.base_stat));
    const rightCell = createElement("td", "", String(rightStat.base_stat));

    // Mark the higher stat. A tie marks neither.
    if (leftStat.base_stat > rightStat.base_stat) leftCell.classList.add("is-winner");
    else if (rightStat.base_stat > leftStat.base_stat) rightCell.classList.add("is-winner");

    row.append(leftCell, rightCell);
    body.appendChild(row);
  });

  table.appendChild(body);

  const foot = createElement("tfoot");
  const footRow = createElement("tr");
  const footHeader = createElement("th", "", "Total");
  footHeader.scope = "row";
  footRow.appendChild(footHeader);

  const leftTotal = getStatTotal(left.stats);
  const rightTotal = getStatTotal(right.stats);
  const leftTotalCell = createElement("td", "", String(leftTotal));
  const rightTotalCell = createElement("td", "", String(rightTotal));

  if (leftTotal > rightTotal) leftTotalCell.classList.add("is-winner");
  else if (rightTotal > leftTotal) rightTotalCell.classList.add("is-winner");

  footRow.append(leftTotalCell, rightTotalCell);
  foot.appendChild(footRow);
  table.appendChild(foot);

  compareResultEl.replaceChildren(table);
}

async function handleCompareSubmit(event) {
  event.preventDefault();

  if (!currentPokemon) return;

  const query = cleanQuery(compareInput.value);

  if (query === "") {
    showCompareError("Type a Pokémon name or Pokédex number to compare.");
    return;
  }

  if (!isValidQuery(query)) {
    showCompareError("Use letters, numbers, and hyphens only.");
    return;
  }

  compareErrorEl.hidden = true;
  compareResultEl.replaceChildren(createElement("p", "compare-loading", "Loading..."));

  try {
    const other = await getPokemon(query);
    renderComparison(currentPokemon, other);
  } catch (error) {
    compareResultEl.replaceChildren();
    showCompareError(
      error.message === "not-found"
        ? "Pokémon not found. Check the name or Pokédex number."
        : "Could not reach the Pokédex. Try again."
    );
  }
}

function showCompareError(message) {
  compareErrorEl.textContent = message;
  compareErrorEl.hidden = false;
}

/* --- Messages ------------------------------------------------------------- */

function renderError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;

  // Never leave the previous Pokémon on screen next to an error.
  displayEl.replaceChildren(emptyStateTemplate.cloneNode(true));
  hideEvolution();
  currentPokemon = null;
  currentSpecies = null;
  updateNavButtons();
  compareButton.disabled = true;
}

function clearError() {
  errorEl.textContent = "";
  errorEl.hidden = true;
}

function setLoading(isLoading) {
  statusEl.textContent = isLoading ? "Searching Pokédex..." : "";
  displayEl.setAttribute("aria-busy", String(isLoading));
  searchButton.disabled = isLoading;
  randomButton.disabled = isLoading;

  // While a request is in flight, stepping is off for everyone. When it ends,
  // whether stepping is available depends on what actually loaded.
  if (isLoading) {
    prevButton.disabled = true;
    nextButton.disabled = true;
  } else {
    updateNavButtons();
  }
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

// One place that turns a query into a card. Everything that can show a
// Pokémon comes through here: the search form, Random, Previous and Next,
// the history chips, the evolution chain, the team dock, and the grid.
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
    currentSpecies = species;
    renderPokemon(pokemon, species);
    updateTeamButton();
    compareButton.disabled = false;
    addRecentlyViewed(pokemon);

    // The evolution chain is a third request and the least important one,
    // so a failure here hides the section instead of failing the search.
    if (species) {
      try {
        renderEvolution((await getEvolutionChain(species.evolution_chain.url)).chain);
      } catch {
        hideEvolution();
      }
    } else {
      hideEvolution();
    }
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
  closeSuggestions();

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

// Evolution members and history chips both carry the name to load in a data
// attribute, so one handler serves both lists.
function handleNameButtonClick(event) {
  const button = event.target.closest("[data-name]");
  if (!button || button.disabled) return;

  loadPokemon(button.dataset.name);
}

/* --- Wire up events ------------------------------------------------------- */

searchForm.addEventListener("submit", handleSearch);

randomButton.addEventListener("click", handleRandom);
prevButton.addEventListener("click", () => handleStep(-1));
nextButton.addEventListener("click", () => handleStep(1));

displayEl.addEventListener("mouseover", handleAbilityHover);
displayEl.addEventListener("mouseout", handleAbilityLeave);
displayEl.addEventListener("focusin", handleAbilityHover);
displayEl.addEventListener("focusout", handleAbilityLeave);
displayEl.addEventListener("click", handleAbilityClick);

evolutionChainEl.addEventListener("click", handleNameButtonClick);
recentListEl.addEventListener("click", handleNameButtonClick);

viewTabsEl.addEventListener("click", handleTabClick);
gridEl.addEventListener("click", handleGridClick);
filterInput.addEventListener("input", applyFilter);
pagePrevButton.addEventListener("click", () => loadExplorePage(currentPage - 1));
pageNextButton.addEventListener("click", () => loadExplorePage(currentPage + 1));

// Suggestions
searchInput.addEventListener("input", handleSearchInput);
searchInput.addEventListener("keydown", handleSearchKeydown);
suggestionsEl.addEventListener("click", (event) => {
  const option = event.target.closest(".suggestion");
  if (option) chooseSuggestion(option.dataset.name);
});

// A click anywhere outside the search form dismisses the suggestion list.
document.addEventListener("click", (event) => {
  if (!searchForm.contains(event.target)) closeSuggestions();
});

// Team
displayEl.addEventListener("click", (event) => {
  if (event.target.closest(".team-action")) handleTeamActionClick();
});
teamToggleButton.addEventListener("click", () => setTeamDockOpen(teamDock.hidden));
teamCloseButton.addEventListener("click", () => setTeamDockOpen(false));
teamListEl.addEventListener("click", handleTeamListClick);

// Compare
compareButton.addEventListener("click", openCompare);
compareCloseButton.addEventListener("click", () => compareDialog.close());
compareForm.addEventListener("submit", handleCompareSubmit);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  hideAllAbilityTips();

  // The dialog closes itself on Escape, so only the dock needs handling here.
  if (!teamDock.hidden) setTeamDockOpen(false);
});

/* --- Start up ------------------------------------------------------------- */

// The history survives a reload, so show it before the first search.
recentlyViewed = loadRecentlyViewed();
renderRecentlyViewed();
updateNavButtons();
updatePager(false);

// The team survives a reload too.
team = loadTeam();
renderTeam();
