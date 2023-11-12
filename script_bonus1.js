let elementDataArray = []; // Global array to store element data
let neighbors;
let guessesRemaining = 8;
let neighborsGuessed = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await main();
});

async function fetchData() {
    try {
        const response = await fetch('data/elements_simple.json');
        const data = await response.json();
        elementDataArray = data;
        console.log("elementDataArray ", elementDataArray);
        return data;
    } catch (error) {
        console.error("Error fetching or parsing JSON data:", error);
    }
}

function findElementByName(elementName, elementsArray) {
    console.log(elementsArray);
    console.log("elementName ", elementName);
    console.log("elementName ", elementsArray.find(el => el.Element === elementName));
    return elementsArray.find(el => el.Element.toLowerCase() === elementName.toLowerCase());
}

function getNeighboringElements(targetElement, elementsArray) {
    const { Period, Group } = targetElement;

    const topNeighbor = Period > 1 && Period !== 8 ? elementsArray.find(el => el.Period === Period - 1 && el.Group === Group) : null;
    const bottomNeighbor = Period < 7 && Period !== 0 ? elementsArray.find(el => el.Period === Period + 1 && el.Group === Group) : null;
    const rightNeighbor = Group < 18 ? elementsArray.find(el => el.Period === Period && el.Group === Group + 1) : null;
    const leftNeighbor = Group > 1 ? elementsArray.find(el => el.Period === Period && el.Group === Group - 1) : null;

    return {
        top: topNeighbor,
        bottom: bottomNeighbor,
        right: rightNeighbor,
        left: leftNeighbor
    };
}

function logNeighboringElements(neighbors) {
    for (let position in neighbors) {
        const element = neighbors[position];
        if (element) {
            console.log(`${position.toUpperCase()} Element: ${element.Element}, Group: ${element.Group}, Period: ${element.Period}`);
        } else {
            console.log(`${position.toUpperCase()} Element: N/A`);
        }
    }
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
    elementContainer.innerHTML = ''; // Clear previous content

    // Create main element box
    const elementBox = createBox(element);
    elementContainer.appendChild(elementBox);
    elementBox.style.gridColumn = '2';
    elementBox.style.gridRow = '2';

    // Create neighbor boxes
    const positions = {top: '1', bottom: '3', left: '1', right: '3'};
    for (let position in neighbors) {
        if (neighbors[position]) {
            const neighborBox = createBox(neighbors[position], true);
            neighborBox.id = `neighbor-${position}`; // Assign an ID to each neighbor box
            elementContainer.appendChild(neighborBox);
            neighborBox.style.gridColumn = position === 'left' || position === 'right' ? positions[position] : '2';
            neighborBox.style.gridRow = position === 'top' || position === 'bottom' ? positions[position] : '2';
        }
    }
}

function handleGuess(event) {
    event.preventDefault();
    const guessInput = document.getElementById('guessInput');
    const guess = guessInput.value.trim();
    const invalidGuessMessage = document.getElementById('invalidGuessMessage'); // Make sure this element exists in your HTML

    if (guess && guessesRemaining > 0) {
        const guessedElement = findElementByName(guess, elementDataArray);
        if (guessedElement) {
            invalidGuessMessage.textContent = ''; // Clear any previous invalid guess message
            let guessCorrect = false;
            for (let position in neighbors) {
                if (neighbors[position] && neighbors[position].Element === guessedElement.Element) {
                    const neighborBox = document.getElementById(`neighbor-${position}`);
                    neighborBox.classList.remove('neighborBox');
                    neighborBox.classList.add('elementBox');
                    const symbol = document.createElement('p');
                    symbol.textContent = guessedElement.Symbol;
                    neighborBox.appendChild(symbol);
                    const atomicNumber = document.createElement('span');
                    atomicNumber.classList.add('atomicNumber');
                    atomicNumber.textContent = guessedElement.AtomicNumber;
                    neighborBox.appendChild(atomicNumber);
                    guessCorrect = true;
                    neighborsGuessed++;
                    break;
                }
            }
            updateGuessTable(guess, guessCorrect);
            guessesRemaining--;
            checkGameEnd();
        } else {
            invalidGuessMessage.textContent = "Your guess is not valid. Please enter a valid chemical element.";
            invalidGuessMessage.style.color = 'red';
        }
        guessInput.value = ''; // Clear input field
    }
    updateRemainingGuessesDisplay(); // Update the display for remaining guesses
}

function updateRemainingGuessesDisplay() {
    const remainingGuessesDisplay = document.getElementById('remainingGuesses'); // Make sure this element exists in your HTML
    remainingGuessesDisplay.textContent = `Remaining Guesses: ${guessesRemaining}`;
}

function updateGuessTable(guess, isCorrect) {
    const table = document.getElementById('guessTable').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    newRow.className = isCorrect ? 'correctGuess' : 'incorrectGuess'; // Apply class based on correctness
    const newCell = newRow.insertCell(0);
    newCell.textContent = guess;
}

function checkGameEnd() {
    const resultMessage = document.getElementById('resultMessage');
    const guessForm = document.getElementById('guessForm');
    
    if (neighborsGuessed === Object.keys(neighbors).filter(key => neighbors[key] != null).length) {
        guessForm.style.display = 'none'; // Hide the guess form
        resultMessage.innerHTML = "<div id='nextBonusPage'>NEXT BONUS PAGE</div>";
        resultMessage.style.display = 'block';
        
        document.getElementById('nextBonusPage').addEventListener('click', () => {
            window.location.href = 'bonuspage_2.html'; // Redirect to the next bonus page
        });
    } else if (guessesRemaining === 0) {
        resultMessage.textContent = "You did not guess the neighboring elements";
        resultMessage.style.display = 'block';
    }
}


async function main() {
    await fetchData();

    let storedSelectedElement = localStorage.getItem('selectedElement');
    if (storedSelectedElement) {
        document.getElementById("debug").textContent = "Selected Element: " + storedSelectedElement;
        let mainElement = findElementByName(storedSelectedElement, elementDataArray);
        if (mainElement) {
            neighbors = getNeighboringElements(mainElement, elementDataArray); // Assign to global variable
            logNeighboringElements(neighbors);
            displayElementAndNeighbors(mainElement, neighbors);
            const guessForm = document.getElementById('guessForm');
            guessForm.addEventListener('submit', handleGuess);
            updateRemainingGuessesDisplay();
        } else {
            console.log("Element not found in the provided data!");
        }
    } else {
        document.getElementById("debug").textContent = "Selected Element: Not available";
    }
}