const fs = require('fs').promises;
const path = require('path');
const { efficientCategorizeOffers } = require('../utils/dataProcessing');

/**
 * Fetches JSON data from a file path
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object>} - Parsed JSON data
 */
async function fetchJson(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error.message);
    throw new Error(`Could not fetch JSON from ${filePath}: ${error.message}`);
  }
}

/**
 * Categories offers based on food component categories
 * @param {Array} offers - The offers to categorize
 * @param {Array} categories - The food component categories
 * @returns {Array} - Categorized offers
 */
function categorizeOffers(offers, categories) {
  return efficientCategorizeOffers(offers, categories);
}

module.exports = {
  fetchJson,
  categorizeOffers
};