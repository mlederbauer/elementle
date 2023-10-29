let elementDataArray = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

function fetchData() {
    fetch('data/elements_simple.json')
        .then(response => response.json())
        .then(data => {
            elementDataArray = data;
            elements = data.map(item => item.Element);
            console.log("elements ", elements)
            populateGrid();
            initGame();
        })
        //.catch(error => {
        //    console.error("Error fetching or parsing JSON data:", error);
        //});
}

let storedSelectedElement = localStorage.getItem('selectedElement');
if(storedSelectedElement !== null) {
    document.getElementById("debug").textContent = "Selected Element: " + storedSelectedElement;
} else {
    document.getElementById("debug").textContent = "Selected Element: Not available";
}

function findElementByName(elementName, elementsArray) {
    return elementsArray.find(el => el.Element === elementName);
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
// Assuming you've already fetched your JSON data and stored it in a variable called `elementDataArray`
let mainElement = findElementByName(storedSelectedElement, elementDataArray);
if (mainElement) {
    let neighbors = getNeighboringElements(mainElement, elementDataArray);
    logNeighboringElements(neighbors);
} else {
    console.log("Element not found in the provided data!");
}
