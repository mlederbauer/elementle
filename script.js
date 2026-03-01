const MAX_ATTEMPTS = 6;
let elements = [];
let elementDataArray = [];
let selectedElement = "";
let attempts = MAX_ATTEMPTS;

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    document.getElementById("guessInput").addEventListener("keydown", function (e) {
        if (e.key === "Enter") checkGuess();
    });
});

function normalizeName(name) {
    const trimmed = name.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function fetchData() {
    fetch('data/elements_simple.json')
        .then(response => response.json())
        .then(data => {
            elementDataArray = data;
            elements = data.map(item => item.Element);
            populateGrid();
            populateDatalist();
            return fetch('data/daily_element.json');
        })
        .then(response => response.json())
        .then(daily => {
            const today = new Date();
            const todayStr = today.getUTCFullYear() + '-' +
                String(today.getUTCMonth() + 1).padStart(2, '0') + '-' +
                String(today.getUTCDate()).padStart(2, '0');
            if (daily.date === todayStr && elements.includes(daily.element)) {
                selectedElement = daily.element;
            } else {
                selectedElement = getDailyElement();
            }
            saveSelectedElementToLocalStorage();
        })
        .catch(() => {
            selectedElement = getDailyElement();
            saveSelectedElementToLocalStorage();
        });
}

function getDailyElement() {
    const startDate = Date.UTC(2024, 0, 1); // 2024-01-01 UTC
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dayIndex = Math.floor((todayUtc - startDate) / (1000 * 60 * 60 * 24));
    const index = ((dayIndex % elements.length) + elements.length) % elements.length;
    return elements[index];
}

function populateGrid() {
    const grid = document.getElementById("elementGrid");
    for (let period = 1; period <= 9; period++) {
        for (let group = 1; group <= 18; group++) {
            const element = elementDataArray.find(el => el.Period === period && el.Group === group);
            const rectangle = document.createElement("div");
            rectangle.classList.add("rectangle");
            if (!element) {
                rectangle.style.opacity = 0;
            }
            grid.appendChild(rectangle);
        }
    }
}

function populateDatalist() {
    const datalist = document.getElementById("elementsList");
    elements.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        datalist.appendChild(option);
    });
}

function checkGuess() {
    const guessInput = document.getElementById("guessInput");
    const normalizedGuess = normalizeName(guessInput.value);

    if (!normalizedGuess) return;

    if (!elements.includes(normalizedGuess)) {
        displayMessage("Not a valid element. Please enter a valid chemical element name.", "red");
        clearGuessInput();
        return;
    }

    if (normalizedGuess === selectedElement) {
        displayMessage("Correct! Well done.", "green");
        colorCorrectElementGrid();
        disableGuessInput();
        showBonusPageIcon();
        return;
    }

    handleIncorrectGuess(normalizedGuess);
    clearGuessInput();
    attempts--;

    const attemptsDisplay = document.getElementById("attempts");
    if (attempts === 0) {
        attemptsDisplay.textContent = `Attempts left: ${attempts}`;
        displayMessage(`Out of attempts! The element was ${selectedElement}.`, "red");
        disableGuessInput();
    } else {
        displayMessage("Try again!", "orange");
        attemptsDisplay.textContent = `Attempts left: ${attempts}`;
    }
}

function clearGuessInput() {
    document.getElementById("guessInput").value = "";
}

function handleIncorrectGuess(guess) {
    const guessedElementData = getElementData(guess);
    const selectedElementData = getElementData(selectedElement);
    colorGuessedElementGrid(guessedElementData);
    displayGuessedWordFeedback(guess, guessedElementData, selectedElementData);
}

function getElementData(elementName) {
    return elementDataArray.find(el => el.Element.toLowerCase() === elementName.toLowerCase());
}

function colorGuessedElementGrid(guessedElementData) {
    const gridIndex = (guessedElementData.Period - 1) * 18 + guessedElementData.Group;
    const gridElement = document.querySelector(`#elementGrid .rectangle:nth-child(${gridIndex})`);
    if (gridElement) {
        gridElement.classList.add("incorrectGuess");
        gridElement.textContent = guessedElementData.Symbol;
    }
}

function colorCorrectElementGrid() {
    const selectedElementData = getElementData(selectedElement);
    if (!selectedElementData) return;
    const gridIndex = (selectedElementData.Period - 1) * 18 + selectedElementData.Group;
    const gridElement = document.querySelector(`#elementGrid .rectangle:nth-child(${gridIndex})`);
    if (gridElement) {
        gridElement.classList.remove("incorrectGuess");
        gridElement.classList.add("correctGuess");
        gridElement.textContent = selectedElementData.Symbol;
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
    const matchedIndices = new Set(greenIndices);

    for (let i = 0; i < guessedArray.length; i++) {
        if (!matchedIndices.has(i)) {
            const letter = guessedArray[i];
            for (let j = 0; j < selectedArray.length; j++) {
                if (selectedArray[j] === letter && !matchedIndices.has(j)) {
                    yellowIndices.push(i);
                    matchedIndices.add(j);
                    break;
                }
            }
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
        signSpan.textContent = "\u2795";
    } else if (selectedElement.length < guess.length) {
        signSpan.textContent = "\u2796";
    } else {
        signSpan.textContent = "🟰";
    }
    parent.appendChild(signSpan);
}

function appendArrowsOrCheckmarks(parent, guessedElementData, selectedElementData) {
    appendPeriodIndicator(parent, guessedElementData.Period, selectedElementData.Period);
    appendGroupIndicator(parent, guessedElementData.Group, selectedElementData.Group);
}

function appendPeriodIndicator(parent, guessedPeriod, selectedPeriod) {
    const indicator = document.createElement("span");
    if (guessedPeriod > selectedPeriod) {
        indicator.textContent = "\u2191";
    } else if (guessedPeriod < selectedPeriod) {
        indicator.textContent = "\u2193";
    } else {
        indicator.textContent = "\u2713";
    }
    parent.appendChild(indicator);
}

function appendGroupIndicator(parent, guessedGroup, selectedGroup) {
    const indicator = document.createElement("span");
    if (guessedGroup > selectedGroup) {
        indicator.textContent = "\u2190";
    } else if (guessedGroup < selectedGroup) {
        indicator.textContent = "\u2192";
    } else {
        indicator.textContent = "\u2713";
    }
    parent.appendChild(indicator);
}

function appendPercentage(parent, guessedElementData, selectedElementData) {
    const manhattanDistance = calculateManhattanDistance(guessedElementData, selectedElementData);
    const percentage = calculatePercentage(manhattanDistance);
    appendPercentageBoxes(parent, percentage);
}

function calculateManhattanDistance(guessedElementData, selectedElementData) {
    const rowDifference = Math.abs(guessedElementData.Period - selectedElementData.Period);
    const colDifference = Math.abs(guessedElementData.Group - selectedElementData.Group);
    return rowDifference + colDifference;
}

function calculatePercentage(manhattanDistance) {
    return Math.max(0, 100 - 4 * manhattanDistance);
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

function displayMessage(messageText, messageColor) {
    const message = document.getElementById("message");
    message.textContent = messageText;
    message.style.color = messageColor;
}

function disableGuessInput() {
    document.getElementById("guessInput").disabled = true;
    document.getElementById("guessButton").disabled = true;
}

function showBonusPageIcon() {
    const inputContainer = document.getElementById('inputContainer');
    const bonusBlock = document.createElement('div');
    bonusBlock.textContent = 'BONUS PAGE';
    bonusBlock.style.backgroundColor = 'green';
    bonusBlock.style.color = 'white';
    bonusBlock.style.textAlign = 'center';
    bonusBlock.style.padding = '10px';
    bonusBlock.style.cursor = 'pointer';
    bonusBlock.addEventListener('click', () => {
        window.location.href = 'bonuspage_1.html';
    });
    inputContainer.innerHTML = '';
    inputContainer.appendChild(bonusBlock);
}

function saveSelectedElementToLocalStorage() {
    try {
        localStorage.setItem('selectedElement', selectedElement);
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}
