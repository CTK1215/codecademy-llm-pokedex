/* ==========================================================================
   Pokédex app
   Stage 2: capture the search, fetch from PokéAPI, render the card,
   handle errors and the loading state.
   ========================================================================== */

const API_BASE = "https://pokeapi.co/api/v2";

// Highest base stat any Pokémon has. Used to size the stat bars as a percentage.
const MAX_BASE_STAT = 255;

const STAT_LABELS = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Attack",
  "special-defense": "Sp. Defense",
  speed: "Speed",
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

/* --- Data extraction ------------------------------------------------------ */

function getArtworkUrl(pokemon) {
  return pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default;
}

function getEnglishGenus(species) {
  const entry = species.genera.find((genus) => genus.language.name === "en");
  return entry ? entry.genus : "";
}

function getEnglishDescription(species) {
  const englishEntries = species.flavor_text_entries.filter((entry) => entry.language.name === "en");
  if (englishEntries.length === 0) return "";

  // The last entry is from the newest game, which has the most modern wording.
  return cleanFlavorText(englishEntries[englishEntries.length - 1].flavor_text);
}

/* --- Rendering ------------------------------------------------------------ */

function renderPokemon(pokemon, species) {
  const card = createElement("article", "card");
  card.classList.add(`type-${pokemon.types[0].type.name}`);

  // Header: artwork, number, name, category
  const header = createElement("header", "card-header");

  const artworkUrl = getArtworkUrl(pokemon);
  if (artworkUrl) {
    const image = createElement("img", "card-image");
    image.src = artworkUrl;
    image.alt = `${formatName(pokemon.name)} official artwork`;
    image.width = 240;
    image.height = 240;
    header.appendChild(image);
  }

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
    const description = getEnglishDescription(species);
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
  const list = createElement("ul", "ability-list");

  for (const entry of abilities) {
    const item = createElement("li", "ability", formatName(entry.ability.name));
    if (entry.is_hidden) {
      item.appendChild(createElement("span", "ability-hidden", " (hidden)"));
    }
    list.appendChild(item);
  }

  return list;
}

function renderStats(stats) {
  const list = createElement("ul", "stat-list");

  for (const entry of stats) {
    const statName = entry.stat.name;
    const value = entry.base_stat;

    const item = createElement("li", "stat");
    item.appendChild(createElement("span", "stat-name", STAT_LABELS[statName] || formatName(statName)));
    item.appendChild(createElement("span", "stat-value", String(value)));

    const bar = createElement("div", "stat-bar");
    bar.setAttribute("role", "meter");
    bar.setAttribute("aria-label", STAT_LABELS[statName] || formatName(statName));
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", String(MAX_BASE_STAT));
    bar.setAttribute("aria-valuenow", String(value));

    const fill = createElement("div", "stat-fill");
    fill.style.width = `${Math.round((value / MAX_BASE_STAT) * 100)}%`;
    bar.appendChild(fill);

    item.appendChild(bar);
    list.appendChild(item);
  }

  return list;
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
