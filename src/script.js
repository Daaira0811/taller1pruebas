import axios from "axios";
import { load } from "cheerio";
import fs from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import filterByPrice from "./filter-by-price.js";


const argv = yargs(hideBin(process.argv)).argv;
const MAX_pages = argv.maxPages || 1;
const city = argv.location || "temuco-la-araucania";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let houses = [];
let page = 0;

/**
 *  The function getHtmlFromPage() get the HTML code of the webpage
 * @returns {Promise} The HTML code of the webpage
 */
async function getHtmlFromPage() {
	const response = await axios.get(
		`https://www.portalinmobiliario.com/venta/casa/propiedades-usadas/${city}/_Desde_${
			(argv.perPage || 50) * (page + 1)
		}_NoIndex_True`
	);
		// Get the HTML code of the webpage
		const html = response.data;
		const htmlFile = load(html);

		return htmlFile;
}


async function getHousesFromWeb() {
	console.log(`Page ${page + 1} of ${MAX_pages}`);
   
	const htmlFile = await getHtmlFromPage();

	// Find all elements with ui-search-result__wrapper class, in div element.
	htmlFile("div.ui-search-result__wrapper").each((_index, el) => {
		const section = htmlFile(el).find("div > div > a");
		const url = htmlFile(section).attr("href");
		const originalPrice = getOriginalPrice(htmlFile, section);
		const inUF = getInUFFromHtmlFile(htmlFile,section);
		const size = sizeFromHtmlFile(htmlFile,section);
		const dorms = getDormsFromHtmlFile(htmlFile,section);
		const location = getLocationFromtHtmlFile(htmlFile,section);

	
		houses.push({ url, originalPrice, inUF, size, dorms, location });
	});

	page++;

	await sleep(1000);

	return page === MAX_pages ? page : getHousesFromWeb();
}


function getOriginalPrice(htmlFile, section){
    const originalPrice = Number(
    htmlFile(section)
        .find(".andes-money-amount__fraction")
        .text()
        .toString()
        .replace(/./g, "")
);
return originalPrice
}

function getInUFFromHtmlFile(htmlFile, section) {
	const inUF =
	htmlFile(section).find(".andes-money-amount__currency-symbol").text() === "UF";
	return inUF;
}

function sizeFromHtmlFile(htmlFile,section) {
	const size = htmlFile(section)
	.find(".ui-search-card-attributes__attribute")
	.first()
	.text();
	return size;
}

function getDormsFromHtmlFile(htmlFile,section) {
	const dorms = htmlFile(section)
	.find(".ui-search-card-attributes__attribute")
	.next()
	.text();
	return dorms;
}

function getLocationFromtHtmlFile(htmlFile,section) {
	const location =  htmlFile(section)
	.children()
	.next()
	.next()
	.next()
	.children()
	.first()
	.text();
	return location;
}

//Get houses with the method `getHousesFromWeb`, finally, get the price in CLP and generate the JSON file with the extracted data
getHousesFromWeb().then(async () => {
	const { data } = await axios.get("https://mindicador.cl/api");
	const housesWithPriceInCLP = houses.map((house) => {
		return {
			...house,
			priceInCLP: new Intl.NumberFormat("es-CL", {
				currency: "CLP",
				style: "currency",
			}).format(
				house.inUF ? house.originalPrice * data.uf.valor : house.originalPrice
			),
		};
	});

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

	if (argv.maximumPrice) {
		filterByPrice({
			houses: housesWithPriceInCLP,
			maximumPrice: argv.maximumPrice,
			city,
		});
	}
});