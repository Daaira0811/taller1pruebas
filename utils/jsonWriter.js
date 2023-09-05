import fs from "fs";

/**
 * Write a JSON file with the information of the houses in the city of Temuco
 * @param {string} city
 * @param {object} housesWithPriceInCLP
 * @returns
 * 
 */
function JsonWriter(city, housesWithPriceInCLP){
    fs.writeFile(
        `./json/${city}.json`,
        JSON.stringify(housesWithPriceInCLP),
        function (err) {
            if (err) {
                console.log(err);
            }
            console.log(`${city} JSON generated successfully`);
        }
    );
}

export default JsonWriter;