let elementDataArray = [];
let neighbors;
let guessesRemaining = 8;
let neighborsGuessed = 0;
const revealedPositions = new Set(); // track which neighbor positions are already guessed

document.addEventListener('DOMContentLoaded', async () => {
    await main();
});

async function fetchData() {
    try {
        const response = await fetch('../data/elements_simple.json');
        const data = await response.json();
        elementDataArray = data;
        return data;
    } catch (error) {
        console.error("Error fetching or parsing JSON data:", error);
    }
}

function findElementByName(elementName, elementsArray) {
    return elementsArray.find(el => el.Element.toLowerCase() === elementName.toLowerCase());
}

function getNeighboringElements(targetElement, elementsArray) {
    const { Period, Group } = targetElement;

    const topNeighbor = Period > 1 && Period !== 8
        ? elementsArray.find(el => el.Period === Period - 1 && el.Group === Group) : null;
    const bottomNeighbor = Period < 7 && Period !== 0
        ? elementsArray.find(el => el.Period === Period + 1 && el.Group === Group) : null;
    const rightNeighbor = Group < 18
        ? elementsArray.find(el => el.Period === Period && el.Group === Group + 1) : null;
    const leftNeighbor = Group > 1
        ? elementsArray.find(el => el.Period === Period && el.Group === Group - 1) : null;

    return { top: topNeighbor, bottom: bottomNeighbor, right: rightNeighbor, left: leftNeighbor };
}

function createBox(element, isNeighbor = false) {
    const box = document.createElement('div');
    box.classList.add(isNeighbor ? 'neighborBox' : 'elementBox');

    if (!isNeighbor) {
        const symbol = document.createElement('p');
        symbol.textContent = element.Symbol;
        box.appendChild(symbol);

        const atomicNumber = document.createElement('span');
        atomicNumber.classList.add('atomicNumber');
        atomicNumber.textContent = element.AtomicNumber;
        box.appendChild(atomicNumber);
    }

    return box;
}

function displayElementAndNeighbors(element, neighbors) {
    const elementContainer = document.getElementById('elementContainer');
    elementContainer.innerHTML = '';

    const elementBox = createBox(element);
    elementContainer.appendChild(elementBox);
    elementBox.style.gridColumn = '2';
    elementBox.style.gridRow = '2';

    const positions = { top: '1', bottom: '3', left: '1', right: '3' };
    for (let position in neighbors) {
        if (neighbors[position]) {
            const neighborBox = createBox(neighbors[position], true);
            neighborBox.id = `neighbor-${position}`;
            elementContainer.appendChild(neighborBox);
            neighborBox.style.gridColumn = (position === 'left' || position === 'right') ? positions[position] : '2';
            neighborBox.style.gridRow = (position === 'top' || position === 'bottom') ? positions[position] : '2';
        }
    }
}

function revealNeighborBox(position, guessedElement) {
    const neighborBox = document.getElementById(`neighbor-${position}`);
    if (!neighborBox) return;
    neighborBox.classList.remove('neighborBox');
    neighborBox.classList.add('elementBox');
    const symbol = document.createElement('p');
    symbol.textContent = guessedElement.Symbol;
    neighborBox.appendChild(symbol);
    const atomicNumber = document.createElement('span');
    atomicNumber.classList.add('atomicNumber');
    atomicNumber.textContent = guessedElement.AtomicNumber;
    neighborBox.appendChild(atomicNumber);
}

function handleGuess(event) {
    event.preventDefault();
    const guessInput = document.getElementById('guessInput');
    const guess = guessInput.value.trim();
    const invalidGuessMessage = document.getElementById('invalidGuessMessage');

    if (!guess || guessesRemaining <= 0) return;

    const guessedElement = findElementByName(guess, elementDataArray);
    if (!guessedElement) {
        invalidGuessMessage.textContent = 'Not a valid element. Please enter a valid chemical element name.';
        invalidGuessMessage.style.color = 'red';
        guessInput.value = '';
        return;
    }

    invalidGuessMessage.textContent = '';
    let guessCorrect = false;

    for (let position in neighbors) {
        if (
            neighbors[position] &&
            neighbors[position].Element.toLowerCase() === guessedElement.Element.toLowerCase() &&
            !revealedPositions.has(position)
        ) {
            revealNeighborBox(position, guessedElement);
            revealedPositions.add(position);
            guessCorrect = true;
            neighborsGuessed++;
            break;
        }
    }

    updateGuessTable(guessedElement.Element, guessCorrect);
    guessesRemaining--;
    updateRemainingGuessesDisplay();
    checkGameEnd();

    guessInput.value = '';
}

function updateRemainingGuessesDisplay() {
    document.getElementById('remainingGuesses').textContent = `Remaining Guesses: ${guessesRemaining}`;
}

function updateGuessTable(guess, isCorrect) {
    const tbody = document.getElementById('guessTable').getElementsByTagName('tbody')[0];
    const newRow = tbody.insertRow();
    newRow.className = isCorrect ? 'correctGuess' : 'incorrectGuess';
    newRow.insertCell(0).textContent = guess;
}

function checkGameEnd() {
    const resultMessage = document.getElementById('resultMessage');
    const guessForm = document.getElementById('guessForm');
    const totalNeighbors = Object.values(neighbors).filter(n => n != null).length;

    if (neighborsGuessed === totalNeighbors) {
        guessForm.style.display = 'none';
        resultMessage.innerHTML = "<div id='nextBonusPage'>NEXT BONUS PAGE</div>";
        resultMessage.style.display = 'block';
        document.getElementById('nextBonusPage').addEventListener('click', () => {
            window.location.href = 'bonuspage_2.html';
        });
        document.getElementById('shareBtn').style.display = 'inline-block';
    } else if (guessesRemaining === 0) {
        resultMessage.textContent = "Out of guesses! You didn't find all neighboring elements.";
        resultMessage.style.display = 'block';
        guessForm.style.display = 'none';
        document.getElementById('shareBtn').style.display = 'inline-block';
    }
}

function populateDatalist(elements) {
    const datalist = document.getElementById('elementsList');
    const sorted = [...elements].sort((a, b) => a.Element.localeCompare(b.Element));
    sorted.forEach(el => {
        const option = document.createElement('option');
        option.value = el.Element;
        datalist.appendChild(option);
    });
}

async function main() {
    await fetchData();
    populateDatalist(elementDataArray);

    let storedSelectedElement = localStorage.getItem('selectedElement');

    try {
        const resp = await fetch('../data/daily_element.json');
        const daily = await resp.json();
        if (daily.element) {
            storedSelectedElement = daily.element;
        } else {
            storedSelectedElement = null;
        }
    } catch (e) {
        console.error('Failed to fetch daily element:', e);
    }

    if (!storedSelectedElement) {
        document.querySelector('.container').innerHTML =
            '<p>No element found. Please play the main game first.</p>' +
            '<a href="../index.html">Back to main game</a>';
        return;
    }

    const mainElement = findElementByName(storedSelectedElement, elementDataArray);
    if (!mainElement) {
        console.error("Element not found in data:", storedSelectedElement);
        return;
    }

    neighbors = getNeighboringElements(mainElement, elementDataArray);
    displayElementAndNeighbors(mainElement, neighbors);
    document.getElementById('guessForm').addEventListener('submit', handleGuess);
    updateRemainingGuessesDisplay();
}

// ── Share ─────────────────────────────────────────────────────────────────────

function shareResult() {
    const text = buildShareText();
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('shareToast');
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }).catch(() => {
        prompt('Copy this to share:', text);
    });
}

function buildShareText() {
    const MAX_ATTEMPTS = 6;
    const now = new Date();
    const fallbackDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let guessHistory = [];
    let won = false;
    let dateStr = fallbackDate;
    try {
        guessHistory = JSON.parse(localStorage.getItem('elementle-guessHistory')) || [];
        won = JSON.parse(localStorage.getItem('elementle-won')) || false;
        dateStr = localStorage.getItem('elementle-gameDate') || fallbackDate;
    } catch (e) { /* ignore */ }

    const scoreStr = won ? `${guessHistory.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
    const emojiMap = { green: '🟩', yellow: '🟨', grey: '⬛' };
    const rows = guessHistory.map(colors => colors.map(c => emojiMap[c]).join('')).join('\n');

    return [
        `Elementle ${dateStr}  ${scoreStr}`,
        '',
        rows,
        '',
        '🔬 Play at: https://mlederbauer.github.io/elementle/'
    ].join('\n');
}
