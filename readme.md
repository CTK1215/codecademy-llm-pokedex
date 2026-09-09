# Project: LLM Pokédex

## Description

In this project, you will build a fully interactive Pokédex using:

* JavaScript
* The DOM
* Event Listeners
* `fetch()`
* Promises
* `async / await`
* The PokéAPI
* An LLM coding assistant such as Codex inside VS Code

Your application will allow users to search for Pokémon and display detailed information returned from a real API.

This project is also your introduction to using an AI coding assistant as part of a development workflow.

You are encouraged — and expected — to use an LLM.

However:

The LLM is your pair programmer, not your replacement.

You should use it to help you:

* plan features
* understand API responses
* debug problems
* improve code
* improve accessibility
* create professional styling
* review your work

You should not simply ask the LLM to build the entire project for you.

By the end of the project, you should have a polished, responsive Pokédex application that you understand and can explain.

---

## Learning Objectives

By completing this project, you will practice:

* Making HTTP requests with `fetch()`
* Working with asynchronous JavaScript
* Using `async / await`
* Handling failed HTTP requests
* Using `try / catch`
* Reading and navigating API data
* Working with objects and arrays returned from an API
* Selecting DOM elements
* Creating DOM elements dynamically
* Updating the page based on application state
* Adding event listeners
* Handling forms
* Using guard clauses
* Separating application logic from rendering logic
* Designing responsive interfaces
* Using an LLM effectively during software development

---

## The API

You will use:

<https://pokeapi.co/api/v2/>

The primary endpoint for this project is:

`https://pokeapi.co/api/v2/pokemon/{name-or-id}`

For example:

<https://pokeapi.co/api/v2/pokemon/pikachu>

PokéAPI contains significantly more information than you will need.

Part of your job is figuring out:

What data do I actually need from this response?

Before writing JavaScript, open an endpoint in your browser and investigate the returned object.

---

## Project Requirements

Your Pokédex must allow a user to:

* Search for a Pokémon by name
* Search for a Pokémon by Pokédex number
* Retrieve Pokémon data from PokéAPI
* Display the Pokémon on the page
* View important Pokémon information
* See its type or types
* View its abilities
* View its base stats
* Handle an invalid Pokémon search
* Perform another search without refreshing the page

The application should also look like a finished application, not a classroom exercise.

---

## Required File Structure

```text
llm-pokedex/
│
├── index.html
├── style.css
└── app.js
```

You may add additional files if your design requires them.

---

## Development Rules

You are building this with:

* HTML
* CSS
* Vanilla JavaScript

Do not use:

* React
* Vue
* Angular
* jQuery
* a Pokémon-specific JavaScript library
* any library that makes the API requests for you

The goal is to practice the JavaScript concepts we have learned.

---

## Part 1: Explore the API

Before building your interface, retrieve a Pokémon directly in your browser.

Try:

<https://pokeapi.co/api/v2/pokemon/pikachu>

Find where the API stores information such as:

* name
* Pokédex ID
* image/sprite
* types
* abilities
* height
* weight
* base experience
* stats

Do not attempt to display everything returned by the API.

### LLM Checkpoint

This is a good place to use Codex.

Instead of asking:

> Build me a Pokédex using this API.

try something like:

> I am learning JavaScript and working with PokéAPI.
> I retrieved this endpoint:
> https://pokeapi.co/api/v2/pokemon/pikachu
> Help me understand the structure of the returned object.
> Do not write my application for me.
> Show me where I would find:
> - name
> - id
> - sprite
> - types
> - abilities
> - height
> - weight
> - base stats

You are using the LLM to understand your data before writing code.

---

## Part 2: Build the HTML Structure

Build the basic structure of your application yourself.

Your page should contain:

* Application title/logo area
* Search form
* Search input
* Search button
* Main Pokémon display area
* Area for errors or application messages

Your HTML should be semantic and organized.

Your JavaScript will eventually populate most of the Pokémon information dynamically.

### Important

Do not hard-code a Pikachu card into your HTML.

Your page should be able to display any Pokémon returned by the API.

---

## Part 3: Capture the Search

Use JavaScript to select your form and input.

Add an event listener that responds when the form is submitted.

Remember:

```javascript
form.addEventListener("submit", ...)
```

Your event listener will eventually need to:

1. Prevent the default form submission
2. Read the user’s search
3. Clean the search value
4. Validate it
5. Request the Pokémon
6. Render the result

Think about what should happen if the user enters:

```text
Pikachu
```

versus:

```text
   Pikachu
```

versus:

```text
PIKACHU
```

Your application should handle reasonable variations.

---

## Part 4: Create Your API Function

Create a reusable asynchronous function responsible for retrieving Pokémon data.

For example:

```javascript
async function getPokemon(/* ??? */) {
    // your code
}
```

Your function should use:

`fetch()`

and:

`await`

It should return usable JavaScript data back to the rest of your application.

Do not put all of your application code inside the form event listener.

---

## Part 5: Handle HTTP Errors

A successful `fetch()` does not automatically mean that the server returned the Pokémon you requested.

Investigate:

`response.ok`

and:

`response.status`

Your application should properly handle failed requests.

Use:

```javascript
try {
    // request
} catch (err) {
    // handle problem
}
```

Think about where a guard clause could simplify your code.

---

## Part 6: Render the Pokémon

Create a function responsible for displaying Pokémon data.

For example:

```javascript
function renderPokemon(data) {
    // DOM code
}
```

Your rendering function should use the data returned from your API function.

Your Pokémon display must include at least:

* Pokémon name
* Pokédex number
* Pokémon image
* Type(s)
* Height
* Weight
* Abilities
* Base experience

Do not simply output the object or use:

```javascript
JSON.stringify(data)
```

Build an actual user interface.

---

## Part 7: Render Arrays

Several pieces of Pokémon information are stored in arrays.

For example:

* types
* abilities
* stats

You will need to:

1. Access the array
2. Loop through it
3. Extract the information you need
4. Create DOM elements
5. Append those elements to the page

Your application must correctly support Pokémon with:

one type

and Pokémon with:

two types

---

## Part 8: Base Stats

Display all six base stats:

* HP
* Attack
* Defense
* Special Attack
* Special Defense
* Speed

You may display these however you want.

For example:

```text
HP               45
Attack           49
Defense          49
Special Attack   65
Special Defense  65
Speed            45
```

A stronger UI might visualize these using progress bars or another graphical representation.

### LLM Checkpoint

Once your JavaScript successfully retrieves the stats, you may ask Codex for help designing the visualization.

Example:

> I already have JavaScript that retrieves this array of Pokémon stats.
> I want to display the stats as professional-looking horizontal stat bars.
> Explain what HTML/CSS structure you recommend.
> Do not rewrite my fetch logic.

Notice that you are giving the LLM a specific job.

---

## Part 9: Error Handling

Search for something that doesn’t exist:

```text
superMegaPikachu9000
```

Your application should not:

* crash
* display old Pokémon data
* show a broken card
* only log an error to the console

Instead, display a useful message to the user.

Example:

> Pokémon not found. Check the name or Pokédex number and try again.

If an error message is currently displayed and the next search succeeds, the old error must disappear.

---

## Part 10: Loading State

API requests take time.

When a search begins, give the user feedback that something is happening.

For example:

> Searching Pokédex...

or display a loading animation.

The loading state should disappear when:

* the Pokémon loads successfully
* OR an error occurs

Think about where the loading state should be activated and where it should be removed.

---

## Part 11: Pokémon Species Data

Now make the project more interesting.

PokéAPI provides additional Pokémon information through another endpoint:

`https://pokeapi.co/api/v2/pokemon-species/{name-or-id}`

Use a second `fetch()` request to retrieve species information.

Display at least:

* an English Pokémon description
* its genus/category

For example, a completed card might contain something similar to:

```text
Pikachu
#0025
Electric
Mouse Pokémon
When several of these Pokémon gather,
their electricity could build and cause
lightning storms.
```

This means a single user search may require data from multiple asynchronous requests.

---

## Part 12: Professional Design

This project should look substantially more polished than previous classroom projects.

Your application should feel like something you could include in a portfolio.

Consider:

* strong typography
* visual hierarchy
* spacing
* shadows
* cards
* responsive layouts
* Pokémon type colors
* stat visualizations
* transitions
* hover states
* loading animations
* desktop and mobile layouts
* accessible contrast
* polished empty/error states

This is one area where you are strongly encouraged to use an LLM.

---

## Using Codex for Design

Once your application functionality works, give Codex your existing HTML.

Try a prompt such as:

> I am building a Pokédex as a JavaScript class project.
> My application functionality already works.
> Review my HTML structure and suggest ways to make the UI look like a polished modern Pokédex.
> I want:
> - responsive design
> - strong visual hierarchy
> - Pokémon-inspired styling
> - professional spacing
> - type badges
> - stat bars
> - good mobile support
> Do not change my JavaScript functionality.
> First explain the design changes you recommend.
> Do not write any code yet.

Read its recommendations.

Then decide which ones you actually want.

You could follow with:

> I like recommendations 1, 3, 4, and 6.
> Help me implement those changes one at a time.
> Explain what each CSS section does as we add it.

This is much more useful than:

> Make this look good.

---

## LLM Development Rules

Using Codex is part of this project.

However, you should be able to explain every important piece of JavaScript in your application.

### Good Uses of an LLM

Ask it to:

* explain API data
* explain an error
* review a function
* suggest improvements
* identify repetitive code
* explain why something isn’t working
* suggest better variable/function names
* critique your user interface
* improve your CSS
* check accessibility
* help make your design responsive
* provide pseudocode
* compare two possible solutions

### Poor Uses of an LLM

Avoid prompts such as:

> Build this project for me.
> Create a complete Pokédex using HTML CSS and JavaScript.
> Here's my assignment. Give me the solution.

If Codex generates a large amount of code you don’t understand, ask it:

> Stop.
> Explain this solution to me one section at a time.
> Do not add any more code until I understand the existing code.

---

## Recommended LLM Workflow

Use this process throughout the project:

```text
PLAN
  ↓
BUILD
  ↓
TEST
  ↓
ASK
  ↓
UNDERSTAND
  ↓
IMPROVE
  ↓
TEST AGAIN
```

Do not use:

```text
ASK AI
  ↓
COPY EVERYTHING
  ↓
SUBMIT
```

---

## Required Application Architecture

Your application should contain separate functions with separate responsibilities.

You should have functions similar to:

```javascript
getPokemon()
renderPokemon()
renderError()
```

You may need additional functions as your application grows.

Avoid creating one enormous function that:

* reads the form
* fetches the API
* handles errors
* creates the entire DOM
* styles elements
* clears inputs
* manages loading

Break the problem into smaller pieces.

---

## User Experience Requirements

Your finished application should properly handle all of these situations.

### Initial Load

The page should look intentional before the user searches.

You may:

* show instructions
* show a Pokédex graphic
* show a default Pokémon
* display an empty-state message

### Successful Search

Searching:

```text
charizard
```

should display Charizard.

### Different Capitalization

Searching:

```text
CHARIZARD
```

should still work.

### Extra Spaces

Searching:

```text
   charizard
```

should still work.

### Pokédex Number

Searching:

```text
6
```

should retrieve Charizard.

### Invalid Pokémon

Searching:

```text
charizarddddd
```

should display an appropriate error.

### Searching Again

Searching for:

```text
pikachu
```

and then:

```text
bulbasaur
```

should correctly replace the displayed information.

Old:

* abilities
* types
* stats
* descriptions
* errors

must not remain on the page.

---

## Responsive Design

Your application must work at minimum on:

* Desktop
* Tablet
* Mobile

Test your application using browser DevTools.

Your mobile layout should not simply be a squished desktop layout.

---

## Accessibility

Your application should include:

* proper form labels
* useful alt text
* readable text
* adequate color contrast
* keyboard-accessible controls
* semantic HTML where appropriate

Ask Codex to perform an accessibility review once the application is complete.

Example:

> Review this HTML and CSS for basic accessibility problems.
> Do not rewrite the application.
> Give me a list of problems you notice and explain how I should fix each one.

---

## Code Quality

Before submitting, review your JavaScript.

Your code should:

* use meaningful variable names
* use functions to separate responsibilities
* avoid unnecessary repetition
* use `const` and `let` appropriately
* use `async / await`
* use `try / catch`
* check HTTP responses
* use guard clauses where appropriate
* avoid unnecessary global variables
* contain comments where they provide useful context

Your console should not contain errors.

---

## LLM Code Review

Once you believe the application is finished, use Codex one final time.

Try:

> Act as a code reviewer.
> This is a vanilla JavaScript project created by a student learning:
> - DOM manipulation
> - event listeners
> - fetch
> - async/await
> - error handling
> Review my code.
> Do NOT rewrite it.
> Look specifically for:
> 1. bugs
> 2. repeated code
> 3. confusing variable names
> 4. poor separation of responsibilities
> 5. unnecessary DOM queries
> 6. missing error handling
> 7. accessibility problems
> Explain each issue and let me decide what I want to change.

Make the changes yourself.

---

## Stretch Goals

Once all required functionality works, choose additional features.

### 1. Random Pokémon

Add a button:

Random Pokémon

Generate a random ID and retrieve that Pokémon.

---

### 2. Search History

Store recently viewed Pokémon.

Display something similar to:

```text
Recently Viewed
Pikachu
Charizard
Gengar
Mewtwo
```

Clicking a Pokémon should search for it again.

---

### 3. Type Styling

Give every Pokémon type its own visual style.

For example:

* Fire
* Water
* Grass
* Electric
* Psychic
* Ghost

The interface could change based on the Pokémon’s primary type.

---

### 4. Previous / Next Pokémon

Add controls:

```text
← Previous      Next →
```

Use the current Pokémon’s ID to determine which Pokémon to request.

---

### 5. Pokémon Comparison

Allow the user to select two Pokémon and compare their stats.

Example:

```text
CHARIZARD               BLASTOISE
HP          78           79
Attack      84           83
Defense     78           100
Sp. Attack  109          85
Sp. Defense 85           105
Speed       100          78
```

---

### 6. Ability Details

Abilities returned from the Pokémon endpoint contain URLs to additional API resources.

Allow a user to click an ability and retrieve its description.

This requires:

* another event listener
* another `fetch()`
* another asynchronous operation
* additional DOM rendering

---

### 7. Evolution Chain

Research PokéAPI’s species and evolution-chain endpoints.

Display something similar to:

```text
Bulbasaur
    ↓
Ivysaur
    ↓
Venusaur
```

This will require working with more complicated nested API data.

---

## 🚨 Spicy Mode

Build a Pokémon Explorer rather than only a search screen.

Allow users to browse multiple Pokémon as cards.

Your application might initially request a collection of Pokémon and display:

```text
Bulbasaur
Ivysaur
Venusaur
Charmander
Charmeleon
Charizard
Squirtle
Wartortle
Blastoise
...
```

Users can then click a Pokémon to view its full details.

Investigate PokéAPI’s pagination system using:

`limit`

and:

`offset`

Possible controls:

```text
← Previous        Next →
```

or:

Load More

---

## 🌶️🌶️ Extra Spicy Mode

Build client-side filtering for the Pokémon currently displayed.

Add a search input that filters cards as the user types.

Unlike your main Pokémon search, this feature should not make another API request on every keystroke.

Instead:

1. Store the fetched Pokémon
2. Listen for the input event
3. Filter the existing JavaScript data
4. Re-render the matching Pokémon

Think carefully about the difference between:

Searching an API

and:

Filtering data you already have

---

## Suggested Development Order

Do not attempt to build everything simultaneously.

Work in this order:

```text
1. Explore API
        ↓
2. Build HTML
        ↓
3. Capture form submission
        ↓
4. Fetch one Pokémon
        ↓
5. Log and inspect the response
        ↓
6. Render basic Pokémon data
        ↓
7. Render arrays
        ↓
8. Add stats
        ↓
9. Handle errors
        ↓
10. Add loading state
        ↓
11. Fetch species data
        ↓
12. Improve design
        ↓
13. Make responsive
        ↓
14. Test
        ↓
15. LLM code review
```

Get each stage working before moving to the next one.

---

## Testing Checklist

Before submitting, manually test:

* Search by Pokémon name
* Search by Pokédex ID
* Search with uppercase letters
* Search with extra spaces
* Search for an invalid Pokémon
* Search after an error
* Search repeatedly
* Pokémon with one type
* Pokémon with two types
* Pokémon with multiple abilities
* All six stats render correctly
* Species information renders
* Loading state works
* Error state works
* Previous information is properly cleared
* Desktop layout
* Tablet layout
* Mobile layout
* No console errors

---

## Submission Checklist

Your project must demonstrate:

* HTML
* CSS
* JavaScript
* DOM selection
* DOM manipulation
* Event listeners
* Form handling
* `fetch()`
* Promises
* `async / await`
* `try / catch`
* HTTP error handling
* Arrays
* Objects
* Array iteration
* Dynamic rendering
* Multiple API requests
* Responsive design
* Thoughtful use of an LLM

---

## Be Prepared to Explain Your Code

You may be asked to explain portions of your application.

You should be able to answer questions such as:

* Why does fetch need await?
* What does `response.ok` tell you?
* Why are you using `try/catch`?
* Where does this value exist inside the API response?
* What causes `renderPokemon()` to run?
* How does clicking Search trigger your JavaScript?
* Why do you clear the previous DOM elements?
* Why is this function async?
* Why did you separate these two functions?
* What happens when the API returns a 404?
* What did Codex help you with?
* What code did you change after Codex suggested it?
* Why did you accept or reject that suggestion?

If you cannot explain an important portion of your project, use Codex to help you understand it before submitting it.

---

## Deliverable

Submit your completed project containing:

```text
llm-pokedex/
│
├── index.html
├── style.css
└── app.js
```

Your final application should:

Look professional, behave reliably, communicate with a real API, and contain JavaScript that you understand.

The goal isn’t just to build a Pokédex.

The goal is to demonstrate that you can combine:

```text
JavaScript
+
DOM
+
Events
+
APIs
+
Async Programming
+
AI-Assisted Development
```

into a complete application.