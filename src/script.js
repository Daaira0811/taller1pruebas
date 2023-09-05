import axios from "axios";
import { load } from "cheerio";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import filterByPrice from "./filter-by-price.js";
import JsonWriter  from  "./../utils/jsonWriter.js";

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

/**
 * The function getHousesFromHtml() get the houses from the HTML code of the webpage
 * @returns {Promise} The page number
 */
async function getHousesFromHtml() {
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

	return page === MAX_pages ? page : getHousesFromHtml();
}

/**
 * The function getOriginalPrice() get the original price of the house
 * @param {*} htmlFile 
 * @param {*} section 
 * @returns {number} The original price of the house
 */
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

/**
 * The function getInUFFromHtmlFile() get the original price of the house
 * @param {*} htmlFile 
 * @param {*} section 
 * @returns {Boolean}  If the price is in UF or not
 */
function getInUFFromHtmlFile(htmlFile, section) {
	const inUF =
	htmlFile(section).find(".andes-money-amount__currency-symbol").text() === "UF";
	return inUF;
}

/**
 * The function sizeFromHtmlFile() get the size of the house
 * @param {*} htmlFile 
 * @param {*} section 
 * @returns {string} Return the size of the house
 */
function sizeFromHtmlFile(htmlFile,section) {
	const size = htmlFile(section)
	.find(".ui-search-card-attributes__attribute")
	.first()
	.text();
	return size;
}

/**
 * The function getDormsFromHtmlFile() get the dorms of the house
 * @param {*} htmlFile 
 * @param {*} section 
 * @returns {string} Returns the dorms of the house
 */
function getDormsFromHtmlFile(htmlFile,section) {
	const dorms = htmlFile(section)
	.find(".ui-search-card-attributes__attribute")
	.next()
	.text();
	return dorms;
}

/**
 * The function getLocationFromtHtmlFile() get the location of the house
 * @param {*} htmlFile 
 * @param {*} section 
 * @returns {string} Return the location of the house
 */
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

/**
 * Get houses with the method `getHousesFromHtml`, finally, get the price in CLP and generate the JSON file with the extracted data
 */
getHousesFromHtml().then(async () => {
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

	//Write the file json whith the data of the houses in Temuco in the folder json
	JsonWriter(city, housesWithPriceInCLP)
	

	if (argv.maximumPrice) {
		filterByPrice({
			houses: housesWithPriceInCLP,
			maximumPrice: argv.maximumPrice,
			city,
		});
	}
});