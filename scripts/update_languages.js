// This script updates the language files in the languages folder based on the base string.json file.
// It adds missing keys with empty values, removes extra keys, and updates the English language file with new keys and values.
// The missing translations are output to the console and saved to a file named missing_translations.json.
// Usage: npm run update-languages

const fs = require('fs');
const path = require('path');
const JSON5 = require('json5'); // Require json5

// Load the base string.json file
const baseFilePath = '../src/localize/string.json';
const baseData = JSON5.parse(fs.readFileSync(baseFilePath, 'utf8')); // Use JSON5.parse

// Path to the languages folder
const languagesFolder = '../src/languages';

// Path to the English language file
const enFilePath = path.join(languagesFolder, 'en.json');

// Function to recursively update target data with base data and maintain order
const updateWithBaseData = (base, target) => {
  let result = {};
  for (let key in base) {
    if (typeof base[key] === 'object' && base[key] !== null) {
      result[key] = updateWithBaseData(base[key], target[key] || {});
    } else {
      result[key] = base[key];
    }
  }
  for (let key in target) {
    if (!(key in base)) {
      result[key] = target[key];
    }
  }
  return result;
};

// Function to recursively add missing keys with empty values to target and maintain order
const addMissingKeysWithEmptyValues = (base, target) => {
  let result = {};
  for (let key in base) {
    if (!(key in target)) {
      if (typeof base[key] === 'object' && base[key] !== null) {
        result[key] = addMissingKeysWithEmptyValues(base[key], {});
      } else {
        result[key] = '';
      }
    } else if (typeof base[key] === 'object' && base[key] !== null) {
      result[key] = addMissingKeysWithEmptyValues(base[key], target[key]);
    } else {
      result[key] = target[key];
    }
  }
  for (let key in target) {
    if (!(key in base)) {
      result[key] = target[key];
    }
  }
  return result;
};

// Function to recursively remove extra keys from target
const removeExtraKeys = (base, target) => {
  for (let key in target) {
    if (!(key in base)) {
      delete target[key];
    } else if (typeof target[key] === 'object' && target[key] !== null) {
      removeExtraKeys(base[key], target[key]);
    }
  }
};

// Function to get missing keys with their values (recursive)
const getMissingKeysWithValues = (base, compare, parentKey = '') => {
  let missingKeys = [];
  for (let key in base) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    if (!(key in compare)) {
      missingKeys.push({ key: fullKey, value: base[key] });
    } else if (typeof base[key] === 'object' && base[key] !== null) {
      missingKeys = missingKeys.concat(getMissingKeysWithValues(base[key], compare[key], fullKey));
    } else if (compare[key] === '') {
      missingKeys.push({ key: fullKey, value: base[key] });
    }
  }
  return missingKeys;
};

// Read the English language file (or create an empty object if it doesn't exist)
let enData = {};
if (fs.existsSync(enFilePath)) {
  enData = JSON5.parse(fs.readFileSync(enFilePath, 'utf8')); // Use JSON5.parse
} else {
  console.log(`${enFilePath} does not exist. Creating a new one.`);
}

// Update the English language data with base data and maintain order
const updatedEnData = updateWithBaseData(baseData, enData);

// Write the updated English language data back to the file
fs.writeFileSync(enFilePath, JSON.stringify(updatedEnData, null, 4), 'utf8');
console.log(`Updated ${enFilePath} with new keys and values from ${baseFilePath}.`);

// Read all files in the languages folder
fs.readdir(languagesFolder, (err, files) => {
  if (err) {
    console.error('Error reading languages folder:', err);
    return;
  }

  let missingTranslations = {};

  files.forEach((file) => {
    if (path.extname(file) === '.json' && file !== 'en.json') {
      const langFilePath = path.join(languagesFolder, file);
      let langData;

      try {
        langData = JSON5.parse(fs.readFileSync(langFilePath, 'utf8')); // Use JSON5.parse
      } catch (error) {
        console.error(`Error reading or parsing ${file}:`, error);
        return;
      }

      // Find missing keys with values
      const missingKeys = getMissingKeysWithValues(baseData, langData);
      if (missingKeys.length > 0) {
        missingTranslations[file] = missingKeys;
      }

      // Add missing keys with empty values to the language data and maintain order
      let updatedData = addMissingKeysWithEmptyValues(baseData, langData);

      // Remove extra keys not present in base
      removeExtraKeys(baseData, updatedData);

      // Write the updated data back to the file
      fs.writeFileSync(langFilePath, JSON.stringify(updatedData, null, 4), 'utf8');
      console.log(`Updated ${file} with missing keys and removed extra keys.`);
    }
  });

  // Output the results
  console.log('Missing translations:');
  if (Object.keys(missingTranslations).length === 0) {
    console.log('No missing translations found.');
  } else {
    Object.keys(missingTranslations).forEach((lang) => {
      console.log(`Missing translations in ${lang}:`);
      missingTranslations[lang].forEach(({ key, value }) => {
        console.log(` - ${key}: ${JSON.stringify(value)}`);
      });
    });
  }

  // Save the missing translations to a file
  fs.writeFileSync('missing_translations.json', JSON.stringify(missingTranslations, null, 4), 'utf8');
  console.log('Missing translations have been saved to missing_translations.json.');
});
