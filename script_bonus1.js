let elementDataArray = []; // Global array to store element data

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

async function main() {
    await fetchData();

    let storedSelectedElement = localStorage.getItem('selectedElement');
    if (storedSelectedElement) {
        document.getElementById("debug").textContent = "Selected Element: " + storedSelectedElement;
        let mainElement = findElementByName(storedSelectedElement, elementDataArray);
        if (mainElement) {
            let neighbors = getNeighboringElements(mainElement, elementDataArray);
            logNeighboringElements(neighbors);
        } else {
            console.log("Element not found in the provided data!");
        }
    } else {
        document.getElementById("debug").textContent = "Selected Element: Not available";
    }
}