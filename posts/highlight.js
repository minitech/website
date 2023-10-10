'use strict';

const joinTokens = defs =>
	Object.entries(defs)
		.map(([k, v]) => `(?<${k}>${v.source})`)
		.join('|');

const TOKEN_PYTHON_SOURCE = joinTokens({
	string: /f?(?:".*?"|'.*?')/,
	comment: /#.*/,
	keyword: /\b(?:assert|for|in|from|import|class|def|if|elif|else|return|None|while|with|as)\b/,
	builtin: /\b(?:print|int|range|input|exit|__init__|self|__name__|len|max|open|hex)\b/,
	literal: /(?<!\w)-?\b(?:0x_*[\da-f][\da-f_]*|_*\d[\d_]*)/i,
});

const TOKEN_C_SOURCE = joinTokens({
	comment: /\/\*.*?\*\//,
	string: /".*?"|'.'/,
	keyword: /\b(?:if|goto|unsigned|char)\b/,
	builtin: /\b(?:uint32_t|size_t|NULL)\b/,
	literal: /-?\d+/,
});

const highlight = (opts, text) => {
	const tokenRegex = new RegExp(opts.tokenSource, 'g');

	const fragment = document.createDocumentFragment();
	let start = 0;

	for (;;) {
		const match = tokenRegex.exec(text);

		if (match === null) {
			break;
		}

		fragment.appendChild(document.createTextNode(text.substring(start, match.index)));
		start = match.index + match[0].length;

		const tokenContainer = fragment.appendChild(document.createElement('span'));
		tokenContainer.className = 'hl-' + Object.entries(match.groups).find(([, v]) => v)[0];

		if (opts.fString && match.groups.string !== undefined && match[0].startsWith('f')) {
			match[0].split(/([{}])/).forEach((p, i) => {
				if (i % 4 === 2) {
					const nested = tokenContainer.appendChild(document.createElement('span'));
					nested.className = 'hl-nested';
					nested.appendChild(highlight(opts, p));
				} else {
					tokenContainer.appendChild(document.createTextNode(p));
				}
			});
		} else {
			tokenContainer.textContent = match[0];
		}
	}

	fragment.appendChild(document.createTextNode(text.substring(start)));

	return fragment;
};

const pyHighlight = element => {
	for (let i = element.childNodes.length; i--;) {
		const child = element.childNodes[i];

		if (child.nodeType === Node.TEXT_NODE) {
			const frag = highlight({tokenSource: TOKEN_PYTHON_SOURCE, fString: true}, child.nodeValue);
			element.replaceChild(frag, child);
		} else if (child.nodeType === Node.ELEMENT_NODE) {
			pyHighlight(child);
		}
	}
};

for (const element of document.querySelectorAll('.python > code')) {
	pyHighlight(element);
}

for (const element of document.querySelectorAll('.c > code')) {
	const frag = highlight({tokenSource: TOKEN_C_SOURCE}, element.textContent);
	element.textContent = '';
	element.appendChild(frag);
}
