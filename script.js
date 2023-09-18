let elements = [];
let elementDataArray = [];

// Fetch and parse the JSON data from elements_simple.json
fetch('data/elements_simple.json')
    .then(response => response.json())
    .then(data => {
        elementDataArray = data;
        elements = data.map(item => item.Element);
        populateGrid(data);
        initGame();
    })
    .catch(error => {
        console.error("Error fetching or parsing JSON data:", error);
    });

let selectedElement = "";
let attempts = 6;

//makes grid and then populates it with grey blocks if there is an element
function populateGrid(data) {
    const grid = document.getElementById("elementGrid");
    for (let period = 1; period <= 9; period++) {
        for (let group = 1; group <= 18; group++) {
            const element = data.find(el => el.Period === period && el.Group === group);
            const rectangle = document.createElement("div");
            rectangle.classList.add("rectangle");
            if (element) {
            } else {
                rectangle.style.opacity = 0;  // Make the rectangle transparent, where no elements are
            }
            grid.appendChild(rectangle);
        }
    }
}

//initializes the game by selecting a random element
function initGame() {
    selectedElement = elements[Math.floor(Math.random() * elements.length)];
    document.getElementById("debug").textContent = "Selected Element: " + selectedElement;
}

//functions that runs everything essentially, might be worth restructuring
function checkGuess() {
    //gets some elements from the html
    const guessInput = document.getElementById("guessInput");
    const message = document.getElementById("message");
    const attemptsDisplay = document.getElementById("attempts");
    const guessedWordsContainer = document.getElementById("guessedWordsContainer");
    //check if entry is valid element
    const isElementPresent = elements.includes(guessInput.value);
    if (!isElementPresent) {
        message.textContent = "Your guess is not valid. Please enter a valid chemical element.";
        message.style.color = "red";
        guessInput.value = "";
    } else {
        // Check if the guess is correct
        if (guessInput.value === selectedElement) {
            message.textContent = "Correct! Well done.";
            message.style.color = "green";
            guessInput.disabled = true;
            attempts--;
            return;
        } else {
            // Color the grid of the guessed element in orange and fill in the element symbol
            const guessedElementData = elementDataArray.find(el => el.Element === guessInput.value);
            const selectedElementData = elementDataArray.find(el => el.Element === selectedElement);
            if (guessedElementData) {
                const gridIndex = (guessedElementData.Period - 1) * 18 + guessedElementData.Group;
                const gridElement = document.querySelector(`#elementGrid .rectangle:nth-child(${gridIndex})`);
                if (gridElement) {
                    gridElement.classList.add("incorrectGuess");
                    gridElement.textContent = guessedElementData.Symbol;
                }
            }

            //creates div for guessed word
            const wordDiv = document.createElement("div");
            wordDiv.classList.add("wordDiv"); 
            const selectedArray = Array.from(selectedElement.toUpperCase()); //upper case important for comparison
            const guessedArray = Array.from(guessInput.value.toUpperCase());
            const greenIndices = [];
            const yellowIndices = [];
            //Step 1: compares if any letters are in the correct position and marks them green
            for (let i = 0; i < guessedArray.length; i++) {
                if (guessedArray[i] === selectedArray[i]) {
                    greenIndices.push(i);
                }
            }
            // Step 2: Identify letters for yellow marking
            for (let i = 0; i < guessedArray.length; i++) {
                if (!greenIndices.includes(i) && selectedArray.includes(guessedArray[i])) {
                    yellowIndices.push(i);
                    const idx = selectedArray.indexOf(guessedArray[i]);
                    selectedArray[idx] = null;  // Mark as checked
                }
            }
            //runs over word and colors them if necessary
            for (let i = 0; i < guessedArray.length; i++) {
                const letterRect = document.createElement("span");
                letterRect.classList.add("letterRectangle");
                letterRect.textContent = guessInput.value[i];  // Display as originally inputted
            
                if (greenIndices.includes(i)) {
                    letterRect.classList.add("green");
                } else if (yellowIndices.includes(i)) {
                    letterRect.classList.add("yellow");
                }
                wordDiv.appendChild(letterRect);
            }

            //adds placeholders (transparent rectangles) to the words (normalized on Rf, longest element word) 
            //so that rest afterwards is displayed at the same place for all guesses
            const placeholdersToAdd = 14 - guessInput.value.length;
            for (let i = 0; i < placeholdersToAdd; i++) {
                const placeholder = document.createElement("span");
                placeholder.classList.add("letterRectangle", "transparentPlaceholder");
                wordDiv.appendChild(placeholder);
            }

            //makes a sign depending on the word length compared to target word length
            const signSpan = document.createElement("span");
            signSpan.classList.add("sign");
            if (selectedElement.length > guessInput.value.length) {
                wordDiv.appendChild(document.createTextNode("\u2795"));
            } else if (selectedElement.length < guessInput.value.length) {
                wordDiv.appendChild(document.createTextNode("\u2796"));
            } else {
                wordDiv.appendChild(document.createTextNode("🟰"));
            }

            //adds arrows for period and group, check mark if correct
            if (selectedElementData.Period < guessedElementData.Period) {
                const upArrow = document.createElement("span");
                upArrow.classList.add("arrow");
                upArrow.textContent = "\u2191";  // Upwards arrow
                wordDiv.appendChild(upArrow);
            } else if (selectedElementData.Period > guessedElementData.Period) {
                const downArrow = document.createElement("span");
                downArrow.classList.add("arrow");
                downArrow.textContent = "\u2193";  // Downwards arrow
                wordDiv.appendChild(downArrow);
            } else { 
                const checkMark = document.createElement("span");
                checkMark.classList.add("checkmark");
                checkMark.textContent = "\u2713";  // Check mark
                wordDiv.appendChild(checkMark);
            }

            if (selectedElementData.Group < guessedElementData.Group) {
                const leftArrow = document.createElement("span");
                leftArrow.classList.add("arrow");
                leftArrow.textContent = "\u2190";  // Leftwards arrow
                wordDiv.appendChild(leftArrow);
            } else if (selectedElementData.Group > guessedElementData.Group) {
                const rightArrow = document.createElement("span");
                rightArrow.classList.add("arrow");
                rightArrow.textContent = "\u2192";  // Rightwards arrow
                wordDiv.appendChild(rightArrow);
            } else { 
                const checkMark = document.createElement("span");
                checkMark.classList.add("checkmark");
                checkMark.textContent = "\u2713";  // Check mark
                wordDiv.appendChild(checkMark);
            }

            //calculate ManhattanDistance and use it for percentage calc., also add boxes like in Worldle
            const rowDifference = Math.abs(selectedElementData.Period - guessedElementData.Period);
            const colDifference = Math.abs(selectedElementData.Group - guessedElementData.Group);
            const manhattanDistance = rowDifference + colDifference;
            const percentage = 100 - 4 * manhattanDistance;
            const percentageSpan = document.createElement("span");
            percentageSpan.textContent = "  " + percentage + "%  ";
            wordDiv.appendChild(percentageSpan);

            for (let i = 1; i <= 5; i++) {
                const box = document.createElement("span");
                box.classList.add("percentageBox");

                if (percentage >= i * 20) {
                    box.classList.add("greenBox");
                } else if (percentage >= (i - 1) * 20 + 10) {
                    box.classList.add("yellowBox");
                }
                wordDiv.appendChild(box);
            }
            guessedWordsContainer.appendChild(wordDiv);

            //displays attemplts and checks if game is over
            attempts--;
            guessInput.value = "";
            if (attempts === 0) {
                message.textContent = "Sorry, you're out of attempts. The correct element was " + selectedElement + ".";
                message.style.color = "red";
                guessInput.disabled = true;
                return;
            } else {
                message.textContent = "Try again!";
                message.style.color = "orange";
            }
            attemptsDisplay.textContent = "Attempts left: " + attempts;
        }
    }
}