const MAX_ATTEMPTS = 6;
let elements = [];
let elementDataArray = [];
let selectedElement = "";
let attempts = MAX_ATTEMPTS;

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

function fetchData() {
    fetch('data/elements_simple.json')
        .then(response => response.json())
        .then(data => {
            elementDataArray = data;
            elements = data.map(item => item.Element);
            populateGrid();
            initGame();
        })
        .catch(error => {
            console.error("Error fetching or parsing JSON data:", error);
        });
}

function populateGrid() {
    const grid = document.getElementById("elementGrid");
    for (let period = 1; period <= 9; period++) {
        for (let group = 1; group <= 18; group++) {
            const element = elementDataArray.find(el => el.Period === period && el.Group === group);
            const rectangle = document.createElement("div");
            rectangle.classList.add("rectangle");
            if (!element) {
                rectangle.style.opacity = 0;  // Make the rectangle transparent where no elements are
            }
            grid.appendChild(rectangle);
        }
    }
}

function initGame() {
    selectedElement = elements[Math.floor(Math.random() * elements.length)];
    document.getElementById("debug").textContent = "Selected Element: " + selectedElement;
}

function checkGuess() {
    const guessInput = document.getElementById("guessInput");
    const message = document.getElementById("message");
    const attemptsDisplay = document.getElementById("attempts");
    const guessedWordsContainer = document.getElementById("guessedWordsContainer");

    const isElementPresent = elements.includes(guessInput.value);
    if (!isElementPresent) {
        displayMessage("Your guess is not valid. Please enter a valid chemical element.", "red");
        clearGuessInput();
        return;
    }

    if (guessInput.value === selectedElement) {
        displayMessage("Correct! Well done.", "green");
        disableGuessInput();
        decrementAttempts();
        return;
    }

    handleIncorrectGuess(guessInput.value);
    clearGuessInput();
    decrementAttempts();

    if (attempts === 0) {
        displayMessage(`Sorry, you're out of attempts. The correct element was ${selectedElement}.`, "red");
        disableGuessInput();
        return;
    } else {
        displayMessage("Try again!", "orange");
    }
    attemptsDisplay.textContent = `Attempts left: ${attempts}`;
}

function handleIncorrectGuess(guess) {
    const guessedElementData = getElementData(guess);
    const selectedElementData = getElementData(selectedElement);

    colorGuessedElementGrid(guessedElementData);
    displayGuessedWordFeedback(guess, guessedElementData, selectedElementData);
}

function getElementData(elementName) {
    return elementDataArray.find(el => el.Element === elementName);
}

function colorGuessedElementGrid(guessedElementData) {
    const gridIndex = (guessedElementData.Period - 1) * 18 + guessedElementData.Group;
    const gridElement = document.querySelector(`#elementGrid .rectangle:nth-child(${gridIndex})`);
    if (gridElement) {
        gridElement.classList.add("incorrectGuess");
        gridElement.textContent = guessedElementData.Symbol;
    }
}

function displayGuessedWordFeedback(guess, guessedElementData, selectedElementData) {
    const guessedWordsContainer = document.getElementById("guessedWordsContainer");
    const wordDiv = createWordDiv(guess, guessedElementData, selectedElementData);

    guessedWordsContainer.appendChild(wordDiv);
}

function createWordDiv(guess, guessedElementData, selectedElementData) {
    const wordDiv = document.createElement("div");
    wordDiv.classList.add("wordDiv");

    appendColoredLetters(wordDiv, guess, selectedElement);
    appendPlaceholders(wordDiv, guess);
    appendLengthSign(wordDiv, guess);
    appendArrowsOrCheckmarks(wordDiv, guessedElementData, selectedElementData);
    appendPercentage(wordDiv, guessedElementData, selectedElementData);

    return wordDiv;
}

function appendColoredLetters(parent, guess, selectedElement) {
    const selectedArray = Array.from(selectedElement.toUpperCase());
    const guessedArray = Array.from(guess.toUpperCase());
    const greenIndices = getGreenIndices(guessedArray, selectedArray);
    const yellowIndices = getYellowIndices(guessedArray, selectedArray, greenIndices);

    for (let i = 0; i < guessedArray.length; i++) {
        const letterRect = document.createElement("span");
        letterRect.classList.add("letterRectangle");
        letterRect.textContent = guess[i];
        if (greenIndices.includes(i)) {
            letterRect.classList.add("green");
        } else if (yellowIndices.includes(i)) {
            letterRect.classList.add("yellow");
        }
        parent.appendChild(letterRect);
    }
}

function getGreenIndices(guessedArray, selectedArray) {
    const greenIndices = [];
    for (let i = 0; i < guessedArray.length; i++) {
        if (guessedArray[i] === selectedArray[i]) {
            greenIndices.push(i);
        }
    }
    return greenIndices;
}

function getYellowIndices(guessedArray, selectedArray, greenIndices) {
    const yellowIndices = [];
    for (let i = 0; i < guessedArray.length; i++) {
        if (!greenIndices.includes(i) && selectedArray.includes(guessedArray[i])) {
            yellowIndices.push(i);
            const idx = selectedArray.indexOf(guessedArray[i]);
            selectedArray[idx] = null;
        }
    }
    return yellowIndices;
}

function appendPlaceholders(parent, guess) {
    const placeholdersToAdd = 14 - guess.length;
    for (let i = 0; i < placeholdersToAdd; i++) {
        const placeholder = document.createElement("span");
        placeholder.classList.add("letterRectangle", "transparentPlaceholder");
        parent.appendChild(placeholder);
    }
}

function appendLengthSign(parent, guess) {
    const signSpan = document.createElement("span");
    signSpan.classList.add("sign");
    if (selectedElement.length > guess.length) {
        signSpan.textContent = "\u2795";  // Plus sign
    } else if (selectedElement.length < guess.length) {
        signSpan.textContent = "\u2796";  // Minus sign
    } else {
        signSpan.textContent = "🟰";  // Neutral sign
    }
    parent.appendChild(signSpan);
}

function appendArrowsOrCheckmarks(parent, guessedElementData, selectedElementData) {
    appendPeriodIndicator(parent, guessedElementData.Period, selectedElementData.Period);
    appendGroupIndicator(parent, guessedElementData.Group, selectedElementData.Group);
}

function appendPeriodIndicator(parent, guessedPeriod, selectedPeriod) {
    const indicator = document.createElement("span");
    if (guessedPeriod < selectedPeriod) {
        indicator.textContent = "\u2191";  // Upwards arrow
    } else if (guessedPeriod > selectedPeriod) {
        indicator.textContent = "\u2193";  // Downwards arrow
    } else {
        indicator.textContent = "\u2713";  // Check mark
    }
    parent.appendChild(indicator);
}

function appendGroupIndicator(parent, guessedGroup, selectedGroup) {
    const indicator = document.createElement("span");
    if (guessedGroup < selectedGroup) {
        indicator.textContent = "\u2190";  // Leftwards arrow
    } else if (guessedGroup > selectedGroup) {
        indicator.textContent = "\u2192";  // Rightwards arrow
    } else {
        indicator.textContent = "\u2713";  // Check mark
    }
    parent.appendChild(indicator);
}

function appendPercentage(parent, guessedElementData, selectedElementData) {
    const manhattanDistance = calculateManhattanDistance(guessedElementData, selectedElementData);
    const percentage = calculatePercentage(manhattanDistance);
    
    const percentageSpan = document.createElement("span");
    percentageSpan.textContent = `  ${percentage}%  `;
    parent.appendChild(percentageSpan);

    appendPercentageBoxes(parent, percentage);
}

function calculateManhattanDistance(guessedElementData, selectedElementData) {
    const rowDifference = Math.abs(guessedElementData.Period - selectedElementData.Period);
    const colDifference = Math.abs(guessedElementData.Group - selectedElementData.Group);
    return rowDifference + colDifference;
}

function calculatePercentage(manhattanDistance) {
    return 100 - 4 * manhattanDistance;
}

function appendPercentageBoxes(parent, percentage) {
    for (let i = 1; i <= 5; i++) {
        const box = document.createElement("span");
        box.classList.add("percentageBox");

        if (percentage >= i * 20) {
            box.classList.add("greenBox");
        } else if (percentage >= (i - 1) * 20 + 10) {
            box.classList.add("yellowBox");
        }
        parent.appendChild(box);
    }
}