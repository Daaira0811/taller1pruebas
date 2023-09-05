import fs from "fs";


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