// e.g. Sun & Moon — Team Up becomes sunMoonTeamUp.
function toCssClassName(str) {
	return str
		.replace('é', 'e') // Replace the Pokémon é with a standard e else the next step will remove it.
		.replace(/[^\w\s]/g, '') // Remove all special characters.
		.replace(/^(.+?)\b/, (match, p1) => p1.toLowerCase()) // Lowercase first word.
		.replace(/\s+(\w)/g, (match, p1) => p1.toUpperCase()) // Capitalise first letter of every word after.
}

// https://stackoverflow.com/a/14991797
function parseCSV(str) {
	const arr = [];
	let quote = false;  // 'true' means we're inside a quoted field

	// Iterate over each character, keep track of current row and column (of the returned array)
	for (let row = 0, col = 0, c = 0; c < str.length; c++) {
			let cc = str[c], nc = str[c+1];        // Current character, next character
			arr[row] = arr[row] || [];             // Create a new row if necessary
			arr[row][col] = arr[row][col] || '';   // Create a new column (start with empty string) if necessary

			// If the current character is a quotation mark, and we're inside a
			// quoted field, and the next character is also a quotation mark,
			// add a quotation mark to the current column and skip the next character
			if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }

			// If it's just one quotation mark, begin/end quoted field
			if (cc == '"') { quote = !quote; continue; }

			// If it's a comma and we're not in a quoted field, move on to the next column
			if (cc == ',' && !quote) { ++col; continue; }

			// If it's a newline (CRLF) and we're not in a quoted field, skip the next character
			// and move on to the next row and move to column 0 of that new row
			if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }

			// If it's a newline (LF or CR) and we're not in a quoted field,
			// move on to the next row and move to column 0 of that new row
			if (cc == '\n' && !quote) { ++row; col = 0; continue; }
			if (cc == '\r' && !quote) { ++row; col = 0; continue; }

			// Otherwise, append the current character to the current column
			arr[row][col] += cc;
	}
	return arr;
}

const app = Vue.createApp({
	data() {
		return {
			mode: 'sets',
			sets: {},
			extraSets: {},
			superSets: {},
			variants: ['1st Edition', 'Shadowless', 'Unlimited', 'Rev Holo'],
			extraVariants: ['Have', 'Holo'],
			variantClasses: {
				'1st Edition' : 'firstEdition',
				'Shadowless' : 'shadowless',
				'Unlimited' : 'unlimited',
				'Rev Holo' : 'revHolo',
				'Have' : 'have',
				'Holo' : 'holo',
			},
			rarities: ['Common', 'Uncommon', 'Rare', 'Double Rare', 'ACE SPEC Rare', 'Ultra Rare', 'Illustration Rare', 'Special Illustration Rare', 'Hyper Rare'],
		};
	},
	methods: {
		processFile(text) {
			const data = parseCSV(text);
			const headers = data.shift();
			const setIndex = headers.indexOf('Set Name');
			const cardList = {};
			let tmpVariants = this.variants;
			let type = 'sets';

			data.forEach(columns => {
				if (columns.length == 0) {
					return;
				}

				const setName = columns[setIndex];

				if (this.sets[setName]) {
					tmpVariants = this.variants;
					type = 'sets';
				} else if (this.extraSets[setName]) {
					tmpVariants = this.extraVariants;
					type = 'extra';
				} else if (this.superSets[setName]) {
					tmpVariants = this.extraVariants;
					type = 'super';
				} else {
					console.log('Unknown set type!', setName);
					return;
				}


				if (!cardList[setName]) {
					cardList[setName] = [];
				}

				const row = {};
				headers.forEach((header, index) => {
					row[header] = columns[headers.indexOf(header)];
				});

				row.additionalColumns = tmpVariants.filter(h => !columns[headers.indexOf(h)]);

				cardList[setName].push(row);
			});

			// Filter out headers that are fully populated
			Object.keys(cardList).forEach(setName => {
				const rows = cardList[setName];
				const emptyColumns = tmpVariants.filter(header => !rows.every(row => row[header]));
				let setType = 'sets';
				let maxColumnLength = 53;

				if (this.sets[setName]) {
					setType = 'sets';
				} else if (this.extraSets[setName]) {
					setType = 'extraSets';
				} else if (this.superSets[setName]) {
					setType = 'superSets';
					maxColumnLength = 50;
				}

				let cols = Math.min(Math.max(3, Math.ceil(rows.length / maxColumnLength)), 6); // Minimum 3, maximum 6.
				if (rows.length < 62) cols = 2; // Force 2 columns for small sets.

				if (type == 'sets') {
					this[setType][setName].rarities = this.rarities.filter(v => rows.some(r=>r.Rarity == v));
				}

				if (cols == 2 || cols > 3) this[setType][setName].className += " cols" + cols.toString();

				this[setType][setName].items = rows;
				this[setType][setName].additionalColumns = emptyColumns;

				let chunks = [];
				let chunkSize = 200;
				for (var i = 0; i < rows.length; i+= chunkSize) {
					chunks.push(rows.slice(i, i + chunkSize));
				}

				this[setType][setName].chunks = chunks;
			});
		},

		setSetup() {
			Object.keys(this.sets).forEach((k) => {
				this.sets[k].className = toCssClassName(this.sets[k].title);
			});
			Object.keys(this.extraSets).forEach((k) => {
				this.extraSets[k].className = toCssClassName(this.extraSets[k].title);
			});
			Object.keys(this.superSets).forEach((k) => {
				this.superSets[k].className = toCssClassName(this.superSets[k].title);
			});
		},

		loadData() {
			fetch('data/sets.json')
				.then(response => response.json())
				.then(response => {
					this.sets = response.sets;
					this.extraSets = response.extraSets;
					this.superSets = response.superSets;
				})
				.then(this.setSetup)
				.then(() => {
					fetch('data/sets.csv')
						.then(response => response.text())
						.then(text => { this.processFile(text) });
				})
				.then(() => {
					fetch('data/extra.csv')
						.then(response => response.text())
						.then(text => { this.processFile(text) });
				});
		}
	},

	mounted() {
		this.loadData();
	}
});

app.mount('#app');
